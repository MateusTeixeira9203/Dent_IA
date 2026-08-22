import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { statusStripeParaInterno } from '@/lib/billing/stripe-state';
import { avaliarMinimoClinica } from '@/server/services/elegibilidade-clinica';
import {
  ativarFormacaoSePronta,
  enviarAvisoFalhaAssinatura,
  extrairPaymentMethod,
} from '@/server/services/assinatura-dentista';

export const dynamic = 'force-dynamic';

type AssinaturaStripeRow = {
  id: string;
  clinica_id: string;
  usuario_id: string;
  dentista_id: string;
  formacao_id: string | null;
  plano: 'CONSULTORIO' | 'CLINICA';
  grace_ends_at: string | null;
};

function isoFromUnix(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1_000).toISOString() : null;
}

async function buscarAssinatura(
  assinaturaId: string | undefined,
  subscriptionId: string | null,
): Promise<AssinaturaStripeRow | null> {
  const db = createServiceClient();
  const query = db.from('assinaturas_dentista')
    .select('id, clinica_id, usuario_id, dentista_id, formacao_id, plano, grace_ends_at');
  const { data } = assinaturaId
    ? await query.eq('id', assinaturaId).maybeSingle<AssinaturaStripeRow>()
    : subscriptionId
      ? await query.eq('stripe_subscription_id', subscriptionId).maybeSingle<AssinaturaStripeRow>()
      : { data: null };
  return data ?? null;
}

async function ativarAcesso(assinatura: AssinaturaStripeRow): Promise<void> {
  const db = createServiceClient();
  const resultados = await Promise.all([
    db.from('clinica_usuarios').update({ status: 'ativo', removed_at: null })
      .eq('usuario_id', assinatura.usuario_id).eq('clinica_id', assinatura.clinica_id),
    db.from('dentistas').update({ ativo: true })
      .eq('id', assinatura.dentista_id).eq('clinica_id', assinatura.clinica_id),
    db.from('users').update({ active_clinica_id: assinatura.clinica_id }).eq('id', assinatura.usuario_id),
  ]);
  const falha = resultados.find((item) => item.error)?.error;
  if (falha) throw falha;
}

async function suspenderAcesso(assinatura: AssinaturaStripeRow): Promise<void> {
  const db = createServiceClient();
  const resultados = await Promise.all([
    db.from('clinica_usuarios').update({ status: 'suspenso' })
      .eq('usuario_id', assinatura.usuario_id).eq('clinica_id', assinatura.clinica_id),
    db.from('dentistas').update({ ativo: false })
      .eq('id', assinatura.dentista_id).eq('clinica_id', assinatura.clinica_id),
  ]);
  const falha = resultados.find((item) => item.error)?.error;
  if (falha) throw falha;
}

async function ativarFormacaoConfirmada(formacaoId: string): Promise<void> {
  const db = createServiceClient();
  const { data: assinaturas, error } = await db.from('assinaturas_dentista')
    .select('id, clinica_id, usuario_id, dentista_id, formacao_id, plano')
    .eq('formacao_id', formacaoId).in('status', ['trialing', 'active']);
  if (error) throw error;
  if ((assinaturas?.length ?? 0) < 2) return;

  const clinicaId = (assinaturas?.[0] as AssinaturaStripeRow | undefined)?.clinica_id;
  if (!clinicaId) throw new Error('Formação sem clínica.');

  const { error: formationError } = await db.from('formacoes_clinica').update({
    status: 'ativa', activated_at: new Date().toISOString(),
    activation_lease_token: null, activation_lease_until: null,
  }).eq('id', formacaoId).in('status', ['ativando', 'ativa']);
  if (formationError) throw formationError;

  const { error: clinicError } = await db.from('clinicas').update({
    plano: 'CLINICA', limite_dentistas: 8,
    status_elegibilidade: 'regular', equipe_minima_ends_at: null,
  }).eq('id', clinicaId);
  if (clinicError) throw clinicError;

  for (const assinatura of assinaturas as AssinaturaStripeRow[]) await ativarAcesso(assinatura);
}

async function sincronizarSubscription(subscription: Stripe.Subscription): Promise<void> {
  // A Stripe não garante ordem de entrega. Sempre consultamos o estado atual para
  // impedir que um evento antigo reative uma assinatura já cancelada.
  const atual = await getStripeClient().subscriptions.retrieve(subscription.id);
  const assinatura = await buscarAssinatura(atual.metadata.assinaturaDentistaId, atual.id);
  if (!assinatura) throw new Error('Assinatura Odonto.IA não encontrada.');

  const db = createServiceClient();
  const status = statusStripeParaInterno(atual.status);
  const currentPeriodEnd = atual.items.data[0]?.current_period_end;
  const { error } = await db.from('assinaturas_dentista').update({
    stripe_customer_id: typeof atual.customer === 'string' ? atual.customer : atual.customer.id,
    stripe_subscription_id: atual.id,
    status,
    trial_ends_at: isoFromUnix(atual.trial_end),
    current_period_ends_at: isoFromUnix(currentPeriodEnd),
    grace_ends_at: status === 'past_due' ? undefined : null,
  }).eq('id', assinatura.id);
  if (error) throw error;

  if (status === 'trialing' || status === 'active') {
    if (assinatura.formacao_id) await ativarFormacaoConfirmada(assinatura.formacao_id);
    else await ativarAcesso(assinatura);
    if (assinatura.plano === 'CLINICA') await avaliarMinimoClinica(assinatura.clinica_id);
  }
  if (status === 'canceled' || status === 'unpaid' || status === 'suspended') {
    await suspenderAcesso(assinatura);
    if (assinatura.plano === 'CLINICA') await avaliarMinimoClinica(assinatura.clinica_id);
  }
}

async function sincronizarCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const assinatura = await buscarAssinatura(
    session.metadata?.assinaturaDentistaId,
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
  );
  if (!assinatura) throw new Error('Checkout sem assinatura Odonto.IA válida.');

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const db = createServiceClient();
  if (session.mode === 'setup') {
    const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id;
    if (!setupIntentId || !customerId || !assinatura.formacao_id) {
      throw new Error('Setup Checkout incompleto.');
    }
    const setupIntent = await getStripeClient().setupIntents.retrieve(setupIntentId);
    const paymentMethodId = extrairPaymentMethod(setupIntent);
    if (!paymentMethodId || setupIntent.status !== 'succeeded') throw new Error('Cartão não confirmado pela Stripe.');

    const { data: formacao } = await db.from('formacoes_clinica')
      .select('status, expires_at').eq('id', assinatura.formacao_id)
      .maybeSingle<{ status: string; expires_at: string }>();
    if (!formacao
      || !['aguardando_equipe', 'coletando_pagamento', 'ativando'].includes(formacao.status)
      || new Date(formacao.expires_at) <= new Date()) {
      return;
    }
    if (assinatura.formacao_id && assinatura.plano === 'CLINICA') {
      const { data: estadoAtual } = await db.from('assinaturas_dentista')
        .select('status').eq('id', assinatura.id).maybeSingle<{ status: string }>();
      if (estadoAtual?.status === 'canceled') return;
    }

    const { error } = await db.from('assinaturas_dentista').update({
      stripe_customer_id: customerId,
      stripe_setup_session_id: session.id,
      stripe_payment_method_id: paymentMethodId,
      status: 'cartao_pronto',
    }).eq('id', assinatura.id);
    if (error) throw error;
    await ativarFormacaoSePronta(assinatura.formacao_id);
    return;
  }

  const { error } = await db.from('assinaturas_dentista').update({
    stripe_customer_id: customerId,
    stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
    stripe_checkout_session_id: session.id,
  }).eq('id', assinatura.id);
  if (error) throw error;
}

function subscriptionIdDaInvoice(invoice: Stripe.Invoice): string | null {
  const expanded = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } | null } | null;
  };
  const raw = expanded.subscription ?? expanded.parent?.subscription_details?.subscription ?? null;
  return typeof raw === 'string' ? raw : raw?.id ?? null;
}

async function registrarFalha(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = subscriptionIdDaInvoice(invoice);
  if (!subscriptionId) throw new Error('Fatura sem subscription Stripe.');

  // Um payment_failed pode chegar depois de um pagamento ou de outra fatura.
  // Só aplicamos carência se esta ainda for a fatura atual e continuar não paga.
  const stripe = getStripeClient();
  const [faturaAtual, subscription] = await Promise.all([
    stripe.invoices.retrieve(invoice.id),
    stripe.subscriptions.retrieve(subscriptionId),
  ]);
  const latestInvoiceId = typeof subscription.latest_invoice === 'string'
    ? subscription.latest_invoice
    : subscription.latest_invoice?.id ?? null;
  if (faturaAtual.status === 'paid' || (latestInvoiceId && latestInvoiceId !== invoice.id)) return;

  const assinatura = await buscarAssinatura(subscription.metadata.assinaturaDentistaId, subscription.id);
  if (!assinatura) throw new Error('Fatura sem assinatura Odonto.IA válida.');
  const graceEndsAt = assinatura.grace_ends_at
    ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000).toISOString();
  const db = createServiceClient();
  const { error } = await db.from('assinaturas_dentista').update({
    status: 'past_due', grace_ends_at: graceEndsAt, last_invoice_id: invoice.id,
  }).eq('id', assinatura.id);
  if (error) throw error;
  await enviarAvisoFalhaAssinatura({ userId: assinatura.usuario_id, graceEndsAt });
}

async function registrarPagamento(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = subscriptionIdDaInvoice(invoice);
  const assinatura = await buscarAssinatura(undefined, subscriptionId);
  if (!assinatura) throw new Error('Fatura sem assinatura Odonto.IA válida.');
  if (!subscriptionId) throw new Error('Fatura sem subscription Stripe.');
  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  const status = statusStripeParaInterno(subscription.status);
  const db = createServiceClient();
  const { error } = await db.from('assinaturas_dentista').update({
    status, grace_ends_at: null, last_invoice_id: invoice.id,
  }).eq('id', assinatura.id);
  if (error) throw error;
  if (status === 'trialing' || status === 'active') {
    if (assinatura.formacao_id) await ativarFormacaoConfirmada(assinatura.formacao_id);
    else await ativarAcesso(assinatura);
  } else if (status === 'canceled' || status === 'unpaid' || status === 'suspended') {
    await suspenderAcesso(assinatura);
  }
  if (assinatura.plano === 'CLINICA') await avaliarMinimoClinica(assinatura.clinica_id);
}

async function processarEvento(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await sincronizarCheckout(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await sincronizarSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await registrarFalha(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.paid':
      await registrarPagamento(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.STRIPE_BILLING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Cobrança temporariamente desativada.' }, { status: 503 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!webhookSecret || !signature) return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Assinatura Stripe inválida.' }, { status: 400 });
  }

  const chaveLive = /_(?:live)_/.test(process.env.STRIPE_SECRET_KEY ?? '');
  if (event.livemode !== chaveLive) {
    return NextResponse.json({ error: 'Modo do webhook não corresponde à chave Stripe.' }, { status: 400 });
  }

  const db = createServiceClient();
  const processingToken = crypto.randomUUID();
  const { data: claimed, error: claimError } = await db.rpc('claim_stripe_billing_event', {
    p_external_event_id: event.id,
    p_event_type: event.type,
    p_payload: event.data.object as unknown as Record<string, unknown>,
    p_processing_token: processingToken,
  });
  if (claimError) return NextResponse.json({ error: 'Falha ao registrar evento.' }, { status: 500 });
  if (!claimed) return NextResponse.json({ received: true, duplicateOrProcessing: true });

  try {
    await processarEvento(event);
    const { error } = await db.from('billing_events').update({
      outcome: 'processed', processed_at: new Date().toISOString(),
      processing_token: null, processing_lease_until: null, last_error: null,
    }).eq('external_event_id', event.id).eq('processing_token', processingToken);
    if (error) throw error;
  } catch (error) {
    await db.from('billing_events').update({
      outcome: 'error', last_error: error instanceof Error ? error.message.slice(0, 500) : 'Falha desconhecida',
      processing_token: null, processing_lease_until: null,
    }).eq('external_event_id', event.id).eq('processing_token', processingToken);
    console.error('[stripe webhook] falha ao processar evento', { eventId: event.id, type: event.type, error });
    return NextResponse.json({ error: 'Falha ao processar evento.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

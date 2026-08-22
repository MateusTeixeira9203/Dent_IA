import type Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteUrl, getStripeClient } from '@/lib/stripe';
import { getResend } from '@/lib/email/resend';
import { TRIAL_DAYS } from '@/lib/billing/trial';
import {
  descreverPreco,
  resolverPrecoStripe,
  validarPrecoStripe,
  type CicloCobranca,
  type PlanoAssinatura,
} from '@/lib/billing/plan-catalog';
import { avaliarMinimoClinica } from './elegibilidade-clinica';
import { clinicaIsentaDeCobranca } from '@/lib/billing/exemptions';

type AssinaturaRow = {
  id: string;
  clinica_id: string;
  usuario_id: string;
  dentista_id: string;
  formacao_id: string | null;
  plano: PlanoAssinatura;
  ciclo: CicloCobranca;
  oferta: 'fundador' | 'publico';
  stripe_customer_id: string | null;
  stripe_setup_session_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_method_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string;
  status: string;
  grace_ends_at: string | null;
};

type FormacaoRow = {
  id: string;
  status: string;
  expires_at: string;
};

type MembershipRow = {
  clinica_id: string;
  status: string;
};

function billingAtivo(): boolean {
  return process.env.STRIPE_BILLING_ENABLED === 'true';
}

async function criarCustomerStripe(assinatura: AssinaturaRow): Promise<string> {
  if (assinatura.stripe_customer_id) return assinatura.stripe_customer_id;

  const db = createServiceClient();
  const { data: authUser, error: authError } = await db.auth.admin.getUserById(assinatura.usuario_id);
  if (authError || !authUser.user?.email) throw new Error('E-mail de cobrança não encontrado.');

  const customer = await getStripeClient().customers.create({
    email: authUser.user.email,
    metadata: {
      assinaturaDentistaId: assinatura.id,
      clinicaId: assinatura.clinica_id,
      dentistaId: assinatura.dentista_id,
      usuarioId: assinatura.usuario_id,
    },
  }, { idempotencyKey: `r92-customer-${assinatura.id}` });

  const { error } = await db.from('assinaturas_dentista')
    .update({ stripe_customer_id: customer.id })
    .eq('id', assinatura.id)
    .eq('usuario_id', assinatura.usuario_id);
  if (error) throw error;
  return customer.id;
}

async function prepararAssinatura(
  userId: string,
  ciclo: CicloCobranca,
  planoSolicitado?: PlanoAssinatura,
  clinicIdSolicitada?: string,
): Promise<AssinaturaRow> {
  const db = createServiceClient();
  let membershipQuery = db.from('clinica_usuarios')
    .select('clinica_id, status')
    .eq('usuario_id', userId)
    .in('role', ['admin', 'dentista'])
    .in('status', ['ativo', 'pendente', 'suspenso']);
  if (clinicIdSolicitada) membershipQuery = membershipQuery.eq('clinica_id', clinicIdSolicitada);
  const { data: membership } = await membershipQuery
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<MembershipRow>();
  if (!membership) throw new Error('Vínculo de dentista não encontrado.');
  if (clinicaIsentaDeCobranca(membership.clinica_id)) {
    throw new Error('Esta clínica possui isenção permanente e não deve cadastrar cobrança.');
  }

  const [{ data: dentista }, { data: clinica }, { data: formacao }] = await Promise.all([
    db.from('dentistas').select('id').eq('user_id', userId).eq('clinica_id', membership.clinica_id)
      .maybeSingle<{ id: string }>(),
    db.from('clinicas').select('plano').eq('id', membership.clinica_id)
      .maybeSingle<{ plano: 'SOLO' | 'CLINICA' }>(),
    db.from('formacoes_clinica').select('id, status, expires_at')
      .eq('clinica_id', membership.clinica_id)
      .in('status', ['aguardando_equipe', 'coletando_pagamento', 'ativando'])
      .maybeSingle<FormacaoRow>(),
  ]);
  if (!dentista || !clinica) throw new Error('Perfil de cobrança incompleto.');
  if (formacao && new Date(formacao.expires_at) <= new Date()) {
    throw new Error('A formação da clínica expirou. Reinicie o processo ou escolha Consultório.');
  }

  const plano: PlanoAssinatura = planoSolicitado ?? (formacao || clinica.plano === 'CLINICA' ? 'CLINICA' : 'CONSULTORIO');
  if (plano === 'CLINICA' && !formacao && clinica.plano !== 'CLINICA') {
    throw new Error('Inicie a formação da clínica antes de adicionar o cartão.');
  }
  const preco = resolverPrecoStripe({ plano, ciclo, oferta: 'fundador' });
  const statusInicial = formacao ? 'aguardando_formacao' : 'checkout_pendente';

  const { data: existente } = await db.from('assinaturas_dentista').select('*')
    .eq('usuario_id', userId).eq('dentista_id', dentista.id).maybeSingle<AssinaturaRow>();

  if (existente?.stripe_subscription_id && existente.ciclo !== ciclo) {
    throw new Error('Altere o ciclo da assinatura pelo portal de cobrança.');
  }

  const payload = {
    clinica_id: membership.clinica_id,
    usuario_id: userId,
    dentista_id: dentista.id,
    formacao_id: formacao?.id ?? null,
    plano,
    ciclo,
    oferta: 'fundador',
    stripe_price_id: preco.stripePriceId,
    status: existente
      && existente.formacao_id === (formacao?.id ?? null)
      && !['canceled', 'suspended', 'unpaid'].includes(existente.status)
      ? existente.status
      : statusInicial,
  };

  const { data: assinatura, error } = await db.from('assinaturas_dentista')
    .upsert(payload, { onConflict: 'usuario_id,dentista_id' })
    .select('*').single<AssinaturaRow>();
  if (error || !assinatura) throw error ?? new Error('Assinatura não preparada.');

  if (formacao?.status === 'aguardando_equipe') {
    await db.from('formacoes_clinica').update({ status: 'coletando_pagamento' })
      .eq('id', formacao.id).eq('status', 'aguardando_equipe');
  }
  return assinatura;
}

async function consultarSessaoExistente(sessionId: string | null): Promise<{
  url: string | null;
  concluida: boolean;
}> {
  if (!sessionId) return { url: null, concluida: false };
  const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
  return {
    url: session.status === 'open' ? session.url : null,
    concluida: session.status === 'complete',
  };
}

export async function criarCheckoutAssinaturaDentista(
  userId: string,
  ciclo: CicloCobranca,
  planoSolicitado?: PlanoAssinatura,
  clinicIdSolicitada?: string,
): Promise<{ url?: string; error?: string }> {
  if (!billingAtivo()) return { error: 'A cobrança Stripe ainda não foi ativada.' };

  try {
    const assinatura = await prepararAssinatura(userId, ciclo, planoSolicitado, clinicIdSolicitada);
    if (['trialing', 'active'].includes(assinatura.status)) {
      return { error: 'Sua assinatura já está ativa.' };
    }
    if (assinatura.stripe_subscription_id && assinatura.status !== 'canceled') {
      return { error: 'Sua assinatura já existe. Use o portal de cobrança para regularizar ou alterar o cartão.' };
    }

    await validarPrecoStripe(resolverPrecoStripe({
      plano: assinatura.plano,
      ciclo: assinatura.ciclo,
      oferta: assinatura.oferta,
    }));

    const usaSetup = assinatura.plano === 'CLINICA' && Boolean(assinatura.formacao_id);
    const sessionId = usaSetup
      ? assinatura.stripe_setup_session_id
      : assinatura.stripe_checkout_session_id;
    const existente = await consultarSessaoExistente(sessionId);
    if (existente.url) return { url: existente.url };
    if (existente.concluida) {
      return { error: 'Seu pagamento já foi confirmado e está sendo processado. Atualize a página em instantes.' };
    }

    const customerId = await criarCustomerStripe(assinatura);
    const stripe = getStripeClient();
    const siteUrl = getSiteUrl();
    const metadata: Record<string, string> = {
      assinaturaDentistaId: assinatura.id,
      clinicaId: assinatura.clinica_id,
      dentistaId: assinatura.dentista_id,
      usuarioId: assinatura.usuario_id,
      plano: assinatura.plano,
      ciclo: assinatura.ciclo,
    };

    const session = usaSetup
      ? await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'setup',
          payment_method_types: ['card'],
          success_url: `${siteUrl}/bem-vindo-agregado?checkout=sucesso`,
          cancel_url: `${siteUrl}/bem-vindo-agregado?checkout=cancelado`,
          metadata,
          setup_intent_data: { metadata },
          custom_text: {
            submit: {
              message: `Seu cartão será salvo sem cobrança. O teste de 7 dias só começa quando 2 dentistas concluírem a formação. Depois, a renovação será ${descreverPreco(ciclo)} por dentista.`,
            },
          },
        }, { idempotencyKey: `r92-setup-checkout-${assinatura.id}-${assinatura.formacao_id}-${ciclo}-${sessionId ?? 'novo'}` })
      : await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          payment_method_collection: 'always',
          line_items: [{ price: assinatura.stripe_price_id, quantity: 1 }],
          success_url: `${siteUrl}/bem-vindo-agregado?checkout=sucesso`,
          cancel_url: `${siteUrl}/bem-vindo-agregado?checkout=cancelado`,
          metadata,
          subscription_data: {
            trial_period_days: TRIAL_DAYS,
            metadata: { assinaturaDentistaId: assinatura.id, clinicaId: assinatura.clinica_id },
          },
        }, { idempotencyKey: `r92-subscription-checkout-${assinatura.id}-${ciclo}-${sessionId ?? 'novo'}` });

    if (!session.url) return { error: 'A Stripe não retornou a página de checkout.' };
    const db = createServiceClient();
    const { error } = await db.from('assinaturas_dentista').update(usaSetup
      ? { stripe_setup_session_id: session.id }
      : { stripe_checkout_session_id: session.id })
      .eq('id', assinatura.id).eq('usuario_id', userId);
    if (error) throw error;
    return { url: session.url };
  } catch (error) {
    console.error('[assinatura-dentista] checkout não criado:', error);
    return { error: error instanceof Error ? error.message : 'Não foi possível abrir o checkout.' };
  }
}

export async function ativarFormacaoSePronta(formacaoId: string): Promise<void> {
  const db = createServiceClient();
  const leaseToken = crypto.randomUUID();
  const { data: claims, error: claimError } = await db.rpc('claim_formacao_ativacao', {
    p_formacao_id: formacaoId,
    p_lease_token: leaseToken,
  });
  if (claimError) throw claimError;
  const claim = (claims as Array<{ formacao_id: string; trial_ends_at: string }> | null)?.[0];
  if (!claim) return;

  try {
    const { data: assinaturas, error } = await db.from('assinaturas_dentista').select('*')
      .eq('formacao_id', formacaoId).eq('status', 'cartao_pronto');
    if (error) throw error;

    const trialEndUnix = Math.floor(new Date(claim.trial_ends_at).getTime() / 1_000);
    for (const raw of assinaturas ?? []) {
      const assinatura = raw as AssinaturaRow;
      if (!assinatura.stripe_customer_id || !assinatura.stripe_payment_method_id) continue;
      await validarPrecoStripe(resolverPrecoStripe({
        plano: assinatura.plano,
        ciclo: assinatura.ciclo,
        oferta: assinatura.oferta,
      }));
      const stripe = getStripeClient();
      const existentes = await stripe.subscriptions.list({
        customer: assinatura.stripe_customer_id,
        status: 'all',
        limit: 100,
      });
      const encontrada = existentes.data.find((item) =>
        item.metadata.assinaturaDentistaId === assinatura.id
        && item.metadata.formacaoId === formacaoId
        && item.status !== 'canceled'
      );
      const subscription = encontrada ?? await stripe.subscriptions.create({
          customer: assinatura.stripe_customer_id,
          items: [{ price: assinatura.stripe_price_id }],
          default_payment_method: assinatura.stripe_payment_method_id,
          trial_end: trialEndUnix,
          payment_settings: { save_default_payment_method: 'on_subscription' },
          metadata: {
            assinaturaDentistaId: assinatura.id,
            clinicaId: assinatura.clinica_id,
            formacaoId,
          },
        }, { idempotencyKey: `r92-formacao-subscription-${assinatura.id}` });

      const { error: updateError } = await db.from('assinaturas_dentista').update({
        stripe_subscription_id: subscription.id,
        trial_ends_at: claim.trial_ends_at,
      }).eq('id', assinatura.id);
      if (updateError) throw updateError;
    }

    await db.from('formacoes_clinica').update({
      activation_lease_token: null,
      activation_lease_until: null,
      last_error: null,
    }).eq('id', formacaoId).eq('activation_lease_token', leaseToken);
  } catch (error) {
    await db.from('formacoes_clinica').update({
      activation_lease_token: null,
      activation_lease_until: null,
      last_error: error instanceof Error ? error.message.slice(0, 500) : 'Falha desconhecida',
    }).eq('id', formacaoId).eq('activation_lease_token', leaseToken);
    throw error;
  }
}

export async function criarPortalAssinaturaDentista(userId: string, clinicId: string): Promise<{ url?: string; error?: string }> {
  if (!billingAtivo()) return { error: 'A cobrança Stripe ainda não foi ativada.' };
  const db = createServiceClient();
  const { data: assinatura } = await db.from('assinaturas_dentista').select('stripe_customer_id')
    .eq('usuario_id', userId).eq('clinica_id', clinicId)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (!assinatura?.stripe_customer_id) return { error: 'Nenhuma assinatura Stripe foi encontrada.' };

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: assinatura.stripe_customer_id,
    return_url: `${getSiteUrl()}/dashboard/configuracoes?aba=plano`,
  });
  return { url: session.url };
}

export async function enviarAvisoFalhaAssinatura(params: { userId: string; graceEndsAt: string }): Promise<void> {
  try {
    const db = createServiceClient();
    const { data: authUser } = await db.auth.admin.getUserById(params.userId);
    const email = authUser.user?.email;
    if (!email) return;
    await getResend().emails.send({
      from: process.env.EMAIL_FROM ?? 'Odonto.IA <equipe@odontoia.app>',
      to: email,
      subject: 'Precisamos atualizar seu pagamento no Odonto.IA',
      html: `<p>Não foi possível renovar sua assinatura.</p><p>Seu acesso continua disponível até <strong>${new Date(params.graceEndsAt).toLocaleDateString('pt-BR')}</strong>. Atualize seu cartão em Configurações → Plano.</p>`,
    });
  } catch (error) {
    console.error('[assinatura-dentista] aviso de falha não enviado:', error);
  }
}

/** Suspende somente o vínculo vencido; nunca apaga ou transfere dado clínico. */
export async function suspenderGracasVencidas(): Promise<{ suspensas: number }> {
  const db = createServiceClient();
  const agora = new Date().toISOString();
  const { data: vencidas, error } = await db.from('assinaturas_dentista')
    .select('id, clinica_id, usuario_id, dentista_id, plano').eq('status', 'past_due').lte('grace_ends_at', agora);
  if (error) throw error;

  let suspensas = 0;
  for (const assinatura of vencidas ?? []) {
    const { data: atualizada, error: updateError } = await db.from('assinaturas_dentista')
      .update({ status: 'suspended' }).eq('id', assinatura.id).eq('status', 'past_due')
      .lte('grace_ends_at', agora).select('id');
    if (updateError) throw updateError;
    if (!atualizada?.length) continue;
    await Promise.all([
      db.from('clinica_usuarios').update({ status: 'suspenso' })
        .eq('usuario_id', assinatura.usuario_id).eq('clinica_id', assinatura.clinica_id),
      db.from('dentistas').update({ ativo: false })
        .eq('id', assinatura.dentista_id).eq('clinica_id', assinatura.clinica_id),
    ]);
    if (assinatura.plano === 'CLINICA') await avaliarMinimoClinica(assinatura.clinica_id as string);
    suspensas += 1;
  }
  return { suspensas };
}

export function extrairPaymentMethod(setupIntent: Stripe.SetupIntent): string | null {
  return typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id ?? null;
}

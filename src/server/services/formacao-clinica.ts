import { createServiceClient } from '@/lib/supabase/service';
import { getStripeClient } from '@/lib/stripe';
import {
  resolverPrecoStripe,
  validarPrecoStripe,
  type CicloCobranca,
} from '@/lib/billing/plan-catalog';
import { clinicaIsentaDeCobranca } from '@/lib/billing/exemptions';

export interface AcessoFormacaoClinica {
  liberado: boolean;
  expiresAt: string | null;
}

/**
 * R-105/R-92 — acesso provisório sem falsificar uma assinatura trialing.
 * Exige cartão pronto, formação válida e pelo menos um convite de dentista ainda válido
 * ou um segundo participante já vinculado à formação.
 */
export async function obterAcessoFormacaoClinica(input: {
  userId: string;
  clinicId: string;
}): Promise<AcessoFormacaoClinica> {
  if (process.env.STRIPE_BILLING_ENABLED !== 'true') {
    return { liberado: false, expiresAt: null };
  }
  const db = createServiceClient();
  const agora = new Date().toISOString();
  const { data: assinatura, error: assinaturaError } = await db
    .from('assinaturas_dentista')
    .select('formacao_id, status')
    .eq('usuario_id', input.userId)
    .eq('clinica_id', input.clinicId)
    .eq('plano', 'CLINICA')
    .maybeSingle<{ formacao_id: string | null; status: string }>();
  if (assinaturaError || assinatura?.status !== 'cartao_pronto' || !assinatura.formacao_id) {
    return { liberado: false, expiresAt: null };
  }

  const { data: formacao, error: formacaoError } = await db
    .from('formacoes_clinica')
    .select('expires_at, status')
    .eq('id', assinatura.formacao_id)
    .eq('clinica_id', input.clinicId)
    .in('status', ['aguardando_equipe', 'coletando_pagamento'])
    .gt('expires_at', agora)
    .maybeSingle<{ expires_at: string; status: string }>();
  if (formacaoError || !formacao) return { liberado: false, expiresAt: null };

  const [{ count: convites, error: convitesError }, { count: participantes, error: participantesError }] = await Promise.all([
    db.from('convites').select('id', { count: 'exact', head: true })
      .eq('clinica_id', input.clinicId)
      .eq('role', 'dentista')
      .in('status', ['pendente', 'aceito'])
      .gt('expires_at', agora),
    db.from('assinaturas_dentista').select('id', { count: 'exact', head: true })
      .eq('formacao_id', assinatura.formacao_id)
      .neq('usuario_id', input.userId)
      .not('status', 'in', '(canceled,suspended,unpaid)'),
  ]);
  if (convitesError || participantesError) return { liberado: false, expiresAt: formacao.expires_at };
  return {
    liberado: (convites ?? 0) > 0 || (participantes ?? 0) > 0,
    expiresAt: formacao.expires_at,
  };
}

export async function iniciarFormacaoClinica(input: {
  userId: string;
  clinicId: string;
  dentistaId: string;
  ciclo: CicloCobranca;
}): Promise<{ ok: true; formacaoId: string; expiresAt: string } | { ok: false; error: string }> {
  if (process.env.STRIPE_BILLING_ENABLED !== 'true') {
    return { ok: false, error: 'A cobrança Stripe ainda não foi ativada.' };
  }
  if (clinicaIsentaDeCobranca(input.clinicId)) {
    return { ok: false, error: 'Esta clínica possui isenção permanente e não precisa alterar o plano.' };
  }

  const db = createServiceClient();
  const { data: existente } = await db.from('formacoes_clinica')
    .select('id, expires_at').eq('clinica_id', input.clinicId)
    .in('status', ['aguardando_equipe', 'coletando_pagamento', 'ativando'])
    .maybeSingle<{ id: string; expires_at: string }>();
  if (existente && new Date(existente.expires_at) > new Date()) {
    return { ok: true, formacaoId: existente.id, expiresAt: existente.expires_at };
  }
  if (existente) {
    // Não deixa uma formação vencida ocupar o índice único nem carregar membros
    // pendentes para uma nova tentativa.
    await processarPrazosFormacao();
  }

  const { data: assinaturaAtual } = await db.from('assinaturas_dentista')
    .select('id, status, plano').eq('usuario_id', input.userId).eq('dentista_id', input.dentistaId)
    .maybeSingle<{ id: string; status: string; plano: string }>();
  if (assinaturaAtual && ['trialing', 'active', 'past_due'].includes(assinaturaAtual.status)) {
    return { ok: false, error: 'A conversão de uma assinatura ativa deve ser feita em Configurações → Plano.' };
  }

  const preco = resolverPrecoStripe({ plano: 'CLINICA', ciclo: input.ciclo, oferta: 'fundador' });
  await validarPrecoStripe(preco);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1_000).toISOString();
  const { data: formacao, error: formacaoError } = await db.from('formacoes_clinica').insert({
    clinica_id: input.clinicId,
    criado_por_usuario_id: input.userId,
    status: 'aguardando_equipe',
    expires_at: expiresAt,
  }).select('id').single<{ id: string }>();
  if (formacaoError || !formacao) {
    if (formacaoError?.code === '23505') {
      return { ok: false, error: 'Já existe uma formação em andamento para esta clínica.' };
    }
    return { ok: false, error: 'Não foi possível iniciar a formação da clínica.' };
  }

  const { error: capacityError } = await db.from('clinicas')
    .update({ limite_dentistas: 8 }).eq('id', input.clinicId);
  if (capacityError) {
    await db.from('formacoes_clinica').update({ status: 'cancelada', last_error: capacityError.message })
      .eq('id', formacao.id);
    return { ok: false, error: 'Não foi possível preparar as vagas da clínica.' };
  }

  const { error: assinaturaError } = await db.from('assinaturas_dentista').upsert({
    clinica_id: input.clinicId,
    usuario_id: input.userId,
    dentista_id: input.dentistaId,
    formacao_id: formacao.id,
    plano: 'CLINICA',
    ciclo: input.ciclo,
    oferta: 'fundador',
    stripe_price_id: preco.stripePriceId,
    status: 'aguardando_formacao',
  }, { onConflict: 'usuario_id,dentista_id' });
  if (assinaturaError) {
    await db.from('formacoes_clinica').update({ status: 'cancelada', last_error: assinaturaError.message })
      .eq('id', formacao.id);
    return { ok: false, error: 'Não foi possível preparar sua participação.' };
  }
  return { ok: true, formacaoId: formacao.id, expiresAt };
}

export async function migrarClinicaParaConsultorio(input: {
  userId: string;
  clinicId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient();
  const [{ data: clinica }, { data: assinatura }] = await Promise.all([
    db.from('clinicas').select('status_elegibilidade').eq('id', input.clinicId)
      .maybeSingle<{ status_elegibilidade: string }>(),
    db.from('assinaturas_dentista').select('id, ciclo, oferta, stripe_subscription_id')
      .eq('usuario_id', input.userId).eq('clinica_id', input.clinicId)
      .in('status', ['trialing', 'active', 'past_due']).maybeSingle<{
        id: string; ciclo: CicloCobranca; oferta: 'fundador' | 'publico'; stripe_subscription_id: string | null;
      }>(),
  ]);
  if (!clinica || !['decisao_pendente', 'bloqueada', 'recompondo_equipe'].includes(clinica.status_elegibilidade)) {
    return { ok: false, error: 'Esta clínica não está aguardando decisão de plano.' };
  }
  if (!assinatura?.stripe_subscription_id) return { ok: false, error: 'Assinatura Stripe não encontrada.' };

  const { data: outrasAssinaturas, error: outrasError } = await db.from('assinaturas_dentista')
    .select('id, usuario_id, dentista_id, stripe_subscription_id, status')
    .eq('clinica_id', input.clinicId).eq('plano', 'CLINICA').neq('usuario_id', input.userId)
    .not('status', 'in', '(canceled)');
  if (outrasError) return { ok: false, error: 'Não foi possível conferir as outras assinaturas da clínica.' };

  // Encerra primeiro na Stripe. Em uma retomada, subscriptions já canceladas são
  // apenas reconciliadas localmente; nunca cobramos nem reativamos ex-membros.
  for (const outra of outrasAssinaturas ?? []) {
    if (!outra.stripe_subscription_id) continue;
    const externa = await getStripeClient().subscriptions.retrieve(outra.stripe_subscription_id as string);
    if (externa.status !== 'canceled') {
      await getStripeClient().subscriptions.cancel(externa.id, { invoice_now: false, prorate: false });
    }
  }

  const preco = resolverPrecoStripe({ plano: 'CONSULTORIO', ciclo: assinatura.ciclo, oferta: assinatura.oferta });
  await validarPrecoStripe(preco);
  const subscription = await getStripeClient().subscriptions.retrieve(assinatura.stripe_subscription_id);
  const item = subscription.items.data[0];
  if (!item) return { ok: false, error: 'Item da assinatura não encontrado.' };

  await getStripeClient().subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: preco.stripePriceId }],
    proration_behavior: 'none',
    pause_collection: '',
  });

  const outrosUsuarios = (outrasAssinaturas ?? []).map((item) => item.usuario_id as string);
  const outrosDentistas = (outrasAssinaturas ?? []).map((item) => item.dentista_id as string);
  if ((outrasAssinaturas?.length ?? 0) > 0) {
    const resultadosLimpeza = await Promise.all([
      db.from('assinaturas_dentista').update({ status: 'canceled', billing_paused_at: null })
        .eq('clinica_id', input.clinicId).eq('plano', 'CLINICA').neq('usuario_id', input.userId),
      db.from('clinica_usuarios').update({ status: 'removido', removed_at: new Date().toISOString() })
        .eq('clinica_id', input.clinicId).in('usuario_id', outrosUsuarios),
      db.from('dentistas').update({ ativo: false }).eq('clinica_id', input.clinicId).in('id', outrosDentistas),
    ]);
    const falhaLimpeza = resultadosLimpeza.find((resultado) => resultado.error)?.error;
    if (falhaLimpeza) return { ok: false, error: 'As cobranças foram encerradas, mas os vínculos precisam ser reconciliados.' };

    for (const usuarioId of outrosUsuarios) {
      const { data: outroVinculo } = await db.from('clinica_usuarios')
        .select('clinica_id').eq('usuario_id', usuarioId).eq('status', 'ativo')
        .neq('clinica_id', input.clinicId).limit(1).maybeSingle<{ clinica_id: string }>();
      const { error: contextoError } = await db.from('users')
        .update({ active_clinica_id: outroVinculo?.clinica_id ?? null }).eq('id', usuarioId);
      if (contextoError) return { ok: false, error: 'Cobranças encerradas; falta reconciliar o acesso de um ex-membro.' };
    }
  }

  const [{ error: assinaturaError }, { error: clinicaError }] = await Promise.all([
    db.from('assinaturas_dentista').update({
      plano: 'CONSULTORIO', stripe_price_id: preco.stripePriceId, billing_paused_at: null,
    }).eq('id', assinatura.id).eq('usuario_id', input.userId),
    db.from('clinicas').update({
      plano: 'SOLO', limite_dentistas: 1,
      status_elegibilidade: 'regular', equipe_minima_ends_at: null,
    }).eq('id', input.clinicId),
  ]);
  if (assinaturaError || clinicaError) return { ok: false, error: 'Stripe atualizou, mas o estado local precisa ser reconciliado.' };
  return { ok: true };
}

export async function manterClinicaBloqueada(input: {
  userId: string;
  clinicId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient();
  const { data: assinatura } = await db.from('assinaturas_dentista')
    .select('id, stripe_subscription_id').eq('usuario_id', input.userId).eq('clinica_id', input.clinicId)
    .in('status', ['trialing', 'active', 'past_due']).maybeSingle<{ id: string; stripe_subscription_id: string | null }>();
  if (!assinatura?.stripe_subscription_id) return { ok: false, error: 'Assinatura Stripe não encontrada.' };

  await getStripeClient().subscriptions.update(assinatura.stripe_subscription_id, {
    pause_collection: { behavior: 'void' },
  });
  const agora = new Date().toISOString();
  const [{ error: assinaturaError }, { error: clinicaError }] = await Promise.all([
    db.from('assinaturas_dentista').update({ billing_paused_at: agora })
      .eq('id', assinatura.id).eq('usuario_id', input.userId),
    db.from('clinicas').update({ status_elegibilidade: 'bloqueada' })
      .eq('id', input.clinicId).in('status_elegibilidade', ['decisao_pendente', 'recompondo_equipe']),
  ]);
  if (assinaturaError || clinicaError) return { ok: false, error: 'Pausa criada, mas o estado local precisa ser reconciliado.' };
  return { ok: true };
}

export async function processarPrazosFormacao(): Promise<{
  formacoesExpiradas: number;
  decisoesPendentes: number;
  ativacoesRetomadas: number;
}> {
  if (process.env.STRIPE_BILLING_ENABLED !== 'true') {
    return { formacoesExpiradas: 0, decisoesPendentes: 0, ativacoesRetomadas: 0 };
  }
  const db = createServiceClient();
  const agora = new Date().toISOString();

  const { data: expiradas, error: expireError } = await db.from('formacoes_clinica')
    .update({ status: 'expirada', activation_lease_token: null, activation_lease_until: null })
    .in('status', ['aguardando_equipe', 'coletando_pagamento'])
    .lte('expires_at', agora).select('id, clinica_id, criado_por_usuario_id');
  if (expireError) throw expireError;

  for (const formacao of expiradas ?? []) {
    const { data: participantes, error: participantesError } = await db.from('assinaturas_dentista')
      .select('id, usuario_id').eq('formacao_id', formacao.id as string);
    if (participantesError) throw participantesError;

    const convidados = (participantes ?? []).filter(
      (participante) => participante.usuario_id !== formacao.criado_por_usuario_id,
    );
    const idsConvidados = convidados.map((participante) => participante.usuario_id as string);

    const { error: cancelarError } = await db.from('assinaturas_dentista')
      .update({ status: 'canceled' }).eq('formacao_id', formacao.id as string)
      .in('status', ['aguardando_formacao', 'checkout_pendente', 'cartao_pronto']);
    if (cancelarError) throw cancelarError;

    const { error: convitesError } = await db.from('convites')
      .update({ status: 'cancelado' })
      .eq('clinica_id', formacao.clinica_id as string)
      .eq('role', 'dentista')
      .eq('status', 'pendente');
    if (convitesError) throw convitesError;

    if (idsConvidados.length > 0) {
      const { error: membrosError } = await db.from('clinica_usuarios')
        .update({ status: 'removido', removed_at: agora })
        .eq('clinica_id', formacao.clinica_id as string)
        .eq('status', 'pendente')
        .in('usuario_id', idsConvidados);
      if (membrosError) throw membrosError;

      const { error: perfisError } = await db.from('dentistas')
        .update({ ativo: false }).eq('clinica_id', formacao.clinica_id as string)
        .in('user_id', idsConvidados);
      if (perfisError) throw perfisError;

      for (const usuarioId of idsConvidados) {
        const { data: outroVinculo } = await db.from('clinica_usuarios')
          .select('clinica_id').eq('usuario_id', usuarioId).eq('status', 'ativo')
          .neq('clinica_id', formacao.clinica_id as string).limit(1)
          .maybeSingle<{ clinica_id: string }>();
        const { error: contextoError } = await db.from('users')
          .update({ active_clinica_id: outroVinculo?.clinica_id ?? null }).eq('id', usuarioId);
        if (contextoError) throw contextoError;
      }
    }

    const { error: capacidadeError } = await db.from('clinicas')
      .update({ limite_dentistas: 1 }).eq('id', formacao.clinica_id as string).eq('plano', 'SOLO');
    if (capacidadeError) throw capacidadeError;
  }

  const { data: decisoes, error: decisionError } = await db.from('clinicas')
    .update({ status_elegibilidade: 'decisao_pendente' })
    .eq('status_elegibilidade', 'recompondo_equipe')
    .lte('equipe_minima_ends_at', agora).select('id');
  if (decisionError) throw decisionError;

  const { data: retomaveis, error: retryError } = await db.from('formacoes_clinica')
    .select('id').eq('status', 'ativando')
    .or(`activation_lease_until.is.null,activation_lease_until.lte.${agora}`);
  if (retryError) throw retryError;
  const { ativarFormacaoSePronta } = await import('./assinatura-dentista');
  for (const formacao of retomaveis ?? []) await ativarFormacaoSePronta(formacao.id as string);

  return {
    formacoesExpiradas: expiradas?.length ?? 0,
    decisoesPendentes: decisoes?.length ?? 0,
    ativacoesRetomadas: retomaveis?.length ?? 0,
  };
}

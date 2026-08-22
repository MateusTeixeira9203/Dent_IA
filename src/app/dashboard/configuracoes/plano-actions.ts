'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/server/auth/roles';
import { isCicloCobranca } from '@/lib/billing/plan-catalog';
import {
  iniciarFormacaoClinica,
  manterClinicaBloqueada,
  migrarClinicaParaConsultorio,
} from '@/server/services/formacao-clinica';
import { criarPortalAssinaturaDentista } from '@/server/services/assinatura-dentista';

export interface StatusMigracao {
  dentistasAtivos: number;
  cartoesProntos: number;
  planoAtual: string;
  statusFormacao: string | null;
  expiresAt: string | null;
  podeAtivar: boolean;
}

export async function verificarStatusMigracao(): Promise<
  { ok: true; status: StatusMigracao } | { ok: false; error: string }
> {
  const { supabase, clinicId } = await requireRole(['admin', 'dentista']);
  const [{ data: clinica }, { count: ativos }, { data: formacao }] = await Promise.all([
    supabase.from('clinicas').select('plano').eq('id', clinicId).single(),
    supabase.from('dentistas').select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicId).in('role', ['admin', 'dentista']).eq('ativo', true),
    supabase.from('formacoes_clinica').select('id, status, expires_at')
      .eq('clinica_id', clinicId)
      .in('status', ['aguardando_equipe', 'coletando_pagamento', 'ativando'])
      .maybeSingle<{ id: string; status: string; expires_at: string }>(),
  ]);
  if (!clinica) return { ok: false, error: 'Clínica não encontrada.' };

  const { count: cartoes } = formacao
    ? await supabase.from('assinaturas_dentista').select('id', { count: 'exact', head: true })
      .eq('formacao_id', formacao.id).eq('status', 'cartao_pronto')
    : { count: 0 };

  return {
    ok: true,
    status: {
      dentistasAtivos: ativos ?? 0,
      cartoesProntos: cartoes ?? 0,
      planoAtual: (clinica as { plano: string }).plano,
      statusFormacao: formacao?.status ?? null,
      expiresAt: formacao?.expires_at ?? null,
      podeAtivar: (cartoes ?? 0) >= 2,
    },
  };
}

export async function iniciarFormacaoClinicaAction(ciclo: string): Promise<
  { ok: true; formacaoId: string; expiresAt: string } | { ok: false; error: string }
> {
  if (!isCicloCobranca(ciclo)) return { ok: false, error: 'Ciclo de cobrança inválido.' };
  try {
    const { user, clinicId, dentistaId } = await requireRole(['admin', 'dentista']);
    const result = await iniciarFormacaoClinica({ userId: user.id, clinicId, dentistaId, ciclo });
    if (result.ok) revalidatePath('/dashboard/configuracoes');
    return result;
  } catch (error) {
    console.error('[plano] formação não iniciada:', error);
    return { ok: false, error: 'Não foi possível iniciar a formação. Tente novamente.' };
  }
}

export async function migrarParaConsultorioAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, clinicId } = await requireRole(['admin', 'dentista']);
    const result = await migrarClinicaParaConsultorio({ userId: user.id, clinicId });
    if (result.ok) revalidatePath('/dashboard');
    return result;
  } catch (error) {
    console.error('[plano] migração para Consultório falhou:', error);
    return { ok: false, error: 'Não foi possível alterar o plano. Nenhuma nova cobrança foi criada; tente novamente.' };
  }
}

export async function continuarClinicaBloqueadaAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, clinicId } = await requireRole(['admin', 'dentista']);
    const result = await manterClinicaBloqueada({ userId: user.id, clinicId });
    if (result.ok) revalidatePath('/dashboard');
    return result;
  } catch (error) {
    console.error('[plano] pausa da Clínica falhou:', error);
    return { ok: false, error: 'Não foi possível pausar o plano. Tente novamente.' };
  }
}

export async function abrirPortalCobrancaAction(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { user, clinicId } = await requireRole(['admin', 'dentista']);
    const result = await criarPortalAssinaturaDentista(user.id, clinicId);
    if (!result.url) return { ok: false, error: result.error ?? 'Portal de cobrança indisponível.' };
    return { ok: true, url: result.url };
  } catch (error) {
    console.error('[plano] portal indisponível:', error);
    return { ok: false, error: 'Portal de cobrança indisponível. Tente novamente.' };
  }
}

/** O plano nunca é ativado por clique: só webhooks Stripe confirmados podem ativar. */
export async function ativarPlanoClinica(): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'A ativação é automática após dois cartões e dois webhooks válidos.' };
}

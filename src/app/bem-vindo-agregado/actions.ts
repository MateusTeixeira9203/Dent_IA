'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { criarCheckoutAssinaturaDentista, criarPortalAssinaturaDentista } from '@/server/services/assinatura-dentista';
import { isCicloCobranca } from '@/lib/billing/plan-catalog';

async function resolverClinicaCobranca(userId: string): Promise<string | null> {
  const db = createServiceClient();
  const { data: pendente } = await db.from('clinica_usuarios').select('clinica_id')
    .eq('usuario_id', userId).in('role', ['admin', 'dentista'])
    .in('status', ['pendente', 'suspenso']).order('updated_at', { ascending: false })
    .limit(1).maybeSingle<{ clinica_id: string }>();
  if (pendente) return pendente.clinica_id;
  const { data: ativa } = await db.from('clinica_usuarios').select('clinica_id')
    .eq('usuario_id', userId).in('role', ['admin', 'dentista']).eq('status', 'ativo')
    .order('updated_at', { ascending: false }).limit(1).maybeSingle<{ clinica_id: string }>();
  return ativa?.clinica_id ?? null;
}

/**
 * Cria ou retoma o Checkout hospedado da Stripe para o dentista convidado.
 */
export async function createCheckoutAgregado(ciclo: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    if (!isCicloCobranca(ciclo)) return { error: 'Ciclo de cobrança inválido.' };
    const clinicId = await resolverClinicaCobranca(user.id);
    if (!clinicId) return { error: 'Vínculo de cobrança não encontrado.' };
    return await criarCheckoutAssinaturaDentista(user.id, ciclo, undefined, clinicId);
  } catch (err) {
    console.error('[createCheckoutAgregado] falha Stripe:', err);
    return { error: 'Não foi possível abrir o checkout. Tente novamente.' };
  }
}

export async function createPortalAgregado(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  try {
    const clinicId = await resolverClinicaCobranca(user.id);
    if (!clinicId) return { error: 'Vínculo de cobrança não encontrado.' };
    return await criarPortalAssinaturaDentista(user.id, clinicId);
  } catch (err) {
    console.error('[createPortalAgregado] falha Stripe:', err);
    return { error: 'Não foi possível abrir a atualização de pagamento. Tente novamente.' };
  }
}

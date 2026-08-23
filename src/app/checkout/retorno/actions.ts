'use server';

import { requireClinicContext } from '@/server/auth/clinic';
import { createServiceClient } from '@/lib/supabase/service';
import { clinicaIsentaDeCobranca } from '@/lib/billing/exemptions';

export type EstadoRetornoCheckout =
  | { estado: 'confirmado'; formacao: boolean }
  | { estado: 'aguardando' }
  | { estado: 'erro'; mensagem: string };

/**
 * A URL de retorno da Stripe nunca é tratada como prova de pagamento. Esta ação consulta
 * somente a assinatura do usuário autenticado, já sincronizada pelo webhook.
 */
export async function conferirRetornoCheckout(): Promise<EstadoRetornoCheckout> {
  const { user, clinicId } = await requireClinicContext();

  if (clinicaIsentaDeCobranca(clinicId)) {
    return { estado: 'confirmado', formacao: false };
  }

  const db = createServiceClient();
  const { data: assinatura, error } = await db
    .from('assinaturas_dentista')
    .select('status, plano, formacao_id')
    .eq('usuario_id', user.id)
    .eq('clinica_id', clinicId)
    .maybeSingle<{ status: string; plano: 'CONSULTORIO' | 'CLINICA'; formacao_id: string | null }>();

  if (error) {
    console.error('[checkout/retorno] falha ao consultar assinatura:', error.message);
    return { estado: 'erro', mensagem: 'Não foi possível confirmar sua assinatura agora.' };
  }
  if (!assinatura) return { estado: 'aguardando' };

  if (['trialing', 'active', 'past_due'].includes(assinatura.status)) {
    return { estado: 'confirmado', formacao: assinatura.plano === 'CLINICA' };
  }
  if (assinatura.plano === 'CLINICA' && assinatura.status === 'cartao_pronto' && assinatura.formacao_id) {
    return { estado: 'confirmado', formacao: true };
  }
  return { estado: 'aguardando' };
}

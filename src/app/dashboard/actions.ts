'use server';

import { requireClinicContext } from '@/server/auth/clinic';
import { reconciliarAcessoCobranca } from '@/server/services/assinatura-dentista';

export async function regularizarPagamento(): Promise<
  | { estado: 'liberado' }
  | { estado: 'checkout'; url: string }
  | { estado: 'planos'; url: string }
  | { estado: 'erro'; mensagem: string }
> {
  const { user, clinicId } = await requireClinicContext({ allowBlockedBilling: true });
  return reconciliarAcessoCobranca({ userId: user.id, clinicId });
}

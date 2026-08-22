import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import { getStripeClient } from '@/lib/stripe';

export async function avaliarMinimoClinica(clinicaId: string): Promise<void> {
  const db = createServiceClient();
  const { count, error } = await db.from('assinaturas_dentista')
    .select('id', { count: 'exact', head: true })
    .eq('clinica_id', clinicaId).eq('plano', 'CLINICA').in('status', ['trialing', 'active']);
  if (error) throw error;

  if ((count ?? 0) >= 2) {
    const { data: pausadas, error: pausedError } = await db.from('assinaturas_dentista')
      .select('id, stripe_subscription_id').eq('clinica_id', clinicaId).eq('plano', 'CLINICA')
      .not('billing_paused_at', 'is', null);
    if (pausedError) throw pausedError;
    for (const assinatura of pausadas ?? []) {
      if (assinatura.stripe_subscription_id) {
        await getStripeClient().subscriptions.update(assinatura.stripe_subscription_id as string, {
          pause_collection: '',
        });
      }
      const { error: clearError } = await db.from('assinaturas_dentista')
        .update({ billing_paused_at: null }).eq('id', assinatura.id as string);
      if (clearError) throw clearError;
    }
    const { error: updateError } = await db.from('clinicas').update({
      status_elegibilidade: 'regular',
      equipe_minima_ends_at: null,
    }).eq('id', clinicaId).neq('status_elegibilidade', 'regular');
    if (updateError) throw updateError;
    return;
  }

  const prazo = new Date(Date.now() + 48 * 60 * 60 * 1_000).toISOString();
  const { error: updateError } = await db.from('clinicas').update({
    status_elegibilidade: 'recompondo_equipe',
    equipe_minima_ends_at: prazo,
  }).eq('id', clinicaId).eq('status_elegibilidade', 'regular');
  if (updateError) throw updateError;
}

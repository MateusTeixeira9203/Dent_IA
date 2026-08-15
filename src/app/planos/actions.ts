'use server';

import { requireClinicContext } from '@/server/auth/clinic';
import { createServiceClient } from '@/lib/supabase/service';

/** R-105a §4.3 — 14 dias, o único lugar onde esse número mora. */
const TRIAL_DIAS = 14;

export type AtivarTrialResult =
  | { ok: true; trialEndsAt: string }
  | { ok: false; error: string };

/**
 * Dá partida no relógio do trial. **Só no relógio** — `plano` não é tocado aqui.
 *
 * R-105a §4.3(a) — três mudanças em relação à versão anterior, e as três são contrato:
 *
 *  1. **Não grava mais `plano: 'CLINICA'` hardcoded.** Isso jogava dentista solo no plano
 *     errado sem ele ter escolhido nada. Quem escreve plano é `definirPlano` (invariante I8).
 *  2. **Não redireciona.** Quem chama decide o que fazer — o card de ativação do Meu dia
 *     precisa do resultado na mão, não de um redirect pro dashboard.
 *  3. **É idempotente por construção**: o `trial_ends_at IS NULL` está no WHERE, não só numa
 *     leitura anterior. Duas chamadas concorrentes (o save do Meu dia e o cron do R-105b, por
 *     exemplo) não podem mover a data — a 2ª afeta 0 linhas e devolve o valor já gravado.
 *
 * Chamada logo DEPOIS do primeiro save do dentista (R-105a §5). Falha aqui nunca pode derrubar
 * o salvamento clínico (I6) — quem chama trata como best-effort, e o cron do R-105b §4.3
 * corrige quem ficou pra trás em até 24h (I5).
 */
export async function activateTrial(): Promise<AtivarTrialResult> {
  // requireClinicContext resolve clinicId via users.active_clinica_id + clinica_usuarios.
  // Nenhuma dependência de dentistas.maybeSingle().
  const { clinicId } = await requireClinicContext();

  const service = createServiceClient();

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DIAS);

  // `.select()` no update é o que distingue "gravei" de "não gravei": sem ele o Postgrest
  // devolve sucesso com 0 linhas afetadas e a gente não teria como saber que o WHERE barrou
  // (mesmo modo de falha silenciosa que o UPDATE-barrado-por-RLS já produziu neste projeto).
  const { data: gravadas, error: updateError } = await service
    .from('clinicas')
    .update({
      status_assinatura: 'trial',
      trial_ends_at:     trialEndsAt.toISOString(),
    })
    .eq('id', clinicId)
    .is('trial_ends_at', null)
    .neq('status_assinatura', 'ativo')
    .select('trial_ends_at');

  if (updateError) {
    console.error('[activateTrial] Erro ao atualizar clínica:', {
      message: updateError.message,
      code:    updateError.code,
    });
    return { ok: false, error: 'Erro ao ativar o trial. Se o problema persistir, contate o suporte.' };
  }

  if (gravadas && gravadas.length > 0) {
    console.log(`[activateTrial] Trial ativado — clinica_id=${clinicId}, expira em ${trialEndsAt.toISOString()}`);
    return { ok: true, trialEndsAt: trialEndsAt.toISOString() };
  }

  // 0 linhas: o WHERE barrou. Descobre por quê pra devolver a mensagem certa — e, no caso de
  // trial já iniciado, devolve a data REAL, que é o que o card precisa mostrar.
  const { data: clinica } = await service
    .from('clinicas')
    .select('status_assinatura, trial_ends_at')
    .eq('id', clinicId)
    .maybeSingle();

  if (!clinica) {
    console.error('[activateTrial] Clínica não encontrada:', clinicId);
    return { ok: false, error: 'Clínica não encontrada. Contate o suporte.' };
  }
  if (clinica.status_assinatura === 'ativo') {
    return { ok: false, error: 'Você já possui uma assinatura ativa.' };
  }
  if (clinica.trial_ends_at) {
    // Idempotência: não é erro do ponto de vista de quem chama — o relógio já está correndo.
    return { ok: true, trialEndsAt: clinica.trial_ends_at };
  }
  return { ok: false, error: 'Não foi possível ativar o trial. Tente novamente.' };
}

const PLANO_PRODUCT_IDS: Record<string, string> = {
  SOLO:    process.env.ABACATE_PAY_PRODUCT_SOLO ?? '',
  CLINICA: process.env.ABACATE_PAY_PRODUCT_CLINICA ?? '',
};

export async function createCheckout(
  planoId: 'SOLO' | 'CLINICA',
): Promise<{ url?: string; error?: string }> {
  // clinicId é emitido no metadata para que o webhook resolva a clínica
  // de forma determinística (payment-time reference), independente de qual
  // clínica o usuário tenha ativa quando o webhook for processado.
  const { user, clinicId } = await requireClinicContext();

  const apiKey = process.env.ABACATE_PAY_API_KEY;
  if (!apiKey) {
    return { error: 'Configuração de pagamento indisponível. Contate o suporte.' };
  }

  const productId = PLANO_PRODUCT_IDS[planoId];
  if (!productId) {
    return { error: `Produto do plano ${planoId} não configurado.` };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dentia.app.br';

  try {
    const res = await fetch('https://api.abacatepay.com/v1/billing/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frequency: 'MONTHLY',
        methods: ['PIX', 'CREDIT_CARD'],
        products: [{ externalId: productId, quantity: 1 }],
        returnUrl:    `${appUrl}/dashboard?status=success`,
        completionUrl: `${appUrl}/dashboard?status=success`,
        customer: {
          email:    user.email,
          metadata: { userId: user.id, clinicId, plano: planoId },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[createCheckout] Abacate Pay erro HTTP:', res.status, body);
      return { error: 'Erro ao criar link de pagamento. Tente novamente.' };
    }

    const json = (await res.json()) as { data?: { url?: string } };
    const checkoutUrl = json.data?.url;

    if (!checkoutUrl) {
      console.error('[createCheckout] Resposta sem URL:', json);
      return { error: 'Resposta inválida do gateway de pagamento.' };
    }

    return { url: checkoutUrl };
  } catch (err) {
    console.error('[createCheckout] Erro de conexão:', err);
    return { error: 'Falha de conexão com o gateway de pagamento.' };
  }
}

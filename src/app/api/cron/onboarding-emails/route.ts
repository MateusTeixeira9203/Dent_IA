/**
 * GET /api/cron/onboarding-emails
 *
 * R-105b §4.3 — régua D1/D3/D5/D6/D7 da assinatura individual Stripe.
 * Cada marco é reclamado atomicamente em `onboarding_comunicacoes`; executar o cron duas
 * vezes não duplica e uma falha temporária pode ser retomada depois do lease.
 *
 *   GET /api/cron/onboarding-emails
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { rodarOnboardingDiario } from '@/server/services/onboarding-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const resultado = await rodarOnboardingDiario();
    console.log('[cron/onboarding-emails]', JSON.stringify(resultado));
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/onboarding-emails] Erro:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

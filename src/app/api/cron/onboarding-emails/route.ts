/**
 * GET /api/cron/onboarding-emails
 *
 * R-105b §4.2 — a varredura diária do onboarding: régua de e-mail D1/D3/D7/D14 + a rede de
 * segurança do trial (§4.3). Espelha `api/whatsapp/run-reminders`, que é o cron que já roda
 * neste projeto — mesmo guard de `CRON_SECRET`, mesmo runtime, mesma forma de resposta.
 *
 * Agendado em `vercel.json` para 12:00 UTC (09:00 BRT). Roda **1×/dia**, e isso é contrato:
 * a anti-duplicata da régua é a janela de um dia exato, não uma tabela de log. Rodar duas vezes
 * no mesmo dia manda os mesmos e-mails de novo.
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

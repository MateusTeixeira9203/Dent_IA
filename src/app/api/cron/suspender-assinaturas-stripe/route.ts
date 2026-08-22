import { NextRequest, NextResponse } from 'next/server';
import { suspenderGracasVencidas } from '@/server/services/assinatura-dentista';
import { processarPrazosFormacao } from '@/server/services/formacao-clinica';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Varredura horária da graça de 3 dias de cobrança Stripe. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const [gracas, formacoes] = await Promise.all([
      suspenderGracasVencidas(),
      processarPrazosFormacao(),
    ]);
    return NextResponse.json({ ok: true, ...gracas, ...formacoes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao suspender assinaturas.';
    console.error('[cron/suspender-assinaturas-stripe]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

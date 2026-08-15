import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend } from '@/lib/email/resend';
import { withRateLimit } from '@/lib/rate-limit';

// Chamada transicional da landing (R-88): quem se interessou mas não vai pôr o cartão
// hoje deixa o e-mail aqui. É o ÚNICO ponto de captura de quem não converte.
//
// ROTA PÚBLICA e sem auth, de propósito — quem preenche ainda não tem conta.
// O rate limit é a única proteção, então ele é apertado.
//
// LIMITE DE HOJE: não existe envio automático da ficha. O PDF de exemplo ainda
// precisa ser encenado na Teste01, exportado e anonimizado. Até lá esta rota
// AVISA A EQUIPE, e quem responde é gente. O `replyTo` já vem com o e-mail do
// interessado pra resposta ser um clique.

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const DESTINO = process.env.LANDING_LEADS_TO ?? 'equipe@dentia.app.br';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limitado = await withRateLimit(req, 'landing:ficha-exemplo', 3, 60 * 60 * 1000);
  if (limitado) return limitado; // 429

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  const { email } = parsed.data;

  try {
    const { error } = await getResend().emails.send({
      from: 'Odonto.IA <equipe@dentia.app.br>',
      to: DESTINO,
      replyTo: email,
      subject: `Landing — pediram a ficha de exemplo: ${email}`,
      text: [
        `${email} pediu a ficha de exemplo da Maria na landing.`,
        '',
        'Responda este e-mail com a ficha em PDF (a resposta já vai direto pra pessoa).',
        '',
        'A página prometeu o envio "em instantes" — quanto mais rápido, melhor.',
      ].join('\n'),
    });

    if (error) {
      console.error('[landing/ficha-exemplo] Resend recusou o envio:', error);
      return NextResponse.json(
        { error: 'Não conseguimos registrar seu pedido agora. Tente de novo em instantes.' },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error('[landing/ficha-exemplo] Falha ao enviar:', err);
    return NextResponse.json(
      { error: 'Não conseguimos registrar seu pedido agora. Tente de novo em instantes.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getDentistaCached } from '@/lib/get-dentista';
import { getGoogleAuthUrl } from '@/lib/calendar/google-provider';

/**
 * GET /api/calendar/auth
 * Inicia o fluxo OAuth2 do Google Calendar.
 * Redireciona para a página de autorização do Google.
 */
export async function GET(): Promise<NextResponse> {
  const dentista = await getDentistaCached();
  if (!dentista) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? ''));
  }

  // R-35 item 7 — nonce aleatório guardado num cookie httpOnly e conferido no callback,
  // em vez do state ser só o dentistaId (previsível — não protegia contra CSRF de login).
  const nonce = randomUUID();
  const authUrl = getGoogleAuthUrl(`${nonce}:${dentista.id}`);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('google_oauth_state', nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/calendar/auth',
  });
  return response;
}

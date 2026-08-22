import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';

import { safeReturnPath } from '@/lib/auth/return-path';

/** Troca o token por sessão. Convites só são aceitos por gesto explícito na página do convite. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedNext = searchParams.get('next');
  const next = safeReturnPath(requestedNext);

  const authError = searchParams.get('error');
  if (authError) {
    console.error('[callback] erro OAuth recebido:', searchParams.get('error_description') ?? authError);
    const login = new URL('/login', origin);
    login.searchParams.set('error', 'oauth_failed');
    if (requestedNext) login.searchParams.set('next', next);
    return NextResponse.redirect(login);
  }

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => { pendingCookies.push(...cookies); },
      },
    },
  );

  const authResult = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Token de autenticação ausente.') };

  if (authResult.error) {
    console.error('[callback] autenticação falhou:', authResult.error.message);
    const login = new URL('/login', origin);
    login.searchParams.set('error', 'auth_callback_failed');
    if (requestedNext) login.searchParams.set('next', next);
    return NextResponse.redirect(login);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', origin));

  const continuaFluxoDeAuth = next.startsWith('/convite/') || next === '/redefinir-senha';
  let destination = next;
  if (!continuaFluxoDeAuth) {
    const { data: dentista } = await supabase
      .from('dentistas')
      .select('clinica_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    destination = dentista?.clinica_id
      ? (requestedNext ? next : '/dashboard')
      : '/onboarding';
  }

  const response = NextResponse.redirect(new URL(destination, origin));
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

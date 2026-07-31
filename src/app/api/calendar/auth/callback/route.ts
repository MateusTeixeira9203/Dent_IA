import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/calendar/google-provider';
import { createClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

/**
 * GET /api/calendar/auth/callback?code=...&state=<nonce>:<dentistaId>
 * Confere o nonce do state contra o cookie httpOnly gravado em /api/calendar/auth
 * (anti-CSRF), valida que o dentistaId pertence ao usuário autenticado + clínica ativa,
 * troca pelos tokens e redireciona.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=denied`);
  }

  // R-35 item 7 — sem essa checagem, o state era só o dentistaId (previsível): um
  // atacante que soubesse o dentistaId da vítima podia induzi-la a completar o callback
  // com um code da conta Google dele, sobrescrevendo o token dela.
  const [stateNonce, dentistaId] = state.split(':');
  const cookieNonce = request.cookies.get('google_oauth_state')?.value;

  if (!stateNonce || !dentistaId || !cookieNonce || stateNonce !== cookieNonce) {
    console.error('[calendar/callback] state inválido — nonce ausente ou não confere');
    return NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=denied`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=denied`);
  }

  // Resolve clínica ativa
  const { data: userRecord } = await supabase
    .from('users')
    .select('active_clinica_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!userRecord?.active_clinica_id) {
    return NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=error`);
  }

  // Valida que o dentistaId do state pertence ao usuário autenticado e à sua clínica ativa
  const { data: dentista } = await supabase
    .from('dentistas')
    .select('id')
    .eq('id', dentistaId)
    .eq('user_id', user.id)
    .eq('clinica_id', userRecord.active_clinica_id)
    .maybeSingle();

  if (!dentista) {
    console.error('[calendar/callback] dentistaId inválido ou não pertence ao usuário:', {
      dentistaId,
      userId: user.id,
      clinicId: userRecord.active_clinica_id,
    });
    return NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=error`);
  }

  let response: NextResponse;
  try {
    await exchangeCodeForTokens(code, dentistaId, userRecord.active_clinica_id);
    response = NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=connected`);
  } catch (err) {
    console.error('[calendar/callback] Erro ao trocar código:', err);
    response = NextResponse.redirect(`${APP_URL}/dashboard/agendamentos?calendar=error`);
  }

  // Nonce é de uso único — some do cookie tenha o exchange dado certo ou não.
  response.cookies.delete('google_oauth_state');
  return response;
}

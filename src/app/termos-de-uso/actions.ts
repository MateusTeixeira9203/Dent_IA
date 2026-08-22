'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireClinicContext } from '@/server/auth/clinic';
import { hashConteudo, termosUsoOdontoIA, TERMOS_USO_VERSAO } from '@/lib/legal/templates';

export async function aceitarTermosUso(): Promise<{ error?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || null;

  const { error } = await supabase.from('aceites_termos').upsert(
    {
      usuario_id: user.id,
      clinica_id: clinicId,
      versao: TERMOS_USO_VERSAO,
      conteudo_hash: hashConteudo(termosUsoOdontoIA()),
      ip,
      user_agent: requestHeaders.get('user-agent'),
    },
    { onConflict: 'usuario_id,versao', ignoreDuplicates: true },
  );

  if (error) {
    console.error('[R-120] aceitar termos:', error.message);
    return { error: 'Não foi possível registrar seu aceite. Tente novamente.' };
  }

  revalidatePath('/dashboard', 'layout');
  return {};
}

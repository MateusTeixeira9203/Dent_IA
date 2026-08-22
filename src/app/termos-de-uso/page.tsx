import { redirect } from 'next/navigation';
import { requireClinicContext } from '@/server/auth/clinic';
import { termosUsoOdontoIA, TERMOS_USO_VERSAO } from '@/lib/legal/templates';
import { TermosUsoClient } from './_components/termos-uso-client';

type Props = { searchParams: Promise<{ next?: string }> };

function destinoSeguro(next: string | undefined): string {
  return next?.startsWith('/dashboard') ? next : '/dashboard';
}

export default async function TermosUsoPage({ searchParams }: Props) {
  const { supabase, user } = await requireClinicContext();
  const [{ next }, { data: aceite }] = await Promise.all([
    searchParams,
    supabase
      .from('aceites_termos')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('versao', TERMOS_USO_VERSAO)
      .maybeSingle(),
  ]);
  const destino = destinoSeguro(next);
  if (aceite) redirect(destino);

  return <TermosUsoClient conteudo={termosUsoOdontoIA()} destino={destino} />;
}

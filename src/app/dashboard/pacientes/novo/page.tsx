import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import { createClient } from '@/lib/supabase/server';
import NovoPacienteForm from './_components/novo-paciente-form';

export default async function NovoPacientePage() {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');

  const isSecretaria = dentista.role === 'secretaria';

  let dentistas: { id: string; nome: string }[] = [];
  if (isSecretaria) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dentistas')
      .select('id, nome')
      .eq('clinica_id', dentista.clinica_id)
      // R-94 — .neq('role','secretaria') sozinho deixaria 'protetico' entrar no
      // seletor de dentista responsável pelo paciente novo.
      .in('role', ['admin', 'dentista'])
      .eq('ativo', true)
      .order('nome', { ascending: true });
    dentistas = data ?? [];
  }

  return <NovoPacienteForm isSecretaria={isSecretaria} dentistas={dentistas} />;
}

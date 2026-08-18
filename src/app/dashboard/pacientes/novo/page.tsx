import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import NovoPacienteForm from './_components/novo-paciente-form';

export default async function NovoPacientePage() {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');

  return <NovoPacienteForm />;
}

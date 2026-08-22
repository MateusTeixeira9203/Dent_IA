import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import { listarConversas } from './actions';
import { WhatsAppClient } from './_components/whatsapp-client';

export default async function WhatsAppPage() {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');

  // Conversas operacionais continuam na secretária. Dentistas usam a configuração
  // compartilhada pelo módulo do bot, sem ganhar acesso a financeiro/orçamentos de colegas.
  if (dentista.role === 'admin' || dentista.role === 'dentista') redirect('/dashboard/bot');
  if (dentista.role !== 'secretaria') redirect('/dashboard');

  const conversas = await listarConversas();

  return (
    <WhatsAppClient
      initialConversas={conversas}
      clinicaId={dentista.clinica_id}
    />
  );
}

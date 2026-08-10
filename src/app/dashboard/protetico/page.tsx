import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/layout/page-container';
import { ProteticoClient } from './_components/protetico-client';

export type PedidoProteticoRow = {
  id: string;
  observacao: string;
  data_entrega: string;
  status: 'pendente' | 'entregue';
  entregue_em: string | null;
  paciente: { id: string; nome: string } | null;
  dentista: { id: string; nome: string } | null;
};

export default async function ProteticoPage() {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');
  if (dentista.role !== 'protetico') redirect('/dashboard');

  const supabase = await createClient();

  // FKs explícitas — a tabela tem 2 FKs pra dentistas (protetico_id e dentista_id),
  // embed ambíguo é a mesma classe de bug que já derrubou /dashboard/orcamentos (R-67).
  const { data: pedidosRaw } = await supabase
    .from('pedidos_protetico')
    .select(
      'id, observacao, data_entrega, status, entregue_em,' +
        ' paciente:pacientes(id, nome),' +
        ' dentista:dentistas!pedidos_protetico_dentista_id_fkey(id, nome)',
    )
    .eq('clinica_id', dentista.clinica_id)
    .eq('protetico_id', dentista.id)
    .order('data_entrega', { ascending: true });

  const pedidos = (pedidosRaw ?? []) as unknown as PedidoProteticoRow[];

  return (
    <PageContainer variant="wide">
      <ProteticoClient pedidos={pedidos} nomeProtetico={dentista.nome} />
    </PageContainer>
  );
}

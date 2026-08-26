import { redirect } from 'next/navigation';
import { getDentistaCached } from '@/lib/get-dentista';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { PageContainer } from '@/components/layout/page-container';
import { ProteticoClient } from './_components/protetico-client';

export type PedidoProteticoRow = {
  id: string;
  observacao: string;
  data_entrega: string;
  status: 'pendente' | 'entregue';
  entregue_em: string | null;
  agendamento_data_hora: string | null;
  paciente: { id: string; nome: string } | null;
  dentista: { id: string; nome: string } | null;
};

type PedidoProteticoBase = Omit<PedidoProteticoRow, 'agendamento_data_hora' | 'paciente' | 'dentista'> & {
  paciente_id: string;
  dentista_id: string;
  agendamento_id: string | null;
};

export default async function ProteticoPage() {
  const dentista = await getDentistaCached();
  if (!dentista) redirect('/login');
  if (dentista.role !== 'protetico') redirect('/dashboard');

  const supabase = await createClient();

  // Esta primeira leitura é a fronteira de autorização: a RLS de pedidos_protetico só entrega
  // pedidos destinados ao protético logado. Pacientes e agendamentos não são embutidos aqui
  // porque as policies clínicas dessas tabelas, corretamente, não liberam o prontuário ao
  // protético. A hidratação mínima abaixo parte apenas dos IDs já autorizados.
  const { data: pedidosRaw, error: pedidosError } = await supabase
    .from('pedidos_protetico')
    .select(
      'id, observacao, data_entrega, status, entregue_em, paciente_id, dentista_id, agendamento_id',
    )
    .eq('clinica_id', dentista.clinica_id)
    .eq('protetico_id', dentista.id)
    .order('data_entrega', { ascending: true });

  if (pedidosError) throw new Error('Não foi possível carregar os pedidos do protético.');

  const pedidosBase = (pedidosRaw ?? []) as PedidoProteticoBase[];
  if (pedidosBase.length === 0) {
    return (
      <PageContainer variant="wide">
        <ProteticoClient pedidos={[]} nomeProtetico={dentista.nome} />
      </PageContainer>
    );
  }

  const pacienteIds = [...new Set(pedidosBase.map((pedido) => pedido.paciente_id))];
  const dentistaIds = [...new Set(pedidosBase.map((pedido) => pedido.dentista_id))];
  const agendamentoIds = [
    ...new Set(
      pedidosBase
        .map((pedido) => pedido.agendamento_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  // Service role é usada somente após a RLS autorizar cada pedido e sempre recorta pela clínica.
  // Retornamos identidade operacional mínima (nome + hora), nunca dados do prontuário.
  const service = createServiceClient();
  const agendamentosPromise = agendamentoIds.length > 0
    ? service
        .from('agendamentos')
        .select('id, data_hora')
        .eq('clinica_id', dentista.clinica_id)
        .in('id', agendamentoIds)
    : Promise.resolve({ data: [] as { id: string; data_hora: string }[], error: null });

  const [pacientesResult, dentistasResult, agendamentosResult] = await Promise.all([
    service
      .from('pacientes')
      .select('id, nome')
      .eq('clinica_id', dentista.clinica_id)
      .in('id', pacienteIds),
    service
      .from('dentistas')
      .select('id, nome')
      .eq('clinica_id', dentista.clinica_id)
      .in('id', dentistaIds),
    agendamentosPromise,
  ]);

  if (pacientesResult.error || dentistasResult.error || agendamentosResult.error) {
    throw new Error('Não foi possível identificar os dados dos pedidos do protético.');
  }

  const pacientesPorId = new Map((pacientesResult.data ?? []).map((row) => [row.id, row]));
  const dentistasPorId = new Map((dentistasResult.data ?? []).map((row) => [row.id, row]));
  const agendamentosPorId = new Map((agendamentosResult.data ?? []).map((row) => [row.id, row]));

  const pedidos: PedidoProteticoRow[] = pedidosBase.map((pedido) => ({
    id: pedido.id,
    observacao: pedido.observacao,
    data_entrega: pedido.data_entrega,
    status: pedido.status,
    entregue_em: pedido.entregue_em,
    agendamento_data_hora: pedido.agendamento_id
      ? (agendamentosPorId.get(pedido.agendamento_id)?.data_hora ?? null)
      : null,
    paciente: pacientesPorId.get(pedido.paciente_id) ?? null,
    dentista: dentistasPorId.get(pedido.dentista_id) ?? null,
  }));

  return (
    <PageContainer variant="wide">
      <ProteticoClient pedidos={pedidos} nomeProtetico={dentista.nome} />
    </PageContainer>
  );
}

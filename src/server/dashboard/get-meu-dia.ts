// R-46a — dados do "Meu dia": rail dos atendimentos + coluna de contexto por paciente.
// Spec: plans/specs/R-46-meu-dia.md. Leitura pura — zero escrita, zero server action.

import { createClient } from '@/lib/supabase/server';
import { hojeBRT, inicioDoDiaBRT, fimDoDiaBRT } from '@/lib/hora-brt';
import type { AgendamentoStatus } from '@/types/database';
import type { Arcada, QuadranteFDI, TipoRegistroOdontograma, OrtoManutencaoInfo } from '@/types/odontograma';

/** Mesma janela do `ultimaOrto` client-side (FichasTab.tsx) — replicada aqui em lote,
 *  server-side, pros pacientes do dia de uma vez. */
const JANELA_ORTO_DIAS = 120;

export interface MeuDiaSlot {
  agendamentoId: string;
  pacienteId: string;
  pacienteNome: string;
  /** "HH:MM" já formatado no fuso da clínica. */
  horario: string;
  statusAgendamento: AgendamentoStatus;
  /** G3 — existe `fichas.data_atendimento = hoje` pra este paciente (mesma régua do
   *  baseline medido em 31/07: paciente_id + data_atendimento = dia do atendimento). */
  temFichaHoje: boolean;
}

export interface MeuDiaPendencia {
  id: string;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  registradoEm: string;
  dentistaNome: string;
}

export interface MeuDiaUltimaVisita {
  data: string;
  dentistaNome: string;
  resumo: string;
}

export interface MeuDiaOrto {
  valor: OrtoManutencaoInfo;
  data: string;
  dentistaNome: string;
}

export interface MeuDiaContexto {
  ultimaVisita: MeuDiaUltimaVisita | null;
  pendencias: MeuDiaPendencia[];
  orto: MeuDiaOrto | null;
}

export interface MeuDiaData {
  slots: MeuDiaSlot[];
  contextoPorPaciente: Record<string, MeuDiaContexto>;
}

type AgendamentoRow = {
  id: string;
  data_hora: string;
  status: AgendamentoStatus;
  paciente: { id: string; nome: string } | null;
};

type FichaRow = {
  paciente_id: string;
  data_atendimento: string;
  queixa_principal: string | null;
  procedimentos: string[] | null;
  orto_manutencao: OrtoManutencaoInfo | null;
  dentista: { nome: string } | null;
};

type EventoRow = {
  id: string;
  paciente_id: string;
  tipo: TipoRegistroOdontograma;
  status: 'indicado' | 'realizado';
  origem: string;
  nivel: string;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  dente: number | null;
  faces: string[] | null;
  papel_no_grupo: string | null;
  registrado_em: string;
  created_at: string;
  dentista: { nome: string } | null;
};

/** Chave de âncora SEM status — o objetivo aqui é achar o evento mais recente por
 *  âncora (indiferente de status) pra então checar se ELE está indicado. Mesma ideia
 *  de identidade semântica que `chaveDedupEvento` usa em FichasTab.tsx, sem o status. */
function chaveAncora(e: EventoRow): string {
  return JSON.stringify([
    e.tipo, e.origem, e.nivel, e.arcada, e.quadrante, e.dente, [...(e.faces ?? [])].sort(),
    e.papel_no_grupo,
  ]);
}

export async function getMeuDiaData({
  clinicId,
  dentistaId,
  now = new Date(),
}: {
  clinicId: string;
  dentistaId: string;
  now?: Date;
}): Promise<MeuDiaData> {
  const supabase = await createClient();
  const hoje = hojeBRT(now);

  // G1 — fuso da clínica, não do servidor (dentista-dashboard.tsx usa startOfDay/endOfDay
  // do date-fns puro, que roda em UTC na Vercel; aqui usamos o padrão correto, o mesmo
  // que SecretaryDashboardServer já usa em dashboard/page.tsx).
  const { data: agendamentosRaw } = await supabase
    .from('agendamentos')
    .select('id, data_hora, status, paciente:pacientes(id, nome)')
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaId)
    .gte('data_hora', inicioDoDiaBRT(now).toISOString())
    .lte('data_hora', fimDoDiaBRT(now).toISOString())
    .neq('status', 'cancelled')
    .order('data_hora', { ascending: true });

  const agendamentos = ((agendamentosRaw ?? []) as unknown as AgendamentoRow[])
    .filter((a): a is AgendamentoRow & { paciente: NonNullable<AgendamentoRow['paciente']> } => a.paciente != null);

  if (agendamentos.length === 0) {
    return { slots: [], contextoPorPaciente: {} };
  }

  const pacienteIds = [...new Set(agendamentos.map((a) => a.paciente.id))];

  const [{ data: fichasHojeRaw }, { data: fichasRecentesRaw }, { data: eventosRaw }] = await Promise.all([
    supabase
      .from('fichas')
      .select('paciente_id')
      .eq('clinica_id', clinicId)
      .in('paciente_id', pacienteIds)
      .eq('data_atendimento', hoje),

    // Sem .limit(): contagem de fichas por paciente é pequena em produção (máx. observado:
    // 8; a maioria tem 1) — pegar tudo e reduzir em memória é mais simples que paginar
    // por paciente, que o Postgrest não faz nativamente.
    supabase
      .from('fichas')
      .select('paciente_id, data_atendimento, queixa_principal, procedimentos, orto_manutencao, dentista:dentistas(nome)')
      .eq('clinica_id', clinicId)
      .in('paciente_id', pacienteIds)
      .order('data_atendimento', { ascending: false })
      .order('created_at', { ascending: false }),

    // FK explícita: odontograma_eventos tem 2 FKs pra dentistas (dentista_id +
    // encaminhado_para, migration 106) — embed ambíguo sem desambiguar é o mesmo bug do R-44.
    //
    // SEM filtro de assinatura_id, de propósito (verificação adversarial 31/07 achou o
    // bug de tirar isso antes do reduce): um evento 'realizado' assinado precisa continuar
    // no páreo — senão o irmão 'indicado' mais antigo da MESMA âncora vence o reduce (a
    // chave não tem status) e reabre como pendência algo já feito e assinado.
    // assinatura_id só é setado em eventos 'realizado' (RPC assinar_procedimentos, migration
    // 111), então o filtro final `status !== 'indicado'` já garante que um vencedor assinado
    // nunca vira pendência — não precisa (e não pode) filtrar aqui.
    //
    // Tiebreaker por created_at: registrado_em é `date` (sem hora, migration 101) — indicar
    // e realizar na mesma consulta é o caso comum e empata a data. Sem 2ª chave de ordenação
    // o Postgres não garante qual linha empatada vem primeiro, e "o 1º visto é o vencedor"
    // deixa de valer.
    supabase
      .from('odontograma_eventos')
      .select(
        'id, paciente_id, tipo, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, registrado_em, created_at, dentista:dentistas!odontograma_eventos_dentista_id_fkey(nome)',
      )
      .eq('clinica_id', clinicId)
      .in('paciente_id', pacienteIds)
      .order('registrado_em', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  // G3 — granularidade é por paciente+dia, não por agendamento específico (verificação
  // adversarial 31/07): `fichas` não tem FK pra `agendamentos`, então 2 atendimentos do
  // mesmo paciente no mesmo dia (ex.: retorno) compartilham este sinal — o 2º slot herda
  // "registrado" do 1º mesmo sem ficha própria. Mesma régua da baseline da spec §6 (medida
  // por paciente+dia); resolver por agendamento pediria schema novo, fora do escopo desta
  // fatia (zero-escrita, zero-migration).
  const pacientesComFichaHoje = new Set(
    ((fichasHojeRaw ?? []) as { paciente_id: string }[]).map((f) => f.paciente_id),
  );

  const fichasPorPaciente = new Map<string, FichaRow[]>();
  for (const f of (fichasRecentesRaw ?? []) as unknown as FichaRow[]) {
    const arr = fichasPorPaciente.get(f.paciente_id) ?? [];
    arr.push(f);
    fichasPorPaciente.set(f.paciente_id, arr);
  }

  // G2 — "indicado sem realizado posterior": nenhuma implementação disto existia no
  // código (achado no mapeamento) — o vencedor por âncora é o de `registrado_em` mais
  // recente (a query já veio ordenada desc, então o 1º visto por chave é o vencedor).
  const vencedorPorAncora = new Map<string, EventoRow>();
  for (const e of (eventosRaw ?? []) as unknown as EventoRow[]) {
    const chave = `${e.paciente_id}::${chaveAncora(e)}`;
    if (!vencedorPorAncora.has(chave)) vencedorPorAncora.set(chave, e);
  }
  const pendenciasPorPaciente = new Map<string, MeuDiaPendencia[]>();
  for (const e of vencedorPorAncora.values()) {
    if (e.status !== 'indicado') continue;
    const arr = pendenciasPorPaciente.get(e.paciente_id) ?? [];
    arr.push({
      id: e.id,
      tipo: e.tipo,
      dente: e.dente,
      arcada: e.arcada,
      quadrante: e.quadrante,
      registradoEm: e.registrado_em,
      dentistaNome: e.dentista?.nome ?? 'Equipe',
    });
    pendenciasPorPaciente.set(e.paciente_id, arr);
  }

  const limiteOrto = new Date(now.getTime() - JANELA_ORTO_DIAS * 864e5)
    .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  const contextoPorPaciente: Record<string, MeuDiaContexto> = {};
  for (const pid of pacienteIds) {
    const fichas = fichasPorPaciente.get(pid) ?? [];
    const ultima = fichas[0];
    const ultimaVisita: MeuDiaUltimaVisita | null = ultima
      ? {
          data: ultima.data_atendimento,
          dentistaNome: ultima.dentista?.nome ?? 'Equipe',
          resumo: ultima.queixa_principal || (ultima.procedimentos ?? []).slice(0, 2).join(', ') || 'Evolução',
        }
      : null;

    // Mesma lógica do `ultimaOrto` (FichasTab.tsx): itera desc, primeira ficha com
    // orto_manutencao decide; se ela já está fora da janela de 120 dias, não há orto ativo.
    let orto: MeuDiaOrto | null = null;
    for (const f of fichas) {
      if (!f.orto_manutencao) continue;
      if (f.data_atendimento < limiteOrto) break;
      orto = { valor: f.orto_manutencao, data: f.data_atendimento, dentistaNome: f.dentista?.nome ?? 'Equipe' };
      break;
    }

    contextoPorPaciente[pid] = {
      ultimaVisita,
      pendencias: pendenciasPorPaciente.get(pid) ?? [],
      orto,
    };
  }

  const fmtHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });

  const slots: MeuDiaSlot[] = agendamentos.map((a) => ({
    agendamentoId: a.id,
    pacienteId: a.paciente.id,
    pacienteNome: a.paciente.nome,
    horario: fmtHora.format(new Date(a.data_hora)),
    statusAgendamento: a.status,
    temFichaHoje: pacientesComFichaHoje.has(a.paciente.id),
  }));

  return { slots, contextoPorPaciente };
}

// R-46a — dados do "Meu dia": rail dos atendimentos + coluna de contexto por paciente.
// Spec: plans/specs/R-46-meu-dia.md. Leitura pura — zero escrita, zero server action.

import { createClient } from '@/lib/supabase/server';
import { hojeBRT, inicioDoDiaBRT, fimDoDiaBRT } from '@/lib/hora-brt';
import type { AgendamentoStatus } from '@/types/database';
import type {
  Arcada, QuadranteFDI, NivelAncora, FaceDental, OrigemRegistro, PapelNoGrupo,
  TipoRegistroOdontograma, OrtoManutencaoInfo,
} from '@/types/odontograma';

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
  /**
   * R-46b (D4) — os 4 campos abaixo não existiam aqui antes (só exibição precisava de
   * tipo+onde). Vêm da MESMA query já buscada pras pendências, zero query nova — faltavam
   * só no shape de saída. Servem pra "fazer hoje →" reconstruir o `AncoraClinica` completo
   * e reusar o `id` real do evento (marcar `realizado` no MESMO registro via upsert — nunca
   * criar um novo ao lado, que deixaria a pendência original aberta e fantasma).
   */
  nivel: NivelAncora;
  origem: OrigemRegistro;
  faces: FaceDental[];
  grupoId: string | null;
  papelNoGrupo: PapelNoGrupo | null;
  observacao: string | null;
}

export interface MeuDiaEventoVisita {
  id: string;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
}

export interface MeuDiaUltimaVisita {
  data: string;
  dentistaNome: string;
  resumo: string;
  /** R-46a (ajuste 31/07) — eventos `realizado` do odontograma na data desta visita, mesma
   *  fonte já buscada pra pendências. Substitui o `resumo` (frase única, geralmente
   *  "Evolução" quando `queixa_principal`/`procedimentos` estão vazios) por itens tipados
   *  quando existem; `resumo` fica de fallback pra visitas sem evento estruturado. */
  eventos: MeuDiaEventoVisita[];
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
  /** R-46g (D9) — mesma fonte e parse do chip de alerta do hero (`next-appointment-hero.tsx`
   *  `alertas`): `pacientes.observacoes` quebrada por linha. Não é a derivação mais cara do
   *  C4 (5 fichas do `/consulta`) — é reaproveitar o que já existe, não construir de novo. */
  alertas: string[];
}

export interface MeuDiaCatalogoProcedimento {
  id: string;
  nome: string;
  categoria: string;
}

export interface MeuDiaData {
  slots: MeuDiaSlot[];
  contextoPorPaciente: Record<string, MeuDiaContexto>;
  /** R-46b (D2) — mesma tabela e mesma ordem que Orçamentos já usa
   *  (`orcamentos-client.tsx:213-226`): privada por dentista, alfabética. Decisão dele
   *  31/07: sem frequência de uso — "muito relativo, usar o que já está no sistema". */
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
}

type AgendamentoRow = {
  id: string;
  data_hora: string;
  status: AgendamentoStatus;
  paciente: { id: string; nome: string; observacoes: string | null } | null;
};

/** Mesmo parse do chip de alerta em `next-appointment-hero.tsx` (`alertas`) — D9. */
function parseAlertas(observacoes: string | null): string[] {
  return observacoes
    ? observacoes.split('\n').map((l) => l.trim()).filter(Boolean)
    : [];
}

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
  origem: OrigemRegistro;
  nivel: NivelAncora;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  dente: number | null;
  faces: FaceDental[] | null;
  papel_no_grupo: PapelNoGrupo | null;
  grupo_id: string | null;
  observacao: string | null;
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
  const { data: agendamentosRaw, error: agendamentosError } = await supabase
    .from('agendamentos')
    .select('id, data_hora, status, paciente:pacientes(id, nome, observacoes)')
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaId)
    .gte('data_hora', inicioDoDiaBRT(now).toISOString())
    .lte('data_hora', fimDoDiaBRT(now).toISOString())
    .neq('status', 'cancelled')
    .order('data_hora', { ascending: true });

  // R-46g (D6) — falhar alto em vez de engolir: RLS negando ou query quebrada não pode
  // virar "nenhum atendimento hoje" (mesmo modo de falha do bug histórico de Orçamentos).
  if (agendamentosError) {
    throw new Error(`[getMeuDiaData] agendamentos: ${agendamentosError.message}`);
  }

  const agendamentos = ((agendamentosRaw ?? []) as unknown as AgendamentoRow[])
    .filter((a): a is AgendamentoRow & { paciente: NonNullable<AgendamentoRow['paciente']> } => a.paciente != null);

  if (agendamentos.length === 0) {
    // Sem agendamento hoje não há slot pra selecionar — nada usa o catálogo neste render,
    // então não vale buscar (dentista_id é o mesmo de sempre, não muda por dia).
    return { slots: [], contextoPorPaciente: {}, catalogoProcedimentos: [] };
  }

  const pacienteIds = [...new Set(agendamentos.map((a) => a.paciente.id))];

  const [
    { data: fichasHojeRaw, error: fichasHojeError },
    { data: fichasRecentesRaw, error: fichasRecentesError },
    { data: eventosRaw, error: eventosError },
    { data: catalogoRaw, error: catalogoError },
  ] = await Promise.all([
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
        // grupo_id + observacao entraram no R-46b (D4) — só faltavam no shape de saída,
        // a query já buscava o resto. Ver comentário em MeuDiaPendencia.
        'id, paciente_id, tipo, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, grupo_id, observacao, registrado_em, created_at, dentista:dentistas!odontograma_eventos_dentista_id_fkey(nome)',
      )
      .eq('clinica_id', clinicId)
      .in('paciente_id', pacienteIds)
      .order('registrado_em', { ascending: false })
      .order('created_at', { ascending: false }),

    // R-46b (D2) — mesma query que orcamentos-client.tsx já faz: catálogo privado do
    // dentista, alfabética, sem frequência (decisão dele, 31/07).
    supabase
      .from('procedimentos')
      .select('id, nome, categoria')
      .eq('clinica_id', clinicId)
      .eq('dentista_id', dentistaId)
      .eq('ativo', true)
      .order('nome'),
  ]);

  if (fichasHojeError) throw new Error(`[getMeuDiaData] fichasHoje: ${fichasHojeError.message}`);
  if (fichasRecentesError) throw new Error(`[getMeuDiaData] fichasRecentes: ${fichasRecentesError.message}`);
  if (eventosError) throw new Error(`[getMeuDiaData] eventos: ${eventosError.message}`);
  if (catalogoError) throw new Error(`[getMeuDiaData] catalogo: ${catalogoError.message}`);

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
  // Mesmo vencedorPorAncora, só que o lado 'realizado' — vira os itens da última visita
  // (abaixo), em vez de uma 2ª query. Só precisa da data pra casar com `ultima.data_atendimento`.
  const realizadosPorPaciente = new Map<string, EventoRow[]>();
  for (const e of vencedorPorAncora.values()) {
    if (e.status === 'indicado') {
      const arr = pendenciasPorPaciente.get(e.paciente_id) ?? [];
      arr.push({
        id: e.id,
        tipo: e.tipo,
        dente: e.dente,
        arcada: e.arcada,
        quadrante: e.quadrante,
        registradoEm: e.registrado_em,
        dentistaNome: e.dentista?.nome ?? 'Equipe',
        nivel: e.nivel,
        origem: e.origem,
        faces: e.faces ?? [],
        grupoId: e.grupo_id,
        papelNoGrupo: e.papel_no_grupo,
        observacao: e.observacao,
      });
      pendenciasPorPaciente.set(e.paciente_id, arr);
    } else {
      const arr = realizadosPorPaciente.get(e.paciente_id) ?? [];
      arr.push(e);
      realizadosPorPaciente.set(e.paciente_id, arr);
    }
  }

  const limiteOrto = new Date(now.getTime() - JANELA_ORTO_DIAS * 864e5)
    .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // D9 — observacoes vem embutido no mesmo select de agendamentos; 1 por paciente basta
  // (não muda entre os agendamentos do dia do mesmo paciente).
  const observacoesPorPaciente = new Map(agendamentos.map((a) => [a.paciente.id, a.paciente.observacoes]));

  const contextoPorPaciente: Record<string, MeuDiaContexto> = {};
  for (const pid of pacienteIds) {
    const fichas = fichasPorPaciente.get(pid) ?? [];
    const ultima = fichas[0];
    const ultimaVisita: MeuDiaUltimaVisita | null = ultima
      ? {
          data: ultima.data_atendimento,
          dentistaNome: ultima.dentista?.nome ?? 'Equipe',
          resumo: ultima.queixa_principal || (ultima.procedimentos ?? []).slice(0, 2).join(', ') || 'Evolução',
          eventos: (realizadosPorPaciente.get(pid) ?? [])
            .filter((e) => e.registrado_em === ultima.data_atendimento)
            .map((e) => ({ id: e.id, tipo: e.tipo, dente: e.dente, arcada: e.arcada, quadrante: e.quadrante })),
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
      alertas: parseAlertas(observacoesPorPaciente.get(pid) ?? null),
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

  const catalogoProcedimentos: MeuDiaCatalogoProcedimento[] = (catalogoRaw ?? []) as MeuDiaCatalogoProcedimento[];

  return { slots, contextoPorPaciente, catalogoProcedimentos };
}

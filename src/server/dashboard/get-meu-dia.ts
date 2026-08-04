// R-46a — dados do "Meu dia": rail dos atendimentos + coluna de contexto por paciente.
// Spec: plans/specs/R-46-meu-dia.md. Leitura pura — zero escrita, zero server action.

import { createClient } from '@/lib/supabase/server';
import { hojeBRT, inicioDoDiaBRT, fimDoDiaBRT } from '@/lib/hora-brt';
import { calcularIdade } from '@/lib/paciente-form-helpers';
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
  /** C0 — `phead` do cockpit ("34 anos"). Mesmo `calcularIdade` do cadastro; null quando o
   *  paciente não tem `data_nascimento`. */
  pacienteIdade: number | null;
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
  /**
   * R-51 — `true` quando este `indicado` pertence a um `grupoId` que já tem ao menos um
   * irmão `realizado` (outra linha, mesmo grupo): o tratamento COMEÇOU e não terminou.
   *
   * Derivado a cada leitura, NUNCA persistido. É deliberado: `StatusRegistro` é
   * `'indicado' | 'realizado'` e o projeto não tem um único exhaustive check sobre ele —
   * um 3º valor no banco viraria `else` = realizado em 23 arquivos, em silêncio (pintaria
   * o dente de feito, sumiria de "A fazer", sairia do orçamento e imprimiria "Realizado"
   * no PDF que vai pro CRO). Mesmo modelo do C/P do Open Dental: agrupamento, não status.
   *
   * `false` também para todo evento sem grupo — ausência de grupo não é "em andamento".
   */
  emAndamento: boolean;
  /**
   * R-52 — autor real do registro. O núcleo clínico é compartilhado (hierarquia 3.1), então
   * a query de eventos NÃO filtra por dentista: sem este campo o cliente não tem como saber
   * o que é dele. Era essa cegueira que deixava "fazer hoje →" aparecer em pendência de
   * colega — o upsert reusa o `id` do outro, a RLS barra, e 0 linhas afetadas NÃO é erro:
   * o servidor devolvia `ok:true` e a tela dizia que gravou sem ter gravado.
   */
  dentistaId: string;
  /** R-52 — `null` = não encaminhada. Encaminhada some da lista de quem encaminhou. */
  encaminhadoParaId: string | null;
  encaminhadoParaNome: string | null;
}

export interface MeuDiaEventoVisita {
  id: string;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  /** R-55 — sem isso, restaurações de faces diferentes no mesmo dente renderizavam
   *  linhas idênticas (`ondeLabel` nunca imprimia face). */
  faces: FaceDental[];
  observacao: string | null;
}

export interface MeuDiaVisita {
  fichaId: string;
  data: string;
  dentistaNome: string;
  /** R-46a (ajuste 31/07) — frase única, geralmente "Evolução" quando `queixa_principal`/
   *  `procedimentos` estão vazios. Fallback pra visitas sem evento estruturado. */
  resumo: string;
  /** C0 — 1ª linha de `fichas.anotacoes`, ≤160 chars; vazio ou ausente vira `null`. */
  nota: string | null;
  /** Eventos `realizado` do odontograma vinculados a ESTA ficha (`ficha_id`, não data — C0.1).
   *  R-55: sem dedup por âncora — toda ocorrência real aparece, mesmo repetida. */
  eventos: MeuDiaEventoVisita[];
  /** R-46c — true quando `fichas.origem === 'importado'` (histórico transcrito do Word,
   *  D7: zero parsing). `historico-bloco.tsx` rotula como transcrito, nunca como
   *  atendimento (I3) — e o `resumo` usa a 1ª linha do texto colado em vez de cair em
   *  'Evolução' (mesmo defeito do achado 6 do R-46c, lugar novo). */
  importado: boolean;
}

/** R-55 — 1 ocorrência real de um procedimento (1 linha do banco), dentro de um grupo por
 *  âncora. `data` é a clínica quando existe (fiscalização CRO), senão a de registro. */
export interface MeuDiaOcorrenciaFeita {
  id: string;
  data: string;
  observacao: string | null;
  fichaId: string | null;
}

/** R-55 — acumulado clínico agrupado por âncora (não mais 1 evento solto): a dedup por
 *  âncora do servidor serve só à pendência agora (ver `chaveAncora`); aqui ela vira
 *  AGREGAÇÃO — nenhuma ocorrência realizada é descartada, `ocorrencias` tem todas, mais
 *  recente primeiro. */
export interface MeuDiaEventoFeito {
  /** Chave de React (a mesma `chaveAncora` do servidor) — nunca um id de banco. */
  chave: string;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  faces: FaceDental[];
  origem: OrigemRegistro;
  ocorrencias: MeuDiaOcorrenciaFeita[];
}

export interface MeuDiaOrto {
  valor: OrtoManutencaoInfo;
  data: string;
  dentistaNome: string;
}

export interface MeuDiaContexto {
  /** C0 — substitui `ultimaVisita`: histórico inteiro (`fichasRecentes`), não só a 1ª. */
  visitas: MeuDiaVisita[];
  /** C0 — novo. Estado clínico acumulado (painel "Já feito" do cockpit). */
  jaFeito: MeuDiaEventoFeito[];
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

/** R-52 — destino possível de um encaminhamento. */
export interface MeuDiaDestinoEncaminhar {
  id: string;
  nome: string;
}

export interface MeuDiaData {
  slots: MeuDiaSlot[];
  contextoPorPaciente: Record<string, MeuDiaContexto>;
  /** R-46b (D2) — mesma tabela e mesma ordem que Orçamentos já usa
   *  (`orcamentos-client.tsx:213-226`): privada por dentista, alfabética. Decisão dele
   *  31/07: sem frequência de uso — "muito relativo, usar o que já está no sistema". */
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** R-52 — dentistas que podem RECEBER um encaminhamento: ativos, não-secretárias, exceto
   *  eu. Mesmo filtro que `FichasTab` já usa pro `EncaminharBar`. */
  destinosEncaminhar: MeuDiaDestinoEncaminhar[];
  /** R-52 — quem sou eu. O bloco "A fazer" filtra contra isto pra mostrar só o que é meu;
   *  sem este campo o cliente teria que adivinhar autoria. */
  meuDentistaId: string;
}

type AgendamentoRow = {
  id: string;
  data_hora: string;
  status: AgendamentoStatus;
  paciente: { id: string; nome: string; observacoes: string | null; data_nascimento: string | null } | null;
};

/** Mesmo parse do chip de alerta em `next-appointment-hero.tsx` (`alertas`) — D9. */
function parseAlertas(observacoes: string | null): string[] {
  return observacoes
    ? observacoes.split('\n').map((l) => l.trim()).filter(Boolean)
    : [];
}

/** C0 — 1ª linha de `fichas.anotacoes`; vazia ou ausente vira `null`. Sem corte de tamanho —
 *  histórico mostra só a última visita agora, então o espaço sobra pra nota inteira. */
function notaDaFicha(anotacoes: string | null): string | null {
  const primeiraLinha = anotacoes?.split('\n')[0]?.trim();
  return primeiraLinha || null;
}

type FichaRow = {
  id: string;
  paciente_id: string;
  data_atendimento: string;
  queixa_principal: string | null;
  procedimentos: string[] | null;
  anotacoes: string | null;
  orto_manutencao: OrtoManutencaoInfo | null;
  dentista: { nome: string } | null;
  /** R-46c — dispara o rótulo "histórico importado" e o resumo por trecho colado. */
  origem: 'modo_consulta' | 'manual' | 'importado';
};

type EventoRow = {
  id: string;
  paciente_id: string;
  /** C0.1 — vínculo real com a visita (fichas.id). Antes disso o join era por data,
   *  que quebra com 2 fichas no mesmo dia (decisão dele 03/08: visita rápida sem abrir
   *  tratamento novo também gera ficha própria). null em eventos sem ficha (preexistente). */
  ficha_id: string | null;
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
  /** R-55 — data CLÍNICA do procedimento; único campo de data que a RPC de fechamento de
   *  pendência atualiza. Vira `MeuDiaOcorrenciaFeita.data` com fallback pra `registrado_em`. */
  realizado_em: string | null;
  created_at: string;
  dentista: { nome: string } | null;
  /** R-52 — autor bruto (o join acima só traz o nome). */
  dentista_id: string;
  encaminhado_para: string | null;
  encaminhado_dentista: { nome: string } | null;
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
    .select('id, data_hora, status, paciente:pacientes(id, nome, observacoes, data_nascimento)')
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
    // Sem agendamento hoje não há slot pra selecionar — nada usa o catálogo nem os destinos
    // de encaminhamento neste render, então não vale buscar (nenhum dos dois muda por dia).
    return {
      slots: [], contextoPorPaciente: {}, catalogoProcedimentos: [],
      destinosEncaminhar: [], meuDentistaId: dentistaId,
    };
  }

  const pacienteIds = [...new Set(agendamentos.map((a) => a.paciente.id))];

  const [
    { data: fichasHojeRaw, error: fichasHojeError },
    { data: fichasRecentesRaw, error: fichasRecentesError },
    { data: eventosRaw, error: eventosError },
    { data: catalogoRaw, error: catalogoError },
    { data: destinosRaw, error: destinosError },
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
      .select('id, paciente_id, data_atendimento, queixa_principal, procedimentos, anotacoes, orto_manutencao, origem, dentista:dentistas(nome)')
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
        // a query já buscava o resto. Ver comentário em MeuDiaPendencia. realizado_em
        // entrou no R-55 (histórico precisa da data clínica por ocorrência).
        // R-52: dentista_id (autor bruto) + encaminhado_para e o nome do destino. As DUAS FKs
        // apontam pra `dentistas`, então os dois embeds PRECISAM do `!fkey` desambiguando —
        // sem isso o Postgrest devolve 300 (é a família de bug do R-44). Mesmo par já usado
        // em FichasTab.tsx:943.
        'id, paciente_id, ficha_id, tipo, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, grupo_id, observacao, registrado_em, realizado_em, created_at, dentista_id, encaminhado_para, dentista:dentistas!odontograma_eventos_dentista_id_fkey(nome), encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey(nome)',
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

    // R-52 — destinos de encaminhamento. MESMO filtro que FichasTab.tsx:1001-1008 já usa
    // pro EncaminharBar (ativo, não-secretária, exceto eu) — não é regra nova.
    supabase
      .from('dentistas')
      .select('id, nome')
      .eq('clinica_id', clinicId)
      .neq('role', 'secretaria')
      .eq('ativo', true)
      .neq('id', dentistaId)
      .order('nome', { ascending: true }),
  ]);

  if (fichasHojeError) throw new Error(`[getMeuDiaData] fichasHoje: ${fichasHojeError.message}`);
  if (fichasRecentesError) throw new Error(`[getMeuDiaData] fichasRecentes: ${fichasRecentesError.message}`);
  if (eventosError) throw new Error(`[getMeuDiaData] eventos: ${eventosError.message}`);
  if (catalogoError) throw new Error(`[getMeuDiaData] catalogo: ${catalogoError.message}`);
  if (destinosError) throw new Error(`[getMeuDiaData] destinosEncaminhar: ${destinosError.message}`);

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
  //
  // R-55 — este Map serve SÓ à pendência (trava emendada em R-46-cockpit.md/contrato).
  // Aplicado ao histórico ele colapsava ocorrência repetida da mesma âncora (achado real
  // em produção: profilaxia/flúor/clareamento são SEMPRE a mesma chave, pra sempre — e
  // duas fichas de datas diferentes com o mesmo procedimento perdiam uma das duas).
  //
  // R-51 — o vencedor por âncora agora serve SÓ a evento SEM `grupo_id`. Motivo medido: o
  // caminho de escrita já cria uma 2ª linha com o mesmo `grupo_id` ao continuar um trabalho
  // aberto (ToothDetailPanel "Continuar o trabalho aberto?" → `criarDenteTipo(tipo, modos,
  // grupoId)`), e o upsert da RPC é escopado por `ficha_id` — então a sessão 2 (ficha nova)
  // grava a linha `realizado` sem tocar o `indicado` da ficha 1. Com ambos na mesma âncora,
  // o vencedor (mais recente = o `realizado`) escondia o `indicado` ainda aberto: o canal
  // sumia de "A fazer" no meio do tratamento e nunca voltava pra ser fechado de verdade.
  //
  // Duas divisões ORTOGONAIS convivem nesta função, não se confundem:
  //   R-55: pendência × histórico   ·   R-51: com grupo × sem grupo
  //
  // ⚠️ Borda conhecida, medida como INEXISTENTE hoje (0 colisões em 231 eventos, 03/08):
  // se um dia um evento COM grupo dividir âncora com um SEM grupo, tirar o de grupo do mapa
  // pode fazer um `indicado` sem grupo — antes suprimido pelo vencedor — voltar a aparecer.
  // Escolha deliberada: numa dúvida entre mostrar pendência a mais e esconder pendência a
  // menos, mostrar a mais é o erro seguro (esconder é exatamente o que o R-55 corrigiu).
  const vencedorPorAncora = new Map<string, EventoRow>();
  for (const e of (eventosRaw ?? []) as unknown as EventoRow[]) {
    if (e.grupo_id != null) continue; // R-51 — grupo tem caminho próprio, abaixo
    const chave = `${e.paciente_id}::${chaveAncora(e)}`;
    if (!vencedorPorAncora.has(chave)) vencedorPorAncora.set(chave, e);
  }

  // R-51 — grupos que já têm ao menos uma sessão feita. É isto (e só isto) que "em
  // andamento" significa: existe irmão `realizado` no mesmo grupo.
  const gruposComSessaoFeita = new Set<string>();
  for (const e of (eventosRaw ?? []) as unknown as EventoRow[]) {
    if (e.grupo_id == null || e.status !== 'realizado') continue;
    gruposComSessaoFeita.add(`${e.paciente_id}::${e.grupo_id}`);
  }

  const pendenciasPorPaciente = new Map<string, MeuDiaPendencia[]>();
  function pushPendencia(e: EventoRow, emAndamento: boolean) {
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
      emAndamento,
      dentistaId: e.dentista_id,
      encaminhadoParaId: e.encaminhado_para,
      encaminhadoParaNome: e.encaminhado_dentista?.nome ?? null,
    });
    pendenciasPorPaciente.set(e.paciente_id, arr);
  }

  // Sem grupo: comportamento idêntico ao de antes do R-51 (gate G2).
  for (const e of vencedorPorAncora.values()) {
    if (e.status !== 'indicado') continue;
    pushPendencia(e, false);
  }

  // Com grupo: todo `indicado` é pendência direta — sem resolução de vencedor. O `indicado`
  // do tratamento continua aberto enquanto o grupo não fechar, mesmo com sessões já feitas.
  for (const e of (eventosRaw ?? []) as unknown as EventoRow[]) {
    if (e.grupo_id == null || e.status !== 'indicado') continue;
    pushPendencia(e, gruposComSessaoFeita.has(`${e.paciente_id}::${e.grupo_id}`));
  }

  // R-55 — 2ª passagem, INDEPENDENTE do vencedor por âncora: histórico e acumulado
  // precisam de toda ocorrência realizada, não só a mais recente por âncora. `eventosRaw`
  // já vem ordenado `registrado_em desc, created_at desc` (query acima), então cada array
  // aqui nasce "mais recente primeiro" de graça.
  const realizadosPorPaciente = new Map<string, EventoRow[]>();
  for (const e of (eventosRaw ?? []) as unknown as EventoRow[]) {
    if (e.status !== 'realizado') continue;
    const arr = realizadosPorPaciente.get(e.paciente_id) ?? [];
    arr.push(e);
    realizadosPorPaciente.set(e.paciente_id, arr);
  }

  const limiteOrto = new Date(now.getTime() - JANELA_ORTO_DIAS * 864e5)
    .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // D9 — observacoes vem embutido no mesmo select de agendamentos; 1 por paciente basta
  // (não muda entre os agendamentos do dia do mesmo paciente).
  const observacoesPorPaciente = new Map(agendamentos.map((a) => [a.paciente.id, a.paciente.observacoes]));

  const contextoPorPaciente: Record<string, MeuDiaContexto> = {};
  for (const pid of pacienteIds) {
    const fichas = fichasPorPaciente.get(pid) ?? [];
    const eventosRealizados = realizadosPorPaciente.get(pid) ?? [];

    // C0.1 (03/08) — join por `ficha_id`, não por data. Decisão dele: visita rápida que só
    // avança um tratamento aberto também gera ficha própria, então 2 fichas no mesmo dia é
    // caso normal, não exceção — casar por data colava os eventos todos na 1ª e deixava a
    // 2ª vazia. `ficha_id` é o vínculo real (salvar-ficha.ts sempre grava).
    const visitas: MeuDiaVisita[] = fichas.map((f) => {
      // R-46c (D5) — importada não tem queixa/procedimentos (D7: zero parsing), então
      // sempre cairia em 'Evolução' pela regra normal (achado 6, lugar novo). `nota` fica
      // null pra não duplicar o mesmo trecho duas vezes na mesma visita.
      const importado = f.origem === 'importado';
      return {
      fichaId: f.id,
      data: f.data_atendimento,
      dentistaNome: f.dentista?.nome ?? 'Equipe',
      resumo: importado
        ? (notaDaFicha(f.anotacoes) ?? 'Histórico importado')
        : (f.queixa_principal || (f.procedimentos ?? []).slice(0, 2).join(', ') || 'Evolução'),
      nota: importado ? null : notaDaFicha(f.anotacoes),
      importado,
      eventos: eventosRealizados
        .filter((e) => e.ficha_id === f.id)
        .map((e) => ({
          id: e.id, tipo: e.tipo, dente: e.dente, arcada: e.arcada, quadrante: e.quadrante,
          faces: e.faces ?? [], observacao: e.observacao,
        })),
      };
    });

    // R-55 — acumulado clínico inteiro (não só a última visita), agrupado por âncora como
    // AGREGAÇÃO — nenhuma ocorrência é descartada. `eventosRealizados` já vem "mais recente
    // primeiro" (ordem da query), então tanto os grupos quanto `ocorrencias` dentro de cada
    // um nascem na ordem certa sem sort extra.
    const gruposJaFeito = new Map<string, MeuDiaEventoFeito>();
    for (const e of eventosRealizados) {
      const chave = chaveAncora(e);
      let grupo = gruposJaFeito.get(chave);
      if (!grupo) {
        grupo = {
          chave, tipo: e.tipo, dente: e.dente, arcada: e.arcada, quadrante: e.quadrante,
          faces: e.faces ?? [], origem: e.origem, ocorrencias: [],
        };
        gruposJaFeito.set(chave, grupo);
      }
      grupo.ocorrencias.push({
        id: e.id,
        data: e.realizado_em ?? e.registrado_em,
        observacao: e.observacao,
        fichaId: e.ficha_id,
      });
    }
    const jaFeito: MeuDiaEventoFeito[] = [...gruposJaFeito.values()];

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
      visitas,
      jaFeito,
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
    pacienteIdade: a.paciente.data_nascimento ? calcularIdade(a.paciente.data_nascimento) : null,
    horario: fmtHora.format(new Date(a.data_hora)),
    statusAgendamento: a.status,
    temFichaHoje: pacientesComFichaHoje.has(a.paciente.id),
  }));

  const catalogoProcedimentos: MeuDiaCatalogoProcedimento[] = (catalogoRaw ?? []) as MeuDiaCatalogoProcedimento[];
  const destinosEncaminhar: MeuDiaDestinoEncaminhar[] = (destinosRaw ?? []) as MeuDiaDestinoEncaminhar[];

  return { slots, contextoPorPaciente, catalogoProcedimentos, destinosEncaminhar, meuDentistaId: dentistaId };
}

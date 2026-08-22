'use client';

// Painel de detalhe de UM dente (Odontograma v3 — Fatia A).
// Design aprovado 18/07 (DESIGN-odontograma-v3.md §3): dente anatômico real como
// figura + mapa oclusal contornado pras 5 faces. Toque cicla estados; NADA persiste
// aqui — o painel só edita o rascunho de eventos; salvar é do "Confirmar e salvar"
// da tela-mãe (invariante #1).

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Forward, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';
import {
  faceLabel,
  corDoRegistro,
  TIPO_LABEL,
  type FaceDental,
  type OdontogramaEventoDraft,
  type TipoRegistroOdontograma,
  type StatusRegistro,
  type MomentoPlanejado,
  type AncoraClinica,
  type PapelNoGrupo,
} from '@/types/odontograma';
import { TOOTH_CLASS, DIMS, occlusalContourPath, occlusalZonePoints, occlusalLabelPos } from './tooth-geometry';
import { ToothSVG, buildResumos, TOOTH_NAMES, getQuadrantLabel, TEETH_UPPER, TEETH_LOWER, type ToothState } from './Odontograma';
// Detalhe de especialidade (migration 106) — resolvido por tipo CONCRETO, não pelo
// registry apagado (o registry só lê metadados; Form/Card são invocados com o tipo
// real, mesma convenção do orto em FichasTab).
import { endoDetalheSchema, type EndoDetalhe } from '@/lib/especialidades/endo';
import { EndoForm } from '@/components/fichas/endo-form';
import { implanteDetalheSchema, type ImplanteDetalhe } from '@/lib/especialidades/implante';
import { ImplanteForm } from '@/components/fichas/implante-form';
// R-107b — busca livre reusa o MESMO matcher zero-rede do campo mágico (28/28 fixtures),
// zero mudança na função. `criarProcedimento` reusa a action de configuracoes tal qual —
// já autoriza dentista (não só admin), já é o único caminho de escrita em `procedimentos`.
import { casarProcedimentoLocal, type SugestaoLocal } from '@/lib/odontograma/casar-procedimento-local';
import { criarProcedimento } from '@/app/dashboard/configuracoes/actions';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';

const FACES: FaceDental[] = ['V', 'M', 'O', 'D', 'L'];

type CorClinica = 'coral' | 'teal' | 'slate' | 'warning';

const COR_TOKEN = {
  coral:   'var(--color-coral)',
  teal:    'var(--color-teal)',
  slate:   'var(--color-slate)',
  warning: 'var(--color-warning)',
} satisfies Record<CorClinica, string>;

// Versão calibrada pra TEXTO (a cor cheia acima reprova AA em light mode sobre o
// próprio fundo tingido — achado auditoria UX 19/07). Fill/borda/ponto continuam
// usando COR_TOKEN normalmente; só cor-de-texto usa este mapa.
const COR_TOKEN_INK = {
  coral:   'var(--color-coral-ink)',
  teal:    'var(--color-teal-ink)',
  slate:   'var(--color-slate-ink)',
  warning: 'var(--color-warning-ink)',
} satisfies Record<CorClinica, string>;

/** Rótulo falado do estado de uma face, pro aria-label — cor sozinha não é
 * acessível (achado auditoria UX 19/07, CRITICAL #3: faces eram inoperáveis
 * por teclado/leitor de tela). */
const ROTULO_ESTADO_FACE = {
  coral: 'a fazer', teal: 'feito', slate: 'pré-existente', warning: 'próxima seção',
} satisfies Record<CorClinica, string>;

/** Chips de ação a nível de dente inteiro — cada um cicla os `modos` e depois remove.
 *  R-107b — `inclusao` saiu (uso real na base: 1 evento, 1 paciente — peso morto). O tipo
 *  continua existindo no TS/CHECK; o evento já registrado renderiza igual a antes. */
const CHIPS: { tipo: TipoRegistroOdontograma; modos: StatusRegistro[] }[] = [
  { tipo: 'endodontia',       modos: ['indicado', 'realizado'] },
  { tipo: 'coroa',            modos: ['indicado', 'realizado'] },
  { tipo: 'implante',         modos: ['indicado', 'realizado'] },
  { tipo: 'pino_nucleo',      modos: ['indicado', 'realizado'] },
  { tipo: 'exodontia',        modos: ['indicado', 'realizado'] },
  { tipo: 'fratura',          modos: ['indicado'] },
  { tipo: 'lesao_periapical', modos: ['indicado'] },
  { tipo: 'selante',          modos: ['realizado'] },
];

/** R-06: esfoliação só existe em decíduo (51–85) e só como fato consumado. */
const CHIP_ESFOLIACAO: { tipo: TipoRegistroOdontograma; modos: StatusRegistro[] } =
  { tipo: 'esfoliacao', modos: ['realizado'] };

/** ISO (registrado_em) → DD/MM/AAAA pro texto da confirmação de amarração (R-02 F3). */
function formatarData(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export interface ToothDetailPanelProps {
  dente: number;
  /** Lista COMPLETA de rascunhos (o painel filtra e devolve a lista completa editada). */
  eventos: OdontogramaEventoDraft[];
  onChange: (eventos: OdontogramaEventoDraft[]) => void;
  onClose: () => void;
  /** Data clínica default pros "realizado" (YYYY-MM-DD) — o dentista pode sobrescrever por evento. */
  dataPadrao: string;
  /**
   * R-02 Fase 3 — trabalhos ainda ABERTOS do paciente (algum evento `indicado`), de TODAS as
   * fichas dele. Ao criar um evento de tipo que já tem grupo aberto no MESMO dente, o painel
   * pergunta antes de amarrar ("continuar o trabalho aberto ou começar novo?") — nunca em
   * silêncio (Decisão 2, 25/07). Vazio = comportamento de sempre (todo evento nasce sem grupo).
   */
  gruposAbertos?: GrupoAberto[];
  /**
   * R-20 Fase 2 — destino (portal) da tabela de especialidade (endo/implante). Quando dado,
   * a tabela abre AQUI (full-width, abaixo do bloco odontograma+painel) em vez de espremida
   * dentro do painel estreito. Ausente = renderiza inline (fallback, ex.: modo consulta ainda
   * não migrado). O painel continua dono do form (mesmo `valor`/`onChange`); só muda o ONDE.
   */
  tabelaContainer?: HTMLElement | null;
  readOnly?: boolean;
  className?: string;
  /**
   * R-30 Parte 7 (contrato 3) — estado do dente na arcada (selecionado/compartilhado/
   * histórico), pro dente ampliado refletir o MESMO visual em vez de sempre 'default'.
   * Sem isto, um dente sem evento próprio (sem `resumo`) mostrava neutro aqui e colorido
   * na arcada — a inconsistência que ajudou a esconder o bug do "dente azul fantasma".
   * `resumo` (derivado de `eventos`, abaixo) continua tendo prioridade quando presente.
   */
  state?: ToothState;
  /**
   * R-63 — notifica o pai quando uma tabela de especialidade (endo/implante) abre ou fecha,
   * pro slot central do Meu dia decidir se troca o mapa. Ausente = comportamento de hoje
   * (I3): os outros 3 consumidores (FichasTab, /consulta, OdontogramaComPainel) não passam
   * isto e continuam intocados.
   */
  onDetalheAbertoChange?: (aberto: boolean) => void;
  /**
   * R-78 (achado dele 08/08) — abre o painel já com a tabela de especialidade DESTE
   * evento expandida, em vez do dentista precisar clicar "Detalhes" de novo depois de já
   * ter pedido pra ver a tabela (ex.: "⤢" num card de "Nesta ficha" no Meu dia). Ausente =
   * comportamento de sempre (nasce fechado, I3 — os outros consumidores não passam isto).
   */
  abrirDetalheDoEvento?: string;
  /**
   * R-107b — catálogo pro match local da busca livre (§3.1 da spec). Ausente = a busca só
   * casa os 18 tipos estruturais, sem sugestão de catálogo — mesmo padrão de degradação que
   * `captura-livre-card.tsx` já usa quando o catálogo não chega.
   */
  catalogoProcedimentos?: MeuDiaCatalogoProcedimento[];
}

export function ToothDetailPanel({
  dente,
  eventos,
  onChange,
  onClose,
  dataPadrao,
  gruposAbertos = [],
  tabelaContainer,
  readOnly = false,
  className,
  state = 'default',
  onDetalheAbertoChange,
  abrirDetalheDoEvento,
  catalogoProcedimentos = [],
}: ToothDetailPanelProps) {
  const superior = (dente >= 11 && dente <= 28) || (dente >= 51 && dente <= 65);
  const doDente = useMemo(
    () => eventos.filter((e) => e.ancora.dente === dente),
    [eventos, dente],
  );
  const resumo = useMemo(() => buildResumos(doDente).get(dente) ?? null, [doDente, dente]);

  const cls = TOOTH_CLASS[dente] ?? 'premolar';
  const { crownH, rootH } = DIMS[cls];
  const totalH = crownH + rootH;
  const scale = 1.7;
  const temPreexistente = doDente.some((e) => e.origem === 'preexistente');

  // Detalhe de especialidade (migration 106) — só endo/implante têm Form hoje. Um aberto
  // por vez (regra do artefato de dois-modos §02): abrir outro fecha o anterior.
  // `abrirDetalheDoEvento` (R-78) seeda já aberto — só no mount (função de inicialização),
  // não precisa reagir a mudança de prop: o painel inteiro remonta a cada dente novo.
  const [detalheAbertoIdx, setDetalheAbertoIdx] = useState<number | null>(() => {
    if (!abrirDetalheDoEvento) return null;
    const i = doDente.findIndex((e) => e.id === abrirDetalheDoEvento);
    return i === -1 ? null : i;
  });
  // R-63 — nova seleção de dente nunca herda detalhe aberto do anterior (mesmo princípio do
  // painelDenteAberto em meu-dia-client.tsx — seleção nova é sempre "do zero"). Ajuste de
  // estado LOCAL durante o render (padrão idAoResetar já usado no projeto) — não useEffect,
  // o lint (react-hooks/set-state-in-effect) bloqueia essa versão pra estado próprio.
  const [denteDoDetalhe, setDenteDoDetalhe] = useState(dente);
  if (dente !== denteDoDetalhe) {
    setDenteDoDetalhe(dente);
    setDetalheAbertoIdx(null);
  }
  // R-63 — avisa o pai (slot central do Meu dia) DEPOIS do commit, nunca durante o render de
  // outro componente: chamar `onDetalheAbertoChange` (que escreve estado em
  // `meu-dia-client.tsx`) direto no corpo do componente disparava "Cannot update a component
  // while rendering a different component" — achado ao vivo testando o ditado devolve-mapa.
  // Ausente = no-op (I3, os outros 3 consumidores não passam a prop).
  useEffect(() => {
    onDetalheAbertoChange?.(detalheAbertoIdx != null);
  }, [detalheAbertoIdx, onDetalheAbertoChange]);

  // R-02 Fase 3 — confirmação de amarração pendente: quando criar um evento de um tipo que
  // já tem trabalho aberto neste dente, guarda o que criar até o dentista decidir
  // continuar (reusa grupo_id) ou começar novo (grupo_id null). null = nada pendente.
  const [confirmGrupo, setConfirmGrupo] = useState<
    { grupo: GrupoAberto; tipo: TipoRegistroOdontograma; modos: StatusRegistro[] } | null
  >(null);

  // R-107b — busca livre: escape hatch pros procedimentos que não estão nos CHIPS (faceta é
  // o exemplo dele). Reusa `casarProcedimentoLocal` tal qual — zero rede, zero IA, mesmo
  // matcher do campo mágico. `catalogoPendente` espelha o mesmo padrão de `registrar-painel`
  // (item do catálogo não vira tipo estrutural sozinho — §A3, sem de-para confiável).
  const [busca, setBusca] = useState('');
  const [catalogoPendente, setCatalogoPendente] = useState<MeuDiaCatalogoProcedimento | null>(null);
  /** Preço em digitação pro "salvar no meu catálogo" — null = a ação nem foi aberta. */
  const [precoCatalogo, setPrecoCatalogo] = useState<string | null>(null);
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);
  /** Texto do último "Outro procedimento" lançado — habilita o "salvar no catálogo" logo
   *  depois do registro (o registro NUNCA espera por essa ação secundária). */
  const [ultimoAvulso, setUltimoAvulso] = useState<string | null>(null);

  const sugestoes: SugestaoLocal[] = useMemo(
    () => (busca.trim() ? casarProcedimentoLocal(busca, catalogoProcedimentos) : []),
    [busca, catalogoProcedimentos],
  );

  // R-06 — mini-fluxo da ponte (spec R-06-07 Fase 1): o dente atual é um extremo; o dentista
  // escolhe o outro, o vão nasce com papéis default (extremos pilar, meio pôntico) e cada
  // dente tem toggle antes de confirmar. Nada entra no rascunho até "Confirmar".
  const deciduo = dente >= 51 && dente <= 85;
  const arco = superior ? TEETH_UPPER : TEETH_LOWER;
  const [ponteFlow, setPonteFlow] = useState<
    { ate: number | null; papeis: Record<number, PapelNoGrupo>; status: StatusRegistro } | null
  >(null);

  /** Dentes do vão na ordem do arco (inclusive). [] se algum extremo não é do arco. */
  function spanPonte(a: number, b: number): number[] {
    const i = arco.indexOf(a);
    const j = arco.indexOf(b);
    if (i === -1 || j === -1) return [];
    const [lo, hi] = i < j ? [i, j] : [j, i];
    return arco.slice(lo, hi + 1);
  }

  /** Papéis default do vão: extremos pilar, intermediários pôntico (D1/D8 da spec). */
  function papeisDefault(span: number[]): Record<number, PapelNoGrupo> {
    const m: Record<number, PapelNoGrupo> = {};
    span.forEach((t, i) => { m[t] = i === 0 || i === span.length - 1 ? 'pilar' : 'pontico'; });
    return m;
  }

  const ponteSpan = ponteFlow?.ate != null ? spanPonte(dente, ponteFlow.ate) : [];
  /** D2 (soft): pôntico sobre dente sem ausência registrada — avisa, não bloqueia. */
  const ponticosSemAusencia = ponteSpan.filter(
    (t) =>
      ponteFlow?.papeis[t] === 'pontico' &&
      !eventos.some(
        (e) => e.ancora.dente === t && (e.tipo === 'exodontia' || e.tipo === 'esfoliacao') && e.status === 'realizado',
      ),
  );
  /** Sobreposição com outra ponte no rascunho — erro de lançamento, bloqueia confirmar. */
  const ponteConflito = ponteSpan.filter((t) =>
    eventos.some((e) => e.tipo === 'ponte' && e.ancora.dente === t),
  );

  function confirmarPonte() {
    if (!ponteFlow || ponteFlow.ate == null || ponteSpan.length < 2 || ponteConflito.length > 0) return;
    const gid = crypto.randomUUID();
    const novos = ponteSpan.map((t) => ({
      ...novo('ponte', ponteFlow.status, { nivel: 'dente' as const, dente: t }),
      grupo_id: gid,
      papel_no_grupo: ponteFlow.papeis[t] ?? 'pilar',
    }));
    onChange([...eventos, ...novos]);
    setPonteFlow(null);
  }

  /** Chip Ponte: sem ponte no dente → abre o fluxo; com ponte → cicla o status do GRUPO
   *  inteiro (indicado → realizado → remove) — ponte não é meio-instalada por dente (spec F1). */
  function cyclePonte() {
    if (readOnly) return;
    const meu = doDente.find((e) => e.tipo === 'ponte');
    if (!meu) {
      setPonteFlow({ ate: null, papeis: {}, status: 'indicado' });
      return;
    }
    const doGrupo = (e: OdontogramaEventoDraft) =>
      e.tipo === 'ponte' && (meu.grupo_id != null ? e.grupo_id === meu.grupo_id : e === meu);
    if (meu.status === 'indicado') {
      onChange(eventos.map((e) =>
        doGrupo(e) ? { ...e, status: 'realizado' as const, origem: 'clinica' as const, momento_planejado: 'sessao_atual' as const, realizado_em: e.realizado_em ?? dataPadrao } : e,
      ));
    } else {
      onChange(eventos.filter((e) => !doGrupo(e)));
    }
  }

  function atualizarDetalhe(evento: OdontogramaEventoDraft, detalhe: unknown) {
    onChange(eventos.map((e) => (e === evento ? { ...e, detalhe } : e)));
  }

  /**
   * Sinal do procedimento (artefato dois-modos §02, nível 1): o único dado que aparece
   * SEM abrir a tabela. Derivado, nunca digitado — se não há dado, não há sinal.
   */
  function sinalDoEvento(ev: OdontogramaEventoDraft): string | null {
    if (ev.tipo === 'endodontia') {
      const r = endoDetalheSchema.safeParse(ev.detalhe);
      if (!r.success) return null;
      const n = r.data.canais.filter((c) => c.nome.trim() !== '').length;
      return n > 0 ? `${n} ${n === 1 ? 'canal' : 'canais'}` : null;
    }
    if (ev.tipo === 'implante') {
      const r = implanteDetalheSchema.safeParse(ev.detalhe);
      if (!r.success) return null;
      const { diametro, comprimento, marca } = r.data;
      if (diametro != null && comprimento != null) return `${diametro} × ${comprimento}`;
      return marca ?? null;
    }
    return null;
  }

  const novo = (
    tipo: TipoRegistroOdontograma,
    status: StatusRegistro,
    ancora: AncoraClinica,
    // R-101 Fase 3 (TODO) — parâmetro dedicado quando o controle de 3 vias chegar aqui;
    // por ora todo evento novo nasce 'sessao_atual', igual sempre foi antes do R-101.
    momentoPlanejado: MomentoPlanejado = 'sessao_atual',
  ): OdontogramaEventoDraft => ({
    id: crypto.randomUUID(),
    tipo,
    status,
    origem: 'clinica',
    momento_planejado: momentoPlanejado,
    ancora,
    grupo_id: null,
    papel_no_grupo: null,
    observacao: '',
    realizado_em: status === 'realizado' ? dataPadrao : null,
  });

  /** Toque numa face: sem registro → a fazer → feito → remove (pré-existente reclassifica antes). */
  function cycleFace(face: FaceDental) {
    if (readOnly) return;
    const all = [...eventos];
    const i = all.findIndex(
      (e) => e.tipo === 'carie_restauracao' && e.ancora.dente === dente && (e.ancora.faces ?? []).includes(face),
    );
    if (i === -1) {
      // R-59 Parte 2 (B, 06/08) — outra face de carie_restauracao já indicada neste dente
      // no rascunho é a MESMA restauração (2ª face clicada antes de salvar), não uma 2ª
      // restauração. `grupo_id` compartilhado funde as duas em `agrupar-registros.ts`/
      // orçamento (`eventosParaItens`) sem juntar `faces` numa chave nova — dado antigo
      // sem grupo_id (gravado como eventos soltos) não é tocado, só o gesto de agora.
      const irmaoIdx = all.findIndex(
        (e) => e.tipo === 'carie_restauracao' && e.status === 'indicado' && e.ancora.dente === dente,
      );
      const irmao = irmaoIdx === -1 ? null : all[irmaoIdx];
      const grupoId = irmao ? (irmao.grupo_id ?? irmao.id) : null;
      const novoEvento = novo('carie_restauracao', 'indicado', { nivel: 'face', dente, faces: [face] });
      all.push(grupoId ? { ...novoEvento, grupo_id: grupoId } : novoEvento);
      if (irmao && !irmao.grupo_id) all[irmaoIdx] = { ...irmao, grupo_id: grupoId };
    } else {
      const e = all[i];
      if (e.status === 'indicado') {
        all[i] = { ...e, status: 'realizado', origem: 'clinica', momento_planejado: 'sessao_atual', realizado_em: dataPadrao };
      } else if (e.origem === 'preexistente') {
        // badge "reclassificar": vira "feito nesta clínica" mantendo realizado
        all[i] = { ...e, origem: 'clinica', realizado_em: e.realizado_em ?? dataPadrao };
      } else {
        const faces = (e.ancora.faces ?? []).filter((f) => f !== face);
        if (faces.length > 0) all[i] = { ...e, ancora: { ...e.ancora, faces } };
        else all.splice(i, 1);
      }
    }
    onChange(all);
  }

  /** Cria o evento de um tipo no dente. grupoId != null amarra a um trabalho aberto (R-02 F3). */
  function criarDenteTipo(tipo: TipoRegistroOdontograma, modos: StatusRegistro[], grupoId: string | null) {
    const all = [...eventos];
    const ancora: AncoraClinica =
      tipo === 'selante' ? { nivel: 'face', dente, faces: ['O'] } : { nivel: 'dente', dente };
    const ev = novo(tipo, modos[0], ancora);
    all.push(grupoId ? { ...ev, grupo_id: grupoId } : ev);
    // Endo/implante acabaram de ganhar tabela (migration 106) — abre sozinha na criação,
    // senão o dentista nunca descobre que ela existe (é o "preciso que apareça" de 21/07).
    if (tipo === 'endodontia' || tipo === 'implante') {
      setDetalheAbertoIdx(all.filter((e) => e.ancora.dente === dente).length - 1);
    }
    onChange(all);
  }

  /** Chips / raiz: cicla os modos do tipo e depois remove.
   *  R-107b — pra `exodontia`, ignora eventos `origem: 'preexistente'` (marcados por
   *  "Dente ausente", `toggleAusente` abaixo): as 2 ações usam o mesmo `tipo` mas são
   *  reivindicações clínicas diferentes ("eu extraí" × "já chegou faltando") e nunca podem
   *  se confundir uma com a outra no dedup. */
  function cycleDenteTipo(tipo: TipoRegistroOdontograma, modos: StatusRegistro[]) {
    if (readOnly) return;
    const i = eventos.findIndex((e) =>
      e.tipo === tipo && e.ancora.dente === dente &&
      (tipo !== 'exodontia' || e.origem !== 'preexistente'),
    );
    if (i === -1) {
      // R-02 Fase 3: criação. Se há trabalho aberto do mesmo tipo neste dente, confirmar
      // antes de amarrar (nunca em silêncio); senão nasce sem grupo, como sempre.
      const grupo = gruposAbertos.find((g) => g.tipo === tipo && g.dentes.includes(dente));
      if (grupo) { setConfirmGrupo({ grupo, tipo, modos }); return; }
      criarDenteTipo(tipo, modos, null);
    } else {
      const all = [...eventos];
      const e = all[i];
      const pos = modos.indexOf(e.status);
      const next = pos === -1 ? null : modos[pos + 1] ?? null;
      if (next == null) all.splice(i, 1);
      else all[i] = {
        ...e, status: next, origem: 'clinica',
        // R-101 — reseta ao virar realizado (constraint do banco não aceita as duas juntas).
        momento_planejado: next === 'realizado' ? 'sessao_atual' : e.momento_planejado,
        realizado_em: next === 'realizado' ? (e.realizado_em ?? dataPadrao) : null,
      };
      onChange(all);
    }
  }

  /** R-107b — "Dente ausente": reusa `exodontia` + `origem: 'preexistente'` em vez de um
   *  tipo novo (decisão dele). `buildResumos`/`corDoRegistro` já tratam `origem ===
   *  'preexistente'` como slate/tracejado — zero mudança de render. `realizado_em: null`
   *  porque "já chegou faltando" não tem data de procedimento nosso pra registrar. */
  function toggleAusente() {
    if (readOnly) return;
    const i = eventos.findIndex(
      (e) => e.tipo === 'exodontia' && e.origem === 'preexistente' && e.ancora.dente === dente,
    );
    if (i === -1) {
      onChange([...eventos, {
        id: crypto.randomUUID(),
        tipo: 'exodontia',
        status: 'realizado',
        origem: 'preexistente',
        momento_planejado: 'sessao_atual',
        ancora: { nivel: 'dente', dente },
        grupo_id: null,
        papel_no_grupo: null,
        observacao: '',
        realizado_em: null,
      }]);
    } else {
      onChange(eventos.filter((_, j) => j !== i));
    }
  }

  /** R-107b — limpa a busca e tudo que dependia dela. */
  function limparBusca() {
    setBusca('');
    setCatalogoPendente(null);
    setPrecoCatalogo(null);
    setUltimoAvulso(null);
  }

  /** R-107b — clique numa sugestão do matcher local. Mesmos 2 caminhos que o campo mágico
   *  já usa (`aplicarSugestaoLocal` em registrar-painel.tsx): tipo estrutural registra
   *  direto; item de catálogo pede o tipo clínico antes (§A3). `s.dentes` é ignorado de
   *  propósito — aqui o dente é o do painel, não o que o texto por acaso mencionou. */
  function aplicarSugestao(s: SugestaoLocal) {
    if (s.catalogo) { setCatalogoPendente(s.catalogo); return; }
    if (!s.tipo) return;
    const chip = [...CHIPS, CHIP_ESFOLIACAO].find((c) => c.tipo === s.tipo);
    // Tipo sem chip correspondente (nível boca, ponte, carie_restauracao) não tem `modos`
    // definidos — cai no ciclo padrão indicado→realizado, mesmo default de `novo()`.
    cycleDenteTipo(s.tipo, chip?.modos ?? ['indicado', 'realizado']);
    limparBusca();
  }

  /** R-107b — nada casou: registra como `outro` com o texto digitado na observação. É o
   *  escape hatch — a partir daqui o dentista NUNCA fica preso por falta de tipo. */
  function lancarAvulso() {
    if (readOnly) return;
    const texto = busca.trim();
    if (!texto) return;
    onChange([...eventos, {
      id: crypto.randomUUID(),
      tipo: 'outro',
      status: 'realizado',
      origem: 'clinica',
      momento_planejado: 'sessao_atual',
      ancora: { nivel: 'dente', dente },
      grupo_id: null,
      papel_no_grupo: null,
      observacao: texto,
      realizado_em: dataPadrao,
    }]);
    // O registro já aconteceu. `ultimoAvulso` só habilita a ação SECUNDÁRIA de salvar no
    // catálogo — pular ela não desfaz nem bloqueia nada.
    setUltimoAvulso(texto);
    setBusca('');
    setCatalogoPendente(null);
  }

  /** R-107b — ação secundária opcional: o procedimento avulso vira item do catálogo do
   *  dentista, pra da 2ª vez em diante já casar como sugestão (com preço). Reusa
   *  `criarProcedimento` tal qual — nenhuma escrita nova em `procedimentos`. */
  async function salvarNoCatalogo() {
    if (!ultimoAvulso || precoCatalogo == null) return;
    const preco = Number(precoCatalogo.replace(',', '.'));
    if (!Number.isFinite(preco) || preco < 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    setSalvandoCatalogo(true);
    let res: { error?: string };
    try {
      res = await criarProcedimento({
        nome: ultimoAvulso,
        descricao: '',
        categoria: 'Outros',
        preco_padrao: preco,
        duracao_minutos: 30,
      });
    } catch {
      res = { error: 'Falha de conexão. Tente novamente.' };
    }
    setSalvandoCatalogo(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`"${ultimoAvulso}" salvo no seu catálogo.`);
    setUltimoAvulso(null);
    setPrecoCatalogo(null);
  }

  function setData(evento: OdontogramaEventoDraft, data: string) {
    onChange(eventos.map((e) => (e === evento ? { ...e, realizado_em: data || null } : e)));
  }

  // R-04b Fase 0: o autor escreve a observação (contexto pro colega ao encaminhar). Persiste
  // via a mesma RPC 107 (salvar_eventos_odontograma já faz upsert de `observacao`).
  function setObservacao(evento: OdontogramaEventoDraft, observacao: string) {
    onChange(eventos.map((e) => (e === evento ? { ...e, observacao } : e)));
  }

  /** R-101 — liga/desliga "próxima seção". Só chamado com status='indicado' (o botão
   *  só aparece nesse caso) — a constraint do banco não aceita a outra combinação. */
  function toggleMomentoEvento(evento: OdontogramaEventoDraft) {
    onChange(eventos.map((e) => (e === evento
      ? { ...e, momento_planejado: e.momento_planejado === 'proxima_sessao' ? 'sessao_atual' : 'proxima_sessao' }
      : e)));
  }

  function remover(evento: OdontogramaEventoDraft) {
    if (readOnly) return;
    onChange(eventos.filter((e) => e !== evento));
  }

  function corFace(face: FaceDental): 'coral' | 'teal' | 'slate' | 'warning' | null {
    // Selante pinta a O; cárie/restauração pinta a face declarada.
    const ev = doDente.find(
      (e) =>
        (e.tipo === 'carie_restauracao' || e.tipo === 'selante') &&
        (e.ancora.faces ?? []).includes(face),
    );
    return ev ? corDoRegistro(ev.status, ev.origem, ev.momento_planejado) : null;
  }

  function chipEstado(tipo: TipoRegistroOdontograma) {
    const ev = doDente.find((e) => e.tipo === tipo);
    return ev ? corDoRegistro(ev.status, ev.origem, ev.momento_planejado) : null;
  }

  const rootFrac = rootH / totalH;

  return (
    <div
      className={cn('rounded-xl border p-4 flex flex-col gap-3', className)}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      role="region"
      aria-label={`Detalhe do dente ${dente}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-[15px]" style={{ color: 'var(--color-text-primary)' }}>{dente}</span>
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          {TOOTH_NAMES[dente] ?? ''}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{getQuadrantLabel(dente)}</span>
        {temPreexistente && (
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
            style={{ background: 'var(--color-slate-pale)', color: 'var(--color-slate-ink)' }}
          >
            Pré-existente
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-teal"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Fechar painel do dente"
        >
          <X size={15} strokeWidth={2.2} />
        </button>
      </div>

      {/* ── Figuras: dente anatômico + mapa oclusal ── */}
      <div className="flex items-center justify-center gap-6 py-1">
        {/* Dente anatômico (mesma geometria da arcada, ampliado) + raiz tocável */}
        <div
          className="relative"
          style={{ height: totalH * scale, width: DIMS[cls].w * scale }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <ToothSVG
              num={dente}
              isUpper={superior}
              state={state}
              hovered={false}
              showCheckbox={false}
              resumo={resumo}
            />
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => cycleDenteTipo('endodontia', ['indicado', 'realizado'])}
              className="absolute left-0 right-0 outline-none focus-visible:ring-1 focus-visible:ring-teal rounded"
              style={
                superior
                  ? { top: 0, height: `${rootFrac * 100}%` }
                  : { bottom: 0, height: `${rootFrac * 100}%` }
              }
              aria-label="Alternar canal (endodontia)"
              title="Tocar a raiz alterna o canal"
            />
          )}
        </div>

        {/* Mapa oclusal — as 5 faces tocáveis */}
        <div className="flex flex-col items-center gap-1.5">
          <svg width={132} height={132} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            <defs>
              <clipPath id={`occl-clip-${dente}`}>
                <path d={occlusalContourPath(dente)} />
              </clipPath>
              <pattern id={`occl-dots-${dente}`} width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="var(--color-surface)" />
              </pattern>
            </defs>
            <g clipPath={`url(#occl-clip-${dente})`}>
              {FACES.map((face) => {
                const cor = corFace(face);
                const rotulo = `Face ${faceLabel(face, dente)} — ${cor ? ROTULO_ESTADO_FACE[cor] : 'sem registro'}`;
                return (
                  <polygon
                    key={face}
                    points={occlusalZonePoints(face, dente)}
                    onClick={() => cycleFace(face)}
                    role={readOnly ? undefined : 'button'}
                    tabIndex={readOnly ? undefined : 0}
                    aria-label={readOnly ? undefined : rotulo}
                    onKeyDown={readOnly ? undefined : (e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleFace(face); }
                    }}
                    className={readOnly ? undefined : 'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal'}
                    style={{
                      fill: cor
                        ? `color-mix(in srgb, ${COR_TOKEN[cor]} ${cor === 'slate' ? 60 : 75}%, var(--color-surface-alt))`
                        : 'var(--color-surface-alt)',
                      stroke: 'var(--color-border)',
                      strokeWidth: 1,
                      cursor: readOnly ? 'default' : 'pointer',
                      transition: 'fill 0.15s ease',
                    }}
                  >
                    <title>{faceLabel(face, dente)}</title>
                  </polygon>
                );
              })}
              {FACES.map((face) =>
                corFace(face) === 'slate' ? (
                  <polygon
                    key={`dots-${face}`}
                    points={occlusalZonePoints(face, dente)}
                    style={{ fill: `url(#occl-dots-${dente})`, opacity: 0.5, pointerEvents: 'none' }}
                  />
                ) : null,
              )}
              {/* letras das faces */}
              {(['V', 'L', 'M', 'D', 'O'] as const).map((f) => {
                // Posição vem da geometria (respeita oval vs. molar) — bug de corte 21/07.
                const face = f as FaceDental;
                const { x: fx, y } = occlusalLabelPos(face, dente);
                return (
                  <text
                    key={f}
                    x={fx}
                    y={y}
                    textAnchor="middle"
                    style={{
                      fontSize: face === 'O' ? 11 : 9,
                      fontWeight: 700,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fill: corFace(face) ? 'var(--color-surface)' : 'var(--color-text-muted)',
                      pointerEvents: 'none',
                    }}
                  >
                    {f}
                  </text>
                );
              })}
            </g>
            <path
              d={occlusalContourPath(dente)}
              style={{ fill: 'none', stroke: 'var(--color-border)', strokeWidth: 1.6 }}
            />
          </svg>
          <span className="text-[9px] uppercase tracking-[0.14em] font-bold" style={{ color: 'var(--color-text-muted)' }}>
            {faceLabel('O', dente)} · toque uma face
          </span>
        </div>
      </div>

      {/* ── Chips de ação (dente inteiro) ── */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {(deciduo ? [...CHIPS, CHIP_ESFOLIACAO] : CHIPS).map(({ tipo, modos }) => {
            const cor = chipEstado(tipo);
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => cycleDenteTipo(tipo, modos)}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all outline-none focus-visible:ring-1 focus-visible:ring-teal"
                style={{
                  background: cor
                    ? `color-mix(in srgb, ${COR_TOKEN[cor]} 16%, var(--color-surface-alt))`
                    : 'var(--color-surface-alt)',
                  color: cor ? COR_TOKEN_INK[cor] : 'var(--color-text-secondary)',
                  border: `1px solid ${cor ? `color-mix(in srgb, ${COR_TOKEN[cor]} 45%, var(--color-border))` : 'var(--color-border)'}`,
                }}
              >
                {TIPO_LABEL[tipo]}
              </button>
            );
          })}
          {/* R-06 — ponte só em permanente; sem ponte abre o fluxo, com ponte cicla o grupo */}
          {!deciduo && (() => {
            const cor = chipEstado('ponte');
            const ativo = ponteFlow != null;
            return (
              <button
                type="button"
                onClick={cyclePonte}
                aria-expanded={ativo}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all outline-none focus-visible:ring-1 focus-visible:ring-teal"
                style={{
                  background: cor
                    ? `color-mix(in srgb, ${COR_TOKEN[cor]} 16%, var(--color-surface-alt))`
                    : ativo ? 'color-mix(in srgb, var(--color-teal) 10%, var(--color-surface-alt))'
                    : 'var(--color-surface-alt)',
                  color: cor ? COR_TOKEN_INK[cor] : ativo ? 'var(--color-teal-ink)' : 'var(--color-text-secondary)',
                  border: `1px solid ${cor ? `color-mix(in srgb, ${COR_TOKEN[cor]} 45%, var(--color-border))` : ativo ? 'var(--color-teal)' : 'var(--color-border)'}`,
                }}
              >
                {TIPO_LABEL.ponte}
              </button>
            );
          })()}

          {/* R-107b — "Dente ausente": o dente já chegou faltando (não fui eu que extraí).
              Reusa `exodontia` + origem preexistente; nunca colide com o chip de Extração
              (ver `cycleDenteTipo`). Fora do array CHIPS porque não cicla modos — é toggle. */}
          {(() => {
            const ausente = doDente.some(
              (e) => e.tipo === 'exodontia' && e.origem === 'preexistente',
            );
            return (
              <button
                type="button"
                onClick={toggleAusente}
                aria-pressed={ausente}
                title="O dente já chegou faltando — não foi extraído por mim"
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all outline-none focus-visible:ring-1 focus-visible:ring-teal"
                style={{
                  background: ausente
                    ? `color-mix(in srgb, ${COR_TOKEN.slate} 16%, var(--color-surface-alt))`
                    : 'var(--color-surface-alt)',
                  color: ausente ? COR_TOKEN_INK.slate : 'var(--color-text-secondary)',
                  border: `1px solid ${ausente ? `color-mix(in srgb, ${COR_TOKEN.slate} 45%, var(--color-border))` : 'var(--color-border)'}`,
                }}
              >
                Dente ausente
              </button>
            );
          })()}
        </div>
      )}

      {/* ── R-107b: busca livre (escape hatch) ──
          O painel deixa de ser gaiola: procedimento que não está nos chips (faceta é o
          exemplo dele) entra por aqui. Mesmo matcher local do campo mágico
          (`casarProcedimentoLocal`, zero rede/IA) — casou tipo, registra igual ao chip;
          casou item do catálogo, pergunta o tipo clínico (§A3); não casou nada, vira
          `outro` com o texto na observação. */}
      {!readOnly && (
        <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5">
            <Search size={12} strokeWidth={2.4} style={{ color: 'var(--color-text-muted)' }} aria-hidden />
            <input
              type="text"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setCatalogoPendente(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); limparBusca(); return; }
                if (e.key !== 'Enter') return;
                e.preventDefault();
                // Enter aplica a 1ª sugestão; sem nenhuma, lança avulso direto.
                if (sugestoes.length > 0) aplicarSugestao(sugestoes[0]);
                else lancarAvulso();
              }}
              placeholder="Outro procedimento — digite (ex.: faceta)"
              aria-label={`Buscar ou digitar procedimento pro dente ${dente}`}
              className="min-w-0 flex-1 rounded-md px-2 py-1 text-[11px] outline-none focus-visible:ring-1 focus-visible:ring-teal"
              style={{
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {busca && (
              <button
                type="button"
                onClick={limparBusca}
                aria-label="Limpar busca"
                className="p-0.5 rounded shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-teal"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            )}
          </div>

          {/* Casou item do catálogo — mesma pergunta que o campo mágico faz (nome comercial
              nunca vira tipo estrutural sozinho). */}
          {catalogoPendente ? (
            <div className="rounded-lg px-2 py-1.5" style={{ border: '1px solid color-mix(in srgb, var(--color-teal) 30%, transparent)', background: 'color-mix(in srgb, var(--color-teal) 5%, transparent)' }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  &ldquo;{catalogoPendente.nome}&rdquo; — qual tipo clínico?
                </p>
                <button
                  type="button"
                  onClick={() => setCatalogoPendente(null)}
                  aria-label="Cancelar"
                  className="shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-teal rounded"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <X size={11} strokeWidth={2.4} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(deciduo ? [...CHIPS, CHIP_ESFOLIACAO] : CHIPS).map(({ tipo, modos }) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => { cycleDenteTipo(tipo, modos); limparBusca(); }}
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-teal"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid color-mix(in srgb, var(--color-teal) 30%, var(--color-border))',
                      color: 'var(--color-teal-ink)',
                    }}
                  >
                    {TIPO_LABEL[tipo]}
                  </button>
                ))}
              </div>
            </div>
          ) : busca.trim() && (
            <div className="flex flex-wrap gap-1">
              {sugestoes.map((s, i) => (
                <button
                  key={`${s.tipo ?? s.catalogo?.id}-${i}`}
                  type="button"
                  onClick={() => aplicarSugestao(s)}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-teal"
                  style={{
                    background: 'var(--color-surface-alt)',
                    border: '1px solid color-mix(in srgb, var(--color-teal) 30%, var(--color-border))',
                    color: 'var(--color-teal-ink)',
                  }}
                >
                  {s.tipo ? TIPO_LABEL[s.tipo] : s.catalogo?.nome}
                </button>
              ))}
              {/* Nada casou — o escape hatch de verdade. */}
              {sugestoes.length === 0 && (
                <button
                  type="button"
                  onClick={lancarAvulso}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold outline-none focus-visible:ring-1 focus-visible:ring-teal"
                  style={{ background: 'var(--color-teal)', color: 'white' }}
                >
                  Lançar &ldquo;{busca.trim()}&rdquo; neste dente
                </button>
              )}
            </div>
          )}

          {/* Ação SECUNDÁRIA (o registro já aconteceu): virar item do catálogo pra da 2ª vez
              em diante casar como sugestão, com preço. Pular não desfaz nada. */}
          {ultimoAvulso && (
            precoCatalogo == null ? (
              <button
                type="button"
                onClick={() => setPrecoCatalogo('')}
                className="w-fit text-[10.5px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-teal rounded px-1"
                style={{ color: 'var(--color-teal-ink)' }}
              >
                + Salvar &ldquo;{ultimoAvulso}&rdquo; no meu catálogo
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={precoCatalogo}
                  onChange={(e) => setPrecoCatalogo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void salvarNoCatalogo(); } }}
                  placeholder="0,00"
                  autoFocus
                  aria-label={`Preço de ${ultimoAvulso} no catálogo`}
                  className="w-24 rounded-md px-2 py-1 text-[11px] font-mono outline-none focus-visible:ring-1 focus-visible:ring-teal"
                  style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => void salvarNoCatalogo()}
                  disabled={salvandoCatalogo}
                  className="rounded-md px-2 py-1 text-[10.5px] font-bold outline-none focus-visible:ring-1 focus-visible:ring-teal disabled:opacity-40"
                  style={{ background: 'var(--color-teal)', color: 'white' }}
                >
                  {salvandoCatalogo ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPrecoCatalogo(null); setUltimoAvulso(null); }}
                  className="text-[10.5px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-teal rounded px-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Agora não
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* ── R-06: mini-fluxo da ponte (extremo → extremo, papéis editáveis, confirmar) ── */}
      {!readOnly && ponteFlow && (
        <div
          className="rounded-lg border p-2.5 flex flex-col gap-2"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}
          role="group"
          aria-label={`Criar ponte a partir do dente ${dente}`}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Ponte de <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{dente}</span> até</span>
            <select
              value={ponteFlow.ate ?? ''}
              onChange={(e) => {
                const ate = e.target.value ? Number(e.target.value) : null;
                const span = ate != null ? spanPonte(dente, ate) : [];
                setPonteFlow({ ...ponteFlow, ate, papeis: papeisDefault(span) });
              }}
              className="rounded-md border px-1.5 py-1 text-[11px] font-mono outline-none focus-visible:ring-1 focus-visible:ring-teal"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="Dente do outro extremo da ponte"
            >
              <option value="">—</option>
              {arco.filter((t) => t !== dente).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setPonteFlow({ ...ponteFlow, status: ponteFlow.status === 'indicado' ? 'realizado' : 'indicado' })}
              className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide outline-none focus-visible:ring-1 focus-visible:ring-teal"
              style={{
                background: `color-mix(in srgb, ${ponteFlow.status === 'indicado' ? COR_TOKEN.coral : COR_TOKEN.teal} 16%, var(--color-surface))`,
                color: ponteFlow.status === 'indicado' ? COR_TOKEN_INK.coral : COR_TOKEN_INK.teal,
              }}
            >
              {ponteFlow.status === 'indicado' ? 'A instalar' : 'Instalada'}
            </button>
          </div>

          {ponteSpan.length >= 2 && (
            <>
              <div className="flex flex-wrap gap-1">
                {ponteSpan.map((t) => {
                  const papel = ponteFlow.papeis[t] ?? 'pilar';
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setPonteFlow({
                          ...ponteFlow,
                          papeis: { ...ponteFlow.papeis, [t]: papel === 'pilar' ? 'pontico' : 'pilar' },
                        })
                      }
                      aria-label={`Dente ${t}: ${papel} — toque pra alternar`}
                      className="px-2 py-1 rounded-md text-[10.5px] font-mono font-bold outline-none focus-visible:ring-1 focus-visible:ring-teal"
                      style={{
                        background: papel === 'pilar' ? 'color-mix(in srgb, var(--color-teal) 14%, var(--color-surface))' : 'var(--color-surface)',
                        color: papel === 'pilar' ? 'var(--color-teal-ink)' : 'var(--color-text-secondary)',
                        border: `1px solid ${papel === 'pilar' ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      }}
                    >
                      {t} · {papel === 'pilar' ? 'pilar' : 'pôntico'}
                    </button>
                  );
                })}
              </div>
              {ponteConflito.length > 0 && (
                <p className="text-[10.5px] font-semibold" style={{ color: COR_TOKEN_INK.coral }}>
                  {ponteConflito.join(', ')} já {ponteConflito.length === 1 ? 'pertence' : 'pertencem'} a outra ponte — ajuste o vão.
                </p>
              )}
              {ponteConflito.length === 0 && ponticosSemAusencia.length > 0 && (
                <p className="text-[10.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                  ⚠ Pôntico sem ausência registrada no {ponticosSemAusencia.join(', ')} — confira se o vão está certo. Dá pra confirmar mesmo assim.
                </p>
              )}
            </>
          )}

          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPonteFlow(null)}
              className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-teal"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarPonte}
              disabled={ponteFlow.ate == null || ponteSpan.length < 2 || ponteConflito.length > 0}
              className="px-2.5 py-1 rounded-md text-[10.5px] font-bold outline-none focus-visible:ring-1 focus-visible:ring-teal disabled:opacity-40"
              style={{ background: 'var(--color-teal)', color: 'white' }}
            >
              Confirmar ponte
            </button>
          </div>
        </div>
      )}

      {/* ── Eventos do dente (com data clínica editável nos "realizado") ──
          C7-motion (04/08, pedido dele ao vivo) — a seção inteira (linha do evento + observação
          + tabela de especialidade) desce pro centro, abaixo do odontograma, via o mesmo
          `tabelaContainer` que já levava só a tabela (R-20). Motivo: observação e tabela querem
          mais largura do que a coluna de 312px tem — mesmo raciocínio do R-20, agora aplicado à
          seção toda, não só à tabela. Sem container (outros consumidores do painel, ex.
          FichasTab/consulta) → cai no inline de sempre, comportamento intacto. */}
      {(() => {
        if (doDente.length === 0) return null;
        const secao = (
        <div className="flex flex-col pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {/* R-63 — só existe quando portado (tabelaContainer) e há tabela de especialidade
              aberta: é o gatilho "‹ voltar ao mapa" (§4.2 da spec) — fecha só a tabela, o
              perfil do dente continua aberto. Fora do portal (outros 3 consumidores) nunca
              aparece: lá o odontograma não compartilha espaço com esta seção. */}
          {tabelaContainer && detalheAbertoIdx != null && (
            <button
              type="button"
              onClick={() => setDetalheAbertoIdx(null)}
              className="mb-2 flex w-fit items-center gap-1 text-[11px] font-semibold outline-none focus-visible:ring-1 focus-visible:ring-teal rounded px-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ChevronLeft size={12} strokeWidth={2.4} />
              voltar ao mapa
            </button>
          )}
          {doDente.map((ev, i) => {
            const cor = corDoRegistro(ev.status, ev.origem, ev.momento_planejado);
            // Só endo/implante têm tabela de especialidade hoje (migration 106).
            const temDetalhe = ev.tipo === 'endodontia' || ev.tipo === 'implante';
            const aberto = detalheAbertoIdx === i;
            return (
              <div key={i} style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                <div className="flex items-center gap-2 py-1.5 text-[12px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COR_TOKEN[cor] }} aria-hidden="true" />
                  <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {TIPO_LABEL[ev.tipo]}
                  </span>
                  {(ev.ancora.faces ?? []).length > 0 && (
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>
                      {(ev.ancora.faces ?? []).join(' ')}
                    </span>
                  )}
                  {readOnly && ev.observacao && (
                    <span className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {ev.observacao}
                    </span>
                  )}
                  <div className="flex-1" />
                  {(() => {
                    const sinal = sinalDoEvento(ev);
                    return sinal ? (
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 tabular-nums"
                        style={{ background: 'var(--color-teal-pale)', color: 'var(--color-teal-ink)' }}
                      >
                        {sinal}
                      </span>
                    ) : null;
                  })()}
                  <span
                    className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${COR_TOKEN[cor]} 15%, var(--color-surface-alt))`,
                      color: COR_TOKEN_INK[cor],
                    }}
                  >
                    {ev.status === 'indicado'
                      ? (cor === 'warning' ? 'Próx. seção' : 'A fazer')
                      : ev.origem === 'preexistente' ? 'Pré-exist.' : 'Feito'}
                  </span>
                  {ev.status === 'indicado' && !readOnly && (
                    <button
                      type="button"
                      onClick={() => toggleMomentoEvento(ev)}
                      title={cor === 'warning' ? 'Marcar pra sessão atual' : 'Marcar pra próxima seção'}
                      aria-pressed={cor === 'warning'}
                      className="p-1 rounded-md shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-teal transition-colors"
                      style={{
                        color: cor === 'warning' ? 'var(--color-warning-ink)' : 'var(--color-text-secondary)',
                        background: cor === 'warning' ? 'var(--color-warning-pale)' : 'transparent',
                      }}
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                  )}
                  {ev.status === 'realizado' && ev.origem === 'clinica' && !readOnly && (
                    <input
                      type="date"
                      value={ev.realizado_em ?? ''}
                      max={dataPadrao}
                      onChange={(e) => setData(ev, e.target.value)}
                      className="text-[10.5px] font-mono rounded-md px-1.5 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-teal"
                      style={{
                        background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                      aria-label={`Data do procedimento — ${TIPO_LABEL[ev.tipo]}`}
                    />
                  )}
                  {temDetalhe && (
                    <button
                      type="button"
                      onClick={() => setDetalheAbertoIdx(aberto ? null : i)}
                      className="flex items-center gap-0.5 text-[10.5px] font-bold shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-teal rounded px-1"
                      style={{ color: 'var(--color-teal-ink)' }}
                    >
                      {readOnly ? 'Ver tabela' : 'Detalhes'}
                      <ChevronRight size={11} strokeWidth={2.6} style={{ transform: aberto ? 'rotate(90deg)' : undefined, transition: 'transform .15s' }} />
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => remover(ev)}
                      className="p-0.5 rounded outline-none focus-visible:ring-1 focus-visible:ring-teal shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      aria-label={`Remover ${TIPO_LABEL[ev.tipo]}`}
                    >
                      <X size={12} strokeWidth={2.4} />
                    </button>
                  )}
                </div>

                {/* R-04b Fase 0: observação editável do autor (contexto pro colega ao encaminhar) — vale pra qualquer registro. */}
                {!readOnly && (
                  <div className="pb-2 pl-4">
                    <textarea
                      value={ev.observacao ?? ''}
                      onChange={(e) => setObservacao(ev, e.target.value)}
                      rows={1}
                      placeholder="Observação — ex.: contexto pro colega ao encaminhar"
                      className="w-full resize-y text-[11px] rounded-md px-2 py-1 outline-none focus-visible:ring-1 focus-visible:ring-teal"
                      style={{
                        background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                      aria-label={`Observação — ${TIPO_LABEL[ev.tipo]}`}
                    />
                  </div>
                )}

                {/* C7-motion — a seção inteira já portou pro centro (ver acima); a tabela não
                    precisa mais do próprio card+cabeçalho "27 · Endodontia" separado — a linha
                    do evento logo acima já diz de qual dente/tipo é. */}
                {temDetalhe && aberto && (
                  <div className="pb-3 pl-4">
                    {ev.tipo === 'endodontia' && (
                      <EndoForm
                        valor={(ev.detalhe ?? null) as EndoDetalhe | null}
                        onChange={(v) => atualizarDetalhe(ev, v)}
                        readOnly={readOnly}
                        duvidas={ev.endo_revisao?.duvidas}
                      />
                    )}
                    {ev.tipo === 'implante' && (
                      <ImplanteForm
                        valor={(ev.detalhe ?? null) as ImplanteDetalhe | null}
                        onChange={(v) => atualizarDetalhe(ev, v)}
                        readOnly={readOnly}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
        return tabelaContainer ? createPortal(secao, tabelaContainer) : secao;
      })()}
      {/* ── R-02 Fase 3: confirmação de amarração a trabalho aberto ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {confirmGrupo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmGrupo(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative rounded-3xl p-7 max-w-sm w-full shadow-2xl text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                role="dialog"
                aria-modal="true"
                aria-label="Continuar trabalho aberto"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--color-teal-pale)' }}
                >
                  <Forward className="w-7 h-7" style={{ color: 'var(--color-teal-ink)' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Continuar o trabalho aberto?
                </h3>
                <p className="text-sm mb-7" style={{ color: 'var(--color-text-secondary)' }}>
                  Já há um trabalho de{' '}
                  <strong style={{ color: 'var(--color-text-primary)' }}>{TIPO_LABEL[confirmGrupo.tipo]}</strong>{' '}
                  em andamento no dente {dente}, iniciado em {formatarData(confirmGrupo.grupo.iniciadoEm)}. Continuar esse
                  trabalho (mesmo grupo) ou começar um registro novo?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { criarDenteTipo(confirmGrupo.tipo, confirmGrupo.modos, null); setConfirmGrupo(null); }}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors"
                    style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    Começar novo
                  </button>
                  <button
                    type="button"
                    onClick={() => { criarDenteTipo(confirmGrupo.tipo, confirmGrupo.modos, confirmGrupo.grupo.grupoId); setConfirmGrupo(null); }}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors"
                    style={{ background: 'var(--color-teal)' }}
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

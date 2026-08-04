'use client';

// R-46b — "Registrar": odontograma + salvar. Estado local remonta do zero a cada paciente
// porque o pai passa `key={agendamentoId}` (nenhum useEffect de reset aqui — é o padrão mais
// simples que já resolve).
//
// R-46d D1.1/D1.2 (04/08) — o campo mágico (`CampoMagicoMeuDia`) é a entrada principal,
// substituindo a barra de procedimento inteira. O que a barra fazia (Combobox de 17 tipos +
// catálogo comercial, Status, "+ texto da visita") não foi deletado — continua existindo,
// atrás da disclosure "Registrar sem IA" (fechada por padrão): é o fallback obrigatório
// (§2.1 da spec) pra texto puro e pros tipos sem nível "dente" quando a IA está fora do ar.
//
// 04/08 (pedido dele, ao vivo) — `OndeSeletor` (chips de arcada/quadrante) SAIU da barra
// sem-IA: clicar direto no dente do odontograma já resolve "onde" pros tipos por-dente, e os
// 4 tipos de boca (profilaxia/clareamento/flúor/exame periodontal) resolvem sozinhos por
// tipo — nenhum dos dois precisava do chip. `raspagem` (o único ambíguo, quadrante OU boca)
// perde a opção de ancorar por quadrante sem clicar dente a dente — aceito, mesma razão dele
// ("entre clique e digitar, digitar no campo mágico é mais fácil"). Ganhou em troca: chip de
// "Manutenção ortodôntica" — abre o OrtoForm (já existia, reusado tal qual), o 1º tipo real
// de "não usa o odontograma" que a barra passa a cobrir.
//
// C1 (contrato §5.4) — `eventosDraft`/`textoVisita` continuam sem dono local: o dono é
// `meu-dia-client`, que também lê "Nesta sessão" (colunas laterais). `denteAberto` idem —
// dono lá, lido aqui.
//
// 04/08 (revisão, ao vivo) — o painel do dente volta a flutuar AO LADO do odontograma (era a
// leitura original antes do C6/Q2 partir em resumo+Sheet; ele pediu de volta, num card
// separado com respiro, não a mesma leitura errada de "ele some debaixo do dedo" que motivou
// o C6 — essa parte continua resolvida porque agora é SEMPRE 1 card visível, nunca substitui
// o que já tinha). Pra não reproduzir a regressão WCAG que o C6 mediu (dente <24px), a
// coluna direita volta a colapsar enquanto o painel está aberto (`colapsarDireita`,
// devolvido ao `cockpit-grid.tsx`) — o centro sozinho tem o mesmo espaço que tinha antes do
// painel existir, então o odontograma não perde largura de verdade.

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, AlertTriangle, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Odontograma, TEETH_UPPER, TEETH_LOWER, TEETH_UPPER_DEC, TEETH_LOWER_DEC } from '@/components/odontograma/Odontograma';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { salvarEventosOdontograma } from '@/app/consulta/[agendamentoId]/actions';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxItem } from '@/components/ui/combobox';
import { CampoMagicoMeuDia } from './campo-magico-meu-dia';
import { OrtoForm } from '@/components/fichas/orto-form';
import { hojeBRT } from '@/lib/hora-brt';
import { salvarVisitaMeuDia } from '../actions';
import {
  TIPO_LABEL,
  type OdontogramaEventoDraft,
  type StatusRegistro,
  type AncoraClinica,
  type TipoRegistroOdontograma,
} from '@/types/odontograma';
import type { OrtoManutencaoDetalhe } from '@/lib/especialidades/orto';
import type { MeuDiaPendencia, MeuDiaCatalogoProcedimento, MeuDiaOrto } from '@/server/dashboard/get-meu-dia';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';

const TIPOS = Object.entries(TIPO_LABEL) as Array<[TipoRegistroOdontograma, string]>;

const DENTES_VALIDOS = new Set([...TEETH_UPPER, ...TEETH_LOWER, ...TEETH_UPPER_DEC, ...TEETH_LOWER_DEC]);

/** 03/08 — os únicos 4 tipos cuja âncora é 100% determinada pelo tipo (odontograma.ts:85-90,
 *  "Ancora em boca"). Pra estes, "onde" nunca existe. `raspagem` fica de fora de propósito —
 *  é o único tipo com nível ambíguo (quadrante OU boca) e, sem chip de região (04/08), só
 *  resolve clicando dente a dente no odontograma (âncora de dente, mais preciso que quadrante). */
const TIPOS_NIVEL_BOCA = new Set<TipoRegistroOdontograma>(['profilaxia', 'clareamento', 'fluor', 'exame_periodontal']);

/** 03/08 — "restauração 35" no campo de busca já entende o dente. Só o número — nada de
 *  gramática de região aqui, essa é a metade cara que ficou de fora de propósito. */
function extrairDenteDoTexto(texto: string): number | null {
  const numeros = texto.match(/\d{2}/g);
  if (!numeros) return null;
  for (const n of numeros) {
    const dente = Number(n);
    if (DENTES_VALIDOS.has(dente)) return dente;
  }
  return null;
}

/** Valor de 1 item da busca — ou um tipo estrutural (registra direto), ou um item do
 *  catálogo comercial (vira observação pendente, pede o tipo estrutural em seguida). */
type ComboboxValor = TipoRegistroOdontograma | MeuDiaCatalogoProcedimento;

function ehItemDoCatalogo(v: ComboboxValor): v is MeuDiaCatalogoProcedimento {
  return typeof v === 'object';
}

/** Seleção de dente(s) — única entrada de "onde" restante depois que o chip de região saiu
 *  (04/08). Só dente(s), nunca mais região — mas o tipo continua aberto pra não reabrir esse
 *  desenho se um dia precisar. */
type OndeValor = { dentes: number[] } | null;

interface RegistrarPainelProps {
  pacienteId: string;
  agendamentoId: string;
  /** NOVO (D1) — só pro campo mágico (`CapturaLivreCard` precisa pro prompt da IA). */
  pacienteNome: string;
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** C1 (§5.4) — dono é `meu-dia-client`; "Nesta sessão" (direita) lê o mesmo estado. */
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  /** 04/08 — dono continua em `meu-dia-client` (a coluna direita precisa saber quando colapsar),
   *  mas agora lido AQUI de novo: é este arquivo que renderiza o `ToothDetailPanel`. */
  denteAberto: number | null;
  onDenteAbertoChange: (dente: number | null) => void;
  /** 04/08 — volta de `meu-dia-client` (migrou lá no C6, migra de volta agora que o painel
   *  completo renderiza aqui, não mais num `Sheet`). */
  gruposAbertos: GrupoAberto[];
  textoVisita: string;
  onTextoVisitaChange: (texto: string) => void;
  /** C2 (§5.6, trava 2) — slot já tem ficha hoje: CTA nasce desabilitado com
   *  "já registrado hoje" até o dentista rascunhar algo novo. */
  temFichaHoje: boolean;
  /** C2 (P7) — avisa o pai que a visita salvou (odontograma incluso, ver `eventosFalharam`
   *  abaixo). Nunca chamado enquanto o odontograma não gravou (I4). */
  onSalvo: () => void;
  /** R-46d D8 — "usar este documento de base" (anexar-documentos-bloco.tsx), repassado pro
   *  campo mágico. */
  anexarTexto?: { texto: string; nonce: number };
  /** 04/08 — última manutenção ortodôntica do paciente (mesmo dado que MAPA §2.2 já calcula
   *  no servidor). Pré-preenche o chip de orto (mesmo padrão de herança do R-05b) em vez de
   *  nascer vazio toda visita — é o que torna o chip rápido de usar, não só possível de usar. */
  orto: MeuDiaOrto | null;
}

/** Converte a pendência (já um evento real no banco, `status='indicado'`) num draft que
 *  PRESERVA o id — "fazer hoje" fecha o registro existente por upsert, nunca cria um novo
 *  ao lado dele (I3: nunca deixar a pendência original fantasma). Exportado — o gesto
 *  "fazer hoje" agora dispara do a-fazer-bloco.tsx (coluna direita), via meu-dia-client. */
export function pendenciaParaDraft(p: MeuDiaPendencia, dataPadrao: string): OdontogramaEventoDraft {
  const ancora: AncoraClinica = { nivel: p.nivel };
  if (p.dente != null) ancora.dente = p.dente;
  if (p.arcada != null) ancora.arcada = p.arcada;
  if (p.quadrante != null) ancora.quadrante = p.quadrante;
  if (p.faces.length > 0) ancora.faces = p.faces;
  return {
    id: p.id,
    tipo: p.tipo,
    status: 'realizado',
    origem: p.origem,
    ancora,
    grupo_id: p.grupoId,
    papel_no_grupo: p.papelNoGrupo,
    observacao: p.observacao ?? '',
    realizado_em: dataPadrao,
  };
}

function ancorasDoOnde(v: OndeValor): AncoraClinica[] {
  if (!v) return [];
  return v.dentes.map((dente): AncoraClinica => ({ nivel: 'dente', dente }));
}

export function RegistrarPainel({
  pacienteId, agendamentoId, pacienteNome, catalogoProcedimentos,
  eventosDraft, onEventosDraftChange: setEventosDraft,
  denteAberto, onDenteAbertoChange: setDenteAberto,
  gruposAbertos,
  textoVisita, onTextoVisitaChange: setTextoVisita,
  temFichaHoje,
  onSalvo,
  anexarTexto,
  orto,
}: RegistrarPainelProps) {
  // 04/08 — slot pra tabela de especialidade (R-20 Fase 2): quando o painel do dente monta
  // um form com tabela (endo/implante), ela abre AQUI, full-width, abaixo do
  // odontograma+painel — em vez de espremida dentro do card de 320px do painel.
  const [tabelaContainer, setTabelaContainer] = useState<HTMLDivElement | null>(null);
  const [textoAberto, setTextoAberto] = useState(false);
  /** D1.2 — fallback "Registrar sem IA": fechado por padrão, mesmo bloco de sempre por dentro. */
  const [fallbackAberto, setFallbackAberto] = useState(false);
  /** D1 — só escrita pro campo mágico; quem lê é `handleSalvar` abaixo (I3). */
  const [alertaNovo, setAlertaNovo] = useState<string | null>(null);

  const [onde, setOnde] = useState<OndeValor>(null);
  const [status, setStatus] = useState<StatusRegistro>('realizado');
  const [buscaTipo, setBuscaTipo] = useState('');
  const [catalogoPendente, setCatalogoPendente] = useState<MeuDiaCatalogoProcedimento | null>(null);
  /** 03/08 — procedimento escolhido antes de haver "onde". Some assim que o onde chegar. */
  const [tipoPendente, setTipoPendente] = useState<{ tipo: TipoRegistroOdontograma; observacao: string } | null>(null);
  /** 04/08 — chip "Manutenção ortodôntica". Pré-preenche com a última manutenção real do
   *  paciente quando existe (herança R-05b); nasce vazio (OrtoForm cai em ORTO_VAZIO) quando
   *  não há histórico ainda. */
  const [ortoChipAberto, setOrtoChipAberto] = useState(false);
  const [ortoValor, setOrtoValor] = useState<OrtoManutencaoDetalhe | null>(() => orto?.valor ?? null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedFichaId, setSavedFichaId] = useState<string | null>(null);
  const [eventosPendentes, setEventosPendentes] = useState<OdontogramaEventoDraft[] | null>(null);
  const [isRegravando, setIsRegravando] = useState(false);

  const dataPadrao = hojeBRT();
  // C2 (§5.6) — as duas travas contra ficha duplicada colapsam numa condição só: nada pra
  // salvar. Trava 1 (limpar e desabilitar até rascunho novo) é local e imediata — não
  // espera o `router.refresh()` do pai, fecha a janela de corrida de um duplo clique rápido
  // pós-save. Trava 2 (slot já registrado hoje) é o MESMO estado vazio, só muda o rótulo.
  // 04/08 — visita só-de-orto (sem evento, sem texto) também é rascunho de verdade.
  const semRascunho = eventosDraft.length === 0 && textoVisita.trim() === '' && ortoValor == null;

  function criarEventos(tipo: TipoRegistroOdontograma, observacao: string, ancoras: AncoraClinica[]): OdontogramaEventoDraft[] {
    return ancoras.map((ancora) => ({
      id: crypto.randomUUID(),
      tipo,
      status,
      origem: 'clinica',
      ancora,
      grupo_id: null,
      papel_no_grupo: null,
      observacao,
      realizado_em: status === 'realizado' ? dataPadrao : null,
    }));
  }

  function registrar(tipo: TipoRegistroOdontograma, observacao = '') {
    // 03/08 — profilaxia/clareamento/flúor/exame periodontal não têm "onde": a âncora é
    // SEMPRE boca, e nenhum dente clicado antes se aplica aqui — não é esquecido, é ignorado
    // de propósito (D5 do R-06-07: nível boca nunca pinta dente).
    if (TIPOS_NIVEL_BOCA.has(tipo)) {
      setEventosDraft([...eventosDraft, ...criarEventos(tipo, observacao, [{ nivel: 'boca' }])]);
      setTipoPendente(null);
      setBuscaTipo('');
      setCatalogoPendente(null);
      return;
    }
    let ancoras = ancorasDoOnde(onde);
    // Número junto no texto ("restauração 35") resolve o "onde" sozinho, sem esperar o clique.
    if (ancoras.length === 0) {
      const dente = extrairDenteDoTexto(buscaTipo);
      if (dente != null) {
        setOnde({ dentes: [dente] });
        ancoras = [{ nivel: 'dente', dente }];
      }
    }
    if (ancoras.length === 0) {
      // Ordem livre: guarda o procedimento em vez de descartar. `handleOndeChange` completa
      // o registro assim que um dente for clicado, em qualquer ordem.
      setTipoPendente({ tipo, observacao });
      setBuscaTipo('');
      setCatalogoPendente(null);
      return;
    }
    setEventosDraft([...eventosDraft, ...criarEventos(tipo, observacao, ancoras)]);
    setTipoPendente(null);
    setBuscaTipo('');
    setCatalogoPendente(null);
  }

  function handleOndeChange(novoOnde: OndeValor) {
    setOnde(novoOnde);
    if (!tipoPendente) return;
    const ancoras = ancorasDoOnde(novoOnde);
    if (ancoras.length === 0) return;
    setEventosDraft([...eventosDraft, ...criarEventos(tipoPendente.tipo, tipoPendente.observacao, ancoras)]);
    setTipoPendente(null);
  }

  // C5 (contrato §5.5) — toque no odontograma escreve no MESMO "onde" que o resto do painel lê
  // (fonte única, nenhum estado novo).
  //
  // 04/08 (pedido dele, ao vivo) — 1 clique já abre o balão do dente (antes precisava de 2:
  // 1º selecionava, 2º abria). Continua acumulando em `onde.dentes` pro caso de um tipo ficar
  // pendente aguardando onde (tipoPendente) — clicar um 2º dente diferente aplica o mesmo tipo
  // aos dois. Clicar um dente JÁ selecionado remove ele do lote (multi-seleção só sobrevive
  // pra esse caso — G12 do C6: não é o clique que muda, é o que ele decide fazer).
  function onToothToggle(dente: number) {
    const sel = onde?.dentes ?? [];
    if (!sel.includes(dente)) {
      handleOndeChange({ dentes: [...sel, dente] });
      setDenteAberto(dente);
      return;
    }
    const resto = sel.filter((d) => d !== dente);
    handleOndeChange(resto.length > 0 ? { dentes: resto } : null);
  }

  /** Item do catálogo escolhido na busca — só o nome comercial, nunca o tipo estrutural
   *  (§A3: sem de-para confiável). Fica pendente até o dentista confirmar qual dos 16 tipos. */
  function escolherDoCatalogo(item: MeuDiaCatalogoProcedimento) {
    setCatalogoPendente(item);
    setBuscaTipo('');
  }

  // I1 — 1 clique = 1 ficha: `salvarFicha` não é idempotente por agendamentoId, o `disabled`
  // abaixo é a única proteção contra duplo clique/duplo submit (mesmo padrão de consulta-client).
  async function handleSalvar() {
    setIsSaving(true);
    const resultado = await salvarVisitaMeuDia({
      pacienteId, agendamentoId, textoVisita, eventosDraft, alertaNovo, ortoManutencao: ortoValor,
    });
    setIsSaving(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setSavedFichaId(resultado.fichaId);
    if (resultado.eventosFalharam) {
      // I4 — a ficha salvou mas o desenho não; não avança sozinho até o dentista decidir.
      setEventosPendentes(eventosDraft);
      return;
    }
    toast.success('Visita registrada.');
    onSalvo();
  }

  async function handleRegravarEventos() {
    if (!savedFichaId || !eventosPendentes) return;
    setIsRegravando(true);
    let res: { ok: boolean; error?: string };
    try {
      res = await salvarEventosOdontograma({ fichaId: savedFichaId, pacienteId, eventos: eventosPendentes });
    } catch {
      res = { ok: false, error: 'Falha de conexão. Tente novamente.' };
    }
    setIsRegravando(false);
    if (res.ok) {
      setEventosPendentes(null);
      toast.success('Odontograma gravado.');
      onSalvo();
    } else {
      toast.error(res.error ?? 'Não foi possível regravar o odontograma.');
    }
  }

  const buscaNormalizada = buscaTipo.trim().toLowerCase();
  const tiposFiltrados = buscaNormalizada === ''
    ? TIPOS
    : TIPOS.filter(([, label]) => label.toLowerCase().includes(buscaNormalizada));
  // Catálogo só aparece digitando (250+ linhas reais — listar tudo por padrão seria ruído).
  // Limite de 8: é busca, não navegação — o dentista já sabe o nome, é achar rápido.
  const catalogoFiltrado = buscaNormalizada === ''
    ? []
    : catalogoProcedimentos.filter((p) => p.nome.toLowerCase().includes(buscaNormalizada)).slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Registrar</p>

      {/* D1 — campo mágico: entrada única, substitui a barra inteira */}
      <CampoMagicoMeuDia
        pacienteNome={pacienteNome}
        eventosDraft={eventosDraft}
        onEventosDraftChange={setEventosDraft}
        textoVisita={textoVisita}
        onTextoVisitaChange={setTextoVisita}
        onAlertaNovoChange={setAlertaNovo}
        anexarTexto={anexarTexto}
      />

      {/* D1.2 — fallback obrigatório (§2.1): texto puro e tipos sem "dente" continuam
          registráveis com a IA fora do ar (I8), escondido por padrão. */}
      <div className="mt-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setFallbackAberto((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
        >
          {fallbackAberto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Registrar sem IA
        </button>

        {fallbackAberto && (
          <div className="mt-2.5 flex flex-col gap-2.5">
            <Combobox<ComboboxValor>
              inputValue={buscaTipo}
              onInputValueChange={setBuscaTipo}
              autoHighlight
              onValueChange={(v) => {
                if (!v) return;
                if (ehItemDoCatalogo(v)) escolherDoCatalogo(v);
                else registrar(v);
              }}
              itemToStringLabel={(v) => (ehItemDoCatalogo(v) ? v.nome : TIPO_LABEL[v])}
            >
              <ComboboxInput placeholder="Digite o procedimento…" />
              <ComboboxContent>
                {tiposFiltrados.map(([tipo, label]) => (
                  <ComboboxItem key={tipo} value={tipo}>{label}</ComboboxItem>
                ))}
                {catalogoFiltrado.map((item) => (
                  <ComboboxItem key={item.id} value={item}>
                    <span className="flex-1">{item.nome}</span>
                    <span className="text-[10px] text-text-secondary">{item.categoria}</span>
                  </ComboboxItem>
                ))}
              </ComboboxContent>
            </Combobox>

            {catalogoPendente && (
              <div className="rounded-lg border border-teal/30 bg-teal/5 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-text-primary">
                    &ldquo;{catalogoPendente.nome}&rdquo; — qual tipo clínico?
                  </p>
                  <button
                    type="button"
                    onClick={() => setCatalogoPendente(null)}
                    aria-label="Cancelar"
                    className="text-text-secondary hover:text-coral"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS.map(([tipo, label]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => registrar(tipo, catalogoPendente.nome)}
                      className="rounded-full border border-teal/30 bg-surface px-2.5 py-1 text-[11px] font-semibold text-teal hover:bg-teal/10"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Status</span>
                {([['indicado', 'a fazer'], ['realizado', 'feito']] as const).map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      status === s
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 04/08 — 1º chip de "não usa o odontograma". Pré-preenchido com a última
                  manutenção real (herança R-05b) quando existe. */}
              <button
                type="button"
                onClick={() => setOrtoChipAberto((v) => !v)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  ortoChipAberto || ortoValor != null
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40'
                }`}
              >
                Manutenção ortodôntica
              </button>
            </div>

            {tipoPendente && (
              <p className="text-[11px] font-semibold text-teal-ink">
                {TIPO_LABEL[tipoPendente.tipo]} aguardando onde — clique no dente no odontograma.
              </p>
            )}

            {ortoChipAberto && (
              <div className="rounded-lg border border-border bg-surface-alt px-3 py-3">
                <OrtoForm valor={ortoValor} onChange={setOrtoValor} />
              </div>
            )}

            {textoAberto ? (
              <textarea
                value={textoVisita}
                onChange={(e) => setTextoVisita(e.target.value)}
                placeholder="Anotação da visita (opcional)"
                rows={3}
                autoFocus
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-teal"
              />
            ) : (
              <button
                type="button"
                onClick={() => setTextoAberto(true)}
                className="w-fit text-[11px] font-semibold text-text-secondary hover:text-teal"
              >
                + texto da visita
              </button>
            )}
          </div>
        )}
      </div>

      {/* 04/08 — painel do dente flutua ao lado do odontograma, card próprio, com respiro
          (gap-4) — não mais resumo+Sheet separados. A direita colapsa (meu-dia-client) pra
          este `flex-1` não perder largura de verdade. */}
      <div className="mt-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Odontograma
            eventos={eventosDraft}
            selectedTeeth={onde?.dentes ?? []}
            onToothToggle={onToothToggle}
            compact
            hideFilters
          />
        </div>
        {denteAberto != null && (
          <div className="w-[320px] shrink-0">
            <ToothDetailPanel
              dente={denteAberto}
              eventos={eventosDraft}
              onChange={setEventosDraft}
              onClose={() => setDenteAberto(null)}
              dataPadrao={dataPadrao}
              gruposAbertos={gruposAbertos}
              tabelaContainer={tabelaContainer}
            />
          </div>
        )}
      </div>
      {/* Tabela de especialidade (endo/implante) — portal do ToothDetailPanel acima */}
      {denteAberto != null && <div ref={setTabelaContainer} className="mt-3" />}

      {eventosPendentes && (
        <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-pale px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" aria-hidden />
          <div>
            <p className="text-sm text-text-primary">A visita foi salva, mas o desenho do odontograma não gravou.</p>
            <button
              type="button"
              onClick={() => void handleRegravarEventos()}
              disabled={isRegravando}
              className="mt-1 text-sm font-semibold text-warning-ink underline underline-offset-2 disabled:opacity-60"
            >
              {isRegravando ? 'Gravando...' : 'Tentar de novo'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void handleSalvar()}
          disabled={isSaving || eventosPendentes != null || semRascunho}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
            : temFichaHoje && semRascunho
              ? <>Já registrado hoje</>
              : <><Check className="h-4 w-4" /> Salvar</>
          }
        </button>
      </div>
    </div>
  );
}

'use client';

// R-46b — "Registrar": odontograma + salvar. Estado local remonta do zero a cada paciente
// porque o pai passa `key={agendamentoId}` (nenhum useEffect de reset aqui — é o padrão mais
// simples que já resolve).
//
// R-46d D1.1/D1.2 (04/08) — o campo mágico (`CampoMagicoMeuDia`) é a entrada principal.
//
// R-62 (05/08) — a disclosure "Registrar sem IA" SAIU de vez: o combobox de 17 tipos e a
// busca no catálogo viraram chips locais dentro do próprio campo mágico
// (`casar-procedimento-local.ts`, zero rede, zero IA — mantém o I1 de registrar funcionar
// com a IA fora do ar). O que sobra AQUI (Status, chip de orto, painel "qual tipo clínico?"
// do catálogo, "+ texto da visita") não estava escondido nem era exclusivo do combobox — vira
// uma faixa sempre visível, sem toggle. `registrar()`/`tipoPendente`/`escolherDoCatalogo`
// são os MESMOS de sempre, só ganham `aplicarSugestaoLocal` como um 2º chamador.
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
// C7 (04/08) — o painel do dente SAIU daqui. Virou 3º bloco de acordeão na coluna direita
// (`meu-dia-client.tsx`), igual A Fazer/Novos Procedimentos — sem resumo, sem `Sheet`, painel
// completo direto. O odontograma aqui nunca mais compartilha linha com painel nenhum, então
// `colapsarDireita` morreu de vez (não volta desta vez: a largura da direita agora é sempre
// 312px fixos, o painel mora lá dentro, não rouba espaço do centro). `tabelaContainer` (onde a
// tabela de especialidade abre, full-width, abaixo do odontograma) continua dono/renderizado
// AQUI — só a referência sobe pra `meu-dia-client.tsx` via `onTabelaContainerRef`, porque quem
// agora monta o `ToothDetailPanel` que precisa dela é lá.

import { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, AlertTriangle, Loader2, X } from 'lucide-react';
import { Odontograma } from '@/components/odontograma/Odontograma';
import { salvarEventosOdontograma } from '@/server/patients/registro-actions';
import { CampoMagicoMeuDia } from './campo-magico-meu-dia';
import { OrtoForm } from '@/components/fichas/orto-form';
import { hojeBRT } from '@/lib/hora-brt';
import { salvarVisitaMeuDia } from '../actions';
import { criarAgendamento } from '@/app/dashboard/agendamentos/actions';
import { buildClinicDatetime } from '@/app/dashboard/agendamentos/_components/date-helpers';
import { MarcarRetornoModal, type MarcarRetornoForm } from '@/components/pacientes/marcar-retorno-modal';
import { formatHora } from '@/lib/agenda/disponibilidade';
import {
  TIPO_LABEL,
  type OdontogramaEventoDraft,
  type StatusRegistro,
  type AncoraClinica,
  type TipoRegistroOdontograma,
} from '@/types/odontograma';
import type { OrtoManutencaoDetalhe } from '@/lib/especialidades/orto';
import type { SugestaoLocal } from '@/lib/odontograma/casar-procedimento-local';
import { ditadoDevolveMapa, type SlotCentral } from '@/lib/odontograma/ditado-devolve-mapa';
import type { MeuDiaPendencia, MeuDiaCatalogoProcedimento, MeuDiaOrto } from '@/server/dashboard/get-meu-dia';

const TIPOS = Object.entries(TIPO_LABEL) as Array<[TipoRegistroOdontograma, string]>;

/** 03/08 — os únicos 4 tipos cuja âncora é 100% determinada pelo tipo (odontograma.ts:85-90,
 *  "Ancora em boca"). Pra estes, "onde" nunca existe. `raspagem` fica de fora de propósito —
 *  é o único tipo com nível ambíguo (quadrante OU boca) e, sem chip de região (04/08), só
 *  resolve clicando dente a dente no odontograma (âncora de dente, mais preciso que quadrante). */
const TIPOS_NIVEL_BOCA = new Set<TipoRegistroOdontograma>(['profilaxia', 'clareamento', 'fluor', 'exame_periodontal']);

/** Seleção de dente(s) — única entrada de "onde" restante depois que o chip de região saiu
 *  (04/08). Só dente(s), nunca mais região — mas o tipo continua aberto pra não reabrir esse
 *  desenho se um dia precisar. */
type OndeValor = { dentes: number[] } | null;

interface RegistrarPainelProps {
  pacienteId: string;
  agendamentoId: string;
  /** NOVO (D1) — só pro campo mágico (`CapturaLivreCard` precisa pro prompt da IA). */
  pacienteNome: string;
  /** R-64 — o "Marcar retorno" do rodapé abre a MESMA grade/modal do perfil do paciente;
   *  quem marca é sempre o dentista logado (mesmo trava de segurança de lá). */
  dentistaId: string;
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** C1 (§5.4) — dono é `meu-dia-client`; "Nesta sessão" (direita) lê o mesmo estado. */
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  /** C7 (04/08) — dono continua em `meu-dia-client`, que agora é quem renderiza o
   *  `ToothDetailPanel` (3º bloco da direita). Lido aqui só pra saber se mostra o slot da
   *  tabela de especialidade (`onTabelaContainerRef` abaixo) e pra `onToothToggle` escrever. */
  denteAberto: number | null;
  onDenteAbertoChange: (dente: number | null) => void;
  /** C7 (04/08) — o `<div>` que recebe a tabela de especialidade (endo/implante) continua
   *  renderizando AQUI (abaixo do odontograma, full-width, dentro do card "Registrar") — só a
   *  referência dele sobe, porque quem monta o `ToothDetailPanel` que a usa é `meu-dia-client`. */
  onTabelaContainerRef: (el: HTMLDivElement | null) => void;
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
  /** R-61 — estado persistido da boca (leitura), pinta o odontograma junto com
   *  `eventosDraft`. Passado direto pro `<Odontograma eventosPersistidos>`. */
  boca: OdontogramaEventoDraft[];
  /** R-63 — true quando o `ToothDetailPanel` (coluna direita) tem uma tabela de
   *  especialidade aberta pro dente atual. Dono é `meu-dia-client.tsx` (via
   *  `onDetalheAbertoChange` do painel); aqui só se lê, nunca se escreve. */
  detalheEspecialidadeAberto: boolean;
  /** R-46h F3 — picker geral: lista todas as fichas em aberto do paciente, dentista escolhe
   *  uma. Independente do estado de "Salvar" — nunca herda `disabled`/`semRascunho`, é ação
   *  separada (não precisa ter rascunho pra gerar orçamento de uma ficha antiga). */
  onAbrirPickerOrcamento: () => void;
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
  pacienteId, agendamentoId, pacienteNome, dentistaId, catalogoProcedimentos,
  eventosDraft, onEventosDraftChange: setEventosDraft,
  denteAberto, onDenteAbertoChange: setDenteAberto,
  onTabelaContainerRef,
  textoVisita, onTextoVisitaChange: setTextoVisita,
  temFichaHoje,
  onSalvo,
  anexarTexto,
  orto,
  boca,
  detalheEspecialidadeAberto,
  onAbrirPickerOrcamento,
}: RegistrarPainelProps) {
  const [textoAberto, setTextoAberto] = useState(false);
  /** D1 — só escrita pro campo mágico; quem lê é `handleSalvar` abaixo (I3). */
  const [alertaNovo, setAlertaNovo] = useState<string | null>(null);

  const [onde, setOnde] = useState<OndeValor>(null);
  const [status, setStatus] = useState<StatusRegistro>('realizado');
  /** R-57 F2 — observação livre do dentista, acompanha o PRÓXIMO procedimento registrado.
   *  Convive com o nome do catálogo (`criarEventos` compõe as duas, nome primeiro) — nunca
   *  sobrescreve. Reset entre pacientes é de graça (key={agendamentoId} no pai remonta tudo). */
  const [observacao, setObservacao] = useState('');
  // R-62 — carrega `dentes` junto (não só o item): quando a sugestão veio do texto do campo
  // mágico com número ("resina Z350 no 24"), o dente tem que sobreviver até o clique em
  // "qual tipo clínico?" — sem isso o passo seguinte caía de volta no `onde` (possivelmente
  // vazio ou de outro dente), mesmo bug de prioridade que `registrar()` tinha.
  const [catalogoPendente, setCatalogoPendente] = useState<{ item: MeuDiaCatalogoProcedimento; dentes: number[] } | null>(null);
  /** 03/08 — procedimento escolhido antes de haver "onde". Some assim que o onde chegar. */
  const [tipoPendente, setTipoPendente] = useState<{ tipo: TipoRegistroOdontograma; observacao: string } | null>(null);
  /** 04/08 — chip "Manutenção ortodôntica". Pré-preenche com a última manutenção real do
   *  paciente quando existe (herança R-05b); nasce vazio (OrtoForm cai em ORTO_VAZIO) quando
   *  não há histórico ainda. */
  const [ortoChipAberto, setOrtoChipAberto] = useState(false);
  const [ortoValor, setOrtoValor] = useState<OrtoManutencaoDetalhe | null>(() => orto?.valor ?? null);

  // R-63 §4.1 — 1 ocupante por vez no slot central. Troca CONDICIONAL: só cede o mapa pra
  // conteúdo que precisa do espaço e não usa o mapa pra nada (orto, tabela de
  // especialidade). Os outros 15 de 17 tipos abrem o perfil na direita e o mapa FICA.
  const slot: SlotCentral = ortoChipAberto
    ? { tipo: 'orto' }
    : denteAberto != null && detalheEspecialidadeAberto
    ? { tipo: 'detalhe', dente: denteAberto }
    : { tipo: 'mapa' };
  const reduceMotion = useReducedMotion();

  const [isSaving, setIsSaving] = useState(false);
  const [savedFichaId, setSavedFichaId] = useState<string | null>(null);
  const [eventosPendentes, setEventosPendentes] = useState<OdontogramaEventoDraft[] | null>(null);
  const [isRegravando, setIsRegravando] = useState(false);

  // R-64 — "Marcar retorno" do rodapé. Fluxo próprio, independente do rascunho da visita
  // (agendamentos e fichas são tabelas diferentes) — fica habilitado mesmo com rascunho
  // pendente de propósito, não faz sentido travar uma coisa pela outra.
  const [retornoModalAberto, setRetornoModalAberto] = useState(false);
  const [retornoForm, setRetornoForm] = useState<MarcarRetornoForm>({
    data: null, minutoDoDia: null, duracao: '30', observacoes: '',
  });
  const [retornoSaving, setRetornoSaving] = useState(false);
  const [retornoError, setRetornoError] = useState<string | null>(null);

  async function handleMarcarRetorno() {
    if (!retornoForm.data || retornoForm.minutoDoDia == null) {
      setRetornoError('Escolha um horário na grade.');
      return;
    }
    setRetornoError(null);
    setRetornoSaving(true);
    try {
      const dataHora = buildClinicDatetime(retornoForm.data, formatHora(retornoForm.minutoDoDia));
      const result = await criarAgendamento({
        pacienteId,
        dataHora,
        duracaoMinutos: parseInt(retornoForm.duracao, 10) || 30,
        observacoes: retornoForm.observacoes || null,
      });
      if (result.error) {
        setRetornoError(result.error);
        return;
      }
      setRetornoModalAberto(false);
      setRetornoForm({ data: null, minutoDoDia: null, duracao: '30', observacoes: '' });
      toast.success('Retorno marcado.');
    } finally {
      setRetornoSaving(false);
    }
  }

  const dataPadrao = hojeBRT();
  // C2 (§5.6) — as duas travas contra ficha duplicada colapsam numa condição só: nada pra
  // salvar. Trava 1 (limpar e desabilitar até rascunho novo) é local e imediata — não
  // espera o `router.refresh()` do pai, fecha a janela de corrida de um duplo clique rápido
  // pós-save. Trava 2 (slot já registrado hoje) é o MESMO estado vazio, só muda o rótulo.
  // 04/08 — visita só-de-orto (sem evento, sem texto) também é rascunho de verdade.
  const semRascunho = eventosDraft.length === 0 && textoVisita.trim() === '' && ortoValor == null;

  /** R-50 — orto veio da IA: vira estado editável E abre o chip. Abrir é o guarda-corpo (mesma
   *  razão do `criarDenteTipo` abrir a tabela de endo sozinha): dado extraído nunca entra
   *  invisível, o dentista vê e corrige antes de salvar. Sobrescreve o que o chip tivesse —
   *  o relato acabou de ser ditado, é mais recente que a herança do último atendimento. */
  function handleOrtoDetectado(orto: OrtoManutencaoDetalhe) {
    setOrtoValor(orto);
    setOrtoChipAberto(true);
  }

  /** R-57 F2 — nome do catálogo (quando houver) primeiro, observação do dentista depois;
   *  as duas coexistem, nenhuma sobrescreve a outra. */
  function textoObservacao(doCatalogo: string): string {
    return [doCatalogo, observacao.trim()].filter(Boolean).join(' — ');
  }

  function criarEventos(tipo: TipoRegistroOdontograma, observacaoDoCatalogo: string, ancoras: AncoraClinica[]): OdontogramaEventoDraft[] {
    const texto = textoObservacao(observacaoDoCatalogo);
    return ancoras.map((ancora) => ({
      id: crypto.randomUUID(),
      tipo,
      status,
      origem: 'clinica',
      ancora,
      grupo_id: null,
      papel_no_grupo: null,
      observacao: texto,
      realizado_em: status === 'realizado' ? dataPadrao : null,
    }));
  }

  // R-62 — `dentesSugeridos` substitui o antigo `extrairDenteDoTexto(buscaTipo)`: o campo de
  // busca sumiu, o matcher local já entrega o dente extraído do MESMO texto que casou o tipo
  // (`SugestaoLocal.dentes`).
  //
  // PRIORIDADE: dentesSugeridos (o texto ATUAL do campo mágico) vence `onde` (clique no
  // odontograma), não o contrário — e SOBRESCREVE `onde`, não só o ignora. `onde` nunca é
  // limpo depois de um registro (comportamento antigo do multi-seleção, C6 §2 Q3: sobrevive
  // de propósito pro caso "clicar 2 dentes, DEPOIS escolher o tipo"). Sem a sobrescrita, um
  // 2º chip com dente diferente no texto (ex.: "canal 18" depois de "restauração 34") lia o
  // `onde` velho (ainda [34]) e o evento nascia no dente ERRADO — achado ao vivo, não por
  // leitura de código (dois cliques seguidos foram parar os dois no mesmo dente).
  // R-57 F2 — o parâmetro chama `observacaoDoCatalogo` (não `observacao`) de propósito: o
  // componente já tem um state `observacao` (a digitada pelo dentista); nomes iguais aqui
  // esconderiam qual das duas cada linha está lendo. `criarEventos` compõe as duas.
  function registrar(tipo: TipoRegistroOdontograma, observacaoDoCatalogo = '', dentesSugeridos: number[] = []) {
    // 03/08 — profilaxia/clareamento/flúor/exame periodontal não têm "onde": a âncora é
    // SEMPRE boca, e nenhum dente clicado antes se aplica aqui — não é esquecido, é ignorado
    // de propósito (D5 do R-06-07: nível boca nunca pinta dente).
    if (TIPOS_NIVEL_BOCA.has(tipo)) {
      setEventosDraft([...eventosDraft, ...criarEventos(tipo, observacaoDoCatalogo, [{ nivel: 'boca' }])]);
      setTipoPendente(null);
      setCatalogoPendente(null);
      setObservacao('');
      return;
    }
    let ancoras: AncoraClinica[];
    if (dentesSugeridos.length > 0) {
      ancoras = dentesSugeridos.map((dente): AncoraClinica => ({ nivel: 'dente', dente }));
      setOnde({ dentes: dentesSugeridos });
    } else {
      ancoras = ancorasDoOnde(onde);
    }
    if (ancoras.length === 0) {
      // Ordem livre: guarda o procedimento em vez de descartar. `handleOndeChange` completa
      // o registro assim que um dente for clicado, em qualquer ordem. A observação digitada
      // (state, não este parâmetro) fica como está — `criarEventos` lê ela ao vivo quando o
      // registro finalmente acontecer, não precisa viajar dentro de `tipoPendente`.
      setTipoPendente({ tipo, observacao: observacaoDoCatalogo });
      setCatalogoPendente(null);
      return;
    }
    // R-63 §4.3 — ditado devolve o mapa quando há confirmação real a dar (dente diferente
    // do que a tabela/orto aberta está mostrando). Fecha o ocupante e seleciona o dente
    // novo pra você ver onde caiu; mesmo dente ou âncora de boca não devolvem (§4.3).
    if (ditadoDevolveMapa(slot, ancoras)) {
      setOrtoChipAberto(false);
      const primeiroDente = ancoras.map((a) => a.dente).find((d): d is number => d != null);
      if (primeiroDente != null) setDenteAberto(primeiroDente);
    }
    setEventosDraft([...eventosDraft, ...criarEventos(tipo, observacaoDoCatalogo, ancoras)]);
    setTipoPendente(null);
    setCatalogoPendente(null);
    setObservacao('');
  }

  function handleOndeChange(novoOnde: OndeValor) {
    setOnde(novoOnde);
    if (!tipoPendente) return;
    const ancoras = ancorasDoOnde(novoOnde);
    if (ancoras.length === 0) return;
    setEventosDraft([...eventosDraft, ...criarEventos(tipoPendente.tipo, tipoPendente.observacao, ancoras)]);
    setTipoPendente(null);
    setObservacao('');
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

  /** Item do catálogo escolhido — só o nome comercial, nunca o tipo estrutural (§A3: sem
   *  de-para confiável). Fica pendente até o dentista confirmar qual dos 16 tipos. `dentes`
   *  viaja junto (R-62) — é o que o clique em "qual tipo clínico?" usa depois. */
  function escolherDoCatalogo(item: MeuDiaCatalogoProcedimento, dentes: number[] = []) {
    setCatalogoPendente({ item, dentes });
  }

  /** R-62 — clique num chip do campo mágico. Mesmos 2 caminhos que a antiga "Registrar sem
   *  IA" tinha (tipo direto vs. item de catálogo pedindo o tipo), só que a entrada é a
   *  sugestão local em vez do valor escolhido no combobox. */
  function aplicarSugestaoLocal(s: SugestaoLocal) {
    if (s.catalogo) {
      escolherDoCatalogo(s.catalogo, s.dentes);
      return;
    }
    if (s.tipo) registrar(s.tipo, '', s.dentes);
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Registrar</p>

      {/* D1 — campo mágico: entrada única. R-62: os chips locais (zero IA) vivem dentro
          dele agora — é o que mata a disclosure "Registrar sem IA" que existia aqui. */}
      <CampoMagicoMeuDia
        pacienteNome={pacienteNome}
        eventosDraft={eventosDraft}
        onEventosDraftChange={setEventosDraft}
        textoVisita={textoVisita}
        onTextoVisitaChange={setTextoVisita}
        onAlertaNovoChange={setAlertaNovo}
        onOrtoDetectado={handleOrtoDetectado}
        anexarTexto={anexarTexto}
        catalogoProcedimentos={catalogoProcedimentos}
        onAplicarSugestao={aplicarSugestaoLocal}
      />

      {/* R-62 — o que sobra do antigo painel "sem IA": nada disso era exclusivo do combobox
       * (Status/orto/catálogo-pendente sempre foram controles à parte), então vira faixa
       * sempre visível, sem toggle. "+ texto da visita" fica de propósito (não é redundante:
       * é o único jeito de salvar uma nota pura sem passar pelo Dex — I1, IA fora do ar). */}
      <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
        {catalogoPendente && (
          <div className="rounded-lg border border-teal/30 bg-teal/5 px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-text-primary">
                &ldquo;{catalogoPendente.item.nome}&rdquo; — qual tipo clínico?
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
                  onClick={() => registrar(tipo, catalogoPendente.item.nome, catalogoPendente.dentes)}
                  className="rounded-full border border-teal/30 bg-surface px-2.5 py-1 text-[11px] font-semibold text-teal-ink hover:bg-teal/10"
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
                    ? 'border-teal bg-teal/10 text-teal-ink'
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
                ? 'border-teal bg-teal/10 text-teal-ink'
                : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40'
            }`}
          >
            Manutenção ortodôntica
          </button>
        </div>

        {/* R-57 F2 — sempre visível, sem clique pra abrir (um clique extra anularia o
            ganho). Acompanha o PRÓXIMO procedimento registrado; convive com o nome do
            catálogo, nunca sobrescreve (criarEventos compõe as duas). */}
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Observação
          </span>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional — acompanha o próximo procedimento"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-alt px-2.5 py-1 text-[11px] text-text-primary outline-none focus:border-teal"
          />
        </div>

        {tipoPendente && (
          <p className="text-[11px] font-semibold text-teal-ink">
            {TIPO_LABEL[tipoPendente.tipo]} aguardando onde — clique no dente no odontograma.
          </p>
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
            className="w-fit text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
          >
            + texto da visita
          </button>
        )}
      </div>

      {/* R-63 §4.1 — slot central: 1 ocupante por vez (mapa · tabela de especialidade ·
          orto), troca CONDICIONAL — só endo/implante e orto tomam o lugar do mapa; os
          outros 15 de 17 tipos abrem o perfil na direita e o mapa fica (não entra aqui).
          O container do portal (abaixo) fica SEMPRE montado quando há dente aberto,
          independente do slot — é o que evita a corrida de ref com o ToothDetailPanel
          (a troca decide só o que aparece ACIMA dele, nunca desmonta o alvo do portal). */}
      <AnimatePresence mode="wait" initial={false}>
        {slot.tipo !== 'detalhe' && (
          <motion.div
            key={slot.tipo}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="mt-4"
          >
            {slot.tipo === 'orto' ? (
              // bg-surface (não -alt): o OrtoForm já usa bg-surface-alt nos próprios
              // inputs (orto-form.tsx). Empilhar -alt aqui em cima de -alt zerava o
              // contraste do input contra o wrapper em light mode — as duas eram
              // literalmente a mesma cor (confirmado: rgb(218,218,222) nos dois, medido ao
              // vivo). FichasTab.tsx, o outro lugar que monta o OrtoForm, nunca teve esse
              // wrapper — por isso só aparecia aqui.
              <div className="rounded-lg border border-border bg-surface px-3 py-3">
                <OrtoForm valor={ortoValor} onChange={setOrtoValor} />
              </div>
            ) : (
              <Odontograma
                eventos={eventosDraft}
                eventosPersistidos={boca}
                selectedTeeth={onde?.dentes ?? []}
                onToothToggle={onToothToggle}
                compact
                hideFilters
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Tabela de especialidade (endo/implante) — portal do ToothDetailPanel, que
          renderiza em meu-dia-client.tsx (C7). Slot 'detalhe': é a ÚNICA coisa visível
          aqui (o mapa acima nem monta). Nos outros casos empilha embaixo do mapa, como
          sempre. */}
      {denteAberto != null && (
        <div ref={onTabelaContainerRef} className={slot.tipo === 'detalhe' ? 'mt-4' : 'mt-3'} />
      )}

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

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setRetornoModalAberto(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
        >
          Marcar retorno
        </button>
        <button
          type="button"
          onClick={onAbrirPickerOrcamento}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
        >
          Gerar orçamento
        </button>
        <button
          type="button"
          onClick={() => void handleSalvar()}
          disabled={isSaving || eventosPendentes != null || semRascunho}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-dark px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
            : temFichaHoje && semRascunho
              ? <>Já registrado hoje</>
              : <><Check className="h-4 w-4" /> Salvar e passar</>
          }
        </button>
      </div>

      <MarcarRetornoModal
        open={retornoModalAberto}
        onOpenChange={(open) => {
          setRetornoModalAberto(open);
          if (!open) setRetornoError(null);
        }}
        pacienteNome={pacienteNome}
        dentistaId={dentistaId}
        form={retornoForm}
        setForm={setRetornoForm}
        error={retornoError}
        saving={retornoSaving}
        onMarcarRetorno={() => void handleMarcarRetorno()}
      />
    </div>
  );
}

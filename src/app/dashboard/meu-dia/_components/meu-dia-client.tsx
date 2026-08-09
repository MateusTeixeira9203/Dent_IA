'use client';

// R-46a — dono do estado de seleção (qual atendimento do rail está com o contexto aberto
// embaixo). R-46g (D5): a chave é agendamentoId, não pacienteId — 2 atendimentos do mesmo
// paciente no mesmo dia (retorno) ficariam indistinguíveis por pacienteId. Precedência do
// default: agendamentoInicialId (veio de ?ag=, se casar com um slot) > em atendimento
// (in_progress/checked_in) > 1º slot.
// R-76 (08/08) — `onSalvo` volta a avançar pro próximo slot elegível do rail: reverte a
// decisão de C2 (P7, 03/08, "o dentista já troca de paciente clicando no rail"). `podeAtender`
// mora aqui agora (só este arquivo usa — a versão antiga vivia em rail.tsx e foi apagada no
// R-72 junto do link "Iniciar consulta"). Limpa o rascunho local primeiro (trava §5.6.1),
// depois avança, depois `router.refresh()` pra puxar `slots`/`contextoPorPaciente` frescos do
// servidor (✓ registrado, pendências fechadas) sem sair da rota (G3/G9).
//
// C1 (contrato §5.4) — dono de `eventosDraft`/`denteAberto`/`textoVisita` sobe pra cá: a
// coluna direita ("Nesta sessão") precisa ler o mesmo rascunho que o centro escreve, e o
// `key={agendamentoId}` do RegistrarPainel não alcança mais esses 3 campos. O reset ao
// trocar de paciente vira explícito (comparação de id abaixo) — sem isso, rascunho de um
// paciente vaza pro próximo (perda/contaminação de dado clínico).
//
// C6 (04/08) — jaFeito sai de vez. Colunas redistribuídas (§2.6): esquerda ganha "Concluídos
// hoje" (migrado) + "Anexar documentos" (novo, R-46d D8); direita perde os dois.
//
// C7 (04/08) — o painel do dente vira o 1º item da coluna direita: `ToothDetailPanel`
// renderiza AQUI agora (não mais em `registrar-painel.tsx`). `colapsarDireita` morreu de vez
// no `CockpitGrid`: a direita é sempre 312px, o painel mora dentro dela, nunca mais disputa
// largura com o centro. `tabelaContainer` sobe de `registrar-painel.tsx` pra cá também — é
// aqui que o `ToothDetailPanel` que a usa agora vive.
//
// R-63 F2 (05/08, §4.4/§4.5) — painel do dente vira FIXO (não é mais acordeão — o antigo
// `painelDenteAberto` morreu, `denteAberto` continua a seleção de verdade). As duas colunas
// trocam os N acordeões (`BlocoMoldavel`) por 1 card de abas cada (`abaEsquerda`/`abaDireita`).
//
// R-78 F0+F1+F2 (08/08) — CASCO NOVO, supera os 2 parágrafos acima sobre `CockpitGrid`/abas
// E o `tabelaContainer` que citam: as 3 colunas fixas (320|1fr|312) e as 2 barras de abas
// morreram. Fluxo vertical agora — campo mágico full-width, depois UMA linha [lista "Nesta
// ficha" (eventosDraft inteiro, `RegistroCard` de verdade — pill clicável, observação
// editável, F1) │ espelho/perfil ~555px], depois faixa de gavetas (Histórico/A fazer/
// Anexos, 1 aberta por vez), depois rodapé. `RegistrarPainel` virou hook
// (`useRegistrarPainel`) — mesmo estado/lógica, só devolve as peças posicionáveis.
//
// Direita é 1 ocupante só, 3 níveis: espelho (default) → `DenteHistoricoCard` (tocar o
// dente — leitura antes de escrita, F2) → `ToothDetailPanel` (editor de faces/chips,
// "+ registrar neste dente"). `tabelaContainer`/portal SAÍRAM (achado dele 08/08: a tabela
// de especialidade full-width abaixo da linha ficava sem fundo, "flutuando" — ele queria
// DENTRO do card do perfil) — `ToothDetailPanel` sem esse prop já renderiza a seção inline,
// dentro do próprio card (555px é bem mais que os 312px que motivaram o portal originalmente).
// Faltam F3 (gavetas, provavelmente já cobertas) e F5 (rótulo do rodapé).
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Hourglass } from 'lucide-react';
import {
  atualizarStatusEncaminhado, encaminharProcedimento, getGruposAbertos,
} from '@/server/patients/registro-actions';
import { EncaminharBar } from '@/components/fichas/encaminhar-bar';
import { Rail } from './rail';
import { AtenderAgoraModal } from '@/app/dashboard/agendamentos/_components/atender-agora-modal';
import { atualizarStatusAgendamento } from '@/app/dashboard/agendamentos/actions';
import type { AgendamentoStatus } from '@/types/database';
import { HistoricoBloco } from './historico-bloco';
import { AnexarDocumentosBloco } from './anexar-documentos-bloco';
import { AFazerBloco } from './a-fazer-bloco';
import { NestaSessaoBloco } from './nesta-sessao-bloco';
import { FaixaGavetas, type GavetaId } from './faixa-gavetas';
import { useRegistrarPainel, pendenciaParaDraft } from './registrar-painel';
import { DenteHistoricoCard } from './dente-historico-card';
import { VisitaLeituraCard } from './visita-leitura-card';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { useOrcamentoModal } from '@/app/dashboard/pacientes/[id]/_components/use-orcamento-modal';
import { NovoOrcamentoModal } from '@/app/dashboard/pacientes/[id]/_components/modals/novo-orcamento-modal';
import { hojeBRT } from '@/lib/hora-brt';
import { responsavelPassaFiltro, FILTRO_MEUS } from '@/lib/fichas/filtro-responsavel';
import type { MeuDiaData, MeuDiaPendencia, MeuDiaVisita } from '@/server/dashboard/get-meu-dia';
import type { OdontogramaEventoDraft } from '@/types/odontograma';
import type { EventoOdontogramaParaOrc } from '@/app/dashboard/pacientes/[id]/_components/types';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';

/** Contador — sempre pill neutro, mesmo em 0 (o artefato não distingue "tem novidade"). */
function Contador({ n }: { n: number }) {
  return <span className="rounded-full bg-surface-alt px-1.5 py-px font-mono text-[10px] text-text-secondary">{n}</span>;
}

/** R-83 (08/08, achado dele testando o R-78) — converte o rascunho (draft local, ainda sem
 *  `ficha_id`) pro shape que o motor de orçamento (`use-orcamento-modal.ts`) espera, mesmo
 *  padrão de `paraCard` em historico-bloco.tsx (cada chamador adapta seu tipo real). Sem
 *  isto, "Gerar orçamento" só enxergava fichas já salvas — salvar antes empurra pro próximo
 *  paciente (R-76), então não dava pra orçar o que acabou de ditar sem sair da tela dele. */
function draftParaEventoOrc(e: OdontogramaEventoDraft): EventoOdontogramaParaOrc {
  return {
    id: e.id,
    tipo: e.tipo,
    status: e.status,
    origem: e.origem,
    nivel: e.ancora.nivel,
    arcada: e.ancora.arcada ?? null,
    quadrante: e.ancora.quadrante ?? null,
    dente: e.ancora.dente ?? null,
    faces: e.ancora.faces ?? null,
    papel_no_grupo: e.papel_no_grupo,
    grupo_id: e.grupo_id,
    assinatura_id: e.assinaturaId ?? null,
    encaminhado_para: null, // rascunho de hoje nunca foi encaminhado ainda
    encaminhado_dentista: null,
  };
}

interface MeuDiaClientProps extends MeuDiaData {
  agendamentoInicialId?: string;
  /** R-46h — o hook de orçamento compartilhado (pacientes/[id]/_components) precisa disto
   *  pra escopar a query; MeuDiaData não carrega (é parâmetro do fetch, não parte do retorno). */
  clinicaId: string;
}

export function MeuDiaClient({
  slots, contextoPorPaciente, agendamentoInicialId, catalogoProcedimentos, meuDentistaId,
  destinosEncaminhar, clinicaId,
}: MeuDiaClientProps) {
  const router = useRouter();

  const defaultAgendamentoId = useMemo(() => {
    if (agendamentoInicialId && slots.some((s) => s.agendamentoId === agendamentoInicialId)) {
      return agendamentoInicialId;
    }
    const emAtendimento = slots.find(
      (s) => s.statusAgendamento === 'in_progress' || s.statusAgendamento === 'checked_in',
    );
    return (emAtendimento ?? slots[0])?.agendamentoId ?? null;
  }, [slots, agendamentoInicialId]);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(defaultAgendamentoId);

  // R-57 F1 — encaixe criado no rail: fica na rota (não vai pro /consulta que o R-15
  // aposentou), refaz o refresh e seleciona o slot novo assim que ele aparecer em `slots`.
  // Ajuste durante o render (não `useEffect`, mesmo motivo do `idAoResetar` abaixo): o slot
  // só existe depois que o `router.refresh()` trouxer `slots` frescos do servidor — setar
  // `selecionadoId` direto apontaria pra um slot inexistente e cairia em tela vazia.
  const [encaixeAberto, setEncaixeAberto] = useState(false);
  const [aguardandoSlot, setAguardandoSlot] = useState<string | null>(null);
  if (aguardandoSlot && slots.some((s) => s.agendamentoId === aguardandoSlot)) {
    setSelecionadoId(aguardandoSlot);
    setAguardandoSlot(null);
  }

  const [eventosDraft, setEventosDraft] = useState<OdontogramaEventoDraft[]>([]);
  const [denteAberto, setDenteAberto] = useState<number | null>(null);
  /** R-78 F2 — dente aberto mostra o HISTÓRICO por padrão (§3.2 da spec: leitura antes de
   *  escrita); isto revela o editor de faces/chips (`ToothDetailPanel`, reusado tal qual)
   *  por cima, via "+ registrar neste dente" ou "continuar aqui" do aviso de grupo aberto. */
  const [registrandoDenteAberto, setRegistrandoDenteAberto] = useState(false);
  /** R-78 — id do evento cuja tabela de especialidade deve nascer já aberta no editor
   *  (⤢ de um card de "Nesta ficha"). `null` = editor nasce fechado, comportamento normal. */
  const [detalheAlvoId, setDetalheAlvoId] = useState<string | null>(null);
  /** R-63 — true quando o `ToothDetailPanel` tem uma tabela de especialidade (endo/implante)
   *  aberta pro dente atual. É o que o slot central (`RegistrarPainel`) lê pra decidir se
   *  troca o mapa — vem de `onDetalheAbertoChange`, nunca escrito direto por outro caminho. */
  const [detalheEspecialidadeAberto, setDetalheEspecialidadeAberto] = useState(false);
  /** R-78 F4 — "ler tudo ⤢" do texto de uma visita no Histórico. 4º ocupante do slot direito
   *  (§3.2: 1 ocupante só) — mutuamente exclusivo com `denteAberto` (ver handleDenteAbertoChange
   *  e abrirLeituraGrande). */
  const [leituraGrande, setLeituraGrande] = useState<MeuDiaVisita | null>(null);
  const [textoVisita, setTextoVisita] = useState('');
  const [gruposAbertos, setGruposAbertos] = useState<GrupoAberto[]>([]);
  /** R-46d D8 — "Anexar documentos": preso ao paciente, sem persistência (mesmo reset de
   *  eventosDraft/textoVisita abaixo). `documentoNonce` sinaliza "usar como base" pro campo
   *  mágico (append, nunca substituição — captura-livre-card.tsx). */
  const [documentoNome, setDocumentoNome] = useState<string | null>(null);
  const [documentoTexto, setDocumentoTexto] = useState<string | null>(null);
  const [documentoNonce, setDocumentoNonce] = useState(0);
  const [documentoOrigem, setDocumentoOrigem] = useState<'audio' | 'documento'>('documento');
  // R-82 — memoizado por valor: sem isso, este objeto nascia de novo a cada render (referência
  // instável) e o `useEffect` de `captura-livre-card.tsx` que depende dele reavaliava a cada
  // re-render deste componente inteiro, não só quando o anexo de fato mudava.
  const anexarTexto = useMemo(
    () => (documentoTexto != null ? { texto: documentoTexto, nonce: documentoNonce, origem: documentoOrigem } : undefined),
    [documentoTexto, documentoNonce, documentoOrigem],
  );

  // Reset explícito ao trocar de paciente (contrato §5.4) — o `key={agendamentoId}` do
  // RegistrarPainel não alcança mais estes campos, que agora moram aqui. Ajuste durante o
  // render (comparando o id anterior), não `useEffect`: é o padrão que o React recomenda pra
  // "resetar estado quando uma prop muda" — evita o passe de render extra do efeito, e o lint
  // do projeto (`react-hooks/set-state-in-effect`) bloqueia a versão com efeito.
  /** R-52 — modo seleção pra encaminhar em lote. Mesmo padrão do FichasTab (R-04 Fase 3). */
  const [modoEncaminhar, setModoEncaminhar] = useState(false);
  const [selecionadosEncaminhar, setSelecionadosEncaminhar] = useState<Set<string>>(new Set());
  const [destinoEncaminhar, setDestinoEncaminhar] = useState<string | null>(null);

  // R-78 F0 — as duas barras de abas morreram: "Hoje"/"Novos" fundiram em "Nesta ficha"
  // (lista única, sempre visível); Histórico/A fazer/Anexos viraram gaveta — 1 aberta por
  // vez, mas agora FECHADA por padrão (nenhuma "aba default" — a lista+espelho é o que fica
  // sempre visível, gaveta é sob demanda, T5/orçamento vertical).
  const [gavetaAberta, setGavetaAberta] = useState<GavetaId | null>(null);

  const [idAoResetar, setIdAoResetar] = useState(selecionadoId);
  if (selecionadoId !== idAoResetar) {
    setIdAoResetar(selecionadoId);
    setEventosDraft([]);
    setDenteAberto(null);
    setDetalheEspecialidadeAberto(false); // R-63 — paciente novo não herda tabela aberta do anterior
    setRegistrandoDenteAberto(false); // R-78 F2 — idem, nunca herda o editor aberto
    setDetalheAlvoId(null);
    setLeituraGrande(null); // R-78 F4 — idem, nunca herda a leitura de visita do paciente anterior
    setGavetaAberta(null); // G13 — troca de paciente reseta a gaveta pro default (fechada)
    setTextoVisita('');
    // Trocar de paciente com o modo de encaminhar ligado deixaria a barra selecionando
    // pendência do paciente ERRADO (contexto.pendencias troca, os ids selecionados não).
    setModoEncaminhar(false);
    setSelecionadosEncaminhar(new Set());
    setDestinoEncaminhar(null);
    // D8 — documento anexado é do paciente anterior, não sobrevive à troca.
    setDocumentoNome(null);
    setDocumentoTexto(null);
    setDocumentoOrigem('documento');
  }

  /** R-52 — pendência recebida sendo concluída agora (trava o botão durante a escrita). */
  const [concluindoId, setConcluindoId] = useState<string | null>(null);

  const slotSelecionado = selecionadoId ? (slots.find((s) => s.agendamentoId === selecionadoId) ?? null) : null;
  const contexto = slotSelecionado ? contextoPorPaciente[slotSelecionado.pacienteId] : null;

  // R-46h — picker de orçamento (Histórico por-visita + rodapé do Registrar). Meu dia é
  // dentista-only (page.tsx redireciona secretaria): isSecretaria sempre false,
  // dentistasClinica sempre [], sem onOrcamentoCriado (não há lista de orçamentos aqui).
  // `pacienteId` segue o slot selecionado — os botões que abrem o modal só existem quando
  // há slotSelecionado, então o fallback '' nunca é de fato usado pra buscar nada.
  const orcamentoModal = useOrcamentoModal({
    pacienteId: slotSelecionado?.pacienteId ?? '',
    clinicaId,
    meuDentistaId,
    procedimentosClinica: catalogoProcedimentos,
    isSecretaria: false,
    dentistasClinica: [],
    // R-46h (achado ao vivo 08/08) — histórico é compartilhado da clínica; sem isto o
    // picker deixava puxar procedimento indicado por outro dentista pro orçamento.
    restringirAoMeuDentista: true,
  });

  // R-78 F0 — hook (era componente `<RegistrarPainel key={agendamentoId}>`): mesma
  // lógica/estado de sempre, devolve as 3 peças que o novo fluxo posiciona (campo mágico /
  // espelho / rodapé). Chamado incondicionalmente (regra dos hooks) — os fallbacks
  // ''/[]/null/false espelham o mesmo padrão que `useOrcamentoModal` acima já usa; a saída só
  // é RENDERIZADA dentro do `{slotSelecionado && contexto ? ... }` abaixo, nunca aparece vazia.
  const registrarPainel = useRegistrarPainel({
    pacienteId: slotSelecionado?.pacienteId ?? '',
    agendamentoId: slotSelecionado?.agendamentoId ?? '',
    pacienteNome: slotSelecionado?.pacienteNome ?? '',
    dentistaId: meuDentistaId,
    catalogoProcedimentos,
    eventosDraft,
    onEventosDraftChange: setEventosDraft,
    denteAberto,
    onDenteAbertoChange: handleDenteAbertoChange,
    textoVisita,
    onTextoVisitaChange: setTextoVisita,
    temFichaHoje: slotSelecionado?.temFichaHoje ?? false,
    onSalvo: handleSalvo,
    anexarTexto,
    orto: contexto?.orto ?? null,
    boca: contexto?.boca ?? [],
    detalheEspecialidadeAberto,
    onAbrirPickerOrcamento: () => void orcamentoModal.abrirPickerFichasAbertas(eventosDraft.map(draftParaEventoOrc)),
  });

  // C6 — o Sheet precisa da mesma lista que o painel do dente sempre recebeu; migrado de
  // registrar-painel.tsx (era `useEffect` local ali, key `pacienteId`). Dep proposital só no
  // id, não no objeto inteiro — refetch só quando o PACIENTE muda, mesmo padrão de antes.
  useEffect(() => {
    if (!slotSelecionado) return;
    let cancelado = false;
    getGruposAbertos(slotSelecionado.pacienteId).then((g) => { if (!cancelado) setGruposAbertos(g); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotSelecionado?.pacienteId]);

  // R-76 — status que ainda podem ser atendidos (cancelado/faltou/concluído já saíram do dia).
  function podeAtender(status: string): boolean {
    return !['cancelled', 'no_show', 'completed'].includes(status);
  }

  // R-76 — a partir do slot atual, o próximo elegível NA ORDEM do rail. Sem próximo → null
  // (fim de dia, intencional — nunca cai de volta no slots[0] escondido).
  function avancarProximo() {
    const idxAtual = slots.findIndex((s) => s.agendamentoId === selecionadoId);
    const proximo = idxAtual === -1 ? undefined : slots.slice(idxAtual + 1).find((s) => podeAtender(s.statusAgendamento));
    setSelecionadoId(proximo?.agendamentoId ?? null);
  }

  // C2 (§5.6) — trava 1: limpa o rascunho AGORA, local e síncrono, não espera o refresh do
  // servidor. Fecha a janela de corrida de um duplo clique rápido logo após salvar (o
  // `router.refresh()` sozinho não seria rápido o bastante pra proteger o 2º clique).
  function handleSalvo() {
    setEventosDraft([]);
    setDenteAberto(null);
    setDetalheEspecialidadeAberto(false);
    setRegistrandoDenteAberto(false);
    setDetalheAlvoId(null);
    setLeituraGrande(null);
    setTextoVisita('');
    avancarProximo();
    router.refresh();
  }

  // R-57 F1 — o modal já fechou sozinho (onOpenChange(false) antes de chamar onCriado).
  function handleEncaixeCriado(agendamentoId: string) {
    setAguardandoSlot(agendamentoId);
    router.refresh();
  }

  // 07/08 — troca manual de status. `salvarVisitaMeuDia` já marca 'completed' sozinho
  // (origem='modo_consulta'), mas isso não cobre quem registrou por outro caminho (ficha
  // rápida do perfil) nem corrige um clique errado — reusa a MESMA escrita que a Agenda usa
  // (`atualizarStatusAgendamento`), só um 2º ponto de entrada.
  async function handleMudarStatus(agendamentoId: string, status: AgendamentoStatus) {
    const res = await atualizarStatusAgendamento(agendamentoId, status);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  function fazerHoje(p: MeuDiaPendencia) {
    setEventosDraft([...eventosDraft, pendenciaParaDraft(p, hojeBRT())]);
  }

  function handleDenteAbertoChange(dente: number | null) {
    setDenteAberto(dente);
    // R-63 — nova seleção (ou fechar via ✕) nunca herda a tabela aberta do dente anterior;
    // o próprio ToothDetailPanel também reseta o índice local pro mesmo efeito (§4.2/I3).
    setDetalheEspecialidadeAberto(false);
    // R-78 F2 — trocar de dente (ou fechar) sempre volta pro histórico; nunca herda o
    // editor aberto do dente anterior.
    setRegistrandoDenteAberto(false);
    setDetalheAlvoId(null);
    // R-78 F4 — tocar um dente sai do modo "ler visita" (1 ocupante só, §3.2).
    setLeituraGrande(null);
  }

  /** R-78 F4 — "ler tudo ⤢" de uma visita no Histórico. Fecha o dente se algum estava
   *  aberto (mesma regra do ocupante único, §3.2) — a gaveta continua aberta, só o slot
   *  direito troca. */
  function abrirLeituraGrande(visita: MeuDiaVisita) {
    setDenteAberto(null);
    setRegistrandoDenteAberto(false);
    setDetalheAlvoId(null);
    setLeituraGrande(visita);
  }

  /** R-78 — ⤢ de um card de "Nesta ficha": vai direto pro editor do dente (pula o
   *  histórico, o dentista já sabe o que quer editar) com a tabela já expandida. */
  function abrirDenteGrande(dente: number, eventoId: string) {
    handleDenteAbertoChange(dente);
    setRegistrandoDenteAberto(true);
    setDetalheAlvoId(eventoId);
  }

  // R-52 — pendência encaminhada A MIM tem caminho de escrita PRÓPRIO, e isso não é
  // preferência de UX: o evento pertence a outro dentista, então o upsert do rascunho
  // (`pendenciaParaDraft` reusa o id original) bate na RLS `odontograma_eventos_write_own`,
  // afeta 0 linhas, e 0 linhas NÃO é erro no Postgres — gravaria nada dizendo que gravou.
  // A RPC 109 (`concluir_evento_encaminhado`) é a escrita estreita do destino: valida
  // clínica + `encaminhado_para = eu` + ficha não assinada, e só toca status/realizado_em.
  //
  // Conclui na hora, fora do "Salvar" da visita — o rótulo do botão diz "concluir →" em vez
  // de "fazer hoje →" justamente pra não prometer o mesmo gesto duas vezes.
  async function concluirRecebida(p: MeuDiaPendencia) {
    setConcluindoId(p.id);
    const res = await atualizarStatusEncaminhado({
      eventoIds: [p.id],
      novoStatus: 'realizado',
      realizadoEm: hojeBRT(),
    });
    setConcluindoId(null);
    if (!res.ok) {
      toast.error(res.error ?? 'Não foi possível concluir o procedimento.');
      return;
    }
    toast.success('Procedimento concluído.');
    router.refresh();
  }

  // R-52 — modo seleção pra encaminhar em lote (mesmo mecanismo do FichasTab, R-04 Fase 3):
  // liga o modo, marca ids, escolhe 1 destino, confirma em 1 chamada batch.
  function sairModoEncaminhar() {
    setModoEncaminhar(false);
    setSelecionadosEncaminhar(new Set());
    setDestinoEncaminhar(null);
  }
  function toggleModoEncaminhar() {
    if (modoEncaminhar) sairModoEncaminhar();
    else setModoEncaminhar(true);
  }
  function toggleSelecaoEncaminhar(id: string) {
    setSelecionadosEncaminhar((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  async function confirmarEncaminhamento() {
    if (destinoEncaminhar == null || selecionadosEncaminhar.size === 0) return;
    const ids = [...selecionadosEncaminhar];
    sairModoEncaminhar();
    const res = await encaminharProcedimento({ eventoIds: ids, dentistaDestinoId: destinoEncaminhar });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    // R-52 — sucesso parcial: um lote pode ter id que mudou de estado entre a seleção e o
    // confirmar (outra aba). Avisa em vez de fingir que os ignorados também foram.
    if (res.ignorados.length > 0) {
      toast.warning(`${res.encaminhados.length} encaminhado(s). ${res.ignorados.length} não puderam ser (mudaram de estado).`);
    } else {
      toast.success(`${res.encaminhados.length} procedimento(s) encaminhado(s).`);
    }
    router.refresh();
  }

  // R-46d D8 — anexar documento (caixa embaixo do Histórico) e "usar este documento de base"
  // (empurra pro campo mágico via nonce, append nunca substituição).
  function handleAnexado(nome: string, texto: string, origem: 'audio' | 'documento') {
    setDocumentoNome(nome);
    setDocumentoTexto(texto);
    setDocumentoOrigem(origem);
  }
  function handleUsarComoBase() {
    setDocumentoNonce((n) => n + 1);
  }

  // R-52 — "A fazer" é o TRABALHO QUE EU VOU FAZER (decisão dele, 03/08, com o número de
  // impacto medido no banco antes de fechar). Dois casos entram, dois ficam de fora:
  //
  //   ✅ minha e não encaminhada   → é minha, eu faço
  //   ✅ encaminhada PRA mim       → é trabalho meu, mesmo que o autor seja outro
  //   ❌ minha, mas eu encaminhei  → saiu da minha mesa
  //   ❌ de colega, não encaminhada→ não é minha; o panorama do paciente vive na ficha
  //
  // X1 (MAPA-MEU-DIA.md) — "responsável = encaminhadoParaId ?? dentistaId" é a MESMA regra
  // que `filtro-responsavel.ts` já usa na ficha (R-16). Reimplementar à mão seria o débito
  // que a decisão do X1 condenou: duas leituras da mesma regra podem divergir em silêncio.
  //
  // R-63 F2 — subiu de dentro de `a-fazer-bloco.tsx` pra cá: o MESMO array agora alimenta a
  // lista renderizada E o contador da gaveta (`FaixaGavetas`), nunca duas leituras da regra.
  const minhasPendencias = (contexto?.pendencias ?? []).filter((p) =>
    responsavelPassaFiltro(p.encaminhadoParaId ?? p.dentistaId, FILTRO_MEUS, meuDentistaId),
  );

  // R-52 — mesmo critério de "encaminhavel" de a-fazer-bloco.tsx: autoria + não rascunhada
  // ainda. Recalculado aqui só pra alimentar `totalEncaminhavel` da EncaminharBar.
  const pendenciasEncaminhaveis = (contexto?.pendencias ?? []).filter(
    (p) => p.dentistaId === meuDentistaId && !eventosDraft.some((e) => e.id === p.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <Rail
        slots={slots}
        selecionadoId={selecionadoId}
        onSelecionar={setSelecionadoId}
        onEncaixe={() => setEncaixeAberto(true)}
        onMudarStatus={handleMudarStatus}
      />
      <AtenderAgoraModal
        open={encaixeAberto}
        onOpenChange={setEncaixeAberto}
        onCriado={handleEncaixeCriado}
      />
      <NovoOrcamentoModal {...orcamentoModal.modalProps} />
      {slotSelecionado && contexto ? (
        <>
          {/* C1 — migrado de contexto-coluna.tsx (SAI): nome + "ver perfil" + alertas de
              cadastro (alergia etc.) não têm mais um bloco próprio nesta fatia (o phead
              completo — avatar, idade, badges de orto/endo — fica pra fatia posterior),
              mas não podiam simplesmente sumir da tela. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-text-primary">{slotSelecionado.pacienteNome}</h2>
              {contexto.alertas.map((alerta, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-pale px-3 py-1.5 text-xs font-semibold text-warning-ink"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {alerta}
                </span>
              ))}
              {/* D2 (R-78) — "A fazer" virou gaveta; o contador migra pra cá, mesmo padrão
                  visual dos alertas de cadastro acima, pra não sumir da vista permanente. */}
              {minhasPendencias.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-semibold text-text-secondary">
                  <Hourglass className="h-3 w-3 shrink-0" />
                  {minhasPendencias.length} pendente{minhasPendencias.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <Link
              href={`/dashboard/pacientes/${slotSelecionado.pacienteId}`}
              className="shrink-0 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
            >
              Ver perfil completo →
            </Link>
          </div>

          {/* R-78 F0 — campo mágico, full-width, topo do fluxo (era o topo do card
              "Registrar" antigo — o card em si morreu, campo mágico ganha o próprio). */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            {registrarPainel.campoMagico}
          </div>

          {/* Miolo: lista "Nesta ficha" + espelho/perfil do dente — §4.2 da spec, proporção
              1,50:1 (832,8px │ 555,2px). `minmax(0,1fr)` porque a coluna da lista precisa
              encolher (textos longos), a do espelho é fixa. `items-stretch` (pedido dele
              08/08): os 2 cards sempre com a mesma altura — antes "Nesta ficha" vazio
              ficava baixinho do lado do espelho, que é sempre alto (arcada inteira). O
              espelho ainda manda na altura na prática (`NestaSessaoBloco` já tem
              `max-h-[420px]` interno pra quando a lista crescer mais que ele). */}
          <div className="grid items-stretch gap-3 grid-cols-[minmax(0,1fr)_555px]">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Nesta ficha</p>
                <Contador n={eventosDraft.length} />
              </div>
              {/* F0+F1: "Hoje" + "Novos" fundidos numa lista só (todo `eventosDraft`, os 2
                  status juntos), `RegistroCard` editável — pill clicável, observação
                  inline, detalhe de especialidade colapsável (`nesta-sessao-bloco.tsx`). */}
              <NestaSessaoBloco
                vazio="Nada registrado ainda nesta consulta."
                eventosDraft={eventosDraft}
                onEventosDraftChange={setEventosDraft}
                onAbrirDenteGrande={abrirDenteGrande}
              />
            </div>

            {/* Ocupante único da direita (§3.2), 3 níveis (F2, 08/08): sem dente → o que
                `registrarPainel.slotCentral` decidir (espelho ou orto, orto vence, mesma
                prioridade de sempre); dente tocado → HISTÓRICO do dente (leitura antes de
                escrita — achado do Mateus: F0 abria o editor direto, errado); "+ registrar
                neste dente" (ou "continuar aqui" do grupo aberto) → editor de faces/chips
                (`ToothDetailPanel`, reusado tal qual, closes de volta pro histórico — não
                pro espelho). */}
            <div className="rounded-2xl border border-border bg-surface p-4">
              <AnimatePresence mode="wait" initial={false}>
                {denteAberto != null && registrandoDenteAberto ? (
                  <motion.div
                    key="editor-dente"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <ToothDetailPanel
                      dente={denteAberto}
                      eventos={eventosDraft}
                      onChange={setEventosDraft}
                      onClose={() => setRegistrandoDenteAberto(false)}
                      dataPadrao={hojeBRT()}
                      gruposAbertos={gruposAbertos}
                      onDetalheAbertoChange={setDetalheEspecialidadeAberto}
                      abrirDetalheDoEvento={detalheAlvoId ?? undefined}
                      className="border-0 p-0"
                    />
                  </motion.div>
                ) : denteAberto != null ? (
                  <motion.div
                    key="historico-dente"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <DenteHistoricoCard
                      dente={denteAberto}
                      eventosDraft={eventosDraft}
                      visitas={contexto.visitas}
                      gruposAbertos={gruposAbertos}
                      onFechar={() => handleDenteAbertoChange(null)}
                      onRegistrar={() => setRegistrandoDenteAberto(true)}
                    />
                  </motion.div>
                ) : leituraGrande != null ? (
                  <motion.div
                    key="leitura-visita"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <VisitaLeituraCard visita={leituraGrande} onFechar={() => setLeituraGrande(null)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="espelho"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    {registrarPainel.slotCentral}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* R-78 F0 — gaveta única substitui as 2 barras de abas. Corpos são os MESMOS
              blocos de sempre, só trocam de continente. */}
          <FaixaGavetas
            aberta={gavetaAberta}
            onAbertaChange={setGavetaAberta}
            historicoCount={contexto.visitas.length}
            aFazerCount={minhasPendencias.length}
            pacienteId={slotSelecionado.pacienteId}
            historicoBody={
              <HistoricoBloco
                visitas={contexto.visitas}
                pacienteId={slotSelecionado.pacienteId}
                pacienteNome={slotSelecionado.pacienteNome}
                onImportado={() => router.refresh()}
                onGerarOrcamento={(fichaId) => void orcamentoModal.abrirOrcamentoParaFicha(fichaId)}
                meuDentistaId={meuDentistaId}
                onLerGrande={abrirLeituraGrande}
              />
            }
            aFazerBody={
              <AFazerBloco
                pendencias={minhasPendencias}
                eventosDraft={eventosDraft}
                onFazerHoje={fazerHoje}
                onConcluirRecebida={(p) => void concluirRecebida(p)}
                concluindoId={concluindoId}
                meuDentistaId={meuDentistaId}
                modoEncaminhar={modoEncaminhar}
                selecionados={selecionadosEncaminhar}
                onToggleModoEncaminhar={toggleModoEncaminhar}
                onToggleSelecao={toggleSelecaoEncaminhar}
              />
            }
            anexosBody={
              <AnexarDocumentosBloco
                documentoNome={documentoNome}
                documentoTexto={documentoTexto}
                onAnexado={handleAnexado}
                onUsarComoBase={handleUsarComoBase}
              />
            }
          />

          {/* R-78 F0 — rodapé (Marcar retorno / Gerar orçamento / Salvar), era o fundo do
              card "Registrar" antigo. Sem card próprio no artefato — mas mantém 1 aqui
              (consistência com campo-mágico/miolo) até a auditoria visual dizer o contrário. */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            {registrarPainel.rodape}
          </div>

          {/* R-52 — barra do modo seleção, fixa no rodapé (mesmo componente do FichasTab,
              R-04 Fase 3, zero mudança nele). */}
          <AnimatePresence>
            {modoEncaminhar && (
              <EncaminharBar
                totalSelecionado={selecionadosEncaminhar.size}
                totalEncaminhavel={pendenciasEncaminhaveis.length}
                destinosDisponiveis={destinosEncaminhar}
                destino={destinoEncaminhar}
                onDestino={setDestinoEncaminhar}
                onSelecionarTudo={() => setSelecionadosEncaminhar(new Set(pendenciasEncaminhaveis.map((p) => p.id)))}
                onLimpar={() => setSelecionadosEncaminhar(new Set())}
                onConfirmar={() => void confirmarEncaminhamento()}
                onSair={sairModoEncaminhar}
              />
            )}
          </AnimatePresence>
        </>
      ) : slots.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Todos os atendimentos de hoje foram registrados.</p>
          <p className="mt-1 text-xs text-text-secondary">Bom trabalho — o dia terminou por aqui.</p>
        </div>
      ) : null}
    </div>
  );
}

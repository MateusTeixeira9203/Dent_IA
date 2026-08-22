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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Hourglass } from 'lucide-react';
import {
  atualizarStatusEncaminhado, encaminharProcedimento, getGruposAbertos,
} from '@/server/patients/registro-actions';
import { salvarVisitaMeuDia } from '@/app/dashboard/meu-dia/actions';
import type { SalvarFichaResult } from '@/server/patients/salvar-ficha';
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
import { ondeLabel } from './meu-dia-format';
import { useRegistrarPainel, pendenciaParaDraft } from './registrar-painel';

/** R-108b — rótulo do procedimento novo no eyebrow do seletor ("Restauração 26", artefato
 *  bloco 8). Dente entra como número puro, do jeito que o artefato mostra; âncora de região
 *  cai no `ondeLabel` que o resto do Meu dia já usa; nível-boca fica só com o tipo. */
function rotuloNovo(e: OdontogramaEventoDraft): string {
  const label = TIPO_LABEL[e.tipo];
  if (e.ancora.dente != null) return `${label} ${e.ancora.dente}`;
  if (e.ancora.arcada != null || e.ancora.quadrante != null) {
    return `${label} · ${ondeLabel({
      dente: null,
      arcada: e.ancora.arcada ?? null,
      quadrante: e.ancora.quadrante ?? null,
    })}`;
  }
  return label;
}
import { DenteHistoricoCard } from './dente-historico-card';
import { VisitaLeituraCard } from './visita-leitura-card';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { useOrcamentoModal } from '@/app/dashboard/pacientes/[id]/_components/use-orcamento-modal';
import { NovoOrcamentoModal } from '@/app/dashboard/pacientes/[id]/_components/modals/novo-orcamento-modal';
import { DicaZona } from './dica-zona';
import { DexOnboardingController } from './dex-onboarding-controller';
import { hojeBRT } from '@/lib/hora-brt';
import { responsavelPassaFiltro, FILTRO_MEUS } from '@/lib/fichas/filtro-responsavel';
import type { MeuDiaData, MeuDiaPendencia, MeuDiaVisita } from '@/server/dashboard/get-meu-dia';
import { TIPO_LABEL, type OdontogramaEventoDraft } from '@/types/odontograma';
import type { EventoOdontogramaParaOrc } from '@/app/dashboard/pacientes/[id]/_components/types';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';
import type { ProgressoOnboarding } from '@/types/onboarding';
import { escolherPrimeiroAtendimento, registrarMarcoOnboarding } from '../onboarding-actions';

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
    observacao: e.observacao,
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
    encaminhado_para: e.encaminhadoParaId ?? null,
    encaminhado_dentista: null,
  };
}

interface MeuDiaClientProps extends MeuDiaData {
  agendamentoInicialId?: string;
  /** R-46h — o hook de orçamento compartilhado (pacientes/[id]/_components) precisa disto
   *  pra escopar a query; MeuDiaData não carrega (é parâmetro do fetch, não parte do retorno). */
  clinicaId: string;
  progressoOnboarding: ProgressoOnboarding | null;
  emFormacaoClinica: boolean;
}

export function MeuDiaClient({
  slots, contextoPorPaciente, agendamentoInicialId, catalogoProcedimentos, meuDentistaId,
  destinosEncaminhar, clinicaId, primeiraSessao,
  progressoOnboarding, emFormacaoClinica,
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
  /** R-85 — quando "Gerar orçamento" precisa gravar a ficha cedo (ver `onAbrirPickerOrcamento`
   *  abaixo) pra não deixar o orçamento sem `ficha_id`. `null` até isso acontecer; o Salvar
   *  de verdade, depois, EDITA esta mesma ficha em vez de criar uma 2ª. */
  const [fichaRascunhoId, setFichaRascunhoId] = useState<string | null>(null);
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

  /** R-108b — destino dos eventos que NASCEM nesta sessão (spec §4). `undefined` = o dentista
   *  ainda não tocou no seletor, então vale o pré-marcado (1º tratamento aberto — "caso comum
   *  segue zero clique", spec §2). `null` = "+ Novo tratamento". */
  const [destinoEscolhido, setDestinoEscolhido] = useState<string | null | undefined>(undefined);

  const [idAoResetar, setIdAoResetar] = useState(selecionadoId);
  if (selecionadoId !== idAoResetar) {
    setIdAoResetar(selecionadoId);
    setEventosDraft([]);
    setDestinoEscolhido(undefined); // R-108b — tratamento aberto é do paciente anterior
    setFichaRascunhoId(null); // R-85 — ficha do orçamento antecipado é do paciente anterior
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

  // R-84 §3 — discriminador: id já existia no banco antes desta sessão (boca, R-61) vs.
  // indicação nova desta ficha. Derivado a cada render, nunca persistido — mesmo princípio de
  // `emAndamento`/`semPendencia` (evita 3º status por acidente, cilada documentada no R-51).
  const idsDeAntes = useMemo(
    () => new Set((contexto?.boca ?? []).map((b) => b.id)),
    [contexto?.boca],
  );

  // R-108b — o seletor "o novo vai para" (artefato bloco 8). Só existe quando há ambiguidade
  // real: nasceu procedimento novo E há tratamento aberto pra absorvê-lo. Observação dele:
  // "quando já tiver todos os em aberto fechado, não vai precisar do trigger".
  const tratamentosAbertos = contexto?.tratamentosAbertos ?? [];
  const eventosNovosDaSessao = eventosDraft.filter((e) => !idsDeAntes.has(e.id));
  // R-85 vence o roteamento (invariante §7): com a ficha do orçamento antecipado já criada, o
  // destino está decidido e perguntar seria mentira — o `fichaId` explícito ganha de qualquer
  // escolha feita aqui.
  const mostraSeletor =
    fichaRascunhoId == null && eventosNovosDaSessao.length > 0 && tratamentosAbertos.length > 0;
  const destinoNovos =
    destinoEscolhido !== undefined ? destinoEscolhido : (tratamentosAbertos[0]?.fichaId ?? null);

  // R-105a §4.2 — a regra do realce, derivada a cada render e nunca persistida (I2). No
  // máximo UM aceso por vez, e nenhum depois que a primeira ficha existe. O rail vazio cuida
  // do caso 'encaixe' sozinho (ele já recebe `primeiraSessao`); aqui só falta o campo mágico,
  // que acende enquanto o rascunho está vazio — assim que o 1º procedimento entra, o realce
  // apaga e quem passa a ensinar é o "Salvar e passar" perdendo o disabled.
  const onboardingClinicoAtivo = Boolean(
    primeiraSessao
    && progressoOnboarding
    && progressoOnboarding.etapa !== 'concluido'
    && progressoOnboarding.etapa !== 'pulado',
  );
  const realceCampoMagico =
    onboardingClinicoAtivo && slotSelecionado != null && eventosDraft.length === 0;

  const marcoCampoMagicoEnviado = useRef(false);
  useEffect(() => {
    if (!onboardingClinicoAtivo || eventosDraft.length === 0 || marcoCampoMagicoEnviado.current) return;
    marcoCampoMagicoEnviado.current = true;
    void registrarMarcoOnboarding('campo_magico');
  }, [eventosDraft.length, onboardingClinicoAtivo]);

  // R-105a §4.2.1 — as dicas de zona. Cada uma some quando A SUA zona é usada, não no fim de
  // tudo: é o que impede as 5 de virarem mobília. Todas derivadas aqui (I2), exceto a do campo
  // mágico (mora lá, é lá que vive o "aberto") e a do dente, que precisa de um "já tocou"
  // porque `denteAberto` volta a null quando o dentista fecha o perfil.
  const [jaTocouDente, setJaTocouDente] = useState(false);
  const semRascunhoAqui = eventosDraft.length === 0 && textoVisita.trim() === '';
  const dicas = {
    rail:       onboardingClinicoAtivo && slots.length === 0,
    campo:      onboardingClinicoAtivo,
    nestaFicha: onboardingClinicoAtivo && eventosDraft.length === 0,
    odontograma: onboardingClinicoAtivo && !jaTocouDente,
    rodape:     onboardingClinicoAtivo && semRascunhoAqui,
  };

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
    fichaRascunhoId,
    destinoNovos,
    onSalvo: handleSalvo,
    anexarTexto,
    boca: contexto?.boca ?? [],
    detalheEspecialidadeAberto,
    // R-84 §5.1 — só o que é indicação NOVA desta ficha vai pro orçamento; o que é pendência
    // antiga sendo fechada hoje já foi vendido na avaliação (§2.2). Filtro por evento, não por
    // card: elemento novo acrescentado hoje a um grupo antigo continua sendo venda legítima.
    // R-85 — achado pela auditoria de 08/08: orçar o que é novo ANTES de salvar criava um
    // orçamento com `ficha_id=null` (nunca virava registro clínico). Se há algo novo pra
    // orçar, grava agora (sem fechar o atendimento — `finalizarAtendimento: false`) — cria a
    // ficha na 1ª vez, EDITA nas vezes seguintes (fichaRascunhoId já setado). Sem isto, um 2º
    // procedimento registrado depois do 1º "Gerar orçamento" entrava no orçamento sem nunca
    // ter sido gravado (mesmo bug, só que a partir do 2º item em diante). O Salvar de verdade,
    // depois, edita essa mesma ficha de novo e SÓ ELE fecha o atendimento/avisa a secretária.
    realceCampoMagico,
    dicaCampoMagico: dicas.campo,
    onAbrirPickerOrcamento: () => {
      const eventosNovos = eventosDraft.filter((e) => !idsDeAntes.has(e.id));
      if (eventosNovos.length === 0 || !slotSelecionado) {
        void orcamentoModal.abrirPickerFichasAbertas(fichaRascunhoId, eventosNovos.map(draftParaEventoOrc));
        return;
      }
      void (async () => {
        // R-86 — mesmo cuidado do handleSalvar (registrar-painel.tsx): sem o try/catch, uma
        // falha de rede aqui deixava o clique em "Gerar orçamento" travado sem abrir nada e
        // sem avisar nada, indistinguível de "não fiz nada".
        let resultado: SalvarFichaResult;
        try {
          resultado = await salvarVisitaMeuDia({
            fichaId: fichaRascunhoId ?? undefined,
            pacienteId: slotSelecionado.pacienteId,
            agendamentoId: slotSelecionado.agendamentoId,
            textoVisita,
            eventosDraft: eventosNovos,
            finalizarAtendimento: false,
          });
        } catch {
          resultado = { ok: false, error: 'Falha de conexão. Tente novamente.' };
        }
        if (!resultado.ok) {
          toast.error(`Não deu pra preparar o orçamento: ${resultado.error}`);
          return;
        }
        setFichaRascunhoId(resultado.fichaId);
        void orcamentoModal.abrirPickerFichasAbertas(resultado.fichaId, eventosNovos.map(draftParaEventoOrc));
      })();
    },
    onAbrirDetalheEndo: abrirDenteGrande,
    onAbrirDetalheDental: abrirDetalheDental,
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
    if (onboardingClinicoAtivo) void registrarMarcoOnboarding('primeira_ficha');
    setEventosDraft([]);
    setFichaRascunhoId(null);
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
    if (dente != null) setJaTocouDente(true); // R-105a §4.2.1 — dispensa a dica do odontograma
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

  /** R-122 — seleção no mapa não abre nada. Este é o gesto explícito que leva às faces,
   * histórico e tabelas do dente escolhido. */
  function abrirDetalheDental(dente: number) {
    handleDenteAbertoChange(dente);
    setRegistrandoDenteAberto(true);
    setDetalheAlvoId(null);
  }

  // R-123 — o painel de faces só existe por gesto explícito. Esc acompanha o ✕ e
  // devolve para o odontograma; campos internos que já usam Esc (ex.: busca livre)
  // chamam preventDefault e preservam seu próprio comportamento.
  useEffect(() => {
    if (denteAberto == null || !registrandoDenteAberto) return;

    function voltarAoOdontograma(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      handleDenteAbertoChange(null);
    }

    window.addEventListener('keydown', voltarAoOdontograma);
    return () => window.removeEventListener('keydown', voltarAoOdontograma);
  }, [denteAberto, handleDenteAbertoChange, registrandoDenteAberto]);

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
    <div className="flex flex-col gap-3">
      {/* §4.2.2 — antes do primeiro atendimento quem explica é o Dex, num card inteiro (há
          espaço e não há ninguém na cadeira). Depois disso, só as dicas de zona. */}
      {primeiraSessao && progressoOnboarding && (
        <DexOnboardingController
          progresso={progressoOnboarding}
          primeiraSessao={primeiraSessao}
          podeUsarDemo
          emFormacaoClinica={emFormacaoClinica}
          onAtenderReal={() => setEncaixeAberto(true)}
        />
      )}
      <Rail
        slots={slots}
        selecionadoId={selecionadoId}
        onSelecionar={setSelecionadoId}
        onEncaixe={() => setEncaixeAberto(true)}
        onMudarStatus={handleMudarStatus}
        primeiraSessao={primeiraSessao}
      />
      <AtenderAgoraModal
        clinicaId={clinicaId}
        open={encaixeAberto}
        onOpenChange={setEncaixeAberto}
        onCriado={handleEncaixeCriado}
        onCaminhoEscolhido={(caminho) => { void escolherPrimeiroAtendimento(caminho); }}
      />
      <NovoOrcamentoModal {...orcamentoModal.modalProps} />
      {slotSelecionado && contexto ? (
        <>
          {/* C1 — migrado de contexto-coluna.tsx (SAI): nome + "ver perfil" + alertas de
              cadastro (alergia etc.) não têm mais um bloco próprio nesta fatia (o phead
              completo — avatar, idade, badges de orto/endo — fica pra fatia posterior),
              mas não podiam simplesmente sumir da tela. */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
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
          <div className="rounded-2xl border border-teal/30 bg-surface p-2.5 sm:p-3">
            {registrarPainel.campoMagico}
          </div>

          {/* R-123 — mesma bancada do artefato aprovado: registros crescem pelo conteúdo;
              contexto clínico é a coluna de trabalho, não uma gaveta distante no fim da página. */}
          <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(460px,0.96fr)]">
            <motion.div
              layout="size"
              transition={{ layout: { duration: 0.18, ease: 'easeOut' } }}
              className="h-full rounded-2xl border border-border bg-surface p-4"
            >
              {dicas.nestaFicha && (
                <DicaZona titulo="Revisão da consulta">
                  Tudo que o Dex entendeu cai aqui. Dá pra corrigir antes de salvar.
                </DicaZona>
              )}
              <div className="mb-2 flex items-center gap-1.5">
                <p className="font-heading text-lg text-text-primary">Revisão da consulta</p>
                <Contador n={eventosDraft.length} />
              </div>
              {/* R-125a — ações de registro ficam onde o resultado será revisado. O mapa à
                  direita segue sendo só seleção/leitura; a seleção atualiza esta faixa sem
                  duplicar estado ou criar um segundo formulário no painel dental. */}
              {gavetaAberta === null && !denteAberto && !leituraGrande && (
                <div className="mb-3">
                  {registrarPainel.controlesOdontograma}
                </div>
              )}
              {/* F0+F1: "Hoje" + "Novos" fundidos numa lista só (todo `eventosDraft`, os 2
                  status juntos), `RegistroCard` editável — pill clicável, observação
                  inline, detalhe de especialidade colapsável (`nesta-sessao-bloco.tsx`). */}
              <NestaSessaoBloco
                // R-105a §4.2 — na primeira sessão a frase deixa de constatar o vazio e passa
                // a dizer o que vai acontecer ali quando o dentista falar.
                vazio={primeiraSessao
                  ? 'O que o Dex entender do seu relato aparece aqui.'
                  : 'Nada registrado ainda nesta consulta.'}
                eventosDraft={eventosDraft}
                onEventosDraftChange={setEventosDraft}
                onAbrirDenteGrande={abrirDenteGrande}
                idsDeAntes={idsDeAntes}
                destinosEncaminhar={destinosEncaminhar}
                nomeTratamentoPorEvento={contexto?.nomeTratamentoPorEvento ?? {}}
              />

              {/* R-108b — seletor "o novo vai para" (artefato bloco 8). Geometria portada por
                  extração do artefato, não medida no olho: .drop mt 9px / p 7px / borda 0.8px
                  --teal / raio 10px; opção 12px, p 7px 9px, raio 7px; ativa em --teal-pale +
                  --teal-ink 700 (o artefato usa teal-ink no light e teal-lt no dark — é o par
                  que `teal-ink` já resolve sozinho); "+ Novo tratamento" separado por borda
                  superior, mt 4px, p 10px 9px 7px, --tx2.

                  Só aparece com ambiguidade real, e os CONCLUÍDOS não entram nesta escolha —
                  eles voltam pra ficha onde foram planejados, sempre (spec §2). */}
              {mostraSeletor && (
                <div className="mt-[9px] rounded-[10px] border-[0.8px] border-teal p-[7px]">
                  <p className="px-[9px] pb-1.5 pt-[3px] text-[10px] font-extrabold uppercase tracking-[1.6px] text-text-secondary">
                    {eventosNovosDaSessao.length === 1
                      ? `O novo (${rotuloNovo(eventosNovosDaSessao[0])}) vai para`
                      : `Os ${eventosNovosDaSessao.length} novos vão para`}
                  </p>
                  {tratamentosAbertos.map((t) => (
                    <button
                      key={t.fichaId}
                      type="button"
                      aria-pressed={destinoNovos === t.fichaId}
                      onClick={() => setDestinoEscolhido(t.fichaId)}
                      className={`flex w-full items-center justify-between gap-[9px] rounded-[7px] px-[9px] py-[7px] text-left text-[12px] transition-colors ${
                        destinoNovos === t.fichaId
                          ? 'bg-teal-pale font-bold text-teal-ink'
                          : 'text-foreground hover:bg-surface-alt'
                      }`}
                    >
                      <span className="min-w-0 truncate">{t.nome}</span>
                      <span className="shrink-0 font-mono">{t.concluidos} de {t.totalProcedimentos}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={destinoNovos === null}
                    onClick={() => setDestinoEscolhido(null)}
                    className={`mt-1 flex w-full items-center justify-between gap-[9px] rounded-[7px] border-t-[0.8px] border-border px-[9px] pb-[7px] pt-[10px] text-left text-[12px] transition-colors ${
                      destinoNovos === null
                        ? 'bg-teal-pale font-bold text-teal-ink'
                        : 'text-text-secondary hover:bg-surface-alt'
                    }`}
                  >
                    <span className="min-w-0 truncate">+ Novo tratamento</span>
                    {/* Medido a 820px (card de 190px): sem `truncate` aqui o rótulo estourava
                        o card em 32px. A coluna é `minmax(0,1fr)` ao lado de um espelho fixo
                        de 555px, então ela encolhe de verdade em tela pequena. */}
                    <span className="shrink truncate font-mono">ficha à parte</span>
                  </button>
                </div>
              )}
            </motion.div>

            {/* R-123 — contexto clínico lateral: a aba ativa é o rótulo do conteúdo, então o
                mapa ganha espaço. Seleção no mapa continua não abrindo editor nem histórico. */}
            <motion.div
              layout="size"
              transition={{ layout: { duration: 0.18, ease: 'easeOut' } }}
              className="h-full rounded-2xl border border-border bg-surface p-4 xl:sticky xl:top-4"
            >
              <FaixaGavetas
                aberta={gavetaAberta}
                onAbertaChange={setGavetaAberta}
                historicoCount={contexto.visitas.length}
                aFazerCount={minhasPendencias.length}
                pacienteId={slotSelecionado.pacienteId}
                contextual
                onOdontograma={() => setGavetaAberta(null)}
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
              {gavetaAberta === null && !denteAberto && !leituraGrande && (
                <div className="mb-3 mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-text-secondary">Selecione sem abrir o histórico</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Registrar</span>
                </div>
              )}
              {gavetaAberta === null && <AnimatePresence mode="wait" initial={false}>
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
                      // R-123 — fechar o editor de faces volta ao mapa; o histórico
                      // continua acessível pelo gesto explícito "Ver histórico".
                      onClose={() => handleDenteAbertoChange(null)}
                      dataPadrao={hojeBRT()}
                      gruposAbertos={gruposAbertos}
                      onDetalheAbertoChange={setDetalheEspecialidadeAberto}
                      abrirDetalheDoEvento={detalheAlvoId ?? undefined}
                      // R-107b — catálogo do dentista pro match local da busca livre.
                      catalogoProcedimentos={catalogoProcedimentos}
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
                    {/* Só no espelho: quando há dente aberto a dica já foi dispensada
                        (`jaTocouDente`), então nunca aparece sobre o perfil do dente. */}
                    {dicas.odontograma && (
                      <DicaZona titulo="O odontograma">
                        A boca do paciente. Toque um dente pra ver o histórico dele.
                      </DicaZona>
                    )}
                    {registrarPainel.slotCentral}
                  </motion.div>
                )}
              </AnimatePresence>}
            </motion.div>
          </div>

          {/* R-78 F0 — rodapé (Marcar retorno / Gerar orçamento / Salvar), era o fundo do
              card "Registrar" antigo. Sem card próprio no artefato — mas mantém 1 aqui
              (consistência com campo-mágico/miolo) até a auditoria visual dizer o contrário. */}
          <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4 xl:sticky xl:bottom-3 xl:z-20">
            {dicas.rodape && (
              <DicaZona titulo="O que sai daqui">
                Da ficha salva saem o orçamento e o retorno, sem redigitar nada.
              </DicaZona>
            )}
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

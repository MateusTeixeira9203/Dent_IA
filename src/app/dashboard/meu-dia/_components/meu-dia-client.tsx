'use client';

// R-46a — dono do estado de seleção (qual atendimento do rail está com o contexto aberto
// embaixo). R-46g (D5): a chave é agendamentoId, não pacienteId — 2 atendimentos do mesmo
// paciente no mesmo dia (retorno) ficariam indistinguíveis por pacienteId. Precedência do
// default: agendamentoInicialId (veio de ?ag=, se casar com um slot) > em atendimento
// (in_progress/checked_in) > 1º slot.
// C2 (P7, 03/08) — `onSalvo` NÃO avança mais pro próximo slot: decisão dele, o dentista já
// troca de paciente clicando no rail. `onSalvo` só limpa o rascunho (trava §5.6.1) e refaz
// `router.refresh()` pra puxar `slots`/`contextoPorPaciente` frescos do servidor (✓
// registrado, pendências fechadas) sem sair da rota (G3/G9).
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
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import {
  atualizarStatusEncaminhado, encaminharProcedimento, getGruposAbertos,
} from '@/server/patients/registro-actions';
import { EncaminharBar } from '@/components/fichas/encaminhar-bar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Rail } from './rail';
import { AtenderAgoraModal } from '@/app/dashboard/agendamentos/_components/atender-agora-modal';
import { atualizarStatusAgendamento } from '@/app/dashboard/agendamentos/actions';
import type { AgendamentoStatus } from '@/types/database';
import { CockpitGrid } from './cockpit-grid';
import { HistoricoBloco } from './historico-bloco';
import { AnexarDocumentosBloco } from './anexar-documentos-bloco';
import { AFazerBloco } from './a-fazer-bloco';
import { NestaSessaoBloco } from './nesta-sessao-bloco';
import { RegistrarPainel, pendenciaParaDraft } from './registrar-painel';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { hojeBRT } from '@/lib/hora-brt';
import { responsavelPassaFiltro, FILTRO_MEUS } from '@/lib/fichas/filtro-responsavel';
import type { MeuDiaData, MeuDiaPendencia } from '@/server/dashboard/get-meu-dia';
import type { OdontogramaEventoDraft } from '@/types/odontograma';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';

// R-63 F2 — cromo das abas (esquerda e direita reusam): estilo underline extraído do
// artefato (plans/artefatos/R-63-layout-meu-dia.html), não o pill default de ui/tabs.tsx —
// veja spec §9. `cn()` do TabsList/TabsTrigger é twMerge, então as classes abaixo sobrescrevem
// o default do primitive.
//
// `data-[active]`, não `data-[selected]` nem o `data-[state=active]` que
// paciente-detail-client.tsx usa: conferido no fonte (`TabsTab.js` do @base-ui/react —
// `state = { active }`, sem stateAttributesMapping custom pra Tab) e no DOM ao vivo — o
// atributo real é `data-active=""`. `data-selected`/`data-state` não existem nesta versão
// (^1.2.0); nenhum dos dois consumidores que os usam tem a aba ativa estilizada de verdade.
const TAB_LIST_CLS = 'flex w-full justify-start rounded-none border-b border-border bg-transparent p-0';
const TAB_TRIGGER_CLS = "relative flex-1 min-w-0 h-9 justify-center truncate rounded-none px-1.5 text-[11px] font-bold text-text-secondary data-[active]:bg-transparent data-[active]:text-teal-ink data-[active]:shadow-none after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-t-full after:bg-transparent after:content-[''] data-[active]:after:bg-teal";

/** Contador da aba — sempre pill neutro, mesmo em 0 (o artefato não distingue "tem novidade"). */
function TabBadge({ n }: { n: number }) {
  return <span className="ml-1 rounded-full bg-surface-alt px-1.5 py-px font-mono text-[10px] text-text-secondary">{n}</span>;
}

interface MeuDiaClientProps extends MeuDiaData {
  agendamentoInicialId?: string;
}

export function MeuDiaClient({
  slots, contextoPorPaciente, agendamentoInicialId, catalogoProcedimentos, meuDentistaId,
  destinosEncaminhar,
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
  /** R-63 — true quando o `ToothDetailPanel` tem uma tabela de especialidade (endo/implante)
   *  aberta pro dente atual. É o que o slot central (`RegistrarPainel`) lê pra decidir se
   *  troca o mapa — vem de `onDetalheAbertoChange`, nunca escrito direto por outro caminho. */
  const [detalheEspecialidadeAberto, setDetalheEspecialidadeAberto] = useState(false);
  /** C7 — sobe de `registrar-painel.tsx` (era `useState` local lá): quem monta o
   *  `ToothDetailPanel` que precisa do container é este arquivo agora. O `<div>` continua
   *  renderizando lá (centro, abaixo do odontograma) — só a referência mora aqui. */
  const [tabelaContainer, setTabelaContainer] = useState<HTMLDivElement | null>(null);
  const [textoVisita, setTextoVisita] = useState('');
  const [gruposAbertos, setGruposAbertos] = useState<GrupoAberto[]>([]);
  /** R-46d D8 — "Anexar documentos": preso ao paciente, sem persistência (mesmo reset de
   *  eventosDraft/textoVisita abaixo). `documentoNonce` sinaliza "usar como base" pro campo
   *  mágico (append, nunca substituição — captura-livre-card.tsx). */
  const [documentoNome, setDocumentoNome] = useState<string | null>(null);
  const [documentoTexto, setDocumentoTexto] = useState<string | null>(null);
  const [documentoNonce, setDocumentoNonce] = useState(0);

  // Reset explícito ao trocar de paciente (contrato §5.4) — o `key={agendamentoId}` do
  // RegistrarPainel não alcança mais estes campos, que agora moram aqui. Ajuste durante o
  // render (comparando o id anterior), não `useEffect`: é o padrão que o React recomenda pra
  // "resetar estado quando uma prop muda" — evita o passe de render extra do efeito, e o lint
  // do projeto (`react-hooks/set-state-in-effect`) bloqueia a versão com efeito.
  /** R-52 — modo seleção pra encaminhar em lote. Mesmo padrão do FichasTab (R-04 Fase 3). */
  const [modoEncaminhar, setModoEncaminhar] = useState(false);
  const [selecionadosEncaminhar, setSelecionadosEncaminhar] = useState<Set<string>>(new Set());
  const [destinoEncaminhar, setDestinoEncaminhar] = useState<string | null>(null);

  // R-63 F2 (§4.4/§4.5) — as duas colunas viram abas, 1 corpo visível por vez, por
  // construção. Revoga a liberdade de 04/08 ("deixar quantos quiser abertos ao mesmo
  // tempo") — custo declarado no picker de 4 opções e aceito por ele antes da escolha
  // (D4, "Aba = 1 por vez, por construção"; F2 confirmou estender à esquerda também).
  const [abaEsquerda, setAbaEsquerda] = useState<'historico' | 'hoje' | 'anexos'>('historico');
  const [abaDireita, setAbaDireita] = useState<'afazer' | 'novos'>('afazer');

  const [idAoResetar, setIdAoResetar] = useState(selecionadoId);
  if (selecionadoId !== idAoResetar) {
    setIdAoResetar(selecionadoId);
    setEventosDraft([]);
    setDenteAberto(null);
    setDetalheEspecialidadeAberto(false); // R-63 — paciente novo não herda tabela aberta do anterior
    setAbaEsquerda('historico'); // G13 — troca de paciente reseta a aba pro default
    setAbaDireita('afazer');
    setTextoVisita('');
    // Trocar de paciente com o modo de encaminhar ligado deixaria a barra selecionando
    // pendência do paciente ERRADO (contexto.pendencias troca, os ids selecionados não).
    setModoEncaminhar(false);
    setSelecionadosEncaminhar(new Set());
    setDestinoEncaminhar(null);
    // D8 — documento anexado é do paciente anterior, não sobrevive à troca.
    setDocumentoNome(null);
    setDocumentoTexto(null);
  }

  /** R-52 — pendência recebida sendo concluída agora (trava o botão durante a escrita). */
  const [concluindoId, setConcluindoId] = useState<string | null>(null);

  const slotSelecionado = selecionadoId ? (slots.find((s) => s.agendamentoId === selecionadoId) ?? null) : null;
  const contexto = slotSelecionado ? contextoPorPaciente[slotSelecionado.pacienteId] : null;

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

  // C2 (§5.6) — trava 1: limpa o rascunho AGORA, local e síncrono, não espera o refresh do
  // servidor. Fecha a janela de corrida de um duplo clique rápido logo após salvar (o
  // `router.refresh()` sozinho não seria rápido o bastante pra proteger o 2º clique).
  function handleSalvo() {
    setEventosDraft([]);
    setDenteAberto(null);
    setDetalheEspecialidadeAberto(false);
    setTextoVisita('');
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
  function handleAnexado(nome: string, texto: string) {
    setDocumentoNome(nome);
    setDocumentoTexto(texto);
  }
  function handleUsarComoBase() {
    setDocumentoNonce((n) => n + 1);
  }

  // 03/08 — o rascunho da sessão vira 2 blocos pelo mesmo `status` que o chip Registrar já
  // decide: 'realizado' fica visível em "Concluídos hoje", 'indicado' em "Novos
  // procedimentos" (é o que sobra pendente depois de salvar e vira base do orçamento).
  const concluidosHoje = eventosDraft.filter((e) => e.status === 'realizado');
  const novosProcedimentos = eventosDraft.filter((e) => e.status === 'indicado');

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
  // lista renderizada E o contador da aba (`TabsTrigger`), nunca duas leituras da regra.
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
            </div>
            <Link
              href={`/dashboard/pacientes/${slotSelecionado.pacienteId}`}
              className="shrink-0 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
            >
              Ver perfil completo →
            </Link>
          </div>
          <CockpitGrid
            esquerda={
              <div className="rounded-2xl border border-border bg-surface">
                <Tabs value={abaEsquerda} onValueChange={(v: string) => setAbaEsquerda(v as typeof abaEsquerda)}>
                  <TabsList className={TAB_LIST_CLS} aria-label="Abas da coluna esquerda">
                    <TabsTrigger value="historico" className={TAB_TRIGGER_CLS}>
                      Histórico<TabBadge n={contexto.visitas.length} />
                    </TabsTrigger>
                    <TabsTrigger value="hoje" className={TAB_TRIGGER_CLS}>
                      Hoje<TabBadge n={concluidosHoje.length} />
                    </TabsTrigger>
                    <TabsTrigger value="anexos" className={TAB_TRIGGER_CLS}>
                      Anexos
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="historico" className="pt-2.5 px-3 pb-3">
                    <HistoricoBloco
                      visitas={contexto.visitas}
                      pacienteId={slotSelecionado.pacienteId}
                      pacienteNome={slotSelecionado.pacienteNome}
                      onImportado={() => router.refresh()}
                    />
                  </TabsContent>
                  <TabsContent value="hoje" className="pt-2.5 px-3 pb-3">
                    <NestaSessaoBloco
                      vazio="Nada concluído ainda nesta consulta."
                      eventos={concluidosHoje}
                      onDenteClick={handleDenteAbertoChange}
                    />
                  </TabsContent>
                  <TabsContent value="anexos" className="pt-2.5 px-3 pb-3">
                    <AnexarDocumentosBloco
                      documentoNome={documentoNome}
                      documentoTexto={documentoTexto}
                      onAnexado={handleAnexado}
                      onUsarComoBase={handleUsarComoBase}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            }
            centro={
              <RegistrarPainel
                key={slotSelecionado.agendamentoId}
                pacienteId={slotSelecionado.pacienteId}
                agendamentoId={slotSelecionado.agendamentoId}
                pacienteNome={slotSelecionado.pacienteNome}
                dentistaId={meuDentistaId}
                catalogoProcedimentos={catalogoProcedimentos}
                eventosDraft={eventosDraft}
                onEventosDraftChange={setEventosDraft}
                denteAberto={denteAberto}
                onDenteAbertoChange={handleDenteAbertoChange}
                onTabelaContainerRef={setTabelaContainer}
                textoVisita={textoVisita}
                onTextoVisitaChange={setTextoVisita}
                temFichaHoje={slotSelecionado.temFichaHoje}
                onSalvo={handleSalvo}
                anexarTexto={documentoTexto != null ? { texto: documentoTexto, nonce: documentoNonce } : undefined}
                orto={contexto.orto}
                boca={contexto.boca}
                detalheEspecialidadeAberto={detalheEspecialidadeAberto}
              />
            }
            direita={
              <>
                {/* C7/R-63 F2 (§4.4) — 1º item da direita: painel do dente FIXO, não é mais
                    acordeão (`painelDenteAberto` morreu — o ✕ dentro do painel já fecha por
                    completo). Sem `className` override: usa o card próprio do
                    `ToothDetailPanel` (rounded-xl+p-4, mesmo dos outros 3 consumidores) —
                    antes era `border-0` só pra não duplicar o card do `BlocoMoldavel`, que
                    não existe mais aqui. `AnimatePresence` continua animando entrada/saída. */}
                <AnimatePresence initial={false}>
                  {denteAberto != null && (
                    <motion.div
                      key="painel-dente"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <ToothDetailPanel
                        dente={denteAberto}
                        eventos={eventosDraft}
                        onChange={setEventosDraft}
                        onClose={() => handleDenteAbertoChange(null)}
                        dataPadrao={hojeBRT()}
                        gruposAbertos={gruposAbertos}
                        tabelaContainer={tabelaContainer}
                        onDetalheAbertoChange={setDetalheEspecialidadeAberto}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* R-63 F2 (§4.4) — 2º item: 1 card de abas (A fazer / Novos) no lugar dos 2
                    acordeões — G12: nunca 2 corpos visíveis nesta coluna. */}
                <div className="rounded-2xl border border-border bg-surface">
                  <Tabs value={abaDireita} onValueChange={(v: string) => setAbaDireita(v as typeof abaDireita)}>
                    <TabsList className={TAB_LIST_CLS} aria-label="Abas da coluna direita">
                      <TabsTrigger value="afazer" className={TAB_TRIGGER_CLS}>
                        A fazer<TabBadge n={minhasPendencias.length} />
                      </TabsTrigger>
                      <TabsTrigger value="novos" className={TAB_TRIGGER_CLS}>
                        Novos<TabBadge n={novosProcedimentos.length} />
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="afazer" className="pt-2.5 px-3 pb-3">
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
                    </TabsContent>
                    <TabsContent value="novos" className="pt-2.5 px-3 pb-3">
                      <NestaSessaoBloco
                        vazio="Nenhum procedimento novo indicado ainda."
                        eventos={novosProcedimentos}
                        onDenteClick={handleDenteAbertoChange}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            }
          />
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

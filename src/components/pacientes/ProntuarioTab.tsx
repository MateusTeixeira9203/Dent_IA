'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ArrowLeft, CalendarPlus, Check, ChevronDown, ChevronRight, ClipboardCheck, FileText, FolderOpen, Forward, Loader2, PenLine, Plus, Star, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToothDetailPanel } from '@/components/odontograma/ToothDetailPanel';
import { Odontograma } from '@/components/odontograma/Odontograma';
import { NestaSessaoBloco } from '@/app/dashboard/meu-dia/_components/nesta-sessao-bloco';
import {
  useRegistrarPainel,
  type SalvarRegistroClinico,
} from '@/app/dashboard/meu-dia/_components/registrar-painel';
import { salvarAtendimentoDoProntuario } from '@/app/dashboard/pacientes/[id]/prontuario-actions';
import { MarcarRetornoModal } from '@/components/pacientes/marcar-retorno-modal';
import { useMarcarRetorno } from '@/hooks/use-marcar-retorno';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';
import type { ProntuarioAtendimento, ProntuarioLongitudinalData } from '@/server/patients/get-prontuario-longitudinal';
import type { OdontogramaEventoDraft } from '@/types/odontograma';
import { TIPO_LABEL } from '@/types/odontograma';
import {
  alternarMomentoRegistro,
  alternarStatusRegistro,
  assinarProcedimentos,
  atualizarStatusEncaminhado,
  encaminharProcedimento,
} from '@/server/patients/registro-actions';

const FichasTab = dynamic(
  () => import('@/components/pacientes/FichasTab').then((module) => module.FichasTab),
  { ssr: false },
);

const SignaturePad = dynamic(
  () => import('@/components/fichas/SignaturePad').then((module) => module.SignaturePad),
  { ssr: false },
);

interface ProntuarioTabProps {
  patientId: string;
  patientName: string;
  clinicaId: string;
  dentistaId: string;
  canWrite: boolean;
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  dados: ProntuarioLongitudinalData;
  onGerarOrcamento?: (fichaId: string) => void;
  onAbrirArquivos: () => void;
}

function formatarData(data: string): string {
  return format(new Date(`${data}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function textoDaVisita(atendimento: ProntuarioAtendimento): string | null {
  const relato = atendimento.evolucoes.find((evolucao) => !evolucao.automatica && evolucao.texto?.trim());
  return relato?.texto ?? null;
}

function rotuloOrigem(atendimento: ProntuarioAtendimento): string {
  if (atendimento.fonte === 'ficha_legada') return 'Registro legado';
  if (atendimento.fonte === 'evolucao_legada') return 'Evolução legada';
  if (atendimento.origem === 'ficha') return 'Atendimento pelo prontuário';
  return 'Atendimento pelo Meu Dia';
}

function rotuloProcedimento(atendimento: ProntuarioAtendimento, eventoId: string): string {
  const evento = atendimento.eventos.find((item) => item.id === eventoId);
  if (!evento) return 'Procedimento clínico';
  return evento.procedimentoNome?.trim() || TIPO_LABEL[evento.tipo];
}

function rotuloUltimaAlteracao(acao: NonNullable<ProntuarioAtendimento['eventos'][number]['ultimaAlteracao']>['acao']): string {
  const rotulos = {
    encaminhado: 'Encaminhado',
    encaminhamento_removido: 'Encaminhamento removido',
    detalhe_alterado: 'Detalhe clínico atualizado',
    marcado_realizado: 'Marcado como realizado',
    reaberto: 'Reaberto',
  } as const;
  return rotulos[acao];
}

function formatarDataHora(data: string): string {
  return format(new Date(data), "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

function dataDaAgenda(data: string): string {
  return format(new Date(data), "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

function rotuloStatusAgenda(status: string): string {
  const rotulos: Record<string, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    checked_in: 'Aguardando atendimento',
    in_progress: 'Em atendimento',
    completed: 'Realizado',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu',
  };
  return rotulos[status] ?? status;
}

type ResumoAberto = 'atendimentos' | 'tratamentos' | 'pendencias';

type GrupoProcedimento = {
  chave: string;
  eventos: ProntuarioAtendimento['eventos'];
  eventoPrincipal: ProntuarioAtendimento['eventos'][number];
};

function agruparProcedimentos(atendimento: ProntuarioAtendimento): GrupoProcedimento[] {
  const grupos = new Map<string, ProntuarioAtendimento['eventos']>();
  for (const evento of atendimento.eventos) {
    const chave = evento.grupo_id ?? evento.id;
    grupos.set(chave, [...(grupos.get(chave) ?? []), evento]);
  }
  return [...grupos.entries()].map(([chave, eventos]) => ({
    chave,
    eventos,
    eventoPrincipal: eventos[0]!,
  }));
}

const ODONTOGRAMA_RESPONSIVO = 'origin-top-left [zoom:0.46] min-[480px]:[zoom:0.62] sm:[zoom:0.78] md:[zoom:0.9] xl:[zoom:1]';

export function ProntuarioTab({
  patientId,
  patientName,
  clinicaId,
  dentistaId,
  canWrite,
  catalogoProcedimentos,
  dados,
  onGerarOrcamento,
  onAbrirArquivos,
}: ProntuarioTabProps) {
  const router = useRouter();
  const [novoRegistroAberto, setNovoRegistroAberto] = useState(false);
  const [fichaNoEditor, setFichaNoEditor] = useState<string | null>(null);
  const [retornoAberto, setRetornoAberto] = useState(false);
  const [retornoAtendimentoId, setRetornoAtendimentoId] = useState<string | null>(null);
  const [atendimentoAbertoId, setAtendimentoAbertoId] = useState<string | null>(null);
  const [odontogramaCompletoAberto, setOdontogramaCompletoAberto] = useState(false);
  const [filtroClinico, setFiltroClinico] = useState<'tudo' | 'indicado' | 'realizado'>('tudo');
  const [eventosDraft, setEventosDraft] = useState<OdontogramaEventoDraft[]>([]);
  const [textoVisita, setTextoVisita] = useState('');
  const [visitaKey, setVisitaKey] = useState(() => crypto.randomUUID());
  const [denteAberto, setDenteAberto] = useState<number | null>(null);
  const [detalheEspecialidadeAberto, setDetalheEspecialidadeAberto] = useState(false);
  const [resumoAberto, setResumoAberto] = useState<ResumoAberto | null>(null);
  const [resumoDenteSelecionado, setResumoDenteSelecionado] = useState<number | null>(null);
  const [destinoNovoRegistroId, setDestinoNovoRegistroId] = useState<string | null>(null);
  const [atendimentoDeOrigemId, setAtendimentoDeOrigemId] = useState<string | null>(null);
  const [complementoPendente, setComplementoPendente] = useState<{
    atendimento: ProntuarioAtendimento;
    dente: number | null;
  } | null>(null);
  const [edicaoPendente, setEdicaoPendente] = useState<ProntuarioAtendimento | null>(null);
  const [acaoProcedimento, setAcaoProcedimento] = useState<string | null>(null);
  const [encaminhamentoEventoIds, setEncaminhamentoEventoIds] = useState<string[]>([]);
  const [destinoEncaminhamentoId, setDestinoEncaminhamentoId] = useState('');
  const [assinaturaAberta, setAssinaturaAberta] = useState(false);
  const [assinaturaEtapa, setAssinaturaEtapa] = useState<'selecao' | 'coleta'>('selecao');
  const [assinaturaSelecionados, setAssinaturaSelecionados] = useState<string[]>([]);
  const [assinadoPor, setAssinadoPor] = useState(patientName);
  const [orientacoesAssinatura, setOrientacoesAssinatura] = useState('Orientações clínicas fornecidas e compreendidas pelo paciente.');
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const assinaturaPadRef = useRef<SignaturePadLib | null>(null);

  const salvarRegistro: SalvarRegistroClinico = async (input) => salvarAtendimentoDoProntuario(input);

  const painel = useRegistrarPainel({
    visitaKey,
    contextoId: visitaKey,
    pacienteId: patientId,
    pacienteNome: patientName,
    dentistaId,
    catalogoProcedimentos,
    eventosDraft,
    onEventosDraftChange: setEventosDraft,
    denteAberto,
    onDenteAbertoChange: setDenteAberto,
    textoVisita,
    onTextoVisitaChange: setTextoVisita,
    temFichaHoje: false,
    fichaRascunhoId: null,
    destinoNovos: destinoNovoRegistroId,
    boca: dados.boca,
    detalheEspecialidadeAberto,
    onAbrirPickerOrcamento: () => {
      toast.info('Salve o atendimento antes de gerar o orçamento. Assim o orçamento fica ligado à ficha correta.');
    },
    onAbrirDetalheDental: (dente) => setDenteAberto(dente),
    onIniciarPonte: (dente) => setDenteAberto(dente),
    onAbrirDetalheEndo: (dente) => setDenteAberto(dente),
    onSalvarVisita: salvarRegistro,
    onSalvo: () => {
      setEventosDraft([]);
      setTextoVisita('');
      setDenteAberto(null);
      setDetalheEspecialidadeAberto(false);
      setDestinoNovoRegistroId(null);
      setAtendimentoDeOrigemId(null);
      setVisitaKey(crypto.randomUUID());
      setNovoRegistroAberto(false);
      router.refresh();
    },
  });

  const retorno = useMarcarRetorno({
    pacienteId: patientId,
    atendimentoOrigemId: retornoAtendimentoId ?? undefined,
    onConcluido: () => {
      const retornoVinculado = retornoAtendimentoId != null;
      setRetornoAberto(false);
      setRetornoAtendimentoId(null);
      toast.success(retornoVinculado ? 'Retorno marcado e ligado a este atendimento.' : 'Próximo agendamento marcado.');
      router.refresh();
    },
  });

  const atendimentos = useMemo(() => dados.atendimentos, [dados.atendimentos]);
  const atendimentoAberto = atendimentos.find((atendimento) => atendimento.id === atendimentoAbertoId) ?? null;
  const atendimentosVisiveis = atendimentos.filter((atendimento) => (
    filtroClinico === 'tudo' || atendimento.eventos.some((evento) => evento.status === filtroClinico)
  ));
  const tratamentosAbertos = dados.atendimentos
    .flatMap((atendimento) => atendimento.fichas)
    .filter((ficha) => ficha.status === 'aberta');
  const tratamentosEmCurso = Array.from(new Map(
    tratamentosAbertos.map((ficha) => [ficha.id, ficha] as const),
  ).values());
  const todasFichas = Array.from(new Map(
    dados.atendimentos.flatMap((atendimento) => atendimento.fichas).map((ficha) => [ficha.id, ficha] as const),
  ).values());
  const fichaConhecidaPorId = new Map(todasFichas.map((ficha) => [ficha.id, ficha] as const));
  const eventosClinicosUnicos = Array.from(new Map(
    dados.atendimentos.flatMap((atendimento) => atendimento.eventos).map((evento) => [evento.id, evento] as const),
  ).values());
  const resumosTratamento = tratamentosEmCurso.map((ficha) => {
    const eventos = eventosClinicosUnicos.filter((evento) => evento.fichaId === ficha.id);
    const realizados = eventos.filter((evento) => evento.status === 'realizado').length;
    const procedimentos = [...new Set(eventos.map((evento) => (
      evento.procedimentoNome?.trim() || TIPO_LABEL[evento.tipo]
    )))];
    return {
      ficha,
      realizados,
      total: eventos.length,
      progresso: eventos.length > 0 ? Math.round((realizados / eventos.length) * 100) : 0,
      procedimentos,
    };
  });
  const eventosDoDenteSelecionado = resumoDenteSelecionado == null
    ? []
    : eventosClinicosUnicos.filter((evento) => evento.ancora.dente === resumoDenteSelecionado);
  const destinosDoDente = Array.from(eventosDoDenteSelecionado.reduce((destinos, evento) => {
    const chave = evento.fichaId ?? `sem-ficha:${evento.id}`;
    const atual = destinos.get(chave);
    const procedimento = evento.procedimentoNome?.trim() || TIPO_LABEL[evento.tipo];
    destinos.set(chave, {
      ficha: evento.fichaId ? fichaConhecidaPorId.get(evento.fichaId) ?? null : null,
      procedimentos: [...new Set([...(atual?.procedimentos ?? []), procedimento])],
      pendentes: (atual?.pendentes ?? 0) + (evento.status === 'indicado' ? 1 : 0),
    });
    return destinos;
  }, new Map<string, {
    ficha: (typeof todasFichas)[number] | null;
    procedimentos: string[];
    pendentes: number;
  }>()).values());
  const eventosPendentes = dados.boca.filter((evento) => evento.status === 'indicado');
  const pendencias = eventosPendentes.length;

  function abrirNovoRegistro(params?: {
    fichaId?: string | null;
    dente?: number | null;
    atendimentoOrigemId?: string | null;
  }): void {
    setDestinoNovoRegistroId(params?.fichaId ?? null);
    setAtendimentoDeOrigemId(params?.atendimentoOrigemId ?? null);
    setDenteAberto(params?.dente ?? null);
    setDetalheEspecialidadeAberto(false);
    setNovoRegistroAberto(true);
  }

  function complementarAtendimento(atendimento: ProntuarioAtendimento, dente: number | null = null): void {
    if (atendimento.fichas.length > 1) {
      setComplementoPendente({ atendimento, dente });
      return;
    }
    abrirNovoRegistro({
      fichaId: atendimento.fichas[0]?.id ?? null,
      dente,
      atendimentoOrigemId: atendimento.id,
    });
  }

  function editarAtendimento(atendimento: ProntuarioAtendimento): void {
    if (atendimento.fichas.length > 1) {
      setEdicaoPendente(atendimento);
      return;
    }
    const ficha = atendimento.fichas[0];
    const eventosDaFicha = atendimento.eventos.filter((evento) => evento.fichaId === ficha?.id);
    const fichaDoProfissionalAtual = eventosDaFicha.length > 0
      ? eventosDaFicha.every((evento) => evento.dentistaId === dentistaId)
      : atendimento.profissional.id === dentistaId;
    if (ficha && ficha.assinadoEm == null && fichaDoProfissionalAtual) {
      setFichaNoEditor(ficha.id);
      return;
    }
    complementarAtendimento(atendimento);
  }

  async function atualizarStatusGrupo(grupo: GrupoProcedimento, novoStatus: 'indicado' | 'realizado'): Promise<void> {
    const eventoIds = grupo.eventos.map((evento) => evento.id);
    const encaminhadoAoAtual = grupo.eventos.every((evento) => evento.encaminhadoParaId === dentistaId);
    setAcaoProcedimento(`${grupo.chave}:status`);
    const resultado = encaminhadoAoAtual && !grupo.eventos.every((evento) => evento.dentistaId === dentistaId)
      ? await atualizarStatusEncaminhado({ eventoIds, novoStatus })
      : await alternarStatusRegistro({ eventoIds, novoStatus });
    setAcaoProcedimento(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(novoStatus === 'realizado' ? 'Procedimento marcado como realizado.' : 'Procedimento voltou para A fazer.');
    router.refresh();
  }

  async function atualizarProximaSessao(grupo: GrupoProcedimento): Promise<void> {
    const vaiParaProxima = !grupo.eventos.every((evento) => evento.momento_planejado === 'proxima_sessao');
    setAcaoProcedimento(`${grupo.chave}:momento`);
    const resultado = await alternarMomentoRegistro({
      eventoIds: grupo.eventos.map((evento) => evento.id),
      novoMomento: vaiParaProxima ? 'proxima_sessao' : 'sessao_atual',
    });
    setAcaoProcedimento(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(vaiParaProxima ? 'Separado para a próxima sessão.' : 'Retirado da próxima sessão.');
    router.refresh();
  }

  async function salvarEncaminhamento(): Promise<void> {
    if (encaminhamentoEventoIds.length === 0) return;
    setAcaoProcedimento('encaminhamento');
    const resultado = await encaminharProcedimento({
      eventoIds: encaminhamentoEventoIds,
      dentistaDestinoId: destinoEncaminhamentoId || null,
    });
    setAcaoProcedimento(null);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setEncaminhamentoEventoIds([]);
    toast.success(destinoEncaminhamentoId ? 'Procedimento encaminhado.' : 'Encaminhamento removido.');
    router.refresh();
  }

  async function salvarAssinaturas(atendimento: ProntuarioAtendimento): Promise<void> {
    if (assinaturaSelecionados.length === 0) {
      toast.error('Selecione pelo menos um procedimento realizado.');
      return;
    }
    if (assinadoPor.trim().length < 2 || orientacoesAssinatura.trim().length < 3) {
      toast.error('Informe o nome de quem assina e as orientações fornecidas.');
      return;
    }
    if (!assinaturaPadRef.current || assinaturaPadRef.current.isEmpty()) {
      toast.error('Colete a assinatura antes de concluir.');
      return;
    }

    const assinaturaDataUrl = assinaturaPadRef.current.toDataURL('image/png');
    const selecionados = atendimento.eventos.filter((evento) => assinaturaSelecionados.includes(evento.id));
    const porFicha = new Map<string, string[]>();
    for (const evento of selecionados) {
      if (!evento.fichaId) continue;
      porFicha.set(evento.fichaId, [...(porFicha.get(evento.fichaId) ?? []), evento.id]);
    }
    if (porFicha.size === 0) {
      toast.error('Os procedimentos selecionados não estão vinculados a uma ficha.');
      return;
    }

    setSalvandoAssinatura(true);
    const avisos: string[] = [];
    for (const eventoIds of porFicha.values()) {
      const resultado = await assinarProcedimentos({
        eventoIds,
        assinadoPor: assinadoPor.trim(),
        assinaturaDataUrl,
        conclusao: { orientacoes: orientacoesAssinatura.trim() },
      });
      if (!resultado.ok) {
        setSalvandoAssinatura(false);
        toast.error(resultado.error);
        return;
      }
      if (resultado.documentWarning) avisos.push(resultado.documentWarning);
    }
    setSalvandoAssinatura(false);
    setAssinaturaAberta(false);
    setAssinaturaEtapa('selecao');
    setAssinaturaSelecionados([]);
    toast.success('Assinatura coletada. O documento foi salvo no prontuário do paciente.');
    if (avisos.length > 0) toast.warning(avisos.join(' '));
    router.refresh();
  }

  function voltarDaBancada(): void {
    setNovoRegistroAberto(false);
    setEventosDraft([]);
    setTextoVisita('');
    setDenteAberto(null);
    setDetalheEspecialidadeAberto(false);
    setDestinoNovoRegistroId(null);
    if (atendimentoDeOrigemId) setAtendimentoAbertoId(atendimentoDeOrigemId);
    setAtendimentoDeOrigemId(null);
  }

  if (fichaNoEditor) {
    return (
      <FichasTab
        patientId={patientId}
        clinicaId={clinicaId}
        dentistaId={dentistaId}
        patientName={patientName}
        canWrite={canWrite}
        initialFichaId={fichaNoEditor}
        onGerarOrcamento={onGerarOrcamento}
        catalogoProcedimentos={catalogoProcedimentos}
        onVoltarAoProntuario={() => {
          setFichaNoEditor(null);
          router.refresh();
        }}
      />
    );
  }

  if (novoRegistroAberto) {
    const tratamentoDestino = tratamentosEmCurso.find((ficha) => ficha.id === destinoNovoRegistroId) ?? null;
    return (
      <section className="space-y-3" aria-label="Novo atendimento no prontuário">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-ink" aria-hidden />
            <div>
                <p className="text-sm font-bold text-text-primary">
                  {tratamentoDestino ? `Complementar ${tratamentoDestino.nome}` : 'Novo atendimento'}
                </p>
                <p className="text-xs text-text-secondary">
                  Nova entrada com autoria e data próprias — o registro anterior não é reescrito.
                </p>
              </div>
            </div>
          <Button variant="ghost" size="sm" onClick={voltarDaBancada}>
            <ArrowLeft className="h-4 w-4" /> {atendimentoDeOrigemId ? 'Voltar ao registro' : 'Voltar ao prontuário'}
          </Button>
        </div>

        <div className="rounded-2xl border border-teal/30 bg-surface p-3">
          {painel.campoMagico}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(720px,0.95fr)]">
          <section className="flex min-h-[720px] flex-col rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading text-lg text-text-primary">Revisão do atendimento</p>
                <p className="text-xs text-text-secondary">Corrija, complete ou remova antes de salvar.</p>
              </div>
              {painel.acoesSecundarias}
            </div>
            <div className="min-h-0 flex-1 pr-1">
              <NestaSessaoBloco
                vazio="Ainda não há registros nesta consulta. Use o Dex ou selecione uma região da boca."
                eventosDraft={eventosDraft}
                onEventosDraftChange={setEventosDraft}
                textoVisita={textoVisita}
                onTextoVisitaChange={setTextoVisita}
                ortoManutencao={painel.ortoManutencao}
                onEditarOrto={painel.abrirManutencao}
                onAbrirDenteGrande={(dente) => setDenteAberto(dente)}
                idsDeAntes={new Set()}
                destinosEncaminhar={[]}
                nomeTratamentoPorEvento={{}}
              />
            </div>
          </section>

          <section className="min-h-[720px] rounded-2xl border border-border bg-surface p-4">
            {denteAberto != null ? (
              <ToothDetailPanel
                dente={denteAberto}
                eventos={eventosDraft}
                onChange={setEventosDraft}
                onClose={() => { setDenteAberto(null); setDetalheEspecialidadeAberto(false); }}
                dataPadrao={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}
                onDetalheAbertoChange={setDetalheEspecialidadeAberto}
                catalogoProcedimentos={catalogoProcedimentos}
              />
            ) : (
              <div className="flex h-full flex-col gap-3">{painel.slotCentral}<div className="border-t border-border pt-3">{painel.controlesOdontograma}</div></div>
            )}
          </section>
        </div>

        <footer className="rounded-2xl border border-border bg-surface p-3 sm:p-4">{painel.rodape}</footer>
      </section>
    );
  }

  if (atendimentoAberto) {
    const gruposProcedimento = agruparProcedimentos(atendimentoAberto);
    const elegiveisParaAssinatura = atendimentoAberto.eventos.filter((evento) => (
      evento.status === 'realizado'
      && evento.assinaturaId == null
      && evento.fichaId != null
      && evento.dentistaId === dentistaId
    ));
    const podeComplementar = canWrite && atendimentoAberto.fonte !== 'ficha_legada';

    return (
      <section className="space-y-4" aria-label="Atendimento aberto no prontuário">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="font-heading text-2xl text-text-primary">{formatarData(atendimentoAberto.dataAtendimento)}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {rotuloOrigem(atendimentoAberto)} · {atendimentoAberto.profissional.nome}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {podeComplementar && (
              <Button onClick={() => editarAtendimento(atendimentoAberto)}>
                <PenLine className="h-4 w-4" /> Editar ficha
              </Button>
            )}
            <Button variant="ghost" onClick={() => setAtendimentoAbertoId(null)}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao prontuário
            </Button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Evolução clínica</p>
              <div className="mt-3 space-y-3">
                {atendimentoAberto.evolucoes.length > 0 ? atendimentoAberto.evolucoes.map((evolucao) => (
                  <div key={evolucao.id} className="border-l-2 border-teal/40 pl-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
                      {evolucao.texto?.trim() || 'Sem evolução textual registrada.'}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {evolucao.automatica ? 'Registro automático do sistema' : evolucao.profissional.nome}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm italic text-text-secondary">Sem evolução textual registrada.</p>
                )}
              </div>
              {podeComplementar && (
                <Button className="mt-4" variant="outline" onClick={() => complementarAtendimento(atendimentoAberto)}>
                  <Plus className="h-4 w-4" /> Adicionar evolução manual
                </Button>
              )}
            </article>

            <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Odontograma do atendimento</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {podeComplementar
                      ? 'Clique em um dente para complementar ou planejar sem alterar o registro anterior.'
                      : 'Leitura do que foi registrado nesta visita.'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOdontogramaCompletoAberto(true)}>
                  Ver odontograma completo
                </Button>
              </div>
              <div className="mt-3 min-h-[360px] overflow-hidden">
                <div className={ODONTOGRAMA_RESPONSIVO}>
                  <Odontograma
                    selectedTeeth={[]}
                    eventos={atendimentoAberto.eventos}
                    onToothToggle={(dente) => {
                      if (podeComplementar) complementarAtendimento(atendimentoAberto, dente);
                    }}
                    presentationMode={!podeComplementar}
                  />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Procedimentos</p>
                  <p className="mt-1 text-xs text-text-secondary">Status clínico e organização da próxima sessão são controles separados.</p>
                </div>
                {canWrite && (
                  <Button
                    variant="outline"
                    disabled={elegiveisParaAssinatura.length === 0}
                    onClick={() => {
                      setAssinaturaSelecionados(elegiveisParaAssinatura.map((evento) => evento.id));
                      setAssinaturaEtapa('selecao');
                      setAssinaturaAberta(true);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" /> Coletar assinatura
                  </Button>
                )}
              </div>
              {atendimentoAberto.eventos.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">Nenhum procedimento estruturado nesta visita.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {gruposProcedimento.map((grupo) => {
                    const evento = grupo.eventoPrincipal;
                    const eventoIds = grupo.eventos.map((item) => item.id);
                    const assinado = grupo.eventos.some((item) => item.assinaturaId != null);
                    const autorAtual = grupo.eventos.every((item) => item.dentistaId === dentistaId);
                    const encaminhadoAoAtual = grupo.eventos.every((item) => item.encaminhadoParaId === dentistaId);
                    const ficha = evento.fichaId ? atendimentoAberto.fichas.find((item) => item.id === evento.fichaId) : null;
                    const fichaAssinada = ficha?.assinadoEm != null;
                    const podeAlterarStatus = canWrite && !assinado && !fichaAssinada && (autorAtual || encaminhadoAoAtual);
                    const realizados = grupo.eventos.filter((item) => item.status === 'realizado').length;
                    const todosRealizados = realizados === grupo.eventos.length;
                    const todosAFazer = realizados === 0;
                    const podeOrganizar = podeAlterarStatus && autorAtual && todosAFazer;
                    const emProximaSessao = todosAFazer && grupo.eventos.every((item) => item.momento_planejado === 'proxima_sessao');
                    const statusClasse = todosRealizados
                      ? 'bg-clinical-done-pale text-clinical-done-ink'
                      : !todosAFazer
                        ? 'border border-border bg-surface text-text-secondary'
                        : emProximaSessao
                        ? 'bg-warning-pale text-warning-ink'
                        : 'bg-coral-pale text-coral-ink';
                    const carregando = acaoProcedimento?.startsWith(`${grupo.chave}:`) ?? false;
                    return (
                    <li key={grupo.chave} className="rounded-xl border border-border bg-surface-alt/40 p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text-primary">
                          {rotuloProcedimento(atendimentoAberto, evento.id)}
                          {evento.ancora.dente != null ? ` · dente ${evento.ancora.dente}` : ''}
                          {grupo.eventos.length > 1 ? ` · ${grupo.eventos.length} dentes/regiões` : ''}
                        </p>
                        {evento.observacao && <p className="mt-0.5 text-xs text-text-secondary">{evento.observacao}</p>}
                        <p className="mt-1.5 text-xs text-text-secondary">
                          Registrado por {evento.autorOriginal.nome}
                          {evento.autorOriginal.cro ? ` · CRO ${evento.autorOriginal.cro}` : ''}
                        </p>
                        {evento.ultimaAlteracao && (
                          <p className="mt-1.5 text-xs text-text-secondary">
                            Última alteração: {evento.ultimaAlteracao.atorNome ?? 'Profissional não identificado'} · {formatarDataHora(evento.ultimaAlteracao.alteradoEm)} · {rotuloUltimaAlteracao(evento.ultimaAlteracao.acao)}
                          </p>
                        )}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasse}`}>
                          {todosRealizados
                            ? 'Realizado'
                            : !todosAFazer
                              ? `Parcial · ${realizados} de ${grupo.eventos.length}`
                              : emProximaSessao
                                ? 'A fazer · próxima sessão'
                                : 'A fazer'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        {podeAlterarStatus && (
                          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" aria-label="Status clínico">
                            <button
                              type="button"
                              disabled={carregando}
                              onClick={() => void atualizarStatusGrupo(grupo, 'indicado')}
                              className={todosAFazer
                                ? 'rounded-md bg-coral-pale px-3 py-1.5 text-xs font-bold text-coral-ink'
                                : 'rounded-md px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary'}
                            >
                              A fazer
                            </button>
                            <button
                              type="button"
                              disabled={carregando}
                              onClick={() => void atualizarStatusGrupo(grupo, 'realizado')}
                              className={todosRealizados
                                ? 'rounded-md bg-clinical-done-pale px-3 py-1.5 text-xs font-bold text-clinical-done-ink'
                                : 'rounded-md px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary'}
                            >
                              Realizado
                            </button>
                          </div>
                        )}
                        {podeOrganizar && (
                          <button
                            type="button"
                            disabled={carregando}
                            onClick={() => void atualizarProximaSessao(grupo)}
                            className={emProximaSessao
                              ? 'inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-warning-pale px-3 text-xs font-bold text-warning-ink'
                              : 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-text-secondary hover:border-warning/40 hover:text-warning-ink'}
                          >
                            <Star className={`h-3.5 w-3.5 ${emProximaSessao ? 'fill-current' : ''}`} />
                            {emProximaSessao ? 'Planejado para a próxima sessão' : 'Levar para próxima sessão'}
                          </button>
                        )}
                        {canWrite && autorAtual && !assinado && !fichaAssinada && todosAFazer && (
                          <button
                            type="button"
                            onClick={() => {
                              setEncaminhamentoEventoIds(eventoIds);
                              setDestinoEncaminhamentoId(evento.encaminhadoParaId ?? '');
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-text-secondary hover:border-teal/40 hover:text-teal-ink"
                          >
                            <Forward className="h-3.5 w-3.5" /> {evento.encaminhadoParaId ? 'Alterar encaminhamento' : 'Encaminhar'}
                          </button>
                        )}
                        {ficha && canWrite && autorAtual && (
                          <button
                            type="button"
                            onClick={() => ficha.assinadoEm == null ? setFichaNoEditor(ficha.id) : complementarAtendimento(atendimentoAberto, evento.ancora.dente ?? null)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-text-secondary hover:bg-surface hover:text-text-primary"
                          >
                            <PenLine className="h-3.5 w-3.5" /> {ficha.assinadoEm == null ? 'Editar procedimento' : 'Adicionar retificação'}
                          </button>
                        )}
                        {assinado && <span className="text-xs font-semibold text-text-secondary">Assinado · registro bloqueado</span>}
                        {carregando && <Loader2 className="h-4 w-4 animate-spin text-teal" aria-label="Salvando" />}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </article>
          </div>

          <aside className="space-y-3">
            <article className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Retorno</p>
              {atendimentoAberto.retorno ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{dataDaAgenda(atendimentoAberto.retorno.dataHora)}</p>
                  <p className="mt-1 text-xs text-text-secondary">{atendimentoAberto.retorno.dentistaNome ?? 'Dentista não identificado'} · {rotuloStatusAgenda(atendimentoAberto.retorno.status)}</p>
                  <Button className="mt-3 w-full" variant="outline" onClick={() => router.push(`/dashboard/agendamentos?v=dia&d=${atendimentoAberto.retorno!.dataHora.slice(0, 10)}`)}>
                    Abrir na Agenda
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-text-primary">
                  {atendimentoAberto.atendimentoId ? 'Nenhum retorno vinculado a esta visita.' : 'Próximo agendamento ainda não registrado.'}
                </p>
              )}
              {canWrite && !atendimentoAberto.retorno && (
                <Button className="mt-3 w-full" variant="outline" onClick={() => {
                  setRetornoAtendimentoId(atendimentoAberto.atendimentoId);
                  setRetornoAberto(true);
                }}>
                  <CalendarPlus className="h-4 w-4" /> Marcar retorno
                </Button>
              )}
            </article>

            <article className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Rastreabilidade</p>
              <p className="mt-2 text-sm text-text-primary">Materiais não informados</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                A leitura de etiquetas será registrada quando o módulo de materiais estiver disponível.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Materiais e documentos</p>
              <p className="mt-2 text-sm text-text-primary">
                {atendimentoAberto.documentos.length > 0
                  ? `${atendimentoAberto.documentos.length} documento${atendimentoAberto.documentos.length === 1 ? '' : 's'} vinculado${atendimentoAberto.documentos.length === 1 ? '' : 's'} a este registro.`
                  : 'Nenhum documento vinculado a este registro.'}
              </p>
              <div className="mt-3 grid gap-2">
                <Button variant="ghost" className="justify-start" onClick={onAbrirArquivos}>
                  <FileText className="h-4 w-4" />
                  Abrir materiais e documentos
                </Button>
              </div>
            </article>

            {atendimentoAberto.fichas.length > 0 && (
              <article className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Tratamentos vinculados</p>
                <div className="mt-3 grid gap-2">
                  {atendimentoAberto.fichas.map((ficha) => (
                    <Button key={ficha.id} variant="ghost" className="justify-start" onClick={() => setFichaNoEditor(ficha.id)}>
                      <FolderOpen className="h-4 w-4" /> {ficha.nome}
                    </Button>
                  ))}
                  {onGerarOrcamento && (
                    <Button variant="outline" onClick={() => onGerarOrcamento(atendimentoAberto.fichas[0]!.id)}>
                      Gerar orçamento
                    </Button>
                  )}
                </div>
              </article>
            )}
          </aside>
        </div>

        <Dialog open={odontogramaCompletoAberto} onOpenChange={setOdontogramaCompletoAberto}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[1180px] overflow-hidden p-3 sm:w-[calc(100vw-2rem)] sm:max-w-[1180px] sm:p-6">
            <DialogHeader>
              <DialogTitle>Odontograma completo</DialogTitle>
            </DialogHeader>
            <div className="overflow-hidden">
              <div className={ODONTOGRAMA_RESPONSIVO}>
                <Odontograma
                  selectedTeeth={[]}
                  eventos={atendimentoAberto.eventos}
                  onToothToggle={(dente) => {
                    setOdontogramaCompletoAberto(false);
                    if (podeComplementar) complementarAtendimento(atendimentoAberto, dente);
                  }}
                  presentationMode={!podeComplementar}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={complementoPendente != null} onOpenChange={(open) => { if (!open) setComplementoPendente(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Em qual tratamento entra?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-secondary">
              Esta visita toca mais de um tratamento. Escolha o destino para preservar a organização clínica.
            </p>
            <div className="grid gap-2">
              {complementoPendente?.atendimento.fichas.map((ficha) => (
                <Button
                  key={ficha.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const pendente = complementoPendente;
                    setComplementoPendente(null);
                    if (!pendente) return;
                    abrirNovoRegistro({
                      fichaId: ficha.id,
                      dente: pendente.dente,
                      atendimentoOrigemId: pendente.atendimento.id,
                    });
                  }}
                >
                  <FolderOpen className="h-4 w-4" /> {ficha.nome}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={edicaoPendente != null} onOpenChange={(open) => { if (!open) setEdicaoPendente(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Qual ficha você quer editar?</DialogTitle>
              <DialogDescription>O atendimento possui mais de um tratamento vinculado.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {edicaoPendente?.fichas.map((ficha) => (
                (() => {
                  const eventosDaFicha = edicaoPendente.eventos.filter((evento) => evento.fichaId === ficha.id);
                  const fichaDoProfissionalAtual = eventosDaFicha.length > 0
                    ? eventosDaFicha.every((evento) => evento.dentistaId === dentistaId)
                    : edicaoPendente.profissional.id === dentistaId;
                  const podeEditarFicha = ficha.assinadoEm == null && fichaDoProfissionalAtual;
                  return (
                <Button
                  key={ficha.id}
                  variant="outline"
                  className="h-auto justify-start py-3 text-left"
                  onClick={() => {
                    const atendimento = edicaoPendente;
                    setEdicaoPendente(null);
                    if (!atendimento) return;
                    if (podeEditarFicha) setFichaNoEditor(ficha.id);
                    else abrirNovoRegistro({ fichaId: ficha.id, atendimentoOrigemId: atendimento.id });
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span><span className="block">{ficha.nome}</span><span className="block text-[11px] font-normal text-text-secondary">{podeEditarFicha ? 'Editar ficha' : 'Adicionar complemento com sua autoria'}</span></span>
                </Button>
                  );
                })()
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={encaminhamentoEventoIds.length > 0} onOpenChange={(open) => { if (!open) setEncaminhamentoEventoIds([]); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Encaminhar procedimento</DialogTitle>
              <DialogDescription>O procedimento continua na mesma ficha; o nome de quem alterar e a data ficam registrados.</DialogDescription>
            </DialogHeader>
            <label className="grid gap-2 text-sm font-semibold text-text-primary">
              Dentista responsável
              <select
                value={destinoEncaminhamentoId}
                onChange={(event) => setDestinoEncaminhamentoId(event.target.value)}
                className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-teal"
              >
                <option value="">Sem encaminhamento</option>
                {dados.profissionaisClinicos.filter((profissional) => profissional.id !== dentistaId).map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>{profissional.nome}{profissional.cro ? ` · CRO ${profissional.cro}` : ''}</option>
                ))}
              </select>
            </label>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEncaminhamentoEventoIds([])}>Cancelar</Button>
              <Button disabled={acaoProcedimento === 'encaminhamento'} onClick={() => void salvarEncaminhamento()}>
                {acaoProcedimento === 'encaminhamento' && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar encaminhamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assinaturaAberta} onOpenChange={(open) => {
          setAssinaturaAberta(open);
          if (!open) setAssinaturaEtapa('selecao');
        }}>
          <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Coletar assinatura</DialogTitle>
              <DialogDescription>
                {assinaturaEtapa === 'selecao'
                  ? 'Escolha um, vários ou todos os procedimentos realizados.'
                  : 'A assinatura gera um documento por ficha e salva em Documentos do paciente.'}
              </DialogDescription>
            </DialogHeader>

            {assinaturaEtapa === 'selecao' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Procedimentos deste atendimento</p>
                  <button
                    type="button"
                    onClick={() => setAssinaturaSelecionados(elegiveisParaAssinatura.map((evento) => evento.id))}
                    className="text-xs font-bold text-teal-ink hover:underline"
                  >
                    Selecionar todos os elegíveis
                  </button>
                </div>
                <div className="grid gap-2">
                  {gruposProcedimento.map((grupo) => {
                    const elegiveis = grupo.eventos.filter((evento) => (
                      evento.status === 'realizado'
                      && evento.assinaturaId == null
                      && evento.fichaId != null
                      && evento.dentistaId === dentistaId
                    ));
                    const habilitado = elegiveis.length > 0;
                    const marcado = habilitado && elegiveis.every((evento) => assinaturaSelecionados.includes(evento.id));
                    return (
                      <button
                        key={grupo.chave}
                        type="button"
                        disabled={!habilitado}
                        onClick={() => {
                          const ids = elegiveis.map((evento) => evento.id);
                          setAssinaturaSelecionados((atuais) => marcado
                            ? atuais.filter((id) => !ids.includes(id))
                            : [...new Set([...atuais, ...ids])]);
                        }}
                        className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span className={marcado
                          ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-teal bg-teal text-primary-foreground'
                          : 'h-5 w-5 shrink-0 rounded border border-border bg-surface-alt'}>
                          {marcado && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-text-primary">{rotuloProcedimento(atendimentoAberto, grupo.eventoPrincipal.id)}</span>
                          <span className="block text-xs text-text-secondary">
                            {habilitado ? 'Realizado · disponível para assinatura' : grupo.eventoPrincipal.status !== 'realizado' ? 'A fazer · conclua antes de assinar' : 'Já assinado ou sem ficha vinculada'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setAssinaturaAberta(false)}>Cancelar</Button>
                  <Button disabled={assinaturaSelecionados.length === 0} onClick={() => setAssinaturaEtapa('coleta')}>Continuar</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="grid gap-4">
                  <label className="grid gap-1.5 text-sm font-semibold text-text-primary">
                    Nome de quem assina
                    <input value={assinadoPor} onChange={(event) => setAssinadoPor(event.target.value)} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-teal" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-text-primary">
                    Orientações registradas no documento
                    <textarea value={orientacoesAssinatura} onChange={(event) => setOrientacoesAssinatura(event.target.value)} rows={3} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-teal" />
                  </label>
                  <SignaturePad padRef={assinaturaPadRef} />
                </div>
                <DialogFooter>
                  <Button variant="ghost" disabled={salvandoAssinatura} onClick={() => setAssinaturaEtapa('selecao')}>Voltar</Button>
                  <Button disabled={salvandoAssinatura} onClick={() => void salvarAssinaturas(atendimentoAberto)}>
                    {salvandoAssinatura && <Loader2 className="h-4 w-4 animate-spin" />}
                    Assinar e salvar documento
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Prontuário do paciente">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
        <div>
          <p className="font-heading text-xl text-text-primary">Prontuário</p>
          <p className="mt-0.5 text-sm text-text-secondary">Atendimentos, evoluções e procedimentos em uma linha do tempo clínica.</p>
        </div>
        {canWrite && (
          <Button onClick={() => abrirNovoRegistro()} className="min-h-11">
            <Plus className="h-4 w-4" /> Novo registro
          </Button>
        )}
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-4 xl:grid-cols-[minmax(280px,0.58fr)_minmax(680px,1.42fr)]">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Tratamentos em curso</p>
            <div className="mt-2 divide-y divide-border">
              {resumosTratamento.slice(0, 3).map(({ ficha, realizados, total, progresso, procedimentos }) => (
                <button
                  key={ficha.id}
                  type="button"
                  onClick={() => setFichaNoEditor(ficha.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 py-2.5 text-left transition-colors hover:text-teal-ink"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-text-primary">{ficha.nome}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
                      {procedimentos.length > 0 ? procedimentos.slice(0, 3).join(' · ') : 'Sem procedimentos estruturados'}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-text-secondary">{realizados} de {total}</span>
                  <span className="col-span-2 h-1 overflow-hidden rounded-full bg-border" aria-label={`${progresso}% realizado`}>
                    <span className="block h-full rounded-full bg-teal transition-[width]" style={{ width: `${progresso}%` }} />
                  </span>
                </button>
              ))}
              {resumosTratamento.length === 0 && (
                <p className="py-3 text-xs text-text-secondary">Nenhum tratamento em curso.</p>
              )}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {([
                ['atendimentos', `${atendimentos.length} atendimento${atendimentos.length === 1 ? '' : 's'}`],
                ['tratamentos', `${tratamentosEmCurso.length} tratamento${tratamentosEmCurso.length === 1 ? '' : 's'} em curso`],
                ['pendencias', `${pendencias} pendência${pendencias === 1 ? '' : 's'}`],
              ] as const).map(([tipo, rotulo]) => {
                const aberto = resumoAberto === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    aria-expanded={aberto}
                    onClick={() => {
                      setResumoAberto(aberto ? null : tipo);
                      if (tipo === 'pendencias') setFiltroClinico('indicado');
                      if (tipo === 'atendimentos') setFiltroClinico('tudo');
                    }}
                    className={tipo === 'pendencias'
                      ? `inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors ${aberto ? 'border-coral/50 bg-coral/15 text-coral-ink' : 'border-transparent bg-coral/10 text-coral-ink hover:border-coral/30'}`
                      : `inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors ${aberto ? 'border-teal/40 bg-teal/10 text-teal-ink' : 'border-border bg-surface-alt text-text-primary hover:border-teal/30'}`}
                  >
                    {rotulo} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                  </button>
                );
              })}
            </div>

            {resumoAberto && (
              <div className="mt-4 border-t border-border pt-3" aria-live="polite">
                {resumoAberto === 'atendimentos' && (
                  <div className="grid gap-1">
                    {atendimentos.slice(0, 5).map((atendimento) => (
                      <button key={atendimento.id} type="button" onClick={() => setAtendimentoAbertoId(atendimento.id)} className="flex min-h-9 items-center justify-between gap-3 rounded-lg px-2 text-left text-xs font-semibold text-text-primary hover:bg-surface-alt">
                        <span>{formatarData(atendimento.dataAtendimento)}</span><span className="text-text-secondary">Abrir registro →</span>
                      </button>
                    ))}
                    {atendimentos.length === 0 && <p className="text-xs text-text-secondary">Nenhum atendimento registrado.</p>}
                  </div>
                )}
                {resumoAberto === 'tratamentos' && (
                  <div className="grid gap-1">
                    {tratamentosEmCurso.map((ficha) => (
                      <button key={ficha.id} type="button" onClick={() => setFichaNoEditor(ficha.id)} className="flex min-h-9 items-center justify-between gap-3 rounded-lg px-2 text-left text-xs font-semibold text-text-primary hover:bg-surface-alt">
                        <span>{ficha.nome}</span><span className="text-text-secondary">Abrir tratamento →</span>
                      </button>
                    ))}
                    {tratamentosEmCurso.length === 0 && <p className="text-xs text-text-secondary">Nenhum tratamento em curso.</p>}
                  </div>
                )}
                {resumoAberto === 'pendencias' && (
                  <div className="grid gap-1">
                    {eventosPendentes.slice(0, 6).map((evento) => {
                      const atendimento = atendimentos.find((item) => item.eventos.some((e) => e.id === evento.id));
                      return (
                        <button
                          key={evento.id}
                          type="button"
                          onClick={() => { if (atendimento) setAtendimentoAbertoId(atendimento.id); }}
                          disabled={!atendimento}
                          className="flex min-h-9 items-center justify-between gap-3 rounded-lg px-2 text-left text-xs font-semibold text-text-primary hover:bg-surface-alt disabled:cursor-default disabled:opacity-60"
                        >
                          <span>{evento.procedimentoNome?.trim() || TIPO_LABEL[evento.tipo]}{evento.ancora.dente ? ` · ${evento.ancora.dente}` : ''}</span>
                          <span className="text-text-secondary">{atendimento ? 'Abrir pendência →' : 'Pendente'}</span>
                        </button>
                      );
                    })}
                    {eventosPendentes.length === 0 && <p className="text-xs text-text-secondary">Nenhuma pendência clínica.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <section className="overflow-hidden rounded-xl border border-border bg-surface-alt/50 px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Boca</p>
            <Button variant="ghost" size="sm" onClick={() => setOdontogramaCompletoAberto(true)}>Expandir</Button>
          </div>
          <div className="min-h-[330px] overflow-hidden">
            <div className={ODONTOGRAMA_RESPONSIVO}>
              <Odontograma
                selectedTeeth={resumoDenteSelecionado == null ? [] : [resumoDenteSelecionado]}
                eventos={dados.boca}
                onToothToggle={(dente) => setResumoDenteSelecionado((atual) => atual === dente ? null : dente)}
                presentationMode
              />
            </div>
            {resumoDenteSelecionado != null && (
              <div className="mt-2 border-t border-border pt-2" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-text-primary">Dente {resumoDenteSelecionado}</p>
                  <button type="button" onClick={() => setResumoDenteSelecionado(null)} className="text-[11px] font-bold text-text-secondary hover:text-text-primary">
                    Fechar
                  </button>
                </div>
                {destinosDoDente.length > 0 ? (
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    {destinosDoDente.map(({ ficha, procedimentos, pendentes }, index) => (
                      <button
                        key={ficha?.id ?? `sem-ficha-${index}`}
                        type="button"
                        disabled={!ficha}
                        onClick={() => { if (ficha) setFichaNoEditor(ficha.id); }}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-1.5 text-left transition-colors hover:border-teal/40 hover:bg-teal/5 disabled:cursor-default disabled:opacity-70"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-bold text-text-primary">{procedimentos.join(' · ')}</span>
                          <span className="block truncate text-[10px] text-text-secondary">
                            {ficha?.nome ?? 'Registro sem tratamento vinculado'}{pendentes > 0 ? ` · ${pendentes} pendente${pendentes === 1 ? '' : 's'}` : ''}
                          </span>
                        </span>
                        {ficha && <span className="shrink-0 text-[10px] font-bold text-teal-ink">Abrir →</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-text-secondary">Nenhum procedimento registrado neste dente.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {([
          ['tudo', 'Tudo'],
          ['indicado', 'Indicados'],
          ['realizado', 'Realizados'],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltroClinico(valor)}
            className={filtroClinico === valor
              ? 'rounded-lg bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal-ink'
              : 'rounded-lg px-3 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary'}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {dados.errosParciais.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/5 px-3 py-2.5">
          <p className="flex items-center gap-2 text-xs text-text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0 text-coral-ink" aria-hidden />
            Não foi possível carregar: {dados.errosParciais.join(', ')}. O restante do prontuário continua disponível.
          </p>
          <Button variant="ghost" size="sm" onClick={() => router.refresh()}>Atualizar</Button>
        </div>
      )}

      {atendimentos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <FileText className="mx-auto h-9 w-9 text-text-secondary/40" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-text-primary">Nenhum atendimento registrado ainda.</p>
          <p className="mt-1 text-xs text-text-secondary">O primeiro registro pode ser feito aqui, manualmente ou com o Dex.</p>
        </div>
      ) : atendimentosVisiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Nenhum atendimento corresponde a este filtro.</p>
          <button type="button" onClick={() => setFiltroClinico('tudo')} className="mt-2 text-xs font-bold text-teal-ink hover:underline">
            Mostrar todos os atendimentos
          </button>
        </div>
      ) : (
        <ol className="space-y-3">
          {atendimentosVisiveis.map((atendimento) => {
            const texto = textoDaVisita(atendimento);
            const temAssinatura = atendimento.fichas.some((ficha) => ficha.assinadoEm != null);
            return (
              <li key={atendimento.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{formatarData(atendimento.dataAtendimento)}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{rotuloOrigem(atendimento)} · {atendimento.profissional.nome}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-[11px] font-bold text-text-secondary">
                      {atendimento.eventos.length} procedimento{atendimento.eventos.length === 1 ? '' : 's'}
                    </span>
                    {temAssinatura && <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-bold text-teal-ink">Assinado</span>}
                  </div>
                </div>

                {texto ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-primary">{texto}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-text-secondary">Sem evolução textual registrada.</p>
                )}

                {atendimento.eventos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atendimento.eventos.slice(0, 8).map((evento) => (
                      <span key={evento.id} className="rounded-lg border border-border bg-surface-alt px-2.5 py-1 text-xs text-text-secondary">
                        {evento.procedimentoNome ?? evento.tipo}{evento.ancora.dente ? ` · ${evento.ancora.dente}` : ''}
                      </span>
                    ))}
                    {atendimento.eventos.length > 8 && <span className="px-2 py-1 text-xs text-text-secondary">+{atendimento.eventos.length - 8}</span>}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setAtendimentoAbertoId(atendimento.id)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
                  >
                    Abrir registro <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {atendimento.fichas.map((ficha) => (
                    <button
                      key={ficha.id}
                      type="button"
                      onClick={() => setFichaNoEditor(ficha.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
                    >
                      <FolderOpen className="h-3.5 w-3.5" /> {ficha.nome}
                    </button>
                  ))}
                  {onGerarOrcamento && atendimento.fichas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onGerarOrcamento(atendimento.fichas[0]!.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
                    >
                      Gerar orçamento
                    </button>
                  )}
                  {atendimento.retorno ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/agendamentos?v=dia&d=${atendimento.retorno!.dataHora.slice(0, 10)}`)}
                      className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
                    >
                      Ver retorno
                    </button>
                  ) : canWrite && (
                    <button
                      type="button"
                      onClick={() => {
                        setRetornoAtendimentoId(atendimento.atendimentoId);
                        setRetornoAberto(true);
                      }}
                      className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Marcar retorno
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <MarcarRetornoModal
        open={retornoAberto}
        onOpenChange={(open) => {
          setRetornoAberto(open);
          if (!open) setRetornoAtendimentoId(null);
        }}
        pacienteNome={patientName}
        role="dentista"
        dentistasClinica={[]}
        dentistaAlvoId={dentistaId}
        onDentistaAlvoChange={() => undefined}
        form={retorno.form}
        setForm={retorno.setForm}
        error={retorno.error}
        saving={retorno.saving}
        pedidoPendente={retorno.pedidoPendente}
        onMarcarRetorno={() => void retorno.marcarRetorno(dentistaId)}
        onTentarEnviarPedido={() => void retorno.tentarEnviarPedido(dentistaId)}
      />

      <Dialog open={odontogramaCompletoAberto} onOpenChange={setOdontogramaCompletoAberto}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[1180px] overflow-hidden p-3 sm:w-[calc(100vw-2rem)] sm:max-w-[1180px] sm:p-6">
          <DialogHeader>
            <DialogTitle>Odontograma completo</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden">
            <div className={ODONTOGRAMA_RESPONSIVO}>
              <Odontograma selectedTeeth={[]} eventos={dados.boca} onToothToggle={() => undefined} presentationMode />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

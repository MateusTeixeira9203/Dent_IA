'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  CreditCard,
  Plus,
  Edit2,
  FileDown,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  FilePlus,
  Loader2,
  Activity,
  Bell,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';

const TabSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-16 rounded-xl bg-surface-alt" />
    ))}
  </div>
);

const DocumentosTab   = dynamic(() => import('@/components/pacientes/DocumentosTab').then(m => m.DocumentosTab),     { ssr: false, loading: () => <TabSkeleton /> });
const FichasTab       = dynamic(() => import('@/components/pacientes/FichasTab').then(m => m.FichasTab),             { ssr: false, loading: () => <TabSkeleton /> });
import { createClient } from '@/lib/supabase/client';
import { saveRecentPatient } from '@/components/command-palette/command-palette';
import { marcarFollowUp, limparFollowUp, snoozeFollowUp } from '../../followup-actions';
import { atualizarPaciente } from '../actions';
import type { DentistaRole } from '@/types/database';
import type { PlanoId } from '@/lib/planos';
import {
  atualizarStatusOrcamento,
  registrarPagamento,
  editarPagamento,
  marcarPagamentoPago,
  excluirPagamento,
  criarOrcamento,
  editarOrcamento,
  excluirOrcamento,
  criarProcedimentoRapido,
  gerarParcelas,
  definirPlanoAvista,
  atualizarMostrarValorPorItem,
  type FormaPagamento,
  type StatusOrcamento,
} from '@/app/dashboard/orcamentos/actions';
import { criarAgendamento } from '@/app/dashboard/agendamentos/actions';
import { buildClinicDatetime } from '@/app/dashboard/agendamentos/_components/date-helpers';
import type { Paciente } from '@/types/database';
import type { TimelineEvent } from '@/server/patients/get-visible-timeline-events';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatarDataFicha } from '@/lib/format-data-ficha';
import { toast } from 'sonner';
import { STATUS_ORCAMENTO } from '@/lib/constants/orcamento-status';
import { parseValorBR, formatValorBR } from '@/lib/valor-br';
import {
  stripDenteDoNome, denteLabel,
  ARCH_SUPERIOR, ARCH_INFERIOR, ARCH_COMPLETA,
  QUAD_SUP_DIREITO, QUAD_SUP_ESQUERDO, QUAD_INF_DIREITO, QUAD_INF_ESQUERDO,
} from '@/lib/arcadas';
import { TIPO_LABEL } from '@/types/odontograma';
import type { OrcamentoComItens, OrcamentoItem, Pagamento, FichaParaOrc, EventoOdontogramaParaOrc, ProcedimentoClinica, NovoOrcItem, OrcEditItem } from './types';
import { derivarResponsaveis, eventosVisiveis, FILTRO_MEUS, type FiltroResponsavel } from '@/lib/fichas/filtro-responsavel';
import { EditarPacienteModal } from './modals/editar-paciente-modal';
import { DetalheOrcamentoModal } from './modals/detalhe-orcamento-modal';
import { ConfirmarDeleteOrcModal } from './modals/confirmar-delete-orc-modal';
import { ExcluirPacienteModal } from './modals/excluir-paciente-modal';
import { excluirPaciente } from '@/server/patients/excluir-paciente';
import { MarcarRetornoModal, type MarcarRetornoForm } from '@/components/pacientes/marcar-retorno-modal';
import { formatHora as formatHoraRetorno } from '@/lib/agenda/disponibilidade';
import { EmitirDocumentoModal } from '@/components/pacientes/EmitirDocumentoModal';
import { NovoOrcamentoModal } from './modals/novo-orcamento-modal';
import { ApresentarPaciente } from '@/components/pacientes/ApresentarPaciente';

import type { FichaRecente } from '@/server/patients/get-patient-workspace-data';

type FichaParaPendencia = {
  id: string;
  dentes_afetados: number[];
  dentes_observacoes: Record<string, string>;
  procedimentos_concluidos: string[];
};

type PendenciaItem = {
  fichaId: string;
  tooth: number;
  descricao: string;
  key: string;
  globalKey: string;
};

const ARCH_LABEL_SHORT: Record<number, string> = { 97: 'Sup.', 98: 'Inf.', 99: 'Boca' };

type AgendamentoTabItem = {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  duracao_minutos: number;
  dentista: { nome: string } | null;
};

const STATUS_AGENDA_MAP: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Agendado',       cls: 'bg-surface-alt text-text-secondary' },
  confirmed:   { label: 'Confirmado',     cls: 'bg-teal/10 text-teal' },
  completed:   { label: 'Realizado',      cls: 'bg-teal/10 text-teal' },
  cancelled:   { label: 'Cancelado',      cls: 'bg-coral/10 text-coral' },
  no_show:     { label: 'Não compareceu', cls: 'bg-coral/10 text-coral' },
  in_progress: { label: 'Em andamento',   cls: 'bg-teal/10 text-teal' },
  rescheduled: { label: 'Reagendado',     cls: 'bg-surface-alt text-text-secondary' },
};

type AgendamentoProximo = {
  id: string;
  data_hora: string;
  duracao_minutos: number;
  status: string;
  observacoes: string | null;
  dentista: { nome: string } | null;
};

interface PacienteDetailClientProps {
  paciente: Paciente;
  agendamentoProximo: AgendamentoProximo | null;
  orcamentos: OrcamentoComItens[];
  clinicaId: string;
  dentistaId: string;
  role: DentistaRole;
  plano: PlanoId;
  fichasRecentesSSR?: FichaRecente[];
  timeline?: TimelineEvent[];
}

export function PacienteDetailClient({
  paciente,
  agendamentoProximo,
  orcamentos,
  clinicaId,
  dentistaId,
  role,
  plano,
  fichasRecentesSSR,
  timeline = [],
}: PacienteDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canViewClinical  = true;
  const canWriteClinical = role === 'admin' || role === 'dentista';

  const [activeTab, setActiveTab] = useState('ficha-clinica');
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(['ficha-clinica']));

  // Lê ?tab= da URL para navegar direto à aba correta (ex: vindo do AttentionPanel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
      setMountedTabs(prev => new Set([...prev, tab]));
    }
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setMountedTabs(prev => prev.has(tab) ? prev : new Set([...prev, tab]));
  }, []);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editNome, setEditNome] = useState(paciente.nome);
  const [editTelefone, setEditTelefone] = useState(paciente.telefone ?? '');
  const [editEmail, setEditEmail] = useState(paciente.email ?? '');
  const [editEndereco, setEditEndereco] = useState(paciente.endereco ?? '');
  const [editDentistaId, setEditDentistaId] = useState(paciente.dentista_id ?? '');
  // R-41 — fecha a lacuna que o cadastro rápido (nome+telefone só) deixa aberta.
  const [editCpf, setEditCpf] = useState(paciente.cpf ?? '');
  const [editDataNascimento, setEditDataNascimento] = useState(paciente.data_nascimento ?? '');
  const [editResponsavelNome, setEditResponsavelNome] = useState(paciente.responsavel_nome ?? '');
  const [editResponsavelTelefone, setEditResponsavelTelefone] = useState(paciente.responsavel_telefone ?? '');
  const [editResponsavelParentesco, setEditResponsavelParentesco] = useState(paciente.responsavel_parentesco ?? '');
  const [editError, setEditError] = useState<string | null>(null);

  // Encaminhamento (hierarquia §3) — só a secretária reatribui o dentista responsável.
  const [dentistasClinica, setDentistasClinica] = useState<{ id: string; nome: string }[]>([]);
  // Dentista responsável pelo orçamento que a secretária está criando (spec 2026-07-15).
  const [novoOrcDentistaAlvoId, setNovoOrcDentistaAlvoId] = useState('');
  useEffect(() => {
    if (role !== 'secretaria') return;
    const supabase = createClient();
    void supabase
      .from('dentistas')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .neq('role', 'secretaria')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        setDentistasClinica(data ?? []);
        setNovoOrcDentistaAlvoId((prev) => prev || (data?.[0]?.id ?? ''));
      });
  }, [role, clinicaId]);

  // Dados exibíveis do paciente — atualizados localmente após edição (sem router.refresh)
  const [displayNome, setDisplayNome] = useState(paciente.nome);
  const [displayTelefone, setDisplayTelefone] = useState<string | null>(paciente.telefone ?? null);
  const [displayEmail, setDisplayEmail] = useState<string | null>(paciente.email ?? null);
  const [displayEndereco, setDisplayEndereco] = useState<string | null>(paciente.endereco ?? null);

  // Orçamentos — cópia local para atualizações otimistas
  const [orcamentosState, setOrcamentosState] = useState<OrcamentoComItens[]>(orcamentos);
  useEffect(() => { setOrcamentosState(orcamentos); }, [orcamentos]);

  // Persiste paciente como recente para a Command Palette
  useEffect(() => {
    saveRecentPatient({ id: paciente.id, nome: paciente.nome });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id]);

  // Aba Agenda — lazy fetch ao abrir pela primeira vez
  const [agendamentosTabData, setAgendamentosTabData] = useState<AgendamentoTabItem[] | null>(null);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);

  const [detalheOrcId, setDetalheOrcId] = useState<string | null>(null);
  const [isNovoOrcOpen, setIsNovoOrcOpen] = useState(false);
  const [procedimentosClinica, setProcedimentosClinica] = useState<ProcedimentoClinica[]>([]);
  const [novoOrcItens, setNovoOrcItens] = useState<NovoOrcItem[]>([
    { procedimentoId: '', descricao: '', quantidade: 1, preco: '' },
  ]);
  const [registeringProcIdx, setRegisteringProcIdx] = useState<number | null>(null);
  const [pagForm, setPagForm] = useState({
    valor: '',
    formaPagamento: 'pix' as FormaPagamento,
    data: new Date().toISOString().split('T')[0],
    dataVencimento: '',
  });
  const [parcelasMode, setParcelasMode] = useState(false);
  const [parcelasForm, setParcelasForm] = useState({ numero: '3', primeiroVencimento: '' });
  const [parcelasSaving, setParcelasSaving] = useState(false);
  const [parcelasError, setParcelasError] = useState<string | null>(null);
  const [orcSaving, setOrcSaving] = useState(false);
  const [pagSaving, setPagSaving] = useState(false);
  const [orcError, setOrcError] = useState<string | null>(null);
  const [pagError, setPagError] = useState<string | null>(null);

  // R-28 — fechar uma parcela pendente específica via a aba Registrar pagamento
  // (em vez de abrir um pagamento novo e duplicar o recebimento).
  const [closingPagamentoId, setClosingPagamentoId] = useState<string | null>(null);

  // Edição / exclusão de pagamento já registrado
  const [editingPagId, setEditingPagId] = useState<string | null>(null);
  const [editPagForm, setEditPagForm] = useState({
    valor: '',
    formaPagamento: 'pix' as FormaPagamento,
    data: new Date().toISOString().split('T')[0],
  });
  const [editPagSaving, setEditPagSaving] = useState(false);
  const [editPagError, setEditPagError] = useState<string | null>(null);
  const [confirmDeletePagId, setConfirmDeletePagId] = useState<string | null>(null);
  const [pagDeleteSaving, setPagDeleteSaving] = useState(false);
  const [isLoadingFichaParaOrc, setIsLoadingFichaParaOrc] = useState(false);
  const [fichasParaOrc, setFichasParaOrc] = useState<FichaParaOrc[]>([]);
  const [fichaOrcId, setFichaOrcId] = useState<string | null>(null);
  // R-53 — filtro de exibição do orçamento agregado (X1: mesma lib da ficha, config própria —
  // default Todos, porque o dinheiro é da clínica, não do dentista). Nunca decide o que é
  // gravado (I4) — só quais itens de `fichasParaOrc` viram `novoOrcItens`.
  const [filtroResponsavelOrc, setFiltroResponsavelOrc] = useState<FiltroResponsavel>(null);
  const [etapaNovoOrc, setEtapaNovoOrc] = useState<'selecionar' | 'itens'>('itens');
  const [novoOrcValorFinal, setNovoOrcValorFinal] = useState<number | null>(null);
  // R-34 — forma de pagamento já na criação (feedback do Mateus testando localhost: parcelar
  // só existia depois de reabrir o orçamento criado; reduz a fricção de ter os dois passos).
  const [novoOrcPlanoForma, setNovoOrcPlanoForma] = useState<'avista' | 'parcelado' | null>(null);
  const [novoOrcNumParcelas, setNovoOrcNumParcelas] = useState('3');
  const [novoOrcPrimeiroVencimento, setNovoOrcPrimeiroVencimento] = useState('');
  const [novoOrcParcelasForma, setNovoOrcParcelasForma] = useState<FormaPagamento | ''>('');

  // Edição de orçamento
  const [orcEditMode, setOrcEditMode] = useState(false);
  const [orcEditItens, setOrcEditItens] = useState<OrcEditItem[]>([]);
  const [orcEditSaving, setOrcEditSaving] = useState(false);
  const [orcEditError, setOrcEditError] = useState<string | null>(null);

  // Exclusão de orçamento
  const [confirmDeleteOrcId, setConfirmDeleteOrcId] = useState<string | null>(null);
  const [orcDeleteSaving, setOrcDeleteSaving] = useState(false);
  const [orcDeleteError, setOrcDeleteError] = useState<string | null>(null);

  // Excluir paciente (decisão dele 07/08) — permanente, cascateia sobre tudo do paciente.
  const [excluirPacienteAberto, setExcluirPacienteAberto] = useState(false);
  const [excluindoPaciente, setExcluindoPaciente] = useState(false);
  const [excluirPacienteError, setExcluirPacienteError] = useState<string | null>(null);

  // Contato dropdown (⋯)

  // Marcar retorno
  const [isMarcarRetornoOpen, setIsMarcarRetornoOpen] = useState(false);
  const [isEmitirOpen, setIsEmitirOpen] = useState(false);
  const [retornoForm, setRetornoForm] = useState<MarcarRetornoForm>({
    data: null,
    minutoDoDia: null,
    duracao: '30',
    observacoes: '',
  });
  const [retornoSaving, setRetornoSaving] = useState(false);
  const [retornoError, setRetornoError] = useState<string | null>(null);

  // Atividades recentes (visão geral) — inicializado do SSR, sem roundtrip extra ao montar
  const [fichasRecentes, setFichasRecentes] = useState<FichaRecente[]>(fichasRecentesSSR ?? []);
  // Sincroniza quando servidor re-renderizar (ex: após router.refresh())
  useEffect(() => {
    if (fichasRecentesSSR !== undefined) setFichasRecentes(fichasRecentesSSR);
  }, [fichasRecentesSSR]);

  // Follow-up
  const [followupPendente, setFollowupPendente] = useState<boolean>(paciente.followup_pendente ?? false);
  const [followupNota, setFollowupNota] = useState<string>(paciente.followup_nota ?? '');
  const [showFollowupInput, setShowFollowupInput] = useState(false);
  const [followupSaving, setFollowupSaving] = useState(false);

  // Pendências — widget persistente acima das abas
  const [pendencias, setPendencias] = useState<PendenciaItem[]>([]);
  const [pendenciasConcluidas, setPendenciasConcluidas] = useState<Set<string>>(new Set());
  const [togglingPendencia, setTogglingPendencia] = useState<string | null>(null);

  // Tab highlight + switch — acionados pelo tour DEX via CustomEvent
  const [highlightedTab, setHighlightedTab] = useState<string | null>(null);

  useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setHighlightedTab(detail);
      if (detail) {
        clearTimer = setTimeout(() => setHighlightedTab(null), 3000);
      }
    };
    window.addEventListener('dex:highlight-tab', handler);
    return () => {
      window.removeEventListener('dex:highlight-tab', handler);
      clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const tabValue = (e as CustomEvent<string>).detail;
      if (tabValue) handleTabChange(tabValue);
    };
    window.addEventListener('dex:switch-tab', handler);
    return () => window.removeEventListener('dex:switch-tab', handler);
  }, [handleTabChange]);

  useEffect(() => {
    if (activeTab !== 'agenda' || agendamentosTabData !== null) return;
    setLoadingAgendamentos(true);
    const supabase = createClient();
    void supabase
      .from('agendamentos')
      // dentista:dentistas!dentista_id — agendamentos tem 2 FKs pra dentistas (dentista_id e
      // created_by); sem desambiguar, o embed dá erro (PGRST201) e a aba fica sempre vazia.
      .select('id, data_hora, status, observacoes, duracao_minutos, dentista:dentistas!dentista_id(nome)')
      .eq('paciente_id', paciente.id)
      .eq('clinica_id', clinicaId)
      .order('data_hora', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error('[paciente] fetch agenda:', error.message);
        setAgendamentosTabData((data as unknown as AgendamentoTabItem[]) ?? []);
        setLoadingAgendamentos(false);
      });
  }, [activeTab, agendamentosTabData, paciente.id, clinicaId]);

  const iniciais = displayNome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const endereco = [
    displayEndereco,
    paciente.cidade && paciente.estado
      ? `${paciente.cidade}, ${paciente.estado}`
      : (paciente.cidade ?? paciente.estado),
  ]
    .filter(Boolean)
    .join(' — ');

  const dataNascimento = paciente.data_nascimento
    ? format(parseISO(paciente.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })
    : null;

  const membroDesde = format(parseISO(paciente.created_at), "MMM 'de' yyyy", { locale: ptBR });

  const idade = paciente.data_nascimento
    ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // Orçamento selecionado no detalhe
  const detalheOrc = orcamentosState.find((o) => o.id === detalheOrcId) ?? null;
  const novoOrcSubtotal = useMemo(
    () => novoOrcItens.reduce((s, i) => s + i.quantidade * parseValorBR(i.preco), 0),
    [novoOrcItens]
  );
  const novoOrcTotal = useMemo(
    () => novoOrcValorFinal !== null ? Math.max(0, novoOrcValorFinal) : novoOrcSubtotal,
    [novoOrcSubtotal, novoOrcValorFinal]
  );

  const resumoFinanceiro = useMemo(() => {
    const allPagamentos = orcamentosState.flatMap(o => o.pagamentos);
    return {
      totalAprovado: orcamentosState
        .filter(o => o.status === 'aprovado')
        .reduce((s, o) => s + (o.total ?? 0), 0),
      totalPago: allPagamentos
        .filter(p => p.status === 'pago')
        .reduce((s, p) => s + p.valor, 0),
      totalPendente: allPagamentos
        .filter(p => p.status === 'pendente')
        .reduce((s, p) => s + p.valor, 0),
      temHistorico: allPagamentos.length > 0,
    };
  }, [orcamentosState]);

  const orcamentosAprovados = useMemo(
    () => orcamentosState.filter(o => o.status === 'aprovado'),
    [orcamentosState]
  );
  const orcamentosAbertos = useMemo(
    () => orcamentosState.filter(o => ['rascunho', 'enviado'].includes(o.status)),
    [orcamentosState]
  );
  const orcamentosAguardando = useMemo(
    () => orcamentosState.filter(o => o.status === 'enviado'),
    [orcamentosState]
  );
  const pendenciasAtivas = useMemo(
    () => pendencias.filter(p => !pendenciasConcluidas.has(p.globalKey)),
    [pendencias, pendenciasConcluidas]
  );

  // Procedimentos clínicos dos orçamentos aprovados — headline da Col 2
  const procedimentosPrincipais = useMemo(() => {
    const itens = orcamentosAprovados.flatMap(o => o.itens ?? []);
    return itens.sort((a, b) => (b.preco_total ?? 0) - (a.preco_total ?? 0));
  }, [orcamentosAprovados]);

  const handleMarcarFollowUp = async () => {
    setFollowupSaving(true);
    const res = await marcarFollowUp(paciente.id, followupNota || undefined);
    if (res.ok) {
      setFollowupPendente(true);
      setShowFollowupInput(false);
      toast.success('Follow-up marcado');
    } else {
      toast.error(res.erro ?? 'Erro ao marcar');
    }
    setFollowupSaving(false);
  };

  const handleLimparFollowUp = async () => {
    const notaAnterior = followupNota;
    setFollowupSaving(true);
    const res = await limparFollowUp(paciente.id);
    if (res.ok) {
      setFollowupPendente(false);
      setFollowupNota('');
      toast.success('Follow-up concluído', {
        action: {
          label: 'Desfazer',
          onClick: async () => {
            const restore = await marcarFollowUp(paciente.id, notaAnterior || undefined);
            if (restore.ok) {
              setFollowupPendente(true);
              setFollowupNota(notaAnterior);
              toast.success('Follow-up restaurado');
            }
          },
        },
        duration: 6000,
      });
    } else {
      toast.error(res.erro ?? 'Não foi possível concluir o follow-up. Tente novamente.');
    }
    setFollowupSaving(false);
  };

  const handleSnooze = async (days: number) => {
    setFollowupSaving(true);
    const res = await snoozeFollowUp(paciente.id, days);
    if (res.ok) {
      const label = days === 1 ? 'amanhã' : `${days} dias`;
      toast.success(`Follow-up adiado para ${label}`);
    } else {
      toast.error(res.erro ?? 'Erro ao adiar');
    }
    setFollowupSaving(false);
  };

  const handleSaveEdit = () => {
    setEditError(null);
    startTransition(async () => {
      const result = await atualizarPaciente(paciente.id, {
        nome: editNome,
        telefone: editTelefone || null,
        email: editEmail || null,
        endereco: editEndereco || null,
        // R-41 — fecha a lacuna que o cadastro rápido deixa aberta.
        cpf: editCpf || null,
        data_nascimento: editDataNascimento || null,
        responsavel_nome: editResponsavelNome || null,
        responsavel_telefone: editResponsavelTelefone || null,
        responsavel_parentesco: editResponsavelParentesco || null,
        ...(role === 'secretaria' ? { dentista_id: editDentistaId || null } : {}),
      });
      if (result.error) {
        setEditError(result.error);
      } else {
        setDisplayNome(editNome);
        setDisplayTelefone(editTelefone || null);
        setDisplayEmail(editEmail || null);
        setDisplayEndereco(editEndereco || null);
        setIsEditModalOpen(false);
        // CPF/nascimento/responsável não têm display state próprio — busca do servidor
        // de novo pra idade/CPF no card do perfil refletirem o que acabou de ser salvo.
        router.refresh();
      }
    });
  };

  // Catálogo de procedimentos é privado por dentista. Pra secretária, o dono relevante
  // é o dentista-alvo selecionado no modal de orçamento, não o perfil dela (ela nunca
  // é dona de procedimentos) — reconsulta quando a seleção muda.
  const procedimentosDonoId = role === 'secretaria' ? novoOrcDentistaAlvoId : dentistaId;
  useEffect(() => {
    if (!procedimentosDonoId) return;
    const supabase = createClient();
    void supabase
      .from('procedimentos')
      .select('id, nome, preco_padrao')
      .eq('clinica_id', clinicaId)
      .eq('dentista_id', procedimentosDonoId)
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setProcedimentosClinica(data ?? []));
  }, [clinicaId, procedimentosDonoId]);

  // Busca fichas recentes e pendências ao montar.
  useEffect(() => {
    const supabase = createClient();
    if (!canViewClinical) return;

    // fichasRecentes já foram carregadas no servidor — evita roundtrip desnecessário
    if (fichasRecentesSSR === undefined) {
      void supabase
        .from('fichas')
        .select('id, created_at, data_atendimento, queixa_principal, anotacoes, dentista:dentistas(nome)')
        .eq('paciente_id', paciente.id)
        .eq('clinica_id', clinicaId)
        .order('data_atendimento', { ascending: false })
        .limit(5)
        .then(({ data }) => setFichasRecentes((data as unknown as FichaRecente[]) ?? []));
    }

    void supabase
      .from('fichas')
      .select('id, dentes_afetados, dentes_observacoes, procedimentos_concluidos')
      .eq('paciente_id', paciente.id)
      .eq('clinica_id', clinicaId)
      .order('data_atendimento', { ascending: false })
      .then(({ data }) => {
        const fichas = (data as unknown as FichaParaPendencia[]) ?? [];
        const items: PendenciaItem[] = [];
        const concluidos = new Set<string>();
        for (const ficha of fichas) {
          (ficha.procedimentos_concluidos ?? []).forEach((k) =>
            concluidos.add(`${ficha.id}::${k}`)
          );
          for (const tooth of ficha.dentes_afetados ?? []) {
            const raw = ficha.dentes_observacoes?.[String(tooth)] ?? '';
            raw.split('\n').filter(Boolean).forEach((note, i) => {
              items.push({
                fichaId: ficha.id,
                tooth,
                descricao: note,
                key: `${tooth}_${i}`,
                globalKey: `${ficha.id}::${tooth}_${i}`,
              });
            });
          }
        }
        setPendencias(items);
        setPendenciasConcluidas(concluidos);
      });
  }, [clinicaId, paciente.id, dentistaId]);

  const togglePendencia = async (item: PendenciaItem) => {
    if (togglingPendencia === item.globalKey) return;
    setTogglingPendencia(item.globalKey);
    try {
      const supabase = createClient();
      const { data: fichaData } = await supabase
        .from('fichas')
        .select('procedimentos_concluidos')
        .eq('id', item.fichaId)
        .single();
      const current: string[] = (fichaData as { procedimentos_concluidos: string[] } | null)?.procedimentos_concluidos ?? [];
      const isDone = pendenciasConcluidas.has(item.globalKey);
      const next = isDone ? current.filter((k) => k !== item.key) : [...current, item.key];
      await supabase
        .from('fichas')
        .update({ procedimentos_concluidos: next })
        .eq('id', item.fichaId)
        .eq('clinica_id', clinicaId);
      setPendenciasConcluidas((prev) => {
        const s = new Set(prev);
        isDone ? s.delete(item.globalKey) : s.add(item.globalKey);
        return s;
      });
    } finally {
      setTogglingPendencia(null);
    }
  };

  const handleStatusChange = useCallback(async (orcId: string, status: StatusOrcamento) => {
    try {
      const result = await atualizarStatusOrcamento(orcId, status);
      if (!result.error) {
        setOrcamentosState((prev) =>
          prev.map((o) => (o.id === orcId ? { ...o, status } : o))
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('[paciente] handleStatusChange:', err);
      toast.error('Não foi possível atualizar o status. Tente novamente.');
    }
  }, [router]);

  const handleToggleMostrarValorPorItem = useCallback(async (orcId: string, mostrar: boolean) => {
    try {
      const result = await atualizarMostrarValorPorItem(orcId, mostrar);
      if (!result.error) {
        setOrcamentosState((prev) =>
          prev.map((o) => (o.id === orcId ? { ...o, mostrar_valor_por_item: mostrar } : o))
        );
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('[paciente] handleToggleMostrarValorPorItem:', err);
      toast.error('Não foi possível atualizar. Tente novamente.');
    }
  }, []);

  const handleRegistrarPagamento = async () => {
    if (!detalheOrcId) return;
    const valor = parseValorBR(pagForm.valor);
    if (!valor || valor <= 0) {
      setPagError('Informe um valor válido.');
      return;
    }
    setPagError(null);
    setPagSaving(true);

    const hoje = new Date().toISOString().split('T')[0];
    const isAgendado = pagForm.dataVencimento && pagForm.dataVencimento > hoje;

    const result = await registrarPagamento({
      orcamentoId: detalheOrcId,
      pacienteId: paciente.id,
      valor,
      formaPagamento: pagForm.formaPagamento,
      data: pagForm.data,
      dataVencimento: pagForm.dataVencimento || undefined,
      dentistaId: detalheOrc?.dentista_id ?? undefined,
    });

    if (result.error) {
      setPagError(result.error);
    } else {
      const novoPag: Pagamento = {
        id:              result.id ?? crypto.randomUUID(),
        valor,
        status:          isAgendado ? 'pendente' : 'pago',
        forma_pagamento: isAgendado ? null : pagForm.formaPagamento,
        data_pagamento:  isAgendado ? null : pagForm.data,
        data_vencimento: pagForm.dataVencimento || null,
        parcela_numero:  null,
        total_parcelas:  null,
        marcado_por:     null,
      };
      setOrcamentosState((prev) =>
        prev.map((o) =>
          o.id === detalheOrcId
            ? { ...o, pagamentos: [...o.pagamentos, novoPag] }
            : o
        )
      );
      setPagForm({
        valor: '',
        formaPagamento: 'pix',
        data: new Date().toISOString().split('T')[0],
        dataVencimento: '',
      });
    }
    setPagSaving(false);
  };

  const handleIniciarFechamentoPagamento = (pg: Pagamento) => {
    setClosingPagamentoId(pg.id);
    setParcelasMode(false);
    setPagForm({
      valor: formatValorBR(pg.valor),
      formaPagamento: 'pix',
      data: new Date().toISOString().split('T')[0],
      dataVencimento: '',
    });
    setPagError(null);
  };

  const handleCancelarFechamentoPagamento = () => {
    setClosingPagamentoId(null);
    setPagForm({
      valor: '',
      formaPagamento: 'pix',
      data: new Date().toISOString().split('T')[0],
      dataVencimento: '',
    });
    setPagError(null);
  };

  const handleFecharPagamento = async () => {
    if (!closingPagamentoId) return;
    setPagError(null);
    setPagSaving(true);

    const result = await marcarPagamentoPago(closingPagamentoId, {
      formaPagamento: pagForm.formaPagamento,
      data: pagForm.data,
    });

    if (result.error) {
      setPagError(result.error);
    } else {
      const fechadoId = closingPagamentoId;
      setOrcamentosState((prev) =>
        prev.map((o) =>
          o.id === detalheOrcId
            ? {
                ...o,
                pagamentos: o.pagamentos.map((p) =>
                  p.id === fechadoId
                    ? { ...p, status: 'pago', forma_pagamento: pagForm.formaPagamento, data_pagamento: pagForm.data }
                    : p
                ),
              }
            : o
        )
      );
      handleCancelarFechamentoPagamento();
      toast.success('Parcela marcada como paga.');
      // marcado_por e autoAprovado do orçamento são derivados no servidor —
      // busca de novo em vez de aproximar no client, mesma disciplina do handleStatusChange.
      router.refresh();
    }
    setPagSaving(false);
  };

  const handleGerarParcelas = async () => {
    if (!detalheOrcId) return;
    const numero = parseInt(parcelasForm.numero, 10);
    // Aviso local só de UX — quem soma "já pago" de verdade agora é a RPC (server).
    const pago = (detalheOrc?.pagamentos ?? []).filter((p) => p.status === 'pago').reduce((s, p) => s + p.valor, 0);
    const saldoAproximado = Math.max(0, (detalheOrc?.total ?? 0) - pago);
    if (!numero || numero < 2 || numero > 24) {
      setParcelasError('Informe entre 2 e 24 parcelas.');
      return;
    }
    if (!parcelasForm.primeiroVencimento) {
      setParcelasError('Informe o primeiro vencimento.');
      return;
    }
    if (!saldoAproximado || saldoAproximado <= 0) {
      setParcelasError('Não há saldo restante para parcelar.');
      return;
    }
    setParcelasError(null);
    setParcelasSaving(true);

    const result = await gerarParcelas({
      orcamentoId: detalheOrcId,
      numeroParcelas: numero,
      primeiroVencimento: parcelasForm.primeiroVencimento,
    });

    if (result.error || !result.parcelas) {
      setParcelasError(result.error ?? 'Não foi possível gerar as parcelas.');
    } else {
      const novasPag: Pagamento[] = result.parcelas.map((p) => ({
        id:              p.id,
        valor:           p.valor,
        status:          'pendente',
        forma_pagamento: null,
        data_pagamento:  null,
        data_vencimento: p.data_vencimento,
        parcela_numero:  p.parcela_numero,
        total_parcelas:  p.total_parcelas,
        marcado_por:     null,
      }));
      setOrcamentosState((prev) =>
        prev.map((o) =>
          o.id === detalheOrcId
            ? { ...o, pagamentos: [...o.pagamentos, ...novasPag] }
            : o
        )
      );
      setParcelasMode(false);
      setParcelasForm({ numero: '3', primeiroVencimento: '' });
      toast.success(`${numero} parcelas geradas.`);
    }
    setParcelasSaving(false);
  };

  const handleIniciarEdicaoPagamento = (pg: Pagamento) => {
    setConfirmDeletePagId(null);
    setEditingPagId(pg.id);
    setEditPagForm({
      valor: formatValorBR(pg.valor),
      formaPagamento: (pg.forma_pagamento as FormaPagamento) ?? 'pix',
      data: pg.data_pagamento ?? new Date().toISOString().split('T')[0],
    });
    setEditPagError(null);
  };

  const handleSalvarEdicaoPagamento = async () => {
    if (!editingPagId) return;
    const valor = parseValorBR(editPagForm.valor);
    if (!valor || valor <= 0) {
      setEditPagError('Informe um valor válido.');
      return;
    }
    setEditPagError(null);
    setEditPagSaving(true);

    const result = await editarPagamento(editingPagId, {
      valor,
      formaPagamento: editPagForm.formaPagamento,
      data: editPagForm.data,
    });

    if (result.error) {
      setEditPagError(result.error);
    } else {
      setOrcamentosState((prev) =>
        prev.map((o) =>
          o.id === detalheOrcId
            ? {
                ...o,
                pagamentos: o.pagamentos.map((p) =>
                  p.id === editingPagId
                    ? { ...p, valor, forma_pagamento: editPagForm.formaPagamento, data_pagamento: editPagForm.data }
                    : p
                ),
              }
            : o
        )
      );
      setEditingPagId(null);
    }
    setEditPagSaving(false);
  };

  const handleExcluirPagamento = async (pagamentoId: string) => {
    setPagDeleteSaving(true);
    const result = await excluirPagamento(pagamentoId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setOrcamentosState((prev) =>
        prev.map((o) =>
          o.id === detalheOrcId
            ? { ...o, pagamentos: o.pagamentos.filter((p) => p.id !== pagamentoId) }
            : o
        )
      );
      setConfirmDeletePagId(null);
      toast.success('Pagamento excluído.');
    }
    setPagDeleteSaving(false);
  };

  // R-30 Parte 4 — sentinela de arcada/quadrante equivalente à âncora do evento, só pra
  // reusar ARCH_LABELS/denteLabel (AncoraClinica não guarda o número sentinela, guarda
  // nivel+arcada+quadrante separados — a codificação por sentinela é exclusiva de
  // fichas.dentes_afetados). null quando a âncora é por dente/face.
  const sentinelDaAncora = (ev: EventoOdontogramaParaOrc): number | null => {
    if (ev.nivel === 'boca') return ARCH_COMPLETA;
    if (ev.nivel === 'arcada') {
      if (ev.arcada === 'superior') return ARCH_SUPERIOR;
      if (ev.arcada === 'inferior') return ARCH_INFERIOR;
      return null;
    }
    if (ev.nivel === 'quadrante') {
      switch (ev.quadrante) {
        case 1: case 5: return QUAD_SUP_DIREITO;
        case 2: case 6: return QUAD_SUP_ESQUERDO;
        case 3: case 7: return QUAD_INF_ESQUERDO;
        case 4: case 8: return QUAD_INF_DIREITO;
        default: return null;
      }
    }
    return null;
  };

  // Match no catálogo pelo RÓTULO CANÔNICO do tipo (TIPO_LABEL), nunca por texto livre —
  // é o texto livre que fazia "Restauração - planejado (resina)" e "Restauração - planejado"
  // virarem 2 itens de orçamento diferentes pro mesmo procedimento (a IA escreve diferente
  // cada vez; o tipo do evento não muda).
  const matchProcedimentoPorTipo = (tipo: EventoOdontogramaParaOrc['tipo']) => {
    const rotulo = TIPO_LABEL[tipo].toLowerCase();
    return procedimentosClinica.find(
      (p) => p.nome.toLowerCase().includes(rotulo) || rotulo.includes(p.nome.toLowerCase()),
    );
  };

  /**
   * R-30 Parte 4 — FALLBACK de texto, e por que ele existe.
   *
   * A Parte 4 troca a fonte do orçamento de `dentes_observacoes` para
   * `odontograma_eventos`. Medido em produção (30/07): das **87 fichas, 82 têm texto
   * por dente (94%) e só 24 têm evento `indicado` (28%)**. Ler exclusivamente do evento
   * tiraria o pré-preenchimento de **58 fichas** — trocaria "o orçamento gerou do
   * procedimento errado" por "o orçamento não gerou nada", que é pior porque falha em
   * silêncio, com o dentista na frente do paciente.
   *
   * Fonte única se faz por **precedência, não por exclusão**: o evento ganha quando
   * existe, o texto entra **só** quando não há nenhum evento elegível. Nunca os dois
   * somados — somar duplicaria o item nas fichas que têm as duas representações (que
   * são justamente as que a Parte 3 passou a unir).
   *
   * Lógica idêntica à que está em produção hoje; não é código novo, é o caminho antigo
   * preservado como rede.
   */
  const itensDoTexto = (ficha: FichaParaOrc): NovoOrcItem[] => {
    const dentes = ficha.dentes_afetados ?? [];
    const obs = ficha.dentes_observacoes ?? {};
    if (dentes.length === 0) return [{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }];

    // Mesmo texto em vários dentes → um item com quantidade N.
    const procToTeeth = new Map<string, number[]>();
    for (const tooth of dentes) {
      const procs = (obs[String(tooth)] ?? '').split('\n').filter(Boolean);
      for (const proc of procs) {
        procToTeeth.set(proc, [...(procToTeeth.get(proc) ?? []), tooth]);
      }
    }

    if (procToTeeth.size === 0) {
      return dentes.map((t) => ({ procedimentoId: '', descricao: `Dente ${t}`, quantidade: 1, preco: '' }));
    }

    return Array.from(procToTeeth.entries()).map(([proc, teeth]) => {
      const match = procedimentosClinica.find(
        (p) =>
          p.nome.toLowerCase().includes(proc.toLowerCase()) ||
          proc.toLowerCase().includes(p.nome.toLowerCase()),
      );
      const descricao =
        teeth.length > 1
          ? `${match?.nome ?? proc} (D${teeth.join(', D')})`
          : match?.nome ?? `D${teeth[0]} — ${proc}`;
      return {
        procedimentoId: match?.id ?? '',
        descricao,
        quantidade: teeth.length,
        preco: match?.preco_padrao != null ? formatValorBR(match.preco_padrao) : '',
      };
    });
  };

  /**
   * R-30 Parte 4 — orçamento novo lê de `odontograma_eventos`, não mais de
   * `dentes_observacoes`. Corrige a "correção central" da spec: procedimento em nível
   * boca/arcada/quadrante (profilaxia, raspagem, clareamento, flúor) nunca chegava ao
   * orçamento, porque `derivarV2DosEventos` (grava o texto) pula evento sem `dente`.
   *
   * Só `status='indicado'` entra (realizado já foi feito — incluir seria cobrar retroativo
   * sem intenção; decisão confirmada 30/07). Evento com `assinatura_id` nunca é sugerido —
   * já está congelado num orçamento aceito.
   *
   * Agrupa por PROCEDIMENTO, não por texto — chave `(tipo, grupo_id ?? id)`. `grupo_id`
   * junta ponte/multi-dente num item só (mesma semântica de `agrupar-registros.ts`); sem
   * `grupo_id`, cada evento vira seu próprio item — mesmo tipo em dentes diferentes NÃO se
   * consolida automaticamente, porque era exatamente o casamento por texto livre (não o
   * agrupamento em si) que causava itens duplicados.
   *
   * R-53 — vira função PURA sobre uma lista de eventos (antes recebia a `ficha` inteira e
   * lia `ficha.odontograma_eventos`). O miolo é idêntico; só a entrada muda, pra servir tanto
   * 1 ficha (fallback) quanto o agregado de N fichas (`itensDoAgregado`, abaixo). Sem evento
   * elegível, devolve `[]` — quem decide se cai no fallback de texto é o chamador (só faz
   * sentido por-ficha, não em cima do agregado já filtrado pela query).
   */
  const eventosParaItens = (eventos: EventoOdontogramaParaOrc[]): NovoOrcItem[] => {
    const elegiveis = eventos.filter((ev) => ev.status === 'indicado' && ev.assinatura_id == null);
    if (elegiveis.length === 0) return [];

    const grupos = new Map<string, EventoOdontogramaParaOrc[]>();
    for (const ev of elegiveis) {
      const chave = `${ev.tipo}|${ev.grupo_id ?? ev.id}`;
      const arr = grupos.get(chave);
      if (arr) arr.push(ev); else grupos.set(chave, [ev]);
    }

    return Array.from(grupos.values()).map((grupoEventos) => {
      const primeiro = grupoEventos[0];
      const match = matchProcedimentoPorTipo(primeiro.tipo);
      const rotulo = TIPO_LABEL[primeiro.tipo];

      const dentesDistintos = [
        ...new Set(grupoEventos.map((ev) => ev.dente).filter((d): d is number => d != null)),
      ];
      const sentinel = sentinelDaAncora(primeiro);

      // boca/arcada/quadrante: quantidade sempre 1 (é a correção central da Parte 4).
      const quantidade = dentesDistintos.length > 0 ? dentesDistintos.length : 1;
      const alcance =
        sentinel != null
          ? denteLabel(sentinel)
          : dentesDistintos.length > 0
            ? `D${dentesDistintos.join(', D')}`
            : '';

      return {
        procedimentoId: match?.id ?? '',
        descricao: alcance ? `${match?.nome ?? rotulo} — ${alcance}` : (match?.nome ?? rotulo),
        quantidade,
        preco: match?.preco_padrao != null ? formatValorBR(match.preco_padrao) : '',
      };
    });
  };

  // R-53 — wrapper de 1 ficha só: preserva o fallback de texto (itensDoTexto) que
  // `eventosParaItens` (puro, sem `ficha`) não pode mais decidir sozinho. Único chamador
  // hoje é o caminho por-ficha (fallback G4 e `selecionarFichaParaOrc`).
  const fichaParaItens = (ficha: FichaParaOrc): NovoOrcItem[] => {
    const itens = eventosParaItens(ficha.odontograma_eventos ?? []);
    return itens.length > 0 ? itens : itensDoTexto(ficha);
  };

  // R-53 (§2.1, X1) — adapta o evento cru (encaminhado_para snake_case + embed do nome) pro
  // shape que filtro-responsavel.ts espera (RegistroResponsavel.encaminhadoPara). Mesmo
  // padrão de adaptação que FichasTab.tsx já usa pro EventoView dela.
  const paraResponsavel = (ev: EventoOdontogramaParaOrc) => ({
    encaminhadoPara: ev.encaminhado_para
      ? { id: ev.encaminhado_para, nome: ev.encaminhado_dentista?.nome ?? 'Dentista' }
      : null,
  });

  // R-53 — flatten de N fichas (o agregado) pro filtro de responsável + eventosParaItens.
  // `filtro=null` (Todos) é o default: o dinheiro é da clínica, não do dentista (§2.1).
  const itensDoAgregado = (fichas: FichaParaOrc[], filtro: FiltroResponsavel): NovoOrcItem[] => {
    const itens = fichas.flatMap((f) => {
      const eventosComResponsavel = (f.odontograma_eventos ?? []).map((ev) => ({ ...ev, ...paraResponsavel(ev) }));
      const visiveis = eventosVisiveis(eventosComResponsavel, f.dentista_id, filtro, dentistaId);
      return eventosParaItens(visiveis);
    });
    return itens.length > 0 ? itens : [{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }];
  };

  // R-53 — responsáveis distintos no agregado atual, pros chips do modal (§4.3). Vazio/1
  // responsável → ChipsResponsavel não renderiza (mesma regra da ficha).
  const responsaveisOrc = useMemo(
    () => derivarResponsaveis(
      fichasParaOrc.map((f) => ({
        autorId: f.dentista_id,
        autorNome: f.dentista?.nome ?? 'Equipe',
        eventos: (f.odontograma_eventos ?? []).map(paraResponsavel),
      })),
    ),
    [fichasParaOrc],
  );

  // R-53 — troca de chip: reprocessa o agregado já carregado (fichasParaOrc), nunca refaz a
  // query. Display puro (I4) — nunca decide o que é gravado.
  const handleFiltroResponsavelOrc = (v: FiltroResponsavel) => {
    setFiltroResponsavelOrc(v);
    setNovoOrcItens(itensDoAgregado(fichasParaOrc, v));
  };

  // R-30 Parte 4 — embute odontograma_eventos na mesma query (FK ficha_id, sem ambiguidade:
  // é a única FK de odontograma_eventos pra fichas). Evita 2º round-trip pra gerar os itens.
  // R-53 — dentista_id/dentista(nome) na ficha (FK única, fichas_dentista_id_fkey — conferido
  // no banco) e encaminhado_para/encaminhado_dentista no evento (2 FKs de odontograma_eventos
  // pra dentistas — família R-44, precisa do !fkey) entram pro X1 (filtro-responsavel.ts).
  const CAMPOS_FICHA_ORC =
    'id, created_at, data_atendimento, queixa_principal, dentes_afetados, dentes_observacoes, ' +
    'dentista_id, dentista:dentistas(nome)';
  const CAMPOS_EVENTO_ORC =
    'id, tipo, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, grupo_id, assinatura_id, ' +
    'encaminhado_para, encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey(nome)';
  const SELECT_FICHA_PARA_ORC = `${CAMPOS_FICHA_ORC}, odontograma_eventos(${CAMPOS_EVENTO_ORC})`;
  // R-53 (§3) — !inner: só fichas com ≥1 evento indicado/não-assinado voltam, e o embed já
  // vem filtrado pra esses eventos. Sem `.limit()` (medido: no máx. 6 fichas/paciente).
  const SELECT_FICHA_PARA_ORC_AGREGADO = `${CAMPOS_FICHA_ORC}, odontograma_eventos!inner(${CAMPOS_EVENTO_ORC})`;

  // R-53 — busca única do agregado (todos os indicados abertos do paciente), reusada pelos
  // 2 pontos de entrada (botão geral e "gerar orçamento" de dentro de uma ficha — §2 decisão
  // 1: convergem pro mesmo caminho). `[]` = paciente sem nenhum indicado aberto → cada
  // chamador decide seu próprio fallback (G4).
  const carregarFichasAgregado = async (): Promise<FichaParaOrc[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('fichas')
      .select(SELECT_FICHA_PARA_ORC_AGREGADO)
      .eq('paciente_id', paciente.id)
      .eq('clinica_id', clinicaId)
      .eq('odontograma_eventos.status', 'indicado')
      .is('odontograma_eventos.assinatura_id', null)
      .order('data_atendimento', { ascending: false });
    return (data as unknown as FichaParaOrc[]) ?? [];
  };

  const abrirNovoOrcamento = async () => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const agregado = await carregarFichasAgregado();

      if (agregado.length > 0) {
        // R-53 — caminho novo: todos os indicados abertos do paciente, de qualquer ficha.
        // fichaOrcId fica null — o orçamento não pertence mais a 1 ficha só (I6).
        // 07/08 — default virou "Meus" (revoga §2.1 do R-53, "dinheiro é da clínica"): cada
        // dentista responde pelo próprio orçamento, procedimento de colega não pode entrar
        // sem ação explícita. Chip "Todos" continua disponível pra quem precisar ver junto.
        setFichasParaOrc(agregado);
        setFichaOrcId(null);
        setFiltroResponsavelOrc(FILTRO_MEUS);
        setNovoOrcItens(itensDoAgregado(agregado, FILTRO_MEUS));
        setEtapaNovoOrc('itens');
      } else {
        // G4 — fallback INTACTO: nenhum indicado aberto em ficha nenhuma. Mesmo comportamento
        // de antes do R-53 (10 fichas recentes, decide selecionar vs. texto).
        const supabase = createClient();
        const { data } = await supabase
          .from('fichas')
          .select(SELECT_FICHA_PARA_ORC)
          .eq('paciente_id', paciente.id)
          .eq('clinica_id', clinicaId)
          .order('data_atendimento', { ascending: false })
          .limit(10);

        const fichas = (data as unknown as FichaParaOrc[]) ?? [];
        setFichasParaOrc(fichas);

        if (fichas.length > 1) {
          setFichaOrcId(null);
          setEtapaNovoOrc('selecionar');
          setNovoOrcItens([{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
        } else {
          setFichaOrcId(fichas.length === 1 ? fichas[0].id : null);
          setNovoOrcItens(fichas.length === 1 ? fichaParaItens(fichas[0]) : [{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
          setEtapaNovoOrc('itens');
        }
      }
    } catch {
      setFichasParaOrc([]);
      setFichaOrcId(null);
      setNovoOrcItens([{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
      setEtapaNovoOrc('itens');
    } finally {
      setIsLoadingFichaParaOrc(false);
    }
    setIsNovoOrcOpen(true);
  };

  const selecionarFichaParaOrc = (fichaId: string | null) => {
    setFichaOrcId(fichaId);
    if (!fichaId) {
      setNovoOrcItens([{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
    } else {
      const ficha = fichasParaOrc.find((f) => f.id === fichaId);
      setNovoOrcItens(ficha ? fichaParaItens(ficha) : [{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
    }
    setEtapaNovoOrc('itens');
  };

  // #6 — gerar orçamento a partir de uma ficha é SÓ dela (decisão dele 07/08, revoga o
  // agregado por-ficha do R-53/R-59 Parte 1): "eu só quero o orçamento daqui, da ficha".
  // Nunca puxa outra ficha nem outro dentista, aberta ou concluída não importa —
  // `fichaParaItens` já cobre os dois (eventos 'indicado' elegíveis + fallback de texto do
  // R-30 Parte 4 se a ficha não tiver evento nenhum). Quem quer ver várias fichas juntas usa
  // o botão geral "Novo orçamento" (`abrirNovoOrcamento`, que segue agregando — filtrado por
  // responsável agora, ver ali).
  const abrirOrcamentoParaFicha = async (fichaId: string) => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('fichas')
        .select(SELECT_FICHA_PARA_ORC)
        .eq('id', fichaId)
        .eq('clinica_id', clinicaId)
        .single();
      const ficha = data as unknown as FichaParaOrc | null;
      setFichaOrcId(fichaId);
      setFichasParaOrc(ficha ? [ficha] : []);
      setNovoOrcItens(ficha ? fichaParaItens(ficha) : [{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
    } catch {
      setFichaOrcId(fichaId);
      setFichasParaOrc([]);
      setNovoOrcItens([{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);
    } finally {
      setEtapaNovoOrc('itens');
      setIsLoadingFichaParaOrc(false);
    }
    setIsNovoOrcOpen(true);
  };

  // Cadastra no catálogo um procedimento digitado que não bateu com nenhum item existente —
  // usa o nome (sem a referência de dente) e o valor já preenchidos no item, e vincula o item
  // ao procedimento recém-criado.
  const handleCadastrarProcedimento = async (idx: number) => {
    const item = novoOrcItens[idx];
    const nome = stripDenteDoNome(item.descricao);
    if (!nome) return;
    setRegisteringProcIdx(idx);
    const precoNum = parseValorBR(item.preco);
    const result = await criarProcedimentoRapido({
      nome,
      precoPadrao: precoNum > 0 ? precoNum : null,
      dentistaId: role === 'secretaria' ? novoOrcDentistaAlvoId : undefined,
    });
    if (result.error || !result.id) {
      toast.error(result.error ?? 'Não foi possível cadastrar o procedimento.');
    } else {
      const novoId = result.id;
      setProcedimentosClinica((prev) =>
        [...prev, { id: novoId, nome, preco_padrao: precoNum > 0 ? precoNum : null }]
          .sort((a, b) => a.nome.localeCompare(b.nome))
      );
      setNovoOrcItens((prev) => prev.map((it, i) => (i === idx ? { ...it, procedimentoId: novoId } : it)));
      toast.success('Procedimento cadastrado no catálogo.');
    }
    setRegisteringProcIdx(null);
  };

  const handleCriarOrcamento = async () => {
    // Exige ao menos descrição — preço pode ser 0 (dentista define depois)
    const itensValidos = novoOrcItens.filter((i) => i.descricao.trim());
    if (itensValidos.length === 0) {
      setOrcError('Adicione ao menos um procedimento com descrição.');
      return;
    }
    const temSemPreco = itensValidos.some((i) => parseValorBR(i.preco) === 0);
    if (temSemPreco) {
      setOrcError('Atenção: alguns procedimentos estão sem valor. Defina o preço antes de continuar.');
      return;
    }
    if (role === 'secretaria' && !novoOrcDentistaAlvoId) {
      setOrcError('Selecione o dentista responsável.');
      return;
    }
    const numeroParcelas = parseInt(novoOrcNumParcelas, 10);
    if (novoOrcPlanoForma === 'parcelado' && (!numeroParcelas || numeroParcelas < 2 || numeroParcelas > 24)) {
      setOrcError('Informe entre 2 e 24 parcelas.');
      return;
    }
    if (novoOrcPlanoForma === 'parcelado' && !novoOrcPrimeiroVencimento) {
      setOrcError('Informe o primeiro vencimento das parcelas.');
      return;
    }
    setOrcError(null);
    setOrcSaving(true);

    const subtotalValido = itensValidos.reduce((s, i) => s + i.quantidade * parseValorBR(i.preco), 0);
    const finalValido    = novoOrcValorFinal !== null ? Math.max(0, novoOrcValorFinal) : subtotalValido;
    const descontoValor  = Math.max(0, Math.round((subtotalValido - finalValido) * 100) / 100);

    const result = await criarOrcamento({
      pacienteId: paciente.id,
      desconto:   descontoValor,
      fichaId:    fichaOrcId,
      dentistaId: role === 'secretaria' ? novoOrcDentistaAlvoId : undefined,
      itens: itensValidos.map((i) => ({
        procedimentoId: i.procedimentoId || null,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoUnitario: parseValorBR(i.preco),
      })),
    });

    if (result.error) {
      setOrcError(result.error);
    } else {
      const novoTotal = Math.max(0, subtotalValido - descontoValor);
      const novoOrc: OrcamentoComItens = {
        id: result.id ?? crypto.randomUUID(),
        status: 'rascunho',
        total: novoTotal,
        desconto: descontoValor,
        created_at: new Date().toISOString(),
        validade_dias: 30,
        condicoes_pagamento: null,
        // Espelha o default novo do criarOrcamento (actions.ts) — orçamento nasce
        // sem valor por item, só o total.
        mostrar_valor_por_item: false,
        dentista_id: role === 'secretaria' ? novoOrcDentistaAlvoId : dentistaId,
        itens: itensValidos.map((i, idx) => ({
          id: `temp-${idx}`,
          descricao: i.descricao,
          quantidade: i.quantidade,
          preco_total: i.quantidade * parseValorBR(i.preco),
        })),
        pagamentos: [],
        aprovado_por: null,
        aprovado_em: null,
        aceite: null,
      };
      setOrcamentosState((prev) => [novoOrc, ...prev]);
      setIsNovoOrcOpen(false);
      setNovoOrcItens([{ procedimentoId: '', descricao: '', quantidade: 1, preco: '' }]);

      // R-34 — plano de pagamento definido junto da criação (opcional). Roda depois do
      // orçamento existir de verdade (precisa do id real, não do temp/otimista acima).
      let precisaAtualizar = false;
      if (result.id && novoOrcPlanoForma === 'parcelado') {
        const planoResult = await gerarParcelas({
          orcamentoId: result.id,
          numeroParcelas,
          primeiroVencimento: novoOrcPrimeiroVencimento,
          valorAcordado: novoTotal,
          parcelasForma: novoOrcParcelasForma || undefined,
        });
        if (planoResult.error) {
          toast.error(`Orçamento criado, mas o parcelamento falhou: ${planoResult.error}`);
        } else {
          precisaAtualizar = true;
        }
      } else if (result.id && novoOrcPlanoForma === 'avista') {
        const planoResult = await definirPlanoAvista({ orcamentoId: result.id, valorAcordado: novoTotal });
        if (planoResult.error) {
          toast.error(`Orçamento criado, mas a forma de pagamento falhou: ${planoResult.error}`);
        } else {
          precisaAtualizar = true;
        }
      }
      setNovoOrcPlanoForma(null);
      setNovoOrcNumParcelas('3');
      setNovoOrcPrimeiroVencimento('');
      setNovoOrcParcelasForma('');
      if (precisaAtualizar) router.refresh(); // pega condicoes_pagamento/parcelas reais do server

      toast.success('Orçamento criado como rascunho', {
        description: 'Revise os itens e envie para o paciente quando estiver pronto.',
        duration: 4000,
      });
    }
    setOrcSaving(false);
  };

  const handleOpenEditOrc = () => {
    if (!detalheOrc) return;
    setOrcEditItens(
      detalheOrc.itens.map((item) => ({
        id: item.id,
        descricao: item.descricao ?? '',
        quantidade: item.quantidade,
        preco_unitario: formatValorBR(
          item.quantidade > 0 ? (item.preco_total ?? 0) / item.quantidade : (item.preco_total ?? 0)
        ),
      }))
    );
    setOrcEditError(null);
    setOrcEditMode(true);
  };

  const handleSalvarEdicaoOrc = async () => {
    if (!detalheOrc) return;
    const itensValidos = orcEditItens.filter((i) => i.descricao.trim() && parseValorBR(i.preco_unitario) > 0);
    if (itensValidos.length === 0) {
      setOrcEditError('Adicione ao menos um procedimento com descrição e valor.');
      return;
    }
    setOrcEditSaving(true);
    const result = await editarOrcamento(detalheOrc.id, itensValidos.map(i => ({ ...i, preco_unitario: parseValorBR(i.preco_unitario) })), detalheOrc.desconto ?? 0);
    if (result.error) {
      setOrcEditError(result.error);
    } else {
      const novoTotal = itensValidos.reduce((sum, i) => sum + i.quantidade * parseValorBR(i.preco_unitario), 0);
      const novosItens: OrcamentoItem[] = itensValidos.map((i) => ({
        id: i.id ?? crypto.randomUUID(),
        descricao: i.descricao,
        quantidade: i.quantidade,
        preco_total: i.quantidade * parseValorBR(i.preco_unitario),
      }));
      setOrcamentosState((prev) =>
        prev.map((o) =>
          o.id === detalheOrc.id ? { ...o, total: novoTotal, itens: novosItens } : o
        )
      );
      setOrcEditMode(false);
    }
    setOrcEditSaving(false);
  };

  const handleExcluirOrc = async () => {
    if (!confirmDeleteOrcId) return;
    setOrcDeleteSaving(true);
    setOrcDeleteError(null);
    const result = await excluirOrcamento(confirmDeleteOrcId, paciente.id);
    if (!result.error) {
      setOrcamentosState((prev) => prev.filter((o) => o.id !== confirmDeleteOrcId));
      setDetalheOrcId(null);
      setConfirmDeleteOrcId(null);
    } else {
      setOrcDeleteError(result.error);
    }
    setOrcDeleteSaving(false);
  };

  const handleMarcarRetorno = async () => {
    if (!retornoForm.data || retornoForm.minutoDoDia == null) {
      setRetornoError('Escolha um horário na grade.');
      return;
    }
    setRetornoError(null);
    setRetornoSaving(true);
    try {
      // Sem offset explícito, o Postgres grava esse horário como UTC — 3h adiantado em
      // relação ao horário real da clínica (BRT). buildClinicDatetime é a mesma função
      // que o modal da própria agenda usa para não repetir esse bug.
      const dataHora = buildClinicDatetime(retornoForm.data, formatHoraRetorno(retornoForm.minutoDoDia));
      const result = await criarAgendamento({
        pacienteId: paciente.id,
        dataHora,
        duracaoMinutos: parseInt(retornoForm.duracao, 10) || 30,
        observacoes: retornoForm.observacoes || null,
      });
      if (result.error) {
        setRetornoError(result.error);
      } else {
        // A agenda carrega uma janela por vez: um retorno marcado pra fora dela existe e não
        // aparece. Um retorno de 30 dias cai fora por definição — então o toast diz a data e
        // leva até lá. Ler antes de limpar o form.
        //
        // A URL da agenda é `?v=…&d=yyyy-MM-dd` (R-13 Fatia 0). O `?mes=` foi removido: um link
        // com ele hoje é ignorado em silêncio e abre a semana de hoje, que é exatamente o
        // sumiço que este toast existe pra evitar.
        const dia = retornoForm.data;
        const quando = `${format(parseISO(dia), 'dd/MM/yyyy')} às ${formatHoraRetorno(retornoForm.minutoDoDia)}`;
        setIsMarcarRetornoOpen(false);
        setRetornoForm({ data: null, minutoDoDia: null, duracao: '30', observacoes: '' });
        setAgendamentosTabData(null); // força recarregar a aba Agenda na próxima abertura
        toast.success(`Retorno marcado para ${quando}`, {
          // Fora da semana corrente já justifica o atalho — a janela agora é a semana, não o mês.
          action: dia !== format(new Date(), 'yyyy-MM-dd')
            ? { label: 'Ver na agenda', onClick: () => router.push(`/dashboard/agendamentos?v=dia&d=${dia}`) }
            : undefined,
        });
      }
    } finally {
      setRetornoSaving(false);
    }
  };

  const handleExcluirPaciente = async () => {
    setExcluirPacienteError(null);
    setExcluindoPaciente(true);
    try {
      const result = await excluirPaciente(paciente.id, displayNome);
      if (!result.ok) {
        setExcluirPacienteError(result.error ?? 'Erro ao excluir paciente.');
        return;
      }
      toast.success(`${displayNome} foi excluído.`);
      router.push('/dashboard/pacientes');
    } finally {
      setExcluindoPaciente(false);
    }
  };

  return (
    <PageContainer variant="wide">

      {/* ── NAV + PATIENT CARD ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-3"
      >
        {/* Breadcrumb nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/pacientes')}
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Pacientes
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 rounded-xl border border-border/60 text-text-secondary hover:text-teal hover:border-teal/40 bg-surface transition-colors"
              title="Editar paciente"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open(`/api/pacientes/${paciente.id}/prontuario`, '_blank')}
              className="p-2 rounded-xl border border-border/60 text-text-secondary hover:text-text-primary bg-surface transition-colors"
              title="Exportar prontuário"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            {/* Excluir paciente — sem gate de role de propósito (secretária é quem usa,
                decisão dele 07/08). Confirmação com nome digitado mora no modal. */}
            <button
              onClick={() => setExcluirPacienteAberto(true)}
              className="p-2 rounded-xl border border-border/60 text-text-secondary hover:text-coral hover:border-coral/40 bg-surface transition-colors"
              title="Excluir paciente"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {canWriteClinical && (
              <button
                onClick={() => setIsEmitirOpen(true)}
                className="p-2 rounded-xl border border-border/60 text-text-secondary hover:text-teal hover:border-teal/40 bg-surface transition-colors"
                title="Emitir documento (receita, atestado, pedido de exame)"
              >
                <FilePlus className="w-4 h-4" />
              </button>
            )}
            {/* Apresentar — só aparece com ficha pra apresentar (DESIGN-KL §2 / spec 2.1) */}
            {canViewClinical && fichasRecentes.length > 0 && (
              <ApresentarPaciente
                patientId={paciente.id}
                clinicaId={clinicaId}
                patientName={displayNome}
                dentistaId={dentistaId}
                mode="picker"
                fichas={fichasRecentes}
                variant="header"
                glow={paciente.id === 'demo'}
              />
            )}
            <button
              onClick={() => { setRetornoError(null); setIsMarcarRetornoOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal text-white rounded-xl text-xs font-bold hover:bg-teal-lt transition-colors shadow-md"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marcar retorno</span>
            </button>
          </div>
        </div>

        {/* Patient info card */}
        <div className="bg-surface rounded-2xl border border-border/60 shadow-sm p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-teal flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
              {iniciais}
            </div>

            {/* Info block */}
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-2xl text-text-primary leading-none">{displayNome}</h1>
              <p className="text-text-secondary text-sm mt-1 flex items-center gap-2 flex-wrap">
                {idade !== null && <span>{idade} anos</span>}
                {dataNascimento && <span className="text-text-secondary/60">· {dataNascimento}</span>}
                <span className="text-text-secondary/60">· Paciente desde {membroDesde}</span>
              </p>

              {/* Contact row */}
              {(displayTelefone || displayEmail || endereco) && (
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                  {displayTelefone && (
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <Phone className="w-3.5 h-3.5 text-teal shrink-0" />
                      {displayTelefone}
                    </div>
                  )}
                  {displayEmail && (
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <Mail className="w-3.5 h-3.5 text-teal shrink-0" />
                      <span className="truncate max-w-[220px]">{displayEmail}</span>
                    </div>
                  )}
                  {endereco && (
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <MapPin className="w-3.5 h-3.5 text-teal shrink-0" />
                      <span>{endereco}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Observações / Alertas */}
              {paciente.observacoes && (
                <div className="mt-3 px-3 py-2.5 rounded-xl bg-amber-500/6 border border-amber-500/20 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Observações</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{paciente.observacoes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-6"
        >


          {/* Tabs — IDs usados pelo tour DEX */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-wrap gap-2 mb-6 h-auto bg-transparent p-0">
              {(
                [
                  ...(canViewClinical  ? [['ficha-clinica','Prontuário','tab-fichas',       FileText]] : []),
                  ['orcamentos',    'Orçamentos',   'tab-orcamento',    CreditCard],
                  ['arquivos',      'Arquivos',     'tab-documentos',   Paperclip],
                  ['agenda',        'Agenda',        undefined,          Calendar],
                ] as [string, string, string | undefined, React.ComponentType<{ className?: string }>][]
              ).map(([val, label, tourId, Icon]) => (
                <TabsTrigger
                  key={val}
                  id={tourId}
                  value={val}
                  className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold border transition-all duration-300 border-border/60 bg-surface text-text-secondary hover:text-text-primary hover:border-teal/30 data-[state=active]:bg-teal data-[state=active]:text-white data-[state=active]:border-teal data-[state=active]:shadow-[0_4px_14px_rgba(47,156,133,0.3)]${tourId && highlightedTab === tourId ? ' ring-2 ring-teal/60' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div>
              <div>
                {/* Resumo */}
                <TabsContent value="resumo" className="mt-0 space-y-6">
                  {/* ── 1. Atividade Recente ──────────────────────────────── */}
                  {canWriteClinical && (
                    <div className="bg-surface rounded-2xl border border-border/60 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading text-xl text-text-primary">Atividade Recente</h3>
                        <FileText className="w-5 h-5 text-teal" />
                      </div>
                      {fichasRecentes.length === 0 ? (
                        <div className="text-center py-6">
                          <FileText className="w-8 h-8 text-text-secondary/30 mx-auto mb-2" />
                          <p className="text-sm text-text-secondary">Nenhum registro clínico ainda.</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {fichasRecentes.map((ficha) => (
                            <div
                              key={ficha.id}
                              className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="w-4 h-4 text-teal" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text-primary truncate">
                                  {ficha.queixa_principal ?? 'Evolução clínica'}
                                </div>
                                {ficha.anotacoes && (
                                  <div className="text-xs text-text-secondary truncate mt-0.5">
                                    {ficha.anotacoes}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-text-secondary">
                                    {formatarDataFicha(ficha.data_atendimento, ficha.created_at)}
                                  </span>
                                  {ficha.dentista && (
                                    <span className="text-xs text-teal font-medium">
                                      {ficha.dentista.nome}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 2. Resumo Financeiro ──────────────────────────────── */}
                  {resumoFinanceiro.temHistorico && (
                    <div className="bg-surface rounded-2xl border border-border/60 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading text-xl text-text-primary">Financeiro</h3>
                        <CreditCard className="w-5 h-5 text-teal" />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-surface-alt rounded-xl p-3 text-center">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Aprovado</p>
                          <p className="font-mono text-base font-bold text-text-primary tabular-nums">
                            {resumoFinanceiro.totalAprovado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <div className="bg-teal/5 rounded-xl p-3 text-center border border-teal/15">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Recebido</p>
                          <p className="font-mono text-base font-bold text-teal tabular-nums">
                            {resumoFinanceiro.totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${
                          resumoFinanceiro.totalPendente > 0
                            ? 'bg-coral/5 border border-coral/15'
                            : 'bg-surface-alt'
                        }`}>
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Pendente</p>
                          <p className={`font-mono text-base font-bold tabular-nums ${
                            resumoFinanceiro.totalPendente > 0 ? 'text-coral' : 'text-text-secondary'
                          }`}>
                            {resumoFinanceiro.totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                      {resumoFinanceiro.totalAprovado > 0 && (
                        <div className="w-full bg-surface-alt rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (resumoFinanceiro.totalPago / resumoFinanceiro.totalAprovado) * 100)}%` }}
                          />
                        </div>
                      )}
                      <button
                        onClick={() => setActiveTab('orcamentos')}
                        className="w-full mt-3 py-2.5 text-xs font-bold text-teal hover:text-teal-lt transition-colors flex items-center justify-center gap-2"
                      >
                        Ver Orçamentos <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* ── 3. Timeline Clínica ───────────────────────────────── */}
                  {timeline.length > 0 && (
                    <div className="bg-surface rounded-2xl border border-border/60 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading text-xl text-text-primary">Histórico</h3>
                        <Clock className="w-5 h-5 text-teal" />
                      </div>
                      <div className="relative">
                        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border/60" />
                        <div className="space-y-0">
                          {timeline.slice(0, 8).map((event, idx) => {
                            const dotColor =
                              event.type === 'payment_registered' ? 'bg-teal'
                              : event.type === 'appointment_cancelled' ? 'bg-coral'
                              : event.type === 'consultation_created' ? 'bg-teal'
                              : 'bg-surface-alt border border-border';
                            return (
                              <div key={event.id} className="flex gap-4 pb-4 last:pb-0">
                                <div className="relative z-10 mt-1 shrink-0">
                                  <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                                </div>
                                <div className="flex-1 min-w-0 pb-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-text-primary leading-snug">
                                      {event.title}
                                    </p>
                                    <span className="text-xs font-mono text-text-secondary shrink-0">
                                      {format(parseISO(event.timestamp), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  </div>
                                  {event.description && (
                                    <p className="text-xs text-text-secondary mt-0.5 truncate">{event.description}</p>
                                  )}
                                  {event.actor && (
                                    <p className="text-[11px] text-teal mt-0.5">{event.actor}</p>
                                  )}
                                  {idx < timeline.slice(0, 8).length - 1 && (
                                    <div className="h-px bg-border/30 mt-3" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* placeholder para que a aba nunca fique completamente vazia */}
                  {!canWriteClinical && !resumoFinanceiro.temHistorico && timeline.length === 0 && (
                    <div className="bg-surface rounded-2xl border border-border/60 shadow-sm p-10 text-center">
                      <Clock className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
                      <p className="text-sm text-text-secondary">Nenhuma atividade registrada ainda.</p>
                    </div>
                  )}
                </TabsContent>

                {canViewClinical && (
                  <TabsContent value="ficha-clinica" className="mt-0">
                    {mountedTabs.has('ficha-clinica') && (
                      <FichasTab
                        patientId={paciente.id}
                        clinicaId={clinicaId}
                        dentistaId={dentistaId}
                        plano={plano}
                        patientName={displayNome}
                        canWrite={canWriteClinical}
                        onGerarOrcamento={role !== 'secretaria' ? (fichaId) => void abrirOrcamentoParaFicha(fichaId) : undefined}
                      />
                    )}
                  </TabsContent>
                )}

                {/* Orçamentos */}
                <TabsContent value="orcamentos" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary font-medium">
                      {orcamentosState.length} orçamento{orcamentosState.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => void abrirNovoOrcamento()}
                      disabled={isLoadingFichaParaOrc}
                      className="bg-teal text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-teal-lt transition-all shadow-md disabled:opacity-60"
                    >
                      {isLoadingFichaParaOrc ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Novo Orçamento
                    </button>
                  </div>

                  {orcamentosState.length === 0 ? (
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 text-center">
                      <CreditCard className="w-12 h-12 text-teal/20 mx-auto mb-4" />
                      <h3 className="font-heading text-2xl text-text-primary mb-2">
                        Nenhum orçamento
                      </h3>
                      <p className="text-text-secondary text-sm max-w-md mx-auto">
                        Nenhum orçamento ainda. Clique em + Novo Orçamento para criar.
                      </p>
                    </div>
                  ) : (
                    orcamentosState.map((orc) => {
                      const st = STATUS_ORCAMENTO[orc.status] ?? STATUS_ORCAMENTO.rascunho;
                      const StatusIcon =
                        orc.status === 'aprovado'
                          ? CheckCircle2
                          : orc.status === 'recusado'
                          ? XCircle
                          : AlertCircle;
                      return (
                        <div
                          key={orc.id}
                          onClick={() => setDetalheOrcId(orc.id)}
                          className={`rounded-2xl border shadow-sm p-6 cursor-pointer transition-colors ${
                            (orc.status === 'rascunho' || orc.status === 'enviado')
                              ? 'bg-amber-500/[0.03] border-amber-500/40 hover:border-amber-500/60'
                              : 'bg-surface border-border/60 hover:border-teal/30'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-surface-alt flex items-center justify-center">
                                <StatusIcon className="w-5 h-5 text-teal" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${st.cls}`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                                <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(orc.created_at), 'dd/MM/yyyy', {
                                    locale: ptBR,
                                  })}
                                  {orc.validade_dias && (
                                    <> • Validade: {orc.validade_dias} dias</>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-mono text-lg font-bold text-text-primary">
                                  R${' '}
                                  {(orc.total ?? 0).toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-secondary" />
                            </div>
                          </div>

                          {orc.itens.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {orc.itens.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 text-text-secondary">
                                    <FileText className="w-3 h-3" />
                                    {item.descricao ?? '—'}
                                    {item.quantidade > 1 && (
                                      <span className="font-mono">×{item.quantidade}</span>
                                    )}
                                  </div>
                                  <span className="font-mono text-text-primary font-medium">
                                    R${' '}
                                    {(item.preco_total ?? 0).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {orc.pagamentos.length > 0 && (
                            <div className="pt-3 border-t border-border/40">
                              <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                Pagamentos
                              </div>
                              {orc.pagamentos.map((pg) => (
                                <div
                                  key={pg.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-text-secondary capitalize">
                                    {pg.forma_pagamento ?? 'Não informado'} •{' '}
                                    <span
                                      className={
                                        pg.status === 'pago' ? 'text-teal' : 'text-yellow-600'
                                      }
                                    >
                                      {pg.status}
                                    </span>
                                  </span>
                                  <span className="font-mono font-medium text-text-primary">
                                    R${' '}
                                    {pg.valor.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                {/* Agenda do paciente */}
                <TabsContent value="agenda" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary font-medium">
                      Histórico de consultas
                    </span>
                    <button
                      onClick={() => { setRetornoError(null); setIsMarcarRetornoOpen(true); }}
                      className="bg-teal text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-teal-lt transition-all shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Marcar retorno
                    </button>
                  </div>

                  {loadingAgendamentos ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-surface rounded-2xl border border-border/60 p-5 animate-pulse">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-surface-alt rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-20 bg-surface-alt rounded" />
                              <div className="h-4 w-48 bg-surface-alt rounded" />
                              <div className="h-3 w-32 bg-surface-alt rounded" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : agendamentosTabData?.length === 0 ? (
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-10 text-center">
                      <Calendar className="w-12 h-12 text-teal/20 mx-auto mb-4" />
                      <h3 className="font-heading text-2xl text-text-primary mb-2">Nenhuma consulta</h3>
                      <p className="text-text-secondary text-sm">Nenhuma consulta registrada para este paciente ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agendamentosTabData?.map((ag) => {
                        const statusInfo = STATUS_AGENDA_MAP[ag.status] ?? { label: ag.status, cls: 'bg-surface-alt text-text-secondary' };
                        const isUpcoming = new Date(ag.data_hora) > new Date();
                        return (
                          <div
                            key={ag.id}
                            className="bg-surface rounded-2xl border border-border/60 shadow-sm p-5 flex items-start gap-4"
                          >
                            <div className="w-12 h-12 bg-surface-alt rounded-xl flex flex-col items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-teal uppercase">
                                {format(parseISO(ag.data_hora), 'MMM', { locale: ptBR })}
                              </span>
                              <span className="text-base font-bold text-text-primary leading-none">
                                {format(parseISO(ag.data_hora), 'dd')}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${statusInfo.cls}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="font-medium text-sm text-text-primary">
                                {format(parseISO(ag.data_hora), "EEEE, 'às' HH:mm", { locale: ptBR })}
                              </div>
                              {ag.observacoes && (
                                <div className="text-xs text-text-secondary mt-0.5 truncate">{ag.observacoes}</div>
                              )}
                              {ag.dentista && (
                                <div className="text-xs text-teal mt-0.5 font-medium">{ag.dentista.nome}</div>
                              )}
                            </div>
                            {canWriteClinical && isUpcoming && !['cancelled', 'no_show', 'completed'].includes(ag.status) && (
                              <button
                                onClick={() => router.push(`/dashboard/meu-dia?ag=${ag.id}`)}
                                className="shrink-0 px-3 py-1.5 bg-teal text-white rounded-lg text-xs font-bold hover:bg-teal-lt transition-colors"
                              >
                                Iniciar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Arquivos */}
                <TabsContent value="arquivos" className="mt-0">
                  {mountedTabs.has('arquivos') && (
                    <DocumentosTab patientId={paciente.id} clinicaId={clinicaId} dentistaId={dentistaId} />
                  )}
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </motion.div>
      </div>

      <EditarPacienteModal
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setEditNome(paciente.nome);
            setEditTelefone(paciente.telefone ?? '');
            setEditEmail(paciente.email ?? '');
            setEditEndereco(paciente.endereco ?? '');
            setEditDentistaId(paciente.dentista_id ?? '');
            setEditCpf(paciente.cpf ?? '');
            setEditDataNascimento(paciente.data_nascimento ?? '');
            setEditResponsavelNome(paciente.responsavel_nome ?? '');
            setEditResponsavelTelefone(paciente.responsavel_telefone ?? '');
            setEditResponsavelParentesco(paciente.responsavel_parentesco ?? '');
            setEditError(null);
          }
        }}
        editNome={editNome}
        setEditNome={setEditNome}
        editTelefone={editTelefone}
        setEditTelefone={setEditTelefone}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editEndereco={editEndereco}
        setEditEndereco={setEditEndereco}
        editCpf={editCpf}
        setEditCpf={setEditCpf}
        editDataNascimento={editDataNascimento}
        setEditDataNascimento={setEditDataNascimento}
        editResponsavelNome={editResponsavelNome}
        setEditResponsavelNome={setEditResponsavelNome}
        editResponsavelTelefone={editResponsavelTelefone}
        setEditResponsavelTelefone={setEditResponsavelTelefone}
        editResponsavelParentesco={editResponsavelParentesco}
        setEditResponsavelParentesco={setEditResponsavelParentesco}
        editError={editError}
        isPending={isPending}
        onSave={handleSaveEdit}
        editDentistaId={editDentistaId}
        setEditDentistaId={setEditDentistaId}
        dentistasClinica={role === 'secretaria' ? dentistasClinica : null}
      />

      <DetalheOrcamentoModal
        detalheOrc={detalheOrc}
        detalheOrcId={detalheOrcId}
        pacienteTelefone={displayTelefone}
        pacienteNome={displayNome}
        onClose={() => {
          setDetalheOrcId(null);
          setPagError(null);
          setOrcEditMode(false);
          setOrcEditError(null);
          setPagForm({ valor: '', formaPagamento: 'pix', data: new Date().toISOString().split('T')[0], dataVencimento: '' });
          setClosingPagamentoId(null);
          setEditingPagId(null);
          setEditPagError(null);
          setConfirmDeletePagId(null);
          setParcelasMode(false);
          setParcelasForm({ numero: '3', primeiroVencimento: '' });
          setParcelasError(null);
        }}
        pagForm={pagForm}
        setPagForm={setPagForm}
        pagSaving={pagSaving}
        pagError={pagError}
        parcelasMode={parcelasMode}
        setParcelasMode={setParcelasMode}
        parcelasForm={parcelasForm}
        setParcelasForm={setParcelasForm}
        parcelasSaving={parcelasSaving}
        parcelasError={parcelasError}
        onGerarParcelas={handleGerarParcelas}
        orcEditMode={orcEditMode}
        setOrcEditMode={setOrcEditMode}
        orcEditItens={orcEditItens}
        setOrcEditItens={setOrcEditItens}
        orcEditSaving={orcEditSaving}
        orcEditError={orcEditError}
        setOrcEditError={setOrcEditError}
        onOpenEditOrc={handleOpenEditOrc}
        onSalvarEdicaoOrc={handleSalvarEdicaoOrc}
        onStatusChange={handleStatusChange}
        onToggleMostrarValorPorItem={handleToggleMostrarValorPorItem}
        onRegistrarPagamento={closingPagamentoId ? handleFecharPagamento : handleRegistrarPagamento}
        closingPagamentoId={closingPagamentoId}
        onIniciarFechamentoPagamento={handleIniciarFechamentoPagamento}
        onCancelarFechamentoPagamento={handleCancelarFechamentoPagamento}
        onDeleteClick={setConfirmDeleteOrcId}
        editingPagId={editingPagId}
        editPagForm={editPagForm}
        setEditPagForm={setEditPagForm}
        editPagSaving={editPagSaving}
        editPagError={editPagError}
        onIniciarEdicaoPagamento={handleIniciarEdicaoPagamento}
        onCancelarEdicaoPagamento={() => { setEditingPagId(null); setEditPagError(null); }}
        onSalvarEdicaoPagamento={handleSalvarEdicaoPagamento}
        confirmDeletePagId={confirmDeletePagId}
        setConfirmDeletePagId={setConfirmDeletePagId}
        pagDeleteSaving={pagDeleteSaving}
        onExcluirPagamento={handleExcluirPagamento}
        onAceiteRegistrado={() => {
          // R-03c-1: o snapshot real (cro_no_ato, termos exatos) é montado no servidor —
          // busca de novo em vez de aproximar no client, mesma disciplina do handleStatusChange.
          toast.success('Aceite do paciente registrado.');
          router.refresh();
        }}
      />

      <ConfirmarDeleteOrcModal
        confirmDeleteOrcId={confirmDeleteOrcId}
        onOpenChange={(open) => { if (!open) { setConfirmDeleteOrcId(null); setOrcDeleteError(null); } }}
        orcDeleteSaving={orcDeleteSaving}
        orcDeleteError={orcDeleteError}
        onExcluir={handleExcluirOrc}
      />

      <ExcluirPacienteModal
        open={excluirPacienteAberto}
        onOpenChange={(open) => { setExcluirPacienteAberto(open); if (!open) setExcluirPacienteError(null); }}
        pacienteNome={displayNome}
        saving={excluindoPaciente}
        error={excluirPacienteError}
        onExcluir={handleExcluirPaciente}
      />

      <MarcarRetornoModal
        open={isMarcarRetornoOpen}
        onOpenChange={(open) => {
          setIsMarcarRetornoOpen(open);
          if (!open) setRetornoError(null);
        }}
        pacienteNome={displayNome}
        dentistaId={dentistaId}
        form={retornoForm}
        setForm={setRetornoForm}
        error={retornoError}
        saving={retornoSaving}
        onMarcarRetorno={handleMarcarRetorno}
      />

      <EmitirDocumentoModal
        open={isEmitirOpen}
        onClose={() => setIsEmitirOpen(false)}
        patientId={paciente.id}
        patientName={displayNome}
      />

      <NovoOrcamentoModal
        open={isNovoOrcOpen}
        onOpenChange={(open) => {
          setIsNovoOrcOpen(open);
          if (!open) {
            setEtapaNovoOrc('itens'); setFichasParaOrc([]); setOrcError(null); setNovoOrcValorFinal(null);
            setNovoOrcPlanoForma(null); setNovoOrcNumParcelas('3'); setNovoOrcPrimeiroVencimento(''); setNovoOrcParcelasForma('');
            setFiltroResponsavelOrc(null);
          }
        }}
        etapaNovoOrc={etapaNovoOrc}
        setEtapaNovoOrc={setEtapaNovoOrc}
        fichasParaOrc={fichasParaOrc}
        responsaveisOrc={responsaveisOrc}
        meuDentistaId={dentistaId}
        filtroResponsavelOrc={filtroResponsavelOrc}
        onFiltroResponsavelOrcChange={handleFiltroResponsavelOrc}
        orcError={orcError}
        novoOrcItens={novoOrcItens}
        setNovoOrcItens={setNovoOrcItens}
        procedimentosClinica={procedimentosClinica}
        novoOrcSubtotal={novoOrcSubtotal}
        novoOrcTotal={novoOrcTotal}
        novoOrcValorFinal={novoOrcValorFinal}
        setNovoOrcValorFinal={setNovoOrcValorFinal}
        orcSaving={orcSaving}
        onCriarOrcamento={handleCriarOrcamento}
        onSelecionarFicha={selecionarFichaParaOrc}
        onCadastrarProcedimento={(idx) => void handleCadastrarProcedimento(idx)}
        registeringProcIdx={registeringProcIdx}
        isSecretaria={role === 'secretaria'}
        dentistasClinica={dentistasClinica}
        dentistaAlvoId={novoOrcDentistaAlvoId}
        onDentistaAlvoChange={setNovoOrcDentistaAlvoId}
        planoForma={novoOrcPlanoForma}
        setPlanoForma={setNovoOrcPlanoForma}
        planoNumParcelas={novoOrcNumParcelas}
        setPlanoNumParcelas={setNovoOrcNumParcelas}
        planoPrimeiroVencimento={novoOrcPrimeiroVencimento}
        setPlanoPrimeiroVencimento={setNovoOrcPrimeiroVencimento}
        planoParcelasForma={novoOrcParcelasForma}
        setPlanoParcelasForma={setNovoOrcParcelasForma}
      />
    </PageContainer>
  );
}

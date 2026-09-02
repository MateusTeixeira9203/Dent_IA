'use client';

// R-46h — extraído de paciente-detail-client.tsx (comportamento idêntico, motor movido, não
// reescrito) pra ser compartilhado com o Meu dia. Fica aqui (não em meu-dia/) porque é código
// de orçamento, não de Meu dia nem de paciente especificamente — mesmo raciocínio de
// corpo-especialidade.tsx (R-58).
//
// Meu dia é dentista-only (page.tsx redireciona secretaria) — os campos isSecretaria/
// dentistasClinica só fazem sentido pra tela do paciente. Meu dia sempre passa
// isSecretaria=false e dentistasClinica=[].
//
// onOrcamentoCriado é opcional: só a tela do paciente mantém uma lista local de orçamentos
// (orcamentosState) que precisa do item novo pra atualizar sem esperar um reload. Meu dia não
// tem essa lista — não passa nada, o callback nunca é chamado.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  criarOrcamento,
  adicionarItensAoOrcamento,
  criarProcedimentoRapido,
  gerarParcelas,
  definirPlanoAvista,
  type FormaPagamento,
} from '@/app/dashboard/orcamentos/actions';
import { parseValorBR, formatValorBR } from '@/lib/valor-br';
import {
  stripDenteDoNome, denteLabel,
  ARCH_SUPERIOR, ARCH_INFERIOR, ARCH_COMPLETA,
  QUAD_SUP_DIREITO, QUAD_SUP_ESQUERDO, QUAD_INF_DIREITO, QUAD_INF_ESQUERDO,
} from '@/lib/arcadas';
import { TIPO_LABEL } from '@/types/odontograma';
import { eventosVisiveis, FILTRO_MEUS } from '@/lib/fichas/filtro-responsavel';
import type { NovoOrcamentoModalProps } from './modals/novo-orcamento-modal';
import type {
  FichaParaOrc, EventoOdontogramaParaOrc, ProcedimentoClinica, NovoOrcItem, OrcamentoComItens,
} from './types';

export interface UseOrcamentoModalInput {
  pacienteId: string;
  clinicaId: string;
  meuDentistaId: string;
  procedimentosClinica: ProcedimentoClinica[];
  isSecretaria: boolean;
  dentistasClinica: { id: string; nome: string }[];
  /** Só quem mantém uma lista local de orçamentos (tela do paciente) precisa disto — chamado
   *  com o orçamento otimista recém-criado. Meu dia não passa nada. */
  onOrcamentoCriado?: (orcamento: OrcamentoComItens) => void;
}

export interface UseOrcamentoModalResult {
  abrirNovoOrcamento: () => Promise<void>;
  abrirOrcamentoParaFicha: (fichaId: string) => Promise<void>;
  /** NOVO (R-46h) — só o Meu dia usa: abre direto no passo 'selecionar', pulando o "geral vs.
   *  por-ficha" que a tela do paciente precisa porque lá não há paciente já óbvio de antemão.
   *  R-83 (08/08) — `eventosRascunho`: itens indicados no rascunho ainda não salvo desta
   *  sessão. Quando presente, PULA a etapa 'selecionar' direto pra 'itens' — ele já sabe o que
   *  quer orçar, é o que acabou de ditar (achado dele: sem isto só dava pra orçar depois de
   *  salvar, e salvar avança pro próximo paciente — R-76). R-84 §5.2 — não junta mais com o
   *  agregado do banco (era o vazamento de pendência já vendida na avaliação).
   *  R-85 (08/08) — `fichaId`: quando vem de `eventosRascunho`, o chamador (meu-dia-client)
   *  já gravou a ficha antes de chegar aqui (senão o orçamento nascia com `ficha_id=null`,
   *  sem nenhum registro clínico por trás). `null` só no caminho antigo sem rascunho (agrega
   *  fichas já existentes — nenhuma delas se beneficia de um fichaId único aqui). */
  abrirPickerFichasAbertas: (fichaId: string | null, eventosRascunho?: EventoOdontogramaParaOrc[]) => Promise<void>;
  isLoadingFichaParaOrc: boolean;
  modalProps: NovoOrcamentoModalProps;
}

const ITEM_VAZIO: NovoOrcItem = { procedimentoId: '', descricao: '', quantidade: 1, preco: '', eventoIds: [], origem: 'manual' };

type ModoPersistenciaOrcamento =
  | { tipo: 'novo' }
  | { tipo: 'adicionar'; orcamentoId: string };

type ResumoOrigemOrcamento = {
  disponiveis: number;
  deOutrosResponsaveis: number;
  responsaveis: string[];
};

const CAMPOS_FICHA_ORC =
  'id, created_at, data_atendimento, queixa_principal, dentes_afetados, dentes_observacoes, ' +
  'dentista_id, dentista:dentistas(nome)';
const CAMPOS_EVENTO_ORC =
  'id, tipo, procedimento_id, procedimento_nome, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, grupo_id, assinatura_id, observacao, ' +
  'encaminhado_para, encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey(nome)';
const SELECT_FICHA_PARA_ORC = `${CAMPOS_FICHA_ORC}, odontograma_eventos(${CAMPOS_EVENTO_ORC})`;
// R-130 — !inner mantém o agregado enxuto, mas a elegibilidade financeira não depende mais
// de status/assinatura: qualquer evento clínico da ficha pode virar item de orçamento.
const SELECT_FICHA_PARA_ORC_AGREGADO = `${CAMPOS_FICHA_ORC}, odontograma_eventos!inner(${CAMPOS_EVENTO_ORC})`;

export function useOrcamentoModal({
  pacienteId, clinicaId, meuDentistaId, procedimentosClinica, isSecretaria, dentistasClinica,
  onOrcamentoCriado,
}: UseOrcamentoModalInput): UseOrcamentoModalResult {
  const router = useRouter();

  const [isNovoOrcOpen, setIsNovoOrcOpen] = useState(false);
  const [isLoadingFichaParaOrc, setIsLoadingFichaParaOrc] = useState(false);
  const [fichasParaOrc, setFichasParaOrc] = useState<FichaParaOrc[]>([]);
  const [fichaOrcId, setFichaOrcId] = useState<string | null>(null);
  const [novoOrcItens, setNovoOrcItens] = useState<NovoOrcItem[]>([ITEM_VAZIO]);
  const [registeringProcIdx, setRegisteringProcIdx] = useState<number | null>(null);
  const [orcSaving, setOrcSaving] = useState(false);
  const [orcError, setOrcError] = useState<string | null>(null);
  const [etapaNovoOrc, setEtapaNovoOrc] = useState<'selecionar' | 'itens'>('itens');
  const [novoOrcValorFinal, setNovoOrcValorFinal] = useState<number | null>(null);
  const [novoOrcDentistaAlvoId, setNovoOrcDentistaAlvoId] = useState('');
  const [modoPersistencia, setModoPersistencia] = useState<ModoPersistenciaOrcamento>({ tipo: 'novo' });
  const [eventoIdsJaOrcados, setEventoIdsJaOrcados] = useState<Set<string>>(() => new Set());
  const [resumoOrigemOrcamento, setResumoOrigemOrcamento] = useState<ResumoOrigemOrcamento | null>(null);
  // Pré-seleciona o 1º dentista da lista assim que ela chega — só quando ainda vazio, nunca
  // sobrescreve uma escolha manual já feita (o pai só popula `dentistasClinica` quando
  // isSecretaria; dentista comum nunca aciona isto, `dentistasClinica` fica sempre []).
  useEffect(() => {
    if (!novoOrcDentistaAlvoId && dentistasClinica.length > 0) {
      setNovoOrcDentistaAlvoId(dentistasClinica[0].id);
    }
  }, [dentistasClinica, novoOrcDentistaAlvoId]);
  // R-34 — forma de pagamento já na criação (reduz a fricção de ter os dois passos).
  const [novoOrcPlanoForma, setNovoOrcPlanoForma] = useState<'avista' | 'parcelado' | null>(null);
  const [novoOrcNumParcelas, setNovoOrcNumParcelas] = useState('3');
  const [novoOrcPrimeiroVencimento, setNovoOrcPrimeiroVencimento] = useState('');
  const [novoOrcParcelasForma, setNovoOrcParcelasForma] = useState<FormaPagamento | ''>('');

  const novoOrcSubtotal = useMemo(
    () => novoOrcItens
      .filter((item) => item.selecionado !== false)
      .reduce((s, i) => s + i.quantidade * parseValorBR(i.preco), 0),
    [novoOrcItens]
  );
  const novoOrcTotal = useMemo(
    () => novoOrcValorFinal !== null ? Math.max(0, novoOrcValorFinal) : novoOrcSubtotal,
    [novoOrcSubtotal, novoOrcValorFinal]
  );

  // Cadastro rápido (handleCadastrarProcedimento, abaixo) precisa refletir no catálogo usado
  // por ESTE modal na mesma sessão — sem isso, o item recém-criado não aparece pro match de
  // itensDoTexto/matchProcedimentoPorTipo até um reload. `procedimentosClinica` é só leitura
  // (prop, o pai que é dono do catálogo de verdade); o que o cadastro rápido cria mora aqui,
  // mesclado por cima — nenhum acesso de escrita ao estado do pai é necessário.
  const [procedimentosCadastradosAgora, setProcedimentosCadastradosAgora] = useState<ProcedimentoClinica[]>([]);
  const procedimentosClinicaCompleto = useMemo(
    () => [...procedimentosClinica, ...procedimentosCadastradosAgora].sort((a, b) => a.nome.localeCompare(b.nome)),
    [procedimentosClinica, procedimentosCadastradosAgora]
  );

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

  // Match no catálogo pelo RÓTULO CANÔNICO do tipo (TIPO_LABEL), nunca por texto livre — é o
  // texto livre que fazia a mesma coisa dita de 2 jeitos virar 2 itens de orçamento diferentes.
  const matchProcedimentoPorTipo = (tipo: EventoOdontogramaParaOrc['tipo']) => {
    const rotulo = TIPO_LABEL[tipo].toLowerCase();
    return procedimentosClinicaCompleto.find(
      (p) => p.nome.toLowerCase().includes(rotulo) || rotulo.includes(p.nome.toLowerCase()),
    );
  };

  /**
   * R-30 Parte 4 — FALLBACK de texto: o evento ganha quando existe, o texto entra só quando
   * não há nenhum evento elegível. Lógica idêntica à que está em produção, código preservado
   * como rede (82 de 87 fichas medidas tinham só texto, sem evento).
   */
  const itensDoTexto = (ficha: FichaParaOrc): NovoOrcItem[] => {
    const dentes = ficha.dentes_afetados ?? [];
    const obs = ficha.dentes_observacoes ?? {};
    if (dentes.length === 0) return [ITEM_VAZIO];

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
      const match = procedimentosClinicaCompleto.find(
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
        eventoIds: [],
        origem: 'legado',
      };
    });
  };

  // R-130 — fonte única da elegibilidade: evento clínico pode ser cobrado tenha sido ele
  // planejado ou realizado. Pré-existente é histórico; vínculo existente evita duplicidade.
  const eventoPodeEntrarNoOrcamento = (
    evento: EventoOdontogramaParaOrc,
    idsJaOrcados: ReadonlySet<string>,
  ) => evento.origem === 'clinica' && !idsJaOrcados.has(evento.id);

  const eventosParaItens = (
    eventos: EventoOdontogramaParaOrc[],
    idsJaOrcados: ReadonlySet<string> = eventoIdsJaOrcados,
  ): NovoOrcItem[] => {
    const elegiveis = eventos.filter((ev) => eventoPodeEntrarNoOrcamento(ev, idsJaOrcados));
    if (elegiveis.length === 0) return [];

    const grupos = new Map<string, EventoOdontogramaParaOrc[]>();
    for (const ev of elegiveis) {
      const chave = `${ev.tipo}|${ev.grupo_id ?? ev.id}`;
      const arr = grupos.get(chave);
      if (arr) arr.push(ev); else grupos.set(chave, [ev]);
    }

    return Array.from(grupos.values()).map((grupoEventos) => {
      const primeiro = grupoEventos[0];
      const catalogoVinculado = primeiro.procedimento_id
        ? procedimentosClinica.find((procedimento) => procedimento.id === primeiro.procedimento_id)
        : undefined;
      const match = catalogoVinculado ?? matchProcedimentoPorTipo(primeiro.tipo);
      const rotulo = primeiro.procedimento_nome?.trim()
        || (primeiro.tipo === 'outro' ? primeiro.observacao?.trim() : null)
        || TIPO_LABEL[primeiro.tipo];

      const dentesDistintos = [
        ...new Set(grupoEventos.map((ev) => ev.dente).filter((d): d is number => d != null)),
      ];
      const sentinel = sentinelDaAncora(primeiro);

      const quantidade = dentesDistintos.length > 0 ? dentesDistintos.length : 1;
      const alcance =
        sentinel != null
          ? denteLabel(sentinel)
          : dentesDistintos.length > 0
            ? `D${dentesDistintos.join(', D')}`
            : '';

      const pilares = grupoEventos
        .filter((ev) => ev.papel_no_grupo === 'pilar' && ev.dente != null)
        .map((ev) => `D${ev.dente}`);
      const ponticos = grupoEventos
        .filter((ev) => ev.papel_no_grupo === 'pontico' && ev.dente != null)
        .map((ev) => `D${ev.dente}`);
      const descricaoPonte = primeiro.tipo === 'ponte'
        ? `${match?.nome ?? 'Ponte fixa'} — pilares ${pilares.join(' e ') || alcance} · ${ponticos.length === 1 ? 'pôntico' : 'pônticos'} ${ponticos.join(', ') || alcance}`
        : null;

      return {
        procedimentoId: primeiro.procedimento_id ?? match?.id ?? '',
        descricao: descricaoPonte ?? (alcance ? `${rotulo} — ${alcance}` : rotulo),
        quantidade,
        preco: match?.preco_padrao != null ? formatValorBR(match.preco_padrao) : '',
        eventoIds: grupoEventos.map((evento) => evento.id),
        origem: 'evento',
      };
    });
  };

  // R-53 (§2.1, X1) — adapta o evento cru pro shape que filtro-responsavel.ts espera.
  const paraResponsavel = (ev: EventoOdontogramaParaOrc) => ({
    encaminhadoPara: ev.encaminhado_para
      ? { id: ev.encaminhado_para, nome: ev.encaminhado_dentista?.nome ?? 'Dentista' }
      : null,
  });

  // R-53 — flatten de N fichas (o agregado) pro filtro de responsável + eventosParaItens.
  const itensDoAgregado = (
    fichas: FichaParaOrc[],
    alvoDentistaId: string,
    idsJaOrcados: ReadonlySet<string> = eventoIdsJaOrcados,
  ): NovoOrcItem[] => {
    const itens = fichas.flatMap((f) => {
      const eventosComResponsavel = (f.odontograma_eventos ?? []).map((ev) => ({ ...ev, ...paraResponsavel(ev) }));
      const visiveis = eventosVisiveis(eventosComResponsavel, f.dentista_id, FILTRO_MEUS, alvoDentistaId);
      return eventosParaItens(visiveis, idsJaOrcados);
    });
    return itens.length > 0 ? itens : [ITEM_VAZIO];
  };

  // R-125b — a ficha pode ter eventos encaminhados de outro autor. A consulta no banco vem
  // completa e a responsabilidade é resolvida aqui, por evento; filtrar `fichas.dentista_id`
  // na query esconderia justamente os encaminhados corretos.
  const fichaParaItens = (
    ficha: FichaParaOrc,
    alvoDentistaId: string,
    idsJaOrcados: ReadonlySet<string> = eventoIdsJaOrcados,
  ): NovoOrcItem[] => {
    const eventos = ficha.odontograma_eventos ?? [];
    const visiveis = eventosVisiveis(
      eventos.map((ev) => ({ ...ev, ...paraResponsavel(ev) })),
      ficha.dentista_id,
      FILTRO_MEUS,
      alvoDentistaId,
    );
    const itens = eventosParaItens(visiveis, idsJaOrcados);
    // Texto legado só é fonte quando não há evento algum. Nunca troca uma lista de eventos
    // invisíveis/indisponíveis por descrição antiga como se fosse procedimento cobravel.
    return itens.length > 0 ? itens : eventos.length === 0 ? itensDoTexto(ficha) : [];
  };

  /** O banco já barra evento de outro responsável. Este resumo apenas deixa a regra visível
   * antes do dentista editar preços ou tentar salvar o orçamento. */
  const resumoDaFichaParaOrcamento = (
    ficha: FichaParaOrc,
    alvoDentistaId: string,
    idsJaOrcados: ReadonlySet<string> = eventoIdsJaOrcados,
  ): ResumoOrigemOrcamento | null => {
    const eventos = ficha.odontograma_eventos ?? [];
    if (eventos.length === 0) return null;
    const eventosComResponsavel = eventos.map((ev) => ({ ...ev, ...paraResponsavel(ev) }));
    const visiveis = eventosVisiveis(eventosComResponsavel, ficha.dentista_id, FILTRO_MEUS, alvoDentistaId);
    const idsVisiveis = new Set(visiveis.map((ev) => ev.id));
    const candidatos = eventos.filter((ev) => ev.origem === 'clinica' && !idsJaOrcados.has(ev.id));
    const deOutros = candidatos.filter((ev) => !idsVisiveis.has(ev.id));
    const responsaveis = [...new Set(deOutros.map((ev) => ev.encaminhado_dentista?.nome ?? ficha.dentista?.nome ?? 'outro dentista'))];
    return {
      disponiveis: candidatos.length - deOutros.length,
      deOutrosResponsaveis: deOutros.length,
      responsaveis,
    };
  };

  const alvoAtual = () => isSecretaria
    ? (novoOrcDentistaAlvoId || dentistasClinica[0]?.id || '')
    : meuDentistaId;

  const carregarEventoIdsJaOrcados = async (
    fichas: FichaParaOrc[],
    eventosExtras: EventoOdontogramaParaOrc[] = [],
  ): Promise<Set<string>> => {
    const eventoIds = [
      ...fichas.flatMap((ficha) => (ficha.odontograma_eventos ?? []).map((evento) => evento.id)),
      ...eventosExtras.map((evento) => evento.id),
    ];
    const idsUnicos = [...new Set(eventoIds)];
    if (idsUnicos.length === 0) return new Set();

    const supabase = createClient();
    const { data, error } = await supabase
      .from('orcamento_eventos')
      .select('evento_id')
      .eq('clinica_id', clinicaId)
      .in('evento_id', idsUnicos);
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((row) => row.evento_id));
  };

  /** R-135 — uma ficha pode ter orçamento já criado. Nunca escolhe um legado duplicado sozinho. */
  const carregarModoDaFicha = async (fichaId: string, dentistaId: string): Promise<ModoPersistenciaOrcamento> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('orcamentos')
      .select('id')
      .eq('ficha_id', fichaId)
      .eq('paciente_id', pacienteId)
      .eq('clinica_id', clinicaId)
      .eq('dentista_id', dentistaId)
      .limit(2);
    if (error) throw new Error(error.message);
    if ((data ?? []).length > 1) {
      throw new Error('Há mais de um orçamento desta ficha. Abra o orçamento que deseja ajustar na aba Orçamentos.');
    }
    return data?.[0] ? { tipo: 'adicionar', orcamentoId: data[0].id } : { tipo: 'novo' };
  };

  const handleDentistaAlvoChange = (id: string) => {
    setNovoOrcDentistaAlvoId(id);
    // Só o fluxo agregado da ficha usa `itensDoAgregado`. O Meu dia e o fallback de uma
    // ficha preservam seus itens próprios — trocar o select nunca pode reinterpretá-los.
    if (isSecretaria && fichaOrcId === null && etapaNovoOrc === 'itens') {
      setNovoOrcItens(itensDoAgregado(fichasParaOrc, id, eventoIdsJaOrcados));
    }
    if (isSecretaria && fichaOrcId !== null && etapaNovoOrc === 'itens') {
      const ficha = fichasParaOrc.find((item) => item.id === fichaOrcId);
      if (ficha) {
        const itens = fichaParaItens(ficha, id, eventoIdsJaOrcados);
        setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
        setResumoOrigemOrcamento(resumoDaFichaParaOrcamento(ficha, id, eventoIdsJaOrcados));
      }
      void carregarModoDaFicha(fichaOrcId, id)
        .then(setModoPersistencia)
        .catch((error: unknown) => {
          setModoPersistencia({ tipo: 'novo' });
          setOrcError(error instanceof Error ? error.message : 'Não foi possível localizar o orçamento desta ficha.');
        });
    }
  };

  // R-130 — busca única do agregado: todos os eventos clínicos do paciente, reusada pelos
  // pontos de entrada que agregam. A responsabilidade continua resolvida em JS.
  const carregarFichasAgregado = async (): Promise<FichaParaOrc[]> => {
    const supabase = createClient();
    const query = supabase
      .from('fichas')
      .select(SELECT_FICHA_PARA_ORC_AGREGADO)
      .eq('paciente_id', pacienteId)
      .eq('clinica_id', clinicaId)
      .eq('odontograma_eventos.origem', 'clinica');
    const { data, error } = await query.order('data_atendimento', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as unknown as FichaParaOrc[]) ?? [];
  };

  const abrirNovoOrcamento = async () => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const agregado = await carregarFichasAgregado();
      const idsJaOrcados = await carregarEventoIdsJaOrcados(agregado);
      setEventoIdsJaOrcados(idsJaOrcados);

      if (agregado.length > 0) {
        // fichaOrcId fica null — o orçamento não pertence mais a 1 ficha só (I6). O alvo é o
        // próprio dentista ou, para secretária, o dentista selecionado no campo obrigatório.
        const alvoId = alvoAtual();
        setFichasParaOrc(agregado);
        // Uma única ficha é um caso não ambíguo: mantém a relação orçamento↔ficha e, se já
        // existir uma proposta nela, passa ao modo de acrescentar. Com várias fichas, a origem
        // é agregada e um novo orçamento continua sendo o comportamento correto.
        if (agregado.length === 1) {
          setFichaOrcId(agregado[0].id);
          setModoPersistencia(await carregarModoDaFicha(agregado[0].id, alvoId));
          const itens = fichaParaItens(agregado[0], alvoId, idsJaOrcados);
          setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
          setResumoOrigemOrcamento(resumoDaFichaParaOrcamento(agregado[0], alvoId, idsJaOrcados));
        } else {
          setFichaOrcId(null);
          setModoPersistencia({ tipo: 'novo' });
          setNovoOrcItens(itensDoAgregado(agregado, alvoId, idsJaOrcados));
          setResumoOrigemOrcamento(null);
        }
        setEtapaNovoOrc('itens');
      } else {
        // G4 — fallback INTACTO: nenhum indicado aberto em ficha nenhuma. Mesmo comportamento
        // de antes do R-53 (10 fichas recentes, decide selecionar vs. texto).
        const supabase = createClient();
        const { data, error } = await supabase
          .from('fichas')
          .select(SELECT_FICHA_PARA_ORC)
          .eq('paciente_id', pacienteId)
          .eq('clinica_id', clinicaId)
          .order('data_atendimento', { ascending: false })
          .limit(10);
        if (error) throw new Error(error.message);

        const fichas = (data as unknown as FichaParaOrc[]) ?? [];
        const idsJaOrcadosFallback = await carregarEventoIdsJaOrcados(fichas);
        setEventoIdsJaOrcados(idsJaOrcadosFallback);
        setFichasParaOrc(fichas);

        if (fichas.length > 1) {
          setFichaOrcId(null);
          setEtapaNovoOrc('selecionar');
          setNovoOrcItens([ITEM_VAZIO]);
          setResumoOrigemOrcamento(null);
        } else {
          setFichaOrcId(fichas.length === 1 ? fichas[0].id : null);
          if (fichas.length === 1) {
            setModoPersistencia(await carregarModoDaFicha(fichas[0].id, alvoAtual()));
          } else {
            setModoPersistencia({ tipo: 'novo' });
          }
          const itens = fichas.length === 1
            ? fichaParaItens(fichas[0], alvoAtual(), idsJaOrcadosFallback)
            : [];
          setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
          setResumoOrigemOrcamento(fichas.length === 1
            ? resumoDaFichaParaOrcamento(fichas[0], alvoAtual(), idsJaOrcadosFallback)
            : null);
          setEtapaNovoOrc('itens');
        }
      }
    } catch (error: unknown) {
      setFichasParaOrc([]);
      setFichaOrcId(null);
      setNovoOrcItens([ITEM_VAZIO]);
      setResumoOrigemOrcamento(null);
      setEtapaNovoOrc('itens');
      setOrcError(error instanceof Error ? error.message : 'Não foi possível carregar os procedimentos indicados. Tente novamente antes de criar o orçamento.');
    } finally {
      setIsLoadingFichaParaOrc(false);
    }
    setIsNovoOrcOpen(true);
  };

  // NOVO (R-46h) — picker geral do Meu dia: pula direto pro passo 'selecionar', sem o "geral
  // vs. por-ficha" que abrirNovoOrcamento tem, porque aqui o paciente já é o do slot aberto.
  // R-83 (08/08) — com `eventosRascunho`, pula direto pra 'itens': o rascunho é sempre do
  // dentista logado (Meu dia é dele), por isso entra fixo em FILTRO_MEUS.
  // R-84 §5.2 — NÃO junta mais com o agregado do banco (era o vazamento: `indicado` em aberto
  // aqui quer dizer "já vendido na avaliação", não "esquecido" — R-53 §2.2). `carregarFichasAgregado`
  // continua chamado: `fichasParaOrc` alimenta o `← Voltar` (§5.3), o caminho manual pro backlog.
  const abrirPickerFichasAbertas = async (fichaId: string | null, eventosRascunho: EventoOdontogramaParaOrc[] = []) => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const fichas = await carregarFichasAgregado();
      const idsJaOrcados = await carregarEventoIdsJaOrcados(fichas, eventosRascunho);
      setEventoIdsJaOrcados(idsJaOrcados);
      setFichasParaOrc(fichas);
      // R-85 — antes sempre null (o orçamento nascia órfão). Agora recebe o id real que o
      // chamador já garantiu existir quando há algo novo do rascunho pra orçar.
      setFichaOrcId(fichaId);
      setModoPersistencia({ tipo: 'novo' });

      if (eventosRascunho.length > 0) {
        const itens = eventosParaItens(eventosRascunho, idsJaOrcados);
        setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
        setResumoOrigemOrcamento(null);
        setEtapaNovoOrc('itens');
      } else {
        setEtapaNovoOrc('selecionar');
      }
    } catch {
      setFichasParaOrc([]);
      setOrcError('Não deu pra carregar as fichas em aberto.');
    } finally {
      setIsLoadingFichaParaOrc(false);
    }
    setIsNovoOrcOpen(true);
  };

  const selecionarFichaParaOrc = async (fichaId: string | null) => {
    setFichaOrcId(fichaId);
    if (!fichaId) {
      setModoPersistencia({ tipo: 'novo' });
      setNovoOrcItens([ITEM_VAZIO]);
      setResumoOrigemOrcamento(null);
    } else {
      const ficha = fichasParaOrc.find((f) => f.id === fichaId);
      try {
        setModoPersistencia(await carregarModoDaFicha(fichaId, alvoAtual()));
      } catch (error: unknown) {
        setModoPersistencia({ tipo: 'novo' });
        setOrcError(error instanceof Error ? error.message : 'Não foi possível localizar o orçamento desta ficha.');
        return;
      }
      const itens = ficha ? fichaParaItens(ficha, alvoAtual(), eventoIdsJaOrcados) : [];
      setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
      setResumoOrigemOrcamento(ficha ? resumoDaFichaParaOrcamento(ficha, alvoAtual(), eventoIdsJaOrcados) : null);
    }
    setEtapaNovoOrc('itens');
  };

  // #6 — gerar orçamento a partir de uma ficha é SÓ dela (decisão 07/08): nunca puxa outra
  // ficha nem outro dentista. Quem quer ver várias fichas juntas usa o picker (agrega).
  const abrirOrcamentoParaFicha = async (fichaId: string) => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const supabase = createClient();
      const query = supabase
        .from('fichas')
        .select(SELECT_FICHA_PARA_ORC)
        .eq('id', fichaId)
        .eq('clinica_id', clinicaId);
      const { data, error } = await query.single();
      if (error) throw new Error(error.message);
      const ficha = data as unknown as FichaParaOrc | null;
      const idsJaOrcados = await carregarEventoIdsJaOrcados(ficha ? [ficha] : []);
      setEventoIdsJaOrcados(idsJaOrcados);
      setFichaOrcId(fichaId);
      setFichasParaOrc(ficha ? [ficha] : []);
      setModoPersistencia(await carregarModoDaFicha(fichaId, alvoAtual()));
      const itens = ficha ? fichaParaItens(ficha, alvoAtual(), idsJaOrcados) : [];
      setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
      setResumoOrigemOrcamento(ficha ? resumoDaFichaParaOrcamento(ficha, alvoAtual(), idsJaOrcados) : null);
    } catch (error: unknown) {
      setFichaOrcId(fichaId);
      setFichasParaOrc([]);
      setModoPersistencia({ tipo: 'novo' });
      setNovoOrcItens([ITEM_VAZIO]);
      setResumoOrigemOrcamento(null);
      setOrcError(error instanceof Error ? error.message : 'Não foi possível localizar o orçamento desta ficha.');
    } finally {
      setEtapaNovoOrc('itens');
      setIsLoadingFichaParaOrc(false);
    }
    setIsNovoOrcOpen(true);
  };

  // Cadastra no catálogo um procedimento digitado que não bateu com nenhum item existente.
  const handleCadastrarProcedimento = async (idx: number) => {
    const item = novoOrcItens[idx];
    const nome = stripDenteDoNome(item.descricao);
    if (!nome) return;
    setRegisteringProcIdx(idx);
    const precoNum = parseValorBR(item.preco);
    const result = await criarProcedimentoRapido({
      nome,
      precoPadrao: precoNum > 0 ? precoNum : null,
      dentistaId: isSecretaria ? novoOrcDentistaAlvoId : undefined,
    });
    if (result.error || !result.id) {
      toast.error(result.error ?? 'Não foi possível cadastrar o procedimento.');
    } else {
      const novoId = result.id;
      setProcedimentosCadastradosAgora((prev) => [...prev, { id: novoId, nome, preco_padrao: precoNum > 0 ? precoNum : null }]);
      setNovoOrcItens((prev) => prev.map((it, i) => (i === idx ? { ...it, procedimentoId: novoId } : it)));
      toast.success('Procedimento cadastrado no catálogo.');
    }
    setRegisteringProcIdx(null);
  };

  const handleCriarOrcamento = async () => {
    const itensValidos = novoOrcItens.filter((i) => i.selecionado !== false && i.descricao.trim());
    if (itensValidos.length === 0) {
      setOrcError('Adicione ao menos um procedimento com descrição.');
      return;
    }
    const temSemPreco = itensValidos.some((i) => parseValorBR(i.preco) === 0);
    if (temSemPreco) {
      setOrcError('Atenção: alguns procedimentos estão sem valor. Defina o preço antes de continuar.');
      return;
    }
    if (isSecretaria && !novoOrcDentistaAlvoId) {
      setOrcError('Selecione o dentista responsável.');
      return;
    }
    const numeroParcelas = parseInt(novoOrcNumParcelas, 10);
    if (modoPersistencia.tipo === 'novo' && novoOrcPlanoForma === 'parcelado' && (!numeroParcelas || numeroParcelas < 2 || numeroParcelas > 24)) {
      setOrcError('Informe entre 2 e 24 parcelas.');
      return;
    }
    if (modoPersistencia.tipo === 'novo' && novoOrcPlanoForma === 'parcelado' && !novoOrcPrimeiroVencimento) {
      setOrcError('Informe o primeiro vencimento das parcelas.');
      return;
    }
    setOrcError(null);
    setOrcSaving(true);

    const subtotalValido = itensValidos.reduce((s, i) => s + i.quantidade * parseValorBR(i.preco), 0);
    const finalValido    = novoOrcValorFinal !== null ? Math.max(0, novoOrcValorFinal) : subtotalValido;
    const descontoValor  = Math.max(0, Math.round((subtotalValido - finalValido) * 100) / 100);

    const itensParaSalvar = itensValidos.map((i) => ({
      procedimentoId: i.procedimentoId || null,
      descricao: i.descricao,
      quantidade: i.quantidade,
      precoUnitario: parseValorBR(i.preco),
      eventoIds: i.eventoIds ?? [],
    }));

    if (modoPersistencia.tipo === 'adicionar') {
      const result = await adicionarItensAoOrcamento({
        orcamentoId: modoPersistencia.orcamentoId,
        itens: itensParaSalvar,
      });
      if (result.error) {
        setOrcError(result.error);
      } else {
        setIsNovoOrcOpen(false);
        setNovoOrcItens([ITEM_VAZIO]);
        toast.success(`${itensValidos.length} procedimento${itensValidos.length === 1 ? '' : 's'} adicionado${itensValidos.length === 1 ? '' : 's'} ao orçamento.`);
        router.refresh();
      }
      setOrcSaving(false);
      return;
    }

    const result = await criarOrcamento({
      pacienteId,
      desconto: descontoValor,
      fichaId: fichaOrcId,
      dentistaId: isSecretaria ? novoOrcDentistaAlvoId : undefined,
      itens: itensParaSalvar,
    });

    if (result.error) {
      setOrcError(result.error);
    } else {
      const novoTotal = Math.max(0, subtotalValido - descontoValor);
      const novoOrc: OrcamentoComItens = {
        id: result.id ?? crypto.randomUUID(),
        status: 'rascunho',
        total: novoTotal,
        // R-114 — nasce null: sem plano de pagamento (R-34) ainda, o devido é derivado da
        // soma dos itens aprovados, não deste campo (I1).
        valor_acordado: null,
        desconto: descontoValor,
        created_at: new Date().toISOString(),
        validade_dias: 30,
        condicoes_pagamento: null,
        mostrar_valor_por_item: false,
        dentista_id: isSecretaria ? novoOrcDentistaAlvoId : meuDentistaId,
        itens: itensValidos.map((i, idx) => ({
          id: `temp-${idx}`,
          descricao: i.descricao,
          quantidade: i.quantidade,
          preco_total: i.quantidade * parseValorBR(i.preco),
          // R-114 — orçamento nasce Proposto: nenhum item aprovado ainda (mesmo default da
          // coluna no banco). É o dentista/secretária que marca o que o paciente aceitou.
          aprovado: false,
        })),
        pagamentos: [],
        cobrancas: [],
        aprovado_por: null,
        aprovado_em: null,
        aceite: null,
      };
      onOrcamentoCriado?.(novoOrc);
      setIsNovoOrcOpen(false);
      setNovoOrcItens([ITEM_VAZIO]);

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

  const modalProps: NovoOrcamentoModalProps = {
    open: isNovoOrcOpen,
    onOpenChange: (open) => {
      setIsNovoOrcOpen(open);
      if (!open) {
        setEtapaNovoOrc('itens'); setFichasParaOrc([]); setOrcError(null); setNovoOrcValorFinal(null);
        setModoPersistencia({ tipo: 'novo' });
        setEventoIdsJaOrcados(new Set());
        setResumoOrigemOrcamento(null);
        setNovoOrcPlanoForma(null); setNovoOrcNumParcelas('3'); setNovoOrcPrimeiroVencimento(''); setNovoOrcParcelasForma('');
      }
    },
    etapaNovoOrc,
    setEtapaNovoOrc,
    fichasParaOrc,
    // R-84 §5.3 — o picker oferece trocar de ficha; o caminho por-ficha (`abrirOrcamentoParaFicha`)
    // é deliberadamente fechado (decisão 07/08: "orçamento de uma ficha é SÓ dela"). `fichaOrcId`
    // sozinho não basta como discriminador: `selecionarFichaParaOrc` (a própria tela de seleção do
    // picker) TAMBÉM o preenche ao escolher uma ficha da lista, o que apagava o botão depois de
    // escolher — regressão achada pelo typescript-reviewer no gate deste item. `fichasParaOrc.length
    // > 1` cobre esse caso (o array não encolhe ao selecionar, só `fichaOrcId` muda); o segundo termo
    // cobre o picker com exatamente 1 ficha (G6b) sem reabrir o caminho por-ficha (que nunca tem mais
    // de 1 ficha no array, então o primeiro termo nunca o alcança).
    podeTrocarFicha: fichasParaOrc.length > 1 || (fichaOrcId == null && fichasParaOrc.length > 0),
    orcError,
    novoOrcItens,
    setNovoOrcItens,
    procedimentosClinica: procedimentosClinicaCompleto,
    novoOrcSubtotal,
    novoOrcTotal,
    novoOrcValorFinal,
    setNovoOrcValorFinal,
    orcSaving,
    modoPersistencia: modoPersistencia.tipo,
    resumoOrigemOrcamento,
    onCriarOrcamento: () => void handleCriarOrcamento(),
    onSelecionarFicha: selecionarFichaParaOrc,
    onCadastrarProcedimento: (idx) => void handleCadastrarProcedimento(idx),
    registeringProcIdx,
    isSecretaria,
    dentistasClinica,
    dentistaAlvoId: novoOrcDentistaAlvoId,
    onDentistaAlvoChange: handleDentistaAlvoChange,
    planoForma: novoOrcPlanoForma,
    setPlanoForma: setNovoOrcPlanoForma,
    planoNumParcelas: novoOrcNumParcelas,
    setPlanoNumParcelas: setNovoOrcNumParcelas,
    planoPrimeiroVencimento: novoOrcPrimeiroVencimento,
    setPlanoPrimeiroVencimento: setNovoOrcPrimeiroVencimento,
    planoParcelasForma: novoOrcParcelasForma,
    setPlanoParcelasForma: setNovoOrcParcelasForma,
  };

  return { abrirNovoOrcamento, abrirOrcamentoParaFicha, abrirPickerFichasAbertas, isLoadingFichaParaOrc, modalProps };
}

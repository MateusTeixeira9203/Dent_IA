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
import { derivarResponsaveis, eventosVisiveis, FILTRO_MEUS, type FiltroResponsavel } from '@/lib/fichas/filtro-responsavel';
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
  /** R-46h (achado ao vivo, 08/08) — o histórico de um paciente é compartilhado entre
   *  dentistas da clínica; sem isto, `carregarFichasAgregado`/`abrirOrcamentoParaFicha`
   *  deixam puxar procedimento indicado por um colega pro orçamento. Default false: a tela
   *  do paciente mantém o agregado compartilhado (decisão de 07/08, filtro de exibição por
   *  chip Todos/Meus). Meu dia passa true — lá "dinheiro nunca cruza dentista" é a regra. */
  restringirAoMeuDentista?: boolean;
}

export interface UseOrcamentoModalResult {
  abrirNovoOrcamento: () => Promise<void>;
  abrirOrcamentoParaFicha: (fichaId: string) => Promise<void>;
  /** NOVO (R-46h) — só o Meu dia usa: abre direto no passo 'selecionar', pulando o "geral vs.
   *  por-ficha" que a tela do paciente precisa porque lá não há paciente já óbvio de antemão.
   *  R-83 (08/08) — `eventosRascunho`: itens indicados no rascunho ainda não salvo desta
   *  sessão. Quando presente, junta com o agregado do banco e PULA a etapa 'selecionar' —
   *  ele já sabe o que quer orçar, é o que acabou de ditar (achado dele: sem isto só dava
   *  pra orçar depois de salvar, e salvar avança pro próximo paciente — R-76). */
  abrirPickerFichasAbertas: (eventosRascunho?: EventoOdontogramaParaOrc[]) => Promise<void>;
  isLoadingFichaParaOrc: boolean;
  modalProps: NovoOrcamentoModalProps;
}

const ITEM_VAZIO: NovoOrcItem = { procedimentoId: '', descricao: '', quantidade: 1, preco: '' };

const CAMPOS_FICHA_ORC =
  'id, created_at, data_atendimento, queixa_principal, dentes_afetados, dentes_observacoes, ' +
  'dentista_id, dentista:dentistas(nome)';
const CAMPOS_EVENTO_ORC =
  'id, tipo, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, grupo_id, assinatura_id, ' +
  'encaminhado_para, encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey(nome)';
const SELECT_FICHA_PARA_ORC = `${CAMPOS_FICHA_ORC}, odontograma_eventos(${CAMPOS_EVENTO_ORC})`;
// R-53 (§3) — !inner: só fichas com ≥1 evento indicado/não-assinado voltam, e o embed já vem
// filtrado pra esses eventos. Sem `.limit()` (medido: no máx. 6 fichas/paciente).
const SELECT_FICHA_PARA_ORC_AGREGADO = `${CAMPOS_FICHA_ORC}, odontograma_eventos!inner(${CAMPOS_EVENTO_ORC})`;

export function useOrcamentoModal({
  pacienteId, clinicaId, meuDentistaId, procedimentosClinica, isSecretaria, dentistasClinica,
  onOrcamentoCriado, restringirAoMeuDentista = false,
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
  // R-53 — filtro de exibição do orçamento agregado (X1: mesma lib da ficha, config própria —
  // default Todos, porque o dinheiro é da clínica, não do dentista). Nunca decide o que é
  // gravado (I4) — só quais itens de `fichasParaOrc` viram `novoOrcItens`.
  const [filtroResponsavelOrc, setFiltroResponsavelOrc] = useState<FiltroResponsavel>(null);
  const [etapaNovoOrc, setEtapaNovoOrc] = useState<'selecionar' | 'itens'>('itens');
  const [novoOrcValorFinal, setNovoOrcValorFinal] = useState<number | null>(null);
  const [novoOrcDentistaAlvoId, setNovoOrcDentistaAlvoId] = useState('');
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
    () => novoOrcItens.reduce((s, i) => s + i.quantidade * parseValorBR(i.preco), 0),
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
      };
    });
  };

  // R-53 — função PURA sobre uma lista de eventos, serve tanto 1 ficha (fallback) quanto o
  // agregado de N fichas (itensDoAgregado). Só status='indicado' sem assinatura entra.
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

  // R-53 — wrapper de 1 ficha só: preserva o fallback de texto que eventosParaItens (puro,
  // sem `ficha`) não pode mais decidir sozinho.
  const fichaParaItens = (ficha: FichaParaOrc): NovoOrcItem[] => {
    const itens = eventosParaItens(ficha.odontograma_eventos ?? []);
    return itens.length > 0 ? itens : itensDoTexto(ficha);
  };

  // R-53 (§2.1, X1) — adapta o evento cru pro shape que filtro-responsavel.ts espera.
  const paraResponsavel = (ev: EventoOdontogramaParaOrc) => ({
    encaminhadoPara: ev.encaminhado_para
      ? { id: ev.encaminhado_para, nome: ev.encaminhado_dentista?.nome ?? 'Dentista' }
      : null,
  });

  // R-53 — flatten de N fichas (o agregado) pro filtro de responsável + eventosParaItens.
  const itensDoAgregado = (fichas: FichaParaOrc[], filtro: FiltroResponsavel): NovoOrcItem[] => {
    const itens = fichas.flatMap((f) => {
      const eventosComResponsavel = (f.odontograma_eventos ?? []).map((ev) => ({ ...ev, ...paraResponsavel(ev) }));
      const visiveis = eventosVisiveis(eventosComResponsavel, f.dentista_id, filtro, meuDentistaId);
      return eventosParaItens(visiveis);
    });
    return itens.length > 0 ? itens : [ITEM_VAZIO];
  };

  // R-53 — responsáveis distintos no agregado atual, pros chips do modal (§4.3).
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

  // R-53 — troca de chip: reprocessa o agregado já carregado, nunca refaz a query.
  const handleFiltroResponsavelOrc = (v: FiltroResponsavel) => {
    setFiltroResponsavelOrc(v);
    setNovoOrcItens(itensDoAgregado(fichasParaOrc, v));
  };

  // R-53 — busca única do agregado (todos os indicados abertos do paciente), reusada pelos
  // pontos de entrada que agregam (botão geral e, agora, o picker do Meu dia).
  const carregarFichasAgregado = async (): Promise<FichaParaOrc[]> => {
    const supabase = createClient();
    let query = supabase
      .from('fichas')
      .select(SELECT_FICHA_PARA_ORC_AGREGADO)
      .eq('paciente_id', pacienteId)
      .eq('clinica_id', clinicaId)
      .eq('odontograma_eventos.status', 'indicado')
      .is('odontograma_eventos.assinatura_id', null);
    // R-46h — Meu dia nunca deixa puxar procedimento indicado por outro dentista (histórico
    // é compartilhado da clínica); tela do paciente mantém o agregado completo de propósito.
    if (restringirAoMeuDentista) query = query.eq('dentista_id', meuDentistaId);
    const { data } = await query.order('data_atendimento', { ascending: false });
    return (data as unknown as FichaParaOrc[]) ?? [];
  };

  const abrirNovoOrcamento = async () => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const agregado = await carregarFichasAgregado();

      if (agregado.length > 0) {
        // fichaOrcId fica null — o orçamento não pertence mais a 1 ficha só (I6). Default
        // "Meus": cada dentista responde pelo próprio orçamento, procedimento de colega não
        // entra sem ação explícita. Chip "Todos" continua disponível.
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
          .eq('paciente_id', pacienteId)
          .eq('clinica_id', clinicaId)
          .order('data_atendimento', { ascending: false })
          .limit(10);

        const fichas = (data as unknown as FichaParaOrc[]) ?? [];
        setFichasParaOrc(fichas);

        if (fichas.length > 1) {
          setFichaOrcId(null);
          setEtapaNovoOrc('selecionar');
          setNovoOrcItens([ITEM_VAZIO]);
        } else {
          setFichaOrcId(fichas.length === 1 ? fichas[0].id : null);
          setNovoOrcItens(fichas.length === 1 ? fichaParaItens(fichas[0]) : [ITEM_VAZIO]);
          setEtapaNovoOrc('itens');
        }
      }
    } catch {
      setFichasParaOrc([]);
      setFichaOrcId(null);
      setNovoOrcItens([ITEM_VAZIO]);
      setEtapaNovoOrc('itens');
    } finally {
      setIsLoadingFichaParaOrc(false);
    }
    setIsNovoOrcOpen(true);
  };

  // NOVO (R-46h) — picker geral do Meu dia: pula direto pro passo 'selecionar', sem o "geral
  // vs. por-ficha" que abrirNovoOrcamento tem, porque aqui o paciente já é o do slot aberto.
  // R-83 (08/08) — com `eventosRascunho`, junta rascunho + agregado do banco e pula direto
  // pra 'itens': o rascunho é sempre do dentista logado (Meu dia é dele), por isso entra
  // fixo em FILTRO_MEUS — não faz sentido escolher responsável pro que ele mesmo está ditando.
  const abrirPickerFichasAbertas = async (eventosRascunho: EventoOdontogramaParaOrc[] = []) => {
    setOrcError(null);
    setIsLoadingFichaParaOrc(true);
    try {
      const fichas = await carregarFichasAgregado();
      setFichasParaOrc(fichas);
      setFichaOrcId(null);

      if (eventosRascunho.length > 0) {
        const itensBanco = itensDoAgregado(fichas, FILTRO_MEUS);
        const itensBancoReais = itensBanco[0] === ITEM_VAZIO ? [] : itensBanco;
        const itens = [...eventosParaItens(eventosRascunho), ...itensBancoReais];
        setFiltroResponsavelOrc(FILTRO_MEUS);
        setNovoOrcItens(itens.length > 0 ? itens : [ITEM_VAZIO]);
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

  const selecionarFichaParaOrc = (fichaId: string | null) => {
    setFichaOrcId(fichaId);
    if (!fichaId) {
      setNovoOrcItens([ITEM_VAZIO]);
    } else {
      const ficha = fichasParaOrc.find((f) => f.id === fichaId);
      setNovoOrcItens(ficha ? fichaParaItens(ficha) : [ITEM_VAZIO]);
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
      let query = supabase
        .from('fichas')
        .select(SELECT_FICHA_PARA_ORC)
        .eq('id', fichaId)
        .eq('clinica_id', clinicaId);
      // R-46h — defesa em profundidade: mesmo que o botão já esteja escondido no Histórico
      // do Meu dia pra ficha de outro dentista, a busca em si também recusa.
      if (restringirAoMeuDentista) query = query.eq('dentista_id', meuDentistaId);
      const { data } = await query.single();
      const ficha = data as unknown as FichaParaOrc | null;
      setFichaOrcId(fichaId);
      setFichasParaOrc(ficha ? [ficha] : []);
      setNovoOrcItens(ficha ? fichaParaItens(ficha) : [ITEM_VAZIO]);
    } catch {
      setFichaOrcId(fichaId);
      setFichasParaOrc([]);
      setNovoOrcItens([ITEM_VAZIO]);
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
    if (isSecretaria && !novoOrcDentistaAlvoId) {
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
      pacienteId,
      desconto:   descontoValor,
      fichaId:    fichaOrcId,
      dentistaId: isSecretaria ? novoOrcDentistaAlvoId : undefined,
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
        mostrar_valor_por_item: false,
        dentista_id: isSecretaria ? novoOrcDentistaAlvoId : meuDentistaId,
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
        setNovoOrcPlanoForma(null); setNovoOrcNumParcelas('3'); setNovoOrcPrimeiroVencimento(''); setNovoOrcParcelasForma('');
        setFiltroResponsavelOrc(null);
      }
    },
    etapaNovoOrc,
    setEtapaNovoOrc,
    fichasParaOrc,
    responsaveisOrc,
    meuDentistaId,
    filtroResponsavelOrc,
    onFiltroResponsavelOrcChange: handleFiltroResponsavelOrc,
    orcError,
    novoOrcItens,
    setNovoOrcItens,
    procedimentosClinica: procedimentosClinicaCompleto,
    novoOrcSubtotal,
    novoOrcTotal,
    novoOrcValorFinal,
    setNovoOrcValorFinal,
    orcSaving,
    onCriarOrcamento: () => void handleCriarOrcamento(),
    onSelecionarFicha: selecionarFichaParaOrc,
    onCadastrarProcedimento: (idx) => void handleCadastrarProcedimento(idx),
    registeringProcIdx,
    isSecretaria,
    dentistasClinica,
    dentistaAlvoId: novoOrcDentistaAlvoId,
    onDentistaAlvoChange: setNovoOrcDentistaAlvoId,
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

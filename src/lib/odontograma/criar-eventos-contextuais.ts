import type {
  AncoraClinica,
  ModoLancamento,
  OdontogramaEventoDraft,
  TipoRegistroOdontograma,
} from '@/types/odontograma';

export interface ContextoLancamento {
  capturaId: string;
  modo: ModoLancamento;
  encaminharParaId?: string | null;
}

export interface CriarEventosContextuaisInput {
  tipo: TipoRegistroOdontograma;
  procedimentoId?: string | null;
  procedimentoNome?: string | null;
  ancoras: AncoraClinica[];
  contexto: ContextoLancamento;
  dataPadrao: string;
  observacao?: string;
  detalhe?: unknown | null;
}

/**
 * Converte a escolha manual para os eixos clínicos já persistidos. A mesma captura mantém o
 * identificador no próprio draft; regravar esse array usa os mesmos ids e a RPC faz upsert.
 */
export function criarEventosContextuais({
  tipo,
  procedimentoId = null,
  procedimentoNome = null,
  ancoras,
  contexto,
  dataPadrao,
  observacao = '',
  detalhe,
}: CriarEventosContextuaisInput): OdontogramaEventoDraft[] {
  const estado = camposDoModoLancamento(contexto.modo, dataPadrao);

  return ancoras.map((ancora) => {
    const chaveCaptura = chaveDaAncora(tipo, ancora);
    return {
      id: crypto.randomUUID(),
      tipo,
      procedimentoId,
      procedimentoNome,
      ancora,
      grupo_id: null,
      papel_no_grupo: null,
      observacao,
      detalhe,
      fonteFluxo: 'novo',
      encaminhadoParaId: contexto.encaminharParaId,
      chaveCaptura: `${contexto.capturaId}:${chaveCaptura}`,
      ...estado,
    };
  });
}

/** Campos clínicos que a decisão explícita do dentista controla, inclusive quando a IA
 * propõe o procedimento. A IA organiza o conteúdo; não decide o que foi realizado. */
export function camposDoModoLancamento(modo: ModoLancamento, dataPadrao: string) {
  switch (modo) {
    case 'realizado_hoje':
      return {
        status: 'realizado' as const,
        origem: 'clinica' as const,
        momento_planejado: 'sessao_atual' as const,
        realizado_em: dataPadrao,
      };
    case 'proxima_sessao':
      return {
        status: 'indicado' as const,
        origem: 'clinica' as const,
        momento_planejado: 'proxima_sessao' as const,
        realizado_em: null,
      };
    case 'preexistente':
      return {
        status: 'realizado' as const,
        origem: 'preexistente' as const,
        momento_planejado: 'sessao_atual' as const,
        realizado_em: null,
      };
    case 'a_fazer':
      return {
        status: 'indicado' as const,
        origem: 'clinica' as const,
        momento_planejado: 'sessao_atual' as const,
        realizado_em: null,
      };
  }
}

function chaveDaAncora(tipo: TipoRegistroOdontograma, ancora: AncoraClinica): string {
  return [
    tipo,
    ancora.nivel,
    ancora.arcada ?? '',
    ancora.quadrante ?? '',
    ancora.dente ?? '',
    ancora.faces?.join(',') ?? '',
  ].join('|');
}

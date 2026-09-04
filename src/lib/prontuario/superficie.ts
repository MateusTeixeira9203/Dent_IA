export type ContextoTimeline = {
  filtro: 'tudo' | 'indicado' | 'realizado';
  dente: number | null;
  concluidos: boolean;
  scrollY: number;
};

export type SuperficieProntuario =
  | { tipo: 'resumo'; contexto: ContextoTimeline }
  | { tipo: 'ficha'; fichaId: string; atendimentoId: string | null; retorno: ContextoTimeline }
  | { tipo: 'legado'; atendimentoId: string; retorno: ContextoTimeline }
  | {
      tipo: 'editor';
      modo: 'novo' | 'complementar';
      fichaId: string | null;
      atendimentoOrigemId: string | null;
      retorno: ContextoTimeline;
    };

export const CONTEXTO_TIMELINE_INICIAL: ContextoTimeline = {
  filtro: 'tudo',
  dente: null,
  concluidos: false,
  scrollY: 0,
};

export function contextoDaSuperficie(superficie: SuperficieProntuario): ContextoTimeline {
  return superficie.tipo === 'resumo' ? superficie.contexto : superficie.retorno;
}

export function voltarParaTimeline(superficie: SuperficieProntuario): SuperficieProntuario {
  return { tipo: 'resumo', contexto: contextoDaSuperficie(superficie) };
}

/** O legado é histórico: nenhuma ação clínica pode ser habilitada nessa superfície. */
export function podeEditarProcedimentosDaSuperficie(
  superficie: SuperficieProntuario,
  canWrite: boolean,
): boolean {
  return canWrite && superficie.tipo === 'ficha';
}

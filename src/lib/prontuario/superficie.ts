export type ContextoTimeline = {
  filtro: 'tudo' | 'indicado' | 'realizado';
  dente: number | null;
  scrollY: number;
};

export type SuperficieProntuario =
  | { tipo: 'timeline'; contexto: ContextoTimeline }
  | { tipo: 'registro'; atendimentoId: string; retorno: ContextoTimeline }
  | { tipo: 'tratamento'; fichaId: string; retorno: ContextoTimeline }
  | {
      tipo: 'editor';
      modo: 'novo' | 'editar' | 'complementar';
      fichaId: string | null;
      atendimentoOrigemId: string | null;
      retorno: ContextoTimeline;
    };

export const CONTEXTO_TIMELINE_INICIAL: ContextoTimeline = {
  filtro: 'tudo',
  dente: null,
  scrollY: 0,
};

export function contextoDaSuperficie(superficie: SuperficieProntuario): ContextoTimeline {
  return superficie.tipo === 'timeline' ? superficie.contexto : superficie.retorno;
}

export function voltarParaTimeline(superficie: SuperficieProntuario): SuperficieProntuario {
  return { tipo: 'timeline', contexto: contextoDaSuperficie(superficie) };
}

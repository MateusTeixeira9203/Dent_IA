/** R-108 §4.2 — evolução de uma visita dentro de uma ficha de tratamento. */
export interface FichaEvolucao {
  id: string;
  /** R-140a — null em legado até o backfill; não altera a dona da evolução. */
  atendimentoId?: string | null;
  fichaId: string;
  dentistaId: string;
  dentistaNome: string;
  data: string; // 'YYYY-MM-DD'
  texto: string | null;
  /** true = nascida do sistema (R-108b), não ditada pelo dentista — nunca é relato dele. */
  automatica: boolean;
}

/** Ficha aberta, do ponto de vista de quem vai gravar nela — consumida pelo cabeçalho da
 *  ficha (progresso, R-108) e pelo seletor do Meu dia (R-108b). */
export interface TratamentoAberto {
  fichaId: string;
  nome: string;
  dentes: number[];
  totalProcedimentos: number;
  concluidos: number;
}

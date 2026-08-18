/**
 * R-114 — substitui o guard por `status` (R-65: `STATUS_ORCAMENTO_SEM_PAGAMENTO`).
 * Bloqueio por FATO (zero item aprovado) em vez de status declarado — era o status
 * declarado que escondia R$ 33.203,34 de receita real na ClinDent (14 de 35 `rascunho`
 * tinham pagamento recebido, e o filtro achava que não podiam).
 * Ver `@/lib/orcamentos/estado.ts` — `orcamentoAceitaPagamento`/`deriveEstadoOrcamento`.
 */
export const ERRO_ORCAMENTO_SEM_APROVACAO =
  'Nenhum procedimento foi aprovado neste orçamento — marque o que o paciente aceitou antes de registrar o pagamento.';

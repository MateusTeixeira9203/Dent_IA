import type { StatusOrcamento } from "@/app/dashboard/orcamentos/actions";

/** R-65 — nenhum dos 4 caminhos que escrevem `pagamentos.status='pago'` checava o status do
 *  orçamento pai antes de aceitar dinheiro. `rascunho` (nunca apresentado ao paciente) e
 *  `recusado` (paciente recusou) nunca deveriam receber pagamento. */
export const STATUS_ORCAMENTO_SEM_PAGAMENTO = new Set<StatusOrcamento>(["rascunho", "recusado"]);

export const ERRO_ORCAMENTO_SEM_PAGAMENTO =
  "Este orçamento está rascunho ou recusado — não é possível registrar pagamento.";

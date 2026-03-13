import type { Orcamento, OrcamentoItem, Pagamento } from "@/types/database";

// Orçamento enriquecido com joins de paciente, dentista, itens e pagamentos
export type OrcamentoEnriquecido = Orcamento & {
  paciente: { id: string; nome: string };
  dentista: { id: string; nome: string };
  itens: OrcamentoItem[];
  pagamentos: Pagamento[];
};

export interface MetricasMes {
  totalMes: number;
  recebido: number;
  pendente: number;
}

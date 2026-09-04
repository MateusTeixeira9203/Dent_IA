/**
 * R-145 revisão 2 — estado financeiro de uma cobrança por etapa.
 *
 * `situacao` é o único fato persistido pela etapa. Pendente/parcial/paga nascem da soma dos
 * recebimentos confirmados, para que a tela e o banco nunca carreguem dois status financeiros
 * independentes que possam divergir.
 */
export type EstadoCobrancaEtapa = 'pendente' | 'parcial' | 'paga' | 'cancelada';

export interface PagamentoDaCobranca {
  valor: number;
  status: string;
}

export interface EstadoCobrancaEtapaDerivado {
  valorPago: number;
  saldo: number;
  estado: EstadoCobrancaEtapa;
}

export function deriveEstadoCobrancaEtapa(input: {
  valorFinal: number;
  situacao: 'aberta' | 'cancelada';
  pagamentos: PagamentoDaCobranca[];
}): EstadoCobrancaEtapaDerivado {
  const valorPago = input.pagamentos
    .filter((pagamento) => pagamento.status === 'pago')
    .reduce((soma, pagamento) => soma + pagamento.valor, 0);
  const saldo = Math.max(0, Math.round((input.valorFinal - valorPago) * 100) / 100);

  if (input.situacao === 'cancelada') return { valorPago, saldo, estado: 'cancelada' };
  if (saldo === 0) return { valorPago, saldo, estado: 'paga' };
  if (valorPago > 0) return { valorPago, saldo, estado: 'parcial' };
  return { valorPago, saldo, estado: 'pendente' };
}

export type PriceSnapshot = {
  active: boolean;
  productActive: boolean;
  currency: string;
  unitAmount: number | null;
  type: string;
  interval: string | null;
  intervalCount: number | null;
};

export function erroValidacaoPreco(input: {
  priceId: string;
  snapshot: PriceSnapshot;
  expectedCurrency: string;
  expectedAmount: number;
  expectedInterval: 'month' | 'year';
}): string | null {
  const { snapshot } = input;
  if (!snapshot.active || !snapshot.productActive) {
    return `O preço ${input.priceId} está inativo na Stripe.`;
  }
  if (snapshot.type !== 'recurring') {
    return `O preço ${input.priceId} não é recorrente.`;
  }
  if (snapshot.currency.toLowerCase() !== input.expectedCurrency
    || snapshot.unitAmount !== input.expectedAmount
    || snapshot.interval !== input.expectedInterval
    || snapshot.intervalCount !== 1) {
    return `O preço ${input.priceId} não corresponde ao plano aprovado.`;
  }
  return null;
}

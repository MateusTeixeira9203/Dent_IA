import type Stripe from 'stripe';

export type StatusAssinaturaInterno =
  | 'checkout_pendente'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'canceled'
  | 'unpaid';

export function statusStripeParaInterno(status: Stripe.Subscription.Status): StatusAssinaturaInterno {
  if (status === 'paused') return 'suspended';
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled') return 'canceled';
  if (status === 'unpaid') return 'unpaid';
  return 'checkout_pendente';
}

export function assinaturaContaNoMinimoClinica(status: string): boolean {
  return status === 'trialing' || status === 'active';
}

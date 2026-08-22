import Stripe from 'stripe';

/**
 * Cliente Stripe exclusivamente server-side. A checagem fica na hora de usar
 * para que ambientes locais sem credencial continuem iniciando normalmente.
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY não configurada.');
  }

  return new Stripe(secretKey, { typescript: true });
}

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SITE_URL não configurada.');
  }
  return url.replace(/\/+$/, '');
}

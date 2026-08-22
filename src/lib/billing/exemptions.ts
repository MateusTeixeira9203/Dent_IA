import 'server-only';

export function clinicaIsentaDeCobranca(clinicId: string): boolean {
  const ids = (process.env.STRIPE_BILLING_EXEMPT_CLINIC_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(clinicId);
}

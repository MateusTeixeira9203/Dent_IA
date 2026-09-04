import { TRIAL_DAYS } from './trial';

export type DiasTrial = 0 | typeof TRIAL_DAYS;

/**
 * A política nunca vem do browser. Sem exceção explícita, o produto mantém
 * os sete dias de teste; `0` instrui a criação de uma cobrança imediata.
 */
export function resolverDiasTrial(excecao: number | null | undefined): DiasTrial {
  return excecao === 0 ? 0 : TRIAL_DAYS;
}

/** A Stripe aceita trial_period_days somente a partir de 1. */
export function dadosTrialStripe(diasTrial: DiasTrial): { trial_period_days: number } | Record<never, never> {
  return diasTrial === 0 ? {} : { trial_period_days: diasTrial };
}

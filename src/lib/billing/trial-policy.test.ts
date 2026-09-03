import test from 'node:test';
import assert from 'node:assert/strict';
import { TRIAL_DAYS } from './trial';
import { dadosTrialStripe, resolverDiasTrial } from './trial-policy';

test('mantém sete dias para quem não possui exceção', () => {
  assert.equal(resolverDiasTrial(null), TRIAL_DAYS);
  assert.deepEqual(dadosTrialStripe(resolverDiasTrial(undefined)), { trial_period_days: TRIAL_DAYS });
});

test('cobrança imediata omite trial_period_days da requisição Stripe', () => {
  assert.equal(resolverDiasTrial(0), 0);
  assert.deepEqual(dadosTrialStripe(resolverDiasTrial(0)), {});
});

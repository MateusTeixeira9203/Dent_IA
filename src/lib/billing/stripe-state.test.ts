import test from 'node:test';
import assert from 'node:assert/strict';
import { assinaturaContaNoMinimoClinica, statusStripeParaInterno } from './stripe-state.ts';

test('mapeia os estados Stripe sem liberar assinaturas incompletas', () => {
  assert.equal(statusStripeParaInterno('trialing'), 'trialing');
  assert.equal(statusStripeParaInterno('active'), 'active');
  assert.equal(statusStripeParaInterno('past_due'), 'past_due');
  assert.equal(statusStripeParaInterno('paused'), 'suspended');
  assert.equal(statusStripeParaInterno('incomplete'), 'checkout_pendente');
  assert.equal(statusStripeParaInterno('incomplete_expired'), 'checkout_pendente');
});

test('somente trialing e active contam para o mínimo da clínica', () => {
  assert.equal(assinaturaContaNoMinimoClinica('trialing'), true);
  assert.equal(assinaturaContaNoMinimoClinica('active'), true);
  assert.equal(assinaturaContaNoMinimoClinica('cartao_pronto'), false);
  assert.equal(assinaturaContaNoMinimoClinica('past_due'), false);
  assert.equal(assinaturaContaNoMinimoClinica('canceled'), false);
});

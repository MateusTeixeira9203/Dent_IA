import test from 'node:test';
import assert from 'node:assert/strict';
import { erroValidacaoPreco, type PriceSnapshot } from './price-validation.ts';

const mensalCorreto: PriceSnapshot = {
  active: true,
  productActive: true,
  currency: 'brl',
  unitAmount: 20_000,
  type: 'recurring',
  interval: 'month',
  intervalCount: 1,
};

test('aceita somente o preço mensal aprovado', () => {
  assert.equal(erroValidacaoPreco({
    priceId: 'price_mensal', snapshot: mensalCorreto,
    expectedCurrency: 'brl', expectedAmount: 20_000, expectedInterval: 'month',
  }), null);
});

test('recusa valor, periodicidade ou produto incorretos', () => {
  for (const snapshot of [
    { ...mensalCorreto, unitAmount: 2_000 },
    { ...mensalCorreto, interval: 'year' },
    { ...mensalCorreto, productActive: false },
  ]) {
    assert.notEqual(erroValidacaoPreco({
      priceId: 'price_invalido', snapshot,
      expectedCurrency: 'brl', expectedAmount: 20_000, expectedInterval: 'month',
    }), null);
  }
});

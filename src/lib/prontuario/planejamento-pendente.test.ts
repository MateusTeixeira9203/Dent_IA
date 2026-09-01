import assert from 'node:assert/strict';
import test from 'node:test';
import { ehPlanejadoParaHoje } from './planejamento-pendente';

test('somente a pendência priorizada aparece como planejada para hoje', () => {
  assert.equal(ehPlanejadoParaHoje('proxima_sessao'), true);
  assert.equal(ehPlanejadoParaHoje('sessao_atual'), false);
});

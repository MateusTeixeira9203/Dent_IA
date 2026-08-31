import assert from 'node:assert/strict';
import test from 'node:test';
import { classificarStatusDex } from './classificar-status';

test('consulta só aceita realizado com execução explicitamente narrada', () => {
  assert.deepEqual(
    classificarStatusDex('execucao_explicita', 'consulta', 'realizado'),
    { status: 'realizado', revisarStatus: false },
  );

  for (const evidencia of ['indicacao_explicita', 'negacao', 'historico', 'ambiguo'] as const) {
    assert.equal(
      classificarStatusDex(evidencia, 'consulta', 'realizado').status,
      'indicado',
      evidencia,
    );
  }
});

test('consulta pede revisão para evidência histórica ou ambígua', () => {
  assert.equal(classificarStatusDex('historico', 'consulta', 'indicado').revisarStatus, true);
  assert.equal(classificarStatusDex('ambiguo', 'consulta', 'indicado').revisarStatus, true);
  assert.equal(classificarStatusDex('indicacao_explicita', 'consulta', 'indicado').revisarStatus, false);
});

test('histórico preserva o status validado que veio do documento de origem', () => {
  assert.deepEqual(
    classificarStatusDex('historico', 'exame_inicial', 'realizado'),
    { status: 'realizado', revisarStatus: false },
  );
});

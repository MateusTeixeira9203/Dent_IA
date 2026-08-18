import assert from 'node:assert/strict';
import test from 'node:test';
import { dimensoesFotoOtimizada } from './otimizar-foto-clinica.ts';

test('limita o maior lado a 2048 px sem ampliar foto menor', () => {
  assert.deepEqual(dimensoesFotoOtimizada(4000, 3000), { largura: 2048, altura: 1536 });
  assert.deepEqual(dimensoesFotoOtimizada(1200, 800), { largura: 1200, altura: 800 });
});

test('troca dimensões ao girar 90° ou 270°', () => {
  assert.deepEqual(dimensoesFotoOtimizada(4000, 3000, 90), { largura: 1536, altura: 2048 });
  assert.deepEqual(dimensoesFotoOtimizada(4000, 3000, 270), { largura: 1536, altura: 2048 });
});

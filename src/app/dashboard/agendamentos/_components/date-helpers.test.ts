import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ajustarAncoraDaAgenda,
  diaAnteriorDeAgenda,
  janelaDaVisao,
  proximoDiaDeAgenda,
} from './date-helpers';

test('semana operacional busca de segunda até domingo exclusivo', () => {
  assert.deepEqual(janelaDaVisao('semana', '2026-09-02'), {
    de: '2026-08-31T00:00:00.000-03:00',
    ate: '2026-09-06T00:00:00.000-03:00',
  });
});

test('navegação diária pula domingo', () => {
  assert.equal(proximoDiaDeAgenda(new Date('2026-09-05T12:00:00')).getDay(), 1);
  assert.equal(diaAnteriorDeAgenda(new Date('2026-09-07T12:00:00')).getDay(), 6);
});

test('URL de domingo abre a segunda-feira seguinte', () => {
  assert.equal(ajustarAncoraDaAgenda('2026-09-06'), '2026-09-07');
  assert.equal(ajustarAncoraDaAgenda('2026-09-05'), '2026-09-05');
});

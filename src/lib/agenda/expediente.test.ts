import assert from 'node:assert/strict';
import test from 'node:test';
import { checarExpediente } from './expediente';

const grade = {
  horaInicio: '08:00',
  horaFim: '18:00',
  almocoInicio: '12:00',
  almocoFim: '13:00',
};

test('horários configurados viram aviso somente fora da grade', () => {
  assert.deepEqual(checarExpediente(grade, 9 * 60, 60), { fora: false });
  assert.deepEqual(checarExpediente(grade, 7 * 60 + 45, 30), { fora: true, motivo: 'antes_de_abrir' });
  assert.deepEqual(checarExpediente(grade, 17 * 60 + 30, 45), { fora: true, motivo: 'depois_de_fechar' });
  assert.deepEqual(checarExpediente(grade, 11 * 60 + 45, 30), { fora: true, motivo: 'no_almoco' });
});

test('sem configuração de expediente não limita a agenda', () => {
  assert.deepEqual(checarExpediente(null, 6 * 60, 120), { fora: false });
});

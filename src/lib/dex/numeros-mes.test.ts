/**
 * R-103c (fase 1, gates G1/G2) — testes de calcularNumerosMes. Roda sem framework:
 *   node --test src/lib/dex/numeros-mes.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularNumerosMes, type FichaMesRaw } from './numeros-mes.ts';

function fichas(...pacienteIds: string[]): FichaMesRaw[] {
  return pacienteIds.map((pacienteId) => ({ pacienteId }));
}

test('mês vazio: tudo zerado, sem NaN/Infinity', () => {
  const r = calcularNumerosMes([], 0);
  assert.equal(r.atendimentos, 0);
  assert.equal(r.pacientesAtendidos, 0);
  assert.equal(r.visitasPorPaciente, 0);
  assert.equal(r.crescimentoPct, null);
});

test('G1 — 5 fichas de 3 pacientes distintos', () => {
  const r = calcularNumerosMes(fichas('a', 'a', 'b', 'b', 'c'), 4);
  assert.equal(r.atendimentos, 5);
  assert.equal(r.pacientesAtendidos, 3);
  assert.ok(Math.abs(r.visitasPorPaciente - 5 / 3) < 1e-9);
});

test('G2 — mês anterior com 0 fichas, mês atual com fichas: crescimentoPct null (I3)', () => {
  const r = calcularNumerosMes(fichas('a', 'b'), 0);
  assert.equal(r.crescimentoPct, null);
  assert.equal(r.atendimentosMesAnterior, 0);
});

test('crescimento positivo: 10 este mês vs 5 no anterior = +100%', () => {
  const r = calcularNumerosMes(fichas('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'), 5);
  assert.equal(r.crescimentoPct, 100);
});

test('crescimento negativo: 3 este mês vs 6 no anterior = -50%', () => {
  const r = calcularNumerosMes(fichas('a', 'b', 'c'), 6);
  assert.equal(r.crescimentoPct, -50);
});

test('I4 — pacientesAtendidos=0 nunca produz NaN em visitasPorPaciente', () => {
  const r = calcularNumerosMes([], 3);
  assert.equal(r.visitasPorPaciente, 0);
  assert.ok(!Number.isNaN(r.visitasPorPaciente));
});

test('paciente com múltiplas fichas no mês conta 1x em pacientesAtendidos', () => {
  const r = calcularNumerosMes(fichas('a', 'a', 'a'), 0);
  assert.equal(r.atendimentos, 3);
  assert.equal(r.pacientesAtendidos, 1);
  assert.equal(r.visitasPorPaciente, 3);
});

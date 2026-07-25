/**
 * R-02 Fase 3 (alicerce) — testes de agregarGruposAbertos. Roda sem framework:
 *   node --test src/lib/odontograma/grupos-abertos.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agregarGruposAbertos, type EventoGrupoAbertoRow } from './grupos-abertos.ts';

const row = (over: Partial<EventoGrupoAbertoRow>): EventoGrupoAbertoRow => ({
  grupo_id: 'g1', tipo: 'coroa', dente: 36, status: 'indicado', registrado_em: '2026-07-10T10:00:00Z',
  ...over,
});

test('ignora eventos sem grupo_id (isolado não tem trabalho multi-consulta)', () => {
  const r = agregarGruposAbertos([row({ grupo_id: null })]);
  assert.deepEqual(r, []);
});

test('grupo com todos realizado NÃO aparece (fechado)', () => {
  const r = agregarGruposAbertos([
    row({ status: 'realizado', registrado_em: '2026-07-01T00:00:00Z' }),
    row({ status: 'realizado', dente: 37, registrado_em: '2026-07-05T00:00:00Z' }),
  ]);
  assert.deepEqual(r, []);
});

test('GATE: grupo com QUALQUER evento indicado aparece como aberto', () => {
  const r = agregarGruposAbertos([
    row({ status: 'realizado', dente: 36 }),
    row({ status: 'indicado', dente: 37 }),
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].grupoId, 'g1');
});

test('dentes do grupo: dedup + ordenados', () => {
  const r = agregarGruposAbertos([
    row({ dente: 37 }), row({ dente: 36 }), row({ dente: 37 }),
  ]);
  assert.deepEqual(r[0].dentes, [36, 37]);
});

test('iniciadoEm = data do evento mais antigo do grupo, não o mais recente', () => {
  const r = agregarGruposAbertos([
    row({ registrado_em: '2026-07-15T00:00:00Z' }),
    row({ registrado_em: '2026-07-01T00:00:00Z' }),
    row({ registrado_em: '2026-07-10T00:00:00Z' }),
  ]);
  assert.equal(r[0].iniciadoEm, '2026-07-01T00:00:00Z');
});

test('grupos distintos não se misturam', () => {
  const r = agregarGruposAbertos([
    row({ grupo_id: 'g1', tipo: 'coroa' }),
    row({ grupo_id: 'g2', tipo: 'ponte', dente: 46 }),
  ]);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((g) => g.tipo).sort(), ['coroa', 'ponte']);
});

test('ordenado por iniciadoEm crescente (o mais antigo primeiro)', () => {
  const r = agregarGruposAbertos([
    row({ grupo_id: 'recente', registrado_em: '2026-07-20T00:00:00Z' }),
    row({ grupo_id: 'antigo', registrado_em: '2026-07-01T00:00:00Z' }),
  ]);
  assert.deepEqual(r.map((g) => g.grupoId), ['antigo', 'recente']);
});

test('lista vazia devolve lista vazia', () => {
  assert.deepEqual(agregarGruposAbertos([]), []);
});

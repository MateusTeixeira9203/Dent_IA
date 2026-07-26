/**
 * R-21 — testes da camada de agrupamento por dente. Roda sem framework:
 *   node --test src/lib/odontograma/agrupar-por-dente.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparPorDente, type CardComAncoras } from './agrupar-por-dente.ts';
import type { AncoraClinica } from '@/types/odontograma';

type TestCard = CardComAncoras & { id: string };

/** Card de teste: `dentes` = [] vira âncora de arcada (sem dente); [n] um dente; [a,b] multi-dente. */
const card = (id: string, dentes: number[]): TestCard => ({
  id,
  data: {
    ancoras: dentes.length
      ? dentes.map((d): AncoraClinica => ({ nivel: 'dente', dente: d }))
      : [{ nivel: 'arcada', arcada: 'superior' }],
  },
});

test('dente único vira uma seção "dente" com o número certo', () => {
  const r = agruparPorDente([card('a', [11])]);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { tipo: 'dente', dente: 11, cards: [card('a', [11])] });
});

test('vários cards do MESMO dente caem na mesma seção "dente"', () => {
  const r = agruparPorDente([card('canal', [34]), card('pino', [34]), card('coroa', [34])]);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, 'dente');
  assert.deepEqual(r[0].cards.map((c) => c.id), ['canal', 'pino', 'coroa']);
});

test('card com 2+ dentes distintos (mesmo grupo_id, ex. exodontia 31·41·42) vira "multi"', () => {
  const r = agruparPorDente([card('exo', [31, 41, 42])]);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, 'multi');
  assert.deepEqual(r[0].cards.map((c) => c.id), ['exo']);
});

test('âncora sem dente (arcada/quadrante) vira "geral"', () => {
  const r = agruparPorDente([card('orto', [])]);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, 'geral');
});

test('GATE: seções "dente" ordenadas 11→48 (FDI crescente), independentemente da ordem de entrada', () => {
  const r = agruparPorDente([card('a', [38]), card('b', [11]), card('c', [21]), card('d', [48])]);
  assert.deepEqual(
    r.map((s) => (s.tipo === 'dente' ? s.dente : s.tipo)),
    [11, 21, 38, 48],
  );
});

test('GATE: "multi" vem depois dos dentes e "geral" por último', () => {
  const r = agruparPorDente([
    card('geral', []),
    card('multi', [31, 41]),
    card('dente48', [48]),
    card('dente11', [11]),
  ]);
  assert.deepEqual(
    r.map((s) => (s.tipo === 'dente' ? `dente${s.dente}` : s.tipo)),
    ['dente11', 'dente48', 'multi', 'geral'],
  );
});

test('GATE: ordem interna de cada seção preserva a ENTRADA — não reordena por status', () => {
  // Entrada já vem ordenada por agruparRegistros; aqui a camada só preserva.
  const r = agruparPorDente([card('primeiro', [16]), card('segundo', [16]), card('terceiro', [16])]);
  assert.deepEqual(r[0].cards.map((c) => c.id), ['primeiro', 'segundo', 'terceiro']);
});

test('todas as três seções juntas, na ordem certa', () => {
  const r = agruparPorDente([
    card('d21', [21]),
    card('exo', [31, 41, 42]),
    card('d11a', [11]),
    card('orto', []),
    card('d11b', [11]),
  ]);
  assert.deepEqual(r.map((s) => (s.tipo === 'dente' ? `dente${s.dente}` : s.tipo)), [
    'dente11',
    'dente21',
    'multi',
    'geral',
  ]);
  // os dois cards do dente 11 juntos, na ordem de entrada
  const d11 = r.find((s) => s.tipo === 'dente' && s.dente === 11);
  assert.deepEqual(d11 && d11.cards.map((c) => c.id), ['d11a', 'd11b']);
});

test('multi/geral só existem quando há cards pra eles', () => {
  const r = agruparPorDente([card('a', [11]), card('b', [12])]);
  assert.deepEqual(r.map((s) => s.tipo), ['dente', 'dente']);
});

test('lista vazia devolve lista vazia', () => {
  assert.deepEqual(agruparPorDente([]), []);
});

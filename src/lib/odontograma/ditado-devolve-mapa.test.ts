/**
 * R-63 — testes do ditadoDevolveMapa. Roda sem framework:
 *   node --test src/lib/odontograma/ditado-devolve-mapa.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ditadoDevolveMapa, type SlotCentral } from './ditado-devolve-mapa.ts';
import type { AncoraClinica } from '@/types/odontograma';

const dente = (n: number): AncoraClinica => ({ nivel: 'dente', dente: n });
const face = (n: number): AncoraClinica => ({ nivel: 'face', dente: n, faces: ['O'] });
const boca = (): AncoraClinica => ({ nivel: 'boca' });

test('slot mapa: nunca devolve — não há o que devolver', () => {
  const slot: SlotCentral = { tipo: 'mapa' };
  assert.equal(ditadoDevolveMapa(slot, [dente(24)]), false);
});

test('tabela do 36 aberta + dita dente DIFERENTE (24): devolve', () => {
  const slot: SlotCentral = { tipo: 'detalhe', dente: 36 };
  assert.equal(ditadoDevolveMapa(slot, [dente(24)]), true);
});

test('tabela do 36 aberta + dita o MESMO dente (36): não devolve', () => {
  const slot: SlotCentral = { tipo: 'detalhe', dente: 36 };
  assert.equal(ditadoDevolveMapa(slot, [dente(36)]), false);
});

test('tabela aberta + âncora de boca (profilaxia): não devolve — nível boca nunca pinta dente', () => {
  const slot: SlotCentral = { tipo: 'detalhe', dente: 36 };
  assert.equal(ditadoDevolveMapa(slot, [boca()]), false);
});

test('tabela do 36 aberta + face de dente diferente: devolve (face carrega dente)', () => {
  const slot: SlotCentral = { tipo: 'detalhe', dente: 36 };
  assert.equal(ditadoDevolveMapa(slot, [face(24)]), true);
});

test('orto aberto + dita qualquer dente: devolve — orto não tem dente pra comparar', () => {
  const slot: SlotCentral = { tipo: 'orto' };
  assert.equal(ditadoDevolveMapa(slot, [dente(24)]), true);
});

test('orto aberto + âncora de boca: não devolve — nada a confirmar', () => {
  const slot: SlotCentral = { tipo: 'orto' };
  assert.equal(ditadoDevolveMapa(slot, [boca()]), false);
});

test('multi-dente: 1 dos 2 é diferente do aberto → devolve', () => {
  const slot: SlotCentral = { tipo: 'detalhe', dente: 36 };
  assert.equal(ditadoDevolveMapa(slot, [dente(36), dente(24)]), true);
});

test('multi-dente: todos iguais ao aberto → não devolve', () => {
  const slot: SlotCentral = { tipo: 'detalhe', dente: 36 };
  assert.equal(ditadoDevolveMapa(slot, [dente(36), dente(36)]), false);
});

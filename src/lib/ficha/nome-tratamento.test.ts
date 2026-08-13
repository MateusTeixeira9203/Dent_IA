/**
 * R-108 §4.3 — testes do nome derivado. Roda sem framework:
 *   node --test src/lib/ficha/nome-tratamento.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeTratamentoDerivado } from './nome-tratamento.ts';
import type { OdontogramaEventoDraft, TipoRegistroOdontograma } from '@/types/odontograma';

let seq = 0;
function ev(tipo: TipoRegistroOdontograma, dente?: number): OdontogramaEventoDraft {
  seq += 1;
  return {
    id: `ev-${seq}`,
    tipo,
    status: 'realizado',
    origem: 'clinica',
    momento_planejado: 'sessao_atual',
    ancora: dente != null ? { nivel: 'dente', dente } : { nivel: 'boca' },
    grupo_id: null,
    papel_no_grupo: null,
    observacao: '',
    realizado_em: '2026-08-13',
  };
}

test('1 tipo, 1 dente — "Canal · 44"', () => {
  assert.equal(nomeTratamentoDerivado([ev('endodontia', 44)]), 'Canal · 44');
});

test('2+ tipos, mesmo quadrante — "Reabilitação · inferior direito"', () => {
  const nome = nomeTratamentoDerivado([ev('endodontia', 44), ev('pino_nucleo', 44), ev('carie_restauracao', 45)]);
  assert.equal(nome, 'Reabilitação · inferior direito');
});

test('2+ tipos, mesmo arco (quadrantes diferentes) — "Reabilitação · superior"', () => {
  // 14 = quadrante 1 (sup. direito), 26 = quadrante 2 (sup. esquerdo) — mesmo arco.
  const nome = nomeTratamentoDerivado([ev('carie_restauracao', 14), ev('exodontia', 26)]);
  assert.equal(nome, 'Reabilitação · superior');
});

test('2+ tipos espalhados (arcos diferentes) — tipo dominante + N · vários dentes', () => {
  const nome = nomeTratamentoDerivado([
    ev('carie_restauracao', 14), ev('carie_restauracao', 46), ev('exodontia', 26),
  ]);
  assert.equal(nome, 'Restauração + 1 · vários dentes');
});

test('só nível-boca — "Profilaxia"', () => {
  assert.equal(nomeTratamentoDerivado([ev('profilaxia')]), 'Profilaxia');
});

test('1 tipo, 2 dentes mesmo quadrante — não vira "Reabilitação" (só 1 tipo)', () => {
  const nome = nomeTratamentoDerivado([ev('carie_restauracao', 44), ev('carie_restauracao', 45)]);
  assert.equal(nome, 'Restauração · inferior direito');
});

test('1 tipo, dentes espalhados — "{TIPO} · vários dentes"', () => {
  const nome = nomeTratamentoDerivado([ev('carie_restauracao', 14), ev('carie_restauracao', 46)]);
  assert.equal(nome, 'Restauração · vários dentes');
});

test('nunca vazio: 1 evento só, dente único', () => {
  const nome = nomeTratamentoDerivado([ev('fratura', 11)]);
  assert.ok(nome.length > 0);
  assert.equal(nome, 'Fratura · 11');
});

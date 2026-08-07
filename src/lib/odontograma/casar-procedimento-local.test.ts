/**
 * R-62 (gate G11) — testes do matcher local. Roda sem framework:
 *   node --test src/lib/odontograma/casar-procedimento-local.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casarProcedimentoLocal, extrairDentesDoTexto } from './casar-procedimento-local.ts';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';

const CATALOGO: MeuDiaCatalogoProcedimento[] = [
  { id: 'cat-1', nome: 'Resina Nano Z350', categoria: 'Restauração' },
  { id: 'cat-2', nome: 'Coroa Zircônia', categoria: 'Prótese' },
];

test('acento: "extracao" (sem cedilha/til) acha "Extração" — família de bug do R-44', () => {
  const r = casarProcedimentoLocal('extracao no 26', []);
  assert.ok(r.some((s) => s.tipo === 'exodontia'), JSON.stringify(r));
});

test('dente colado ao texto: "restauração 35" resolve tipo + dente no mesmo passo', () => {
  const r = casarProcedimentoLocal('restauração 35', []);
  const s = r.find((x) => x.tipo === 'carie_restauracao');
  assert.ok(s);
  assert.deepEqual(s.dentes, [35]);
});

test('2 dentes no mesmo texto: "restauração 35 e 36" traz os dois, sem duplicar', () => {
  const r = casarProcedimentoLocal('restauração 35 e 36', []);
  const s = r.find((x) => x.tipo === 'carie_restauracao');
  assert.deepEqual(s?.dentes, [35, 36]);
});

test('tipo nível boca: "profilaxia" nunca carrega dente, mesmo se um número aparecer no texto', () => {
  const r = casarProcedimentoLocal('profilaxia hoje, 12h', []);
  const s = r.find((x) => x.tipo === 'profilaxia');
  assert.ok(s);
  assert.deepEqual(s.dentes, []);
});

test('item de catálogo: nome comercial casa e não resolve tipo (pede depois)', () => {
  const r = casarProcedimentoLocal('vou usar resina nano z350 no 11', CATALOGO);
  const s = r.find((x) => x.catalogo?.id === 'cat-1');
  assert.ok(s, JSON.stringify(r));
  assert.equal(s.tipo, null);
  assert.deepEqual(s.dentes, [11]);
});

test('texto sem match: nenhum tipo nem catálogo — lista vazia, não lança', () => {
  const r = casarProcedimentoLocal('paciente relatou dor de cabeça no fim de semana', CATALOGO);
  assert.deepEqual(r, []);
});

test('texto vazio: lista vazia', () => {
  assert.deepEqual(casarProcedimentoLocal('', CATALOGO), []);
  assert.deepEqual(casarProcedimentoLocal('   ', CATALOGO), []);
});

test('ordem: tipo estrutural vem antes de item de catálogo quando os dois casam', () => {
  const r = casarProcedimentoLocal('coroa zircônia no 16, coroa total', CATALOGO);
  const idxTipo = r.findIndex((x) => x.tipo === 'coroa');
  const idxCatalogo = r.findIndex((x) => x.catalogo?.id === 'cat-2');
  assert.ok(idxTipo !== -1 && idxCatalogo !== -1);
  assert.ok(idxTipo < idxCatalogo);
});

test('extrairDentesDoTexto: ignora número de 2 dígitos que não é FDI válido', () => {
  assert.deepEqual(extrairDentesDoTexto('as 99 e o dente 26'), [26]);
});

test('extrairDentesDoTexto: não duplica dente repetido no texto', () => {
  assert.deepEqual(extrairDentesDoTexto('dente 26, canal do 26'), [26]);
});

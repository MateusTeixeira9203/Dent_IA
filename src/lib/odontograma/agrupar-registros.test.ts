/**
 * R-02 Fase 1/2 — testes do agrupamento/ordenação único. Roda sem framework:
 *   node --test src/lib/odontograma/agrupar-registros.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparRegistros, grupoEstaAberto, type RegistroAgrupavel } from './agrupar-registros.ts';

const item = (over: Partial<RegistroAgrupavel> & { id: string }): RegistroAgrupavel => ({
  grupoId: null, tipo: 'carie_restauracao', status: 'indicado', ancora: { nivel: 'dente', dente: 11 },
  ...over,
});

test('grupoEstaAberto: true se QUALQUER evento do grupo é indicado', () => {
  assert.equal(grupoEstaAberto([{ status: 'realizado' }, { status: 'indicado' }]), true);
  assert.equal(grupoEstaAberto([{ status: 'realizado' }, { status: 'realizado' }]), false);
  assert.equal(grupoEstaAberto([]), false);
});

test('agrupar: sem grupo_id, MESMO dente+tipo+status mescla num card (faces unidas)', () => {
  const itens = [
    item({ id: 'a', ancora: { nivel: 'face', dente: 45, faces: ['M'] } }),
    item({ id: 'b', ancora: { nivel: 'face', dente: 45, faces: ['O'] } }),
    item({ id: 'c', ancora: { nivel: 'face', dente: 45, faces: ['D'] } }),
  ];
  const r = agruparRegistros(itens);
  assert.equal(r.length, 1);
  assert.equal(r[0].itens.length, 3);
});

test('agrupar: grupo_id explícito une eventos mesmo em dentes diferentes (multi-dente)', () => {
  const itens = [
    item({ id: 'a', grupoId: 'g1', ancora: { nivel: 'dente', dente: 31 } }),
    item({ id: 'b', grupoId: 'g1', ancora: { nivel: 'dente', dente: 41 } }),
  ];
  const r = agruparRegistros(itens);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].itens.map((i) => i.id), ['a', 'b']);
});

test('agrupar: tipos diferentes no mesmo dente NÃO mesclam', () => {
  const itens = [
    item({ id: 'a', tipo: 'carie_restauracao', ancora: { nivel: 'dente', dente: 11 } }),
    item({ id: 'b', tipo: 'endodontia', ancora: { nivel: 'dente', dente: 11 } }),
  ];
  assert.equal(agruparRegistros(itens).length, 2);
});

test('agrupar: status diferente no mesmo dente+tipo NÃO mescla (indicado ≠ realizado)', () => {
  const itens = [
    item({ id: 'a', status: 'indicado', ancora: { nivel: 'dente', dente: 11 } }),
    item({ id: 'b', status: 'realizado', ancora: { nivel: 'dente', dente: 11 } }),
  ];
  assert.equal(agruparRegistros(itens).length, 2);
});

test('agrupar: próxima sessão e sessão atual no mesmo dente NÃO mesclam', () => {
  const itens = [
    item({ id: 'atual', momentoPlanejado: 'sessao_atual' }),
    item({ id: 'proxima', momentoPlanejado: 'proxima_sessao' }),
  ];

  assert.equal(agruparRegistros(itens).length, 2);
});

test('GATE: abertos primeiro, dente como critério secundário', () => {
  const itens = [
    item({ id: 'fechado-baixo', status: 'realizado', ancora: { nivel: 'dente', dente: 11 } }),
    item({ id: 'aberto-alto', status: 'indicado', ancora: { nivel: 'dente', dente: 48 } }),
    item({ id: 'aberto-baixo', status: 'indicado', ancora: { nivel: 'dente', dente: 21 } }),
    item({ id: 'fechado-alto', status: 'realizado', ancora: { nivel: 'dente', dente: 38 } }),
  ];
  const r = agruparRegistros(itens);
  assert.deepEqual(r.map((g) => g.itens[0].id), ['aberto-baixo', 'aberto-alto', 'fechado-baixo', 'fechado-alto']);
  assert.deepEqual(r.map((g) => g.aberto), [true, true, false, false]);
});

test('agrupar: grupo aberto = QUALQUER evento indicado (grupo multi-dente parcialmente concluído)', () => {
  const itens = [
    item({ id: 'a', grupoId: 'g1', status: 'realizado', ancora: { nivel: 'dente', dente: 11 } }),
    item({ id: 'b', grupoId: 'g1', status: 'indicado', ancora: { nivel: 'dente', dente: 21 } }),
  ];
  const r = agruparRegistros(itens);
  assert.equal(r.length, 1);
  assert.equal(r[0].aberto, true);
});

test('agrupar: âncora sem dente (arcada/quadrante) não quebra a chave nem o sort', () => {
  const itens = [
    item({ id: 'a', ancora: { nivel: 'arcada', arcada: 'superior' } }),
    item({ id: 'b', ancora: { nivel: 'dente', dente: 11 } }),
  ];
  const r = agruparRegistros(itens);
  assert.equal(r.length, 2);
  // sem dente vira 99 no critério secundário — vai por último dentro do mesmo bloco (ambos abertos).
  assert.equal(r[r.length - 1].itens[0].id, 'a');
});

test('agrupar: lista vazia devolve lista vazia', () => {
  assert.deepEqual(agruparRegistros([]), []);
});

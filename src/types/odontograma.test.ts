import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ehDenteAnteriorFDI, faceAbreviacao } from './odontograma.ts';

test('faceAbreviacao: região O exibe I em dentes anteriores e preserva O em posteriores', () => {
  assert.equal(faceAbreviacao('O', 11), 'I');
  assert.equal(faceAbreviacao('O', 13), 'I');
  assert.equal(faceAbreviacao('O', 14), 'O');
  assert.equal(faceAbreviacao('O', 51), 'I');
  assert.equal(faceAbreviacao('O', 54), 'O');
});

test('faceAbreviacao: demais faces e FDI inválido não mudam', () => {
  assert.equal(faceAbreviacao('M', 11), 'M');
  assert.equal(faceAbreviacao('D', 11), 'D');
  assert.equal(ehDenteAnteriorFDI(19), false);
  assert.equal(faceAbreviacao('O', 19), 'O');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizarBitolaEmRegistroOrto, normalizarBitolaOrto } from './normalizar-bitola-orto';

test('normaliza bitola simples ditada sem perder o material', () => {
  assert.equal(normalizarBitolaOrto('fio 18 aço'), 'fio 0,018 aço');
  assert.equal(normalizarBitolaOrto('19 NiTi'), '0,019 NiTi');
});

test('normaliza as duas dimensões de fio retangular', () => {
  assert.equal(normalizarBitolaOrto('fio 16 por 22 de aço'), 'fio 0,016 x 0,022 de aço');
  assert.equal(normalizarBitolaOrto('18x25 NiTi'), '0,018 x 0,025 NiTi');
});

test('preserva uma bitola já decimal, padronizando o separador', () => {
  assert.equal(normalizarBitolaOrto('0.018 aço'), '0,018 aço');
  assert.equal(normalizarBitolaOrto('0,019 NiTi'), '0,019 NiTi');
});

test('na evolução manual, só normaliza a medida ligada a fio ou arco', () => {
  assert.equal(
    normalizarBitolaEmRegistroOrto('troca de fio 16 por 22 aço; elástico 3/16 Classe II'),
    'troca de fio 0,016 x 0,022 aço; elástico 3/16 Classe II',
  );
});

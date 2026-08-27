import test from 'node:test';
import assert from 'node:assert/strict';
import { stripDenteDoNome } from './arcadas';

test('stripDenteDoNome mantém somente o nome canônico do catálogo', () => {
  assert.equal(stripDenteDoNome('Restauração — D16'), 'Restauração');
  assert.equal(stripDenteDoNome('Canal — D14, D15'), 'Canal');
  assert.equal(stripDenteDoNome('Dente 46 — Coroa'), 'Coroa');
  assert.equal(stripDenteDoNome('Ponte fixa — pilares D14 e D16 · pôntico D15'), 'Ponte fixa');
});

/** Execute com: node --test src/lib/odontograma/escopo-regional.test.ts */
import assert from 'node:assert/strict';
import test from 'node:test';
import { ancoraDoEscopoRegional, buscarProcedimentosRegionais } from './escopo-regional.ts';

test('mapeia boca e arcadas sem criar dente artificial', () => {
  assert.deepEqual(ancoraDoEscopoRegional('boca'), { nivel: 'boca' });
  assert.deepEqual(ancoraDoEscopoRegional('arcada_superior'), { nivel: 'arcada', arcada: 'superior' });
  assert.deepEqual(ancoraDoEscopoRegional('arcada_inferior'), { nivel: 'arcada', arcada: 'inferior' });
});

test('busca parcial encontra tipo regional e item do catálogo', () => {
  const catalogo = [{
    id: 'item-1',
    nome: 'Moldeira para clareamento',
    categoria: 'Clareamento',
    preco_padrao: 100,
  }];

  assert.equal(buscarProcedimentosRegionais('profi', catalogo)[0]?.tipo, 'profilaxia');
  assert.equal(buscarProcedimentosRegionais('moldeira', catalogo)[0]?.label, 'Moldeira para clareamento');
});

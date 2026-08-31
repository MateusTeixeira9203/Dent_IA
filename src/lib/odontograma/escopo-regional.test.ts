/** Execute com: node --test src/lib/odontograma/escopo-regional.test.ts */
import assert from 'node:assert/strict';
import test from 'node:test';
import { ancoraDoEscopoRegional, buscarProcedimentosRegionais } from './escopo-regional.ts';

test('mapeia geral, boca, arcadas e quadrantes sem criar dente artificial', () => {
  assert.deepEqual(ancoraDoEscopoRegional('geral'), { nivel: 'geral' });
  assert.deepEqual(ancoraDoEscopoRegional('boca'), { nivel: 'boca' });
  assert.deepEqual(ancoraDoEscopoRegional('arcada_superior'), { nivel: 'arcada', arcada: 'superior' });
  assert.deepEqual(ancoraDoEscopoRegional('arcada_inferior'), { nivel: 'arcada', arcada: 'inferior' });
  assert.deepEqual(ancoraDoEscopoRegional('quadrante_2'), { nivel: 'quadrante', quadrante: 2 });
});

test('busca parcial encontra tipo regional e item do catálogo', () => {
  const catalogo = [{
    id: 'item-1',
    nome: 'Moldeira para clareamento',
    categoria: 'Clareamento',
    preco_padrao: 100,
  }];

  assert.equal(buscarProcedimentosRegionais('profi', catalogo)[0]?.tipo, 'profilaxia');
  const item = buscarProcedimentosRegionais('moldeira', catalogo)[0];
  assert.equal(item?.label, 'Moldeira para clareamento');
  assert.equal(item?.procedimentoId, 'item-1');
});

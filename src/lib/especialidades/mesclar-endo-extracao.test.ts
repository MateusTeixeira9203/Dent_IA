import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mesclarDetalheEndo } from './mesclar-endo-extracao.ts';

const detalhe = (comprimentoRaiz: number | null) => ({
  canais: [{ nome: 'MV', referencia: null, comprimentoRaiz, limaInicial: '#15', limaFinal: '#35' }],
  obturacao: null,
  cimento: null,
});

test('valor já presente vence sugestão diferente e gera dúvida de conflito', () => {
  const r = mesclarDetalheEndo(detalhe(21.5), detalhe(22), { origemPorCampo: { 'canais.0.comprimentoRaiz': 'manual' }, duvidas: [] }, 'ia');
  assert.equal(r.detalhe.canais[0].comprimentoRaiz, 21.5);
  assert.equal(r.revisao.duvidas[0].motivo, 'conflito');
});

test('campo vazio recebe complemento com origem', () => {
  const r = mesclarDetalheEndo(detalhe(null), detalhe(21.5), undefined, 'ia');
  assert.equal(r.detalhe.canais[0].comprimentoRaiz, 21.5);
  assert.equal(r.revisao.origemPorCampo['canais.0.comprimentoRaiz'], 'ia');
});

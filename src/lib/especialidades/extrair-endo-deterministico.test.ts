import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extrairEndoDeterministico } from './extrair-endo-deterministico.ts';

test('extrai canais ancorados no dente e preserva origem', () => {
  const r = extrairEndoDeterministico('Canal no 46: MV 21,5 mm lima 15/35; DV 20 mm lima 15/30; obturação lateral; cimento AH Plus.', [46]);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.extracoes[0].detalhe.canais.length, 2);
  assert.equal(r.extracoes[0].detalhe.canais[0].comprimentoRaiz, 21.5);
  assert.equal(r.extracoes[0].detalhe.cimento, 'AH Plus');
  assert.equal(r.extracoes[0].origemPorCampo['canais.0.comprimentoRaiz'], 'deterministico');
});

test('recusa número fora da faixa e resolução inválida', () => {
  for (const [relato, motivo] of [['46 MV 45 mm lima 15/35', 'fora_da_faixa'], ['46 MV 21,3 mm lima 15/35', 'resolucao_invalida']] as const) {
    const r = extrairEndoDeterministico(relato, [46]);
    assert.equal(r.ok, true);
    if (!r.ok) continue;
    assert.equal(r.extracoes[0].detalhe.canais[0].comprimentoRaiz, null);
    assert.equal(r.extracoes[0].duvidas[0].motivo, motivo);
  }
});

test('número solto vira dúvida, sem associação por palpite', () => {
  const r = extrairEndoDeterministico('Canal no 46: 21,5 mm lima 15/35', [46]);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.extracoes[0].duvidas[0].motivo, 'sem_canal');
  assert.equal(r.extracoes[0].detalhe.canais[0].comprimentoRaiz, null);
});

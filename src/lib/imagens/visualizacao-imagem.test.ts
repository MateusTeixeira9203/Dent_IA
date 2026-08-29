import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AJUSTE_MAXIMO,
  AJUSTE_MINIMO,
  aplicarZoomNoPonto,
  calcularLimitesPan,
  calcularRetanguloContido,
  calcularRetanguloImagemTransformada,
  ESTADO_VISUALIZACAO_PADRAO,
  limitarAjuste,
  limitarPan,
  limitarZoom,
  pontoImagemParaPercentual,
  pontoViewportParaImagem,
  proximaRotacao,
} from './visualizacao-imagem';

test('limita zoom e ajustes às faixas clínicas', () => {
  assert.equal(limitarZoom(0.5), 1);
  assert.equal(limitarZoom(12), 8);
  assert.equal(limitarAjuste(20), AJUSTE_MINIMO);
  assert.equal(limitarAjuste(240), AJUSTE_MAXIMO);
});

test('restaura exatamente o estado padrão e percorre quatro rotações', () => {
  assert.deepEqual(ESTADO_VISUALIZACAO_PADRAO, {
    zoom: 1,
    panX: 0,
    panY: 0,
    rotacao: 0,
    brilho: 100,
    contraste: 100,
    invertida: false,
  });
  assert.deepEqual([0, 90, 180, 270].map((rotacao) => proximaRotacao(rotacao as 0 | 90 | 180 | 270)), [90, 180, 270, 0]);
});

test('clamp de pan só habilita arraste quando conteúdo excede o viewport', () => {
  const viewport = { largura: 800, altura: 500 };
  const retangulo = calcularRetanguloContido(viewport, { largura: 1200, altura: 600 });
  assert.ok(retangulo);
  assert.deepEqual(calcularLimitesPan(viewport, retangulo, { zoom: 1, rotacao: 0 }), { x: 0, y: 0 });

  const limites = calcularLimitesPan(viewport, retangulo, { zoom: 2, rotacao: 0 });
  assert.ok(limites.x > 0);
  assert.ok(limites.y > 0);
  const limitado = limitarPan({ ...ESTADO_VISUALIZACAO_PADRAO, zoom: 2, panX: 9999, panY: -9999 }, viewport, retangulo);
  assert.equal(limitado.panX, limites.x);
  assert.equal(limitado.panY, -limites.y);
});

test('rotação mantém a imagem inteira contida em zoom 1', () => {
  const viewport = { largura: 1000, altura: 600 };
  const retangulo = calcularRetanguloImagemTransformada(viewport, { largura: 1600, altura: 800 }, 90);
  assert.deepEqual(retangulo, { esquerda: 200, topo: 150, largura: 600, altura: 300 });
  assert.deepEqual(calcularLimitesPan(viewport, retangulo, { zoom: 1, rotacao: 90 }), { x: 0, y: 0 });
});

test('transformação inversa recupera a coordenada da anotação após rotação', () => {
  const retangulo = calcularRetanguloImagemTransformada(
    { largura: 1000, altura: 600 },
    { largura: 1600, altura: 800 },
    90,
  );
  assert.ok(retangulo);
  const pontoImagem = pontoViewportParaImagem(
    { x: 425, y: 300 },
    retangulo,
    { zoom: 1, panX: 0, panY: 0, rotacao: 90 },
  );
  assert.deepEqual(pontoImagemParaPercentual(pontoImagem, retangulo), { x: 50, y: 75 });
});

test('zoom no ponto preserva a coordenada lógica sob o cursor', () => {
  const viewport = { largura: 1000, altura: 600 };
  const retangulo = calcularRetanguloContido(viewport, { largura: 1600, altura: 800 });
  assert.ok(retangulo);
  const ponteiro = { x: 700, y: 240 };
  const estado = aplicarZoomNoPonto(ESTADO_VISUALIZACAO_PADRAO, 2, ponteiro, viewport, retangulo);
  const imagem = pontoViewportParaImagem(ponteiro, retangulo, estado);
  assert.deepEqual(pontoImagemParaPercentual(imagem, retangulo), { x: 70, y: 38 });
});

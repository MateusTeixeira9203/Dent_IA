export type RotacaoVisual = 0 | 90 | 180 | 270;

export interface EstadoVisualizacaoImagem {
  zoom: number;
  panX: number;
  panY: number;
  rotacao: RotacaoVisual;
  brilho: number;
  contraste: number;
  invertida: boolean;
}

export interface TamanhoImagem {
  largura: number;
  altura: number;
}

export interface RetanguloImagem extends TamanhoImagem {
  esquerda: number;
  topo: number;
}

export interface PontoImagem {
  x: number;
  y: number;
}

export interface LimitesPan {
  x: number;
  y: number;
}

export const ZOOMS_CLINICOS = [1, 1.25, 1.5, 2, 3, 4, 6, 8] as const;
export const ZOOM_MINIMO = ZOOMS_CLINICOS[0];
export const ZOOM_MAXIMO = ZOOMS_CLINICOS[ZOOMS_CLINICOS.length - 1];
export const AJUSTE_MINIMO = 50;
export const AJUSTE_MAXIMO = 200;
export const CONTEUDO_MINIMO_VISIVEL_PX = 48;

export const ESTADO_VISUALIZACAO_PADRAO: EstadoVisualizacaoImagem = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotacao: 0,
  brilho: 100,
  contraste: 100,
  invertida: false,
};

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function limitarZoom(zoom: number): number {
  return limitar(zoom, ZOOM_MINIMO, ZOOM_MAXIMO);
}

export function limitarAjuste(valor: number): number {
  return Math.round(limitar(valor, AJUSTE_MINIMO, AJUSTE_MAXIMO));
}

export function proximaRotacao(rotacao: RotacaoVisual): RotacaoVisual {
  if (rotacao === 270) return 0;
  return (rotacao + 90) as RotacaoVisual;
}

export function proximoZoomDiscreto(zoom: number, direcao: 1 | -1): number {
  if (direcao === 1) {
    return ZOOMS_CLINICOS.find((nivel) => nivel > zoom + 0.001) ?? ZOOM_MAXIMO;
  }

  return [...ZOOMS_CLINICOS].reverse().find((nivel) => nivel < zoom - 0.001) ?? ZOOM_MINIMO;
}

export function calcularRetanguloContido(
  viewport: TamanhoImagem,
  imagemNatural: TamanhoImagem | null,
): RetanguloImagem | null {
  if (!imagemNatural || viewport.largura <= 0 || viewport.altura <= 0) return null;

  const escala = Math.min(
    viewport.largura / imagemNatural.largura,
    viewport.altura / imagemNatural.altura,
  );
  const largura = imagemNatural.largura * escala;
  const altura = imagemNatural.altura * escala;

  return {
    esquerda: (viewport.largura - largura) / 2,
    topo: (viewport.altura - altura) / 2,
    largura,
    altura,
  };
}

/**
 * Retângulo antes do transform CSS. Em 90°/270°, ele é o inverso do retângulo visível
 * após a rotação para que `zoom: 1` continue mostrando a imagem inteira no viewport.
 */
export function calcularRetanguloImagemTransformada(
  viewport: TamanhoImagem,
  imagemNatural: TamanhoImagem | null,
  rotacao: RotacaoVisual,
): RetanguloImagem | null {
  if (!imagemNatural) return null;
  const encaixeRotacionado = calcularRetanguloContido(
    viewport,
    tamanhoDepoisDaRotacao(imagemNatural, rotacao),
  );
  if (!encaixeRotacionado) return null;
  if (rotacao === 0 || rotacao === 180) return encaixeRotacionado;

  const largura = encaixeRotacionado.altura;
  const altura = encaixeRotacionado.largura;
  return {
    esquerda: (viewport.largura - largura) / 2,
    topo: (viewport.altura - altura) / 2,
    largura,
    altura,
  };
}

export function tamanhoDepoisDaRotacao(
  tamanho: TamanhoImagem,
  rotacao: RotacaoVisual,
): TamanhoImagem {
  return rotacao === 90 || rotacao === 270
    ? { largura: tamanho.altura, altura: tamanho.largura }
    : tamanho;
}

export function calcularLimitesPan(
  viewport: TamanhoImagem,
  retangulo: RetanguloImagem | null,
  estado: Pick<EstadoVisualizacaoImagem, 'zoom' | 'rotacao'>,
): LimitesPan {
  if (!retangulo) return { x: 0, y: 0 };

  const rotacionado = tamanhoDepoisDaRotacao(retangulo, estado.rotacao);
  const largura = rotacionado.largura * estado.zoom;
  const altura = rotacionado.altura * estado.zoom;

  return {
    x: largura > viewport.largura
      ? Math.max(0, (viewport.largura + largura) / 2 - CONTEUDO_MINIMO_VISIVEL_PX)
      : 0,
    y: altura > viewport.altura
      ? Math.max(0, (viewport.altura + altura) / 2 - CONTEUDO_MINIMO_VISIVEL_PX)
      : 0,
  };
}

export function limitarPan(
  estado: EstadoVisualizacaoImagem,
  viewport: TamanhoImagem,
  retangulo: RetanguloImagem | null,
): EstadoVisualizacaoImagem {
  const zoom = limitarZoom(estado.zoom);
  const limites = calcularLimitesPan(viewport, retangulo, { zoom, rotacao: estado.rotacao });

  return {
    ...estado,
    zoom,
    panX: zoom === 1 ? 0 : limitar(estado.panX, -limites.x, limites.x),
    panY: zoom === 1 ? 0 : limitar(estado.panY, -limites.y, limites.y),
  };
}

function girarPonto(ponto: PontoImagem, graus: RotacaoVisual): PontoImagem {
  switch (graus) {
    case 90:
      return { x: -ponto.y, y: ponto.x };
    case 180:
      return { x: -ponto.x, y: -ponto.y };
    case 270:
      return { x: ponto.y, y: -ponto.x };
    default:
      return ponto;
  }
}

export function pontoViewportParaImagem(
  pontoViewport: PontoImagem,
  retangulo: RetanguloImagem,
  estado: Pick<EstadoVisualizacaoImagem, 'zoom' | 'panX' | 'panY' | 'rotacao'>,
): PontoImagem {
  const centro = {
    x: retangulo.esquerda + retangulo.largura / 2,
    y: retangulo.topo + retangulo.altura / 2,
  };
  const semPan = {
    x: pontoViewport.x - centro.x - estado.panX,
    y: pontoViewport.y - centro.y - estado.panY,
  };
  const semRotacao = girarPonto(semPan, (360 - estado.rotacao) % 360 as RotacaoVisual);

  return {
    x: retangulo.largura / 2 + semRotacao.x / estado.zoom,
    y: retangulo.altura / 2 + semRotacao.y / estado.zoom,
  };
}

export function pontoImagemParaPercentual(
  ponto: PontoImagem,
  retangulo: Pick<RetanguloImagem, 'largura' | 'altura'>,
): PontoImagem {
  return {
    x: limitar((ponto.x / retangulo.largura) * 100, 0, 100),
    y: limitar((ponto.y / retangulo.altura) * 100, 0, 100),
  };
}

/** Mantém sob o ponteiro o mesmo ponto lógico da imagem ao trocar o zoom. */
export function aplicarZoomNoPonto(
  estado: EstadoVisualizacaoImagem,
  novoZoom: number,
  pontoViewport: PontoImagem,
  viewport: TamanhoImagem,
  retangulo: RetanguloImagem | null,
): EstadoVisualizacaoImagem {
  if (!retangulo) return { ...estado, zoom: limitarZoom(novoZoom) };

  const zoom = limitarZoom(novoZoom);
  const pontoImagem = pontoViewportParaImagem(pontoViewport, retangulo, estado);
  const centro = {
    x: retangulo.esquerda + retangulo.largura / 2,
    y: retangulo.topo + retangulo.altura / 2,
  };
  const deslocamento = {
    x: (pontoImagem.x - retangulo.largura / 2) * zoom,
    y: (pontoImagem.y - retangulo.altura / 2) * zoom,
  };
  const rotacionado = girarPonto(deslocamento, estado.rotacao);

  return limitarPan({
    ...estado,
    zoom,
    panX: pontoViewport.x - centro.x - rotacionado.x,
    panY: pontoViewport.y - centro.y - rotacionado.y,
  }, viewport, retangulo);
}

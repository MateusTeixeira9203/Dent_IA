export type RotacaoFoto = 0 | 90 | 180 | 270;

export type FotoOtimizada = {
  arquivo: File;
  nomeExibicao: string;
  tamanhoOriginal: number;
};

export type OtimizarFotoResultado =
  | { ok: true; foto: FotoOtimizada }
  | { ok: false; erro: 'formato_nao_suportado' | 'imagem_corrompida' };

const FORMATOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAIOR_LADO_MAXIMO = 2048;

export function dimensoesFotoOtimizada(
  largura: number,
  altura: number,
  rotacao: RotacaoFoto = 0,
): { largura: number; altura: number } {
  const escala = Math.min(1, MAIOR_LADO_MAXIMO / Math.max(largura, altura));
  const larguraEscalada = Math.max(1, Math.round(largura * escala));
  const alturaEscalada = Math.max(1, Math.round(altura * escala));

  return rotacao === 90 || rotacao === 270
    ? { largura: alturaEscalada, altura: larguraEscalada }
    : { largura: larguraEscalada, altura: alturaEscalada };
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagem_corrompida'));
    };
    imagem.src = url;
  });
}

function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
}

function nomeJpeg(nome: string): string {
  const semExtensao = nome.replace(/\.[^.]+$/, '').trim() || 'foto-clinica';
  return `${semExtensao}.jpg`;
}

export async function otimizarFotoClinica(
  arquivo: File,
  rotacao: RotacaoFoto = 0,
): Promise<OtimizarFotoResultado> {
  if (!FORMATOS_FOTO.has(arquivo.type)) return { ok: false, erro: 'formato_nao_suportado' };

  try {
    const imagem = await carregarImagem(arquivo);
    const escala = Math.min(1, MAIOR_LADO_MAXIMO / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
    const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const dimensoes = dimensoesFotoOtimizada(imagem.naturalWidth, imagem.naturalHeight, rotacao);
    const canvas = document.createElement('canvas');
    canvas.width = dimensoes.largura;
    canvas.height = dimensoes.altura;
    const contexto = canvas.getContext('2d');
    if (!contexto) return { ok: false, erro: 'imagem_corrompida' };

    if (rotacao === 90) {
      contexto.translate(canvas.width, 0);
      contexto.rotate(Math.PI / 2);
    } else if (rotacao === 180) {
      contexto.translate(canvas.width, canvas.height);
      contexto.rotate(Math.PI);
    } else if (rotacao === 270) {
      contexto.translate(0, canvas.height);
      contexto.rotate(-Math.PI / 2);
    }
    contexto.drawImage(imagem, 0, 0, largura, altura);

    const blob = await canvasParaBlob(canvas);
    if (!blob) return { ok: false, erro: 'imagem_corrompida' };

    return {
      ok: true,
      foto: {
        arquivo: new File([blob], nomeJpeg(arquivo.name), { type: 'image/jpeg' }),
        nomeExibicao: arquivo.name,
        tamanhoOriginal: arquivo.size,
      },
    };
  } catch {
    return { ok: false, erro: 'imagem_corrompida' };
  }
}

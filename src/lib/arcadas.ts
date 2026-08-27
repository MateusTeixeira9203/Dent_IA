/**
 * Sentinelas de arcada / boca inteira.
 *
 * Procedimentos de arcada ou boca toda não têm um dente FDI individual — são
 * representados por números sentinela gravados em `fichas.dentes_afetados` (int[]),
 * junto dos dentes reais. Ficam acima de 90 para nunca colidirem com FDI válido
 * (permanentes 11–48, decíduos 51–85).
 */
export const ARCH_SUPERIOR = 97;
export const ARCH_INFERIOR = 98;
export const ARCH_COMPLETA = 99;

/**
 * Sentinelas de quadrante (ficha unificada, #16 D5) — raspagem/alisamento por quadrante
 * (caso perio comum). Ficam em 91–94 pra não colidir com FDI (11–48/51–85) nem arcada (97–99).
 */
export const QUAD_SUP_DIREITO = 91;
export const QUAD_SUP_ESQUERDO = 92;
export const QUAD_INF_DIREITO = 93;
export const QUAD_INF_ESQUERDO = 94;

export const ARCH_LABELS: Record<number, string> = {
  [ARCH_SUPERIOR]: 'Arcada Superior',
  [ARCH_INFERIOR]: 'Arcada Inferior',
  [ARCH_COMPLETA]: 'Boca Toda',
  [QUAD_SUP_DIREITO]: 'Quadrante Sup. Direito',
  [QUAD_SUP_ESQUERDO]: 'Quadrante Sup. Esquerdo',
  [QUAD_INF_DIREITO]: 'Quadrante Inf. Direito',
  [QUAD_INF_ESQUERDO]: 'Quadrante Inf. Esquerdo',
};

/** true se o número é um sentinela de arcada (97/98/99), não um dente FDI. */
export const isArch = (n: number): boolean => n === ARCH_SUPERIOR || n === ARCH_INFERIOR || n === ARCH_COMPLETA;

/** true se o número é um sentinela de quadrante (91–94), não um dente FDI. */
export const isQuadrante = (n: number): boolean =>
  n === QUAD_SUP_DIREITO || n === QUAD_SUP_ESQUERDO || n === QUAD_INF_DIREITO || n === QUAD_INF_ESQUERDO;

/** Rótulo legível: nome da arcada/quadrante para sentinelas, o próprio número para dentes. */
export const denteLabel = (n: number): string => ARCH_LABELS[n] ?? String(n);

/** Nome canônico para o catálogo: espaços previsíveis e nunca o local clínico. */
export const normalizarNomeProcedimento = (nome: string): string =>
  nome.replace(/\s+/g, ' ').trim();

/**
 * Remove a referência de dente de uma descrição de procedimento gerada a partir da ficha.
 * Aceita tanto os formatos antigos quanto o atual (`Restauração — D16`). O item do orçamento
 * mantém a localização; só o catálogo recebe este retorno canônico.
 */
export const stripDenteDoNome = (descricao: string): string =>
  normalizarNomeProcedimento(descricao)
    .replace(/^Dente\s+\d+\s*[–\-—]\s*/i, '')
    .replace(/^D\d+\s*[–\-—]\s*/i, '')
    .replace(/\s*\(D\d+(?:,\s*D\d+)*\)\s*$/i, '')
    .replace(/\s*[–\-—]\s*D\d+(?:\s*,\s*D\d+)*\s*$/i, '')
    .replace(/\s*[–\-—]\s*pilares?\s+D\d+(?:\s+e\s+D\d+|\s*,\s*D\d+)*(?:\s*·\s*pônticos?\s+D\d+(?:\s*,\s*D\d+)*)?\s*$/i, '')
    .trim();

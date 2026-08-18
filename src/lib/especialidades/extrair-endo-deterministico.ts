import type { EndoDetalhe } from './endo';

const CANAIS = /\b(MV2?|DV|ML|DL|MB|DB|P|V|L|[ÚU]nico)\b\s*[:,-]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm\b)?(?:\s*(?:lima\s*)?#?(\d+)\s*\/\s*#?(\d+))?/gi;

function comprimentoValido(valor: string): number | null {
  const numero = Number(valor.replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 8 || numero > 30) return null;
  return Number.isInteger(numero * 2) ? numero : null;
}

function textoDepoisDoRotulo(texto: string, rotulo: string): string | null {
  const match = texto.match(new RegExp(`\\b${rotulo}\\s*[:=-]?\\s*([^;.\\n]+)`, 'i'));
  const valor = match?.[1]?.trim().replace(/^com\s+/i, '');
  return valor || null;
}

/**
 * R-49 F1 — extrator local para relatos semi-estruturados. Não tenta adivinhar dente, canal
 * ou medida: só devolve detalhe quando o relato ancora explicitamente os dados em um dente.
 */
export function extrairEndoDeterministico(
  texto: string,
  dentes: number[],
): Map<number, EndoDetalhe> {
  const encontrados = [...new Set(dentes)].flatMap((dente) => {
    const match = new RegExp(`\\b${dente}\\b`, 'g').exec(texto);
    return match ? [{ dente, inicio: match.index }] : [];
  }).sort((a, b) => a.inicio - b.inicio);

  if (encontrados.length === 0) return new Map();

  const saida = new Map<number, EndoDetalhe>();
  for (let i = 0; i < encontrados.length; i++) {
    const atual = encontrados[i];
    const trecho = texto.slice(atual.inicio, encontrados[i + 1]?.inicio);
    const canais: EndoDetalhe['canais'] = [];
    for (const match of trecho.matchAll(CANAIS)) {
      const comprimentoRaiz = comprimentoValido(match[2]);
      if (comprimentoRaiz == null) continue;
      const nome = match[1].normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
      canais.push({
        nome: nome === 'UNICO' ? 'Único' : nome,
        referencia: null,
        comprimentoRaiz,
        limaInicial: match[3] ? `#${match[3]}` : null,
        limaFinal: match[4] ? `#${match[4]}` : null,
      });
    }
    const obturacao = textoDepoisDoRotulo(trecho, 'obtura(?:ç[aã]o|cao)');
    const cimento = textoDepoisDoRotulo(trecho, 'cimento');
    if (canais.length > 0 || obturacao || cimento) {
      saida.set(atual.dente, { canais: canais.length > 0 ? canais : [{ nome: 'Único', referencia: null, comprimentoRaiz: null, limaInicial: null, limaFinal: null }], obturacao, cimento });
    }
  }
  return saida;
}

import type { EndoDetalhe } from './endo';

export type OrigemCelulaEndo = 'deterministico' | 'ia' | 'manual';

export type DuvidaEndo = {
  campo: string;
  trecho: string;
  motivo: 'sem_canal' | 'fora_da_faixa' | 'resolucao_invalida' | 'conflito';
};

export type EndoExtraction = {
  dente: number;
  detalhe: EndoDetalhe;
  origemPorCampo: Record<string, OrigemCelulaEndo>;
  duvidas: DuvidaEndo[];
};

export type EndoExtractionResult =
  | { ok: true; extracoes: EndoExtraction[] }
  | { ok: false; motivo: 'nada-extraido' | 'erro'; mensagem?: string };

const CANAIS = /\b(MV2?|DV|ML|DL|MB|DB|P|V|L|[ÚU]nico)\b\s*[:,-]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm\b)?(?:\s*(?:lima\s*)?#?(\d+)\s*\/\s*#?(\d+))?/gi;
const NUMERO_COM_MM = /\b(\d+(?:[.,]\d+)?)\s*mm\b/gi;

function comprimentoValido(valor: string): { valor: number | null; motivo?: DuvidaEndo['motivo'] } {
  const numero = Number(valor.replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 8 || numero > 30) return { valor: null, motivo: 'fora_da_faixa' };
  if (!Number.isInteger(numero * 2)) return { valor: null, motivo: 'resolucao_invalida' };
  return { valor: numero };
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
function nomeCanal(nome: string): string {
  const normalizado = nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  return normalizado === 'UNICO' ? 'Único' : normalizado;
}

/**
 * R-49 — parser local para gramática endodôntica. Ele só conecta uma medida a um dente que
 * esteja no contexto do pass 1; fragmentos soltos continuam explícitos para revisão.
 */
export function extrairEndoDeterministico(texto: string, dentes: number[]): EndoExtractionResult {
  const encontrados = [...new Set(dentes)].flatMap((dente) => {
    const match = new RegExp(`\\b${dente}\\b`, 'g').exec(texto);
    return match ? [{ dente, inicio: match.index }] : [];
  }).sort((a, b) => a.inicio - b.inicio);

  if (encontrados.length === 0) return { ok: false, motivo: 'nada-extraido' };

  const extracoes: EndoExtraction[] = [];
  for (let i = 0; i < encontrados.length; i++) {
    const atual = encontrados[i];
    const trecho = texto.slice(atual.inicio, encontrados[i + 1]?.inicio);
    const canais: EndoDetalhe['canais'] = [];
    const origemPorCampo: Record<string, OrigemCelulaEndo> = {};
    const duvidas: DuvidaEndo[] = [];
    const intervalosCanal: Array<[number, number]> = [];
    for (const match of trecho.matchAll(CANAIS)) {
      const inicio = match.index ?? 0;
      intervalosCanal.push([inicio, inicio + match[0].length]);
      const comprimento = comprimentoValido(match[2]);
      const nome = nomeCanal(match[1]);
      if (comprimento.valor == null) {
        canais.push({ nome, referencia: null, comprimentoRaiz: null, limaInicial: match[3] ? `#${match[3]}` : null, limaFinal: match[4] ? `#${match[4]}` : null });
        duvidas.push({ campo: `canais.${canais.length - 1}.comprimentoRaiz`, trecho: match[0], motivo: comprimento.motivo! });
        continue;
      }
      const indice = canais.length;
      canais.push({
        nome,
        referencia: null,
        comprimentoRaiz: comprimento.valor,
        limaInicial: match[3] ? `#${match[3]}` : null,
        limaFinal: match[4] ? `#${match[4]}` : null,
      });
      origemPorCampo[`canais.${indice}.nome`] = 'deterministico';
      origemPorCampo[`canais.${indice}.comprimentoRaiz`] = 'deterministico';
      if (match[3]) origemPorCampo[`canais.${indice}.limaInicial`] = 'deterministico';
      if (match[4]) origemPorCampo[`canais.${indice}.limaFinal`] = 'deterministico';
    }
    for (const match of trecho.matchAll(NUMERO_COM_MM)) {
      const inicio = match.index ?? 0;
      if (!intervalosCanal.some(([de, ate]) => inicio >= de && inicio < ate)) {
        duvidas.push({ campo: 'comprimentoRaiz', trecho: match[0], motivo: 'sem_canal' });
      }
    }
    const obturacao = textoDepoisDoRotulo(trecho, 'obtura(?:ç[aã]o|cao)');
    const cimento = textoDepoisDoRotulo(trecho, 'cimento');
    if (canais.length > 0) {
      if (obturacao) origemPorCampo.obturacao = 'deterministico';
      if (cimento) origemPorCampo.cimento = 'deterministico';
      extracoes.push({ dente: atual.dente, detalhe: { canais, obturacao, cimento }, origemPorCampo, duvidas });
    } else if (duvidas.length > 0 || obturacao || cimento) {
      // Sem EndoDetalhe válido não há persistência; a dúvida abre a revisão manual.
      extracoes.push({ dente: atual.dente, detalhe: { canais: [{ nome: '', referencia: null, comprimentoRaiz: null, limaInicial: null, limaFinal: null }], obturacao: null, cimento: null }, origemPorCampo, duvidas: [...duvidas, ...(obturacao || cimento ? [{ campo: 'canais', trecho, motivo: 'sem_canal' as const }] : [])] });
    }
  }
  return extracoes.length > 0 ? { ok: true, extracoes } : { ok: false, motivo: 'nada-extraido' };
}

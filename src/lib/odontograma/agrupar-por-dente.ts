/**
 * R-21 — segunda camada de agrupamento: por DENTE, POR CIMA dos cards que
 * `agruparRegistros` (R-02) já produziu. Não toca aquela função nem o RegistroCard —
 * só reorganiza a apresentação da lista: um dente com 2+ procedimentos vira um grupo
 * colapsável; procedimento multi-dente e evento sem dente ganham seção própria no fim.
 *
 * Genérica sobre T pra servir os dois sites (rascunho e ficha salva) sem duplicar lógica —
 * cada chamador já tem cards no shape { data: { ancoras } } (RegistroCardData).
 */
import type { AncoraClinica } from '@/types/odontograma';

/** Shape mínimo que a função precisa — o card do FichasTab já o satisfaz via `data`. */
export interface CardComAncoras {
  data: { ancoras: AncoraClinica[] };
}

export type SecaoRegistros<T extends CardComAncoras> =
  | { tipo: 'dente'; dente: number; cards: T[] }
  | { tipo: 'multi' | 'geral'; cards: T[] };

/** Números de dente distintos de um card (0 = sem dente; 1 = um dente; N = multi-dente). */
function dentesDoCard(card: CardComAncoras): number[] {
  return [...new Set(card.data.ancoras.map((a) => a.dente).filter((d): d is number => d != null))];
}

/**
 * Agrupa cards por dente. 1 dente distinto → seção 'dente'; 2+ → 'multi'; 0 → 'geral'.
 * Seções 'dente' ordenadas 11→48 (número FDI crescente); 'multi' depois; 'geral' por último.
 * A ordem interna de cada seção preserva a ordem de ENTRADA — a ordenação por status
 * (abertos primeiro) já foi feita por `agruparRegistros`; aqui não se reordena.
 */
export function agruparPorDente<T extends CardComAncoras>(cards: T[]): SecaoRegistros<T>[] {
  const porDente = new Map<number, T[]>();
  const multi: T[] = [];
  const geral: T[] = [];

  for (const card of cards) {
    const dentes = dentesDoCard(card);
    if (dentes.length === 1) {
      const arr = porDente.get(dentes[0]);
      if (arr) arr.push(card);
      else porDente.set(dentes[0], [card]);
    } else if (dentes.length >= 2) {
      multi.push(card);
    } else {
      geral.push(card);
    }
  }

  const secoes: SecaoRegistros<T>[] = [...porDente.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dente, cardsDoDente]): SecaoRegistros<T> => ({ tipo: 'dente', dente, cards: cardsDoDente }));

  if (multi.length > 0) secoes.push({ tipo: 'multi', cards: multi });
  if (geral.length > 0) secoes.push({ tipo: 'geral', cards: geral });

  return secoes;
}

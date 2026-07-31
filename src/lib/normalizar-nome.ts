const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüñçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC';
const MAPA = new Map(Array.from(COM_ACENTO).map((c, i) => [c, SEM_ACENTO[i]]));

/**
 * Mesma normalização de `public.normalizar_nome` (migration 125) — mantém app e banco de
 * acordo sobre o que é "mesmo nome" sem round-trip pro banco a cada tecla digitada. R-31a
 * §3.3: usada pela busca, pela checagem de duplicata (§3.1) e pelo relatório da R-31b.
 */
export function normalizarNome(txt: string): string {
  const traduzido = Array.from(txt.trim())
    .map((c) => MAPA.get(c) ?? c)
    .join('');
  return traduzido.replace(/\s+/g, ' ').toLowerCase();
}

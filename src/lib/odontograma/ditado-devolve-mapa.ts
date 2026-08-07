// R-63 §4.3 — decide se um evento registrado pelo campo mágico devolve o slot central pro
// odontograma quando ele está ocupado por uma tabela de especialidade ou pela manutenção
// ortodôntica. Extraído pra testar isolado — mesma razão do casar-procedimento-local.ts: a
// lógica tem 3 casos reais que uma mudança descuidada em registrar() pode quebrar em silêncio.

import type { AncoraClinica } from '@/types/odontograma';

export type SlotCentral =
  | { tipo: 'mapa' }
  | { tipo: 'detalhe'; dente: number }
  | { tipo: 'orto' };

/**
 * true → o slot central deve fechar o ocupante atual e voltar pro mapa.
 *
 * Devolve só quando há confirmação REAL a dar: um evento pintando um dente diferente do
 * que a tabela aberta está mostrando. Não devolve pro mesmo dente (arrancaria a tabela da
 * tela no meio do preenchimento) nem pra âncora de boca (nível boca nunca pinta dente — D5
 * do R-06-07 — devolver seria trocar a tela por nada).
 */
export function ditadoDevolveMapa(slot: SlotCentral, ancoras: AncoraClinica[]): boolean {
  if (slot.tipo === 'mapa') return false;
  const dentes = ancoras
    .filter((a) => a.nivel === 'dente' || a.nivel === 'face')
    .map((a) => a.dente)
    .filter((d): d is number => d != null);
  if (dentes.length === 0) return false;
  if (slot.tipo === 'orto') return true;
  return dentes.some((d) => d !== slot.dente);
}

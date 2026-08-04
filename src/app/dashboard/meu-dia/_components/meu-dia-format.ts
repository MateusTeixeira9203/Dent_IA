// C1 — helpers compartilhados por historico-bloco/a-fazer-bloco. Migrados de
// contexto-coluna.tsx (SAI nesta fatia, vira os blocos da coluna direita/esquerda).

import type { Arcada, FaceDental, QuadranteFDI } from '@/types/odontograma';

/** 'YYYY-MM-DD' → 'DD/MM/AAAA' sem `new Date()` — mesmo cuidado de fuso do resto da casa. */
export function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** R-55 — `faces` é opcional pra não quebrar chamador nenhum; quando presente e há dente,
 *  distingue "dente 15 (O)" de "dente 15 (M)" — antes os dois renderizavam a linha idêntica. */
export function ondeLabel(p: { dente: number | null; arcada: Arcada | null; quadrante: QuadranteFDI | null; faces?: FaceDental[] }): string {
  if (p.dente != null) {
    const faces = p.faces && p.faces.length > 0 ? ` (${p.faces.join(',')})` : '';
    return `dente ${p.dente}${faces}`;
  }
  if (p.arcada != null) return p.arcada === 'superior' ? 'arcada sup.' : 'arcada inf.';
  if (p.quadrante != null) return `Q${p.quadrante}`;
  return 'boca';
}

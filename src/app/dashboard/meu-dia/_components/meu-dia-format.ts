// C1 — helpers compartilhados por historico-bloco/a-fazer-bloco/ja-feito-bloco. Migrados de
// contexto-coluna.tsx (SAI nesta fatia, vira os blocos da coluna direita/esquerda).

import type { Arcada, QuadranteFDI } from '@/types/odontograma';

/** 'YYYY-MM-DD' → 'DD/MM/AAAA' sem `new Date()` — mesmo cuidado de fuso do resto da casa. */
export function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ondeLabel(p: { dente: number | null; arcada: Arcada | null; quadrante: QuadranteFDI | null }): string {
  if (p.dente != null) return `dente ${p.dente}`;
  if (p.arcada != null) return p.arcada === 'superior' ? 'arcada sup.' : 'arcada inf.';
  if (p.quadrante != null) return `Q${p.quadrante}`;
  return 'boca';
}

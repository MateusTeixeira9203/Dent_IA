'use client';

// R-53 — extraído de FichasTab.tsx (R-16, 26/07) pra ser reusado no modal de orçamento, que
// precisa da MESMA faixa de chips sem duplicar layout/lógica. Behavior-preserving: mesmo
// texto, mesmas classes, mesma regra de quando aparece — só muda de casa.

import type { FiltroResponsavel } from '@/lib/fichas/filtro-responsavel';
import { FILTRO_MEUS } from '@/lib/fichas/filtro-responsavel';

export interface ChipsResponsavelProps {
  /** Responsáveis distintos já derivados (`derivarResponsaveis`). */
  responsaveis: { id: string; nome: string }[];
  /** Quem sou eu — decide se o chip "Meus" aparece e o que ele filtra. */
  meuId: string;
  filtro: FiltroResponsavel;
  onFiltroChange: (v: FiltroResponsavel) => void;
}

/** R-16 — só renderiza com ≥2 responsáveis distintos (solo não vê chrome). */
export function ChipsResponsavel({ responsaveis, meuId, filtro, onFiltroChange }: ChipsResponsavelProps) {
  if (responsaveis.length < 2) return null;

  const souResponsavel = responsaveis.some((r) => r.id === meuId);
  const outros = responsaveis.filter((r) => r.id !== meuId);
  const chipClass = (ativo: boolean) =>
    `inline-flex items-center min-h-[40px] text-xs font-bold rounded-full px-3.5 border transition-colors ${
      ativo
        ? 'bg-teal border-teal text-white'
        : 'bg-surface border-border text-text-secondary hover:border-teal hover:text-teal-ink'
    }`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9.5px] font-bold uppercase tracking-widest text-text-secondary mr-1">
        Responsável
      </span>
      <button type="button" onClick={() => onFiltroChange(null)} className={chipClass(filtro === null)}>
        Todos
      </button>
      {souResponsavel && (
        <button type="button" onClick={() => onFiltroChange(FILTRO_MEUS)} className={chipClass(filtro === FILTRO_MEUS)}>
          Meus
        </button>
      )}
      {outros.map((r) => (
        <button key={r.id} type="button" onClick={() => onFiltroChange(r.id)} className={chipClass(filtro === r.id)}>
          {r.nome}
        </button>
      ))}
    </div>
  );
}

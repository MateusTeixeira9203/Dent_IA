'use client';

// R-21 — cabeçalho colapsável de um dente com 2+ procedimentos. Controlado: o FichasTab é
// dono do estado de abertura (dentesAbertosA/B); aqui só se desenha e se dispara onToggle.
// Reusa os tokens do RegistroCard e do §4 da spec — mesma casca (bg-surface/border/rounded-xl),
// pill coral IDÊNTICA ao PILL.coral de registro-card.tsx, número em font-mono font-bold (padrão
// do header do ToothDetailPanel), chevron que gira igual ao do RegistroCard. Corpo aberto usa o
// mesmo tratamento do corpo expandido do RegistroCard (border-t + bg-surface-alt/40).
//
// Dente com 1 procedimento NÃO passa por aqui — renderiza o RegistroCard direto, sem acordeão.

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface DenteGrupoHeaderProps {
  dente: number;
  /** Total de procedimentos (cards agrupados) no dente. */
  total: number;
  /** Quantos ainda estão a fazer (status indicado) — a pill coral só aparece se > 0. */
  aFazer: number;
  aberto: boolean;
  onToggle: () => void;
  /** Os RegistroCard do grupo — só renderizados quando aberto. */
  children: ReactNode;
}

export function DenteGrupoHeader({
  dente, total, aFazer, aberto, onToggle, children,
}: DenteGrupoHeaderProps) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors hover:bg-surface-alt/30"
      >
        <span className="min-w-0 flex-1 text-sm font-medium text-text-secondary">
          Dente <span className="font-mono font-bold text-[15px] text-text-primary">{dente}</span>
          <span className="font-normal"> · {total} procedimento{total > 1 ? 's' : ''}</span>
        </span>

        {aFazer > 0 && (
          <span className="inline-flex items-center gap-1.5 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-coral-pale text-coral-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-coral" />
            {aFazer} a fazer
          </span>
        )}

        <ChevronRight
          className={`w-4 h-4 shrink-0 text-text-secondary transition-transform ${aberto ? 'rotate-90' : ''}`}
        />
      </button>

      {aberto && (
        <div className="border-t border-border bg-surface-alt/40 px-3 py-3 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

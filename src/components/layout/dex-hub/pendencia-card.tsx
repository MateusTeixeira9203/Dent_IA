'use client';

import { ChevronRight } from 'lucide-react';
import type { DexPendencia } from '@/lib/dex/tipos';

interface PendenciaCardProps {
  pendencia: DexPendencia;
  onNavigate: (href: string) => void;
}

export function PendenciaCard({ pendencia, onNavigate }: PendenciaCardProps) {
  return (
    <button
      type="button"
      data-sev={pendencia.severidade}
      onClick={() => onNavigate(pendencia.cta.href)}
      className="block w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-teal/45 data-[sev=alta]:border-l-[3px] data-[sev=alta]:border-l-coral data-[sev=media]:border-l-[3px] data-[sev=media]:border-l-warning"
    >
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold leading-tight text-text-primary">{pendencia.titulo}</span>
        {pendencia.valorParado !== null && (
          <span className="ml-auto whitespace-nowrap font-mono text-xs font-medium text-coral-ink">
            R$ {pendencia.valorParado.toLocaleString('pt-BR')}
          </span>
        )}
      </div>
      <p className="text-xs leading-normal text-text-secondary">{pendencia.descricao}</p>
      {pendencia.chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {pendencia.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-lg bg-surface-alt px-2 py-0.5 text-[10.5px] font-medium text-text-secondary"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
      <span className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-ink">
        {pendencia.cta.label}
        <ChevronRight className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}

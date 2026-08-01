'use client';

// R-46b (D1) — "Onde" no modelo MODERNO (QuadranteFDI direto), não os sentinelas legados
// de src/lib/arcadas.ts (ver correção ao artefato na spec R-46b §1). Um evento tem UM
// nível de âncora só — dente(s) OU região (arcada/quadrante/boca), nunca os dois ao mesmo
// tempo: escolher um limpa o outro.

import { X } from 'lucide-react';
import type { Arcada, QuadranteFDI } from '@/types/odontograma';
import { FdiPopover } from './fdi-popover';

export type OndeValor =
  | { tipo: 'dentes'; dentes: number[] }
  | { tipo: 'regiao'; nivel: 'boca' }
  | { tipo: 'regiao'; nivel: 'arcada'; arcada: Arcada }
  | { tipo: 'regiao'; nivel: 'quadrante'; quadrante: QuadranteFDI }
  | null;

const REGIOES: Array<{ label: string; valor: Extract<OndeValor, { tipo: 'regiao' }> }> = [
  { label: 'Arc. sup.', valor: { tipo: 'regiao', nivel: 'arcada', arcada: 'superior' } },
  { label: 'Arc. inf.', valor: { tipo: 'regiao', nivel: 'arcada', arcada: 'inferior' } },
  { label: 'Boca toda', valor: { tipo: 'regiao', nivel: 'boca' } },
  { label: 'Q1', valor: { tipo: 'regiao', nivel: 'quadrante', quadrante: 1 } },
  { label: 'Q2', valor: { tipo: 'regiao', nivel: 'quadrante', quadrante: 2 } },
  { label: 'Q3', valor: { tipo: 'regiao', nivel: 'quadrante', quadrante: 3 } },
  { label: 'Q4', valor: { tipo: 'regiao', nivel: 'quadrante', quadrante: 4 } },
];

function mesmaRegiao(a: Extract<OndeValor, { tipo: 'regiao' }>, b: OndeValor): boolean {
  if (b?.tipo !== 'regiao' || a.nivel !== b.nivel) return false;
  if (a.nivel === 'arcada' && b.nivel === 'arcada') return a.arcada === b.arcada;
  if (a.nivel === 'quadrante' && b.nivel === 'quadrante') return a.quadrante === b.quadrante;
  return a.nivel === 'boca';
}

const chipCls = (sel: boolean) =>
  `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
    sel
      ? 'border-teal bg-teal/10 text-teal'
      : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40 hover:text-teal'
  }`;

export function OndeSeletor({ valor, onChange }: { valor: OndeValor; onChange: (v: OndeValor) => void }) {
  const dentes = valor?.tipo === 'dentes' ? valor.dentes : [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Onde</span>

      {dentes.map((d) => (
        <span key={d} className={`${chipCls(true)} flex items-center gap-1 font-mono`}>
          {d}
          <button type="button" onClick={() => onChange({ tipo: 'dentes', dentes: dentes.filter((x) => x !== d) })} aria-label={`Remover dente ${d}`}>
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      <FdiPopover
        dentesSelecionados={dentes}
        onChange={(novos) => onChange(novos.length > 0 ? { tipo: 'dentes', dentes: novos } : null)}
        trigger={<button type="button" className={chipCls(false)}>+ dente</button>}
      />

      {REGIOES.map(({ label, valor: v }) => {
        const sel = mesmaRegiao(v, valor);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(sel ? null : v)}
            className={chipCls(sel)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

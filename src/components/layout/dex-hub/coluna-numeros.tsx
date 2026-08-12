'use client';

import type { DexNumero } from '@/lib/dex/tipos';

interface ColunaNumerosProps {
  numeros: DexNumero[];
}

/** Coluna 2: "Hoje e a semana" (D10) — provisória, só com números que já existem.
 *  Vira "O mês", com comparativo ao mês anterior, no R-103c. */
export function ColunaNumeros({ numeros }: ColunaNumerosProps) {
  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-teal-ink">Hoje e a semana</span>
      </div>

      <div className="space-y-2">
        {numeros.map((n) => (
          <div key={n.label} className="rounded-2xl bg-surface-alt px-[0.95rem] py-3.5">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary">
              {n.label}
            </span>
            <div className="font-mono text-[1.2rem] font-medium leading-none text-text-primary">{n.valor}</div>
            {n.detalhe !== null && (
              <p className="mt-1.5 truncate text-[10.5px] text-text-muted">{n.detalhe}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

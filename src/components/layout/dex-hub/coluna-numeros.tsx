'use client';

import type { DexNumero } from '@/lib/dex/tipos';

interface ColunaNumerosProps {
  numeros: DexNumero[];
}

/** Coluna 2: "O mês" (R-103c) — atendimentos, visitas por paciente e crescimento vs mês
 *  anterior, com fonte em `fichas` (D10 do R-103a resolvido). */
export function ColunaNumeros({ numeros }: ColunaNumerosProps) {
  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-teal-ink">O mês</span>
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

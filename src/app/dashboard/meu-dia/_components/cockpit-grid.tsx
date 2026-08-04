// C1 — shell de layout puro das 3 zonas (contrato §3): 320px | 1fr | 312px, gap 12px.
//
// C6 (§2 Q2, 04/08) — `colapsarDireita` morreu aqui, e foi trazido de volta na revisão do
// mesmo dia (04/08, ao vivo): o painel do dente voltou a flutuar ao lado do odontograma
// (`registrar-painel.tsx`), não mais resumo+Sheet — sem colapsar a direita, o painel some com
// a largura da coluna direita fixa E do painel ao mesmo tempo, reproduzindo a regressão WCAG
// que o C6 original mediu (dente <24px). Colapsar devolve o espaço: o centro sozinho fica com
// a mesma largura que já tinha antes do painel existir.

import type { ReactNode } from 'react';

export interface CockpitGridProps {
  esquerda: ReactNode;
  centro: ReactNode;
  direita: ReactNode;
  colapsarDireita?: boolean;
}

export function CockpitGrid({ esquerda, centro, direita, colapsarDireita }: CockpitGridProps) {
  return (
    <div
      className={`grid gap-3 items-start ${
        colapsarDireita ? 'grid-cols-[320px_minmax(0,1fr)]' : 'grid-cols-[320px_minmax(0,1fr)_312px]'
      }`}
    >
      <div className="flex flex-col gap-3">{esquerda}</div>
      <div className="min-w-0">{centro}</div>
      {!colapsarDireita && <div className="flex flex-col gap-3">{direita}</div>}
    </div>
  );
}

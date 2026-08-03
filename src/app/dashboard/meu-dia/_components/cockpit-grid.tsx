// C1 — shell de layout puro das 3 zonas (contrato §3): 320px | 1fr | 312px, gap 12px.
//
// C3 (§5.3) — painel do dente aberto: a coluna direita esconde e devolve os 312px pro
// centro (medido sem o colapso: dente a 22,8px, reprova WCAG 2.2; com colapso, ~34px —
// o odontograma é fluido, ganha a largura sozinho). Nenhum desenho aprovado existia pra
// uma "faixa fina" visível com conteúdo próprio — esconder de vez é a leitura mais fiel
// ao "devolve 312px ao centro" sem inventar um estado visual que não foi medido.

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

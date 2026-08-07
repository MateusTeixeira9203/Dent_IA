// C1 — shell de layout puro das 3 zonas (contrato §3): 320px | 1fr | 312px, gap 12px.
//
// C7 (04/08) — `colapsarDireita` morre de novo, desta vez sem volta: o painel do dente saiu do
// centro (não compartilha mais linha com o odontograma, ver `registrar-painel.tsx`) e virou um
// 3º bloco na própria coluna direita (`meu-dia-client.tsx`) — a grade não precisa mais
// comprimir/expandir pra caber ele. 1 único layout, sempre.

import type { ReactNode } from 'react';

export interface CockpitGridProps {
  esquerda: ReactNode;
  centro: ReactNode;
  direita: ReactNode;
}

export function CockpitGrid({ esquerda, centro, direita }: CockpitGridProps) {
  return (
    <div className="grid gap-3 items-start grid-cols-[320px_minmax(0,1fr)_312px]">
      <div className="flex flex-col gap-3">{esquerda}</div>
      <div className="min-w-0">{centro}</div>
      <div className="flex flex-col gap-3">{direita}</div>
    </div>
  );
}

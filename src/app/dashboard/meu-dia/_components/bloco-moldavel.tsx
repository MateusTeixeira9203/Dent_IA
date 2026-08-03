'use client';

// C1 (contrato §5.1) — acordeão genérico das 3 colunas do cockpit. 1 aberto por vez é
// governado pela coluna (useState<string|null>), não por este componente — ele só é
// controlado. Fechado não monta o corpo: os 3 blocos hoje são leitura, então não há
// rascunho pra perder ao desmontar.

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface BlocoMoldavelProps {
  id: string;
  titulo: string;
  /** SEMPRE `lista.length` de quem chama — nunca um contador rastreado à parte. */
  contador?: number;
  /** Visível só quando `aberto === false`. */
  resumo?: ReactNode;
  aberto: boolean;
  onToggle: () => void;
  /** Título ganha `text-teal-ink` em vez de `text-text-secondary` — sinaliza "tem novidade". */
  destaque?: boolean;
  children: ReactNode;
}

export function BlocoMoldavel({
  id, titulo, contador, resumo, aberto, onToggle, destaque, children,
}: BlocoMoldavelProps) {
  const painelId = `bloco-${id}-painel`;

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex h-9 w-full items-center justify-between gap-2 px-3"
      >
        <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${destaque ? 'text-teal-ink' : 'text-text-secondary'}`}>
          {titulo}
          {contador !== undefined && <span className="ml-1.5 text-text-secondary/70">{contador}</span>}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform ${aberto ? '' : '-rotate-90'}`}
          aria-hidden
        />
      </button>

      {!aberto && resumo && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">{resumo}</div>
      )}

      {aberto && (
        <div id={painelId} className="border-t border-border px-3 pb-3 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

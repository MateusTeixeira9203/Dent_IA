'use client';

// R-46b (D3 da spec — opção A) — grid FDI leve, não o Odontograma anatômico inteiro.
// Reusa a numeração já exportada de Odontograma.tsx (TEETH_UPPER/_LOWER/_DEC) — zero
// duplicação de layout dental. Multi-toque: cada toque alterna o dente na seleção, sem
// fechar — fecha ao clicar fora (Popover) ou no "Fechar", e a seleção vira chips no
// "Onde" de quem chamou.

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui/popover';
import { TEETH_UPPER, TEETH_LOWER, TEETH_UPPER_DEC, TEETH_LOWER_DEC } from '@/components/odontograma/Odontograma';

interface FdiPopoverProps {
  dentesSelecionados: number[];
  onChange: (dentes: number[]) => void;
  trigger: React.ReactNode;
}

function Fileira({
  dentes, selecionados, onToggle,
}: {
  dentes: number[];
  selecionados: number[];
  onToggle: (dente: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {dentes.map((d) => {
        const sel = selecionados.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onToggle(d)}
            aria-pressed={sel}
            className={`flex h-[26px] min-w-[26px] items-center justify-center rounded-md border font-mono text-[10px] font-semibold transition-colors ${
              sel
                ? 'border-teal bg-teal text-white'
                : 'border-border bg-surface-alt text-text-secondary hover:border-teal/50 hover:text-teal'
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

export function FdiPopover({ dentesSelecionados, onChange, trigger }: FdiPopoverProps) {
  const [deciduos, setDeciduos] = useState(false);

  function toggle(dente: number) {
    onChange(
      dentesSelecionados.includes(dente)
        ? dentesSelecionados.filter((d) => d !== dente)
        : [...dentesSelecionados, dente],
    );
  }

  const superior = deciduos ? TEETH_UPPER_DEC : TEETH_UPPER;
  const inferior = deciduos ? TEETH_LOWER_DEC : TEETH_LOWER;

  return (
    <Popover>
      <PopoverTrigger render={trigger as React.ReactElement} />
      <PopoverContent className="w-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setDeciduos((v) => !v)}
              className="text-[10px] font-semibold text-text-secondary hover:text-teal"
            >
              {deciduos ? '✓ decíduos' : 'decíduos ▾'}
            </button>
            <PopoverClose className="flex items-center gap-1 text-[10px] font-bold text-teal hover:opacity-75">
              <Check className="h-3 w-3" /> Fechar
            </PopoverClose>
          </div>
          <Fileira dentes={superior} selecionados={dentesSelecionados} onToggle={toggle} />
          <Fileira dentes={inferior} selecionados={dentesSelecionados} onToggle={toggle} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

'use client';

import { ESPECIALIDADES, type Especialidade } from '@/lib/especialidades';

export interface EspecialidadeChipsProps {
  selected: Especialidade[];
  onChange: (next: Especialidade[]) => void;
  disabled?: boolean;
}

/**
 * Chips toggle de multi-especialidade.
 *
 * 15/08 — era `grid grid-cols-2 sm:grid-cols-3` com `break-words`. A combinação partia palavra
 * no meio: com 3 colunas fixas de ~85px, "Ortodontia" virava "Ortodo/ntia" e "Odontopediatria"
 * virava "Odont/opedia/tria". Grade de coluna fixa não serve pra rótulo de largura variável —
 * o chip tem que ter a largura do texto, não o contrário.
 *
 * Agora é `flex-wrap` + `whitespace-nowrap`: cada chip mede o que o texto pede e a linha quebra
 * ENTRE chips, nunca dentro de um. É também o mesmo idioma dos chips que já existem no cockpit
 * (`registrar-painel.tsx`: `flex flex-wrap gap-1.5`, `rounded-full`) — em vez de um 2º padrão
 * de chip no projeto.
 */
export function EspecialidadeChips({ selected, onChange, disabled = false }: EspecialidadeChipsProps) {
  const toggle = (esp: Especialidade) => {
    onChange(
      selected.includes(esp) ? selected.filter((e) => e !== esp) : [...selected, esp]
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {ESPECIALIDADES.map((esp) => {
        const isSelected = selected.includes(esp);
        return (
          <button
            key={esp}
            type="button"
            disabled={disabled}
            onClick={() => toggle(esp)}
            aria-pressed={isSelected}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold leading-tight transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              isSelected
                ? 'bg-teal border-teal text-white shadow-[0_2px_6px_rgba(47,156,133,0.35)]'
                : 'bg-surface-alt border-border text-text-secondary hover:border-teal/50 hover:text-teal hover:bg-teal/5'
            }`}
          >
            {esp}
          </button>
        );
      })}
    </div>
  );
}

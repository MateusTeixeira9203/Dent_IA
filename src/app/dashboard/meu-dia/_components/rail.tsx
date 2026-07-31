'use client';

// R-46a — rail horizontal dos atendimentos do dia. Badge de status reusa a paleta e as
// classes literais já em produção (today-agenda.tsx / atendimentos-hoje.tsx); o ⚠ "sem
// registro" é sinal NOVO, camada extra sobre o status real do agendamento — G3 da spec:
// completed + sem ficha hoje, mesma régua do baseline medido em 31/07.

import type { MeuDiaSlot } from '@/server/dashboard/get-meu-dia';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Aguardando',
  confirmed: 'Confirmado',
  checked_in: 'Na recepção',
  in_progress: 'Atendendo',
  completed: 'Concluído',
  no_show: 'Faltou',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-surface-alt text-text-secondary',
  confirmed: 'bg-teal/10 text-teal',
  checked_in: 'bg-teal/20 text-teal font-bold',
  in_progress: 'bg-teal text-white',
  completed: 'bg-surface-alt text-text-secondary',
  no_show: 'bg-coral/10 text-coral',
};

export interface RailProps {
  slots: MeuDiaSlot[];
  selecionadoId: string | null;
  onSelecionar: (pacienteId: string) => void;
}

export function Rail({ slots, selecionadoId, onSelecionar }: RailProps) {
  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center">
        <p className="text-sm font-medium text-text-secondary">Nenhum atendimento hoje.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide rounded-2xl border border-border bg-surface p-3">
      {slots.map((slot) => {
        const selecionado = slot.pacienteId === selecionadoId;
        const semRegistro = slot.statusAgendamento === 'completed' && !slot.temFichaHoje;

        return (
          <button
            key={slot.agendamentoId}
            type="button"
            onClick={() => onSelecionar(slot.pacienteId)}
            className={`min-w-[112px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              selecionado
                ? 'border-teal bg-teal/[0.06]'
                : semRegistro
                  ? 'border-coral/30 hover:border-coral/50'
                  : 'border-border hover:border-teal/40 hover:bg-surface-alt'
            }`}
          >
            <span className="font-mono text-[10px] text-text-secondary">{slot.horario}</span>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-text-primary">
              {slot.pacienteNome}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  STATUS_COLOR[slot.statusAgendamento] ?? STATUS_COLOR.scheduled
                }`}
              >
                {STATUS_LABEL[slot.statusAgendamento] ?? slot.statusAgendamento}
              </span>
            </div>
            {slot.temFichaHoje && (
              <p className="mt-1 text-[10px] font-semibold text-teal">✓ registrado</p>
            )}
            {semRegistro && (
              <p className="mt-1 text-[10px] font-semibold text-coral">⚠ sem registro</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

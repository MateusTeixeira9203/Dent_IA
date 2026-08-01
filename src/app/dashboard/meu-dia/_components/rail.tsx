'use client';

// R-46a — rail horizontal dos atendimentos do dia. Badge de status reusa a paleta e as
// classes literais já em produção (today-agenda.tsx / atendimentos-hoje.tsx); o ⚠ "sem
// registro" é sinal NOVO, camada extra sobre o status real do agendamento — G3 da spec:
// completed + sem ficha hoje, mesma régua do baseline medido em 31/07.
// R-46g — o card virou div (seleção e "iniciar consulta" são 2 controles distintos, não dá
// pra aninhar <a>/<button> dentro de <button>). Seleção troca o contexto embaixo; "iniciar
// consulta"/"continuar atendimento" só aparece no card selecionado e leva pro /consulta de
// sempre — nenhum caminho paralelo de atendimento (I3).

import Link from 'next/link';
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

// Mesma condição de month-view.tsx:379 — I4 da spec: uma regra só de "pode atender" no
// projeto, não uma cópia divergente. Exportada pro R-46b2 (meu-dia-client.tsx) calcular o
// "próximo" com a MESMA régua que decide se o rail oferece "Iniciar consulta".
export function podeAtender(status: string): boolean {
  return !['cancelled', 'no_show', 'completed'].includes(status);
}

export interface RailProps {
  slots: MeuDiaSlot[];
  selecionadoId: string | null;
  onSelecionar: (agendamentoId: string) => void;
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
    <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide rounded-2xl border border-border bg-surface p-3">
      {slots.map((slot) => {
        const selecionado = slot.agendamentoId === selecionadoId;
        const semRegistro = slot.statusAgendamento === 'completed' && !slot.temFichaHoje;

        return (
          <div
            key={slot.agendamentoId}
            className={`min-w-[112px] shrink-0 overflow-hidden rounded-xl border transition-colors ${
              selecionado
                ? 'border-teal bg-teal/[0.06]'
                : semRegistro
                  ? 'border-coral/30 hover:border-coral/50'
                  : 'border-border hover:border-teal/40 hover:bg-surface-alt'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelecionar(slot.agendamentoId)}
              className="w-full px-3 py-2.5 text-left"
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
            {selecionado && podeAtender(slot.statusAgendamento) && (
              <Link
                href={`/consulta/${slot.agendamentoId}`}
                className="block border-t border-teal/20 px-3 py-1.5 text-center text-[10.5px] font-bold text-teal transition-colors hover:bg-teal/10"
              >
                {slot.statusAgendamento === 'in_progress' ? 'Continuar atendimento' : 'Iniciar consulta'}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

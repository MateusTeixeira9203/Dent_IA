'use client';

// R-46a — dono do estado de seleção (qual paciente do rail está com o contexto aberto
// embaixo). Default: o "atendendo" (in_progress/checked_in) se houver; senão o 1º slot.

import { useMemo, useState } from 'react';
import { Rail } from './rail';
import { ContextoColuna } from './contexto-coluna';
import type { MeuDiaData } from '@/server/dashboard/get-meu-dia';

export function MeuDiaClient({ slots, contextoPorPaciente }: MeuDiaData) {
  const defaultPacienteId = useMemo(() => {
    const emAtendimento = slots.find(
      (s) => s.statusAgendamento === 'in_progress' || s.statusAgendamento === 'checked_in',
    );
    return (emAtendimento ?? slots[0])?.pacienteId ?? null;
  }, [slots]);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(defaultPacienteId);

  const slotSelecionado = slots.find((s) => s.pacienteId === selecionadoId) ?? slots[0] ?? null;
  const contexto = slotSelecionado ? contextoPorPaciente[slotSelecionado.pacienteId] : null;

  return (
    <div className="flex flex-col gap-4">
      <Rail
        slots={slots}
        selecionadoId={selecionadoId ?? slotSelecionado?.pacienteId ?? null}
        onSelecionar={setSelecionadoId}
      />
      {slotSelecionado && contexto && (
        <ContextoColuna
          pacienteId={slotSelecionado.pacienteId}
          pacienteNome={slotSelecionado.pacienteNome}
          contexto={contexto}
        />
      )}
    </div>
  );
}

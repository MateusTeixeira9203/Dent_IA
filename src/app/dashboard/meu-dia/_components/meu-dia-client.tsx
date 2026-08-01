'use client';

// R-46a — dono do estado de seleção (qual atendimento do rail está com o contexto aberto
// embaixo). R-46g (D5): a chave é agendamentoId, não pacienteId — 2 atendimentos do mesmo
// paciente no mesmo dia (retorno) ficariam indistinguíveis por pacienteId. Precedência do
// default: agendamentoInicialId (veio de ?ag=, se casar com um slot) > em atendimento
// (in_progress/checked_in) > 1º slot.
// R-46b — RegistrarPainel ganha `key={agendamentoId}`: troca de paciente no rail remonta o
// painel do zero (rascunho não vazio, zero escrita) em vez de herdar estado de outro
// paciente — mais simples que resetar cada useState um a um.
// R-46b2 — `onSalvo` é como o painel avisa "salvei, pode avançar": este componente decide
// pra QUEM (próximo slot que `podeAtender`, mesma régua do rail) e refaz `router.refresh()`
// pra puxar `slots`/`contextoPorPaciente` frescos do servidor (✓ registrado, pendências
// fechadas) sem sair da rota (G3). `selecionadoId=null` depois de um `onSalvo` sem próximo é
// INTENCIONAL — vira o estado de fim de dia (G4), nunca cai de volta pro slots[0] (por isso o
// fallback antigo `?? slots[0]` saiu: ele reabriria o primeiro paciente do dia em silêncio).
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rail, podeAtender } from './rail';
import { ContextoColuna } from './contexto-coluna';
import { RegistrarPainel } from './registrar-painel';
import type { MeuDiaData } from '@/server/dashboard/get-meu-dia';

interface MeuDiaClientProps extends MeuDiaData {
  agendamentoInicialId?: string;
}

export function MeuDiaClient({ slots, contextoPorPaciente, agendamentoInicialId, catalogoProcedimentos }: MeuDiaClientProps) {
  const router = useRouter();

  const defaultAgendamentoId = useMemo(() => {
    if (agendamentoInicialId && slots.some((s) => s.agendamentoId === agendamentoInicialId)) {
      return agendamentoInicialId;
    }
    const emAtendimento = slots.find(
      (s) => s.statusAgendamento === 'in_progress' || s.statusAgendamento === 'checked_in',
    );
    return (emAtendimento ?? slots[0])?.agendamentoId ?? null;
  }, [slots, agendamentoInicialId]);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(defaultAgendamentoId);

  const slotSelecionado = selecionadoId ? (slots.find((s) => s.agendamentoId === selecionadoId) ?? null) : null;
  const contexto = slotSelecionado ? contextoPorPaciente[slotSelecionado.pacienteId] : null;

  function avancarProximo() {
    const idxAtual = slots.findIndex((s) => s.agendamentoId === selecionadoId);
    const proximo = idxAtual === -1 ? undefined : slots.slice(idxAtual + 1).find((s) => podeAtender(s.statusAgendamento));
    setSelecionadoId(proximo?.agendamentoId ?? null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Rail slots={slots} selecionadoId={selecionadoId} onSelecionar={setSelecionadoId} />
      {slotSelecionado && contexto ? (
        <>
          <ContextoColuna
            pacienteId={slotSelecionado.pacienteId}
            pacienteNome={slotSelecionado.pacienteNome}
            contexto={contexto}
          />
          <RegistrarPainel
            key={slotSelecionado.agendamentoId}
            pacienteId={slotSelecionado.pacienteId}
            agendamentoId={slotSelecionado.agendamentoId}
            pendencias={contexto.pendencias}
            catalogoProcedimentos={catalogoProcedimentos}
            onSalvo={avancarProximo}
          />
        </>
      ) : slots.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Todos os atendimentos de hoje foram registrados.</p>
          <p className="mt-1 text-xs text-text-secondary">Bom trabalho — o dia terminou por aqui.</p>
        </div>
      ) : null}
    </div>
  );
}

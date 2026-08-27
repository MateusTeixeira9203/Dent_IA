'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  criarPedidoProtetico,
  criarRetornoComPedido,
  type PedidoProteticoRetornoInput,
} from '@/app/dashboard/agendamentos/actions';
import { buildClinicDatetime } from '@/app/dashboard/agendamentos/_components/date-helpers';
import { formatHora } from '@/lib/agenda/disponibilidade';

export interface MarcarRetornoForm {
  data: string | null;
  minutoDoDia: number | null;
  duracao: string;
  observacoes: string;
  pedidoProtetico: PedidoProteticoRetornoInput | null;
}

export function criarFormRetornoInicial(): MarcarRetornoForm {
  return {
    data: null,
    minutoDoDia: null,
    duracao: '30',
    observacoes: '',
    pedidoProtetico: null,
  };
}

interface RetornoConcluido {
  data: string;
  minutoDoDia: number;
  comPedido: boolean;
}

interface UseMarcarRetornoOptions {
  pacienteId: string;
  onConcluido: (retorno: RetornoConcluido) => void;
}

interface UseMarcarRetornoResult {
  form: MarcarRetornoForm;
  setForm: Dispatch<SetStateAction<MarcarRetornoForm>>;
  error: string | null;
  limparErro: () => void;
  saving: boolean;
  pedidoPendente: boolean;
  marcarRetorno: (dentistaId: string | null) => Promise<void>;
  tentarEnviarPedido: (dentistaId: string | null) => Promise<void>;
  resetar: () => void;
}

export function useMarcarRetorno({ pacienteId, onConcluido }: UseMarcarRetornoOptions): UseMarcarRetornoResult {
  const [form, setForm] = useState<MarcarRetornoForm>(criarFormRetornoInicial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [agendamentoPendenteId, setAgendamentoPendenteId] = useState<string | null>(null);

  const resetar = useCallback(() => {
    setForm(criarFormRetornoInicial());
    setError(null);
    setAgendamentoPendenteId(null);
  }, []);

  const concluir = useCallback((comPedido: boolean) => {
    if (!form.data || form.minutoDoDia == null) return;
    onConcluido({ data: form.data, minutoDoDia: form.minutoDoDia, comPedido });
    resetar();
  }, [form.data, form.minutoDoDia, onConcluido, resetar]);

  const marcarRetorno = useCallback(async (dentistaId: string | null) => {
    if (agendamentoPendenteId) {
      setError('O retorno já foi marcado. Envie o pedido pendente antes de criar outro.');
      return;
    }
    if (!dentistaId) {
      setError('Selecione o dentista responsável.');
      return;
    }
    if (!form.data || form.minutoDoDia == null) {
      setError('Escolha um horário na agenda.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const resultado = await criarRetornoComPedido({
        pacienteId,
        dataHora: buildClinicDatetime(form.data, formatHora(form.minutoDoDia)),
        duracaoMinutos: parseInt(form.duracao, 10) || 30,
        observacoes: form.observacoes || null,
        dentistaId,
        pedidoProtetico: form.pedidoProtetico,
      });

      if (resultado.ok) {
        concluir(resultado.pedidoProteticoId != null);
        return;
      }
      if (resultado.etapa === 'pedido_protetico') {
        setAgendamentoPendenteId(resultado.agendamentoId);
        setError(`Retorno marcado, mas o pedido não foi enviado: ${resultado.error}`);
        return;
      }
      setError(resultado.error);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [agendamentoPendenteId, concluir, form, pacienteId]);

  const tentarEnviarPedido = useCallback(async (dentistaId: string | null) => {
    if (!agendamentoPendenteId || !form.pedidoProtetico) return;
    if (!dentistaId) {
      setError('Selecione o dentista responsável.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const resultado = await criarPedidoProtetico({
        pacienteId,
        agendamentoId: agendamentoPendenteId,
        dentistaId,
        ...form.pedidoProtetico,
      });
      if (resultado.error) {
        setError(`Retorno marcado, mas o pedido não foi enviado: ${resultado.error}`);
        return;
      }
      concluir(true);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [agendamentoPendenteId, concluir, form.pedidoProtetico, pacienteId]);

  return {
    form,
    setForm,
    error,
    limparErro: () => setError(null),
    saving,
    pedidoPendente: agendamentoPendenteId != null,
    marcarRetorno,
    tentarEnviarPedido,
    resetar,
  };
}

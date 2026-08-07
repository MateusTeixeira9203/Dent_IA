'use server';

import { requireClinicContext } from '@/server/auth/clinic';
import { EVENTS, ENTITY_TYPES } from '@/lib/events';

export interface ExcluirPacienteResult {
  ok: boolean;
  error?: string;
}

/**
 * Exclui o paciente e, por FK CASCADE, tudo que pende dele: fichas, odontograma_eventos,
 * orcamentos, pagamentos, assinaturas, agendamentos, planejamentos, documentos. Permanente,
 * sem desfazer — decisão dele 07/08 (revoga o "nunca DELETE" do R-31b original). Secretária
 * pode chamar (é quem de fato usa) — RLS de `pacientes` já libera qualquer staff da clínica,
 * não há gate de role aqui de propósito.
 *
 * Log ANTES do delete, e AWAIT (não `registrarLog` fire-and-forget): activity_logs.paciente_id
 * é ON DELETE SET NULL, não CASCADE — o registro de quem apagou, quando e o nome sobrevive à
 * exclusão. É a única prova que fica.
 */
export async function excluirPaciente(pacienteId: string, pacienteNome: string): Promise<ExcluirPacienteResult> {
  const { supabase, clinicId, dentistaId } = await requireClinicContext();

  const { error: logError } = await supabase.from('activity_logs').insert({
    clinica_id: clinicId,
    actor_id: dentistaId,
    paciente_id: pacienteId,
    entity_type: ENTITY_TYPES.PACIENTE,
    entity_id: pacienteId,
    action: EVENTS.PACIENTE_EXCLUIDO,
    metadata: { nome: pacienteNome },
  });
  if (logError) {
    console.error('[excluirPaciente] log falhou, delete não prossegue:', logError.message);
    return { ok: false, error: 'Não foi possível registrar a exclusão. Tente novamente.' };
  }

  const { data, error } = await supabase
    .from('pacientes')
    .delete()
    .eq('id', pacienteId)
    .eq('clinica_id', clinicId)
    .select('id');

  if (error) {
    console.error('[excluirPaciente]', error.message);
    return { ok: false, error: 'Erro ao excluir paciente.' };
  }

  // Mesmo padrão de salvar-ficha/deletarFicha — RLS pode barrar sem devolver erro.
  if (!data || data.length === 0) {
    return { ok: false, error: 'Não foi possível excluir: paciente não encontrado ou sem permissão.' };
  }

  return { ok: true };
}

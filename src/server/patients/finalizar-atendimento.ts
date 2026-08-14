import { inserirNotificacao } from '@/lib/notificacoes';
import type { requireClinicContext } from '@/server/auth/clinic';
import type { OrigemFicha } from '@/server/patients/salvar-ficha';

/**
 * Side-effects de FIM de consulta: fecha o agendamento e avisa a secretária.
 *
 * R-85 — nasceu dentro de `salvarFicha` pra rodar tanto no ramo de criação quanto no de
 * edição. R-108b — sai de lá porque deixou de ser exclusividade de quem grava ficha: uma
 * visita que só conclui pendências **não cria ficha nenhuma** (invariante §7) e mesmo assim
 * precisa fechar o atendimento. Módulo puro (sem `'use server'`) de propósito: exportar isto
 * de um arquivo de server actions criaria um endpoint público sem necessidade.
 *
 * Roda no máximo UMA vez por visita, não importa quantas fichas a visita alcance (G12) — quem
 * chama é responsável por isso, e é por isso que o roteamento passa `finalizarAtendimento:
 * false` pro `salvarFicha` e chama esta função no fim, sozinho.
 */
export async function finalizarAtendimentoSeAplicavel(
  supabase: Awaited<ReturnType<typeof requireClinicContext>>['supabase'],
  ctx: {
    clinicId: string;
    dentistaId: string;
    pacienteId: string;
    origem: OrigemFicha;
    agendamentoId?: string;
    finalizarAtendimento?: boolean;
  },
) {
  if (ctx.finalizarAtendimento === false) return;
  if (ctx.origem !== 'modo_consulta' || !ctx.agendamentoId) return;

  await supabase
    .from('agendamentos')
    .update({ status: 'completed' })
    .eq('id', ctx.agendamentoId)
    .eq('clinica_id', ctx.clinicId);

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('nome')
    .eq('id', ctx.pacienteId)
    .maybeSingle<{ nome: string }>();

  await inserirNotificacao(supabase, {
    clinicaId:    ctx.clinicId,
    paraRole:     'secretaria',
    deDentistaId: ctx.dentistaId,
    tipo:         'consulta_finalizada',
    titulo:       `Consulta finalizada — ${paciente?.nome ?? 'Paciente'}`,
    mensagem:     'A consulta foi encerrada pelo dentista.',
    href:         '/dashboard/agendamentos',
  });
}

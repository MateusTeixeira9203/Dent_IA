'use server';

import { z } from 'zod';
import { requireClinicContext } from '@/server/auth/clinic';
import { revalidatePath } from 'next/cache';
import { inserirNotificacao } from '@/lib/notificacoes';
import type { OdontogramaEventoDraft, OrtoManutencaoInfo } from '@/types/odontograma';

/**
 * R-11 — contrato único de escrita da ficha (spec `plans/specs/R-11-unificar-gravacao-ficha.md`).
 * Substitui os 3 caminhos que hoje escrevem `fichas` direto (salvarFichaConsulta,
 * FichasTab.handleSave client-side, e o código morto já removido na Fase 0): mesma validação,
 * mesmo guard de imutabilidade, mesma derivação de `status`, nas duas origens (modo consulta e
 * ficha rápida). `odontograma_eventos` continua fora daqui — sempre via a RPC
 * `salvar_eventos_odontograma` (migration 107), reusada e não reescrita.
 *
 * Fora de escopo (Decisão #6): os 3 fluxos de assinatura (assinatura_url/assinado_em) — R-03b.
 */

export type OrigemFicha = 'modo_consulta' | 'manual';

export interface SalvarFichaInput {
  fichaId?: string;
  pacienteId: string;
  origem: OrigemFicha;
  agendamentoId?: string;
  dataAtendimento: string;
  queixaPrincipal: string;
  anotacoes: string;
  dentesAfetados: number[];
  dentesObservacoes: Record<string, string>;
  procedimentos: string[];
  conduta: string;
  alertaNovo?: string | null;
  ortoManutencao?: OrtoManutencaoInfo | null;
  odontogramaEventos?: OdontogramaEventoDraft[];
}

export type SalvarFichaResult =
  | { ok: true; fichaId: string; eventosFalharam?: boolean }
  | { ok: false; error: string };

export interface DeletarFichaResult {
  ok: boolean;
  error?: string;
}

const salvarFichaSchema = z.object({
  fichaId:            z.string().uuid().optional(),
  pacienteId:         z.string().uuid(),
  origem:             z.enum(['modo_consulta', 'manual']),
  agendamentoId:      z.string().uuid().optional(),
  dataAtendimento:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  queixaPrincipal:    z.string().trim().max(500),
  anotacoes:          z.string().trim().max(5000),
  dentesAfetados:     z.array(z.number().int().min(11).max(85)),
  dentesObservacoes:  z.record(z.string(), z.string()),
  procedimentos:      z.array(z.string()),
  conduta:            z.string().trim().max(2000),
  alertaNovo:         z.string().trim().nullable().optional(),
  ortoManutencao:     z.unknown().nullable().optional(),
  odontogramaEventos: z.array(z.unknown()).optional(),
});

/**
 * Monta as linhas de `odontograma_eventos` — mesma lógica que
 * `src/app/consulta/[agendamentoId]/actions.ts:montarRowsEventos`. Duplicada aqui em vez de
 * importada porque aquele arquivo é client-facing (server actions de outra rota) e sua função
 * não é exportada; a Fase 2 desta migração remove o caminho antigo, momento em que a duplicação
 * (não a função) desaparece — a próxima leitura desta nota confirma se já foi feito.
 */
function montarRowsEventos(
  eventos: OdontogramaEventoDraft[],
  ctx: { clinicId: string; pacienteId: string; dentistaId: string; fichaId: string },
) {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return eventos.map((ev) => ({
    id:             ev.id,
    clinica_id:     ctx.clinicId,
    paciente_id:    ctx.pacienteId,
    dentista_id:    ctx.dentistaId,
    ficha_id:       ctx.fichaId,
    grupo_id:       ev.grupo_id,
    tipo:           ev.tipo,
    status:         ev.status,
    origem:         ev.origem,
    nivel:          ev.ancora.nivel,
    arcada:         ev.ancora.arcada ?? null,
    quadrante:      ev.ancora.quadrante ?? null,
    dente:          ev.ancora.dente ?? null,
    faces:          ev.ancora.faces ?? [],
    papel_no_grupo: ev.papel_no_grupo,
    observacao:     ev.observacao || null,
    detalhe:        ev.detalhe ?? null,
    realizado_em:
      ev.status === 'realizado'
        ? (ev.realizado_em ?? (ev.origem === 'clinica' ? hoje : null))
        : null,
  }));
}

/**
 * salvarFicha — cria (sem fichaId) ou edita (com fichaId) o documento-ficha. `status` e
 * `origem` nunca vêm do input: `status` é derivado de `origem` no servidor (modo_consulta →
 * concluida, manual → aberta) e `origem` não muda depois de criada (update não a aceita).
 * Update de ficha assinada é rejeitado (`ficha_assinada`) — mesma classe de proteção que a
 * RPC 107 já dá a `odontograma_eventos`.
 */
export async function salvarFicha(input: SalvarFichaInput): Promise<SalvarFichaResult> {
  const parsed = salvarFichaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const data = parsed.data;

  const { supabase, clinicId, dentistaId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão.' };

  const isUpdate = data.fichaId != null;

  if (isUpdate) {
    const { data: fichaAtual } = await supabase
      .from('fichas')
      .select('id, dentista_id, assinado_em')
      .eq('id', data.fichaId as string)
      .eq('clinica_id', clinicId)
      .maybeSingle();

    if (!fichaAtual) return { ok: false, error: 'Ficha não encontrada.' };
    if (fichaAtual.assinado_em != null) {
      return { ok: false, error: 'Esta ficha já foi assinada e não pode mais ser alterada.' };
    }

    const { error } = await supabase
      .from('fichas')
      .update({
        data_atendimento:    data.dataAtendimento,
        queixa_principal:    data.queixaPrincipal,
        anotacoes:           data.anotacoes,
        dentes_afetados:     data.dentesAfetados,
        dentes_observacoes:  data.dentesObservacoes,
        procedimentos:       data.procedimentos,
        conduta:             data.conduta || null,
        alerta_novo:         data.alertaNovo ?? null,
        orto_manutencao:     data.ortoManutencao ?? null,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', data.fichaId as string)
      .eq('clinica_id', clinicId);

    if (error) {
      console.error('[salvarFicha:update]', error.message);
      return { ok: false, error: 'Erro ao salvar a ficha. Tente novamente.' };
    }

    return finalizarEventos(supabase, {
      fichaId: data.fichaId as string,
      clinicId,
      pacienteId: data.pacienteId,
      dentistaId,
      eventos: data.odontogramaEventos as OdontogramaEventoDraft[] | undefined,
    });
  }

  // Create — status derivado da origem, nunca do input.
  const status = data.origem === 'modo_consulta' ? 'concluida' : 'aberta';

  const { data: nova, error } = await supabase
    .from('fichas')
    .insert({
      clinica_id:          clinicId,
      paciente_id:         data.pacienteId,
      dentista_id:         dentistaId,
      data_atendimento:    data.dataAtendimento,
      queixa_principal:    data.queixaPrincipal,
      anotacoes:           data.anotacoes,
      dentes_afetados:     data.dentesAfetados,
      dentes_observacoes:  data.dentesObservacoes,
      procedimentos:       data.procedimentos,
      conduta:             data.conduta || null,
      alerta_novo:         data.alertaNovo ?? null,
      orto_manutencao:     data.ortoManutencao ?? null,
      status,
      origem:              data.origem,
    })
    .select('id')
    .single();

  if (error || !nova) {
    console.error('[salvarFicha:create]', error?.message);
    return { ok: false, error: 'Erro ao salvar a ficha. Tente novamente.' };
  }

  const fichaId = (nova as { id: string }).id;

  const resultado = await finalizarEventos(supabase, {
    fichaId,
    clinicId,
    pacienteId: data.pacienteId,
    dentistaId,
    eventos: data.odontogramaEventos as OdontogramaEventoDraft[] | undefined,
  });

  // Side-effects de fim de consulta — só disparam quando veio de agendamento (modo_consulta).
  if (data.origem === 'modo_consulta' && data.agendamentoId) {
    await supabase
      .from('agendamentos')
      .update({ status: 'completed' })
      .eq('id', data.agendamentoId)
      .eq('clinica_id', clinicId);

    const { data: paciente } = await supabase
      .from('pacientes')
      .select('nome')
      .eq('id', data.pacienteId)
      .maybeSingle<{ nome: string }>();

    await inserirNotificacao(supabase, {
      clinicaId:    clinicId,
      paraRole:     'secretaria',
      deDentistaId: dentistaId,
      tipo:         'consulta_finalizada',
      titulo:       `Consulta finalizada — ${paciente?.nome ?? 'Paciente'}`,
      mensagem:     'A consulta foi encerrada pelo dentista.',
      href:         '/dashboard/agendamentos',
    });
  }

  return resultado.ok ? { ok: true, fichaId, eventosFalharam: resultado.eventosFalharam } : resultado;
}

/**
 * Persiste `odontogramaEventos` via a RPC atômica (migration 107) — nunca insert direto.
 * Fail-soft deliberado: a ficha JÁ está salva quando isto roda; se a RPC falhar, o chamador
 * recebe `eventosFalharam: true` e oferece retry (mesmo padrão que `salvarEventosOdontograma`
 * já usava) em vez de desfazer o save do conteúdo clínico.
 */
async function finalizarEventos(
  supabase: Awaited<ReturnType<typeof requireClinicContext>>['supabase'],
  ctx: {
    fichaId: string;
    clinicId: string;
    pacienteId: string;
    dentistaId: string;
    eventos: OdontogramaEventoDraft[] | undefined;
  },
): Promise<SalvarFichaResult> {
  const eventos = ctx.eventos ?? [];
  if (eventos.length === 0) return { ok: true, fichaId: ctx.fichaId };

  const rows = montarRowsEventos(eventos, {
    clinicId:   ctx.clinicId,
    pacienteId: ctx.pacienteId,
    dentistaId: ctx.dentistaId,
    fichaId:    ctx.fichaId,
  });

  const { error } = await supabase.rpc('salvar_eventos_odontograma', {
    p_ficha_id:    ctx.fichaId,
    p_clinica_id:  ctx.clinicId,
    p_paciente_id: ctx.pacienteId,
    p_eventos:     rows,
  });

  if (error) {
    console.error('[salvarFicha:eventos]', error.message);
    return { ok: true, fichaId: ctx.fichaId, eventosFalharam: true };
  }

  return { ok: true, fichaId: ctx.fichaId };
}

/**
 * deletarFicha — role dentista só apaga ficha própria; role admin apaga qualquer uma da
 * clínica. Fecha o gap do código morto removido na Fase 0 (client apagava sem checar autoria,
 * só a RLS segurava).
 */
export async function deletarFicha(fichaId: string, pacienteId: string): Promise<DeletarFichaResult> {
  const { supabase, clinicId, dentistaId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão para apagar fichas clínicas.' };

  const { data: ficha } = await supabase
    .from('fichas')
    .select('id, dentista_id, assinado_em')
    .eq('id', fichaId)
    .eq('clinica_id', clinicId)
    .maybeSingle();

  if (!ficha) return { ok: false, error: 'Ficha não encontrada.' };
  if (role === 'dentista' && ficha.dentista_id !== dentistaId) {
    return { ok: false, error: 'Sem permissão para apagar fichas de outro dentista.' };
  }
  // R-03b (#B5) — fecha a assimetria com o caminho novo: ficha com evento assinado já é
  // imutável no DELETE via trigger; ficha legada (sem evento, fichas.assinado_em) não tinha
  // guard nenhum aqui até agora.
  if (ficha.assinado_em != null) {
    return { ok: false, error: 'Esta ficha tem procedimentos assinados e não pode ser apagada.' };
  }

  const { data: apagada, error } = await supabase
    .from('fichas')
    .delete()
    .eq('id', fichaId)
    .eq('clinica_id', clinicId)
    .select('id');

  if (error) {
    // R-03a: ficha com algum evento assinado é imutável até no DELETE — o cascade tenta
    // desamarrar odontograma_eventos.assinatura_id e o trigger trg_odontograma_evento_imutavel
    // barra (raise 'evento_assinado_imutavel'). Comportamento correto (protege prova clínica
    // assinada — CFO), só precisa de mensagem clara em vez do erro cru do Postgres.
    if (error.message.includes('evento_assinado_imutavel')) {
      return { ok: false, error: 'Esta ficha tem procedimentos assinados e não pode ser apagada.' };
    }
    console.error('[deletarFicha]', error.message);
    return { ok: false, error: 'Erro ao apagar ficha.' };
  }

  // RLS pode barrar o DELETE sem devolver erro (0 linhas afetadas) — sem o .select() acima
  // isso vira falso "ok: true" com a ficha intacta no banco. Achado ao vivo 28/07: a policy de
  // DELETE do admin tinha sumido do banco (fichas_write_own sozinha só libera o dono).
  if (!apagada || apagada.length === 0) {
    console.error('[deletarFicha] DELETE bloqueado silenciosamente (RLS?) — 0 linhas para', fichaId);
    return { ok: false, error: 'Erro ao apagar ficha.' };
  }

  revalidatePath(`/dashboard/pacientes/${pacienteId}`);
  return { ok: true };
}

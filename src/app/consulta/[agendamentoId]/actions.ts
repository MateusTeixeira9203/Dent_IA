'use server';

import { requireClinicContext } from '@/server/auth/clinic';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { inserirNotificacao } from '@/lib/notificacoes';
import { buscarGruposAbertos, type GrupoAberto } from '@/server/patients/get-grupos-abertos';
import type { OdontogramaEventoDraft } from '@/types/odontograma';

/**
 * Monta as linhas de `odontograma_eventos` a partir dos drafts revisados pelo dentista.
 * Extraído pra ser reusado pelo save inicial E pelo retry (`salvarEventosOdontograma`) —
 * a data clínica e as âncoras precisam ser idênticas nos dois caminhos.
 */
function montarRowsEventos(
  eventos: OdontogramaEventoDraft[],
  ctx: { clinicId: string; pacienteId: string; dentistaId: string; fichaId: string },
) {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return eventos.map((ev) => ({
    id:             ev.id, // id estável gerado no client (R-01) — upsert por id, nunca renumera
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
    // Dado clínico da especialidade (migration 106) — tabela de endo, campos de implante.
    // undefined (a maioria dos tipos) vira null explícito; o insert nunca omite a coluna.
    detalhe:        ev.detalhe ?? null,
    // Data clínica: obrigatória no realizado da clínica (default hoje BRT — rede de
    // segurança; a UI já manda explícita). Indicado nunca tem data (constraint SQL).
    realizado_em:
      ev.status === 'realizado'
        ? (ev.realizado_em ?? (ev.origem === 'clinica' ? hoje : null))
        : null,
  }));
}

export async function salvarFichaConsulta(params: {
  agendamentoId:      string;
  pacienteId:         string;
  queixa_principal:   string;
  anotacoes:          string;
  dentes_afetados:    number[];
  dentes_observacoes: Record<string, string>;
  // Novos campos opcionais:
  procedimentos?:     string[];
  conduta?:           string;
  alerta_novo?:       string | null;
  /** v3 — eventos de odontograma revisados pelo dentista na confirmação (Fatia A). */
  odontograma_eventos?: OdontogramaEventoDraft[];
  /**
   * `eventosFalharam` sinaliza que a ficha salvou mas o event-log do odontograma NÃO —
   * o chamador mostra aviso não-bloqueante + retry (`salvarEventosOdontograma`).
   */
}): Promise<{ fichaId?: string; error?: string; eventosFalharam?: boolean }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();

  if (role === 'secretaria') return { error: 'Sem permissão.' };

  const { data: dentistaPerfil } = await supabase
    .from('dentistas')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinica_id', clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect('/onboarding');

  const { data: fichaData, error: fichaError } = await supabase.from('fichas').insert({
    clinica_id:          clinicId,
    paciente_id:         params.pacienteId,
    dentista_id:         dentistaPerfil.id,
    // Job A §7.2 — data clínica explícita (hoje no fuso da clínica); o default
    // do banco é rede de segurança, não a fonte de verdade da aplicação.
    data_atendimento:    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    queixa_principal:    params.queixa_principal,
    anotacoes:           params.anotacoes,
    dentes_afetados:     params.dentes_afetados,
    dentes_observacoes:  params.dentes_observacoes,
    // Novos campos:
    ...(params.procedimentos !== undefined && { procedimentos: params.procedimentos }),
    ...(params.conduta !== undefined && { conduta: params.conduta }),
    ...(params.alerta_novo != null && { alerta_novo: params.alerta_novo }),
    status:              'concluida',
    origem:              'modo_consulta',
  }).select('id').single();

  if (fichaError) {
    console.error('[salvarFichaConsulta]', fichaError.message);
    return { error: 'Erro ao salvar a ficha. Tente novamente.' };
  }

  const fichaId = (fichaData as { id: string }).id;

  // v3 — event-log do odontograma (migration 101). Fail-soft deliberado (espírito D5):
  // a ficha v2 JÁ está salva; se a camada visual falhar, loga e segue — o dado clínico
  // textual não se perde e o odontograma degrada pra "sem registro".
  const eventos = params.odontograma_eventos ?? [];
  let eventosFalharam = false;
  if (eventos.length > 0) {
    const rows = montarRowsEventos(eventos, {
      clinicId,
      pacienteId: params.pacienteId,
      dentistaId: dentistaPerfil.id,
      fichaId,
    });
    const { error: eventosError } = await supabase.from('odontograma_eventos').insert(rows);
    if (eventosError) {
      console.error('[salvarFichaConsulta] odontograma_eventos:', eventosError.message);
      // Fail-soft CONTINUA (a ficha não é desfeita), mas deixou de ser silencioso:
      // o chamador recebe o sinal e oferece "tentar de novo" ao dentista.
      eventosFalharam = true;
    }
  }

  await supabase
    .from('agendamentos')
    .update({ status: 'completed' })
    .eq('id', params.agendamentoId)
    .eq('clinica_id', clinicId);

  // Busca nome do paciente para a notificação
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('nome')
    .eq('id', params.pacienteId)
    .maybeSingle<{ nome: string }>();

  // Notifica a secretaria que a consulta foi finalizada
  await inserirNotificacao(supabase, {
    clinicaId:     clinicId,
    paraRole:      'secretaria',
    deDentistaId:  dentistaPerfil.id,
    tipo:          'consulta_finalizada',
    titulo:        `Consulta finalizada — ${paciente?.nome ?? 'Paciente'}`,
    mensagem:      'A consulta foi encerrada pelo dentista.',
    href:          '/dashboard/agendamentos',
  });

  return { fichaId, ...(eventosFalharam && { eventosFalharam: true }) };
}

/**
 * Salva o event-log do odontograma — retry do save inicial (fail-soft, ver
 * `salvarFichaConsulta`) E caminho único de save da ficha rápida (FichasTab).
 * Upsert por id (migration 107, R-01): registro que saiu do rascunho é apagado,
 * os demais são atualizados no lugar mantendo o id — nunca renumera.
 */
export async function salvarEventosOdontograma(params: {
  fichaId:    string;
  pacienteId: string;
  eventos:    OdontogramaEventoDraft[];
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão.' };

  const { data: dentistaPerfil } = await supabase
    .from('dentistas')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinica_id', clinicId)
    .maybeSingle();

  if (!dentistaPerfil) return { ok: false, error: 'Perfil de dentista não encontrado.' };

  // A ficha tem que existir, ser da clínica e ser DESTE dentista (mesma regra de autoria
  // do núcleo clínico 3.1 — clínica lê, autor escreve).
  const { data: ficha } = await supabase
    .from('fichas')
    .select('id')
    .eq('id', params.fichaId)
    .eq('clinica_id', clinicId)
    .eq('paciente_id', params.pacienteId)
    .eq('dentista_id', dentistaPerfil.id)
    .maybeSingle();

  if (!ficha) return { ok: false, error: 'Ficha não encontrada.' };
  if (params.eventos.length === 0) return { ok: true };

  const rows = montarRowsEventos(params.eventos, {
    clinicId,
    pacienteId: params.pacienteId,
    dentistaId: dentistaPerfil.id,
    fichaId:    params.fichaId,
  });

  // RPC atômica (migration 107): lock da ficha + upsert por id no mesmo
  // statement — serializa retries concorrentes (2 abas) e reforça no servidor
  // que ficha assinada é imutável (invariante #14), mesmo que a UI já esconda
  // o botão nesse caso.
  const { error } = await supabase.rpc('salvar_eventos_odontograma', {
    p_ficha_id:    params.fichaId,
    p_clinica_id:  clinicId,
    p_paciente_id: params.pacienteId,
    p_eventos:     rows,
  });

  if (error) {
    if (error.message.includes('ficha_assinada')) {
      return { ok: false, error: 'Esta ficha já foi assinada e não pode mais ser alterada.' };
    }
    console.error('[salvarEventosOdontograma]', error.message);
    return { ok: false, error: 'Não foi possível salvar o odontograma.' };
  }

  revalidatePath(`/dashboard/pacientes/${params.pacienteId}`);
  return { ok: true };
}

export async function salvarAssinaturaConsulta(
  fichaId: string,
  pacienteId: string,
  assinaturaDataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const { clinicId, dentistaId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão' };

  const db = createServiceClient();

  // dono: só o dentista que criou a ficha pode assiná-la
  const { data: ficha } = await db
    .from('fichas')
    .select('id')
    .eq('id', fichaId)
    .eq('clinica_id', clinicId)
    .eq('paciente_id', pacienteId)
    .eq('dentista_id', dentistaId)
    .maybeSingle();

  if (!ficha) return { ok: false, error: 'Ficha não encontrada' };

  const base64 = assinaturaDataUrl.split(',')[1];
  if (!base64) return { ok: false, error: 'Assinatura inválida' };
  const buffer = Buffer.from(base64, 'base64');

  const storagePath = `${clinicId}/${pacienteId}/assinatura_${fichaId}.png`;

  const { error: storageErr } = await db.storage
    .from('fichas')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

  if (storageErr) return { ok: false, error: storageErr.message };

  const { error: dbErr } = await db
    .from('fichas')
    .update({ assinatura_url: storagePath, assinado_em: new Date().toISOString() })
    .eq('id', fichaId)
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaId);

  if (dbErr) return { ok: false, error: dbErr.message };

  return { ok: true };
}

export async function iniciarAtendimentoConsulta(agendamentoId: string): Promise<{ error?: string }> {
  const { supabase, clinicId, role } = await requireClinicContext();
  if (role === 'secretaria') return { error: 'Sem permissão.' };

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('status')
    .eq('id', agendamentoId)
    .eq('clinica_id', clinicId)
    .maybeSingle<{ status: string }>();

  if (!ag) return { error: 'Agendamento não encontrado.' };
  if (['completed', 'cancelled', 'no_show'].includes(ag.status)) return { error: 'Atendimento já encerrado.' };
  if (ag.status === 'in_progress') return {};

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', agendamentoId)
    .eq('clinica_id', clinicId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/agendamentos');
  return {};
}

// finalizarConsulta foi removida — fluxo de finalização usa salvarFichaConsulta diretamente.

/**
 * Alterna planejado ⇄ realizado de UM registro (grupo de eventos) na ficha salva.
 * Bug 21/07: a ficha salva não tinha caminho pra marcar o que foi feito — tudo
 * ficava "Planejado". Regras herdadas do núcleo clínico: só o AUTOR escreve, e
 * ficha assinada é imutável (invariante #14). `realizado_em` segue a regra §1.10:
 * ganha a data clínica ao virar realizado, volta a null ao virar planejado.
 */
export async function alternarStatusRegistro(params: {
  eventoIds: string[];
  novoStatus: 'indicado' | 'realizado';
  dataClinica: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão.' };
  if (params.eventoIds.length === 0) return { ok: true };

  const { data: dentistaPerfil } = await supabase
    .from('dentistas')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinica_id', clinicId)
    .maybeSingle();

  if (!dentistaPerfil) return { ok: false, error: 'Perfil de dentista não encontrado.' };

  // A ficha dona precisa ser DESTE dentista e não estar assinada.
  const { data: eventos } = await supabase
    .from('odontograma_eventos')
    .select('id, ficha_id, origem')
    .in('id', params.eventoIds)
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaPerfil.id);

  if (!eventos || eventos.length !== params.eventoIds.length) {
    return { ok: false, error: 'Registro não encontrado ou de outro dentista.' };
  }

  const fichaIds = [...new Set(eventos.map((e) => e.ficha_id).filter((f): f is string => f != null))];
  const { data: fichas } = await supabase
    .from('fichas')
    .select('id, assinado_em')
    .in('id', fichaIds)
    .eq('clinica_id', clinicId);

  if (fichas?.some((f) => f.assinado_em != null)) {
    return { ok: false, error: 'Esta ficha já foi assinada e não pode mais ser alterada.' };
  }

  const realizado = params.novoStatus === 'realizado';
  const { error } = await supabase
    .from('odontograma_eventos')
    .update({
      status: params.novoStatus,
      // Pré-existente nunca ganha data da clínica (§1.10); indicado nunca tem data.
      realizado_em: realizado
        ? (eventos[0].origem === 'clinica' ? params.dataClinica : null)
        : null,
    })
    .in('id', params.eventoIds)
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaPerfil.id);

  if (error) {
    console.error('[alternarStatusRegistro]', error.message);
    return { ok: false, error: 'Não foi possível atualizar o registro.' };
  }
  return { ok: true };
}

/**
 * Autor encaminha (ou remove o encaminhamento de) um registro planejado seu a outro
 * dentista da clínica (R-04). Nunca transfere autoria — `dentista_id` continua o autor;
 * só `encaminhado_para` muda. RLS de escrita (migration 101) já cobre esta coluna pro
 * dono; nenhuma policy nova.
 */
export async function encaminharProcedimento(params: {
  eventoIds: string[];
  /** null = remove o encaminhamento existente. */
  dentistaDestinoId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão.' };
  if (params.eventoIds.length === 0) return { ok: true };

  const { data: dentistaPerfil } = await supabase
    .from('dentistas')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinica_id', clinicId)
    .maybeSingle();

  if (!dentistaPerfil) return { ok: false, error: 'Perfil de dentista não encontrado.' };

  // Os eventos precisam ser DESTE dentista (autor) e status='indicado' — só o planejado
  // tem o que encaminhar (assunção da spec R-04).
  const { data: eventos } = await supabase
    .from('odontograma_eventos')
    .select('id, ficha_id, status, paciente_id')
    .in('id', params.eventoIds)
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaPerfil.id);

  if (!eventos || eventos.length !== params.eventoIds.length) {
    return { ok: false, error: 'Registro não encontrado ou de outro dentista.' };
  }
  if (eventos.some((e) => e.status !== 'indicado')) {
    return { ok: false, error: 'Só é possível encaminhar registros planejados.' };
  }

  const fichaIds = [...new Set(eventos.map((e) => e.ficha_id).filter((f): f is string => f != null))];
  const { data: fichas } = await supabase
    .from('fichas')
    .select('id, assinado_em')
    .in('id', fichaIds)
    .eq('clinica_id', clinicId);

  if (fichas?.some((f) => f.assinado_em != null)) {
    return { ok: false, error: 'Esta ficha já foi assinada e não pode mais ser alterada.' };
  }

  let destino: { id: string; nome: string } | null = null;
  if (params.dentistaDestinoId != null) {
    // Destino elegível: mesma clínica, ativo, nunca secretária, nunca o próprio autor —
    // validado no servidor, não só escondido na UI (a RLS não filtra isso sozinha).
    const { data: destinoData } = await supabase
      .from('dentistas')
      .select('id, nome')
      .eq('id', params.dentistaDestinoId)
      .eq('clinica_id', clinicId)
      .neq('role', 'secretaria')
      .eq('ativo', true)
      .neq('id', dentistaPerfil.id)
      .maybeSingle();

    if (!destinoData) return { ok: false, error: 'Destino inválido.' };
    destino = destinoData;
  }

  const { error } = await supabase
    .from('odontograma_eventos')
    .update({ encaminhado_para: params.dentistaDestinoId })
    .in('id', params.eventoIds)
    .eq('clinica_id', clinicId)
    .eq('dentista_id', dentistaPerfil.id);

  if (error) {
    console.error('[encaminharProcedimento]', error.message);
    return { ok: false, error: 'Não foi possível encaminhar o registro.' };
  }

  if (destino) {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('nome')
      .eq('id', eventos[0].paciente_id)
      .maybeSingle<{ nome: string }>();

    await inserirNotificacao(supabase, {
      clinicaId:     clinicId,
      paraRole:      'dentista',
      paraDentistaId: destino.id,
      deDentistaId:  dentistaPerfil.id,
      tipo:          'procedimento_encaminhado',
      titulo:        `Procedimento encaminhado — ${paciente?.nome ?? 'Paciente'}`,
      mensagem:      'Um procedimento planejado foi encaminhado pra você.',
      href:          `/dashboard/pacientes/${eventos[0].paciente_id}`,
    });
  }

  revalidatePath(`/dashboard/pacientes/${eventos[0].paciente_id}`);
  return { ok: true };
}

/**
 * Destino conclui (ou reabre) um registro que foi encaminhado a ele (R-04, Fases 1-4).
 * Escrita estreita via RPC (migration 109): só status + realizado_em, nunca tipo/âncora/
 * detalhe/autoria — quem trata de fato o `detalhe` de endo/implante ainda é o autor
 * (R-04b, item futuro). A RPC valida sozinha (encaminhado_para = caller, ficha não
 * assinada); esta action só decide o "de quem" da notificação de volta.
 */
export async function atualizarStatusEncaminhado(params: {
  eventoIds: string[];
  novoStatus: 'indicado' | 'realizado';
  realizadoEm: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();
  if (role === 'secretaria') return { ok: false, error: 'Sem permissão.' };
  if (params.eventoIds.length === 0) return { ok: true };

  const { error } = await supabase.rpc('concluir_evento_encaminhado', {
    p_evento_ids:   params.eventoIds,
    p_novo_status:  params.novoStatus,
    p_realizado_em: params.realizadoEm,
  });

  if (error) {
    if (error.message.includes('sem_permissao')) {
      return { ok: false, error: 'Este registro não foi encaminhado a você, ou a ficha já foi assinada.' };
    }
    console.error('[atualizarStatusEncaminhado]', error.message);
    return { ok: false, error: 'Não foi possível atualizar o registro.' };
  }

  // Notifica o autor original só ao concluir (Decisão #4) — cortesia, best-effort.
  // O núcleo clínico já é compartilhado (migration 099): o autor vê a mudança de status
  // sozinho na próxima vez que abrir o paciente, mesmo se a notificação falhar.
  if (params.novoStatus === 'realizado') {
    const { data: destinoPerfil } = await supabase
      .from('dentistas')
      .select('id')
      .eq('user_id', user.id)
      .eq('clinica_id', clinicId)
      .maybeSingle();

    const { data: evento } = await supabase
      .from('odontograma_eventos')
      .select('dentista_id, paciente_id')
      .in('id', params.eventoIds)
      .limit(1)
      .maybeSingle<{ dentista_id: string; paciente_id: string }>();

    if (evento && destinoPerfil) {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('nome')
        .eq('id', evento.paciente_id)
        .maybeSingle<{ nome: string }>();

      await inserirNotificacao(supabase, {
        clinicaId:     clinicId,
        paraRole:      'dentista',
        paraDentistaId: evento.dentista_id,
        deDentistaId:  destinoPerfil.id,
        tipo:          'encaminhamento_concluido',
        titulo:        `Procedimento encaminhado concluído — ${paciente?.nome ?? 'Paciente'}`,
        mensagem:      'O dentista que você encaminhou concluiu o procedimento.',
        href:          `/dashboard/pacientes/${evento.paciente_id}`,
      });

      revalidatePath(`/dashboard/pacientes/${evento.paciente_id}`);
    }
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * R-02 Fase 3 — trabalhos ainda abertos do paciente, pro modo consulta (alimenta a confirmação
 * de amarração do ToothDetailPanel). A clínica vem do contexto de auth (nunca confia no client);
 * a leitura em si é a função pura já testada. Read-only, sem efeito colateral.
 */
export async function getGruposAbertos(patientId: string): Promise<GrupoAberto[]> {
  const { clinicId } = await requireClinicContext();
  return buscarGruposAbertos({ patientId, clinicId });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDentistaCached } from '@/lib/get-dentista';
import { createClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

export interface DexContextData {
  agendamentosHoje: number;
  agendamentosHojeList: { hora: string; paciente: string; status: string }[];
  orcamentosAtrasados30d: number;
  proximoPaciente: string | null;
  proximoAgendamentoId: string | null;
  proximoHorario: string | null;
  entrouHoje: number;
  followUpPendentes: number;
  /** Agendamentos marcados para amanhã */
  agendamentosAmanha: number;
  /** Listas de drill-down para cada insight (até 5 itens cada) */
  orcamentosAtrasados30dList: { id: string; paciente: string; pacienteId: string; total: number }[];
  followUpPendentesList: { id: string; paciente: string; pacienteId: string; total: number }[];
}

/**
 * GET /api/dex/context
 * Retorna dados contextuais do dia para o DEX gerar a saudação personalizada.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await withRateLimit(req, 'dex:context', 60, 60_000);
  if (limited) return limited;

  try {
    const dentista = await getDentistaCached();
    if (!dentista) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = await createClient();
    const agora = new Date();
    // D11 — dentista/admin veem só a própria agenda/orçamentos/pagamentos; secretaria
    // vê a clínica inteira (mesmo precedente de financeiro/actions.ts:252).
    const scopado = dentista.role !== 'secretaria';

    const hojeInicio = new Date(agora);
    hojeInicio.setHours(0, 0, 0, 0);
    const hojeFim = new Date(agora);
    hojeFim.setHours(23, 59, 59, 999);

    const tresDiasAtras = new Date(agora);
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    const trintaDiasAtras = new Date(agora);
    trintaDiasAtras.setDate(agora.getDate() - 30);

    // Janela de amanhã
    const amanhaInicio = new Date(agora);
    amanhaInicio.setDate(agora.getDate() + 1);
    amanhaInicio.setHours(0, 0, 0, 0);
    const amanhaFim = new Date(amanhaInicio);
    amanhaFim.setHours(23, 59, 59, 999);

    let agendamentosQuery = supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', dentista.clinica_id)
      .gte('data_hora', hojeInicio.toISOString())
      .lte('data_hora', hojeFim.toISOString())
      .not('status', 'eq', 'cancelled');

    let agendamentosListQuery = supabase
      .from('agendamentos')
      .select('data_hora, status, paciente:pacientes(nome)')
      .eq('clinica_id', dentista.clinica_id)
      .gte('data_hora', hojeInicio.toISOString())
      .lte('data_hora', hojeFim.toISOString())
      .not('status', 'eq', 'cancelled');

    let orcamentosAtrasados30dQuery = supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', dentista.clinica_id)
      .eq('status', 'enviado')
      .lte('updated_at', trintaDiasAtras.toISOString());

    let proximoQuery = supabase
      .from('agendamentos')
      .select('id, data_hora, paciente:pacientes(nome)')
      .eq('clinica_id', dentista.clinica_id)
      .gte('data_hora', agora.toISOString())
      .lte('data_hora', hojeFim.toISOString())
      .not('status', 'eq', 'cancelled');

    // R-65 — !inner + filtro no embed: pagamento cujo orçamento pai é rascunho/recusado
    // nunca deveria contar como "entrou hoje" (mesma classe corrigida em financeiro).
    let pagamentosHojeQuery = supabase
      .from('pagamentos')
      .select('valor, orcamentos!inner(status)')
      .eq('clinica_id', dentista.clinica_id)
      .eq('status', 'pago')
      .gte('data_pagamento', hojeInicio.toISOString().split('T')[0])
      .lte('data_pagamento', hojeFim.toISOString().split('T')[0])
      .not('orcamentos.status', 'in', '(rascunho,recusado)');

    let followUpQuery = supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', dentista.clinica_id)
      .eq('status', 'enviado')
      .lte('updated_at', tresDiasAtras.toISOString());

    let agendamentosAmanhaQuery = supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', dentista.clinica_id)
      .gte('data_hora', amanhaInicio.toISOString())
      .lte('data_hora', amanhaFim.toISOString())
      .not('status', 'eq', 'cancelled');

    let atrasados30dListQuery = supabase
      .from('orcamentos')
      .select('id, total, paciente:pacientes(id, nome)')
      .eq('clinica_id', dentista.clinica_id)
      .eq('status', 'enviado')
      .lte('updated_at', trintaDiasAtras.toISOString());

    let followUpListQuery = supabase
      .from('orcamentos')
      .select('id, total, paciente:pacientes(id, nome)')
      .eq('clinica_id', dentista.clinica_id)
      .eq('status', 'enviado')
      .lte('updated_at', tresDiasAtras.toISOString());

    if (scopado) {
      agendamentosQuery           = agendamentosQuery.eq('dentista_id', dentista.id);
      agendamentosListQuery       = agendamentosListQuery.eq('dentista_id', dentista.id);
      orcamentosAtrasados30dQuery = orcamentosAtrasados30dQuery.eq('dentista_id', dentista.id);
      proximoQuery                = proximoQuery.eq('dentista_id', dentista.id);
      pagamentosHojeQuery         = pagamentosHojeQuery.eq('dentista_id', dentista.id);
      followUpQuery                = followUpQuery.eq('dentista_id', dentista.id);
      agendamentosAmanhaQuery     = agendamentosAmanhaQuery.eq('dentista_id', dentista.id);
      atrasados30dListQuery       = atrasados30dListQuery.eq('dentista_id', dentista.id);
      followUpListQuery           = followUpListQuery.eq('dentista_id', dentista.id);
    }

    const [
      agendamentosRes,
      agendamentosListRes,
      orcamentosAtrasados30dRes,
      proximoRes,
      pagamentosHojeRes,
      followUpRes,
      agendamentosAmanhaRes,
      atrasados30dListRes,
      followUpListRes,
    ] = await Promise.all([
      agendamentosQuery,
      agendamentosListQuery.order('data_hora', { ascending: true }).limit(10),
      orcamentosAtrasados30dQuery,
      proximoQuery.order('data_hora', { ascending: true }).limit(1).maybeSingle(),
      pagamentosHojeQuery,
      followUpQuery,
      agendamentosAmanhaQuery,
      atrasados30dListQuery.order('updated_at', { ascending: true }).limit(5),
      followUpListQuery.order('updated_at', { ascending: true }).limit(5),
    ]);

    const pacienteData = proximoRes.data?.paciente as { nome: string } | null | undefined;
    const entrouHoje = (pagamentosHojeRes.data ?? []).reduce((s, p) => s + ((p.valor as number) ?? 0), 0);
    const proximoHorario = proximoRes.data?.data_hora
      ? new Date(proximoRes.data.data_hora as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null;

    const agendamentosHojeList = (agendamentosListRes.data ?? []).map((ag) => ({
      hora: new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      paciente: (ag.paciente as unknown as { nome: string } | null)?.nome ?? 'Paciente',
      status: ag.status as string,
    }));

    // Helper para mapear lista de orçamentos com join de paciente
    function mapOrcList(
      data: { id: unknown; total: unknown; paciente: unknown }[] | null,
    ) {
      return (data ?? []).map((o) => {
        const pac = o.paciente as { id: string; nome: string } | null;
        return {
          id: o.id as string,
          paciente: pac?.nome ?? 'Paciente',
          pacienteId: pac?.id ?? '',
          total: (o.total as number) ?? 0,
        };
      }).filter((o) => !!o.pacienteId);
    }

    const orcamentosAtrasados30dList = mapOrcList(
      atrasados30dListRes.data as { id: unknown; total: unknown; paciente: unknown }[] | null,
    );
    const followUpPendentesList = mapOrcList(
      followUpListRes.data as { id: unknown; total: unknown; paciente: unknown }[] | null,
    );

    return NextResponse.json({
      agendamentosHoje:                         agendamentosRes.count ?? 0,
      agendamentosHojeList,
      orcamentosAtrasados30d:                   orcamentosAtrasados30dRes.count ?? 0,
      proximoPaciente:                          pacienteData?.nome ?? null,
      proximoAgendamentoId:                     (proximoRes.data?.id as string | null) ?? null,
      proximoHorario,
      entrouHoje,
      followUpPendentes:                        followUpRes.count ?? 0,
      agendamentosAmanha:                       agendamentosAmanhaRes.count ?? 0,
      orcamentosAtrasados30dList,
      followUpPendentesList,
    } satisfies DexContextData);
  } catch (err) {
    console.error('[dex/context] Erro:', err);
    return NextResponse.json({
      agendamentosHoje: 0,
      agendamentosHojeList: [],
      orcamentosAtrasados30d: 0,
      proximoPaciente: null,
      proximoAgendamentoId: null,
      proximoHorario: null,
      entrouHoje: 0,
      followUpPendentes: 0,
      agendamentosAmanha: 0,
      orcamentosAtrasados30dList: [],
      followUpPendentesList: [],
    } satisfies DexContextData);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDentistaCached } from '@/lib/get-dentista';
import { createClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { calcularNumerosMes, type FichaMesRaw } from '@/lib/dex/numeros-mes';
import type { DexMesData } from '@/lib/dex/tipos';

const ZERADO: DexMesData = {
  atendimentos: 0,
  atendimentosMesAnterior: 0,
  crescimentoPct: null,
  pacientesAtendidos: 0,
  visitasPorPaciente: 0,
};

/**
 * GET /api/dex/mes
 * Coluna "O mês" do hub (R-103c): atendimentos, visitas por paciente, crescimento vs mês
 * anterior. Fonte é `fichas` — 1 ficha = 1 atendimento (confirmado no R-103b). Sem métrica
 * de "recorrente" (D2 — cortada).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await withRateLimit(req, 'dex:mes', 60, 60_000);
  if (limited) return limited;

  try {
    const dentista = await getDentistaCached();
    if (!dentista) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // R-94 — protético não usa Dex, mesmo gate de alerts:37/retencao (D7). Nenhuma query roda.
    if (dentista.role === 'protetico') {
      return NextResponse.json(ZERADO satisfies DexMesData);
    }

    const supabase = await createClient();
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioProxMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

    const inicioMesStr = inicioMes.toISOString().split('T')[0];
    const inicioProxMesStr = inicioProxMes.toISOString().split('T')[0];
    const inicioMesAnteriorStr = inicioMesAnterior.toISOString().split('T')[0];

    // A6/D11 — escopo "meu": dentista/admin veem só a própria agenda; secretaria vê a
    // clínica inteira. fichas_select (099) é da clínica sozinha — sem este filtro
    // explícito, "meu" vazaria atendimento de colega (I2).
    const scopado = dentista.role !== 'secretaria';

    let fichasMesQuery = supabase
      .from('fichas')
      .select('paciente_id, data_atendimento')
      .eq('clinica_id', dentista.clinica_id)
      .gte('data_atendimento', inicioMesStr)
      .lt('data_atendimento', inicioProxMesStr);

    let fichasMesAnteriorQuery = supabase
      .from('fichas')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', dentista.clinica_id)
      .gte('data_atendimento', inicioMesAnteriorStr)
      .lt('data_atendimento', inicioMesStr);

    if (scopado) {
      fichasMesQuery = fichasMesQuery.eq('dentista_id', dentista.id);
      fichasMesAnteriorQuery = fichasMesAnteriorQuery.eq('dentista_id', dentista.id);
    }

    const [fichasMesRes, fichasMesAnteriorRes] = await Promise.all([
      fichasMesQuery,
      fichasMesAnteriorQuery,
    ]);

    const fichasMesAtual: FichaMesRaw[] = (fichasMesRes.data ?? [])
      .map((f) => ({ pacienteId: f.paciente_id as string }))
      .filter((f) => !!f.pacienteId);

    return NextResponse.json(
      calcularNumerosMes(fichasMesAtual, fichasMesAnteriorRes.count ?? 0) satisfies DexMesData,
    );
  } catch (err) {
    console.error('[dex/mes] Erro:', err);
    return NextResponse.json(ZERADO satisfies DexMesData);
  }
}

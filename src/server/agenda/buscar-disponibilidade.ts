"use server";

import { requireClinicContext } from "@/server/auth/clinic";
import { getDisponibilidadeSemana, type DisponibilidadeDia } from "@/lib/agenda/disponibilidade";

/**
 * R-64 — ponte client→server pro `RetornoSemanaGrid`. `getDisponibilidadeSemana` usa
 * service client (ignora RLS) — sem esta checagem, um `dentistaId` trocado no client
 * devolveria a agenda real (com nome de paciente) de outro dentista da clínica.
 * A secretária pode ver apenas agenda de dentista/admin ativo da própria clínica; os demais
 * papéis ficam restritos à própria agenda.
 */
export async function buscarDisponibilidadeSemana(
  dentistaId: string,
  semanaInicioISO: string,
): Promise<DisponibilidadeDia[]> {
  const { supabase, clinicId, dentistaId: meuDentistaId, role } = await requireClinicContext();
  if (dentistaId !== meuDentistaId && role !== 'secretaria') {
    throw new Error("Sem permissão para ver a agenda de outro dentista.");
  }
  if (dentistaId !== meuDentistaId) {
    const { count } = await supabase
      .from('dentistas')
      .select('id', { count: 'exact', head: true })
      .eq('id', dentistaId)
      .eq('clinica_id', clinicId)
      .eq('ativo', true)
      .in('role', ['admin', 'dentista']);
    if ((count ?? 0) === 0) throw new Error("Sem permissão para ver esta agenda.");
  }
  return getDisponibilidadeSemana({ dentistaId, clinicaId: clinicId, semanaInicioISO });
}

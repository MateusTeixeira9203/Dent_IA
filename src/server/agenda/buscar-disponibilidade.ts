"use server";

import { requireClinicContext } from "@/server/auth/clinic";
import { getDisponibilidadeSemana, type DisponibilidadeDia } from "@/lib/agenda/disponibilidade";

/**
 * R-64 — ponte client→server pro `RetornoSemanaGrid`. `getDisponibilidadeSemana` usa
 * service client (ignora RLS) — sem esta checagem, um `dentistaId` trocado no client
 * devolveria a agenda real (com nome de paciente) de outro dentista da clínica.
 * Mesma trava de segurança que `criarAgendamento` já aplica (dentista_id sempre o logado).
 */
export async function buscarDisponibilidadeSemana(
  dentistaId: string,
  semanaInicioISO: string,
): Promise<DisponibilidadeDia[]> {
  const { clinicId, dentistaId: meuDentistaId } = await requireClinicContext();
  if (dentistaId !== meuDentistaId) {
    throw new Error("Sem permissão para ver a agenda de outro dentista.");
  }
  return getDisponibilidadeSemana({ dentistaId, clinicaId: clinicId, semanaInicioISO });
}

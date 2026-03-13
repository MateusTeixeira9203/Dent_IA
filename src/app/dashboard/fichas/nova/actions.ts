"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Cria uma nova ficha para o paciente e retorna o ID criado.
 */
export async function createFicha(
  pacienteId: string
): Promise<{ fichaId: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Busca dentista e clinica_id do usuário logado
  const { data: dentista } = await supabase
    .from("dentistas")
    .select("id, clinica_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!dentista) {
    return { error: "Dentista não encontrado. Faça o onboarding primeiro." };
  }

  // Verifica se o paciente pertence à mesma clínica
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("clinica_id", dentista.clinica_id)
    .maybeSingle();

  if (!paciente) {
    return { error: "Paciente não encontrado." };
  }

  // Cria a ficha com status 'aberta'
  const { data: ficha, error } = await supabase
    .from("fichas")
    .insert({
      clinica_id: dentista.clinica_id,
      paciente_id: pacienteId,
      dentista_id: dentista.id,
      status: "aberta",
    })
    .select("id")
    .single();

  if (error || !ficha) {
    console.error("Erro ao criar ficha:", error);
    return { error: error?.message ?? "Erro ao criar ficha" };
  }

  return { fichaId: ficha.id };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

interface CreatePacienteInput {
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  whatsapp: string | null;
  observacoes: string | null;
}

export async function createPaciente(
  data: CreatePacienteInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Buscar clinica_id: primeiro tenta via dentista do usuário, senão usa a primeira clínica
  let clinicaId: string | null = null;

  const { data: dentistas } = await supabase
    .from("dentistas")
    .select("clinica_id")
    .eq("user_id", session.user.id)
    .limit(1);

  if (dentistas?.[0]?.clinica_id) {
    clinicaId = dentistas[0].clinica_id;
  } else {
    const { data: clinicas } = await supabase
      .from("clinicas")
      .select("id")
      .limit(1);
    clinicaId = clinicas?.[0]?.id ?? null;
  }

  if (!clinicaId) {
    return {
      success: false,
      error:
        "Nenhuma clínica cadastrada. Cadastre uma clínica nas configurações primeiro.",
    };
  }

  const { error } = await supabase.from("pacientes").insert({
    clinica_id: clinicaId,
    nome: data.nome,
    cpf: data.cpf,
    email: data.email,
    telefone: data.telefone,
    data_nascimento: data.data_nascimento,
    endereco: data.endereco,
    cidade: data.cidade,
    estado: data.estado,
    whatsapp: data.whatsapp,
    observacoes: data.observacoes,
  });

  if (error) {
    console.error("Erro ao criar paciente:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard/pacientes");
  return { success: true };
}

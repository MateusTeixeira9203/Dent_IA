"use server";

import { requireClinicContext } from "@/server/auth/clinic";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buscarPossiveisDuplicatas, type CandidatoDuplicata } from "@/server/patients/buscar-duplicatas";

interface CreatePacienteInput {
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  responsavel_nome?: string | null;
  responsavel_telefone?: string | null;
  responsavel_parentesco?: string | null;
  /** R-31a §3.1 — true depois que o dentista já viu o aviso de nome duplicado e escolheu
   *  "Cadastrar outro" mesmo assim. CPF continua bloqueando mesmo com isto marcado. */
  confirmarMesmoAssim?: boolean;
}

export async function createPaciente(
  data: CreatePacienteInput
): Promise<{ success: boolean; error?: string; duplicatas?: CandidatoDuplicata[] }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  // R-31a §3.1 — checagem única, também usada por criarPacienteRapido. CPF sempre bloqueia
  // (identificador de pessoa); nome igual só avisa, e só quando ainda não foi confirmado.
  const duplicatas = await buscarPossiveisDuplicatas(supabase, clinicId, {
    nome: data.nome,
    cpf: data.cpf,
    telefone: data.telefone,
    dataNascimento: data.data_nascimento,
  });

  const duplicataCpf = duplicatas.find((d) => d.motivo === 'cpf');
  if (duplicataCpf) {
    return { success: false, error: `CPF já cadastrado para o paciente "${duplicataCpf.nome}".` };
  }

  if (duplicatas.length > 0 && !data.confirmarMesmoAssim) {
    return { success: false, duplicatas };
  }

  const { error } = await supabase.from("pacientes").insert({
    clinica_id:      clinicId,
    // Paciente é da clínica; este campo registra apenas quem o cadastrou.
    // Não aceita atribuição vinda do navegador.
    dentista_id:     dentistaPerfil.id,
    nome:            data.nome,
    cpf:             data.cpf,
    email:           data.email,
    telefone:        data.telefone,
    data_nascimento: data.data_nascimento,
    endereco:        data.endereco,
    cidade:          data.cidade,
    estado:          data.estado,
    observacoes:             data.observacoes,
    responsavel_nome:        data.responsavel_nome ?? null,
    responsavel_telefone:    data.responsavel_telefone ?? null,
    responsavel_parentesco:  data.responsavel_parentesco ?? null,
  });

  if (error) {
    console.error("Erro ao criar paciente:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/pacientes");
  return { success: true };
}

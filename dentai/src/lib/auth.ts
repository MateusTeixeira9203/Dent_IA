import type { SupabaseClient } from "@supabase/supabase-js";

export interface DentistaComClinica {
  nome: string;
  clinica: string;
}

/**
 * Busca o dentista logado com nome da clínica.
 * Retorna null se não encontrar.
 */
export async function getDentistaLogado(
  supabase: SupabaseClient
): Promise<DentistaComClinica | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dentistaData, error: dentistaError } = await supabase
    .from("dentistas")
    .select("nome, clinicas(nome)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (dentistaError || !dentistaData) return null;

  const clinicaRef = dentistaData.clinicas;
  const clinicaNome =
    Array.isArray(clinicaRef) && clinicaRef[0]
      ? (clinicaRef[0] as { nome: string }).nome
      : clinicaRef && typeof clinicaRef === "object" && "nome" in clinicaRef
        ? (clinicaRef as { nome: string }).nome
        : "";

  return {
    nome: dentistaData.nome,
    clinica: clinicaNome ?? "",
  };
}

/**
 * Verifica se o usuário autenticado já tem registro em dentistas (com clinica_id).
 */
export async function hasDentistaRegistro(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}

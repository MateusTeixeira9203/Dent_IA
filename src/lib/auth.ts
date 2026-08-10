import type { SupabaseClient } from "@supabase/supabase-js";
import type { DentistaRole } from "@/types/database";

export interface DentistaLoginInfo {
  existe: boolean;
  role: DentistaRole | null;
}

/**
 * Verifica se o usuário autenticado já tem registro em dentistas e devolve o role.
 * O login usa o role pra escolher o destino direto (ex.: protético vai reto pra
 * /dashboard/protetico) em vez de passar por /dashboard e pagar o redirect do gate.
 * TODO: adicionar clinica_id scope — atualmente não filtra por clínica ativa (bug multi-clínica).
 */
export async function getDentistaLoginInfo(
  supabase: SupabaseClient
): Promise<DentistaLoginInfo> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { existe: false, role: null };

  const { data, error } = await supabase
    .from("dentistas")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return { existe: false, role: null };
  return { existe: true, role: data.role as DentistaRole };
}

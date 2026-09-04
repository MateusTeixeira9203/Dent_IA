import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DentistaRole } from "@/types/database";
import type { PlanoId } from "@/lib/planos";
import type { FocoPrincipal } from "@/lib/persona";
import type { Especialidade } from "@/lib/especialidades";

export interface DentistaCache {
  id: string;
  nome: string;
  cro: string | null;
  clinica_id: string;
  clinica: string;
  especialidade: Especialidade[];
  role: DentistaRole;
  avatar_url: string | null;
  status_convite: "pendente" | "aceito" | null;
  /** Persona escolhida no onboarding (Workstream E). null = sem diferenciação. */
  foco_principal: FocoPrincipal | null;
  plano: PlanoId;
  status_assinatura: "trial" | "ativo" | "inativo";
  trial_ends_at: string | null;
  limite_dentistas: number;
}

/**
 * Identidade mínima usada por rotas que só precisam autorizar uma ação clínica.
 * Mantém a clínica ativa como fonte de verdade e não carrega perfil, plano ou avatar.
 */
export interface DexActor {
  dentistaId: string;
  clinicaId: string;
}

export const getDexActorCached = cache(async (): Promise<DexActor | null> => {
  const supabase = await createClient();

  // getClaims valida a assinatura do JWT sem buscar o perfil completo no Auth a cada chamada.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (claimsError || typeof userId !== "string") return null;

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("active_clinica_id")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !userRecord?.active_clinica_id) return null;

  const clinicaId = userRecord.active_clinica_id as string;
  const { data, error } = await supabase
    .from("dentistas")
    .select("id, clinica_id")
    .eq("user_id", userId)
    .eq("clinica_id", clinicaId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as { id: string; clinica_id: string };
  if (row.clinica_id !== clinicaId) return null;

  return { dentistaId: row.id, clinicaId: row.clinica_id };
});

/**
 * Busca o perfil clínico do usuário logado para a clínica ativa.
 *
 * Fluxo:
 * 1. Resolve users.active_clinica_id (fonte de verdade de qual clínica está ativa)
 * 2. Busca dentistas scoped a (user_id, clinica_id) — sem .maybeSingle() sem escopo
 *
 * Retorna null se: não autenticado, sem clínica ativa ou sem perfil clínico.
 * Callers são responsáveis por tratar null (ex: redirect para /onboarding).
 *
 * Usa React.cache() para deduplicar chamadas na mesma requisição.
 */
export const getDentistaCached = cache(async (): Promise<DentistaCache | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ── 1. Resolver clínica ativa ────────────────────────────────────────────────
  const { data: userRecord } = await supabase
    .from("users")
    .select("active_clinica_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRecord?.active_clinica_id) return null;

  const clinicId = userRecord.active_clinica_id as string;

  // ── 2. Perfil clínico escopo (user_id, clinica_id) ───────────────────────────
  const { data, error } = await supabase
    .from("dentistas")
    .select(
      "id, nome, cro, clinica_id, especialidade, role, avatar_url, status_convite, foco_principal," +
        " clinicas(nome, plano, status_assinatura, trial_ends_at, limite_dentistas)",
    )
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (error || !data) return null;

  // Supabase retorna GenericStringError como possibilidade no tipo de `data` quando não há
  // schema gerado. O guard acima elimina os casos de erro/null em runtime; o cast aqui
  // elimina a ambiguidade no sistema de tipos.
  type DentistaRow = {
    id: string;
    nome: string;
    cro: string | null;
    clinica_id: string;
    especialidade: Especialidade[] | null;
    role: string;
    avatar_url: string | null;
    status_convite: string | null;
    foco_principal: string | null;
    clinicas: unknown;
  };

  const row = data as unknown as DentistaRow;

  // avatar_url guarda o caminho no storage (bucket privado, migration 117) — gera URL
  // assinada de curta duração na leitura. Falha de assinatura não deve derrubar a página.
  let avatarUrl: string | null = null;
  if (row.avatar_url) {
    const { data: signedData } = await supabase.storage
      .from("avatars")
      .createSignedUrl(row.avatar_url, 60 * 60);
    avatarUrl = signedData?.signedUrl ?? null;
  }

  type ClinicaFields = {
    nome: string;
    plano: string;
    status_assinatura: string;
    trial_ends_at: string | null;
    limite_dentistas: number;
  };

  const clinicaRef = row.clinicas;
  const clinica: ClinicaFields | null =
    Array.isArray(clinicaRef) && clinicaRef[0]
      ? (clinicaRef[0] as ClinicaFields)
      : clinicaRef && typeof clinicaRef === "object" && clinicaRef !== null && "nome" in clinicaRef
        ? (clinicaRef as ClinicaFields)
        : null;

  return {
    id: row.id,
    nome: row.nome,
    cro: row.cro,
    clinica_id: row.clinica_id,
    clinica: clinica?.nome ?? "",
    especialidade: row.especialidade ?? [],
    role: (row.role ?? "dentista") as DentistaRole,
    avatar_url: avatarUrl,
    status_convite: row.status_convite as "pendente" | "aceito" | null,
    foco_principal: (row.foco_principal as FocoPrincipal | null) ?? null,
    plano: (clinica?.plano as PlanoId) ?? "CLINICA",
    status_assinatura:
      (clinica?.status_assinatura as "trial" | "ativo" | "inativo") ?? "trial",
    trial_ends_at: clinica?.trial_ends_at ?? null,
    limite_dentistas: clinica?.limite_dentistas ?? 5,
  };
});

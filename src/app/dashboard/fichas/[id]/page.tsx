import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDentistaCached } from "@/lib/get-dentista";
import { FichaClient } from "./ficha-client";
import type { Ficha, Paciente, Dentista, FichaArquivo } from "@/types/database";

interface FichaPageProps {
  params: Promise<{ id: string }>;
}

export default async function FichaPage({ params }: FichaPageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  const dentista = await getDentistaCached();
  if (!dentista) redirect("/login");

  const supabase = await createClient();

  // Busca a ficha garantindo isolamento por clínica
  const { data: ficha } = await supabase
    .from("fichas")
    .select("*")
    .eq("id", id)
    .eq("clinica_id", dentista.clinica_id)
    .maybeSingle();

  if (!ficha) notFound();

  // Queries paralelas: paciente, dentista da ficha e arquivos
  const [
    { data: paciente },
    { data: dentistaFicha },
    { data: arquivos },
  ] = await Promise.all([
    supabase
      .from("pacientes")
      .select("*")
      .eq("id", ficha.paciente_id)
      .maybeSingle(),
    supabase
      .from("dentistas")
      .select("id, nome, especialidade")
      .eq("id", ficha.dentista_id)
      .maybeSingle(),
    supabase
      .from("ficha_arquivos")
      .select("*")
      .eq("ficha_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <FichaClient
      ficha={ficha as Ficha}
      paciente={paciente as Paciente}
      dentista={dentistaFicha as Dentista}
      clinicaId={dentista.clinica_id}
      arquivosIniciais={(arquivos as FichaArquivo[]) ?? []}
    />
  );
}

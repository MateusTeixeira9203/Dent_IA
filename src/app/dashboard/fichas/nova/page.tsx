import { redirect } from "next/navigation";
import { createFicha } from "./actions";

interface NovaFichaPageProps {
  searchParams: Promise<{ paciente_id?: string }>;
}

// Página que cria a ficha automaticamente e redireciona para ela
export default async function NovaFichaPage({ searchParams }: NovaFichaPageProps) {
  const { paciente_id } = await searchParams;

  if (!paciente_id) {
    redirect("/dashboard/pacientes");
  }

  const result = await createFicha(paciente_id);

  if ("error" in result) {
    // Redireciona para pacientes com parâmetro de erro
    redirect("/dashboard/pacientes?erro=ficha");
  }

  redirect(`/dashboard/fichas/${result.fichaId}`);
}

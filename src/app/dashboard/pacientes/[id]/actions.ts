"use server";

import { createClient } from "@/lib/supabase/server";
import { getDentistaCached } from "@/lib/get-dentista";
import { redirect } from "next/navigation";

export async function deletarFicha(fichaId: string): Promise<void> {
  const dentista = await getDentistaCached();
  if (!dentista) redirect("/login");

  const supabase = await createClient();

  const { error } = await supabase
    .from("fichas")
    .delete()
    .eq("id", fichaId)
    .eq("clinica_id", dentista.clinica_id);

  if (error) throw new Error("Erro ao apagar ficha");
}

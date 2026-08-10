"use server";

import { requireClinicContext } from "@/server/auth/clinic";
import { revalidatePath } from "next/cache";

export async function marcarPedidoEntregue(pedidoId: string): Promise<{ error?: string }> {
  const { supabase, clinicId, dentistaId, role } = await requireClinicContext();

  if (role !== "protetico") {
    return { error: "Apenas o protético responsável pode marcar como entregue." };
  }

  // .eq("status", "pendente") garante que um 2º clique (2 abas, duplo submit) não
  // encontra a linha de novo — já mudou de status — e recebe erro honesto em vez de
  // "sucesso" silencioso que reescreveria entregue_em sem avisar (spec §5).
  const { error, count } = await supabase
    .from("pedidos_protetico")
    .update({ status: "entregue", entregue_em: new Date().toISOString() }, { count: "exact" })
    .eq("id", pedidoId)
    .eq("clinica_id", clinicId)
    .eq("protetico_id", dentistaId)
    .eq("status", "pendente");

  if (error) return { error: error.message };

  if (!count) {
    return { error: "Pedido não encontrado, ou já foi marcado como entregue." };
  }

  revalidatePath("/dashboard/protetico");
  return {};
}

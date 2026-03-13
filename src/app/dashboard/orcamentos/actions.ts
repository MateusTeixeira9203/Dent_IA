"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "outro";

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado";

/**
 * Atualiza o status de um orçamento (ex: rascunho → enviado → aprovado).
 */
export async function atualizarStatusOrcamento(
  orcamentoId: string,
  status: StatusOrcamento
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("orcamentos")
    .update({ status })
    .eq("id", orcamentoId);

  if (error) {
    console.error("Erro ao atualizar status do orçamento:", error);
    return { error: error.message };
  }
  return {};
}

/**
 * Marca um pagamento como pago com a forma de pagamento informada.
 */
export async function marcarPagamentoPago(
  pagamentoId: string,
  formaPagamento: FormaPagamento
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hoje = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("pagamentos")
    .update({
      status: "pago",
      forma_pagamento: formaPagamento,
      data_pagamento: hoje,
    })
    .eq("id", pagamentoId);

  if (error) {
    console.error("Erro ao marcar pagamento como pago:", error);
    return { error: error.message };
  }

  return {};
}

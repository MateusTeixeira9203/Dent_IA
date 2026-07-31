"use server";

import { z } from "zod";
import { requireClinicContext } from "@/server/auth/clinic";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { inserirNotificacao } from "@/lib/notificacoes";
import { registrarLog } from "@/lib/activity-log";
import { hojeBRT } from "@/lib/hora-brt";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "outro";

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado";

const FORMA_LABEL: Record<FormaPagamento, string> = {
  dinheiro: "dinheiro", pix: "PIX", cartao_credito: "cartão de crédito",
  cartao_debito: "cartão de débito", boleto: "boleto", outro: "outro",
};

const fmtReal = (v: number): string =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function atualizarStatusOrcamento(
  orcamentoId: string,
  status: StatusOrcamento
): Promise<{ error?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id, nome")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  const updateData: Record<string, unknown> = { status };
  if (status === 'aprovado') {
    updateData.aprovado_por_id = dentistaPerfil.id;
    updateData.aprovado_em     = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orcamentos")
    .update(updateData)
    .eq("id", orcamentoId)
    .eq("clinica_id", clinicId);

  if (error) {
    console.error("Erro ao atualizar status do orçamento:", error);
    return { error: 'Não foi possível atualizar o orçamento. Tente novamente.' };
  }

  if (status === 'enviado' || status === 'aprovado' || status === 'recusado') {
    const { data: orc } = await supabase
      .from('orcamentos')
      .select('paciente_id, dentista_id, total, valor_acordado, plano_forma, paciente:pacientes(nome)')
      .eq('id', orcamentoId)
      .maybeSingle();

    const pacNome   = (orc?.paciente as unknown as { nome: string } | null)?.nome ?? 'paciente';
    const actionLog = status === 'aprovado' ? 'orcamento.aprovado' as const
      : status === 'enviado' ? 'orcamento.enviado' as const
      : 'orcamento.recusado' as const;

    registrarLog(supabase, {
      clinicaId:   clinicId,
      actorId:     dentistaPerfil.id,
      actorNome:   (dentistaPerfil as { id: string; nome: string }).nome,
      pacienteId:  orc?.paciente_id as string | undefined,
      entityType:  'orcamento',
      entityId:    orcamentoId,
      action:      actionLog,
      metadata:    { paciente_nome: pacNome, status_anterior: null, status_novo: status },
    });

    if (status === 'recusado') return {};

    await inserirNotificacao(supabase, {
      clinicaId:    clinicId,
      paraRole:     'secretaria',
      deDentistaId: dentistaPerfil.id,
      tipo:         status === 'enviado' ? 'orcamento_enviado' : 'briefing',
      titulo:       status === 'enviado'
        ? `Orçamento enviado — ${pacNome}`
        : `Orçamento aprovado — ${pacNome}`,
      mensagem:     status === 'enviado'
        ? `Orçamento de ${pacNome} enviado. Acompanhe o retorno e faça o follow-up se necessário.`
        : `Orçamento de ${pacNome} foi aprovado pelo dentista.`,
      href:         '/dashboard/orcamentos',
    });

    // R-34 §10.3 — com plano registrado, as parcelas (ou o valor_acordado) já representam
    // a dívida; inserir mais uma linha pendente do `total` cru duplicaria ou cobraria a mais
    // (I1/I2). Sem plano, comportamento de sempre: 1 linha pendente pra aprovar sem pagamento.
    const orcComPlano = orc as unknown as { total: number | null; paciente_id: string; dentista_id: string; plano_forma: string | null; valor_acordado: number | null } | null;
    if (status === 'aprovado' && orcComPlano && !orcComPlano.plano_forma) {
      const valorDevido = orcComPlano.valor_acordado ?? orcComPlano.total;
      if (valorDevido && valorDevido > 0) {
        const { count } = await supabase
          .from('pagamentos')
          .select('id', { count: 'exact', head: true })
          .eq('orcamento_id', orcamentoId);

        if ((count ?? 0) === 0) {
          await supabase.from('pagamentos').insert({
            orcamento_id:    orcamentoId,
            paciente_id:     orcComPlano.paciente_id,
            dentista_id:     orcComPlano.dentista_id,
            clinica_id:      clinicId,
            valor:           valorDevido,
            status:          'pendente',
            forma_pagamento: null,
            data_pagamento:  null,
            data_vencimento: null,
          });
        }
      }
    }
  }

  return {};
}

/** R-38 — controle "mostrar valor por procedimento" no momento de gerar/enviar o PDF.
 *  Só apresentação: `orcamento_itens` continua gravando os valores de sempre. */
export async function atualizarMostrarValorPorItem(
  orcamentoId: string,
  mostrar: boolean
): Promise<{ error?: string }> {
  const { supabase, clinicId } = await requireClinicContext();

  const { error } = await supabase
    .from("orcamentos")
    .update({ mostrar_valor_por_item: mostrar })
    .eq("id", orcamentoId)
    .eq("clinica_id", clinicId);

  if (error) {
    console.error("Erro ao atualizar exibição de valores do orçamento:", error);
    return { error: 'Não foi possível atualizar. Tente novamente.' };
  }

  return {};
}

export interface ParcelaGerada {
  id: string;
  valor: number;
  data_vencimento: string;
  parcela_numero: number;
  total_parcelas: number;
}

/**
 * Gera N parcelas de uma vez (todas 'pendente'), em vez do dentista/secretária
 * repetir "Registrar Pagamento" uma por uma. R-34 commit 3: a divisão em centavos,
 * as datas por mês calendário e a gravação do plano viraram RPC (`gerar_parcelas_orcamento`,
 * migration 122/123) — mesma transação, então plano e parcelas nunca ficam dessincronizados.
 * A RPC soma o que já está pago e desconta antes de dividir: chamar isto num orçamento com
 * pagamento avulso parcela o **saldo**, não o total (era o cálculo que o client fazia sozinho
 * antes — agora é o banco que soma, não dá pra confiar em saldo calculado no browser).
 * `valorAcordado` some quando não passado: mantém o que já está no orçamento (total ou o que
 * já tiver sido negociado).
 */
export async function gerarParcelas(dados: {
  orcamentoId: string;
  numeroParcelas: number;
  primeiroVencimento: string;
  valorAcordado?: number;
  entradaValor?: number;
  entradaForma?: FormaPagamento;
  parcelasForma?: FormaPagamento;
}): Promise<{ error?: string; parcelas?: ParcelaGerada[] }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  if (!Number.isInteger(dados.numeroParcelas) || dados.numeroParcelas < 2 || dados.numeroParcelas > 24) {
    return { error: "Número de parcelas deve ser entre 2 e 24." };
  }
  if (!dados.primeiroVencimento) {
    return { error: "Informe a data do primeiro vencimento." };
  }

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id, nome")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  const { data: parcelas, error } = await supabase.rpc("gerar_parcelas_orcamento", {
    p_orcamento_id:        dados.orcamentoId,
    p_numero_parcelas:     dados.numeroParcelas,
    p_primeiro_vencimento: dados.primeiroVencimento,
    p_valor_acordado:      dados.valorAcordado ?? null,
    p_entrada_valor:       dados.entradaValor ?? null,
    p_entrada_forma:       dados.entradaForma ?? null,
    p_parcelas_forma:      dados.parcelasForma ?? null,
  });

  if (error) {
    if (error.message.includes("numero_parcelas_invalido")) return { error: "Número de parcelas deve ser entre 2 e 24." };
    if (error.message.includes("valor_invalido")) return { error: "Não há valor pendente para parcelar." };
    if (error.message.includes("vencimento_invalido")) return { error: "Informe a data do primeiro vencimento." };
    if (error.message.includes("plano_ja_definido")) return { error: "Este orçamento já tem forma de pagamento definida." };
    if (error.message.includes("sem_permissao")) return { error: "Orçamento não encontrado." };
    console.error("[gerarParcelas]", error.message);
    return { error: "Não foi possível gerar as parcelas. Tente novamente." };
  }

  const linhas = (parcelas ?? []) as unknown as ParcelaGerada[];

  // I5 — condicoes_pagamento nasce só aqui, a partir do que a RPC acabou de gravar.
  const partes: string[] = [];
  if (dados.entradaValor) {
    partes.push(`Entrada de ${fmtReal(dados.entradaValor)}${dados.entradaForma ? ` (${FORMA_LABEL[dados.entradaForma]})` : ""}`);
  }
  const valorPorParcela = linhas[0]?.valor ?? 0;
  partes.push(`${dados.numeroParcelas}x de ${fmtReal(valorPorParcela)}${dados.parcelasForma ? ` (${FORMA_LABEL[dados.parcelasForma]})` : ""}`);
  await supabase.from("orcamentos").update({ condicoes_pagamento: partes.join(" + ") })
    .eq("id", dados.orcamentoId).eq("clinica_id", clinicId);

  registrarLog(supabase, {
    clinicaId:  clinicId,
    actorId:    dentistaPerfil.id,
    actorNome:  dentistaPerfil.nome,
    entityType: "orcamento",
    entityId:   dados.orcamentoId,
    action:     "pagamento.parcelado",
    metadata:   { numero_parcelas: dados.numeroParcelas },
  });

  revalidatePath("/dashboard/orcamentos");
  revalidatePath("/dashboard/financeiro");
  return { parcelas: linhas };
}

/**
 * Define o acordo à vista — só registra (§10.2: entrada nunca vira linha de pagamento
 * sozinha, nasce quando o dinheiro entrar). Mutuamente exclusivo com `gerarParcelas`
 * (RPC recusa se o orçamento já tem plano_forma).
 */
export async function definirPlanoAvista(dados: {
  orcamentoId: string;
  valorAcordado: number;
  entradaValor?: number;
  entradaForma?: FormaPagamento;
}): Promise<{ error?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  const { error } = await supabase.rpc("definir_plano_avista", {
    p_orcamento_id:   dados.orcamentoId,
    p_valor_acordado: dados.valorAcordado,
    p_entrada_valor:  dados.entradaValor ?? null,
    p_entrada_forma:  dados.entradaForma ?? null,
  });

  if (error) {
    if (error.message.includes("valor_invalido")) return { error: "Informe um valor válido." };
    if (error.message.includes("plano_ja_definido")) return { error: "Este orçamento já tem forma de pagamento definida." };
    if (error.message.includes("sem_permissao")) return { error: "Orçamento não encontrado." };
    console.error("[definirPlanoAvista]", error.message);
    return { error: "Não foi possível registrar a forma de pagamento. Tente novamente." };
  }

  const partes: string[] = [];
  if (dados.entradaValor) {
    partes.push(`Entrada de ${fmtReal(dados.entradaValor)}${dados.entradaForma ? ` (${FORMA_LABEL[dados.entradaForma]})` : ""}`);
    partes.push(`Restante à vista — ${fmtReal(dados.valorAcordado - dados.entradaValor)}`);
  } else {
    partes.push(`À vista — ${fmtReal(dados.valorAcordado)}`);
  }
  await supabase.from("orcamentos").update({ condicoes_pagamento: partes.join(" + ") })
    .eq("id", dados.orcamentoId).eq("clinica_id", clinicId);

  revalidatePath("/dashboard/orcamentos");
  return {};
}

/**
 * R-28 — fecha uma parcela pendente já existente (UPDATE), nunca insere linha nova.
 * `data` é livre (não hardcoda hoje) — é o que faltava pra fechar em data diferente de hoje
 * sem duplicar via "Registrar pagamento".
 */
export async function marcarPagamentoPago(
  pagamentoId: string,
  dados: { formaPagamento: FormaPagamento; data: string },
): Promise<{ error?: string; autoAprovado?: boolean }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  const { data: pagAtual } = await supabase
    .from("pagamentos")
    .select("id, status, valor, orcamento_id, paciente_id, dentista_id")
    .eq("id", pagamentoId)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!pagAtual) {
    return { error: "Pagamento não encontrado." };
  }
  if (pagAtual.status === "pago") {
    return { error: "Este pagamento já está marcado como pago." };
  }

  const { error } = await supabase
    .from("pagamentos")
    .update({
      status:          "pago",
      forma_pagamento: dados.formaPagamento,
      data_pagamento:  dados.data,
      marcado_por_id:  dentistaPerfil.id,
    })
    .eq("id", pagamentoId)
    .eq("clinica_id", clinicId);

  if (error) {
    console.error("Erro ao marcar pagamento como pago:", error);
    return { error: 'Não foi possível registrar o pagamento. Tente novamente.' };
  }

  // D6 — mesma regra de auto-aprovação do registrarPagamento (paridade, não a
  // reconciliação da parte 3 do achado — essa fica pra decisão de negócio separada).
  let autoAprovado = false;
  const { data: orcRow } = await supabase
    .from("orcamentos")
    .select("total, valor_acordado, status")
    .eq("id", pagAtual.orcamento_id)
    .eq("clinica_id", clinicId)
    .single();

  if (orcRow && orcRow.status === "enviado") {
    const { data: pagamentos } = await supabase
      .from("pagamentos")
      .select("valor")
      .eq("orcamento_id", pagAtual.orcamento_id)
      .eq("status", "pago");

    const totalPago = (pagamentos ?? []).reduce((s, p) => s + p.valor, 0);
    const valorDevido = orcRow.valor_acordado ?? orcRow.total ?? 0; // I1
    if (totalPago >= valorDevido) {
      await supabase
        .from("orcamentos")
        .update({ status: "aprovado" })
        .eq("id", pagAtual.orcamento_id)
        .eq("clinica_id", clinicId);
      autoAprovado = true;
    }
  }

  if (role === 'secretaria' && pagAtual.dentista_id) {
    const { data: pac } = await supabase
      .from('pacientes').select('nome').eq('id', pagAtual.paciente_id).maybeSingle();
    const pacNome = (pac as { nome: string } | null)?.nome ?? 'paciente';
    const valorFmt = Number(pagAtual.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await inserirNotificacao(supabase, {
      clinicaId:      clinicId,
      paraRole:       'dentista',
      paraDentistaId: pagAtual.dentista_id,
      deDentistaId:   dentistaPerfil.id,
      tipo:           'pagamento_confirmado',
      titulo:         `Pagamento recebido — ${pacNome}`,
      mensagem:       `Secretária registrou ${valorFmt} (${dados.formaPagamento.replace(/_/g, ' ')}) do paciente ${pacNome}.`,
      href:           '/dashboard/orcamentos',
    });
  }

  registrarLog(supabase, {
    clinicaId:   clinicId,
    actorId:     dentistaPerfil.id,
    pacienteId:  pagAtual.paciente_id,
    entityType:  'pagamento',
    entityId:    pagamentoId,
    action:      'pagamento.registrado',
    metadata:    { valor: pagAtual.valor, forma: dados.formaPagamento, orcamento_id: pagAtual.orcamento_id },
  });

  revalidatePath("/dashboard/orcamentos");
  revalidatePath('/dashboard/financeiro');
  return { autoAprovado };
}

export async function criarOrcamento(dados: {
  pacienteId: string;
  desconto?: number;
  itens: Array<{
    procedimentoId: string | null;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
  }>;
  dentistaId?: string;
  /** Ficha de origem do orçamento — vincula orçamento↔ficha p/ a apresentação não vazar entre tratamentos. */
  fichaId?: string | null;
}): Promise<{ error?: string; id?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  if (dentistaPerfil.role === "secretaria") {
    if (!dados.dentistaId) {
      return { error: "Selecione o dentista responsável pelo orçamento." };
    }
    const { data: alvo } = await supabase
      .from("dentistas")
      .select("id")
      .eq("id", dados.dentistaId)
      .eq("clinica_id", clinicId)
      .eq("ativo", true)
      .neq("role", "secretaria")
      .maybeSingle();
    if (!alvo) {
      return { error: "Dentista selecionado inválido." };
    }
  }

  const dentistaAlvoId = dados.dentistaId ?? dentistaPerfil.id;

  const subtotal = dados.itens.reduce(
    (sum, item) => sum + item.quantidade * item.precoUnitario,
    0
  );
  const desconto = dados.desconto ?? 0;
  const total = Math.max(0, subtotal - desconto);

  const { data: orc, error: orcError } = await supabase
    .from("orcamentos")
    .insert({
      clinica_id:   clinicId,
      dentista_id:  dentistaAlvoId,
      paciente_id:  dados.pacienteId,
      ...(dados.fichaId != null && { ficha_id: dados.fichaId }),
      status:       "rascunho",
      total,
      desconto,
      validade_dias: 30,
      // Pedido do Mateus 31/07: orçamento novo nasce sem valor por item — só o total.
      // Dentista ainda pode ligar por orçamento (toggle no detalhe, R-38); o default
      // da coluna (migration 124) continua true, então aqui é explícito.
      mostrar_valor_por_item: false,
    })
    .select("id")
    .single();

  if (orcError || !orc) {
    return { error: orcError?.message ?? "Erro ao criar orçamento." };
  }

  const itensInsert = dados.itens.map((item) => ({
    orcamento_id:    orc.id,
    clinica_id:      clinicId,
    descricao:       item.descricao,
    procedimento_id: item.procedimentoId ?? null,
    quantidade:      item.quantidade,
    preco_unitario:  item.precoUnitario,
    preco_total:     item.quantidade * item.precoUnitario,
  }));

  const { error: itensError } = await supabase
    .from("orcamento_itens")
    .insert(itensInsert);

  if (itensError) {
    return { error: itensError.message };
  }

  revalidatePath(`/dashboard/pacientes/${dados.pacienteId}`);
  revalidatePath("/dashboard/orcamentos");
  return { id: orc.id };
}

export async function registrarPagamento(dados: {
  orcamentoId: string;
  pacienteId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  data: string;
  dataVencimento?: string;
  dentistaId?: string;
}): Promise<{ error?: string; id?: string; autoAprovado?: boolean }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  const dentistaId = dados.dentistaId ?? dentistaPerfil.id;
  const hoje = new Date().toISOString().split('T')[0];
  const isAgendado = dados.dataVencimento && dados.dataVencimento > hoje;

  const { data, error } = await supabase
    .from("pagamentos")
    .insert({
      orcamento_id:    dados.orcamentoId,
      paciente_id:     dados.pacienteId,
      dentista_id:     dentistaId,
      clinica_id:      clinicId,
      valor:           dados.valor,
      status:          isAgendado ? 'pendente' : 'pago',
      forma_pagamento: isAgendado ? null : dados.formaPagamento,
      data_pagamento:  isAgendado ? null : dados.data,
      data_vencimento: dados.dataVencimento ?? null,
      marcado_por_id:  isAgendado ? null : dentistaPerfil.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  let autoAprovado = false;
  const { data: orcRow } = await supabase
    .from("orcamentos")
    .select("total, valor_acordado, status")
    .eq("id", dados.orcamentoId)
    .eq("clinica_id", clinicId)
    .single();

  if (orcRow && orcRow.status === "enviado") {
    const { data: pagamentos } = await supabase
      .from("pagamentos")
      .select("valor")
      .eq("orcamento_id", dados.orcamentoId)
      .eq("status", "pago");

    const totalPago = (pagamentos ?? []).reduce((s, p) => s + p.valor, 0);
    const valorDevido = orcRow.valor_acordado ?? orcRow.total ?? 0; // I1
    if (totalPago >= valorDevido) {
      await supabase
        .from("orcamentos")
        .update({ status: "aprovado" })
        .eq("id", dados.orcamentoId)
        .eq("clinica_id", clinicId);
      autoAprovado = true;
    }
  }

  if (role === 'secretaria' && dados.dentistaId) {
    const { data: pac } = await supabase
      .from('pacientes').select('nome').eq('id', dados.pacienteId).maybeSingle();
    const pacNome = (pac as { nome: string } | null)?.nome ?? 'paciente';
    const valorFmt = dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await inserirNotificacao(supabase, {
      clinicaId:      clinicId,
      paraRole:       'dentista',
      paraDentistaId: dados.dentistaId,
      deDentistaId:   dentistaPerfil.id,
      tipo:           'pagamento_confirmado',
      titulo:         `Pagamento recebido — ${pacNome}`,
      mensagem:       `Secretária registrou ${valorFmt} (${dados.formaPagamento.replace(/_/g, ' ')}) do paciente ${pacNome}.`,
      href:           '/dashboard/orcamentos',
    });
  }

  registrarLog(supabase, {
    clinicaId:   clinicId,
    actorId:     dentistaPerfil.id,
    pacienteId:  dados.pacienteId,
    entityType:  'pagamento',
    entityId:    data.id,
    action:      'pagamento.registrado',
    metadata:    { valor: dados.valor, forma: dados.formaPagamento, orcamento_id: dados.orcamentoId },
  });

  revalidatePath("/dashboard/orcamentos");
  revalidatePath('/dashboard/financeiro');
  return { id: data.id, autoAprovado };
}

export async function editarPagamento(
  pagamentoId: string,
  dados: { valor: number; formaPagamento: FormaPagamento; data: string },
): Promise<{ error?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const { data: pagAtual } = await supabase
    .from("pagamentos")
    .select("id, paciente_id")
    .eq("id", pagamentoId)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!pagAtual) {
    return { error: "Pagamento não encontrado." };
  }

  const { error } = await supabase
    .from("pagamentos")
    .update({
      valor:           dados.valor,
      forma_pagamento: dados.formaPagamento,
      data_pagamento:  dados.data,
    })
    .eq("id", pagamentoId)
    .eq("clinica_id", clinicId);

  if (error) {
    return { error: error.message };
  }

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  registrarLog(supabase, {
    clinicaId:   clinicId,
    actorId:     dentistaPerfil?.id ?? null,
    pacienteId:  pagAtual.paciente_id,
    entityType:  'pagamento',
    entityId:    pagamentoId,
    action:      'pagamento.editado',
    metadata:    { valor: dados.valor, forma: dados.formaPagamento },
  });

  revalidatePath("/dashboard/orcamentos");
  revalidatePath("/dashboard/financeiro");
  return {};
}

export async function excluirPagamento(
  pagamentoId: string,
): Promise<{ error?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const { data: pagAtual } = await supabase
    .from("pagamentos")
    .select("id, paciente_id, valor, forma_pagamento")
    .eq("id", pagamentoId)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!pagAtual) {
    return { error: "Pagamento não encontrado." };
  }

  const { error } = await supabase
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId)
    .eq("clinica_id", clinicId);

  if (error) {
    return { error: error.message };
  }

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  registrarLog(supabase, {
    clinicaId:   clinicId,
    actorId:     dentistaPerfil?.id ?? null,
    pacienteId:  pagAtual.paciente_id,
    entityType:  'pagamento',
    entityId:    pagamentoId,
    action:      'pagamento.excluido',
    metadata:    { valor: pagAtual.valor, forma: pagAtual.forma_pagamento },
  });

  revalidatePath("/dashboard/orcamentos");
  revalidatePath("/dashboard/financeiro");
  return {};
}

export async function editarOrcamento(
  orcamentoId: string,
  itens: Array<{
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    procedimento_id?: string | null;
  }>,
  // R-35 item 5 — sem default: os dois chamadores tinham que passar o desconto atual
  // explícito, senão editar um item apagava silenciosamente o desconto do orçamento
  // (recalculava total = subtotal). Compilador acusa qualquer chamador que esquecer.
  desconto: number
): Promise<{ error?: string }> {
  const { supabase, clinicId } = await requireClinicContext();

  const { error: delError } = await supabase
    .from("orcamento_itens")
    .delete()
    .eq("orcamento_id", orcamentoId)
    .eq("clinica_id", clinicId);

  if (delError) return { error: delError.message };

  const itensInsert = itens.map((item) => ({
    orcamento_id:    orcamentoId,
    clinica_id:      clinicId,
    descricao:       item.descricao,
    procedimento_id: item.procedimento_id ?? null,
    quantidade:      item.quantidade,
    preco_unitario:  item.preco_unitario,
    preco_total:     item.quantidade * item.preco_unitario,
  }));

  const { error: insError } = await supabase.from("orcamento_itens").insert(itensInsert);
  if (insError) return { error: insError.message };

  const subtotal = itens.reduce((sum, i) => sum + i.quantidade * i.preco_unitario, 0);
  const total = Math.max(0, subtotal - desconto);

  const { error: updError } = await supabase
    .from("orcamentos")
    .update({ total, desconto })
    .eq("id", orcamentoId)
    .eq("clinica_id", clinicId);

  if (updError) return { error: updError.message };

  revalidatePath("/dashboard/orcamentos");
  return {};
}

/**
 * R-34 §7.1 — o atalho de 1 clique. Fecha a PRÓXIMA PARCELA ABERTA quando existe uma
 * (delega ao UPDATE de `marcarPagamentoPago` — nunca insere linha nova por cima de parcela
 * já gerada); sem parcela, cobra o que falta do valor acordado. Nunca quita "tudo de uma vez"
 * por cima de um plano — cada clique fecha uma parcela ou o saldo, nunca mais que isso (I2).
 *
 * "Parcela aberta" = pagamento com status='pendente' deste orçamento, ordenado por
 * coalesce(data_vencimento, created_at) e depois parcela_numero — a primeira da ordem é a
 * que fecha. Um avulso pendente (sem parcela_numero, ex. o que `atualizarStatusOrcamento`
 * insere ao aprovar sem plano) entra nessa mesma ordenação e conta como "aberta".
 */
export async function registrarPagamentoRapido(dados: {
  orcamentoId: string;
  pacienteId: string;
  formaPagamento: FormaPagamento;
}): Promise<{ error?: string; id?: string; autoAprovado?: boolean }> {
  const { supabase, user, clinicId, role } = await requireClinicContext();

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) redirect("/onboarding");

  // Regra 1 — lê o estado antes de decidir (hoje: zero leitura, insere às cegas).
  const { data: orc } = await supabase
    .from("orcamentos")
    .select("id, dentista_id, status, total, valor_acordado")
    .eq("id", dados.orcamentoId)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!orc) return { error: "Orçamento não encontrado." };

  const { data: pagamentosOrc } = await supabase
    .from("pagamentos")
    .select("id, status, valor, data_vencimento, parcela_numero, created_at")
    .eq("orcamento_id", dados.orcamentoId)
    .eq("clinica_id", clinicId);

  const linhas = pagamentosOrc ?? [];
  const totalPago = linhas.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0);
  const valorDevido = orc.valor_acordado ?? orc.total ?? 0; // I1

  const abertas = linhas
    .filter((p) => p.status === "pendente")
    .sort((a, b) => {
      const da = a.data_vencimento ?? a.created_at;
      const db = b.data_vencimento ?? b.created_at;
      if (da !== db) return da < db ? -1 : 1;
      return (a.parcela_numero ?? 0) - (b.parcela_numero ?? 0);
    });

  const hoje = hojeBRT(); // regra 7

  if (abertas.length > 0) {
    // Regra 2 — delega ao UPDATE existente: mesma auto-aprovação, mesmo log, mesma
    // notificação por dentista_id da LINHA (regra 8, já é assim em marcarPagamentoPago).
    const alvo = abertas[0];
    const resultado = await marcarPagamentoPago(alvo.id, { formaPagamento: dados.formaPagamento, data: hoje });
    return { error: resultado.error, id: alvo.id, autoAprovado: resultado.autoAprovado };
  }

  // Regras 3/4 — sem parcela aberta: cobra o que falta (tudo, se nada foi pago; o saldo, se
  // já tem parte paga). Nunca `orc.total` cru fixo — sempre o que ainda falta de verdade.
  const saldo = Math.round((valorDevido - totalPago) * 100) / 100;
  if (saldo <= 0) {
    return { error: "Este orçamento já está quitado." };
  }

  const { data, error } = await supabase
    .from("pagamentos")
    .insert({
      orcamento_id:    dados.orcamentoId,
      paciente_id:     dados.pacienteId,
      dentista_id:     orc.dentista_id, // regra 8 — do orçamento, não de um dentistaId vindo do client
      clinica_id:      clinicId,
      valor:           saldo,
      status:          "pago",
      forma_pagamento: dados.formaPagamento,
      data_pagamento:  hoje,
      marcado_por_id:  dentistaPerfil.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[registrarPagamentoRapido]", error.message); // regra 9 — sanitizado
    return { error: "Não foi possível registrar o pagamento. Tente novamente." };
  }

  // Regra 5 — auto-aprovação travada (nunca UPDATE incondicional), com autoria.
  let autoAprovado = false;
  if (orc.status === "enviado" && totalPago + saldo >= valorDevido) {
    await supabase
      .from("orcamentos")
      .update({ status: "aprovado", aprovado_por_id: dentistaPerfil.id, aprovado_em: new Date().toISOString() })
      .eq("id", dados.orcamentoId)
      .eq("clinica_id", clinicId);
    autoAprovado = true;
  }

  if (role === 'secretaria' && orc.dentista_id) {
    const { data: pac } = await supabase
      .from('pacientes').select('nome').eq('id', dados.pacienteId).maybeSingle();
    const pacNome = (pac as { nome: string } | null)?.nome ?? 'paciente';
    const valorFmt = fmtReal(saldo);
    await inserirNotificacao(supabase, {
      clinicaId:      clinicId,
      paraRole:       'dentista',
      paraDentistaId: orc.dentista_id,
      deDentistaId:   dentistaPerfil.id,
      tipo:           'pagamento_confirmado',
      titulo:         `Pagamento recebido — ${pacNome}`,
      mensagem:       `Secretária registrou ${valorFmt} (${dados.formaPagamento.replace(/_/g, ' ')}) de ${pacNome}.${autoAprovado ? ' Orçamento aprovado.' : ''}`,
      href:           '/dashboard/orcamentos',
    });
  }

  // Regra 6 — sempre loga (hoje: nunca loga).
  registrarLog(supabase, {
    clinicaId:   clinicId,
    actorId:     dentistaPerfil.id,
    pacienteId:  dados.pacienteId,
    entityType:  'pagamento',
    entityId:    data.id,
    action:      'pagamento.registrado',
    metadata:    { valor: saldo, forma: dados.formaPagamento, orcamento_id: dados.orcamentoId },
  });

  revalidatePath("/dashboard/orcamentos");
  revalidatePath('/dashboard/financeiro');
  return { id: data.id, autoAprovado };
}

export async function excluirOrcamento(
  orcamentoId: string,
  pacienteId?: string
): Promise<{ error?: string }> {
  const { supabase, clinicId } = await requireClinicContext();

  // Protege exclusão de orçamentos com pagamentos já registrados
  const { count: pagoCount } = await supabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('orcamento_id', orcamentoId)
    .eq('clinica_id', clinicId)
    .eq('status', 'pago');

  if ((pagoCount ?? 0) > 0) {
    return { error: 'Este orçamento possui pagamentos registrados. Altere o status antes de excluir.' };
  }

  // R-03c-1: orçamento com aceite assinado é a prova de que o paciente concordou em pagar —
  // apagar o orçamento apagaria a prova junto. A FK RESTRICT (migration 113) é a rede de
  // segurança de verdade; esta checagem só existe pra dar uma mensagem legível ao usuário.
  const { count: aceiteCount } = await supabase
    .from('assinaturas')
    .select('id', { count: 'exact', head: true })
    .eq('orcamento_id', orcamentoId)
    .eq('clinica_id', clinicId)
    .eq('tipo', 'orcamento');

  if ((aceiteCount ?? 0) > 0) {
    return { error: 'Este orçamento tem aceite assinado pelo paciente e não pode ser excluído.' };
  }

  await supabase
    .from("pagamentos")
    .delete()
    .eq("orcamento_id", orcamentoId)
    .eq("clinica_id", clinicId);

  await supabase
    .from("orcamento_itens")
    .delete()
    .eq("orcamento_id", orcamentoId)
    .eq("clinica_id", clinicId);

  const { error } = await supabase
    .from("orcamentos")
    .delete()
    .eq("id", orcamentoId)
    .eq("clinica_id", clinicId);

  if (error) return { error: error.message };

  if (pacienteId) revalidatePath(`/dashboard/pacientes/${pacienteId}`);
  revalidatePath("/dashboard/orcamentos");
  return {};
}

/**
 * Cadastro rápido de procedimento a partir do orçamento — quando o item digitado não
 * corresponde a nada no catálogo. Qualquer dentista da clínica pode usar (não só admin;
 * ver migration 083). Catálogo é privado por dentista (migration 084) — o procedimento
 * nasce vinculado a quem criou, nunca a um id vindo do cliente. Editar/excluir o catálogo
 * completo continua em Configurações.
 */
export async function criarProcedimentoRapido(dados: {
  nome: string;
  precoPadrao: number | null;
  dentistaId?: string;
}): Promise<{ error?: string; id?: string }> {
  const { supabase, user, clinicId } = await requireClinicContext();

  const nome = dados.nome.trim();
  if (!nome) return { error: "Informe o nome do procedimento." };

  const { data: dentistaPerfil } = await supabase
    .from("dentistas")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId)
    .maybeSingle();

  if (!dentistaPerfil) return { error: "Perfil de dentista não encontrado." };

  if (dentistaPerfil.role === "secretaria") {
    if (!dados.dentistaId) {
      return { error: "Selecione o dentista responsável pelo orçamento." };
    }
    const { data: alvo } = await supabase
      .from("dentistas")
      .select("id")
      .eq("id", dados.dentistaId)
      .eq("clinica_id", clinicId)
      .eq("ativo", true)
      .neq("role", "secretaria")
      .maybeSingle();
    if (!alvo) {
      return { error: "Dentista selecionado inválido." };
    }
  }

  const dentistaAlvoId = dados.dentistaId ?? dentistaPerfil.id;

  const { data, error } = await supabase
    .from("procedimentos")
    .insert({
      clinica_id:   clinicId,
      dentista_id:  dentistaAlvoId,
      nome,
      preco_padrao: dados.precoPadrao,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao cadastrar procedimento:", error);
    return { error: "Não foi possível cadastrar o procedimento. Tente novamente." };
  }

  revalidatePath("/dashboard/configuracoes");
  return { id: (data as { id: string }).id };
}

// Não exportar o schema em si — arquivo "use server" só pode exportar funções async.
// Só o tipo derivado sai (apagado em runtime), mesmo padrão de assinarProcedimentosSchema.
const aceitarOrcamentoSchema = z.object({
  orcamentoId: z.string().uuid(),
  assinadoPor: z.string().trim().min(2).max(120),
  assinaturaDataUrl: z.string().startsWith('data:image/png;base64,'),
});
export type AceitarOrcamentoInput = z.infer<typeof aceitarOrcamentoSchema>;

/**
 * R-03c-1 — aceite assinado do orçamento (prova comercial: o paciente concordou em pagar
 * nestes termos; distinto da assinatura clínica do R-03a, que prova que o procedimento foi
 * feito). Wrapper fino da RPC aceitar_orcamento (migration 113, SECURITY DEFINER): quem pode
 * coletar é decisão travada na spec — autor do orçamento ou secretária da mesma clínica,
 * validado NO BANCO. O snapshot dos termos é montado dentro da RPC a partir do banco, nunca
 * a partir do que este wrapper envia — se o client mandasse os termos, a prova não provaria nada.
 */
export async function aceitarOrcamento(
  params: AceitarOrcamentoInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = aceitarOrcamentoSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const { orcamentoId, assinadoPor, assinaturaDataUrl } = parsed.data;

  const { supabase, clinicId } = await requireClinicContext();

  // Resolve paciente_id só pro path do storage — a RPC valida tudo de novo por dentro
  // (este read não é a autorização, é só pra montar o nome do arquivo).
  const { data: orcRef } = await supabase
    .from('orcamentos')
    .select('paciente_id')
    .eq('id', orcamentoId)
    .eq('clinica_id', clinicId)
    .maybeSingle();

  if (!orcRef) return { ok: false, error: 'Orçamento não encontrado.' };

  const base64 = assinaturaDataUrl.split(',')[1];
  if (!base64) return { ok: false, error: 'Assinatura inválida.' };
  const buffer = Buffer.from(base64, 'base64');
  const storagePath = `${clinicId}/${orcRef.paciente_id}/aceite_${orcamentoId}_${Date.now()}.png`;

  const { error: storageErr } = await supabase.storage
    .from('fichas')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

  if (storageErr) {
    console.error('[aceitarOrcamento] storage:', storageErr.message);
    return { ok: false, error: 'Erro ao salvar a assinatura.' };
  }

  const { error } = await supabase.rpc('aceitar_orcamento', {
    p_orcamento_id: orcamentoId,
    p_assinado_por: assinadoPor,
    p_assinatura_ref: storagePath,
  });

  if (error) {
    // PNG já subiu mas a RPC rejeitou — remove o órfão antes de devolver o erro (mesmo
    // cuidado que assinarProcedimentos já toma).
    await supabase.storage.from('fichas').remove([storagePath]);
    if (error.message.includes('sem_permissao')) {
      return { ok: false, error: 'Você não tem permissão para registrar o aceite deste orçamento.' };
    }
    if (error.message.includes('ja_aceito')) {
      return { ok: false, error: 'Este orçamento já tem aceite assinado.' };
    }
    if (error.message.includes('status_invalido')) {
      return { ok: false, error: 'Não é possível coletar aceite de um orçamento recusado.' };
    }
    if (error.message.includes('sem_responsavel')) {
      return { ok: false, error: 'Este orçamento não tem dentista responsável. Atribua um antes de coletar o aceite.' };
    }
    console.error('[aceitarOrcamento]', error.message);
    return { ok: false, error: 'Não foi possível registrar o aceite.' };
  }

  revalidatePath(`/dashboard/pacientes/${orcRef.paciente_id}`);
  revalidatePath('/dashboard/orcamentos');
  return { ok: true };
}

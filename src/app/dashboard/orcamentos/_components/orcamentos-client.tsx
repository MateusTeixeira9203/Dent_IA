"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  marcarPagamentoPago,
  atualizarStatusOrcamento,
  type FormaPagamento,
  type StatusOrcamento,
} from "../actions";
import type { OrcamentoEnriquecido, MetricasMes } from "./types";

// Status dos orçamentos com seus labels e cores
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground border border-border",
  },
  enviado: {
    label: "Enviado",
    className: "bg-primary/10 text-primary border border-primary/20",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400",
  },
  recusado: {
    label: "Recusado",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

const PAGAMENTO_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pendente: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400",
  },
  pago: {
    label: "Pago",
    className: "bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  boleto: "Boleto",
  outro: "Outro",
};

function formatBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

interface Props {
  orcamentos: OrcamentoEnriquecido[];
  metricas: MetricasMes;
}

export function OrcamentosClient({
  orcamentos,
  metricas,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroMes, setFiltroMes] = useState<string>("todos");

  // Sheet de detalhe — armazena apenas o ID para usar dados frescos após refresh
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);

  // Forma de pagamento selecionada por pagamento pendente
  const [formas, setFormas] = useState<Record<string, FormaPagamento>>({});

  // Orçamento exibido no sheet (atualiza com novas props após router.refresh)
  const selectedOrcamento =
    orcamentos.find((o) => o.id === orcamentoId) ?? null;

  // Lista de meses disponíveis para o filtro
  const mesesDisponiveis = Array.from(
    new Set(orcamentos.map((o) => o.created_at.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  // Aplica filtros
  const filtrados = orcamentos.filter((o) => {
    if (filtroStatus !== "todos" && o.status !== filtroStatus) return false;
    if (filtroMes !== "todos" && !o.created_at.startsWith(filtroMes))
      return false;
    return true;
  });

  async function handleAtualizarStatus(
    orcamentoId: string,
    status: StatusOrcamento
  ): Promise<void> {
    const result = await atualizarStatusOrcamento(orcamentoId, status);
    if (result.error) {
      toast.error(`Erro: ${result.error}`);
    } else {
      router.refresh();
    }
  }

  async function handleMarcarPago(pagamentoId: string): Promise<void> {
    const forma = formas[pagamentoId];
    if (!forma) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    startTransition(async () => {
      const result = await marcarPagamentoPago(pagamentoId, forma);
      if (result.error) {
        toast.error(`Erro: ${result.error}`);
      } else {
        toast.success("Pagamento marcado como pago");
        router.refresh();
      }
    });
  }

  // Métricas do orçamento selecionado no sheet
  const sheetPendente = selectedOrcamento
    ? selectedOrcamento.pagamentos
        .filter((p) => p.status === "pendente")
        .reduce((acc, p) => acc + Number(p.valor), 0)
    : 0;
  const sheetPago = selectedOrcamento
    ? selectedOrcamento.pagamentos
        .filter((p) => p.status === "pago")
        .reduce((acc, p) => acc + Number(p.valor), 0)
    : 0;

  return (
    <>
      {/* Métricas — cards estilo screenshot */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Total
            </span>
          </div>
          <p className="font-mono text-2xl font-bold text-foreground leading-none">
            {formatBRL(metricas.totalMes)}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider">
            do mês
          </p>
        </div>

        {/* Pendente */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Pendente
            </span>
          </div>
          <p className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 leading-none">
            {formatBRL(metricas.pendente)}
          </p>
          <p className="font-mono text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-1.5 uppercase tracking-wider">
            a receber
          </p>
        </div>

        {/* Recebido */}
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-green-600 dark:text-green-400">
              Recebido
            </span>
          </div>
          <p className="font-mono text-2xl font-bold text-green-600 dark:text-green-400 leading-none">
            {formatBRL(metricas.recebido)}
          </p>
          <p className="font-mono text-[10px] text-green-600/60 dark:text-green-400/60 mt-1.5 uppercase tracking-wider">
            confirmado
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={filtroStatus} onValueChange={(v) => { if (v !== null) setFiltroStatus(v); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroMes} onValueChange={(v) => { if (v !== null) setFiltroMes(v); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {mesesDisponiveis.map((m) => (
              <SelectItem key={m} value={m}>
                {format(new Date(`${m}-01`), "MMMM yyyy", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de orçamentos */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-10 h-10 text-muted-foreground/30 mb-4" />
          <p className="font-sans text-sm text-muted-foreground">
            Nenhum orçamento encontrado
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3.5 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                  Paciente
                </th>
                <th className="text-left px-5 py-3.5 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                  Dentista
                </th>
                <th className="text-left px-5 py-3.5 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                  Status
                </th>
                <th className="text-right px-5 py-3.5 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                  Valor
                </th>
                <th className="text-left px-5 py-3.5 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                  Data
                </th>
                <th className="px-4 py-3.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((orc, i) => {
                const statusCfg =
                  STATUS_CONFIG[orc.status] ?? {
                    label: orc.status,
                    className: "bg-muted text-muted-foreground border border-border",
                  };

                return (
                  <tr
                    key={orc.id}
                    onClick={() => setOrcamentoId(orc.id)}
                    className={`border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors ${
                      i === filtrados.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-sans text-foreground font-medium">
                      {orc.paciente.nome}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {orc.dentista.nome}
                    </td>
                    <td
                      className="px-5 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`relative inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                        <select
                          value={orc.status}
                          onChange={(e) =>
                            void handleAtualizarStatus(
                              orc.id,
                              e.target.value as StatusOrcamento
                            )
                          }
                          className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        >
                          <option value="rascunho">Rascunho</option>
                          <option value="enviado">Enviado</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="recusado">Recusado</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-foreground text-right font-semibold">
                      {orc.total != null ? formatBRL(orc.total) : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {format(new Date(orc.created_at), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet de detalhe do orçamento */}
      <Sheet
        open={orcamentoId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setOrcamentoId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-[560px] sm:max-w-[560px] overflow-y-auto p-0"
        >
          {selectedOrcamento && (
            <>
              <SheetHeader className="p-6 pb-5 border-b border-border">
                <div className="flex items-start justify-between pr-8">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                      Orçamento do Tratamento
                    </p>
                    <SheetTitle className="text-lg">
                      {selectedOrcamento.paciente.nome}
                    </SheetTitle>
                    <SheetDescription>
                      Criado em{" "}
                      {format(
                        new Date(selectedOrcamento.created_at),
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: ptBR }
                      )}
                    </SheetDescription>
                  </div>
                  <div
                    className={`relative inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                      STATUS_CONFIG[selectedOrcamento.status]?.className ??
                      "bg-muted text-muted-foreground border border-border"
                    }`}
                    title="Clique para alterar o status"
                  >
                    {STATUS_CONFIG[selectedOrcamento.status]?.label ??
                      selectedOrcamento.status}
                    <select
                      value={selectedOrcamento.status}
                      onChange={(e) =>
                        void handleAtualizarStatus(
                          selectedOrcamento.id,
                          e.target.value as StatusOrcamento
                        )
                      }
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    >
                      <option value="rascunho">Rascunho</option>
                      <option value="enviado">Enviado</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="recusado">Recusado</option>
                    </select>
                  </div>
                </div>
              </SheetHeader>

              <div className="p-6 space-y-6">
                {/* Mini métricas do orçamento — estilo screenshot */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      Total
                    </p>
                    <p className="font-mono text-base font-bold text-foreground">
                      {selectedOrcamento.total != null
                        ? formatBRL(selectedOrcamento.total)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
                      Pendente
                    </p>
                    <p className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                      {formatBRL(sheetPendente)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3.5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">
                      Concluído
                    </p>
                    <p className="font-mono text-base font-bold text-green-600 dark:text-green-400">
                      {formatBRL(sheetPago)}
                    </p>
                  </div>
                </div>

                {/* Tabela de procedimentos — estilo screenshot */}
                <div>
                  {selectedOrcamento.itens.length === 0 ? (
                    <p className="font-sans text-sm text-muted-foreground">
                      Nenhum procedimento registrado
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              Dente
                            </th>
                            <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              Procedimento
                            </th>
                            <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              Valor
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrcamento.itens.map((item, i) => (
                            <tr
                              key={item.id}
                              className={`border-b border-border/50 ${
                                i === selectedOrcamento.itens.length - 1
                                  ? "border-b-0"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                                {item.dente ?? "—"}
                              </td>
                              <td className="px-4 py-3 font-sans text-foreground">
                                {item.descricao ?? "—"}
                                {item.quantidade > 1 && (
                                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                    ×{item.quantidade}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-sm text-foreground text-right font-semibold">
                                {item.preco_total != null
                                  ? formatBRL(item.preco_total)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-muted/20">
                            <td
                              colSpan={2}
                              className="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider text-right"
                            >
                              Total Geral
                            </td>
                            <td className="px-4 py-3 font-mono text-base font-bold text-foreground text-right">
                              {selectedOrcamento.total != null
                                ? formatBRL(selectedOrcamento.total)
                                : "—"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagamentos vinculados */}
                {selectedOrcamento.pagamentos.length > 0 && (
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-3">
                      Pagamentos
                    </p>
                    <div className="space-y-3">
                      {selectedOrcamento.pagamentos.map((pg) => {
                        const pgCfg = PAGAMENTO_STATUS_CONFIG[pg.status] ?? {
                          label: pg.status,
                          className: "bg-muted text-muted-foreground border border-border",
                        };
                        return (
                          <div
                            key={pg.id}
                            className="rounded-xl border border-border bg-muted/10 p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-bold text-foreground">
                                {formatBRL(Number(pg.valor))}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pgCfg.className}`}
                              >
                                {pgCfg.label}
                              </span>
                            </div>

                            {pg.forma_pagamento && (
                              <p className="font-mono text-xs text-muted-foreground">
                                {FORMA_LABELS[pg.forma_pagamento] ??
                                  pg.forma_pagamento}
                              </p>
                            )}

                            {pg.data_pagamento && (
                              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                                Pago em{" "}
                                {format(
                                  new Date(pg.data_pagamento),
                                  "dd/MM/yyyy"
                                )}
                              </p>
                            )}

                            {pg.data_vencimento && pg.status === "pendente" && (
                              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                                Vencimento:{" "}
                                {format(
                                  new Date(pg.data_vencimento),
                                  "dd/MM/yyyy"
                                )}
                              </p>
                            )}

                            {/* Formulário inline para marcar como pago */}
                            {pg.status === "pendente" && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                                <Select
                                  value={formas[pg.id] ?? ""}
                                  onValueChange={(v) =>
                                    setFormas((prev) => ({
                                      ...prev,
                                      [pg.id]: v as FormaPagamento,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 flex-1 text-xs">
                                    <SelectValue placeholder="Forma de pagamento" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="pix">Pix</SelectItem>
                                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                                    <SelectItem value="boleto">Boleto</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                  </SelectContent>
                                </Select>

                                <button
                                  type="button"
                                  disabled={isPending || !formas[pg.id]}
                                  onClick={() => void handleMarcarPago(pg.id)}
                                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                                >
                                  {isPending ? "Salvando…" : "Marcar como Pago"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

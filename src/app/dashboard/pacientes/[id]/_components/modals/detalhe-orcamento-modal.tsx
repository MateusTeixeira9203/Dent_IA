'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Edit2, Trash2, CircleDollarSign, Plus, CheckCircle2, Check,
  Loader2, CreditCard, Banknote, Smartphone,
  Receipt, User, CalendarClock, Layers, X, PenLine,
} from 'lucide-react';
import { AceiteOrcamentoModal } from '@/components/orcamentos/aceite-orcamento-modal';
import { BotaoDownloadPDF } from '@/components/orcamentos/botao-download-pdf';
import { BotaoEnviarWhatsApp } from '@/components/orcamentos/botao-enviar-whatsapp';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FormaPagamento } from '@/app/dashboard/orcamentos/actions';
import { deriveEstadoOrcamento, rotuloEstado, type EstadoOrcamento } from '@/lib/orcamentos/estado';
import { parseValorBR, formatValorBR } from '@/lib/valor-br';
import type { OrcamentoComItens, OrcEditItem, Pagamento } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FORMA_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX',
  cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto', outro: 'Outro',
};

const FORMA_ICON: Record<string, React.ElementType> = {
  dinheiro: Banknote, pix: Smartphone,
  cartao_credito: CreditCard, cartao_debito: CreditCard,
  boleto: Receipt, outro: CircleDollarSign,
};

// ─── types ────────────────────────────────────────────────────────────────────

type PagForm = { valor: string; formaPagamento: FormaPagamento; data: string; dataVencimento: string };
// editarPagamento não altera vencimento — edição de um pagamento existente fica
// restrita a valor/forma/data, sem o campo de agendamento futuro.
type EditPagForm = { valor: string; formaPagamento: FormaPagamento; data: string };
type ParcelasForm = { numero: string; primeiroVencimento: string };

interface Props {
  detalheOrc: OrcamentoComItens | null;
  detalheOrcId: string | null;
  onClose: () => void;
  /** R-39a — carona nos 2 itens da R-33 que o Mateus pediu antes da hora: PDF e WhatsApp
   *  já existiam em botao-download-pdf.tsx/botao-enviar-whatsapp.tsx (zero backend), só
   *  não estavam pendurados nesta tela ainda. */
  pacienteTelefone: string | null | undefined;
  pacienteNome: string;
  pagForm: PagForm;
  setPagForm: React.Dispatch<React.SetStateAction<PagForm>>;
  pagSaving: boolean;
  pagError: string | null;
  parcelasMode: boolean;
  setParcelasMode: (v: boolean) => void;
  parcelasForm: ParcelasForm;
  setParcelasForm: React.Dispatch<React.SetStateAction<ParcelasForm>>;
  parcelasSaving: boolean;
  parcelasError: string | null;
  onGerarParcelas: () => void;
  orcEditMode: boolean;
  setOrcEditMode: (v: boolean) => void;
  orcEditItens: OrcEditItem[];
  setOrcEditItens: React.Dispatch<React.SetStateAction<OrcEditItem[]>>;
  orcEditSaving: boolean;
  orcEditError: string | null;
  setOrcEditError: (v: string | null) => void;
  onOpenEditOrc: () => void;
  onSalvarEdicaoOrc: () => void;
  /** R-114 — o paciente aceitou (ou desmarcou) UM procedimento. Estado deriva sozinho. */
  onAlternarAprovacaoItem: (itemId: string, aprovado: boolean) => void;
  /** R-114 — atalho de 1 clique: aprova todos os itens ainda não aprovados, num UPDATE só. */
  onAprovarTodosItens: (orcamentoId: string) => void;
  onRegistrarPagamento: () => void;
  /** R-93 — atalho de 1 clique (R-34 §7.1): fecha a próxima parcela aberta, ou cobra o saldo
   *  restante, sempre em dinheiro. Sem isso o caminho mais curto pra receber era 3-4 gestos. */
  onRegistrarDinheiroRapido: () => void;
  pagRapidoSaving: boolean;
  /** R-28 — id da parcela pendente sendo fechada; null = Registrar pagamento em modo criar novo. */
  closingPagamentoId: string | null;
  onIniciarFechamentoPagamento: (pg: Pagamento) => void;
  onCancelarFechamentoPagamento: () => void;
  onDeleteClick: (id: string | null) => void;
  /** R-66 — a policy `orcamentos_delete_own` só libera DELETE pro dentista dono (sem exceção
   *  admin/secretaria). Botão só aparece pra quem o clique não vai falhar de qualquer forma —
   *  o servidor (`excluirOrcamento`) continua sendo a fonte da verdade, isto é só evitar
   *  oferecer uma ação que sempre nega. */
  podeExcluir: boolean;
  editingPagId: string | null;
  editPagForm: EditPagForm;
  setEditPagForm: React.Dispatch<React.SetStateAction<EditPagForm>>;
  editPagSaving: boolean;
  editPagError: string | null;
  onIniciarEdicaoPagamento: (pg: Pagamento) => void;
  onCancelarEdicaoPagamento: () => void;
  onSalvarEdicaoPagamento: () => void;
  confirmDeletePagId: string | null;
  setConfirmDeletePagId: (id: string | null) => void;
  pagDeleteSaving: boolean;
  onExcluirPagamento: (id: string) => void;
  editValorAcordadoAberto: boolean;
  valorAcordadoTexto: string;
  setValorAcordadoTexto: React.Dispatch<React.SetStateAction<string>>;
  valorAcordadoSaving: boolean;
  valorAcordadoError: string | null;
  onIniciarEdicaoValorAcordado: () => void;
  onCancelarEdicaoValorAcordado: () => void;
  onSalvarValorAcordado: () => void;
  /** R-03c-1 — chamado depois que o servidor confirma o aceite (o pai decide como refletir). */
  onAceiteRegistrado: () => void;
  /** R-38 — liga/desliga o valor por procedimento no PDF deste orçamento. */
  onToggleMostrarValorPorItem: (id: string, mostrar: boolean) => void;
}

// ─── component ───────────────────────────────────────────────────────────────

export function DetalheOrcamentoModal({
  detalheOrc, detalheOrcId, onClose,
  pacienteTelefone, pacienteNome,
  pagForm, setPagForm, pagSaving, pagError,
  parcelasMode, setParcelasMode, parcelasForm, setParcelasForm, parcelasSaving, parcelasError, onGerarParcelas,
  orcEditMode, setOrcEditMode, orcEditItens, setOrcEditItens,
  orcEditSaving, orcEditError, setOrcEditError,
  onOpenEditOrc, onSalvarEdicaoOrc,
  onAlternarAprovacaoItem, onAprovarTodosItens, onRegistrarPagamento,
  onRegistrarDinheiroRapido, pagRapidoSaving,
  closingPagamentoId, onIniciarFechamentoPagamento, onCancelarFechamentoPagamento,
  onDeleteClick,
  podeExcluir,
  editingPagId, editPagForm, setEditPagForm, editPagSaving, editPagError,
  onIniciarEdicaoPagamento, onCancelarEdicaoPagamento, onSalvarEdicaoPagamento,
  confirmDeletePagId, setConfirmDeletePagId, pagDeleteSaving, onExcluirPagamento,
  editValorAcordadoAberto, valorAcordadoTexto, setValorAcordadoTexto,
  valorAcordadoSaving, valorAcordadoError,
  onIniciarEdicaoValorAcordado, onCancelarEdicaoValorAcordado, onSalvarValorAcordado,
  onAceiteRegistrado,
  onToggleMostrarValorPorItem,
}: Props) {
  const hoje = new Date().toISOString().split('T')[0];
  /** R-39a: só Procedimentos e Atividade — Pagamentos virou a coluna do dinheiro. */
  const [tab, setTab] = useState<'procedimentos' | 'atividade'>('procedimentos');
  const [showAceiteModal, setShowAceiteModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<{ id: string; actor_nome: string | null; action: string; created_at: string }[]>([]);

  // Patch 4: Lazy-fetch activity logs quando o modal abre
  useEffect(() => {
    if (!detalheOrc) { setActivityLogs([]); return; }
    const supabase = createClient();
    void supabase
      .from('activity_logs')
      .select('id, actor_nome, action, created_at')
      .eq('entity_type', 'orcamento')
      .eq('entity_id', detalheOrc.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setActivityLogs((data ?? []) as { id: string; actor_nome: string | null; action: string; created_at: string }[]));
  }, [detalheOrc?.id]);

  const ACTION_LABEL: Record<string, string> = {
    orcamento_aprovado: 'Aprovado',
    orcamento_enviado:  'Enviado ao paciente',
    orcamento_recusado: 'Recusado',
    'pagamento.registrado': 'Pagamento registrado',
    'pagamento.parcelado': 'Parcelamento gerado',
    'pagamento.editado': 'Pagamento editado',
    'pagamento.excluido': 'Pagamento excluído',
    status_alterado: 'Status alterado',
  };

  // R-114 — estado derivado dos fatos (item aprovado × pagamento), não mais declarado.
  // Mesma fórmula de lib/orcamentos/estado.ts — nunca reimplementada aqui.
  const { totalPago, totalPendente, pctPago, quitado, restante, estado, valorDevido, valorAprovado } = useMemo(() => {
    if (!detalheOrc) {
      return {
        totalPago: 0, totalPendente: 0, pctPago: 0, quitado: false, restante: 0,
        estado: 'proposto' as EstadoOrcamento, valorDevido: 0, valorAprovado: 0,
      };
    }
    const derivado = deriveEstadoOrcamento({
      valorAcordado: detalheOrc.valor_acordado,
      itens: detalheOrc.itens.map((i) => ({ precoTotal: i.preco_total, aprovado: i.aprovado })),
      pagamentos: detalheOrc.pagamentos.map((p) => ({ valor: p.valor, status: p.status })),
    });
    const pendente = detalheOrc.pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0);
    // Arredonda pra centavo antes de comparar — soma de floats (parcelas) raramente bate
    // exato com o devido (ex.: 149.99999999999997).
    const restanteArred = Math.max(0, Math.round((derivado.valorDevido - derivado.valorPago) * 100) / 100);
    return {
      totalPago:     derivado.valorPago,
      totalPendente: pendente,
      pctPago:       derivado.valorDevido > 0 ? Math.min(100, (derivado.valorPago / derivado.valorDevido) * 100) : 0,
      quitado:       derivado.estado === 'quitado',
      restante:      restanteArred,
      estado:        derivado.estado,
      valorDevido:   derivado.valorDevido,
      valorAprovado: derivado.valorAprovado,
    };
  }, [detalheOrc]);

  const valorNegociado = detalheOrc?.valor_acordado ?? detalheOrc?.total ?? 0;
  const temParcelaAgendada = detalheOrc?.pagamentos.some(
    (pagamento) => pagamento.status === 'pendente',
  ) ?? false;
  const valorFinalTravado = Boolean(detalheOrc?.plano_forma) || temParcelaAgendada;

  /**
   * R-27a: quantidade de pagamentos recebidos e formas distintas usadas — é o que a
   * coluna do dinheiro resume (era a aba "Pagamentos", virou a R-39a).
   */
  const { pagosCount, formasUsadas } = useMemo(() => {
    const pgs = detalheOrc?.pagamentos ?? [];
    const pagos = pgs.filter(p => p.status === 'pago');
    const formas = [...new Set(pagos.map(p => p.forma_pagamento).filter(Boolean) as string[])];
    return {
      pagosCount:    pagos.length,
      formasUsadas:  formas,
    };
  }, [detalheOrc]);

  // R-39a — clicar em "Falta receber" preenche o valor da coluna do dinheiro com o
  // saldo restante, igual ao atalho que existia na antiga aba Pagamentos.
  function preencherRestante() {
    if (restante <= 0) return;
    setPagForm(f => ({ ...f, valor: formatValorBR(restante), dataVencimento: '' }));
  }

  return (
    <Dialog open={!!detalheOrcId} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="flex flex-col rounded-3xl bg-surface border-border p-0 overflow-hidden gap-0 w-[94vw] sm:w-[82vw]"
        style={{ maxWidth: '1280px', maxHeight: '90vh', left: '50%' }}
        showCloseButton={false}
      >
        {detalheOrc && (
          <>
            {/* ── Cabeçalho (R-27a) ────────────────────────────────────
                Sem gradiente hardcoded e sem seletor de status. O canto direito é
                reservado — nada de conteúdo cai embaixo do ✕. A única pergunta que a
                tabela de procedimentos não responde ("está sendo pago?") vive aqui. */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <DialogTitle className="font-heading font-semibold text-xl text-text-primary leading-tight">
                  Orçamento
                </DialogTitle>
                {/* R-114 — badge deriva de item aprovado × pagamento, não é mais declarado.
                    Nenhuma transição manual: "Proposto"/"Aceito"/"Quitado" só mudam quando o
                    paciente aceita um procedimento (aba Procedimentos) ou paga. */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0 ${
                    estado === 'quitado'
                      ? 'bg-teal-ink text-white'
                      : estado === 'aceito'
                        ? 'bg-warning-pale text-warning-ink'
                        : 'bg-surface-alt text-text-secondary'
                  }`}
                >
                  {estado === 'quitado' && <CheckCircle2 className="w-3 h-3" />}
                  {rotuloEstado({ estado, valorDevido, valorPago: totalPago, valorAprovado })}
                </span>
                <DialogDescription className="text-text-muted text-xs truncate">
                  {format(parseISO(detalheOrc.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {quitado ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-teal-ink text-white">
                    <CheckCircle2 className="w-3 h-3" />
                    Quitado
                  </span>
                ) : valorAprovado > 0 ? (
                  <span className="font-mono text-sm font-medium text-text-primary hidden sm:inline">
                    <span className="text-teal-ink">R$ {fmt(totalPago)}</span>
                    <span className="font-sans text-xs text-text-secondary"> de </span>
                    R$ {fmt(valorDevido)}
                    <span className="font-sans text-xs text-text-secondary"> pagos</span>
                  </span>
                ) : null}

                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Corpo: procedimentos à esquerda, dinheiro à direita (R-39a) ──────
                Empilha com o dinheiro ACIMA no celular (flex-col-reverse): é a
                pergunta que se responde primeiro num gesto de balcão. */}
            <div className="flex-1 min-h-0 flex flex-col-reverse sm:flex-row">

              {/* ── Coluna clínica ─────────────────────────────────────── */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                <Tabs
                  value={tab}
                  onValueChange={(v) => setTab(v as typeof tab)}
                  className="flex flex-col flex-1 min-h-0 gap-0"
                >
                  <TabsList className="h-auto shrink-0 justify-start gap-1 rounded-none border-b border-border bg-transparent px-6 py-0 overflow-x-auto">
                    {([
                      { value: 'procedimentos', label: 'Procedimentos', count: detalheOrc.itens.length },
                      { value: 'atividade',     label: 'Atividade',     count: null },
                    ] as const).map(t => (
                      <TabsTrigger
                        key={t.value}
                        value={t.value}
                        className="rounded-none border-b-2 border-transparent px-3 py-2.5 font-semibold data-[active]:bg-transparent data-[active]:shadow-none data-[active]:border-teal data-[active]:text-teal-ink"
                      >
                        {t.label}
                        {t.count !== null && (
                          <span className="ml-1.5 font-mono text-[11px] text-text-muted">{t.count}</span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* ── Aba: procedimentos ─────────────────────────────────── */}
                  <TabsContent value="procedimentos" className="mt-0 flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-2">
                      {orcEditMode ? (
                        <div className="space-y-2">
                          {orcEditItens.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[24px_1fr_64px_112px_28px] items-center gap-2 rounded-xl border border-border bg-surface-alt px-3 py-2.5">
                              <span className="w-6 h-6 rounded-lg bg-teal/10 text-teal text-xs font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <Input
                                placeholder="Descrição do procedimento"
                                value={item.descricao}
                                onChange={e => setOrcEditItens(prev => prev.map((it, i) => i === idx ? { ...it, descricao: e.target.value } : it))}
                                className="rounded-lg bg-surface border-border text-text-primary text-sm h-9"
                              />
                              <Input
                                type="number" min="1" value={item.quantidade}
                                onChange={e => setOrcEditItens(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: parseInt(e.target.value) || 1 } : it))}
                                className="rounded-lg bg-surface border-border text-text-primary text-sm font-mono h-9 text-center"
                              />
                              <Input
                                type="text" inputMode="decimal" placeholder="0,00"
                                value={item.preco_unitario}
                                onChange={e => setOrcEditItens(prev => prev.map((it, i) => i === idx ? { ...it, preco_unitario: e.target.value } : it))}
                                onBlur={e => {
                                  const parsed = parseValorBR(e.target.value);
                                  setOrcEditItens(prev => prev.map((it, i) => i === idx ? { ...it, preco_unitario: parsed > 0 ? formatValorBR(parsed) : it.preco_unitario } : it));
                                }}
                                className="rounded-lg bg-surface border-border text-text-primary text-sm font-mono h-9"
                              />
                              <button
                                onClick={() => setOrcEditItens(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg hover:bg-coral-pale text-coral-ink transition-colors"
                                aria-label="Remover procedimento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setOrcEditItens(prev => [...prev, { descricao: '', quantidade: 1, preco_unitario: '' }])}
                            className="w-full py-3 border border-dashed border-border rounded-xl text-sm text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Adicionar procedimento
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-border overflow-hidden">
                          {detalheOrc.itens.length === 0 ? (
                            <div className="p-6 text-center text-sm text-text-secondary">Nenhum procedimento registrado.</div>
                          ) : (
                            <>
                              {detalheOrc.itens.map((item, idx) => (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-b-0 transition-colors ${
                                    item.aprovado ? 'hover:bg-surface-alt/40' : 'bg-surface-alt/30'
                                  }`}
                                >
                                  {/* R-114 — o gesto de aprovação: o paciente aceitou este
                                      procedimento? Item desmarcado NUNCA some — só deixa de
                                      contar no devido e no PDF (I2). */}
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={item.aprovado}
                                    aria-label={item.aprovado ? 'Aprovado — clique para desmarcar' : 'Marcar como aprovado pelo paciente'}
                                    onClick={() => onAlternarAprovacaoItem(item.id, !item.aprovado)}
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                      item.aprovado
                                        ? 'bg-teal-ink border-teal-ink text-white'
                                        : 'border-border bg-surface hover:border-teal/40'
                                    }`}
                                  >
                                    {item.aprovado && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${item.aprovado ? 'text-text-primary' : 'text-text-secondary'}`}>
                                      {item.descricao ?? '—'}
                                      {!item.aprovado && (
                                        <span className="ml-2 inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-surface-alt text-text-secondary align-middle">
                                          não incluído
                                        </span>
                                      )}
                                    </p>
                                    {item.quantidade > 1 && (
                                      <p className="text-[11px] text-text-secondary font-mono">
                                        {item.quantidade} unidades × R$ {fmt((item.preco_total ?? 0) / item.quantidade)}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`font-mono text-sm font-semibold shrink-0 ${item.aprovado ? 'text-text-primary' : 'text-text-secondary'}`}>
                                    R$ {fmt(item.preco_total ?? 0)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between px-4 py-3 bg-teal/5 gap-3">
                                <div>
                                  <span className="text-sm font-bold text-text-primary block">Aprovado</span>
                                  {valorAprovado < (detalheOrc.total ?? 0) && (
                                    <span className="text-[11px] text-text-secondary">
                                      Proposto: R$ {fmt(detalheOrc.total ?? 0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Atalho de 1 clique (pedido dele, 16/08): some sozinho
                                      quando tudo já está aprovado — sem "desmarcar tudo",
                                      é direção única (bate na I9 assim que há pagamento). */}
                                  {detalheOrc.itens.some((i) => !i.aprovado) && (
                                    <button
                                      type="button"
                                      onClick={() => onAprovarTodosItens(detalheOrc.id)}
                                      className="text-[11px] font-bold uppercase tracking-wider text-teal-ink border border-teal/40 rounded-lg px-2.5 py-1 hover:bg-teal/10 transition-colors"
                                    >
                                      Aprovar tudo
                                    </button>
                                  )}
                                  <span className="font-mono text-lg font-bold text-teal">
                                    R$ {fmt(valorAprovado)}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Aba: atividade ────────────────────────────────────────
                      Ganha lugar próprio: antes era um rodapé espremido no fim da coluna
                      esquerda, junto da auditoria de aprovação. */}
                  <TabsContent value="atividade" className="mt-0 flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                    {/* R-03c-1 — aceite assinado: prova de que o paciente concordou em pagar
                        (distinta da aprovação de status acima, que não afirma nada em 4 dos 5
                        caminhos que a disparam). */}
                    {detalheOrc.aceite ? (
                      <div className="flex items-start gap-2 bg-teal/5 border border-teal/15 rounded-xl px-3 py-2.5">
                        <PenLine className="w-3.5 h-3.5 text-teal-ink shrink-0 mt-0.5" />
                        <p className="text-xs text-text-secondary">
                          Aceite assinado por <span className="font-semibold text-text-primary">{detalheOrc.aceite.assinadoPor}</span>
                          {' '}em {format(parseISO(detalheOrc.aceite.assinadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {detalheOrc.aceite.croNoAto && <> · CRO {detalheOrc.aceite.croNoAto}</>}
                        </p>
                        <p className="text-xs text-text-muted">Documento final disponível em Documentos.</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAceiteModal(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-teal/5 hover:text-teal-ink hover:border-teal/30 transition-all"
                      >
                        <PenLine className="w-4 h-4" />
                        Coletar aceite do paciente
                      </button>
                    )}

                    {/* R-114 — `aprovado_por`/`aprovado_em` são legado (só a ponte da tela
                        antiga da secretária ainda escreve). `status` fica inerte pra
                        orçamento tocado por aqui; o gate é só presença do dado. */}
                    {(detalheOrc.aprovado_por || detalheOrc.aprovado_em) && (
                      <div className="flex items-center gap-2 bg-teal/5 border border-teal/15 rounded-xl px-3 py-2.5">
                        <User className="w-3.5 h-3.5 text-teal shrink-0" />
                        <p className="text-xs text-text-secondary">
                          {detalheOrc.aprovado_por && (
                            <span>Aprovado por <span className="font-semibold text-text-primary">{detalheOrc.aprovado_por.nome}</span></span>
                          )}
                          {detalheOrc.aprovado_em && (
                            <span> em {format(parseISO(detalheOrc.aprovado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {activityLogs.length === 0 ? (
                      <p className="text-sm text-text-secondary text-center py-8">Nenhuma atividade registrada ainda.</p>
                    ) : (
                      <div className="space-y-0">
                          {activityLogs.map(log => (
                            <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-teal/40 shrink-0" />
                              <p className="text-xs flex-1 min-w-0">
                                <span className="font-medium text-text-primary">{ACTION_LABEL[log.action] ?? log.action}</span>
                                {log.actor_nome && (
                                  <span className="ml-1 text-text-secondary/60">por {log.actor_nome.split(' ')[0]}</span>
                                )}
                              </p>
                              <span className="font-mono text-xs text-text-secondary shrink-0">
                                {format(parseISO(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* ── Coluna do dinheiro (R-39a) ─────────────────────────────
                  % pago → falta receber → parcelas → formulário, sempre visível. O
                  diálogo aninhado de "Registrar pagamento" (R-34 §7.0) deixa de existir:
                  é gesto de balcão, não cabe atrás de um segundo clique. */}
              <div
                className="w-full sm:w-[416px] sm:shrink-0 border-t sm:border-t-0 sm:border-l border-border flex flex-col min-h-0 bg-teal/[0.04]"
              >
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                  {orcEditMode ? (
                    <div className="rounded-2xl border border-teal/25 p-5 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-teal-ink">Novo total</p>
                      <p className="font-mono text-3xl font-semibold text-teal-ink mt-1">
                        R$ {fmt(orcEditItens.reduce((s, i) => s + i.quantidade * parseValorBR(i.preco_unitario), 0))}
                      </p>
                      <p className="text-xs text-text-secondary mt-2">
                        Salve as alterações na aba Procedimentos para registrar pagamentos.
                      </p>
                    </div>
                  ) : quitado ? (
                    <div className="rounded-2xl border border-teal p-6 text-center space-y-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-teal-ink">Recebido neste orçamento</p>
                      <p className="font-mono text-3xl font-semibold text-teal-ink">R$ {fmt(totalPago)}</p>
                      <p className="text-xs text-text-secondary">
                        {pagosCount} {pagosCount === 1 ? 'pagamento' : 'pagamentos'}
                        {formasUsadas.length > 0 && ` · ${formasUsadas.map(f => FORMA_LABEL[f] ?? f).join(', ')}`}
                      </p>
                      <p className="text-xs text-text-secondary pt-2">Nada mais a receber.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-teal-ink">Quanto já foi pago</p>
                        <p className="font-mono text-3xl font-semibold text-teal-ink leading-tight">
                          {pctPago.toFixed(0)}<span className="text-lg">%</span>
                        </p>
                      </div>
                      <div className="w-full h-2.5 bg-surface-alt rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal rounded-full transition-all duration-700"
                          style={{ width: `${pctPago}%` }}
                        />
                      </div>
                      {!closingPagamentoId && (
                        <Button
                          type="button"
                          onClick={onRegistrarDinheiroRapido}
                          disabled={pagRapidoSaving}
                          className="w-full mt-1 bg-teal text-white hover:bg-teal-lt rounded-xl gap-2 disabled:opacity-50"
                        >
                          <Banknote className="w-4 h-4" />
                          {pagRapidoSaving ? 'Registrando...' : 'Registrar Dinheiro'}
                        </Button>
                      )}
                      <button
                        type="button"
                        disabled={restante <= 0}
                        onClick={preencherRestante}
                        className="w-full flex items-baseline justify-between pt-1 enabled:hover:opacity-80 transition-opacity disabled:cursor-default"
                      >
                        <span className="text-xs text-text-secondary">Falta receber</span>
                        <span className={`font-mono text-sm font-semibold ${restante > 0 ? 'text-warning-ink' : 'text-teal-ink'}`}>
                          R$ {fmt(restante)}
                        </span>
                      </button>
                      {totalPendente > 0 && (
                        <p className="text-[11px] font-mono text-warning-ink">
                          R$ {fmt(totalPendente)} agendado, ainda não recebido
                        </p>
                      )}
                    </div>
                  )}

                  {!orcEditMode && (
                    <>
                      <div className="h-px bg-border my-4" />
                      {editValorAcordadoAberto ? (
                        <div className="rounded-xl border border-teal/30 bg-teal/5 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs font-bold text-text-primary">Valor final negociado</Label>
                            <span className="text-[10px] text-text-secondary">Não altera os procedimentos</span>
                          </div>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={valorAcordadoTexto}
                            onChange={(event) => setValorAcordadoTexto(event.target.value)}
                            className="rounded-lg bg-surface border-border text-text-primary font-mono"
                          />
                          {valorAcordadoError && <p className="text-xs text-coral-ink">{valorAcordadoError}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={onCancelarEdicaoValorAcordado} disabled={valorAcordadoSaving} className="flex-1 rounded-lg">
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={onSalvarValorAcordado} disabled={valorAcordadoSaving} className="flex-1 rounded-lg bg-teal text-white hover:bg-teal/90">
                              {valorAcordadoSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar valor'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-surface-alt/40 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Valor final negociado</p>
                              <p className="font-mono text-lg font-semibold text-text-primary mt-1">R$ {fmt(valorNegociado)}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={onIniciarEdicaoValorAcordado}
                              disabled={valorFinalTravado}
                              className="rounded-lg h-8 text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                            </Button>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-2">
                            {detalheOrc.plano_forma
                              ? 'Há um plano de pagamento ativo. Ajuste as parcelas antes de alterar este valor.'
                              : temParcelaAgendada
                                ? 'Há uma parcela agendada. Ajuste ou remova a parcela antes de alterar este valor.'
                                : 'Você pode corrigir o combinado sem mudar os procedimentos.'}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {detalheOrc.pagamentos.length > 0 && (
                    <>
                      <div className="h-px bg-border my-4" />
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Recebimentos</h4>
                        <span className="text-[11px] text-text-secondary">Edite valor, forma e data quando precisar</span>
                      </div>
                      <div className="space-y-1.5">
                        {detalheOrc.pagamentos.map(pg => {
                          const Icon = FORMA_ICON[pg.forma_pagamento ?? 'outro'] ?? CircleDollarSign;
                          const isPago = pg.status === 'pago';
                          const isVencido = !isPago && !!pg.data_vencimento && pg.data_vencimento < hoje;
                          const parcelaLabel = pg.parcela_numero && pg.total_parcelas
                            ? `Parcela ${pg.parcela_numero}/${pg.total_parcelas}`
                            : null;

                          if (editingPagId === pg.id) {
                            return (
                              <div key={pg.id} className="rounded-xl border border-teal/30 bg-surface-alt p-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-text-secondary">Valor (R$)</Label>
                                    <Input
                                      type="text" inputMode="decimal" placeholder="0,00"
                                      value={editPagForm.valor}
                                      onChange={e => setEditPagForm(f => ({ ...f, valor: e.target.value }))}
                                      className="rounded-lg bg-surface border-border text-text-primary text-sm font-mono h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-text-secondary">Data</Label>
                                    <Input
                                      type="date" value={editPagForm.data}
                                      onChange={e => setEditPagForm(f => ({ ...f, data: e.target.value }))}
                                      className="rounded-lg bg-surface border-border text-text-primary text-sm h-8"
                                    />
                                  </div>
                                </div>
                                <Select
                                  value={editPagForm.formaPagamento}
                                  onValueChange={(v) => setEditPagForm(f => ({ ...f, formaPagamento: v as FormaPagamento }))}
                                >
                                  <SelectTrigger className="rounded-lg bg-surface border-border text-text-primary text-sm h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(FORMA_LABEL).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {editPagError && <p className="text-xs text-coral-ink">{editPagError}</p>}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm" variant="outline" onClick={onCancelarEdicaoPagamento} disabled={editPagSaving}
                                    className="flex-1 rounded-lg h-8 text-xs"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm" onClick={onSalvarEdicaoPagamento} disabled={editPagSaving}
                                    className="flex-1 rounded-lg h-8 text-xs bg-teal hover:bg-teal/90 text-white"
                                  >
                                    {editPagSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          if (confirmDeletePagId === pg.id) {
                            return (
                              <div key={pg.id} className="rounded-xl border border-coral/30 bg-coral/5 p-3 flex items-center justify-between gap-2">
                                <p className="text-xs text-text-primary">Excluir pagamento de R$ {fmt(pg.valor)}?</p>
                                <div className="flex gap-1.5 shrink-0">
                                  <Button
                                    size="sm" variant="outline" onClick={() => setConfirmDeletePagId(null)} disabled={pagDeleteSaving}
                                    className="rounded-lg h-7 text-xs px-2"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm" onClick={() => onExcluirPagamento(pg.id)} disabled={pagDeleteSaving}
                                    /* `text-white` sobre `bg-coral` reprova no escuro: coral vira
                                       #ef9a9a (rosa claro) e branco em cima dá ~1,9:1. Par
                                       coral-ink/coral-pale funciona nos dois temas. */
                                    className="rounded-lg h-7 text-xs px-2 bg-coral-pale border border-coral text-coral-ink hover:bg-coral/20"
                                  >
                                    {pagDeleteSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Excluir'}
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={pg.id}
                              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                                isPago
                                  ? 'border-teal/20 bg-teal/5'
                                  : isVencido
                                    ? 'border-coral/40 bg-coral-pale'
                                    : 'border-border bg-surface-alt/40'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isPago ? 'bg-teal/15 text-teal' : isVencido ? 'bg-coral/15 text-coral-ink' : 'bg-surface-alt text-text-secondary'
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-text-primary flex items-center gap-1.5 flex-wrap">
                                  {parcelaLabel && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal bg-teal/10 px-1.5 py-0.5 rounded-md shrink-0">
                                      {parcelaLabel}
                                    </span>
                                  )}
                                  {isPago ? (FORMA_LABEL[pg.forma_pagamento ?? 'outro'] ?? 'Pagamento') : 'A receber'}
                                </p>
                                <p className={`text-[11px] ${isVencido ? 'text-coral-ink font-semibold' : 'text-text-secondary'}`}>
                                  {isPago
                                    ? <>Pago em {pg.data_pagamento ? format(parseISO(pg.data_pagamento), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</>
                                    : pg.data_vencimento
                                      ? <>{isVencido ? 'Venceu' : 'Vence'} em {format(parseISO(pg.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</>
                                      : 'Pendente'
                                  }
                                  {/* R-27a: quem registrou aparece SEMPRE que o pagamento está pago,
                                      inclusive como "—". Hoje `marcado_por_id` está vazio em 83 de 83
                                      pagamentos — só `marcarPagamentoPago` grava. Esconder o campo
                                      faria a lacuna parecer inexistente; o R-28 conserta a escrita. */}
                                  {isPago && ` · registrado por ${pg.marcado_por?.nome.split(' ')[0] ?? '—'}`}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                {isPago ? (
                                  <p className="font-mono text-xs font-semibold text-teal">
                                    R$ {fmt(pg.valor)}
                                  </p>
                                ) : (
                                  // R-28 — clicar no valor pendente preenche o formulário abaixo já
                                  // vinculado a ESTA parcela (fecha por UPDATE, não cria linha nova).
                                  <button
                                    onClick={() => onIniciarFechamentoPagamento(pg)}
                                    className={`font-mono text-xs font-semibold underline decoration-dotted underline-offset-2 transition-colors ${isVencido ? 'text-coral-ink hover:text-coral' : 'text-text-secondary hover:text-teal-ink'}`}
                                  >
                                    R$ {fmt(pg.valor)}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {isPago ? (
                                  <button
                                    onClick={() => onIniciarEdicaoPagamento(pg)}
                                    className="p-1 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-text-primary transition-colors"
                                    aria-label="Editar pagamento"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onIniciarFechamentoPagamento(pg)}
                                    className="p-1 rounded-lg hover:bg-teal/10 text-text-secondary hover:text-teal-ink transition-colors"
                                    aria-label="Marcar como pago"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirmDeletePagId(pg.id)}
                                  className="p-1 rounded-lg hover:bg-coral/10 text-text-secondary hover:text-coral transition-colors"
                                  aria-label="Excluir pagamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* ── Formulário — sempre visível, nunca dentro de modal (R-34 §7.0) ── */}
                  {!orcEditMode && !quitado && (
                    <>
                      <div className="h-px bg-border my-4" />

                      {closingPagamentoId && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-teal/25 bg-teal/5 px-3 py-2.5 mb-3">
                          <p className="text-xs text-text-secondary">
                            Fechando parcela de{' '}
                            <span className="font-mono font-semibold text-teal-ink">R$ {pagForm.valor}</span>
                          </p>
                          <button
                            type="button"
                            onClick={onCancelarFechamentoPagamento}
                            className="text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors shrink-0"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-teal-ink">
                          {closingPagamentoId ? 'Marcar parcela como paga' : parcelasMode ? 'Dividir em parcelas' : 'Registrar pagamento'}
                        </p>
                        {!closingPagamentoId && (
                          <button
                            onClick={() => setParcelasMode(!parcelasMode)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-teal-ink transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            {parcelasMode ? 'Pagamento único' : 'Dividir em parcelas'}
                          </button>
                        )}
                      </div>

                      {parcelasMode && !closingPagamentoId ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-text-secondary">Nº de parcelas</Label>
                              <Input
                                type="number" min={2} max={24}
                                value={parcelasForm.numero}
                                onChange={e => setParcelasForm(f => ({ ...f, numero: e.target.value }))}
                                className="rounded-xl bg-surface border-border text-text-primary font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-text-secondary">1º vencimento</Label>
                              <Input
                                type="date" min={hoje}
                                value={parcelasForm.primeiroVencimento}
                                onChange={e => setParcelasForm(f => ({ ...f, primeiroVencimento: e.target.value }))}
                                className="rounded-xl bg-surface border-border text-text-primary"
                              />
                            </div>
                          </div>
                          {(() => {
                            const n = parseInt(parcelasForm.numero, 10);
                            if (!n || n < 2 || !restante) return null;
                            return (
                              <p className="text-[11px] text-text-secondary bg-surface rounded-xl px-3 py-2">
                                Saldo restante: R$ {fmt(restante)} — {n}x de R$ {fmt(restante / n)}, vencimentos no mesmo dia, mês a mês.
                              </p>
                            );
                          })()}
                          {parcelasError && (
                            <p className="text-xs text-coral-ink bg-coral-pale rounded-xl px-3 py-2">{parcelasError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-text-secondary">Valor (R$)</Label>
                            <Input
                              type="text" inputMode="decimal" placeholder="0,00"
                              value={pagForm.valor}
                              disabled={!!closingPagamentoId}
                              onChange={e => setPagForm(f => ({ ...f, valor: e.target.value }))}
                              onBlur={e => {
                                const parsed = parseValorBR(e.target.value);
                                setPagForm(f => ({ ...f, valor: parsed > 0 ? formatValorBR(parsed) : f.valor }));
                              }}
                              className="rounded-xl bg-surface border-border text-text-primary font-mono"
                            />
                          </div>
                          {!closingPagamentoId && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-text-secondary flex items-center gap-1.5">
                                Vencimento <span className="text-text-secondary/60 font-normal">(deixe vazio se já recebeu)</span>
                              </Label>
                              <Input
                                type="date" min={hoje}
                                value={pagForm.dataVencimento}
                                onChange={e => setPagForm(f => ({ ...f, dataVencimento: e.target.value }))}
                                className="rounded-xl bg-surface border-border text-text-primary"
                              />
                            </div>
                          )}
                          {!closingPagamentoId && pagForm.dataVencimento && pagForm.dataVencimento > hoje ? (
                            <div className="flex items-center gap-2 bg-warning-pale border border-warning/40 rounded-xl px-3 py-2.5">
                              <CalendarClock className="w-3.5 h-3.5 text-warning-ink shrink-0" />
                              <p className="text-xs text-warning-ink">
                                Vencimento futuro — será registrado como <strong>pendente</strong>.
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-text-secondary">Data do recebimento</Label>
                                <Input
                                  type="date" value={pagForm.data}
                                  onChange={e => setPagForm(f => ({ ...f, data: e.target.value }))}
                                  className="rounded-xl bg-surface border-border text-text-primary"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-text-secondary">Forma de pagamento</Label>
                                <Select
                                  value={pagForm.formaPagamento}
                                  onValueChange={v => v && setPagForm(f => ({ ...f, formaPagamento: v as FormaPagamento }))}
                                >
                                  <SelectTrigger className="rounded-xl bg-surface border-border text-text-primary">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-surface border-border">
                                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                                    <SelectItem value="boleto">Boleto</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                          {pagError && (
                            <p className="text-xs text-coral-ink bg-coral-pale rounded-xl px-3 py-2">{pagError}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ── Ação fixa no pé da coluna — nunca sai da tela, mesmo com muitas
                    parcelas (a lista acima rola; o botão não). ── */}
                {!orcEditMode && !quitado && (
                  <div className="shrink-0 border-t border-border p-4">
                    {parcelasMode && !closingPagamentoId ? (
                      <Button
                        onClick={onGerarParcelas}
                        disabled={parcelasSaving || !parcelasForm.primeiroVencimento}
                        className="w-full bg-teal text-white hover:bg-teal-lt rounded-xl disabled:opacity-50 font-semibold"
                      >
                        {parcelasSaving
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                          : 'Gerar Parcelas'
                        }
                      </Button>
                    ) : (
                      <Button
                        onClick={onRegistrarPagamento}
                        disabled={pagSaving || !pagForm.valor}
                        className="w-full bg-teal text-white hover:bg-teal-lt rounded-xl disabled:opacity-50 font-semibold"
                      >
                        {pagSaving
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                          : closingPagamentoId
                            ? 'Marcar como Pago'
                            : (pagForm.dataVencimento && pagForm.dataVencimento > hoje) ? 'Agendar Parcela' : 'Confirmar Pagamento'
                        }
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Rodapé único (R-27a) — fora das colunas ─────────────────
                "Registrar pagamento" saiu daqui — a coluna do dinheiro já é
                permanente, não precisa de atalho pra abrir nada. */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-border">
              {orcEditMode ? (
                <>
                  {orcEditError && (
                    <p className="text-xs text-coral-ink bg-coral-pale rounded-xl px-3 py-2 w-full">{orcEditError}</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => { setOrcEditMode(false); setOrcEditError(null); }}
                    disabled={orcEditSaving}
                    className="rounded-xl border-border text-text-primary hover:bg-surface-alt"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={onSalvarEdicaoOrc}
                    disabled={orcEditSaving}
                    className="bg-teal text-white hover:bg-teal-lt rounded-xl font-bold ml-auto"
                  >
                    {orcEditSaving
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                      : 'Salvar alterações'
                    }
                  </Button>
                </>
              ) : (
                <>
                  {podeExcluir && (
                    <Button
                      variant="outline"
                      onClick={() => onDeleteClick(detalheOrcId)}
                      className="rounded-xl border-coral/40 text-coral-ink hover:bg-coral-pale"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Excluir
                    </Button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      onClick={onOpenEditOrc}
                      className="rounded-xl border-border text-text-primary hover:bg-surface-alt"
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Editar
                    </Button>
                    <div
                      className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary"
                      title="Mostrar o valor de cada procedimento no PDF"
                    >
                      <span>Valor por item</span>
                      <ToggleSwitch
                        checked={detalheOrc.mostrar_valor_por_item}
                        onCheckedChange={(checked) => onToggleMostrarValorPorItem(detalheOrc.id, checked)}
                      />
                    </div>
                    <div className="flex items-center gap-0.5 border border-border rounded-xl px-0.5">
                      <BotaoDownloadPDF orcamentoId={detalheOrc.id} />
                      <BotaoEnviarWhatsApp
                        orcamentoId={detalheOrc.id}
                        pacienteTelefone={pacienteTelefone}
                        pacienteNome={pacienteNome}
                        valorTotal={valorDevido}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="rounded-xl border-border text-text-primary hover:bg-surface-alt"
                    >
                      Fechar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>

      {detalheOrc && (
        <AceiteOrcamentoModal
          open={showAceiteModal}
          onOpenChange={setShowAceiteModal}
          orcamentoId={detalheOrc.id}
          // R-114 (I2) — o paciente assina o que ACEITOU, não a proposta inteira. Item não
          // aprovado não pode aparecer como algo que ele está confirmando pagar.
          itens={detalheOrc.itens.filter((i) => i.aprovado)}
          total={valorDevido}
          onAccepted={onAceiteRegistrado}
        />
      )}
    </Dialog>
  );
}

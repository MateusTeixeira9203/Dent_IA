'use client';

import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseValorBR, formatValorBR } from '@/lib/valor-br';
import { stripDenteDoNome } from '@/lib/arcadas';
import type { FichaParaOrc, ProcedimentoClinica, NovoOrcItem } from '../types';
import type { FormaPagamento } from '@/app/dashboard/orcamentos/actions';
import { ChipsResponsavel } from '@/components/fichas/chips-responsavel';
import type { FiltroResponsavel } from '@/lib/fichas/filtro-responsavel';

const FORMA_LABEL: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito', boleto: 'Boleto', outro: 'Outro',
};

export interface NovoOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaNovoOrc: 'selecionar' | 'itens';
  setEtapaNovoOrc: (v: 'selecionar' | 'itens') => void;
  fichasParaOrc: FichaParaOrc[];
  /** R-53 (§4.3) — responsáveis distintos no agregado atual, pros chips. */
  responsaveisOrc: { id: string; nome: string }[];
  meuDentistaId: string;
  filtroResponsavelOrc: FiltroResponsavel;
  onFiltroResponsavelOrcChange: (v: FiltroResponsavel) => void;
  orcError: string | null;
  novoOrcItens: NovoOrcItem[];
  setNovoOrcItens: React.Dispatch<React.SetStateAction<NovoOrcItem[]>>;
  procedimentosClinica: ProcedimentoClinica[];
  novoOrcSubtotal: number;
  novoOrcTotal: number;
  novoOrcValorFinal: number | null;
  setNovoOrcValorFinal: React.Dispatch<React.SetStateAction<number | null>>;
  orcSaving: boolean;
  onCriarOrcamento: () => void;
  onSelecionarFicha: (fichaId: string | null) => void;
  onCadastrarProcedimento: (idx: number) => void;
  registeringProcIdx: number | null;
  isSecretaria: boolean;
  dentistasClinica: { id: string; nome: string }[];
  dentistaAlvoId: string;
  onDentistaAlvoChange: (id: string) => void;
  planoForma: 'avista' | 'parcelado' | null;
  setPlanoForma: (v: 'avista' | 'parcelado' | null) => void;
  planoNumParcelas: string;
  setPlanoNumParcelas: (v: string) => void;
  planoPrimeiroVencimento: string;
  setPlanoPrimeiroVencimento: (v: string) => void;
  planoParcelasForma: FormaPagamento | '';
  setPlanoParcelasForma: (v: FormaPagamento | '') => void;
}

export function NovoOrcamentoModal({
  open,
  onOpenChange,
  etapaNovoOrc,
  setEtapaNovoOrc,
  fichasParaOrc,
  responsaveisOrc,
  meuDentistaId,
  filtroResponsavelOrc,
  onFiltroResponsavelOrcChange,
  orcError,
  novoOrcItens,
  setNovoOrcItens,
  procedimentosClinica,
  novoOrcSubtotal,
  novoOrcTotal,
  novoOrcValorFinal,
  setNovoOrcValorFinal,
  orcSaving,
  onCriarOrcamento,
  onSelecionarFicha,
  onCadastrarProcedimento,
  registeringProcIdx,
  isSecretaria,
  dentistasClinica,
  dentistaAlvoId,
  onDentistaAlvoChange,
  planoForma,
  setPlanoForma,
  planoNumParcelas,
  setPlanoNumParcelas,
  planoPrimeiroVencimento,
  setPlanoPrimeiroVencimento,
  planoParcelasForma,
  setPlanoParcelasForma,
}: NovoOrcamentoModalProps) {
  const [valorFinalTexto, setValorFinalTexto] = useState(
    novoOrcValorFinal !== null ? formatValorBR(novoOrcValorFinal) : ''
  );
  const temDesconto = novoOrcValorFinal !== null && novoOrcSubtotal > 0 && novoOrcValorFinal < novoOrcSubtotal;
  const pctDesconto = temDesconto
    ? Math.round(((novoOrcSubtotal - novoOrcValorFinal!) / novoOrcSubtotal) * 100 * 10) / 10
    : 0;

  // R-39a — campo único: digitar e escolher da sugestão do catálogo (datalist nativo)
  // substitui o par Select + Input de antes. Mesmo dado, mesma capacidade — ver spec §3.
  function handleDescricaoChange(idx: number, valorDigitado: string) {
    const match = procedimentosClinica.find((p) => p.nome === valorDigitado);
    setNovoOrcItens((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (!match) return { ...it, descricao: valorDigitado, procedimentoId: '' };
        return {
          ...it,
          descricao: valorDigitado,
          procedimentoId: match.id,
          // Só pré-preenche se ainda não tem preço — não sobrescreve valor já digitado.
          preco: it.preco ? it.preco : (match.preco_padrao != null ? formatValorBR(match.preco_padrao) : it.preco),
        };
      })
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col rounded-3xl bg-surface border-border p-0 overflow-hidden gap-0 w-[94vw] sm:w-[82vw]"
        style={{ maxWidth: '1280px', maxHeight: '90vh', left: '50%' }}
        showCloseButton={false}
      >
        {/* ── Cabeçalho calmo (R-39a) — mesmo esqueleto do detalhe, sem gradiente ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <DialogTitle className="font-heading font-semibold text-xl text-text-primary leading-tight">
              {etapaNovoOrc === 'selecionar' ? 'Selecionar Ficha' : 'Novo Orçamento'}
            </DialogTitle>
            <DialogDescription className="text-text-muted text-xs truncate">
              {etapaNovoOrc === 'selecionar'
                ? 'Escolha qual registro clínico vai gerar o orçamento.'
                : 'Selecione procedimentos e defina os valores.'}
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Etapa 1: seleção de ficha (coluna única) ── */}
        {etapaNovoOrc === 'selecionar' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
            {fichasParaOrc.map((ficha) => {
              const denteCount = (ficha.dentes_afetados ?? []).length;
              const dataFormatada = format(parseISO(ficha.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
              return (
                <button
                  key={ficha.id}
                  onClick={() => onSelecionarFicha(ficha.id)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-surface-alt hover:border-teal/40 hover:bg-teal/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-text-primary group-hover:text-teal transition-colors truncate">
                        {ficha.queixa_principal ?? 'Evolução clínica'}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">{dataFormatada}</div>
                    </div>
                    {denteCount > 0 && (
                      <span className="shrink-0 text-[10px] font-bold font-mono bg-teal/10 text-teal px-2 py-1 rounded-lg">
                        {denteCount} dente{denteCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => onSelecionarFicha(null)}
              className="w-full py-3 border border-dashed border-border rounded-xl text-sm text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar orçamento em branco
            </button>
          </div>
        )}

        {/* ── Etapa 2: procedimentos à esquerda, dinheiro à direita (R-39a) ── */}
        {etapaNovoOrc === 'itens' && (
          <div className="flex-1 min-h-0 flex flex-col-reverse sm:flex-row">

            {/* Coluna clínica — procedimentos */}
            <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
              {/* R-53 (§4.3) — mesma faixa de chips da ficha (R-16). 07/08: default virou
                  "Meus" (revoga o "dinheiro é da clínica" original) — cada dentista só vê o
                  próprio por padrão, "Todos" fica disponível pra quem escolher ver junto.
                  Some sozinha com <2 responsáveis (ChipsResponsavel). */}
              <ChipsResponsavel
                responsaveis={responsaveisOrc}
                meuId={meuDentistaId}
                filtro={filtroResponsavelOrc}
                onFiltroChange={onFiltroResponsavelOrcChange}
              />

              {isSecretaria && (
                <div className="space-y-1">
                  <Label className="text-xs text-text-secondary">Dentista responsável *</Label>
                  <Select value={dentistaAlvoId} onValueChange={(v) => v && onDentistaAlvoChange(v)}>
                    <SelectTrigger className="rounded-xl bg-surface border-border text-text-primary">
                      <SelectValue placeholder="Selecione o dentista..." />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      {dentistasClinica.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <datalist id="catalogo-procedimentos">
                {procedimentosClinica.map((p) => <option key={p.id} value={p.nome} />)}
              </datalist>

              <div className="rounded-2xl border border-border overflow-hidden">
                {novoOrcItens.map((item, idx) => (
                  <div key={idx}>
                    <div className={`grid grid-cols-[24px_1fr_64px_112px_28px] items-center gap-2 px-3 py-2.5 ${idx > 0 ? 'border-t border-border/60' : ''}`}>
                      <span className="w-6 h-6 rounded-lg bg-teal/10 text-teal text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        list="catalogo-procedimentos"
                        placeholder="Nome do procedimento *"
                        value={item.descricao}
                        onChange={(e) => handleDescricaoChange(idx, e.target.value)}
                        className="rounded-lg bg-surface-alt border-border text-text-primary text-sm h-9"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => setNovoOrcItens((prev) => prev.map((it, i) => i === idx ? { ...it, quantidade: parseInt(e.target.value) || 1 } : it))}
                        className="rounded-lg bg-surface-alt border-border text-text-primary text-sm font-mono h-9 text-center"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={item.preco}
                        onChange={(e) => setNovoOrcItens((prev) => prev.map((it, i) => i === idx ? { ...it, preco: e.target.value } : it))}
                        onBlur={(e) => {
                          const parsed = parseValorBR(e.target.value);
                          setNovoOrcItens((prev) => prev.map((it, i) => i === idx ? { ...it, preco: parsed > 0 ? formatValorBR(parsed) : it.preco } : it));
                        }}
                        className="rounded-lg bg-surface-alt border-border text-text-primary text-sm font-mono h-9"
                      />
                      {novoOrcItens.length > 1 ? (
                        <button
                          onClick={() => setNovoOrcItens((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg hover:bg-coral-pale text-coral-ink transition-colors"
                          aria-label="Remover procedimento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : <span />}
                    </div>

                    {!item.procedimentoId && item.descricao.trim() && (
                      <div className="mx-3 mb-2.5 flex items-center justify-between gap-2 rounded-lg bg-warning-pale border border-warning/30 px-2.5 py-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-warning-ink">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Fora do catálogo
                        </span>
                        <button
                          onClick={() => onCadastrarProcedimento(idx)}
                          disabled={registeringProcIdx === idx}
                          className="text-[11px] font-bold text-warning-ink hover:underline disabled:opacity-50 shrink-0"
                        >
                          {registeringProcIdx === idx
                            ? 'Cadastrando...'
                            : `Cadastrar "${stripDenteDoNome(item.descricao)}"${parseValorBR(item.preco) > 0 ? ` a R$ ${formatValorBR(parseValorBR(item.preco))}` : ''}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setNovoOrcItens((prev) => [...prev, { procedimentoId: '', descricao: '', quantidade: 1, preco: '' }])}
                className="w-full py-3 border border-dashed border-border rounded-xl text-sm text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Procedimento
              </button>
            </div>

            {/* Coluna do dinheiro — resumo, valor negociado, forma de pagamento (R-39a) */}
            <div className="w-full sm:w-[416px] sm:shrink-0 border-t sm:border-t-0 sm:border-l border-border flex flex-col min-h-0 bg-teal/[0.04]">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-teal-ink">Resumo</p>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    Total dos procedimentos
                  </p>
                  <p className="font-mono text-lg font-semibold text-text-primary">
                    R$ {novoOrcSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    Valor final negociado (R$)
                  </Label>
                  <Input
                    type="text" inputMode="decimal"
                    placeholder={novoOrcSubtotal.toFixed(2)}
                    value={valorFinalTexto}
                    onChange={(e) => setValorFinalTexto(e.target.value)}
                    onBlur={(e) => {
                      const parsed = parseValorBR(e.target.value);
                      setNovoOrcValorFinal(parsed > 0 ? parsed : null);
                      setValorFinalTexto(parsed > 0 ? formatValorBR(parsed) : '');
                    }}
                    className="rounded-xl bg-surface border-border text-text-primary font-mono"
                  />
                  {temDesconto && (
                    <p className="text-[11px] font-semibold text-teal-ink">
                      Desconto de {pctDesconto}% aplicado
                    </p>
                  )}
                  {novoOrcValorFinal !== null && novoOrcValorFinal > novoOrcSubtotal && (
                    <p className="text-[11px] text-warning-ink">
                      Valor maior que o total
                    </p>
                  )}
                </div>

                <div className="rounded-2xl p-4 space-y-2 border border-teal/15 bg-teal/[0.07]">
                  {temDesconto && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-text-secondary font-mono">Subtotal</p>
                        <p className="text-xs font-mono text-text-secondary line-through">
                          R$ {novoOrcSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-text-secondary font-mono">Desconto ({pctDesconto}%)</p>
                        <p className="text-xs font-mono font-semibold text-coral-ink">
                          − R$ {(novoOrcSubtotal - novoOrcTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="h-px bg-teal/20" />
                    </>
                  )}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-ink/70">Total</p>
                  <p className="font-mono text-3xl font-bold text-teal-ink leading-none">
                    R$ {novoOrcTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-text-secondary font-mono">
                    {novoOrcItens.filter(i => i.descricao.trim()).length} item(s)
                  </p>
                </div>

                {/* R-34 — forma de pagamento, opcional, direto na criação. Sem escolher
                    nada aqui, o orçamento nasce exatamente como hoje (sem plano). */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    Forma de pagamento <span className="normal-case font-normal text-text-muted">(opcional)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPlanoForma(planoForma === 'avista' ? null : 'avista')}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        planoForma === 'avista'
                          ? 'bg-teal/10 border-teal/40 text-teal-ink'
                          : 'border-border text-text-secondary hover:border-teal/30 hover:text-teal-ink'
                      }`}
                    >
                      À vista
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanoForma(planoForma === 'parcelado' ? null : 'parcelado')}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        planoForma === 'parcelado'
                          ? 'bg-teal/10 border-teal/40 text-teal-ink'
                          : 'border-border text-text-secondary hover:border-teal/30 hover:text-teal-ink'
                      }`}
                    >
                      Parcelado
                    </button>
                  </div>

                  {planoForma === 'parcelado' && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-text-secondary">Nº de parcelas</Label>
                          <Input
                            type="number" min={2} max={24}
                            value={planoNumParcelas}
                            onChange={(e) => setPlanoNumParcelas(e.target.value)}
                            className="rounded-xl bg-surface border-border text-text-primary font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-text-secondary">1º vencimento</Label>
                          <Input
                            type="date"
                            value={planoPrimeiroVencimento}
                            onChange={(e) => setPlanoPrimeiroVencimento(e.target.value)}
                            className="rounded-xl bg-surface border-border text-text-primary"
                          />
                        </div>
                      </div>
                      <Select
                        value={planoParcelasForma || undefined}
                        onValueChange={(v) => v && setPlanoParcelasForma(v as FormaPagamento)}
                      >
                        <SelectTrigger className="rounded-xl bg-surface border-border text-text-primary">
                          <SelectValue placeholder="Forma das parcelas (opcional)..." />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {(Object.keys(FORMA_LABEL) as FormaPagamento[]).map((f) => (
                            <SelectItem key={f} value={f}>{FORMA_LABEL[f]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(() => {
                        const n = parseInt(planoNumParcelas, 10);
                        if (!n || n < 2 || novoOrcTotal <= 0) return null;
                        return (
                          <p className="text-[11px] text-text-secondary bg-surface rounded-xl px-3 py-2">
                            {n}x de R$ {formatValorBR(novoOrcTotal / n)}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Ação fixa no pé da coluna (R-39a) ── */}
              <div className="shrink-0 border-t border-border p-4 space-y-2">
                {orcError && (
                  <p className="text-xs text-coral-ink bg-coral-pale rounded-xl px-3 py-2">{orcError}</p>
                )}
                <Button
                  onClick={onCriarOrcamento}
                  disabled={orcSaving}
                  className="w-full bg-teal text-white hover:bg-teal-lt rounded-xl disabled:opacity-50 font-bold"
                >
                  {orcSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Criar Orçamento'}
                </Button>
                {fichasParaOrc.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setEtapaNovoOrc('selecionar')}
                    disabled={orcSaving}
                    className="w-full rounded-xl border-border text-text-primary hover:bg-surface-alt"
                  >
                    ← Voltar
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl border-border text-text-primary hover:bg-surface-alt"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

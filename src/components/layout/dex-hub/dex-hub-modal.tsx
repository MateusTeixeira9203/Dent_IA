'use client';

import { Bot, RefreshCw, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { DexEvento, DexHubData, DexNumero, DexPendencia } from '@/lib/dex/tipos';
import { ColunaPendencias } from './coluna-pendencias';
import { ColunaNumeros } from './coluna-numeros';
import { ColunaNovidades } from './coluna-novidades';

interface DexHubModalProps {
  nome: string;
  loading: boolean;
  error: boolean;
  pendencias: DexPendencia[];
  eventos: DexEvento[];
  agora: DexHubData['agora'];
  numeros: DexNumero[];
  onClose: () => void;
  onRecarregar: () => void;
  onMarcarLida: (id: string) => void;
  onNavigate: (href: string) => void;
}

function saudacaoPorHora(): string {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

function ColunaSkeleton() {
  return (
    <div className="space-y-2 px-6 pb-6 pt-5">
      <div className="h-3 w-24 animate-pulse rounded bg-surface-alt" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}

export function DexHubModal({
  nome, loading, error, pendencias, eventos, agora, numeros,
  onClose, onRecarregar, onMarcarLida, onNavigate,
}: DexHubModalProps) {
  const firstName = nome.split(' ')[0];
  const n = pendencias.length;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed left-1/2 top-1/2 z-[999] flex h-[90vh] w-[75vw] max-w-[1040px] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_28px_80px_-20px_rgba(0,0,0,0.32)]"
        initial={{ opacity: 0, x: '-50%', y: '-46%', scale: 0.96 }}
        animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
        exit={{ opacity: 0, x: '-50%', y: '-46%', scale: 0.97 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3.5 border-b border-border px-6 py-[1.15rem]">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal to-teal-dark shadow-[0_4px_16px_-4px_rgba(47,156,133,0.55)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-teal/35" />
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-heading text-[1.6rem] font-normal leading-[1.05] text-text-primary">Dex</h1>
            <p className="truncate text-xs text-text-secondary">
              {saudacaoPorHora()}, {firstName}
              {!loading && !error && ` — ${n} ${n === 1 ? 'coisa pede' : 'coisas pedem'} você hoje`}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onRecarregar}
              title="Atualizar"
              className="grid h-[34px] w-[34px] place-items-center rounded-xl text-text-secondary transition-colors hover:bg-surface-alt"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              className="grid h-[34px] w-[34px] place-items-center rounded-xl text-text-secondary transition-colors hover:bg-surface-alt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Faixa "agora" */}
        <div className="grid shrink-0 grid-cols-4 gap-px border-b border-border bg-border">
          <div className="bg-surface px-6 py-3.5">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-text-muted">Próximo</span>
            <div className="truncate text-sm font-semibold text-text-primary">{agora.proximo ?? '—'}</div>
          </div>
          <div className="bg-surface px-[1.1rem] py-3.5">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-text-muted">Consultas hoje</span>
            <div className="truncate font-mono text-sm font-medium text-text-primary">{agora.consultasHoje}</div>
          </div>
          <div className="bg-surface px-[1.1rem] py-3.5">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-text-muted">Entrou hoje</span>
            <div className="truncate font-mono text-sm font-medium text-text-primary">
              R$ {agora.entrouHoje.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="bg-surface px-[1.1rem] py-3.5">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-text-muted">Amanhã</span>
            <div className="truncate font-mono text-sm font-medium text-text-primary">{agora.amanha}</div>
          </div>
        </div>

        {/* Erro de rede — nunca cai pra número inventado (I1) */}
        {error && !loading && (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-coral-pale px-6 py-2.5 text-xs font-medium text-coral-ink">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Não foi possível atualizar agora.
            <button type="button" onClick={onRecarregar} className="ml-1 font-bold underline underline-offset-2">
              Tentar de novo
            </button>
          </div>
        )}

        {/* 3 colunas — cada uma rola de forma independente */}
        {loading ? (
          <div className="grid flex-1 grid-cols-[1.4fr_1fr_1fr] overflow-hidden">
            <ColunaSkeleton />
            <div className="border-l border-border"><ColunaSkeleton /></div>
            <div className="border-l border-border"><ColunaSkeleton /></div>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-[1.4fr_1fr_1fr] overflow-hidden">
            <div className="overflow-y-auto px-6 pb-6 pt-5">
              <ColunaPendencias
                pendencias={pendencias}
                eventos={eventos}
                onNavigate={onNavigate}
                onMarcarLida={onMarcarLida}
              />
            </div>
            <div className="overflow-y-auto border-l border-border px-6 pb-6 pt-5">
              <ColunaNumeros numeros={numeros} />
            </div>
            <div className="overflow-y-auto border-l border-border px-6 pb-6 pt-5">
              <ColunaNovidades />
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

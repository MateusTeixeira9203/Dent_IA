'use client';

// Barra de ação do MODO SELEÇÃO pra assinatura granular (R-03b) — clone de encaminhar-bar.tsx
// (mesmo padrão: 100% controlado, nenhum estado próprio). Sem seletor de destino (assinar não
// tem "pra quem") — só contador + selecionar tudo/limpar + confirmar, que abre o pad de
// assinatura pro lote escolhido (quem grava é o chamador, não esta barra).

import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, PenLine, CheckSquare, Square } from 'lucide-react';

export interface AssinarBarProps {
  totalSelecionado: number;
  /** Realizados-não-assinados da ficha aberta — base do "selecionar tudo / limpar". */
  totalAssinavel: number;
  /** Habilita só com totalSelecionado ≥ 1. */
  onConfirmar: () => void;
  onSelecionarTudo: () => void;
  onLimpar: () => void;
  onSair: () => void;
}

export function AssinarBar({
  totalSelecionado, totalAssinavel, onConfirmar, onSelecionarTudo, onLimpar, onSair,
}: AssinarBarProps) {
  const tudoMarcado = totalAssinavel > 0 && totalSelecionado >= totalAssinavel;
  const podeConfirmar = totalSelecionado >= 1;

  const conteudo = (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-x-0 bottom-[var(--dock-inset,0px)] z-[60] px-3 pb-3 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSair}
            aria-label="Sair do modo de assinar"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-alt outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-text-primary tabular-nums whitespace-nowrap">
            {totalSelecionado} selecionado{totalSelecionado === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={tudoMarcado ? onLimpar : onSelecionarTudo}
            className="inline-flex items-center gap-1 min-h-[40px] px-2 text-[11px] font-bold text-teal-ink hover:bg-teal-pale rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors"
          >
            {tudoMarcado ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            {tudoMarcado ? 'Limpar' : 'Selecionar tudo'}
          </button>
        </div>

        <div className="flex-1 min-w-0 sm:text-center">
          <span className="text-xs text-text-secondary">Escolha os registros que o paciente vai assinar agora.</span>
        </div>

        <button
          type="button"
          onClick={onConfirmar}
          disabled={!podeConfirmar}
          className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal-lt transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          <PenLine className="w-4 h-4" />
          Assinar{totalSelecionado > 0 ? ` ${totalSelecionado}` : ''}
        </button>
      </div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(conteudo, document.body) : null;
}

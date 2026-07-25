'use client';

// Barra de ação do MODO SELEÇÃO (R-04 Fase 3, variante B — design-shotgun 24/07).
// Vive fixa no rodapé enquanto o modo está ligado numa consulta. Um lote = N
// procedimentos elegíveis marcados NAQUELA consulta → 1 destinatário → 1 chamada
// batch. Escopo = consulta aberta (o accordion é de abertura única).

import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Forward, CheckSquare, Square } from 'lucide-react';

export interface EncaminharBarProps {
  totalSelecionado: number;
  /** Encamináveis da consulta aberta — base do "selecionar tudo / limpar". */
  totalEncaminhavel: number;
  destinosDisponiveis: { id: string; nome: string; especialidade?: string }[];
  /** Dentista escolhido (avatar). null = nenhum. */
  destino: string | null;
  onDestino: (id: string) => void;
  onSelecionarTudo: () => void;
  onLimpar: () => void;
  /** Habilita só com totalSelecionado ≥ 1 E destino ≠ null. */
  onConfirmar: () => void;
  onSair: () => void;
}

/** Iniciais pro avatar (2 letras), ignorando o título "Dr./Dra.". */
function iniciais(nome: string): string {
  const parts = nome.replace(/^(dra?)\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase() || '?';
}

export function EncaminharBar({
  totalSelecionado, totalEncaminhavel, destinosDisponiveis,
  destino, onDestino, onSelecionarTudo, onLimpar, onConfirmar, onSair,
}: EncaminharBarProps) {
  const tudoMarcado = totalEncaminhavel > 0 && totalSelecionado >= totalEncaminhavel;
  const podeConfirmar = totalSelecionado >= 1 && destino != null;
  const destinoNome = destinosDisponiveis.find((d) => d.id === destino)?.nome ?? null;

  const conteudo = (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      // Achado real na auditoria 24/07 (R-17): o dock de navegação flutuante
      // (floating-dock.tsx) fica fixo no centro-inferior (bottom-6, só desktop via
      // `hidden md:flex`) e a barra caía EM CIMA dele — não era só z-order, era POSIÇÃO
      // (os dois miram o mesmo lugar). Mobile: sem dock, barra no rodapé (bottom-0).
      // Desktop (md:): sobe pra `bottom-28` (112px), acima do topo do dock (~98px do
      // fundo), pra não colidir. z-[60] é reserva pra telas baixas onde ainda encostem.
      className="fixed inset-x-0 bottom-0 md:bottom-28 z-[60] px-3 pb-3 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Contador + selecionar tudo/limpar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSair}
            aria-label="Sair do modo de encaminhar"
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

        {/* Destino — avatares (só o avatar do D foi absorvido, decisão #5) */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:justify-center">
          {destinosDisponiveis.length === 0 ? (
            <span className="text-xs text-text-secondary italic">Nenhum outro dentista na clínica</span>
          ) : (
            <>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary shrink-0">Para</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {destinosDisponiveis.map((d) => {
                  const ativo = d.id === destino;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onDestino(d.id)}
                      title={d.especialidade ? `${d.nome} · ${d.especialidade}` : d.nome}
                      aria-pressed={ativo}
                      aria-label={`Encaminhar a ${d.nome}`}
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold border-2 outline-none focus-visible:ring-2 focus-visible:ring-teal transition-colors ${
                        ativo
                          ? 'bg-teal border-teal text-white'
                          : 'bg-surface-alt border-border text-text-secondary hover:border-teal hover:text-teal-ink'
                      }`}
                    >
                      {iniciais(d.nome)}
                    </button>
                  );
                })}
              </div>
              {destinoNome && (
                <span className="text-xs font-semibold text-text-primary truncate max-w-[120px] hidden md:inline">
                  {destinoNome}
                </span>
              )}
            </>
          )}
        </div>

        {/* Confirmar */}
        <button
          type="button"
          onClick={onConfirmar}
          disabled={!podeConfirmar}
          className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal-lt transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          <Forward className="w-4 h-4" />
          Encaminhar{totalSelecionado > 0 ? ` ${totalSelecionado}` : ''}
        </button>
      </div>
    </motion.div>
  );

  // Re-achado na auditoria 24/07 (medido, off-screen): `position:fixed` NÃO escapa de
  // ancestral com `transform`. O paciente-detail envolve o conteúdo num motion.div
  // (entrada y:16→0) que deixa um transform PERMANENTE — ele virava o bloco de contenção
  // da barra e a jogava pro fundo do ancestral (y≈846), fora da tela numa ficha alta. O
  // `md:bottom-28` só resolve com a barra presa à VIEWPORT. Portal pro body garante isso —
  // e imuniza contra qualquer ancestral transformado futuro (espírito do R-19).
  return typeof document !== 'undefined' ? createPortal(conteudo, document.body) : null;
}

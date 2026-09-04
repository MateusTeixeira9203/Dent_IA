'use client';

// R-78 F0 — substitui as duas barras de abas (esquerda Histórico|Hoje|Anexos, direita A
// fazer|Novos) por UMA faixa de gavetas, full-width, abaixo da linha lista+espelho. "Hoje"
// e "Novos" morreram de vez (fundidos em "Nesta ficha", F1); Histórico/A fazer/Anexos
// continuam os MESMOS blocos de sempre — só trocam de continente (era Tabs, vira gaveta) —
// por isso os corpos chegam prontos (`ReactNode`), a gaveta não sabe o que tem dentro.
//
// 1 aberta por vez (mesma regra das abas que ela substitui): abrir uma fecha a outra. Abre
// ABAIXO da faixa, nunca empurra a linha lista+espelho pra fora da viewport (confirmado no
// artefato — nota "as gavetas abrem embaixo sem empurrar o miolo").

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { History, Paperclip, ArrowRight, Stethoscope } from 'lucide-react';

export type GavetaId = 'historico' | 'anexos';

export interface FaixaGavetasProps {
  aberta: GavetaId | null;
  onAbertaChange: (gaveta: GavetaId | null) => void;
  planoHistoricoCount: number;
  pacienteId: string;
  historicoBody: ReactNode;
  anexosBody: ReactNode;
  /** R-123 — as mesmas gavetas entram como abas do painel clínico lateral. */
  contextual?: boolean;
  onOdontograma?: () => void;
}

export function FaixaGavetas({
  aberta, onAbertaChange, planoHistoricoCount, pacienteId,
  historicoBody, anexosBody,
  contextual = false, onOdontograma,
}: FaixaGavetasProps) {
  function toggle(gaveta: GavetaId) {
    onAbertaChange(aberta === gaveta ? null : gaveta);
  }

  const gavetas: { id: GavetaId; label: string; icon: typeof History; count?: number }[] = [
    { id: 'historico', label: 'Plano e histórico', icon: History, count: planoHistoricoCount },
    { id: 'anexos', label: 'Anexos', icon: Paperclip },
  ];

  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={
        contextual
          ? aberta
            ? 'flex h-full min-h-0 flex-col'
            : 'shrink-0'
          : 'rounded-2xl border border-border bg-surface'
      }
    >
      {/* R-111 — `flex-wrap`: os 3 botões + o "Ficha completa" somavam 396px numa faixa de
          342px no celular, e os 54px de sobra sumiam cortados. Rolagem aqui seria pior que
          quebrar linha, porque o "Ficha completa" nasceria fora da tela e ele é ação, não
          enfeite. No desktop nada muda: cabendo tudo numa linha, o espaçador continua
          empurrando o link pra direita. */}
      <div className={`flex shrink-0 flex-wrap items-center gap-1 ${contextual ? 'border-b border-border px-0 pb-2' : 'px-2 py-1.5'}`}>
        {contextual && (
          <button
            type="button"
            onClick={onOdontograma}
            aria-pressed={aberta === null}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              aberta === null
                ? 'bg-teal/10 text-teal-ink'
                : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Boca
          </button>
        )}
        {gavetas.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-expanded={aberta === id}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              aberta === id
                ? 'bg-teal/10 text-teal-ink'
                : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count != null && (
              <span className="rounded-full bg-surface-alt px-1.5 py-px font-mono text-[10px] text-text-secondary">
                {count}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        {!contextual && (
          <Link
            href={`/dashboard/pacientes/${pacienteId}`}
            className="ml-auto flex items-center gap-1 px-2 text-[11px] font-semibold text-text-secondary transition-colors hover:text-teal-ink"
          >
            Ficha completa <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* `layout` (não height manual) — o Motion anima a mudança de altura via transform
          (FLIP), que é composto na GPU; animar `height` em si força reflow do browser a
          cada frame e é a causa do "flick" (achado dele 08/08). Conteúdo só cruza opacity.
          `mode="wait"` — sem isto, trocar DIRETO de uma gaveta pra outra (sem fechar antes)
          roda saída e entrada ao mesmo tempo: o conteúdo antigo (esmaecendo) e o novo
          (surgindo) ficam sobrepostos por 1 frame, o que lia como o mesmo "flick". */}
      <AnimatePresence initial={false} mode="wait">
        {aberta && (
          <motion.div
            key={aberta}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={contextual ? 'min-h-0 flex-1 overflow-hidden' : undefined}
          >
            <div className={contextual ? 'h-full min-h-0 overflow-y-auto pb-1 pr-1 pt-3' : 'border-t border-border px-3 py-3'}>
              {aberta === 'historico' && historicoBody}
              {aberta === 'anexos' && anexosBody}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

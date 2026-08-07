'use client';

// R-46a — rail horizontal dos atendimentos do dia. Badge de status reusa a paleta e as
// classes literais já em produção (today-agenda.tsx / atendimentos-hoje.tsx); o ⚠ "sem
// registro" é sinal NOVO, camada extra sobre o status real do agendamento — G3 da spec:
// completed + sem ficha hoje, mesma régua do baseline medido em 31/07.
// R-46g — o card virou div (seleção e "iniciar consulta" são 2 controles distintos, não dá
// pra aninhar <a>/<button> dentro de <button>). Seleção troca o contexto embaixo; "iniciar
// consulta"/"continuar atendimento" só aparece no card selecionado e leva pro /consulta de
// sempre — nenhum caminho paralelo de atendimento (I3).
//
// C2 (contrato §5.2) — arrasta pro lado, sem barra visível (scrollbar-hide já existia, o
// scroll continua funcionando por teclado/wheel — só a barra some). Limiar de 5px: abaixo
// é clique, acima é arraste, e o clique correspondente é suprimido em fase de captura —
// sem isso, soltar o arraste em cima de um card troca de paciente sem querer.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { MeuDiaSlot } from '@/server/dashboard/get-meu-dia';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Aguardando',
  confirmed: 'Confirmado',
  checked_in: 'Na recepção',
  in_progress: 'Atendendo',
  completed: 'Concluído',
  no_show: 'Faltou',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-surface-alt text-text-secondary',
  confirmed: 'bg-teal/10 text-teal',
  checked_in: 'bg-teal/20 text-teal font-bold',
  in_progress: 'bg-teal text-white',
  completed: 'bg-surface-alt text-text-secondary',
  no_show: 'bg-coral/10 text-coral',
};

// Mesma condição de month-view.tsx:379 — I4 da spec: uma regra só de "pode atender" no
// projeto, não uma cópia divergente. Exportada pro R-46b2 (meu-dia-client.tsx) calcular o
// "próximo" com a MESMA régua que decide se o rail oferece "Iniciar consulta".
export function podeAtender(status: string): boolean {
  return !['cancelled', 'no_show', 'completed'].includes(status);
}

export interface RailProps {
  slots: MeuDiaSlot[];
  selecionadoId: string | null;
  onSelecionar: (agendamentoId: string) => void;
  /** R-57 F1 — paciente sem agendamento (chegou sem marcar, urgência). Abre o mesmo modal
   *  "Atender agora" que a Agenda usa. */
  onEncaixe: () => void;
}

const LIMIAR_ARRASTE_PX = 5;

/** R-57 F1 — fora do `<button>` do slot (nota do topo: não aninhar botão em botão). Mesmo
 *  recorte de tamanho do card de slot; borda tracejada marca "adicionar", não um card real. */
function BotaoEncaixe({ onEncaixe }: { onEncaixe: () => void }) {
  return (
    <button
      type="button"
      onClick={onEncaixe}
      className="flex min-w-[112px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-2.5 text-text-secondary transition-colors hover:border-teal/40 hover:text-teal [scroll-snap-align:start]"
    >
      <Plus className="h-4 w-4" />
      <span className="text-[10.5px] font-bold">Encaixe</span>
    </button>
  );
}

export function Rail({ slots, selecionadoId, onSelecionar, onEncaixe }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ x: number; scrollLeft: number; moveu: boolean } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [temMais, setTemMais] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checar = () => setTemMais(el.scrollWidth > el.clientWidth);
    checar();
    const ro = new ResizeObserver(checar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slots.length]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrollRef.current) return;
    arraste.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft, moveu: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!arraste.current || !scrollRef.current) return;
    const dx = e.clientX - arraste.current.x;
    if (!arraste.current.moveu) {
      if (Math.abs(dx) < LIMIAR_ARRASTE_PX) return;
      arraste.current.moveu = true;
      setArrastando(true);
    }
    scrollRef.current.scrollLeft = arraste.current.scrollLeft - dx;
  }

  function onPointerUp() {
    arraste.current = arraste.current ? { ...arraste.current } : null;
    setArrastando(false);
  }

  // Fase de captura: se o arraste passou do limiar, o clique que o pointerup dispara em
  // seguida é suprimido — senão soltar o arraste em cima de um card troca de paciente.
  function onClickCapture(e: React.MouseEvent) {
    if (arraste.current?.moveu) {
      e.preventDefault();
      e.stopPropagation();
      arraste.current = null;
    }
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-6">
        <p className="flex-1 text-sm font-medium text-text-secondary">Nenhum atendimento hoje.</p>
        <BotaoEncaixe onEncaixe={onEncaixe} />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className={`flex items-start gap-2 overflow-x-auto scrollbar-hide rounded-2xl border border-border bg-surface p-3 [scroll-snap-type:x_proximity] ${
          arrastando ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {slots.map((slot) => {
          const selecionado = slot.agendamentoId === selecionadoId;
          const semRegistro = slot.statusAgendamento === 'completed' && !slot.temFichaHoje;

          return (
            <div
              key={slot.agendamentoId}
              className={`min-w-[112px] shrink-0 overflow-hidden rounded-xl border transition-colors [scroll-snap-align:start] ${
                selecionado
                  ? 'border-teal bg-teal/[0.06]'
                  : semRegistro
                    ? 'border-coral/30 hover:border-coral/50'
                    : 'border-border hover:border-teal/40 hover:bg-surface-alt'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelecionar(slot.agendamentoId)}
                className="w-full px-3 py-2.5 text-left"
              >
                <span className="font-mono text-[10px] text-text-secondary">{slot.horario}</span>
                <p className="mt-0.5 truncate text-[12.5px] font-semibold text-text-primary">
                  {slot.pacienteNome}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      STATUS_COLOR[slot.statusAgendamento] ?? STATUS_COLOR.scheduled
                    }`}
                  >
                    {STATUS_LABEL[slot.statusAgendamento] ?? slot.statusAgendamento}
                  </span>
                </div>
                {slot.temFichaHoje && (
                  <p className="mt-1 text-[10px] font-semibold text-teal">✓ registrado</p>
                )}
                {semRegistro && (
                  <p className="mt-1 text-[10px] font-semibold text-coral">⚠ sem registro</p>
                )}
              </button>
              {selecionado && podeAtender(slot.statusAgendamento) && (
                <Link
                  href={`/consulta/${slot.agendamentoId}`}
                  className="block border-t border-teal/20 px-3 py-1.5 text-center text-[10.5px] font-bold text-teal transition-colors hover:bg-teal/10"
                >
                  {slot.statusAgendamento === 'in_progress' ? 'Continuar atendimento' : 'Iniciar consulta'}
                </Link>
              )}
            </div>
          );
        })}
        <BotaoEncaixe onEncaixe={onEncaixe} />
      </div>
      {temMais && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-3 right-3 w-8 rounded-r-2xl bg-gradient-to-l from-surface to-transparent"
        />
      )}
    </div>
  );
}

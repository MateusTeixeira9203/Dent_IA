'use client';

import {
  Bell, Building, CalendarPlus, CalendarX, CheckCircle2,
  CircleDollarSign, Clock, FileText, Forward, Info, Send, Stethoscope, UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DexEvento, DexPendencia } from '@/lib/dex/tipos';
import { PendenciaCard } from './pendencia-card';

const TIPO_ICON: Record<string, LucideIcon> = {
  checkin_paciente: UserCheck,
  consulta_finalizada: Stethoscope,
  agendamento_criado: CalendarPlus,
  agendamento_cancelado: CalendarX,
  pagamento_confirmado: CircleDollarSign,
  orcamento_enviado: FileText,
  follow_up: Clock,
  briefing: Send,
  sistema: Info,
  convite_clinica: Building,
  procedimento_encaminhado: Forward,
  encaminhamento_concluido: CheckCircle2,
};

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface ColunaPendenciasProps {
  pendencias: DexPendencia[];
  eventos: DexEvento[];
  onNavigate: (href: string) => void;
  onMarcarLida: (id: string) => void;
}

/** Coluna 1: "Precisa de você" (pendências que somem quando resolvem) + "Aconteceu"
 *  (notificações do banco — D6, a zona que assume o lugar do sino). */
export function ColunaPendencias({ pendencias, eventos, onNavigate, onMarcarLida }: ColunaPendenciasProps) {
  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-teal-ink">Precisa de você</span>
        {pendencias.length > 0 && (
          <span className="rounded-full bg-coral-pale px-[0.42rem] py-[0.1rem] font-mono text-[10px] font-medium text-coral-ink">
            {pendencias.length}
          </span>
        )}
        <span className="ml-auto text-[9.5px] text-text-muted">some quando resolve — é isto que conta no badge</span>
      </div>

      {pendencias.length === 0 ? (
        <p className="mb-7 text-xs text-text-muted">Tudo em dia por aqui.</p>
      ) : (
        <div className="mb-7 space-y-2">
          {pendencias.map((p) => (
            <PendenciaCard key={p.id} pendencia={p} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      <div className="mb-3.5 flex items-center gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-teal-ink">Aconteceu</span>
        <span className="ml-auto text-[9.5px] text-text-muted">toque pra marcar como lida</span>
      </div>

      {eventos.length === 0 ? (
        <p className="text-xs text-text-muted">Nenhuma novidade ainda.</p>
      ) : (
        <div className="space-y-1.5">
          {eventos.map((evento) => {
            const Icon = TIPO_ICON[evento.tipo] ?? Bell;
            return (
              <button
                key={evento.id}
                type="button"
                onClick={() => {
                  onMarcarLida(evento.id);
                  if (evento.href) onNavigate(evento.href);
                }}
                className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:border-teal/45"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-text-primary">{evento.titulo}</p>
                    <span className="shrink-0 font-mono text-[10px] text-text-muted">
                      {tempoRelativo(evento.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                    {evento.mensagem}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

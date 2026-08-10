'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  format, isToday as isDateToday, isSameDay, isBefore, isWithinInterval,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, CalendarIcon, User, UserCog,
  CalendarOff, CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { marcarPedidoEntregue } from '../actions';
import type { PedidoProteticoRow } from '../page';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function statusDoPedido(p: PedidoProteticoRow, hoje: Date): 'entregue' | 'atrasado' | 'pendente' {
  if (p.status === 'entregue') return 'entregue';
  return isBefore(new Date(`${p.data_entrega}T00:00:00`), hoje) ? 'atrasado' : 'pendente';
}

const STATUS_DOT: Record<'entregue' | 'atrasado' | 'pendente', string> = {
  entregue:  'bg-text-secondary/50',
  atrasado:  'bg-coral',
  pendente:  'bg-warning',
};

const STATUS_CHIP: Record<'entregue' | 'atrasado' | 'pendente', { bg: string; text: string; label: string }> = {
  entregue: { bg: 'bg-surface-alt',   text: 'text-text-secondary', label: 'Entregue' },
  atrasado: { bg: 'bg-coral-pale',    text: 'text-coral-ink',      label: 'Atrasado' },
  pendente: { bg: 'bg-warning-pale',  text: 'text-warning-ink',    label: 'Pendente' },
};

export function ProteticoClient({ pedidos }: { pedidos: PedidoProteticoRow[]; nomeProtetico: string }) {
  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [mesAtual, setMesAtual] = useState(() => startOfMonth(hoje));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesAtual]);

  const pedidosPorDia = useMemo(() => {
    const map = new Map<string, PedidoProteticoRow[]>();
    for (const p of pedidos) {
      const key = p.data_entrega;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [pedidos]);

  const pedidosDoDia = pedidosPorDia.get(format(diaSelecionado, 'yyyy-MM-dd')) ?? [];

  const semanaCount = useMemo(() => {
    const fimSemana = addDays(hoje, 7);
    return pedidos.filter((p) =>
      p.status === 'pendente' &&
      isWithinInterval(new Date(`${p.data_entrega}T00:00:00`), { start: hoje, end: fimSemana }),
    ).length;
  }, [pedidos, hoje]);

  const atrasadosCount = useMemo(
    () => pedidos.filter((p) => statusDoPedido(p, hoje) === 'atrasado').length,
    [pedidos, hoje],
  );

  function handleEntregar(pedidoId: string) {
    setSavingId(pedidoId);
    startTransition(async () => {
      const result = await marcarPedidoEntregue(pedidoId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Marcado como entregue!');
      }
      setSavingId(null);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
      {/* Calendário */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1">
        <div className="bg-surface rounded-3xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl text-text-primary font-semibold capitalize">
              {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setMesAtual((m) => subMonths(m, 1))}
                className="p-2 hover:bg-surface-alt rounded-lg transition-colors border border-border"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={() => setMesAtual((m) => addMonths(m, 1))}
                className="p-2 hover:bg-surface-alt rounded-lg transition-colors border border-border"
              >
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isSelected = isSameDay(day, diaSelecionado);
              const isCurrentMonth = day.getMonth() === mesAtual.getMonth();
              const doDia = pedidosPorDia.get(format(day, 'yyyy-MM-dd')) ?? [];
              const statusDoDia = doDia.map((p) => statusDoPedido(p, hoje));
              const piorStatus = statusDoDia.includes('atrasado')
                ? 'atrasado'
                : statusDoDia.includes('pendente')
                  ? 'pendente'
                  : statusDoDia.length > 0 ? 'entregue' : null;

              return (
                <div
                  key={i}
                  onClick={() => setDiaSelecionado(day)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative cursor-pointer transition-all
                    ${!isCurrentMonth ? 'text-text-secondary/40' : 'text-text-primary hover:bg-surface-alt'}
                    ${isDateToday(day) && !isSelected ? 'border-2 border-teal' : ''}
                    ${isSelected ? 'bg-teal text-white hover:bg-teal-lt font-bold shadow-md' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {piorStatus && (
                    <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : STATUS_DOT[piorStatus]}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-teal/10 rounded-3xl p-4 border border-teal/20">
            <div className="text-[10px] font-bold text-teal-ink uppercase tracking-wider mb-1">Esta semana</div>
            <div className="font-mono text-2xl font-medium text-teal-ink">{semanaCount}</div>
            <div className="text-xs text-teal-ink mt-1">A entregar</div>
          </div>
          <div className="bg-surface-alt rounded-3xl p-4 border border-border">
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Atrasados</div>
            <div className="font-mono text-2xl font-medium text-coral-ink">{atrasadosCount}</div>
            <div className="text-xs text-text-secondary mt-1">Passou da data</div>
          </div>
        </div>
      </motion.div>

      {/* Lista do dia selecionado */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
        <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-6 border-b border-border bg-surface-alt/40">
            <h2 className="font-heading font-semibold text-xl text-text-primary capitalize">
              {format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {pedidosDoDia.length} entrega{pedidosDoDia.length !== 1 ? 's' : ''} neste dia
            </p>
          </div>

          <div className="flex-1 p-6">
            <AnimatePresence mode="wait">
              {pedidosDoDia.length > 0 ? (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
                  {pedidosDoDia.map((p, i) => {
                    const status = statusDoPedido(p, hoje);
                    const chip = STATUS_CHIP[status];
                    return (
                      <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-surface shadow-sm ${STATUS_DOT[status]}`} />
                        <div className={`bg-surface border border-border rounded-2xl p-5 shadow-sm ${status === 'entregue' ? 'opacity-60' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="font-mono text-lg font-medium text-text-primary">
                                  {format(new Date(`${p.data_entrega}T00:00:00`), 'dd/MM')}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${chip.bg} ${chip.text}`}>
                                  {status === 'entregue' && <CheckCircle2 className="w-3 h-3" />}
                                  {status === 'atrasado' && <AlertTriangle className="w-3 h-3" />}
                                  {chip.label}
                                </span>
                              </div>
                              <h3 className="font-semibold text-lg text-text-primary flex items-center gap-2">
                                <User className="w-4 h-4 text-text-secondary shrink-0" />
                                {p.paciente?.nome ?? 'Paciente removido'}
                              </h3>
                              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                                <UserCog className="w-3 h-3" />
                                Dr(a). {p.dentista?.nome ?? '—'}
                              </p>
                              <p className="text-sm text-text-secondary mt-2 bg-surface-alt/45 border-l-2 border-border rounded-r-lg px-3 py-2">
                                {p.observacao}
                              </p>
                            </div>
                            <div className="flex items-start shrink-0">
                              {status === 'entregue' ? (
                                <span className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-text-secondary bg-surface-alt rounded-lg flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" /> Entregue
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleEntregar(p.id)}
                                  disabled={pending && savingId === p.id}
                                  className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-gradient-to-r from-teal to-teal-lt rounded-lg transition-all flex items-center gap-1.5 shadow-[0_4px_12px_-4px_rgba(47,156,133,0.4)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                  {pending && savingId === p.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                                  Entregue
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-16 h-16 bg-surface-alt rounded-2xl border border-border flex items-center justify-center mb-4">
                    <CalendarOff className="w-7 h-7 text-text-secondary/50" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">
                    {pedidos.length === 0 ? 'Nenhum trabalho pendente' : 'Nada pra este dia'}
                  </h3>
                  <p className="text-sm text-text-secondary max-w-xs mx-auto mt-1">
                    {pedidos.length === 0
                      ? 'Quando um dentista enviar um serviço, ele aparece aqui com a data de entrega.'
                      : 'Escolha outro dia no calendário.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

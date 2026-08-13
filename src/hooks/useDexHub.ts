'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DexAlert } from '@/app/api/dex/alerts/route';
import type { DexContextData } from '@/app/api/dex/context/route';
import { derivarPendencias } from '@/lib/dex/pendencias';
import type { DexEvento, DexHubData, DexMesData, DexNumero, DexRetencaoData } from '@/lib/dex/tipos';

function construirAgora(ctx: DexContextData | null): DexHubData['agora'] {
  if (!ctx) return { proximo: null, consultasHoje: 0, entrouHoje: 0, amanha: 0 };
  return {
    proximo: ctx.proximoPaciente
      ? `${ctx.proximoHorario ? `${ctx.proximoHorario} · ` : ''}${ctx.proximoPaciente}`
      : null,
    consultasHoje: ctx.agendamentosHoje,
    entrouHoje: ctx.entrouHoje,
    amanha: ctx.agendamentosAmanha,
  };
}

/** R-103c — coluna "O mês" (D10 do R-103a resolvido). 3 números, sem "recorrentes" (D2
 *  cortada) — só formatação pt-BR aqui, a regra de negócio mora em numeros-mes.ts. */
function construirNumerosMes(mes: DexMesData | null): DexNumero[] {
  if (!mes) return [];
  const { atendimentos, atendimentosMesAnterior, crescimentoPct, pacientesAtendidos, visitasPorPaciente } = mes;

  const crescimentoValor = crescimentoPct !== null
    ? `${crescimentoPct >= 0 ? '+' : ''}${crescimentoPct}%`
    : atendimentos > 0 ? 'novo' : '—';
  const crescimentoDetalhe = atendimentosMesAnterior > 0
    ? `${atendimentos} vs ${atendimentosMesAnterior} no mês passado`
    : 'sem atendimentos no mês passado';

  return [
    { label: 'Atendimentos', valor: String(atendimentos), detalhe: null },
    {
      label: 'Visitas por paciente',
      valor: pacientesAtendidos > 0 ? visitasPorPaciente.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—',
      detalhe: null,
    },
    { label: 'Crescimento', valor: crescimentoValor, detalhe: crescimentoDetalhe },
  ];
}

/**
 * Promise.all nas 2 rotas que já existem, realtime de `notificacoes`, marcar lida e o
 * badge do dock. Único hook que o hub e a bola do dock precisam.
 */
export function useDexHub() {
  const [alerts, setAlerts] = useState<DexAlert[]>([]);
  const [ctx, setCtx] = useState<DexContextData | null>(null);
  const [retencao, setRetencao] = useState<DexRetencaoData | null>(null);
  const [mes, setMes] = useState<DexMesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [alertsRes, ctxRes, retencaoRes, mesRes] = await Promise.all([
        fetch('/api/dex/alerts'),
        fetch('/api/dex/context'),
        fetch('/api/dex/retencao'),
        fetch('/api/dex/mes'),
      ]);
      if (!alertsRes.ok || !ctxRes.ok || !retencaoRes.ok || !mesRes.ok) throw new Error('fetch falhou');
      const alertsData = (await alertsRes.json()) as { alerts: DexAlert[] };
      const ctxData = (await ctxRes.json()) as DexContextData;
      const retencaoData = (await retencaoRes.json()) as DexRetencaoData;
      const mesData = (await mesRes.json()) as DexMesData;
      setAlerts(alertsData.alerts ?? []);
      setCtx(ctxData);
      setRetencao(retencaoData);
      setMes(mesData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Realtime — sobrevive à morte do sino (G9): INSERT em notificacoes reacende a zona
  // Aconteceu sem recarregar a página.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        () => { void carregar(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [carregar]);

  const marcarLida = useCallback((id: string) => {
    if (!id.startsWith('notif_')) return;
    // Otimista: o clique já é o gesto que conta (D7/I2) — sai da lista na hora.
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    fetch('/api/dex/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then((res) => { if (!res.ok) void carregar(); }) // erro honesto (I6) -> resincroniza
      .catch(() => void carregar());
  }, [carregar]);

  const pendencias = ctx ? derivarPendencias(alerts, ctx, retencao) : [];
  const eventos: DexEvento[] = alerts
    .filter((a) => a.isNotif)
    .map((a) => ({
      id: a.id,
      tipo: (a.tipoBD ?? 'sistema') as DexEvento['tipo'],
      titulo: a.title,
      mensagem: a.description,
      href: a.href ?? null,
      createdAt: a.createdAt ?? new Date(0).toISOString(),
    }));
  const badge = pendencias.length + eventos.length;

  // Bola do dock ouve este evento (mesmo padrão de dex-toggle) — sem provider novo, sem 2º fetch.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dex-badge', { detail: { count: badge } }));
  }, [badge]);

  return {
    loading,
    error,
    pendencias,
    eventos,
    agora: construirAgora(ctx),
    numeros: construirNumerosMes(mes),
    badge,
    recarregar: carregar,
    marcarLida,
  };
}

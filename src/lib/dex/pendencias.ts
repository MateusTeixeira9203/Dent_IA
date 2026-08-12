import type { DexAlert } from '@/app/api/dex/alerts/route';
import type { DexContextData } from '@/app/api/dex/context/route';
import type { DexPendencia, DexSeveridade } from './tipos';

const SEVERIDADE_POR_TIPO: Record<DexAlert['type'], DexSeveridade> = {
  danger: 'alta',
  warning: 'media',
  info: 'baixa',
};

const CTA_POR_ID: Record<string, string> = {
  computed_perfil_incompleto: 'Completar perfil',
  computed_agendamentos: 'Abrir a agenda',
  computed_rascunhos: 'Ver rascunhos',
};

const ORDEM_SEVERIDADE: Record<DexSeveridade, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * (DexAlert[], DexContextData) -> DexPendencia[] ordenada por severidade. Função pura,
 * sem fetch, sem React — ponto de extensão que o R-103b usa pra entrar com as 3
 * pendências novas (faltou, cancelou, parou de vir).
 */
export function derivarPendencias(alerts: DexAlert[], ctx: DexContextData): DexPendencia[] {
  const pendencias: DexPendencia[] = [];

  // Alertas computados (perfil incompleto, sem confirmação, rascunhos). 'computed_followup'
  // fica de fora: é o mesmo fato que ctx.followUpPendentes já cobre abaixo — mostrar os
  // dois seria a mesma pendência duas vezes.
  for (const alert of alerts) {
    if (alert.isNotif) continue;
    if (alert.id === 'computed_followup') continue;
    pendencias.push({
      id: alert.id,
      severidade: SEVERIDADE_POR_TIPO[alert.type],
      titulo: alert.title,
      descricao: alert.description,
      valorParado: null,
      chips: [],
      cta: { label: CTA_POR_ID[alert.id] ?? 'Ver', href: alert.href ?? '/dashboard' },
    });
  }

  // Orçamentos parados há +30 dias — o caso mais grave
  if (ctx.orcamentosAtrasados30d > 0) {
    const n = ctx.orcamentosAtrasados30d;
    const total = ctx.orcamentosAtrasados30dList.reduce((s, o) => s + o.total, 0);
    pendencias.push({
      id: 'orc_atrasados_30d',
      severidade: 'alta',
      titulo: `${n} orçamento${n > 1 ? 's' : ''} sem resposta há +30 dias`,
      descricao: 'Risco de perder o tratamento.',
      valorParado: total > 0 ? total : null,
      chips: ctx.orcamentosAtrasados30dList.slice(0, 4).map((o) => o.paciente),
      cta: { label: n > 1 ? 'Ver orçamentos' : 'Ver orçamento', href: '/dashboard/orcamentos' },
    });
  }

  // Orçamentos aguardando retorno há +3 dias
  if (ctx.followUpPendentes > 0) {
    const n = ctx.followUpPendentes;
    const total = ctx.followUpPendentesList.reduce((s, o) => s + o.total, 0);
    pendencias.push({
      id: 'orc_follow_up',
      severidade: 'media',
      titulo: `${n} orçamento${n > 1 ? 's' : ''} aguardando retorno`,
      descricao: 'Enviado há mais de 3 dias sem resposta.',
      valorParado: total > 0 ? total : null,
      chips: ctx.followUpPendentesList.slice(0, 4).map((o) => o.paciente),
      cta: { label: n > 1 ? 'Ver orçamentos' : 'Ver orçamento', href: '/dashboard/orcamentos' },
    });
  }

  return pendencias.sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]);
}

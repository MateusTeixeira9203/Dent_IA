import type { DexAlert } from '@/app/api/dex/alerts/route';
import type { DexContextData } from '@/app/api/dex/context/route';
import type { DexPendencia, DexRetencaoData, DexSeveridade } from './tipos';

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
 * (DexAlert[], DexContextData, DexRetencaoData) -> DexPendencia[] ordenada por severidade.
 * Função pura, sem fetch, sem React. `retencao` é o R-103b: 1 card por tipo (nunca por
 * paciente) — os buckets já vêm deduplicados entre si por `classificarRetencao` (A2/D7).
 */
export function derivarPendencias(
  alerts: DexAlert[],
  ctx: DexContextData,
  retencao: DexRetencaoData | null = null,
): DexPendencia[] {
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

  // R-103b — retenção: faltou > cancelou > parou (D5), 1 card por tipo, nunca por paciente.
  if (retencao) {
    const { faltouNaoVoltou, cancelouNaoRemarcou, parouDeVir } = retencao;

    if (faltouNaoVoltou.total > 0) {
      const n = faltouNaoVoltou.total;
      pendencias.push({
        id: 'retencao_faltou',
        severidade: 'alta',
        titulo: n === 1 ? '1 paciente faltou e não voltou' : `${n} pacientes faltaram e não voltaram`,
        descricao: 'Sem retorno agendado depois da falta.',
        valorParado: null,
        chips: faltouNaoVoltou.pacientes.slice(0, 4).map((p) => p.nome),
        cta: { label: 'Ver agenda', href: '/dashboard/agendamentos' },
        retencaoTipo: 'faltou_nao_voltou',
      });
    }

    if (cancelouNaoRemarcou.total > 0) {
      const n = cancelouNaoRemarcou.total;
      pendencias.push({
        id: 'retencao_cancelou',
        severidade: 'media',
        titulo: n === 1 ? '1 paciente cancelou e não remarcou' : `${n} pacientes cancelaram e não remarcaram`,
        descricao: 'Sem novo horário depois do cancelamento.',
        valorParado: null,
        chips: cancelouNaoRemarcou.pacientes.slice(0, 4).map((p) => p.nome),
        cta: { label: 'Ver agenda', href: '/dashboard/agendamentos' },
        retencaoTipo: 'cancelou_nao_remarcou',
      });
    }

    // Card existe pelo limiar de 60 (A4) — a sublinha de 30 é contexto, não gatilho.
    if (parouDeVir.total60 > 0) {
      const n60 = parouDeVir.total60;
      pendencias.push({
        id: 'retencao_parou',
        severidade: 'baixa',
        titulo: n60 === 1 ? '1 paciente parou de vir' : `${n60} pacientes pararam de vir`,
        descricao: `${n60} há +60 dias · ${parouDeVir.total30} há +30 dias`,
        valorParado: null,
        chips: parouDeVir.pacientes.slice(0, 4).map((p) => p.nome),
        cta: { label: 'Ver pacientes', href: '/dashboard/pacientes' },
        retencaoTipo: 'parou_de_vir',
      });
    }
  }

  // R-105b §4.1 — os marcos da semana 1. Severidade `baixa` sempre: não competem com
  // "orçamento parado há 30 dias", que é dinheiro escorrendo agora.
  //
  // A regra que os mantém honestos é a coluna "some quando" da spec: cada marco só existe
  // enquanto a condição vale, e some no instante em que o gesto acontece. Nada é persistido,
  // não há estado de "onboarding concluído" — quando os 4 caem, o Dex volta ao normal sozinho.
  //
  // Ordem é a do aprendizado, não a da configuração: o dentista só é cobrado a colocar preço
  // DEPOIS de ver um orçamento sair com o preço padrão, e a cadastrar horário DEPOIS de já
  // estar marcando coisa. Configuração como consequência do uso, nunca pré-requisito (I3).
  pendencias.push(...marcosDeOnboarding(ctx.onboarding));

  return pendencias.sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]);
}

function marcosDeOnboarding(onb: DexContextData['onboarding']): DexPendencia[] {
  // `null` = secretária ou protético. Nenhum dos 4 gestos é deles (G8).
  if (!onb) return [];
  const marcos: DexPendencia[] = [];
  const base = { severidade: 'baixa' as const, valorParado: null, chips: [] };

  // Marco 2 — o orçamento sai do que acabou de ser registrado.
  if (onb.fichas >= 1 && !onb.temOrcamento) {
    marcos.push({
      ...base,
      id: 'onb_orcamento',
      titulo: 'Sua ficha pode virar orçamento em um clique',
      descricao: 'O que você indicou já está registrado — o orçamento nasce dele, sem redigitar.',
      cta: { label: 'Abrir o Meu dia', href: '/dashboard/meu-dia' },
    });
  }

  // Marco 3 — os preços. Só DEPOIS que ele viu um orçamento sair com o preço padrão.
  if (onb.temOrcamento && onb.procedimentosPendente) {
    marcos.push({
      ...base,
      id: 'onb_precos',
      titulo: 'Seu orçamento está saindo com preço padrão',
      descricao: 'Colocar os seus leva 5 minutos e vale pra todos os próximos.',
      cta: { label: 'Ajustar preços', href: '/dashboard/configuracoes?aba=procedimentos' },
    });
  }

  // Marco 4 — o retorno. É o "investimento" do ciclo do Hooked: dado que o dentista põe hoje
  // e que faz o dia de amanhã nascer cheio em vez de vazio.
  if (onb.fichas >= 2 && !onb.temRetornoMarcado) {
    marcos.push({
      ...base,
      id: 'onb_retorno',
      titulo: 'Amanhã seu dia abre vazio',
      descricao: 'Marque o retorno antes do paciente sair — leva um clique no rodapé da ficha.',
      cta: { label: 'Abrir o Meu dia', href: '/dashboard/meu-dia' },
    });
  }

  // Marco 5 — o expediente. 11 de 14 dentistas em produção não têm grade (levantamento do
  // R-110), e é a causa de 13,8% dos agendamentos caírem fora do horário.
  if (!onb.temGradeHorario && onb.agendamentos >= 3) {
    marcos.push({
      ...base,
      id: 'onb_horario',
      titulo: 'Sua agenda aceita qualquer horário hoje',
      descricao: 'Sem expediente cadastrado, dá pra marcar 22h de domingo sem aviso nenhum.',
      cta: { label: 'Definir expediente', href: '/dashboard/configuracoes?aba=horarios' },
    });
  }

  return marcos;
}

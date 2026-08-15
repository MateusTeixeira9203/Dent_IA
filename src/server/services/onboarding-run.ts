// R-105b §4.2 e §4.3 — a varredura diária do onboarding.
//
// POR QUE ISTO EXISTE: `onboarding-emails.ts` tem 5 funções com template pronto e assunto
// escrito, e até 15/08 **só o D0 tinha chamador**. D1, D3 e D7 não eram chamados de lugar
// nenhum do projeto e não havia cron. Este arquivo é o chamador que faltava.
//
// ANTI-DUPLICATA SEM MIGRATION (§4.2): a janela é um dia EXATO (`idade === 1`, `=== 3`, …) e o
// cron roda 1×/dia, então cada e-mail cai exatamente uma vez sem precisar de tabela de log.
// Trade-off assumido por escrito na spec: se o cron falhar num dia, aquele e-mail se perde.
// E-mail perdido incomoda menos que e-mail duplicado, e evita uma coluna só pra registrar envio.
//
// IDADE EM DIAS DE CALENDÁRIO, não em múltiplos de 24h: quem se cadastrou 23h55 de ontem e quem
// se cadastrou 00h05 de hoje têm idades muito diferentes em horas e a mesma em dias. É a
// contagem que o dentista percebe ("me cadastrei ontem"), e é a única que casa com um cron
// diário — por horas, a janela escorregaria e o e-mail pularia um dia.

import { createServiceClient } from '@/lib/supabase/service';
import {
  enviarEmailD1,
  enviarEmailD3,
  enviarEmailD7,
  enviarEmailD14,
} from './onboarding-emails';

/** Fuso da clínica, não do servidor — a Vercel roda em UTC. Mesmo princípio de `hora-brt.ts`. */
const TZ = 'America/Sao_Paulo';

function diaBRT(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Diferença em dias de calendário (BRT) entre `desde` e hoje. */
function idadeEmDias(desde: string, hojeStr: string): number {
  const a = Date.parse(`${diaBRT(desde)}T00:00:00Z`);
  const b = Date.parse(`${hojeStr}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export interface OnboardingRunResultado {
  varridos: number;
  enviados: { d1: number; d3: number; d7: number; d14: number };
  trialsCorrigidos: number;
}

interface DentistaRow {
  id: string;
  nome: string;
  email: string | null;
  created_at: string;
  clinica_id: string;
}

export async function rodarOnboardingDiario(agora = new Date()): Promise<OnboardingRunResultado> {
  const service = createServiceClient();
  const hojeStr = diaBRT(agora);
  const resultado: OnboardingRunResultado = {
    varridos: 0,
    enviados: { d1: 0, d3: 0, d7: 0, d14: 0 },
    trialsCorrigidos: 0,
  };

  // ── §4.3 — a rede de segurança do trial ─────────────────────────────────────
  // Sustenta o I5 do R-105a ("nenhuma clínica com ≥1 ficha fica com trial_ends_at NULL por mais
  // de 24h") quando a chamada imediata do Meu dia falhou por rede. Roda ANTES dos e-mails: o D7
  // e o D14 leem `trial_ends_at`, então a correção precisa já ter acontecido.
  //
  // A JANELA DE 30 DIAS NÃO É FOLGA, É TRAVA. Sem ela, a primeira execução em produção daria
  // partida no relógio de **Clindent (136 fichas), Império (34) e Vip (6)** — três clínicas
  // reais que estão em trial perpétuo desde sempre. Elas bateriam no fim do trial em 14 dias,
  // e hoje **não existe checkout funcionando** (R-92 pausado): seriam dentistas de verdade
  // trancados fora de um sistema que usam todo dia, por causa de um cron de onboarding.
  //
  // A rede existe pra cobrir uma falha de rede de HORAS atrás, não pra migrar base antiga. O
  // que fazer com as clínicas legadas é decisão de cobrança, e o dono dela é o R-92.
  const trintaDiasAtras = new Date(agora);
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data: semRelogio } = await service
    .from('clinicas')
    .select('id')
    .is('trial_ends_at', null)
    .neq('status_assinatura', 'ativo')
    .gte('created_at', trintaDiasAtras.toISOString());

  for (const clinica of semRelogio ?? []) {
    const { count } = await service
      .from('fichas')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinica.id);
    if (!count) continue; // clínica sem ficha nenhuma ainda não começou — não é atraso

    const fim = new Date(agora);
    fim.setDate(fim.getDate() + 14);
    const { data: gravou } = await service
      .from('clinicas')
      .update({ status_assinatura: 'trial', trial_ends_at: fim.toISOString() })
      .eq('id', clinica.id)
      .is('trial_ends_at', null) // idempotência no WHERE, igual `activateTrial`
      .select('id');
    if (gravou?.length) {
      resultado.trialsCorrigidos += 1;
      console.log(`[onboarding-run] trial corrigido — clinica_id=${clinica.id}`);
    }
  }

  // ── §4.2 — a régua de e-mail ────────────────────────────────────────────────
  // Só dentistas que decidem (admin/dentista): secretária e protético não recebem régua de
  // ativação, porque nenhum dos gestos que ela cobra é deles (G8).
  const quinzeDiasAtras = new Date(agora);
  quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);

  const { data: dentistas, error } = await service
    .from('dentistas')
    .select('id, nome, email, created_at, clinica_id')
    .in('role', ['admin', 'dentista'])
    .eq('ativo', true)
    .gte('created_at', quinzeDiasAtras.toISOString());

  if (error) {
    console.error('[onboarding-run] falha ao varrer dentistas:', error.message);
    return resultado;
  }

  for (const d of (dentistas ?? []) as DentistaRow[]) {
    const idade = idadeEmDias(d.created_at, hojeStr);
    if (![1, 3, 7, 14].includes(idade)) continue;
    if (!d.email) {
      // Acontece de verdade: o cadastro aceita e-mail com typo (auto-confirm ligado, nada
      // bounça) e o perfil pode nascer sem e-mail. Não dá pra avisar quem não tem endereço.
      console.warn(`[onboarding-run] dentista ${d.id} sem e-mail — pulado (idade ${idade}d)`);
      continue;
    }
    resultado.varridos += 1;

    const { count: fichasCriadas } = await service
      .from('fichas')
      .select('id', { count: 'exact', head: true })
      .eq('dentista_id', d.id);
    const fichas = fichasCriadas ?? 0;
    const primeiroNome = d.nome.trim().split(/\s+/).filter((p) => !/^(dr|dra)\.?$/i.test(p))[0] ?? d.nome;

    if (idade === 1) {
      await enviarEmailD1({ email: d.email, nomeDentista: primeiroNome, fezPrimeiraConsulta: fichas > 0 });
      resultado.enviados.d1 += 1;
      continue;
    }

    if (idade === 3) {
      // Quem já tem 2+ fichas pegou o hábito — o D3 é sobre não ter voltado (spec §4.2).
      if (fichas >= 2) continue;
      await enviarEmailD3({ email: d.email, nomeDentista: primeiroNome });
      resultado.enviados.d3 += 1;
      continue;
    }

    // D7 e D14 falam de cobrança, então precisam do relógio da clínica.
    const { data: clinica } = await service
      .from('clinicas')
      .select('trial_ends_at, status_assinatura')
      .eq('id', d.clinica_id)
      .maybeSingle();

    // Quem já paga não recebe aviso de fim de teste.
    if (clinica?.status_assinatura === 'ativo') continue;

    if (idade === 7) {
      if (!clinica?.trial_ends_at) continue; // sem relógio não há data pra prometer
      await enviarEmailD7({
        email: d.email,
        nomeDentista: primeiroNome,
        fichasCriadas: fichas,
        dataExpiracao: new Date(clinica.trial_ends_at).toLocaleDateString('pt-BR', {
          timeZone: TZ, day: '2-digit', month: 'long',
        }),
      });
      resultado.enviados.d7 += 1;
      continue;
    }

    // idade === 14
    await enviarEmailD14({ email: d.email, nomeDentista: primeiroNome, fichasCriadas: fichas });
    resultado.enviados.d14 += 1;
  }

  return resultado;
}

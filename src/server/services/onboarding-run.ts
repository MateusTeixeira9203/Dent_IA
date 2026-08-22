import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import {
  enviarEmailConversao,
  enviarEmailD1,
  enviarEmailD3,
  enviarEmailTrialFinal,
  enviarEmailTrialReminder,
} from './onboarding-emails';

const TZ = 'America/Sao_Paulo';

function diaBRT(data: string | Date): string {
  return new Date(data).toLocaleDateString('en-CA', { timeZone: TZ });
}

function diferencaDias(desde: string | Date, ate: string | Date): number {
  const inicio = Date.parse(`${diaBRT(desde)}T00:00:00Z`);
  const fim = Date.parse(`${diaBRT(ate)}T00:00:00Z`);
  return Math.round((fim - inicio) / 86_400_000);
}

interface AssinaturaOnboardingRow {
  usuario_id: string;
  dentista_id: string;
  status: string;
  trial_ends_at: string | null;
  created_at: string;
}

interface DentistaEmailRow {
  id: string;
  nome: string;
  email: string | null;
  role: string;
  ativo: boolean;
}

export interface OnboardingRunResultado {
  varridos: number;
  enviados: number;
  pulados: number;
  falhas: number;
}

async function executarUmaVez(input: {
  usuarioId: string;
  marco: string;
  enviar: () => Promise<void>;
}): Promise<'enviado' | 'pulado' | 'falhou'> {
  const db = createServiceClient();
  const token = randomUUID();
  const { data: claim, error: claimError } = await db.rpc('claim_onboarding_comunicacao', {
    p_usuario_id: input.usuarioId,
    p_marco: input.marco,
    p_processing_token: token,
  });
  if (claimError || claim !== true) return 'pulado';

  try {
    await input.enviar();
    const { error } = await db.from('onboarding_comunicacoes').update({
      enviado_em: new Date().toISOString(),
      processing_token: null,
      processing_lease_until: null,
      last_error: null,
    }).eq('usuario_id', input.usuarioId).eq('marco', input.marco).eq('processing_token', token);
    if (error) throw error;
    return 'enviado';
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    await db.from('onboarding_comunicacoes').update({
      processing_token: null,
      processing_lease_until: null,
      last_error: mensagem.slice(0, 500),
    }).eq('usuario_id', input.usuarioId).eq('marco', input.marco).eq('processing_token', token);
    return 'falhou';
  }
}

export async function rodarOnboardingDiario(agora = new Date()): Promise<OnboardingRunResultado> {
  const db = createServiceClient();
  const resultado: OnboardingRunResultado = { varridos: 0, enviados: 0, pulados: 0, falhas: 0 };
  const noveDiasAtras = new Date(agora);
  noveDiasAtras.setDate(noveDiasAtras.getDate() - 9);

  // A régua lê somente a assinatura individual Stripe. Ela nunca inicia ou corrige
  // trial de clínica legada, nem inclui secretária/protético.
  const { data: assinaturas, error } = await db.from('assinaturas_dentista')
    .select('usuario_id, dentista_id, status, trial_ends_at, created_at')
    .in('status', ['trialing', 'active', 'past_due'])
    .gte('created_at', noveDiasAtras.toISOString());
  if (error) throw error;

  for (const assinatura of (assinaturas ?? []) as AssinaturaOnboardingRow[]) {
    const { data: dentista } = await db.from('dentistas')
      .select('id, nome, email, role, ativo')
      .eq('id', assinatura.dentista_id)
      .maybeSingle<DentistaEmailRow>();
    if (!dentista?.ativo || !['admin', 'dentista'].includes(dentista.role) || !dentista.email) continue;

    const idade = diferencaDias(assinatura.created_at, agora);
    const diasRestantes = assinatura.trial_ends_at
      ? diferencaDias(agora, assinatura.trial_ends_at)
      : null;
    const { count } = await db.from('fichas').select('id', { count: 'exact', head: true })
      .eq('dentista_id', dentista.id);
    const fichas = count ?? 0;
    const nome = dentista.nome.replace(/^(dr\.?|dra\.?)\s*/i, '').trim().split(/\s+/)[0] ?? dentista.nome;

    let marco: string | null = null;
    let enviar: (() => Promise<void>) | null = null;
    if (idade === 1) {
      marco = 'd1';
      enviar = () => enviarEmailD1({ email: dentista.email!, nomeDentista: nome, fezPrimeiraConsulta: fichas > 0 });
    } else if (idade === 3 && fichas < 3) {
      marco = 'd3';
      enviar = () => enviarEmailD3({ email: dentista.email!, nomeDentista: nome });
    } else if (diasRestantes === 2 && assinatura.status === 'trialing') {
      marco = 'd5';
      enviar = () => enviarEmailTrialReminder({
        email: dentista.email!, nomeDentista: nome, fichasCriadas: fichas,
        dataExpiracao: new Date(assinatura.trial_ends_at!).toLocaleDateString('pt-BR', { timeZone: TZ }),
      });
    } else if (diasRestantes === 1 && assinatura.status === 'trialing') {
      marco = 'd6';
      enviar = () => enviarEmailTrialFinal({ email: dentista.email!, nomeDentista: nome, fichasCriadas: fichas });
    } else if (idade >= 7 && assinatura.status === 'active') {
      marco = 'd7';
      enviar = () => enviarEmailConversao({ email: dentista.email!, nomeDentista: nome, fichasCriadas: fichas });
    }
    if (!marco || !enviar) continue;

    resultado.varridos += 1;
    const estado = await executarUmaVez({ usuarioId: assinatura.usuario_id, marco, enviar });
    resultado[estado === 'enviado' ? 'enviados' : estado === 'pulado' ? 'pulados' : 'falhas'] += 1;
  }
  return resultado;
}

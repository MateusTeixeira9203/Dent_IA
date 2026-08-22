import { createServiceClient } from '@/lib/supabase/service';
import type {
  AtualizarOnboardingResult,
  CaminhoPrimeiroAtendimento,
  EtapaOnboarding,
  MarcoOnboarding,
  ProgressoOnboarding,
} from '@/types/onboarding';

interface OnboardingRow {
  usuario_id: string;
  etapa: EtapaOnboarding;
  caminho: CaminhoPrimeiroAtendimento | null;
  iniciou_atendimento_em: string | null;
  usou_campo_magico_em: string | null;
  primeira_ficha_em: string | null;
  concluido_em: string | null;
  pulado_em: string | null;
}

const ORDEM_ETAPAS: Record<EtapaOnboarding, number> = {
  intro: 0,
  escolha_atendimento: 1,
  em_atendimento: 2,
  revisao: 3,
  concluido: 4,
  pulado: 4,
};

function paraProgresso(row: OnboardingRow): ProgressoOnboarding {
  return {
    etapa: row.etapa,
    caminho: row.caminho,
    primeiraFichaEm: row.primeira_ficha_em,
    podeRetomar: row.etapa !== 'concluido' && row.etapa !== 'pulado',
  };
}

export async function obterOuCriarProgressoOnboarding(
  usuarioId: string,
): Promise<ProgressoOnboarding | null> {
  const db = createServiceClient();
  const { data: existente, error: selectError } = await db
    .from('onboarding_usuarios')
    .select('*')
    .eq('usuario_id', usuarioId)
    .maybeSingle<OnboardingRow>();

  if (selectError) {
    console.error('[R-105] progresso indisponível:', selectError.message);
    return null;
  }
  if (existente) return paraProgresso(existente);

  const { data, error } = await db
    .from('onboarding_usuarios')
    .insert({ usuario_id: usuarioId, etapa: 'intro' })
    .select('*')
    .single<OnboardingRow>();
  if (error) {
    console.error('[R-105] não foi possível iniciar progresso:', error.message);
    return null;
  }
  return paraProgresso(data);
}

async function atualizarSemRegredir(input: {
  usuarioId: string;
  etapa: EtapaOnboarding;
  patch?: Record<string, string | null>;
}): Promise<AtualizarOnboardingResult> {
  const db = createServiceClient();
  const { data: atual, error: readError } = await db
    .from('onboarding_usuarios')
    .select('*')
    .eq('usuario_id', input.usuarioId)
    .maybeSingle<OnboardingRow>();
  if (readError) return { ok: false, error: 'Não foi possível carregar seu progresso.' };

  const base = atual ?? {
    usuario_id: input.usuarioId,
    etapa: 'intro' as const,
    caminho: null,
    iniciou_atendimento_em: null,
    usou_campo_magico_em: null,
    primeira_ficha_em: null,
    concluido_em: null,
    pulado_em: null,
  };
  if (base.etapa === 'concluido' || base.etapa === 'pulado') {
    return { ok: true, progresso: paraProgresso(base) };
  }

  const etapa = ORDEM_ETAPAS[input.etapa] >= ORDEM_ETAPAS[base.etapa]
    ? input.etapa
    : base.etapa;
  const agora = new Date().toISOString();
  const { data, error } = await db
    .from('onboarding_usuarios')
    .upsert({
      usuario_id: input.usuarioId,
      etapa,
      ...input.patch,
      updated_at: agora,
    }, { onConflict: 'usuario_id' })
    .select('*')
    .single<OnboardingRow>();
  if (error) return { ok: false, error: 'Não foi possível atualizar seu progresso.' };
  return { ok: true, progresso: paraProgresso(data) };
}

export function iniciarOnboardingPrimeiroValor(usuarioId: string): Promise<AtualizarOnboardingResult> {
  return atualizarSemRegredir({ usuarioId, etapa: 'escolha_atendimento' });
}

export function escolherCaminhoPrimeiroValor(
  usuarioId: string,
  caminho: CaminhoPrimeiroAtendimento,
): Promise<AtualizarOnboardingResult> {
  return atualizarSemRegredir({
    usuarioId,
    etapa: caminho === 'demonstracao' ? 'escolha_atendimento' : 'em_atendimento',
    patch: {
      caminho,
      ...(caminho === 'demonstracao' ? {} : { iniciou_atendimento_em: new Date().toISOString() }),
    },
  });
}

export function pularOnboardingPrimeiroValor(usuarioId: string): Promise<AtualizarOnboardingResult> {
  return atualizarSemRegredir({
    usuarioId,
    etapa: 'pulado',
    patch: { pulado_em: new Date().toISOString() },
  });
}

export function registrarMarcoPrimeiroValor(
  usuarioId: string,
  marco: MarcoOnboarding,
): Promise<AtualizarOnboardingResult> {
  const agora = new Date().toISOString();
  if (marco === 'atendimento') {
    return atualizarSemRegredir({
      usuarioId,
      etapa: 'em_atendimento',
      patch: { iniciou_atendimento_em: agora },
    });
  }
  if (marco === 'campo_magico') {
    return atualizarSemRegredir({
      usuarioId,
      etapa: 'revisao',
      patch: { usou_campo_magico_em: agora },
    });
  }
  return atualizarSemRegredir({
    usuarioId,
    etapa: 'concluido',
    patch: { primeira_ficha_em: agora, concluido_em: agora },
  });
}

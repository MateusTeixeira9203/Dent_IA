'use server';

import { createClient } from '@/lib/supabase/server';
import {
  escolherCaminhoPrimeiroValor,
  iniciarOnboardingPrimeiroValor,
  pularOnboardingPrimeiroValor,
  registrarMarcoPrimeiroValor,
} from '@/server/services/onboarding-primeiro-valor';
import type {
  AtualizarOnboardingResult,
  CaminhoPrimeiroAtendimento,
  MarcoOnboarding,
} from '@/types/onboarding';

async function usuarioAtualId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function iniciarOnboardingClinico(): Promise<AtualizarOnboardingResult> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, error: 'Sessão expirada.' };
  return iniciarOnboardingPrimeiroValor(usuarioId);
}

export async function escolherPrimeiroAtendimento(
  caminho: CaminhoPrimeiroAtendimento,
): Promise<AtualizarOnboardingResult> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, error: 'Sessão expirada.' };
  return escolherCaminhoPrimeiroValor(usuarioId, caminho);
}

export async function pularOnboardingClinico(): Promise<AtualizarOnboardingResult> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, error: 'Sessão expirada.' };
  return pularOnboardingPrimeiroValor(usuarioId);
}

export async function registrarMarcoOnboarding(
  marco: MarcoOnboarding,
): Promise<AtualizarOnboardingResult> {
  const usuarioId = await usuarioAtualId();
  if (!usuarioId) return { ok: false, error: 'Sessão expirada.' };
  return registrarMarcoPrimeiroValor(usuarioId, marco);
}

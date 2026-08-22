export type EtapaOnboarding =
  | 'intro'
  | 'escolha_atendimento'
  | 'em_atendimento'
  | 'revisao'
  | 'concluido'
  | 'pulado';

export type CaminhoPrimeiroAtendimento = 'existente' | 'novo' | 'demonstracao';

export interface ProgressoOnboarding {
  etapa: EtapaOnboarding;
  caminho: CaminhoPrimeiroAtendimento | null;
  primeiraFichaEm: string | null;
  podeRetomar: boolean;
}

export type MarcoOnboarding = 'atendimento' | 'campo_magico' | 'primeira_ficha';

export type AtualizarOnboardingResult =
  | { ok: true; progresso: ProgressoOnboarding }
  | { ok: false; error: string };

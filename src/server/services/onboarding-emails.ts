import { getResend } from '@/lib/email/resend';
import {
  onboardingD0Html,
  onboardingD1AtivoHtml,
  onboardingD1InativoHtml,
  onboardingD3Html,
  onboardingTrialReminderHtml,
  onboardingTrialFinalHtml,
  onboardingConversaoHtml,
} from '@/lib/email/templates/onboarding';

const FROM = process.env.EMAIL_FROM ?? 'Odonto.IA <equipe@odontoia.app>';

async function enviar(input: { to: string; subject: string; html: string }): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) throw new Error(error.message);
}

export async function enviarEmailD0({
  email,
  nomeDentista,
}: {
  email: string;
  nomeDentista: string;
}): Promise<void> {
  await enviar({ to: email, subject: 'Você vai economizar tempo em cada consulta. Veja como.', html: onboardingD0Html({ nomeDentista }) });
}

export async function enviarEmailD1({
  email,
  nomeDentista,
  fezPrimeiraConsulta,
}: {
  email: string;
  nomeDentista: string;
  fezPrimeiraConsulta: boolean;
}): Promise<void> {
  await enviar({
    to: email,
    subject: fezPrimeiraConsulta ? 'Sua primeira ficha está pronta. Repita amanhã.' : 'Retome sua primeira consulta assistida.',
    html: fezPrimeiraConsulta ? onboardingD1AtivoHtml({ nomeDentista }) : onboardingD1InativoHtml({ nomeDentista }),
  });
}

export async function enviarEmailD3({
  email,
  nomeDentista,
}: {
  email: string;
  nomeDentista: string;
}): Promise<void> {
  await enviar({ to: email, subject: 'Transforme a próxima consulta em uma ficha pronta.', html: onboardingD3Html({ nomeDentista }) });
}

export async function enviarEmailTrialReminder({
  email,
  nomeDentista,
  fichasCriadas,
  dataExpiracao,
}: {
  email: string;
  nomeDentista: string;
  fichasCriadas: number;
  dataExpiracao: string;
}): Promise<void> {
  await enviar({
    to: email,
    subject: `Você criou ${fichasCriadas} ficha${fichasCriadas !== 1 ? 's' : ''}. Seu teste termina em 2 dias.`,
    html: onboardingTrialReminderHtml({ nomeDentista, fichasCriadas, dataExpiracao }),
  });
}

export async function enviarEmailTrialFinal({
  email,
  nomeDentista,
  fichasCriadas,
}: {
  email: string;
  nomeDentista: string;
  fichasCriadas: number;
}): Promise<void> {
  await enviar({
    to: email,
    subject: 'Seu teste termina amanhã — confira sua assinatura.',
    html: onboardingTrialFinalHtml({ nomeDentista, fichasCriadas }),
  });
}

export async function enviarEmailConversao({
  email,
  nomeDentista,
  fichasCriadas,
}: {
  email: string;
  nomeDentista: string;
  fichasCriadas: number;
}): Promise<void> {
  await enviar({
    to: email,
    subject: 'Sua assinatura Odonto.IA está confirmada.',
    html: onboardingConversaoHtml({ nomeDentista, fichasCriadas }),
  });
}

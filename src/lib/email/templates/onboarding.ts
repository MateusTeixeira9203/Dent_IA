import { PLANOS } from '@/lib/planos';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dentia.app.br';

/**
 * R-105b (15/08) — os links destes e-mails estavam mortos e ninguém tinha notado, porque 3 dos
 * 5 nunca dispararam. O D0, que dispara desde sempre, apontava pra `/consulta-demo`: rota que o
 * R-72 apagou junto com o modo consulta. **Todo dentista cadastrado até hoje recebeu um 404.**
 * O D7 apontava pra `/configuracoes/plano`, que também não existe (a real tem `/dashboard` na
 * frente e a aba em query string).
 *
 * Agora o destino é sempre o Meu dia — que é onde o R-105a pôs a primeira fase guiada — exceto
 * o D7, que é sobre cobrança e vai pra aba de plano.
 */
const MEU_DIA = '/dashboard/meu-dia';
const ABA_PLANO = '/dashboard/configuracoes?aba=plano';

const header = `
  <tr>
    <td style="background-color:#2f9c85;padding:32px 40px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Odonto.IA</p>
      <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Sistema operacional inteligente para consultas</p>
    </td>
  </tr>`;

const footer = `
  <tr>
    <td style="padding:0 40px;">
      <hr style="border:none;border-top:1px solid #eeeeee;margin:0;" />
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 32px;">
      <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.6;">
        Você está recebendo este e-mail porque criou uma conta no Odonto.IA.
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#aaaaaa;">Equipe Odonto.IA</p>
    </td>
  </tr>`;

function wrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          ${header}
          ${content}
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background-color:#2f9c85;border-radius:8px;">
          <a href="${href}" target="_blank"
             style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ── D0 — Boas-vindas (imediato após cadastro) ─────────────────────────────────

export function onboardingD0Html({ nomeDentista }: { nomeDentista: string }): string {
  const link = `${BASE_URL}${MEU_DIA}`;
  return wrapper(`
    <tr>
      <td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0d0d0d;">Olá, ${nomeDentista}.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Sua conta está pronta e não precisa de configuração nenhuma antes de usar. Abra o Meu dia, toque em <strong style="color:#0d0d0d;">Atender agora</strong> e diga o nome de quem está na cadeira.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Depois é só falar ou colar o relato: o DEX estrutura a ficha sozinho, sem você digitar uma palavra.
        </p>
        ${ctaButton(link, '→ Registrar minha primeira consulta')}
      </td>
    </tr>`);
}

// ── D1A — Ativação confirmada (dentista fez a primeira consulta) ──────────────

export function onboardingD1AtivoHtml({ nomeDentista }: { nomeDentista: string }): string {
  const link = `${BASE_URL}${MEU_DIA}`;
  return wrapper(`
    <tr>
      <td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0d0d0d;">Boa, ${nomeDentista}.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Sua primeira ficha nasceu do que você falou. Repita na próxima consulta — e, quando ela tiver procedimento indicado, o orçamento sai dela em um clique, sem redigitar.
        </p>
        ${ctaButton(link, '→ Abrir o Meu dia')}
      </td>
    </tr>`);
}

// ── D1B — Não ativou ainda (dentista não fez nenhuma consulta) ────────────────

export function onboardingD1InativoHtml({ nomeDentista }: { nomeDentista: string }): string {
  const link = `${BASE_URL}${MEU_DIA}`;
  return wrapper(`
    <tr>
      <td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0d0d0d;">${nomeDentista}, isso leva 90 segundos.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Não precisa preparar nada. Abra o Meu dia, toque em <strong style="color:#0d0d0d;">Atender agora</strong>, digite um nome e fale.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          O DEX transcreve, organiza e monta a ficha enquanto você atende. Veja acontecer.
        </p>
        ${ctaButton(link, '→ Testar agora')}
      </td>
    </tr>`);
}

// ── D3 — Prova de resultado ───────────────────────────────────────────────────

export function onboardingD3Html({ nomeDentista }: { nomeDentista: string }): string {
  const link = `${BASE_URL}${MEU_DIA}`;
  return wrapper(`
    <tr>
      <td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0d0d0d;">${nomeDentista}, quanto tempo você perde documentando consultas?</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Cada ficha digitada manualmente leva tempo que poderia estar sendo usado no próximo paciente — ou no fim do seu dia.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          No campo mágico do Meu dia, o DEX faz isso enquanto você fala. A ficha aparece pronta quando você termina de atender.
        </p>
        ${ctaButton(link, '→ Abrir o Meu dia')}
      </td>
    </tr>`);
}

// ── D7 — Conversão (7 dias antes do fim do trial) ────────────────────────────

export function onboardingD7Html({
  nomeDentista,
  fichasCriadas,
  dataExpiracao,
}: {
  nomeDentista: string;
  fichasCriadas: number;
  dataExpiracao: string;
}): string {
  const link = `${BASE_URL}${ABA_PLANO}`;
  return wrapper(`
    <tr>
      <td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0d0d0d;">${nomeDentista}, você criou ${fichasCriadas} ficha${fichasCriadas !== 1 ? 's' : ''} com o DEX.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Essas fichas ficam com você para sempre — mas seu período de teste termina no dia <strong style="color:#0d0d0d;">${dataExpiracao}</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Continue usando sem interrupção.
        </p>
        ${ctaButton(link, `→ Continuar no plano Consultório — R$${PLANOS.SOLO.preco}/mês`)}
        <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
          PS: Precisa de mais tempo para avaliar? Responda este e-mail.
        </p>
      </td>
    </tr>`);
}

// ── D14 — Vespera da cobranca ────────────────────────────────────────────────
// R-105b §4.2 — o Playbook pede a regua ate D14 (PLG p.10) e este nao existia. Unico dos
// cinco que nao tenta convencer de nada: o dentista ja passou 14 dias usando, e o que ele
// precisa aqui e nao ser pego de surpresa.

export function onboardingD14Html({
  nomeDentista,
  fichasCriadas,
}: {
  nomeDentista: string;
  fichasCriadas: number;
}): string {
  const link = `${BASE_URL}${ABA_PLANO}`;
  const linha = fichasCriadas > 0
    ? `Nesses 14 dias você registrou <strong style="color:#0d0d0d;">${fichasCriadas} ficha${fichasCriadas !== 1 ? 's' : ''}</strong> falando, sem digitar.`
    : `Seu período de teste terminou sem nenhuma ficha registrada — e isso é informação nossa, não sua: significa que a gente não conseguiu te mostrar o valor a tempo.`;
  return wrapper(`
    <tr>
      <td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0d0d0d;">${nomeDentista}, seu teste termina amanhã.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">${linha}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
          Suas fichas e seu histórico continuam seus de qualquer forma. Se quiser seguir usando, é por aqui.
        </p>
        ${ctaButton(link, `→ Escolher meu plano`)}
        <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
          Se decidir não continuar, responda este e-mail contando por quê. Serve mais pra gente do que você imagina.
        </p>
      </td>
    </tr>`);
}

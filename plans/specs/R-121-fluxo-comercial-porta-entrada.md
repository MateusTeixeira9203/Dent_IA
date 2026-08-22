# R-121 — Fluxo comercial e porta de entrada

> **SPEC** · **R-121** · fase **aprovada — visual aprovado**
> **Aberto:** 2026-08-20 · **Fechado:** —
> **Migration:** zero · **Dependências:** R-92 apenas para ativar cobrança; R-116 para instalar o PWA

## 1. Problema

A porta pública promete e executa coisas diferentes:

- a landing ainda mistura 5/6 dentistas, 300 pacientes/consultas e trial de 14 dias;
- Stripe já cria assinatura com 7 dias, mas `activateTrial`, o cron, Planos, onboarding e e-mails
  ainda usam 14;
- “aviso 7 dias antes” é impossível num trial de 7 dias;
- cadastro e convite não preservam sempre o destino após confirmação de e-mail/OAuth;
- o callback aceita alguns convites sozinho, enquanto a página exige aceite explícito para outros;
- login, cadastro e convite parecem produtos diferentes, têm dark mode quebrado e podem nascer
  invisíveis sem hidratação por causa de `opacity: 0`;
- a landing afirma que não existe aplicativo, embora o PWA instalável seja o próximo item.

O resultado é perda de confiança antes do primeiro uso e, no convite, risco real de o dentista
ficar preso ou cair no onboarding errado.

## 2. Decisão

R-121 terá duas entregas na mesma spec:

1. **Oferta coerente:** 5 dentistas, mais de 400 atendimentos/mês e trial canônico de 7 dias em
   todos os pontos ativos. A landing ganha um espaço explícito para “Aplicativo instalável”, em
   estado **Em breve**, sem CTA que finja instalar antes do R-116.
2. **Entrada coerente:** login, cadastro, verificação de e-mail e convite compartilham linguagem
   visual e um único contrato de retorno. O callback autentica; a página do convite valida e
   conclui o aceite. Nenhum perfil é aceito implicitamente pelo callback.

Decisões derivadas:

- aviso comercial ocorre **2 dias antes do fim** e no último dia, nunca “7 dias antes”;
- R-121 não ativa Stripe nem bloqueia acesso por cobrança; isso continua no R-92;
- R-121 não implementa manifest, service worker ou prompt de instalação; isso continua no R-116;
- onboarding novo continua separado; convidado volta ao convite e não cria outra clínica;
- o design atual da landing é preservado. Login/convite recebem refinamento, não uma nova marca.

## 3. Objetivo

Uma pessoa deve conseguir sair da landing, criar ou acessar a conta, confirmar o e-mail e entrar
no destino correto sem perder contexto. Quem recebeu convite deve entender clínica, papel e
próximo passo antes de aceitar. Toda promessa pública deve corresponder ao comportamento real.

## 4. Contrato técnico

### 4.1 Fonte única do trial

Novo arquivo:

```ts
// src/lib/billing/trial.ts
export const TRIAL_DAYS = 7;
export const TRIAL_REMINDER_DAYS_BEFORE_END = 2;
```

Essas constantes substituem literais ativos em:

- `src/server/services/assinatura-dentista.ts` (`trial_period_days`);
- `src/app/planos/actions.ts` (`activateTrial`);
- `src/server/services/onboarding-run.ts` (rede de segurança e lembretes);
- `src/app/planos/_components/planos-client.tsx`;
- `src/app/onboarding/_components/onboarding-client.tsx`;
- `src/app/dashboard/meu-dia/_components/ativacao-card.tsx`;
- landing e navegação pública;
- assuntos/templates de onboarding que mencionem duração ou vencimento.

O cron mantém D1/D3 por idade da conta. Mensagens de cobrança deixam de depender de “D7/D14”
da criação e passam a consultar candidatos pela janela de `trial_ends_at`, sem o filtro atual de
“conta criada nos últimos 15 dias”:

```ts
type TrialReminderKind = 'termina_em_2_dias' | 'ultimo_dia';

function diasAteFimTrial(trialEndsAt: string, hoje: Date): number;
```

- `2` → aviso de encerramento em 2 dias;
- `0` → último dia do teste;
- assinatura ativa ou `trial_ends_at = null` → nenhum aviso comercial.

A janela de dia exato mantém a idempotência atual: cron perdido não é compensado e e-mail não é
duplicado. Os perfis elegíveis permanecem os mesmos; R-121 muda o relógio, não o dono da cobrança.

### 4.2 Retorno seguro da autenticação

Um único parâmetro público, `next`, transporta o destino. `redirectTo` permanece aceito apenas
como compatibilidade de links antigos.

```ts
// src/lib/auth/return-path.ts
export function safeReturnPath(
  value: string | null | undefined,
  fallback?: string,
): string;

export function authCallbackUrl(origin: string, next: string): string;
```

Regras de `safeReturnPath`:

- aceita somente caminho iniciado por `/`;
- rejeita `//`, protocolo, host externo e caracteres de controle;
- fallback padrão: `/dashboard`;
- preserva query string interna, inclusive `/convite/{token}`.

### 4.3 Login e cadastro

Rotas:

```txt
/login?next=/destino
/cadastro?next=/destino&email=email%40dominio.com
/verifique-email?email=...&next=/destino
/auth/callback?next=/destino
```

- senha e Google usam o mesmo `next` validado;
- signup por e-mail define `emailRedirectTo` para o callback com `next`;
- reenvio da confirmação usa o mesmo `emailRedirectTo`;
- sessão imediata segue para `next`; sem sessão vai para `verifique-email` preservando `next`;
- login sem `next`: perfil existente → destino atual por role; perfil inexistente → onboarding;
- login com `next=/convite/...`: nunca troca o destino por onboarding antes de voltar ao convite.

### 4.4 Convite

O callback deixa de criar membership, perfil clínico ou marcar convite como aceito. Essas ações
ficam exclusivamente em `aceitarConvite`, que já valida token, validade, e-mail e clínica.

```ts
interface ConvitePublico {
  clinicaNome: string;
  email: string;
  role: 'dentista' | 'secretaria' | 'protetico';
  convidadoPorNome: string | null;
  expiresAt: string;
  status: 'pendente' | 'aceito' | 'cancelado' | 'expirado';
}

type InviteViewState =
  | 'invalido'
  | 'expirado'
  | 'autenticar'
  | 'email_incompativel'
  | 'pronto_para_aceitar'
  | 'processando'
  | 'erro';
```

Comportamento:

- deslogado: pode entrar, criar conta ou usar Google sem perder `/convite/{token}`;
- e-mail do convite fica pré-preenchido e bloqueado no cadastro iniciado pelo convite;
- confirmação de e-mail/OAuth retorna ao mesmo convite;
- conta com e-mail diferente vê os dois endereços e ação **Trocar conta**;
- conta correta confirma explicitamente em **Aceitar convite**;
- sucesso segue o destino devolvido pela action: dashboard para equipe não pagante; fluxo do
  R-92 para dentista quando o billing estiver habilitado;
- erro de configuração Stripe nunca é apresentado como convite inválido. A tela preserva o
  contexto e permite tentar novamente; a correção da configuração pertence ao R-92.

### 4.5 Landing

Copy canônica:

| Hoje | R-121 |
|---|---|
| 6 dentistas | **5 dentistas** |
| +300 pacientes/consultas | **mais de 400 atendimentos por mês** |
| Testar 14 dias | **Testar 7 dias grátis** |
| cobrança no 15º dia | removido enquanto o checkout R-92 estiver desligado |
| aviso 7 dias antes | **aviso antes do fim** ou **2 dias antes**, conforme o bloco |
| aplicativo não existe | **Aplicativo instalável — em breve** |

Novo componente visual estático:

```ts
export function PwaInstallSlot(): React.JSX.Element;
```

R-121 renderiza somente “Em breve” e não antecipa API de instalação. R-116 substitui o conteúdo
interno e define o contrato do prompt real quando ele existir.

## 5. Comportamento por jornada

| Entrada | Estado | Resultado |
|---|---|---|
| Landing → cadastro | novo usuário | confirmação → onboarding |
| Landing → Google | novo usuário | callback → onboarding |
| Login direto | conta existente | dashboard da role atual |
| Convite → criar conta | novo usuário | confirmação → mesmo convite → aceite explícito |
| Convite → Google | e-mail correto | callback → mesmo convite → aceite explícito |
| Convite → login | conta correta | mesmo convite → aceite explícito |
| Convite → login | e-mail diferente | bloqueia aceite e oferece Trocar conta |
| Convite expirado/cancelado | qualquer | estado claro; não cria vínculo |
| Convite já aceito | membro existente | informa situação e oferece ir ao dashboard |

## 6. Brief e referência visual

- **Artefato:** `plans/artefatos/R-121-login-convite.html`
- **Rotas alvo:** `/login`, `/cadastro`, `/convite/[token]`
- **Estados visíveis:** login, autenticar no convite, e-mail incompatível e aceitar convite

| Token/medida | Valor extraído |
|---|---|
| Fundo escuro / superfície | `#0d0d0d` / `#111112` |
| Superfície secundária / borda dark | `#19191b` / `rgba(255,255,255,.11)` |
| Teal / teal claro | `#2f9c85` / `#5dbeb0` |
| Texto dark primário/secundário | `#fafafa` / `#aaaab1` |
| Fontes | `DM Serif Display` · `Outfit` · `DM Mono` |
| Card / input / botão | raio `12px` / `10px` / `10px` |
| Input e CTA | `48px` de altura |
| Split desktop | `44%` marca · `56%` formulário |
| Mobile | painel de marca recolhe; padding lateral `16px` |

### Landing

- referência obrigatória: artefato aprovado do R-88 e implementação atual;
- não mudar hero, grade, ordem narrativa, cards de preço ou linguagem editorial;
- incluir o PWA como faixa horizontal compacta, usando a mesma geometria de `bloco/conteudo`;
- números (`5`, `400`, `7`) em fonte mono;
- PWA “Em breve” é badge informativa, não CTA desabilitado.

### Login, cadastro e convite

- direção: **clinical editorial + operational SaaS**, a mesma do Dashboard/Tratamento;
- paleta: somente tokens atuais (`background`, `card`, `foreground`, `muted-foreground`,
  `border`, teal/coral sem valor hardcoded);
- tipografia: heading serif peso real 400; corpo Outfit; micro-rótulos e números em mono;
- desktop: preservar split com painel de marca; formulário à direita com largura máxima de 448px;
- mobile: painel lateral some, mas logo/wordmark reaparece acima do formulário; padding mínimo 16px;
- convite: clínica, papel, destinatário e validade formam um resumo compacto antes da ação;
- o painel de marca de login, cadastro e convite **não mostra métricas comerciais nem duração do
  trial**. O bloco `5 / +400 / 7 dias` removido do artefato foi superado pela decisão de 20/08;
  esses números existem somente na landing;
- CTA primário canônico; foco visível; contraste AA; dark e light completos;
- wrapper crítico renderiza com `opacity: 1` no HTML. Motion só em transform/entrada leve.

Antes do código, um artefato único deve mostrar: login desktop/mobile e convite nos estados
`autenticar`, `email_incompativel` e `pronto_para_aceitar`. A implementação copia o aprovado.

## 7. Invariantes

- [ ] **I1** — `TRIAL_DAYS` é a única fonte da duração do teste.
- [ ] **I2** — nenhum texto ativo promete 14 dias, 15º dia ou aviso 7 dias antes.
- [ ] **I3** — callback autentica e redireciona; nunca aceita convite nem concede membership.
- [ ] **I4** — somente `aceitarConvite` cria/reativa o vínculo de um convite.
- [ ] **I5** — `next` nunca permite open redirect.
- [ ] **I6** — convidado nunca cai no onboarding antes de concluir ou abandonar o convite.
- [ ] **I7** — e-mail incompatível nunca consegue aceitar o convite.
- [ ] **I8** — convite não altera pacientes, fichas, documentos ou dados clínicos existentes.
- [ ] **I9** — PWA “Em breve” não executa ação nem promete offline.
- [ ] **I10** — R-121 não liga `STRIPE_BILLING_ENABLED` nem muda regra de cobrança.

## 8. Gates de aceite

- [ ] **G1** — busca global por textos comerciais não encontra “14 dias”, “14º”, “15º” ou
  “avisa 7 dias antes” em superfícies ativas.
- [ ] **G2** — `activateTrial` e Stripe produzem vencimento em 7 dias usando a mesma constante.
- [ ] **G3** — cron de teste envia aviso apenas a 2 dias/0 dias do `trial_ends_at`; ativo não recebe.
- [ ] **G4** — landing mostra 5 dentistas e mais de 450 atendimentos/mês em desktop e mobile.
- [ ] **G5** — a instalação do aplicativo aparece cedo na landing e leva ao componente PWA funcional.
- [ ] **G6** — cadastro comum por senha e Google termina no onboarding.
- [ ] **G7** — cadastro por convite, com confirmação de e-mail, retorna ao mesmo token e aceita.
- [ ] **G8** — login e Google por convite retornam ao mesmo token sem vínculo implícito.
- [ ] **G9** — conta errada não aceita; Trocar conta permite recomeçar sem perder o token.
- [ ] **G10** — convite expirado, cancelado e aceito têm estados distintos e não escrevem no banco.
- [ ] **G11** — login/cadastro/convite passam em 375, 768 e 1440px, light/dark, teclado e foco.
- [ ] **G12** — páginas críticas continuam visíveis com JavaScript bloqueado durante a captura.
- [ ] **G13** — landing mostra os dois planos Fundador: Consultório por R$200/mês; Clínica por R$200/dentista/mês, a partir de 2 dentistas.
- [ ] **G14** — `tsc`, lint focado e QA do fluxo completo passam antes do commit.

## 9. Fora de escopo

- comportamento offline e sincronização clínica em segundo plano;
- ativar Stripe, checkout, portal, webhook ou bloqueio por inadimplência (R-92);
- reestruturar onboarding clínico;
- redesenho amplo do restante do produto;
- ICP-Brasil, WhatsApp e painel de próximas atualizações;
- excluir ou migrar contas, clínicas, convites ou dados antigos.

## 10. Reorganização comercial — 20/08 (visual aprovado)

**Pedido registrado:** reduzir repetição de CTA e trazer o aplicativo para o começo da landing,
com conversão de novo usuário priorizando Google.

- topo: marca · `Como funciona` · `Quem usa` · `Preço` · `Dúvidas` · `Entrar`; remove o
  botão repetido `Testar 7 dias`;
- hero: CTA primário `Começar com Google` (OAuth já retorna ao onboarding) e secundário
  `Criar conta com e-mail`; o trial vira prova abaixo dos botões, não uma terceira rota;
- aplicativo: faixa imediatamente depois do hero, antes de `Como funciona`;
- CTA de planos e rodapé permanecem porque pertencem a decisões posteriores da narrativa;
- microcopy: `7 dias gratuitos após criar sua conta. Sem fidelidade.`

**Artefatos rascunho:** `plans/artefatos/R-121-landing-conversao-v2.html` (primeira dobra),
`plans/artefatos/R-121-landing-conversao-v3.html` (funil completo) e
`plans/artefatos/R-121-landing-conversao-v4.html` (exploração híbrida) e
`plans/artefatos/R-121-landing-conversao-v5.html` (exploração comercial) e
`plans/artefatos/R-121-landing-conversao-v6.html` (fusão comercial anterior) e
`plans/artefatos/R-121-landing-conversao-v7.html` (odontograma anatômico) e
`plans/artefatos/R-121-landing-conversao-v8.html` (aprovado, superado apenas na seção de preço) e
`plans/artefatos/R-121-landing-conversao-v9.html` (**aprovado para o preço de lançamento**).

O v7 preserva integralmente a fusão v6 e substitui apenas os blocos genéricos do
odontograma por silhuetas anatômicas portadas da geometria do sistema: incisivos,
caninos, pré-molares e molares têm coroas e raízes próprias, mantendo a legenda.

O v8 porta para a demonstração principal a anatomia visual do Campo Mágico real:
DexAvatar, microcópia, chips local/detectado, relato livre e barra Gravar voz / Anexar /
Organizar com Dex. A ficha estruturada continua abaixo, mas como resultado separado.

O v9 altera apenas a oferta: dois planos Fundador igualmente prioritários. Consultório custa
R$200/mês (1 dentista + 1 secretária); Clínica custa R$200 por dentista/mês, mínimo de 2
dentistas. Ambos preservam o preço enquanto a assinatura estiver ativa e têm trial de 7 dias;
a condição vale para as próximas 10 vagas.

O v6 preserva a identidade da landing R-88 e a hierarquia do R-121: charcoal, grade sutil,
DM Serif/Outfit/DM Mono, sem fundo neural. Ele funde a arquitetura comercial do v5 com os
componentes clínicos da landing atual: rail do Meu Dia, Campo Mágico, odontograma, registros
da sessão, pendência da próxima consulta e captura da ficha exemplo. Métricas ClinDent,
aplicativo secundário, proteção, FAQ e oferta Fundador completam o funil. Google é sempre o
CTA primário e e-mail a alternativa. Não muda OAuth, cadastro, trial ou o contrato do R-116.
A oferta Fundador vale para as próximas 10 vagas e precisa bater com Stripe antes do deploy.

## 11. Domínio canônico — 21/08

Decisão aprovada: o produto usa um único domínio canônico.

- canônico: `https://odontoia.app`;
- `https://www.odontoia.app/*` redireciona permanentemente para
  `https://odontoia.app/*` preservando caminho e query;
- `https://dentia.app.br/*` deixa de servir o produto e permanece apenas como redirect 308 para
  o domínio canônico por 90 dias, protegendo convites, favoritos e callbacks antigos;
- `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL` em produção são
  `https://odontoia.app` sem barra final;
- Supabase Auth usa `https://odontoia.app` como Site URL e mantém os callbacks locais e do
  domínio canônico na allowlist;
- Google OAuth, Stripe, Resend e Meta deixam de gerar links ou callbacks em `dentia.app.br`.

### Gates adicionais

- [ ] `odontoia.app/login` serve o login novo e autentica até o destino solicitado.
- [ ] `www.odontoia.app/login?next=/onboarding` devolve 308 para o apex preservando a query.
- [ ] `dentia.app.br/convite/{token}` devolve 308 para o mesmo caminho no apex.
- [ ] Confirmação de e-mail e Google OAuth retornam para `odontoia.app/auth/callback`.
- [x] Busca em código ativo não encontra `dentia.app.br`.

### Correção local de autenticação — 21/08

O redesign havia introduzido `signOut({ scope: 'local' })` imediatamente antes de
`signInWithPassword`/`signUp` e substituído a navegação coordenada do Next por
`window.location.replace`. Isso abriu uma corrida entre remoção, criação e leitura dos cookies
SSR. O visual novo permanece; a mecânica comprovada voltou a usar login/cadastro direto e
`router.push()` + `router.refresh()`. Refresh token inválido continua sendo limpo no middleware,
que é o único dono dessa recuperação.

Gates locais executados: cadastro e login reais com usuário descartável; trigger de
`public.users`; limpeza do usuário; sessão SSR; `/onboarding` 200; `/dashboard` 307 para
onboarding sem clínica; `/login` 307 quando autenticado; Google OAuth habilitado e callback
local correto. Nenhum dado clínico foi criado ou alterado.

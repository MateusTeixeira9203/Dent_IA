# R-92 — Fechar para cobrar

> **SPEC** · modelo: Opus · criada 2026-08-09 · **🔵 ativo** · semana de **10 a 16/08**
> Decisão dele: "fechar pra cobrar" — em vez de fechar a lista inteira e lançar em ~2 meses.

## 1. Objetivo, em uma frase

**Sair de 0 pagantes para 3**, com o caminho de cobrança testado por ele ponta a ponta e o
placar mínimo medindo — antes de gastar qualquer energia em aquisição.

**Por que este e não outro:** hoje 5 clínicas estão em `trial` com `trial_ends_at = NULL`
(trial perpétuo, nunca ativado); `status_assinatura = 'ativo'` nunca existiu no banco. O
checkout ([planos/actions.ts:70](../../src/app/planos/actions.ts)) nunca processou um
pagamento. A meta declarada é 100 pagantes em 2026 e o primeiro ainda não existe.

## 2. O que NÃO entra nesta semana

Cortado com o critério do playbook dele (erro nº 9, pág. 57: *não adicionar funcionalidade
nova que não ataque ativação ou retenção*):

| Item | Por que fica pra depois |
|---|---|
| Tela do protético | **Zero código hoje** — módulo novo com schema + RLS + gate de 2 contas. 1–2 semanas |
| Voz nas especialidades (R-49) | Item G, spec pronta, mas é feature nova. 1 semana+ |
| Painel de notificação do Dex (R-26) | Sem spec; precisa definir "faltou e não voltou" antes |
| Montar o planejar | Mais barato do que parece (é religar, não construir), mas não destrava cobrança |
| Acessibilidade completa (WCAG AA) | Sistema inteiro, 1–2 semanas |
| Landing (R-88) | Volta pra ⏳ — deve ser escrita **depois** do que os 3 pagantes ensinarem |

**Exceção defendida e aceita:** responsividade mobile não é polimento — é a causa documentada
da morte do modo consulta (dentista longe do PC) e todo concorrente resolve com app. Entra
como Dia 6, se a semana couber.

## 3. Dependências externas

| O quê | Quando | Bloqueia |
|---|---|---|
| **API AbacatePay** | ele solicita 10/08 | Dia 3 (checkout real). Sem ela, Dia 3 vira sandbox |
| **API WhatsApp (Meta)** | ele solicita 10/08 | **Nada nesta semana.** Verificação de negócio da Meta leva dias/semanas — não pendure nada crítico nela |

## 4. Plano por dia

### Dia 1 — Tirar o atrito do dinheiro (o que ele chamou de "financeiro complexo")

🟡 **Codado e commitável 09/08 — typecheck + build limpos. Teste ao vivo adiado** (sem sessão
autenticada disponível nesta janela; ele decidiu seguir e testar depois).

| # | O quê | Onde | Status |
|---|---|---|---|
| 1.1 | **R-90** — `registrarRecebimento` nunca gravava `dentista_id` (coluna `NOT NULL`) | `financeiro/actions.ts:739,760` — agora busca `dentista_id` do orçamento (regra 8, mesmo padrão do `registrarPagamentoRapido`) | 🟡 codado |
| 1.2 | Receber dinheiro: **4 → 2 gestos** — `registrarPagamentoRapido` plugado no modal do orçamento via novo botão "Registrar Dinheiro" | `detalhe-orcamento-modal.tsx` (prop nova `onRegistrarDinheiroRapido`) + `paciente-detail-client.tsx` (`handlePagamentoRapido`) | 🟡 codado |
| 1.3 | Default do pagamento: `pix` → `dinheiro` (5 ocorrências) | `paciente-detail-client.tsx:253,712,725,736,1661` | 🟡 codado |
| 1.4 | **Dex: "D" → carinha** — `<DexMark expression={isRecording ? 'atento' : 'pensando'} animated />` | `voice-ux.tsx` | 🟡 codado |

**Falta pra virar ✅:** ele logar na Teste01 e testar os 4 — registrar um recebimento real,
clicar "Registrar Dinheiro" em 1 clique, ver o default já em "Dinheiro", ver a carinha do Dex
reagindo à gravação de voz.

### Dia 2 — Poder medir e poder cobrar

| # | O quê | Prova |
|---|---|---|
| 2.1 | **Placar mínimo instrumentado** (PostHog — hoje há **zero analytics** no projeto) | 3 números na tela: ativação, retenção mês 2, churn |
| 2.2 | Definir **momento de valor**: proposta = *primeira ficha salva com procedimento*. Instrumentar TTV a partir do cadastro | Evento disparando, TTV mediano visível |
| 2.3 | **Definir o preço** (decisão dele) e aplicar em `lib/planos.ts` como fonte única | `page.tsx` e `planos-client.tsx` param de duplicar o número |
| 2.4 | Matar a contradição "7 dias" × "14 dias" | Uma promessa só, vinda de `lib/planos.ts` |

**Alvos do playbook (pág. 50), pra saber o que é bom:** ativação ≥40% · retenção mês 2 ≥60% ·
churn <3% ótimo, 3–7% comum.

### Dia 3 — Checkout ponta a ponta, testado por ele

| # | O quê | Prova |
|---|---|---|
| 3.1 | Ligar a API AbacatePay em `createCheckout` | Link de checkout real gerado |
| 3.2 | **Pagar de verdade** (valor mínimo, conta dele) | `status_assinatura` vira `ativo` no banco |
| 3.3 | Confirmar o webhook | `api/webhooks/abacatepay/route.ts` recebe e grava |
| 3.4 | Testar o caminho triste: cartão recusado, webhook duplicado | Nenhum estado inconsistente |

**Se a API não sair a tempo:** faz em sandbox e o Dia 5 vira "cobrar por Pix manual + link
depois". A conversa de cobrança **não espera** a API.

### Dia 4 — Ouvir os 3 (Mom Test)

Roteiro pronto no playbook, pág. 55. Regra: **nada de pitch antes da pergunta 8**, e todo
elogio vira pedido de compromisso concreto.

As 3 perguntas que precisam de resposta:
1. O que você fazia antes do Odonto.IA, e o que ainda faz fora dele?
2. Qual foi a última vez que o sistema te atrapalhou? O que aconteceu?
3. Se ele sumisse amanhã, o que mudaria na sua semana?

Registrar cada conversa em 3 linhas: dor citada · solução atual · compromisso obtido.

### Dia 5 — Cobrar

| # | O quê |
|---|---|
| 5.1 | Conversa com Clindent, Império e Vip: "vou começar a cobrar, o valor é X, começa em [data]" |
| 5.2 | Mandar o link de checkout |
| 5.3 | Registrar quem pagou, quem hesitou e **o motivo exato de quem não pagou** |

**Sucesso não é 3 de 3.** É saber o motivo real de cada não — essa informação vale mais que a
landing inteira.

### Dia 6 (se couber) — Responsividade mobile

Varredura das 4 telas que importam no celular: Meu dia · Agenda · Ficha · Financeiro.

## 5. Gates de aceite da semana

- [ ] **G1** — Um recebimento real gravado por `registrarRecebimento` (R-90 morto)
- [ ] **G2** — Fechar parcela em 2 gestos, medido
- [ ] **G3** — Ativação, retenção e churn visíveis num painel
- [ ] **G4** — Preço definido, num lugar só, sem contradição de trial
- [ ] **G5** — **Um pagamento real processado** (mesmo que o dele)
- [ ] **G6** — 3 conversas Mom Test registradas em texto
- [ ] **G7** — 3 propostas de cobrança enviadas, com resposta registrada

**G5 é o gate que define a semana.** Sem ele, nada mudou.

## 6. Riscos

| Risco | Mitigação |
|---|---|
| **Ligar gate de bloqueio e travar clínica real** — Clindent tem 302 pacientes e é da família | **Cobrança é conversa + link, nunca paywall automático.** Não mexer em `status_assinatura` de clínica real sem confirmação dele por escrito (memória `feedback_clindent_somente_leitura`) |
| API AbacatePay atrasa | Dia 3 vira sandbox; cobrança segue por Pix manual |
| Os 3 não pagarem | **É o resultado mais valioso da semana.** Muda preço, posicionamento ou público — e é infinitamente mais barato descobrir com 3 do que com 100 |
| A lista cortada voltar no meio da semana | Anotar o pedido na fila e seguir (checklist dos primeiros 30 dias, playbook pág. 54) |
| 4 commits de 09/08 ainda sem push | Subir antes de começar, em lote pequeno |

## 7. Aberto, esperando ele

- [x] **O preço.** Decidido 14/08: Consultório R$299, Clínica R$259/dentista. Aplicado em
      `lib/planos.ts` ([343e8a4](../../../commit/343e8a4)).
- [ ] Confirmar que a cobrança das 3 é por conversa, não por gate automático.

## 8. Emenda 15/08 — Dia 3 muda de provedor: AbacatePay → Stripe

**Decisão dele:** troca de provedor. Chave do Stripe chega **segunda-feira**. "Considero ela
melhor" — sem justificativa pedida, então o Dia 3 original (`createCheckout` ligando a API do
AbacatePay) está **superseded**. Ele continua no §4 como histórico; o contrato daqui é o que
vale.

**Por que não é só trocar a chave:** o `createCheckout` de hoje chama
`POST /v1/billing/create` da AbacatePay — cobra **na hora** (Pix ou cartão), sem tokenizar nada
pra depois. Não existe caminho de "cartão agora, cobra só no 15º dia" nesse endpoint. A promessa
que está no ar desde ontem (`page.tsx`, e-mail D7) só é possível com um mecanismo de trial nativo
do provedor. Verificado no Stripe: existe, é estável, é exatamente isso.

### 8.1 O mecanismo certo (verificado na doc oficial, não a preview)

`Checkout Session` em `mode: 'subscription'`, passando
[`subscription_data.trial_period_days`](https://docs.stripe.com/payments/checkout/free-trials.md?payment-ui=stripe-hosted).
Por padrão a Checkout Session **já coleta o cartão** mesmo com trial ativo — não precisa (e não
deve) passar `payment_method_collection: 'if_required'`, que é a opção pra trial *sem* cartão.
Quando o trial acaba, a Stripe fatura o valor cheio automaticamente, sem ação do cliente.

```
POST /v1/checkout/sessions
mode=subscription
line_items[0][price]={{PRICE_ID}}
subscription_data[trial_period_days]=14
```

**Cuidado que quase entrou errado:** a primeira busca achou a API `Trial Offer`
(`/v1/product_catalog/trial_offers`, versão preview `2026-03-25.preview`) — é mais nova, mais
flexível (permite trial *pago*), mas a própria doc diz que ela **não funciona com Checkout**, só
com a API de Subscriptions direto, e exige header de versão preview. Não é pra este caso.
`trial_period_days` legado é o caminho estável e é o que o Checkout aceita.

Webhooks que importam: `checkout.session.completed` (assinatura criada, ainda em trial),
`customer.subscription.trial_will_end` (dispara 3 dias antes — pode substituir o aviso que hoje
sai de `onboarding-emails.ts`), `invoice.paid` (a cobrança do dia 15 caiu).

### 8.2 Achado que muda o escopo — Pix no Stripe tem pré-requisito

Pix pela Stripe só libera pra contas que **já processaram pagamento nos últimos 60 dias e estão
em dia** ([Stripe — Pix no Brasil](https://stripe.com/br/payment-method/pix)). Conta nova não
tem Pix no dia 1. Se o checkout do plano precisa aceitar Pix desde o lançamento, os primeiros ~60
dias são **só cartão** — ou o Pix de assinatura continua na AbacatePay enquanto o Stripe esquenta.

### 8.3 Escopo da troca — decidido 15/08

O projeto tinha **dois** usos de AbacatePay, não um:
1. Assinatura de plano (`createCheckout`, webhook `/api/webhooks/abacate`) — **este migra pro Stripe**
2. Cobrança avulsa de paciente via Pix (webhook `/api/webhooks/abacatepay`, usado em orçamentos)

**Decisão dele: a (2) não migra — ela deixa de existir.** Cobrar o paciente passa a ser por
conta do dentista, fora do sistema; o app só registra o que já foi recebido (é a direção que o
Dia 1 já tomava — "Registrar Dinheiro", default virou `dinheiro`). Levantei um achado que reforça
isso: não encontrei nenhum ponto do código hoje que **cria** uma cobrança Pix pra orçamento — só
o webhook que a **recebe** (`ChargeEventSchema`, evento `charge.paid`). Ou seja, é provável que já
seja código morto, receptor sem emissor.

**Não removi agora** — decommission de rota + schema é trabalho à parte, não Dia 3. Registrado
como tarefa separada (ver handoff).

### 8.4 Bloqueado até segunda

Nada do Dia 3 é codável sem a chave. `ABACATE_PAY_*` seguem ausentes de `.env.local`; nenhuma das
equivalentes `STRIPE_*` existe ainda. Quando a chave chegar: criar os 2 Price (Consultório
R$299/mês, Clínica R$259/mês) no Stripe, reescrever `createCheckout` pra `checkout/sessions` com
`trial_period_days: 14`, reescrever o webhook (evento + schema Zod), e só então `activateTrial`
sai — ele deixa de existir, porque quem cria o trial passa a ser o Stripe, não uma escrita direta
no banco.

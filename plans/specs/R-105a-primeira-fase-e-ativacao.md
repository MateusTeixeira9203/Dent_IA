# R-105a — Onboarding: a primeira fase guiada e a ativação

> **Modelo:** Opus pro card de ativação (§4.3), que é a peça com decisão de produto dentro.
> Sonnet pro resto (redirect, strings, realce) — mecânico e já desenhado no artefato.
> **Fase:** `contrato` — 15/08. Artefato **aprovado** por ele em 15/08 com a emenda da ativação.
> **Irmão:** [R-105b](R-105b-marcos-e-gatilhos.md) — os marcos do Dex e o cron dos e-mails.
> Os dois não compartilham arquivo nenhum; sobem separados.

---

## 1. Problema

Ninguém nunca mediu a entrada do produto porque nunca entrou ninguém: 5 clínicas, todas
convidadas à mão. Com o R-88 (landing) e o R-92 (cobrança) a caminho, a porta vai abrir para um
corredor que tem três buracos — e um deles não é de UX, é de banco.

### 1.1 O caminho de hoje, lido no código

| # | Passo | O que acontece |
|---|---|---|
| 1 | `/cadastro` | e-mail + senha + **nome** (`cadastro-form.tsx:62`) |
| 2 | `/onboarding` | **nome de novo**, CRO, especialidades, consultório, persona |
| 3 | `/dashboard` | `onboarding-client.tsx:166` → **as 3 métricas em 0, hero nulo, painel de atenção vazio** |
| 4 | achar "Meu dia" | 2º item do dock, sem destaque |
| 5 | `/dashboard/meu-dia` | com 0 agendamentos, `rail.tsx:178-185` renderiza uma frase e um botão **"Encaixe"** — e o corpo inteiro do cockpit **nem monta** |
| 6 | campo mágico → Salvar | momento de valor |

Passos 3 e 4 são o furo: **a primeira tela do produto prova que ele está vazio.** É o erro nº 4
do Playbook (p.57) — *"valor só depois que configurar tudo"*. Passo 5 tem jargão de agenda
("Encaixe") no único botão vivo. Passo 2 repete um campo já gravado no 1.

### 1.2 O buraco de banco — a causa do "trial perpétuo"

`iniciarOnboarding` grava plano SOLO provisório e `onboarding_completo`. Ele **nunca chama
`activateTrial`** — a única função do projeto que grava `trial_ends_at`
(`planos/actions.ts:41-51`). O único caminho até ela é a página `/planos`, que ninguém visita.

**Resultado: `trial_ends_at` fica NULL para sempre.** As 5 clínicas em "trial perpétuo" não são
uma decisão comercial — é que ninguém nunca deu partida no relógio. Consequência em cadeia: o
template do e-mail D7 recebe `dataExpiracao` e **não existe fonte pra esse parâmetro** (é o que
trava metade do [R-105b](R-105b-marcos-e-gatilhos.md)).

Segundo defeito na mesma função: ela grava `plano: 'CLINICA'` **hardcoded**
(`planos/actions.ts:47`). Um dentista solo que ativasse o trial cairia no plano errado.

---

## 2. Decisão

**Nenhuma tela nova.** O caminho até o valor já existe inteiro; o item tira duas coisas da frente,
acende uma de cada vez, e fecha com a ativação.

O onboarding inteiro tem três camadas. **Esta spec é a Camada 1**; as outras duas são o R-105b:

| Camada | O quê | Onde | Spec |
|---|---|---|---|
| **1** · sessão 1 | Primeira fase guiada + **ativação do trial no fim** | `/dashboard/meu-dia` | **esta** |
| 2 · semana 1 | 5 marcos acesos pelo estado que os torna relevantes | pendências do Dex | R-105b |
| 3 · mês 1 | Gatilhos: condição de banco → frase escrita | Dex + e-mail | R-105b |

**Momento de valor:** a primeira ficha salva com ≥ 1 evento de odontograma. Não é "criar uma
ficha" — ficha vazia não prova nada.

**A ativação vem depois do valor, nunca antes** (emenda dele, 15/08). É o único instante do funil
em que o dentista acabou de ver o produto funcionar.

---

## 3. Objetivo

Um dentista que se cadastra chega à primeira ficha salva **em menos de 10 minutos**, sem ler
instrução e sem configurar nada antes — e sai da primeira sessão com o relógio do trial correndo
e o plano certo gravado.

---

## 4. Contrato técnico

### 4.1 O redirect e o predicado de primeira sessão

`onboarding-client.tsx:166` → `router.replace('/dashboard/meu-dia')`.

O predicado é **por dentista**, não por clínica — um dentista convidado para uma clínica que já
tem fichas também é um dentista de primeira sessão:

```ts
// get-meu-dia.ts — entra no Promise.all que já existe
const { data: temFicha } = await supabase
  .from('fichas').select('id').eq('dentista_id', dentistaId).limit(1);

// MeuDiaData ganha:
/** R-105a — este dentista ainda não salvou nenhuma ficha. Deriva as strings e o realce
 *  da primeira fase; nunca persistido. */
primeiraSessao: boolean;   // = (temFicha?.length ?? 0) === 0
```

Seek em índice com `limit(1)` — não é `count`, não varre a tabela.

### 4.2 A primeira fase — 3 strings, 1 rótulo, 1 realce

| Âncora | Hoje | Com `primeiraSessao` |
|---|---|---|
| `rail.tsx:181` | "Nenhum atendimento hoje." | "Seu primeiro paciente entra por aqui." |
| `rail.tsx:79` (botão) | "Encaixe" | "Atender agora" |
| `meu-dia-client.tsx:631` (prop `vazio`) | "Nada registrado ainda nesta consulta." | "O que o Dex entender do seu relato aparece aqui." |
| campo mágico `:75` | "Fale, cole, anexe ou digite — o Dex monta a ficha" | **igual** — já é o convite certo |
| rodapé "Salvar e passar" | nasce `disabled` | **igual** — o disabled já ensina a ordem |

`Rail` e `CampoMagicoMeuDia` ganham `primeiraSessao?: boolean` / `realce?: boolean`. O realce é o
**mesmo `border-teal` que o rail já usa no slot selecionado** — nenhuma pílula flutuante.

### 4.2.1 As dicas de zona (v5 — decisão dele em 15/08, depois de rodar a v4)

*"senti falta de uns cards mostrando ou explicando o que a página faz."* Escolheu, entre 4
opções com preview, a mais completa: **uma dica por zona**. Eu recomendei a mais leve (só a tela
vazia) argumentando que dica no cockpit aparece com o paciente já na cadeira; **ele decidiu
contra, e vale a decisão dele.**

Componente novo: `DicaZona` — 1 título + 1 frase, ícone `i`, borda esquerda teal. Lê como
bilhete, não como alerta.

| Zona | Frase | **Some quando** |
|---|---|---|
| A faixa do dia | "Cada paciente do seu dia vira um card aqui. Quem chegou sem estar marcado entra pelo 'Atender agora'." | existe ≥ 1 slot |
| O campo mágico | "Fale ou cole o relato da consulta. O Dex lê e transforma em procedimentos." | o campo é aberto |
| Nesta ficha | "Tudo que o Dex entendeu cai aqui. Dá pra corrigir antes de salvar." | `eventosDraft.length > 0` |
| O odontograma | "A boca do paciente. Toque um dente pra ver o histórico dele." | um dente é tocado |
| O que sai daqui | "Da ficha salva saem o orçamento e o retorno, sem redigitar nada." | há rascunho |

**A regra que impede virar mobília: cada dica some quando A SUA zona é usada** — não no fim de
tudo, não por um "x" que o dentista tem que caçar. O cockpit se limpa conforme ele trabalha:
4 dicas no primeiro render, 3 depois de abrir o campo, 1 depois do primeiro procedimento, 0
depois de salvar. Tudo derivado (I2), nada persistido.

Gavetas ficaram **de fora** — nascem fechadas e os rótulos se explicam. Reversível.

Regra do realce, derivada a cada render:

```ts
const realce =
  !primeiraSessao                           ? null
  : slots.length === 0                      ? 'encaixe'
  : slotSelecionado && !eventosDraft.length ? 'campo-magico'
  : null;
```

### 4.3 A ativação — estado 7 do artefato

Duas escritas **separadas**, e a separação é o ponto: o relógio é irreversível, o plano é editável.

**(a) A partida do relógio — automática, sem perguntar.**
`activateTrial` é reescrita: perde o `redirect()`, perde o `plano` hardcoded, vira idempotente.

```ts
// planos/actions.ts
export async function activateTrial():
  Promise<{ ok: true; trialEndsAt: string } | { ok: false; error: string }>
```
- `UPDATE clinicas SET status_assinatura='trial', trial_ends_at = now() + 14 dias
   WHERE id = :clinicId AND trial_ends_at IS NULL` — **`plano` não é tocado**
- guardas de hoje (`status_assinatura='ativo'`, trial já usado) viram `ok:false`, não redirect
- chamada logo **depois** do primeiro `salvarVisitaMeuDia` bem-sucedido do dentista

**Um botão "começar meus 14 dias" está proibido**: quem clicasse em "agora não" voltaria ao trial
infinito e o bug sobreviveria com outra roupa. O card só informa.

**(b) O plano — uma pergunta, dois botões.** Reusa `definirPlano` (`onboarding/actions.ts:87`)
**tal qual** — ela já grava `plano` + `limite_dentistas`.

| Botão | Grava |
|---|---|
| "Atendo sozinho" · Consultório · R$299/mês | `definirPlano('SOLO')` |
| "Somos vários dentistas" · Clínica · R$259/dentista/mês | `definirPlano('CLINICA')` |

Preços vêm de `lib/planos.ts` (fonte única), nunca literais no componente.

**(c) A rede de segurança.** Se (a) falhar (rede, 503), o salvamento clínico **não pode** falhar
junto. O erro é logado, e quem corrige no dia seguinte é o cron do R-105b §4.2 — que varre
clínicas com ≥ 1 ficha e `trial_ends_at` NULL. Daí o invariante **I5**.

---

## 5. Comportamento

**Caminho principal (primeira sessão):**
1. `/onboarding` conclui → `/dashboard/meu-dia`
2. Rail vazio, frase de primeira sessão, **"Atender agora"** aceso — nada mais responde
3. Modal (`AtenderAgoraModal`, sem mudança): nome → cria paciente → cria encaixe
4. Cockpit monta inteiro; **campo mágico aceso** — único controle realçado
5. Dita/cola → Dex estrutura → "Nesta ficha" enche, odontograma acende, `Salvar` perde o disabled
6. Salvar → **momento de valor**. `activateTrial()` dispara em seguida
7. **Card de ativação** ocupa o lugar do fim-de-dia: relógio informado + a pergunta do plano
8. Segunda sessão: `primeiraSessao = false`, tudo volta às strings normais, o guia some

**Caminho do convidado:** dentista que entra por `/convite/[token]` numa clínica existente vê a
primeira fase (o predicado é por dentista) e **não vê o card de plano** (não é admin, e a clínica
já tem trial). Invariantes I3 e I4.

**Secretária:** `meu-dia/page.tsx:24` já a redireciona. Fora de escopo (§9).

---

## 6. Referência visual

`plans/artefatos/R-105-onboarding-primeira-fase.html` **v4**, aprovado 15/08 — **contrato
visual**: a implementação copia, não se inspira. §1 do artefato tem os 8 estados clicáveis; o
estado 7 é o card de ativação, o único elemento novo do item. Tokens, geometria e copy saem de lá
em texto, nunca deduzidos da tela.

---

## 7. Invariantes

- **I1** — O guia nunca esconde nada. Dock, rotas e controles seguem clicáveis o tempo todo.
- **I2** — No máximo **um** realce por vez, derivado do estado a cada render, nunca persistido.
- **I3** — O guia é por **dentista** (`fichas.dentista_id`); a ativação é por **clínica**.
- **I4** — Só admin/fundador vê o card de plano. Convidado nunca vê preço.
- **I5** — Nenhuma clínica com ≥ 1 ficha fica com `trial_ends_at` NULL por mais de 24h.
- **I6** — A partida do trial **nunca** bloqueia nem falha o salvamento da ficha.
- **I7** — Configuração nunca é pré-requisito do momento de valor.
- **I8** — `activateTrial` nunca mais escreve `plano`. Quem escreve plano é `definirPlano`.
- **I9** — Preço nunca é literal em componente: sempre `lib/planos.ts`.

---

## 8. Gates de aceite

> **Rodada ponta a ponta em 15/08**, autorizada por ele, em clínica **criada na hora pelo
> cadastro real** (`QA R-105a (apagar)`, e-mail `mateusteixeira9203+qa15@gmail.com`) — nenhuma
> clínica existente foi tocada. Ele criou a conta e a senha; eu conduzi do `/onboarding` em
> diante. Resultado por gate abaixo.

- [x] **G1** — ✅ o `Continuar` do onboarding caiu em **`/dashboard/meu-dia`**. Estado inicial
      provado limpo antes do clique (usuário em `auth.users`, **zero** dentista e zero clínica)
- [x] **G2** — ✅ **as duas direções, com o predicado real do banco.** Com 0 fichas:
      "Seu primeiro paciente entra por aqui." · "Atender agora" · "O que o Dex entender do seu
      relato aparece aqui." Depois da 1ª ficha, no mesmo `router.refresh()`: "Nenhum atendimento
      hoje." · "Encaixe" · "Nada registrado ainda nesta consulta."
- [x] **G3** — ✅ **exatamente 1 aceso em cada estado.** Rail vazio: Encaixe `solid
      rgb(47,156,133)`. Com paciente: campo mágico em `rgb(47,156,133)` + ring de 2px e Encaixe
      de volta a `rgb(39,39,42)`. Com 1 procedimento no rascunho: campo mágico volta a `teal/30`,
      ring some, `Salvar` sai de `disabled`. Zero aceso depois da 1ª ficha
- [x] **G4** — ✅ `trial_ends_at = 2026-08-29 19:58:45` = **exatamente 14 dias**;
      `status_assinatura='trial'`; 1 ficha, 1 evento. O card mostrou **"29 de agosto"** — a data
      do banco, não recalculada na tela
- [x] **G5** — ✅ **idempotência provada.** Depois do 2º save, `trial_ends_at` seguia
      `2026-08-29 19:58:45`, idêntico ao segundo
- [ ] **G6** — "Atendo sozinho" → `plano='SOLO'`, `limite_dentistas=1`; "vários" → `CLINICA`,
      `limite_dentistas=**5**`. Conferir por SQL que `activateTrial` **não tocou** em `plano`

      > **Correção de 15/08, achada no baseline do gate.** Este gate dizia "CLINICA/99" e estava
      > errado. `definirPlano` grava **5** (`onboarding/actions.ts:21`), enquanto
      > `PLANOS.CLINICA.limiteDentistas` declara **99** (`lib/planos.ts:74`) e é o que
      > `limiteDentistasParaPlano()` devolve. **São duas fontes para o mesmo fato, divergindo** —
      > defeito pré-existente, anterior a este item e fora do escopo dele. O gate mede o que o
      > código faz hoje (5); a divergência vira achado, não conserto de contrabando.
- [ ] **G7** — dentista convidado (não-admin) **não** vê o card de plano → **não rodado.** A
      clínica nova tem 1 perfil só, e o único outro papel disponível seria secretária, que o
      `meu-dia/page.tsx:24` já redireciona. Precisa de um 2º dentista não-admin
- [ ] **G8** — **2 contas logadas** na mesma clínica → **não rodado**, mesma fila represada dos
      outros 12. *É o gate que prova o I3* — o único que script não pega
- [x] **G9** — ✅ **light + 375px**: card com 375px de largura, borda direita exatamente no
      viewport, **zero overflow horizontal**, as 2 opções empilhando (`grid-cols-2` → 1 coluna),
      e **todo texto do card ≥ 7.56 de contraste**. Dark verificado ao vivo na própria rodada.
      *(O 3.38 medido é o "✓ registrado" do rail — `text-teal` de produção, pré-existente.)*
- [x] **G10** — ✅ `tsc --noEmit` sem saída · `npm run lint` sem achado novo nos arquivos
      tocados · `next build` compilou 58/58 · **zero erro de console** na rodada inteira
- [ ] **G11** — **TTV cronometrado** → **não medido.** A rodada foi conduzida por mim com pausas
      de inspeção e leitura de SQL no meio, então o relógio não vale — cronometrar exige um
      dentista de verdade indo direto
- [ ] **G12** — teste com **3 dentistas reais**, tarefa "cadastre-se e registre esta consulta",
      pensando em voz alta (Krug p.12)

### Achados da rodada, fora do escopo deste item

- **`limite_dentistas` tem duas fontes que discordam** — ver a nota do G6. Confirmado no dado:
  a escolha "Somos vários" gravou **5**, não os 99 de `lib/planos.ts`.
- **O rótulo "Salvar 2ª ficha" pode não criar 2ª ficha.** No 2º save o seletor do R-108b
  ("O novo (Clareamento) vai para") absorveu o procedimento no tratamento aberto: o banco ficou
  com **1 ficha e 2 eventos**. É o contrato do R-108b funcionando, mas o rótulo do botão promete
  outra coisa. Achado do R-108b, não deste item.
- **O h1 do Meu dia renderiza "Sábado, 15 De Agosto"** — o `capitalize` maiúsculiza o "De".
  Pré-existente, material de `/pontual`.

> **G11 e G12 medem o item; os outros medem o código.** Passar de G1 a G10 e falhar no G11 é o
> item não ter funcionado.

---

## 9. Fora de escopo, e por quê

| Fora | Motivo |
|---|---|
| **Cartão no card de ativação** | É o R-92. Esta spec reserva o lugar e o momento |
| Marcos do Dex e cron de e-mail | É o [R-105b](R-105b-marcos-e-gatilhos.md) |
| Onboarding de secretária e protético | O comprador é o dentista; os dois entram por convite, fluxo diferente. Vira item quando a 1ª clínica de 3+ assinar |
| Tour de N telas · vídeos · chatbot | Recusados no artefato §5, com motivo registrado |
| Pílula flutuante "comece aqui" | Recusada: sem precedente no produto e quebra em 375px |
| Importação de pacientes | É o R-88b |

**Decisão aberta:** o **cartão na ativação** depende do R-92. Enquanto não fechar, a landing
(R-88) promete "trial com cartão" e o produto não faz.

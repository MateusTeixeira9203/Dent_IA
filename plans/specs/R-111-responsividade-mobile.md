# R-111 — Responsividade: celular e tablet nas 8 telas que o dentista usa

> **Modelo:** Opus pro recorte e pras decisões de densidade (§4.4); Sonnet pros consertos
> mecânicos de corte e alvo de toque, que são determinísticos.
> **Fase:** `plano` — 14/08. Inventário medido, contrato ainda não fechado.

---

## 1. Problema

O sistema é usado no celular e corta. Não é impressão: eu medi as 8 rotas em 375×812 (iPhone),
768×1024 (tablet) e 375×500 (celular **com o teclado aberto**), em localhost, clínica Teste01.

**São três defeitos diferentes, e só um deles um script acha.** Isso é o que define o tamanho do
item — não dá pra resolver com uma regra de lint nem com uma varredura automática.

### 1.1 Inventário — celular (375×812)

| Rota | Cortado **sem rolagem** | Alvos < 44px |
|---|---|---|
| Início | — | 3 |
| Pacientes | — | 2 |
| Orçamentos | — *(tabela rola 530px — aceitável, ver §4.4)* | 5 |
| Financeiro | 47px numa linha de transação | 8 |
| **Agenda (semana)** | **162px** — grade de 504px em 342px visíveis | 20 |
| **Prontuário / ficha** | **227px** nas abas + 93px no cabeçalho | 39 |
| **Meu dia** | **224px** — grid campo mágico + espelho (567px em 343px) + 54px na barra de abas | **46** |
| **Novo agendamento** | diálogo de **917px num viewport de 812px** | — |

### 1.2 Inventário — tablet (768×1024)

Quase tudo passa. **A única rota que quebra é a Agenda — e por um motivo diferente do celular:**
o cabeçalho vira `sm:flex-row` e estoura **430px** (705px visíveis, 1135px de conteúdo), cortando
o "Atender agora". No celular esse mesmo cabeçalho fica empilhado e cabe. É breakpoint aplicado a
conteúdo mais largo do que o breakpoint supõe.

Todas as outras: zero corte. Alvos de toque continuam pequenos (Meu dia 49, Prontuário 41).

### 1.3 Os três casos graves

1. **Agenda, semana, celular.** A grade corta 162px e **não tem scroll horizontal**: quinta,
   sexta e sábado são inalcançáveis. **A coluna de hoje está no pedaço cortado.**
2. **Novo agendamento com o teclado aberto** (375×500 — o que sobra num iPhone digitando).
   Diálogo de **872px em 500px**, `overflow-y: hidden`, `max-height: none`, rolagem interna 0.
   **186px cortados em cima e 186px embaixo.** Ficam inacessíveis: o título, o **Fechar**, o
   campo de duração, o **"Salvar agendamento"** e o **"Cancelar"**.
   → **O dentista não consegue concluir um agendamento pelo celular.** Não é atrito, é bloqueio.
   Sem teclado o diálogo já corta 53px de cada lado, e a única saída é a tecla Esc — que celular
   não tem.
3. **Meu dia e Prontuário no celular.** 224px e 227px cortados. São a tela principal do dentista
   e o núcleo do produto.

### 1.4 O que o número NÃO pega — e por isso o item precisa de olho

O **Financeiro passou** no teste de overflow (`scrollWidth == clientWidth`, zero estouro) e mesmo
assim é uma das duas telas que ele citou. O defeito lá é outro: `grid grid-cols-3` fixo, colunas
de **106px**, "receita líquida / bruta" quebrando em três linhas. É densidade de desktop
espremida, não bug de layout.

**Conclusão de método:** varredura automática cobre o critério 1 (corte) e o 3 (alvo de toque).
Os critérios 2 (teclado) e 4 (densidade) exigem abrir tela por tela. O item é manual por natureza.

### 1.5 Falso positivo a ignorar

`relative min-h-screen overflow-x-hidden` acusa 75–95px de corte em **toda** rota, nos dois
tamanhos. São os dois blobs decorativos de fundo (600px e 500px de largura fixa, em `x` negativo).
Intencionais — o `overflow-x-hidden` existe pra contê-los. **Não conta como achado.**

---

## 2. Decisão

**Recorte:** as 8 rotas que o dentista abre no celular. Ficam de fora Configurações, WhatsApp,
Protético, Bot, Planos, login/cadastro e onboarding — ninguém opera isso do celular no meio do
atendimento, e incluí-las estouraria o teto da spec sem ganho de uso real.

**Ordem:** pelo custo de estar quebrado, não pela facilidade de consertar.

1. **Novo agendamento** — é o único bloqueio funcional. Consertar é `max-height` + `overflow-y`.
2. **Agenda** — corta no celular *e* no tablet, por causas diferentes.
3. **Meu dia** e **Prontuário** — os dois maiores cortes, nas duas telas mais usadas.
4. **Financeiro** — densidade.
5. **Alvo de toque** — varredura transversal, depois que o layout parar de mudar.

Início, Pacientes e Orçamentos entram só pela varredura de alvo de toque.

---

## 3. Objetivo

Usar o sistema inteiro pelo celular sem que nada fique inalcançável, e sem que a tela pareça um
desktop encolhido.

---

## 4. Contrato técnico

### 4.1 Régua de aceite (os 4 critérios, definidos por ele em 14/08)

| # | Critério | Como se verifica |
|---|---|---|
| 1 | **Nada cortado sem rolagem** | `el.scrollWidth - el.clientWidth <= 4` para todo elemento cujo pai não role, em 375 e 768 |
| 2 | **Testado com o teclado aberto** | Todo formulário e diálogo conferido em **375×500** |
| 3 | **Alvo de toque ≥ 44px** | Todo `button`/`a`/`input`/`select` com altura **e** largura ≥ 44px (links de texto inline saem — ver §9) |
| 4 | **Densidade adaptada** | Grade de 3 colunas vira 1; tabela vira card; semana vira dia |

### 4.2 Diálogos — a correção estrutural

Todo diálogo passa a ter `max-height: 100dvh` (não `vh`: `dvh` acompanha o teclado no iOS) e
`overflow-y: auto`, com cabeçalho e rodapé de ação fixos e só o miolo rolando. O botão primário
**nunca** rola pra fora.

`Dialog` do shadcn é o componente único — a correção entra lá e alcança todos de uma vez.
**A conferir antes de codar:** quantos diálogos existem e se todos usam esse componente.

### 4.3 Agenda — o que muda

- **Celular:** a visão padrão deixa de ser Semana. Semana em 375px é indefensável — são 7 colunas
  de 48px. **Decisão aberta (§9).**
- **Tablet:** o cabeçalho não pode virar `sm:flex-row` — o conteúdo precisa de 1135px. Sobe pro
  breakpoint que realmente comporta, ou quebra em duas linhas.

### 4.4 Rolar vs. reflow — a regra

Orçamentos já resolve certo: tabela em `overflow-x-auto`, rola em vez de cortar. **O padrão certo
já existe no código.** Onde corta hoje, a escolha entre rolar e refluir é:

- **Rola** quando a comparação lado a lado é o valor (tabela de orçamentos, grade da semana).
- **Reflui** quando cada item se lê sozinho (cards do Financeiro, abas do Prontuário).

Rolagem horizontal **sempre** com dica visual de que há mais conteúdo — rolagem invisível é o
mesmo problema com outro nome.

---

## 5. Comportamento

| Estado | Celular | Tablet |
|---|---|---|
| Agenda | visão do dia por padrão; semana rola horizontal com dica | semana inteira, cabeçalho em 2 linhas |
| Diálogo | tela cheia, cabeçalho e ação fixos, miolo rola | centralizado, `max-height` com folga |
| Financeiro | cards em 1 coluna | 3 colunas (já cabe) |
| Prontuário | abas rolam horizontal com dica | como está |
| Meu dia | campo mágico e espelho empilhados | lado a lado (já cabe) |

---

## 6. Referência visual

**Sem artefato.** Não é redesenho — é a mesma tela cabendo. Tokens, cores, tipografia e hierarquia
não mudam. Se alguma tela precisar de decisão visual de verdade (a Agenda no celular é a
candidata), aí sim entra artefato, e só pra ela.

---

## 7. Invariantes

- [ ] **Zero mudança de comportamento.** Nenhum nome de campo, chamada de API, schema, RLS ou
      fluxo de navegação muda. Apresentação muda, o resto não
- [ ] **Desktop não regride** — toda tela conferida em 1440px depois da mudança
- [ ] Dark **e** light conferidos nos dois tamanhos
- [ ] Nenhuma migration, nenhuma policy
- [ ] Nenhum componente novo sem antes checar se já existe equivalente

---

## 8. Gates de aceite

- [ ] **G1** — as 8 rotas em **375** com zero corte sem rolagem (descontado o falso positivo §1.5)
- [ ] **G2** — as 8 rotas em **768**, idem
- [ ] **G3** — todo diálogo em **375×500** (teclado): título, fechar e botão primário alcançáveis
- [ ] **G4** — "Novo agendamento" concluído de ponta a ponta no celular, com o teclado abrindo
- [ ] **G5** — Agenda no celular: os 7 dias alcançáveis, **incluindo hoje**
- [ ] **G6** — zero alvo de toque < 44px nas 8 rotas (exceto os isentos do §9)
- [ ] **G7** — as 8 rotas em **1440px** iguais ao que eram antes (não-regressão de desktop)
- [ ] **G8** — dark e light conferidos
- [ ] **G9** — typecheck + lint + `next build` limpos

---

## 9. Fora de escopo e decisões abertas

**Fora:** Configurações, WhatsApp, Protético, Bot, Planos, login/cadastro, onboarding. PWA e app
nativo — tema próprio, e este item é pré-requisito dos dois de qualquer jeito.

**Decisões que são dele:**

1. **Agenda no celular — o que substitui a semana?** Visão do dia por padrão (mais legível, perde
   a noção de semana) ou semana rolando na horizontal (mantém a noção, exige gesto)?
2. **Alvo de toque: link de texto inline conta?** "Ver perfil completo" tem 16px de altura porque
   é texto, não botão. Forçar 44px muda o visual de várias telas. Isentar links inline e aplicar
   só a botões e campos é o padrão comum — confirmar.
3. **Isto vira o item 🔵?** Hoje o ativo é o R-108b, e o R-109 está no meio (pedaço 3 no ar,
   pedaços 1 e 2 abertos). Máximo é 1 ativo.

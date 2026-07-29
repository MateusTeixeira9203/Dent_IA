# R-27 — Redesign: modais de orçamento (tela de referência do sistema)

> **SPEC (redesign)** · **R-27** · 🔵 ativo no sub-item **R-27a**
> **Aberto:** 2026-07-29 · **Fechado:** — · **Fase:** `aprovada` (Mateus, 29/07: *"pode fechar a
> spec e começar a codar"*) · **Modelo:** Sonnet na execução — as decisões estão travadas.
>
> **Depende de nada pra começar.** Mas ver **§3.6**: duas mudanças de ESCRITA ficaram de fora
> (item **R-28**) e sem elas a tela nova exibe dado que o banco não tem.

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Modal de detalhe do orçamento + modal de novo orçamento |
| **Tipo** | redesign de tela existente |
| **Rota** | `/dashboard/pacientes/[id]` (aba Orçamentos) |
| **Arquivos envolvidos** | `src/app/dashboard/pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx` (894 linhas) · `.../novo-orcamento-modal.tsx` (398) · estado no pai `paciente-detail-client.tsx` |
| **Intenção declarada** | Se aprovada, esta vira **a referência visual replicada no resto do sistema** |

## 1. Estado atual

> Eu faço o inventário, **você confere**. Não alterei nada nesta fase.
> Exceção declarada: a correção de fonte abaixo, que é bug, não redesign.

### 1.0 Achado que antecede o redesign — o app inteiro estava em Times New Roman

Medido no renderizado (`getComputedStyle`), não deduzido de print:

| | Antes | Depois |
|---|---|---|
| `--font-sans` no `:root` | *(vazio)* | `'Outfit', 'Outfit Fallback'` |
| `body` / botões / inputs | `"Times New Roman"` | `Outfit` |
| `h1–h6` (`font-heading`) | DM Serif Display | DM Serif Display *(inalterado)* |
| valores (`font-mono`) | DM Mono | DM Mono *(inalterado)* |

Causa: `globals.css:267` declarava `--font-sans: var(--font-sans)` dentro de `@theme inline`,
sobrescrevendo a definição boa da linha 223 (`var(--font-outfit)`). O modificador `inline` faz o
Tailwind **não emitir** a variável no `:root`, então `font-sans` apontava pra nada e o browser caía
no serifado padrão. É o achado de emergência do R-22, corrigido como `/pontual` (1 linha).

**Consequência pro redesign:** os prints que motivaram este item foram tirados com a fonte errada.
Toda a percepção de "amador/serifado" nos rótulos vinha daí. **Rever a tela antes de decidir o §3.**

### 1.1 Componentes de UI

Nenhum componente próprio de orçamento — os dois modais são JSX inline. Tudo vem do shadcn:
`Dialog`/`DialogContent`/`DialogTitle`/`DialogDescription` (com `showCloseButton={false}`),
`Button`, `Input`, `Label`, `Select*`, mais 19 ícones do lucide-react.

### 1.2 Estrutura

```
DialogContent  rounded-3xl · w-[94vw] sm:w-[78vw] · maxHeight 90vh · p-0
 ├─ Header      faixa com gradiente teal fixo, ~96px, título + badge de status + barra de progresso
 └─ Body        2 colunas (empilha no mobile)
     ├─ Esquerda  flex-1, scroll próprio — CTA de aprovação · pills de status · auditoria ·
     │            procedimentos · pagamentos · atividade
     └─ Direita   w-72 (288px), scroll próprio + rodapé fixo — card do total ·
                  registrar pagamento / parcelas · Fechar · Excluir
```

Duas áreas de scroll independentes dentro de um `maxHeight: 90vh` — é isso que produz as duas
scrollbars visíveis nos prints.

### 1.3 Padrões repetidos — o vocabulário real da tela

| Elemento | Classe que se repete | Ocorrências |
|---|---|---|
| Rótulo de seção | `text-xs font-bold uppercase tracking-widest text-teal` | 5 |
| Card / bloco | `rounded-2xl border border-border` + `p-4`/`p-5` | 6 |
| Valor monetário | `font-mono` (sempre) | todas |
| Botão primário | `bg-teal text-white hover:bg-teal-lt rounded-xl font-semibold` | 4 |
| Escala de raio | `3xl` modal · `2xl` cards · `xl` campos/botões · `lg` chips · `full` barras | 5 raios |

### 1.4 Exceções — onde a tela quebra o próprio padrão

| Achado | Detalhe | Contagem |
|---|---|---|
| Paleta crua do Tailwind | `red-*` · `yellow-*` · `amber-*` — **existem tokens exatos** (`coral`/`coral-pale`/`coral-ink`, `warning`/`warning-pale`/`warning-ink`) | 26 · 8 · 7 (detalhe) · 5 · 0 · 9 (novo) |
| `white` hardcoded | `text-white`, `bg-white/20`, `from-white/10` | 18 (detalhe) · 5 (novo) |
| Hex / rgba inline | gradiente do header `#2f9c85 → #1a7a65` · fundo da coluna direita `rgba(47,156,133,0.04)` · card do total `rgba(47,156,133,0.07)` | 6 · 6 |
| Fundo de campo divergente | esquerda usa `bg-surface`, direita usa `bg-surface-alt` — mesmo tipo de campo, fundo diferente | — |
| Par light/dark manual | `bg-red-50 dark:bg-red-900/10` no estado "vencido" — único lugar que trata os dois modos na mão | 1 |
| Duas fontes de rótulo de status | `STATUS_OPTIONS` local **e** `STATUS_ORCAMENTO` de `@/lib/constants/orcamento-status`, ambos no mesmo arquivo | — |

### 1.5 Onde a lógica está acoplada à apresentação

Isto é o que torna o redesign arriscado — não a aparência:

- **30 props** na interface `Props`. Todo o estado (formulários, saving, erros, modo edição) mora
  no pai `paciente-detail-client.tsx`. Qualquer recorte visual mexe nessa superfície.
- **`useMemo` de regra de negócio dentro do modal** (`:180`) — calcula `totalPago`, `pctPago`,
  `quitado`, `restante`, **incluindo o arredondamento pra centavo do badge "Quitado"** corrigido em
  28/07. Isso é cálculo financeiro na camada de apresentação.
- **Query Supabase direta no componente** (`:149`) — busca `activity_logs` num `useEffect` com
  `setState` síncrono; é um dos 24 casos do R-25.
- **Timing simulado na UI** — `handleApprove` espera 600ms artificiais e `handleStatusChangeSafe`
  trava por 1200ms. O feedback não vem do dado, vem do relógio.
- Mapas de rótulo (`ACTION_LABEL`, `FORMA_LABEL`, `FORMA_ICON`) declarados no arquivo.

**Sua conferência:**

## 2. O que NÃO pode mudar — trava de segurança

> Proposta minha, **você confirma ou corrige**. Nada marcado é assumido intocável por padrão:
> **apresentação muda, o resto não.**

- [x] **Nomes de campos e variáveis** — nenhum rename nesta passada
- [x] **Regras de negócio** — o `useMemo` de `quitado`/`restante` pode **mudar de lugar**, mas
      **não de conteúdo**: o arredondamento pra centavo é correção de bug de 28/07 e não regride
- [x] **Chamadas de API** — `onRegistrarPagamento`, `onGerarParcelas`, `onStatusChange`,
      `onSalvarEdicaoOrc`, `onExcluirPagamento`, `onDeleteClick` continuam com a mesma assinatura
- [x] **Estrutura do banco** — zero migration neste item
- [x] **Fluxo de navegação** — abrir/fechar o modal, modo edição e modo parcelas seguem iguais
- [ ] **Outros:**

## 3. O que eu quero

> **Ditado pelo Mateus 29/07, transcrito. Não é inferência minha.**
> As linhas marcadas *(falta)* ele ainda não respondeu — eu **não** preencho.

**Sensação pretendida:** ar de **profissionalismo**. Não é que pareça amador de propósito — é que
**foi feito faz tempo e hoje não acompanha o design que já existe no resto do sistema**.

**O problema não é estética, é disposição.** Palavras dele: *"a disponibilização das coisas fica
muito ruim"*. O critério de sucesso é operacional:

> **O dentista não pode precisar ficar scrollando pra ver.** Tem muita informação — data, seleção
> de forma de pagamento, valores — e ela precisa estar **organizada**, não empilhada.

**Problemas concretos de hoje:**

1. **Scroll pra ver informação básica** no modal de orçamento. (Causa levantada no §1.2: são
   **duas áreas de scroll independentes** dentro de `maxHeight: 90vh` — é layout, não CSS.)
2. **Agendamento já criado: o X do modal fica em cima do "Ver ficha".** Confirmado no código e
   **é estrutural**: `DialogContent` põe o X em `absolute top-2 right-2` sem reservar espaço
   (`dialog.tsx:68`), e o modal de agendamento alinha "Ver Ficha" à direita em `pt-6`
   (`agendamentos-client.tsx:1834`). **Vale pra qualquer modal do sistema** que use o canto
   superior direito — o de orçamento só escapa porque passa `showCloseButton={false}`.
3. **Criar novo agendamento é um "painelzinho lateral pequenininho"** — ele quer que seja um
   painel deste mesmo estilo (o modal grande), não um sheet estreito.

**Mudanças, item por item:**

| Elemento | Como está | Como quero |
|---|---|---|
| Cabeçalho | Faixa teal com gradiente hardcoded, ~96px, título + badge + barra de progresso | *(falta)* |
| Colunas | Esquerda flex-1 e direita 288px, **duas áreas de scroll independentes** | **Sem obrigar scroll** pra ver o essencial — organização, não empilhamento |
| Card do total | `rounded-2xl`, fundo teal 7%, valor `font-mono text-3xl` — quebra em 2 linhas na largura atual | *(falta)* |
| Lista de procedimentos | Linhas com badge numerado, borda inferior, faixa de total em `bg-teal/5` | *(falta)* |
| Formulário de pagamento | Campos empilhados em `bg-surface-alt`, botão teal cheio | Data e forma de pagamento **organizadas**, não em fila vertical longa |
| Botões e ações | Fechar + Excluir empilhados no rodapé da direita, ambos `variant="outline"` | *(falta)* |
| Estados (vazio, erro, carregando) | Vazio só em procedimentos; erro em texto vermelho; carregando via `Loader2` | *(falta)* |
| **X de fechar (compartilhado)** | `absolute top-2 right-2`, sem espaço reservado — colide com ação no canto | Não pode sobrepor conteúdo em modal nenhum |
| **Novo agendamento** | Painel lateral estreito (`Sheet`) | Painel no estilo do modal grande |

**Referências:** o `CLAUDE.md` já declara a referência oficial do projeto — **Dashboard e
Tratamento**. O R-27 mede contra essas duas telas; não inventa direção nova. É literalmente a
resposta ao *"não acompanha o design já dentro do sistema"*: existe alvo declarado.

### 3.1 Escopo confirmado — o item cobre mais que orçamento

O pedido dele atravessa telas. O recorte acordado (§6): **modal de orçamento é a tela de
referência**; agendamento é o **primeiro alvo de replicação**, não parte da referência.

| Alvo | Papel |
|---|---|
| `DetalheOrcamentoModal` | **referência** — é onde a direção é aprovada |
| `DialogContent` (X sobrepondo) | correção de padrão compartilhado, entra junto da referência |
| Modal de agendamento (view) | replicação 1 |
| Novo agendamento (`Sheet` → painel) | replicação 2 |

### 3.2 Referência visual — artefato de exploração

`plans/artefatos/R-27a-modais-orcamento.html` — servir por HTTP local
(`node scratchpad/serve-artefatos.mjs plans/artefatos 4321`), **nunca `file://`**, nunca lido
pro contexto. Tokens usados nele foram **extraídos por JS** do app em `localhost:3000`, dark e
light, não deduzidos de print.

Traz 3 direções para o modal de orçamento, no caso real do print (R$ 350,00 + R$ 1.000,00 =
R$ 1.350,00, zero pagamentos), todas na moldura da produção (1100×600 ≈ 78vw × 90vh):

| Direção | Ideia | Ganha | Perde |
|---|---|---|---|
| **A · Abas** | Paginar a informação em abas | Elimina rolagem por construção, com qualquer volume | Nunca vê procedimentos e pagamentos juntos |
| **B · Documento + faixa** | Coluna única; card do total vira faixa horizontal de 4 números; formulário sob demanda | Lê como documento; tudo convive | Registrar pagamento custa 1 clique a mais — é a operação mais frequente da secretária |
| **C · Cockpit** | Mantém 2 colunas e mata a causa: painel direito sem rolagem, campos em grade 2×2 | Registrar pagamento continua a zero clique | Continua 2 colunas — no mobile empilha e o problema volta |

**Verificação por geometria** (não no olho), medida no browser:

| Caso | Largura | Rola? |
|---|---|---|
| Orçamento · A / B / C | 1098px | não |
| **Agendamento hoje** | **510px** (`max-w-lg`) | **sim, +28px** |
| Agendamento com B aplicada | 718px | não |

### 3.3 Achado do 2º caso — o agendamento não cabe em si mesmo

Hipótese inicial errada minha, corrigida ao ler o código: o modal de agendamento **não é
esparso**. É denso num box de 512px — status, nome, data/hora, dentista, criado por, observações,
4 chips de status, select de 7 opções, botão de assinatura, botão de mensagem por IA e 4 ações de
rodapé. **Transborda em 28px com observação curta**, e isso é o piso.

Consequência: pro agendamento o remédio principal **não é reorganizar, é largura**. Isso também
explica o "painelzinho lateral pequenininho" do *novo* agendamento (hoje um `Sheet`).

### 3.4 Decisão travada — direção final

> Histórico: C+B foi escolhido primeiro e **revisto pelo Mateus na mesma sessão** ao ver o
> render — "tem muito dado redundante" e "os status acabam atrapalhando". A escolha final é **A**.

**ORÇAMENTO → abas, sem seletor de status, com foco em pagamento.**
**AGENDAMENTO (detalhe e criação) → aprovado como está no artefato** (cabeçalho com canto
reservado + faixa de números + coluna de ação fixa + rodapé).

Não é a mesma forma nas duas telas, e isso é deliberado: o orçamento tem informação **de sobra
e espaço de sobra** (abas paginam), o agendamento tem informação de sobra e **largura de menos**
(alargar resolve). O que é comum, e é o padrão de sistema de verdade: **cabeçalho com o canto
direito reservado, uma faixa/linha de números quando há números, área de ação que não rola,
rodapé próprio.**

#### Anatomia do modal de orçamento

```
Cabeçalho   Orçamento · <data>                  R$ X de R$ Y pagos   ⋯   ✕
            └ a 100%: a linha vira o selo ✓ QUITADO
Abas        Procedimentos (n) │ Pagamentos (n) │ Registrar pagamento │ Atividade
Conteúdo    (a aba ativa ocupa a área inteira — nunca rola no caso típico)
Rodapé      Excluir                                        Editar   Fechar
```

| Aba | O que mostra |
|---|---|
| **Procedimentos** | lista + linha de Total (como hoje) |
| **Pagamentos** | faixa `Recebidos n de N` · `Formas` · `Dividido em N×` · `Falta receber R$` + lista com forma, parcela *n/N*, data e **quem registrou** |
| **Registrar pagamento** | **porcentagem 0–100%** grande + barra, e formulário em grade 2×2. **Sem repetir o valor total** — ele mora no cabeçalho. A 100% o formulário sai e entra o card *"Recebido neste orçamento — R$ Y · n pagamentos · formas · último em dd/mm"* |
| **Atividade** | `activity_logs` do orçamento (como hoje, só que com lugar próprio) |

#### O que sai da tela, e o número que justifica

| Sai | Justificativa medida (banco, 29/07) |
|---|---|
| **3 pills de status** | `enviado` e `recusado` existem em **2 de 52** orçamentos. As transições continuam existindo, no `⋯` |
| **CTA "Orçamento aguardando aprovação"** | só renderiza com `status='enviado'` = **1 de 52**. É UI praticamente morta |
| **Card "Total do tratamento"** no painel | redundante: o total já está na linha de Total da tabela e no cabeçalho |
| **Contagem de procedimentos** em destaque | redundante: a lista mostra |
| **Gradiente teal do cabeçalho** | hex hardcoded (`#2f9c85 → #1a7a65`), quebra a regra de token |

> ⚠️ **`⋯` não é decorativo — é o que evita regressão.** 28 dos 34 orçamentos aprovados têm
> `aprovado_em`, gravado **só** pelo caminho manual: hoje as pills **são** o mecanismo de
> aprovação. Elas saem do caminho principal, **não do sistema**. O `⋯` chama a mesma
> `atualizarStatusOrcamento(id, status)`, mesma assinatura, mesmos 3 valores.

**Correção de cor junto (aprovada):** `teal-pale` **não é superfície**. O mesmo token pesa
diferente nos dois temas — `#e4f4f1` sobre branco é um tingimento de nada, `#1e3a35` sobre
`#111112` lê como bloco. Regra que fica: **cor carrega significado, não preenche área.** Teal só
em valor, ação primária, estado ativo e acentos pequenos. Medido no artefato: maior bloco verde
caiu de ~188.700 px² (painel inteiro) para 2.304 px² (um chip).

### 3.6 O que esta spec NÃO conserta — vira R-28 (backend)

Duas mudanças de **escrita**, fora da trava do §2. A tela nova exibe estes dados; sem o R-28 ela
os exibe vazios ou errados.

| # | Problema | Medida | Correção |
|---|---|---|---|
| 1 | **"Quem registrou o pagamento" não existe** | **0 de 83** pagamentos têm `marcado_por_id`. Só `marcarPagamentoPago` grava; `registrarPagamento`, `registrarPagamentoRapido` e `gerarParcelas` não | Gravar `marcado_por_id` nos 3 inserts. **Histórico nunca preenche** — só vale dali pra frente |
| 2 | **Status apodrece sem as pills no caminho principal** | **39** orçamentos têm pagamento, **34** estão `aprovado` → **5 já dessincronizados hoje**. `registrarPagamento` só auto-aprova quando `status='enviado'` (1 de 52) | Decidir quem marca aprovado ao registrar pagamento — hoje só `registrarPagamentoRapido` faz, incondicionalmente |

**Ordem:** R-27a **não depende** do R-28 pra subir (o `⋯` preserva a aprovação manual). Mas
enquanto o R-28 não entrar, o campo "registrado por" mostra vazio — e isso precisa aparecer como
"—", nunca como nome inventado ou coluna escondida.

### 3.5 Novo agendamento — o atrito é o formulário, não o botão

Relato dele (29/07): *"já é uma faixa lateral, coloca o nome, tem que colocar data e tem que rolar
pra baixo pra clicar — muito atrito."*

**Diagnóstico corrigido pela leitura do código** (`agendamentos-client.tsx:1211`): o botão "Salvar
Agendamento" **já está em rodapé fixo** (`shrink-0`, fora da rolagem) — ele não some. O que obriga
a rolar é o **corpo do formulário**: `Sheet` de 560px com 6 grupos de campo empilhados em coluna
única (Dentista · Paciente com autocomplete · Data · Hora · Duração com chips + campo livre ·
Observações) mais um card de resumo no fim — o resumo, que confirma o que está sendo criado, só
aparece depois de rolar.

> ⚠️ **Não medido em runtime.** Tentei abrir o sheet por script pra medir o excedente real e não
> consegui (clique programático não dispara o `Sheet`; a árvore de acessibilidade não expôs o
> botão). O excedente em px continua **não verificado** — medir na execução.

Consequência: mesmo remédio do §3.3 — **largura e grade**, não painel mais alto. Data/Hora/Duração
numa linha, Paciente/Dentista noutra, resumo ao lado em vez de no fim.

### 3.7 Execução (29/07) — o que foi codado e achados de execução

**Codado e verificado (`tsc --noEmit` + `next build`, exit 0) nas 3 superfícies** — detalhe do
orçamento (abas), detalhe do agendamento, novo agendamento. Achados que não estavam no artefato:

- **Detalhe do agendamento tinha o mesmo bug do X** relatado pelo Mateus: `DialogContent` padrão
  desenha o X em `absolute top-2 right-2` sem reservar espaço, e "Ver Ficha" também se ancorava no
  canto direito — colidiam por construção. Mesmo conserto do orçamento: `showCloseButton={false}`
  + X próprio no cabeçalho.
- **Novo agendamento vira `Dialog` largo** (era `Sheet` de 560px) — mesma anatomia das outras
  duas: cabeçalho com canto reservado, faixa ao vivo (Paciente/Data/Hora/Duração preenchendo em
  tempo real), coluna de ação fixa (Quando + Duração + Salvar/Cancelar), corpo rolável só na
  coluna principal. O card "Pronto para agendar" que ficava no fim do formulário foi **removido**
  — a faixa do topo cumpre o mesmo papel, sem esperar o fim pra confirmar.
- **Chips de duração reduzidos de 9 para 6** (30/45/60/90/120/180min) pra caber na coluna de
  296px — 240/300/360min saíram dos atalhos, mas o campo livre (`Ou: __ min`) continua aceitando
  qualquer valor, sem perda de capacidade.
- **Contraste corrigido de carona:** o botão "Marcar mesmo assim" (conflito de dentista) era
  `bg-amber-500 text-white` — hex fixo, nunca mudava de tema. Trocar pro token `warning` com
  `text-white` teria **piorado** no escuro (`warning` fica mais claro lá, não mais escuro). Virou
  `bg-warning-pale border-warning text-warning-ink`, mesmo padrão pale/ink do coral.
- **Correção de cor no orçamento (aprovada):** `teal-pale` **não é superfície**. O mesmo token
  pesa diferente nos dois temas — `#e4f4f1` sobre branco é um tingimento de nada, `#1e3a35` sobre
  `#111112` lê como bloco. Regra que fica: **cor carrega significado, não preenche área.** Teal só
  em valor, ação primária, estado ativo e acentos pequenos. Medido no artefato: maior bloco verde
  caiu de ~188.700 px² (painel inteiro) para 2.304 px² (um chip).
- **Fora do escopo, deliberadamente não tocado:** os modos "Editar" e "Confirmar exclusão" do
  mesmo Dialog de agendamento ainda usam `red-500`/`amber-500` hardcoded — não estavam no
  artefato aprovado, e ampliar o escopo no meio da execução vai contra a trava do §2. Fica
  registrado como pendência pequena, não como bug novo.

**Não verificado ainda:** giro visual real no browser (abrir cada modal, trocar as 4 abas, mudar
status pelo `⋯`, medir rolagem nos 2 temas) — build e typecheck não confirmam nenhum disso.
Continua 🟡 até esse giro acontecer.

## 4. Tokens — fonte única da verdade

> Vivem em `src/app/globals.css`. **Já existem e estão sendo contornados** (§1.4) — o redesign
> não precisa criar token novo, precisa parar de burlar os que existem.

| | |
|---|---|
| **Cores** | primária `teal` · variações `teal-lt`/`teal-pale`/`teal-dark`/`teal-ink` · negativo `coral`/`coral-pale`/`coral-ink` · alerta `warning`/`warning-pale`/`warning-ink` · neutro `slate`/`slate-pale`/`slate-ink` · superfícies `bg`/`surface`/`surface-alt`/`border` · texto `text-primary`/`text-secondary`/`text-muted` |
| **Tipografia** | títulos DM Serif Display (`font-heading`) · corpo/UI **Outfit** (`font-sans`, corrigido em §1.0) · valores DM Mono (`font-mono`) |
| **Espaçamento** | escala Tailwind padrão; a tela usa 1.5 / 2 / 3 / 5 / 6 / 8 |
| **Raio de borda** | `3xl` modal · `2xl` card · `xl` campo/botão · `lg` chip · `full` barra |
| **Sombras** | `premium-shadow` e `teal-glow` existem no `globals.css`; **o modal não usa nenhuma das duas** |
| **Arquivo onde vivem** | `src/app/globals.css` |

## 5. Gates de aceite

- [ ] Nenhuma alteração fora do escopo do §2
- [ ] **Zero** valor de cor hard-coded: os 26 `red-*`, 8 `yellow-*`, 7 `amber-*`, 18 `white` e
      6 hex/rgba inline viram token (contagem confere em `grep` no fim)
- [ ] Responsivo nas larguras que você usa de verdade — incluindo o mobile, onde as colunas empilham
- [ ] Estados de vazio / erro / carregando tratados
- [ ] Dark **e** light conferidos (o par manual `red-50`/`red-900` do §1.4 é o candidato a quebrar)
- [ ] O badge "Quitado" continua aparecendo no mesmo caso — a lógica de arredondamento não regrediu
- [ ] Diff revisado por você, arquivo por arquivo

**Gates específicos da direção final:**

- [ ] **Nenhuma pill de status** no caminho principal; as 3 transições existem no `⋯` e chamam
      `atualizarStatusOrcamento` com a **mesma assinatura** — testado mudando status de verdade
- [ ] As 4 abas trocam sem remontar o modal e **sem rolagem** no caso típico (2 procedimentos,
      até 3 pagamentos)
- [ ] Cabeçalho mostra `R$ X de R$ Y pagos`; ao atingir 100% **some a linha e entra o selo
      Quitado** — verificado com um orçamento realmente quitado (item aberto desde 28/07)
- [ ] Aba **Registrar pagamento** mostra porcentagem, **não** repete o valor total
- [ ] Aba **Pagamentos** mostra `Recebidos n de N` · formas · `Dividido em N×` · falta receber,
      batendo com o banco pro mesmo orçamento
- [ ] **"Registrado por" mostra "—"** enquanto o R-28 não entrar — nunca nome inventado, nunca
      coluna escondida
- [ ] `grep` final: **zero** `red-*`, `yellow-*`, `amber-*` e hex/rgba inline nos arquivos tocados

> **Exceção declarada ao gate de cor:** `text-white` **permanece** sobre fundo sólido `bg-teal`.
> Não é risco de tema — teal é `#2f9c85` em claro **e** escuro, então o par não muda, e é a
> convenção do app inteiro. O que o gate mira (`bg-white`, `text-black`, cor de paleta crua sobre
> superfície temática) está zerado.
> **Corrigido de carona:** `bg-coral text-white` no botão de confirmar exclusão de pagamento
> reprovava no escuro — coral vira `#ef9a9a` (rosa claro) e branco em cima dá ~1,9:1. Virou
> `bg-coral-pale` + `text-coral-ink`, que passa nos dois temas.

## 6. Fluxo de execução

```
Inventário (§1 ✅) → você preenche §3 → protótipo em artefato → sua aprovação visual
   → código em UMA tela de referência → localhost → produção → replicar nas demais
```

**Uma tela primeiro, sempre.** Você disse "se aprovar a gente usa de base pro sistema" — é
exatamente este passo. Replicar antes da aprovação multiplica o erro.

## 7. Pós-entrega

- [ ] Diff revisado
- [ ] Testado em localhost
- [ ] Subido pra produção
- [ ] Tokens atualizados, se algum mudou
- [ ] Item fechado no `ROADMAP.md` e spec + artefato movidos pro `_arquivo/` *(ato atômico)*

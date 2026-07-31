# R-39 — Redesign: orçamento e dinheiro, um esqueleto só

> **SPEC (redesign)** · **R-39** · ⏳ fila
> **Aberto:** 2026-07-30 · **Fechado:** — · **Fase:** contrato
> **Modelo:** Sonnet 5 (execução — o design já está aprovado, as decisões de produto estão fechadas aqui)
> **Referência visual:** `plans/artefatos/R-39-orcamento-painel-unico.html` — **aprovado 30/07**
> ("ficou exatamente o que eu queria"). 6 telas no seletor do topo.

## 0. Identificação

| | |
|---|---|
| **Tipo** | redesign de telas existentes + 1 bloco novo (o funil) |
| **Rotas** | `/dashboard/pacientes/[id]` · `/dashboard/orcamentos` · `/dashboard/financeiro` |
| **Arquivos** | `modals/novo-orcamento-modal.tsx` · `modals/detalhe-orcamento-modal.tsx` · `components/orcamentos/aceite-orcamento-modal.tsx` · `orcamentos/_components/orcamentos-client.tsx` · `financeiro/_components/financeiro-client.tsx` |
| **Migration** | **zero.** Nenhuma coluna, nenhuma policy, nenhuma RPC nova |

## 1. Estado atual — inventário

Levantado 30/07 lendo os arquivos, não de memória.

**O atrito que motivou o item:** "Registrar pagamento" é um `Dialog` de `max-w-md`
**dentro** do `DialogContent` do detalhe (`detalhe-orcamento-modal.tsx:748`). Modal sobre
modal, num gesto que acontece com o paciente esperando no balcão.

**As duas telas de orçamento têm esqueletos diferentes sem motivo:**

| | Criar (`novo-orcamento-modal`) | Criado (`detalhe-orcamento-modal`) |
|---|---|---|
| Cabeçalho | banner com gradiente **hardcoded** `linear-gradient(135deg,#2f9c85,#1a7a65)` (`:114`) | cabeçalho calmo, sem gradiente (R-27a) |
| Corpo | 2 colunas: itens · resumo `w-64` | 3 abas numa coluna só |
| Ação principal | pé da coluna direita | rodapé + diálogo aninhado |

O `novo-orcamento-modal` ainda carrega `text-red-400`, `bg-amber-500/10`,
`text-emerald-600` e `rgba(47,156,133,…)` — cor fora de token, proibida pelo `CLAUDE.md`.

**Conferência do Mateus (30/07):** aprovado. A tela de criar precisa continuar sendo
"principalmente os procedimentos", com nome, quantidade e **valor editável**, porque a
maioria dos procedimentos não está no catálogo.

## 2. O que NÃO pode mudar — trava de segurança

- [x] **Assinaturas dos 13 exports de `orcamentos/actions.ts`** e dos 15 de
      `financeiro/actions.ts`. Isto é redesign de apresentação: nenhuma action muda de forma.
- [x] **As 9 regras de `registrarPagamentoRapido`** (R-34 §7) — em especial a regra 2
      (existe parcela aberta → delega ao UPDATE, nunca INSERT) e a 4 (sem parcela e já tem
      pago → INSERT do saldo, não do total).
- [x] **I1–I6 da [R-34](R-34-plano-de-pagamento.md)**, com destaque para I1
      (`coalesce(valor_acordado, total)`, nunca `total` cru) e I4 (parcela fecha por UPDATE).
- [x] **RPCs `gerar_parcelas_orcamento`, `definir_plano_avista`, `aceitar_orcamento`** —
      contrato intacto. O visual não encosta em `SECURITY DEFINER`.
- [x] **Snapshot do aceite** (migration 113): o que o paciente assinou é imutável. Mexer no
      layout do aceite **não** pode alterar o que entra no snapshot.
- [x] **RLS:** `can_see_orcamento` (R-32) e as policies de `orcamentos`/`pagamentos`. Zero toque.
- [x] **Nomes de campo:** `total`, `valor_acordado`, `desconto`, `condicoes_pagamento`,
      `plano_forma`, `plano_parcelas`, `parcela_numero`, `total_parcelas`, `marcado_por_id`.
- [x] **Fluxo de navegação:** perfil do paciente → aba Orçamentos → card → modal.
      A lista de `/dashboard/orcamentos` continua abrindo o detalhe (o painel lateral morre
      na [R-33](R-33-orcamento-tela-unica.md), não aqui).
- [x] **Gate de papel:** admin vê e não edita (R-32). Secretária mantém o que já pode.

> Fora desta lista: **apresentação muda, o resto não.**

## 3. O que o Mateus quer — registrado da conversa de 30/07

Palavras dele, transcritas na hora (print não sobrevive à sessão):

**Sensação pretendida:** *"aquele outro design mais moderno, mais tranquilo"* virando o
padrão do sistema. *"O outro é bem mais organizado, mas você precisa ser rápido e fácil
pro dentista ajeitar."*

**O pedido concreto:** *"reaproveitar aquela tela que tem de registrar pagamentos, onde
consegue dividir, usar exatamente aquele design, botar os procedimentos do lado, aumentar
o tamanho do painel… e a gente mata esse atrito."*

**Sobre a tela de criar:** *"a do orçamento é principalmente os procedimentos, o valor
precisa ser editável porque não é todo procedimento que está salvo; a quantidade eu
preciso, e valor pra salvar, e o nome. O funcionamento tem que ser o mesmo."*

**Sobre a coluna do dinheiro:** *"a gente pode aumentar um pouco a largura da coluna."*
→ 384px na proposta inicial, **416px** no aprovado.

| Elemento | Como está | Como quero |
|---|---|---|
| Esqueleto | criar e criado com layouts diferentes | **um só**: esquerda procedimentos, direita dinheiro |
| Registrar pagamento | diálogo aninhado (modal sobre modal) | **coluna permanente à direita**, sem modal |
| Lista de parcelas | aba "Pagamentos" | **na coluna do dinheiro**, acima do formulário; clicar numa pendente preenche o formulário abaixo |
| Ação principal | rodapé, varia por tela | **sempre no pé da coluna da direita** |
| Cabeçalho do criar | banner com gradiente | cabeçalho calmo, igual ao do detalhe |
| Editor de item | cartão alto, 2 campos de nome | linha compacta: nome · qtd · valor · remover |
| Abas restantes | Procedimentos / Pagamentos / Atividade | Procedimentos / Atividade |

**Decisão travada:** a lista de parcelas mora na coluna da direita ("coluna do dinheiro"),
escolhida por ele entre 3 opções apresentadas com preview.

**Decisão tomada 30/07 — um campo só.** Hoje cada item tem um `Select`
"Vincular ao catálogo (preenche preço)" **e** um `Input` "Descrição". Passa a ser **um**
campo com sugestão do catálogo enquanto digita; o aviso "fora do catálogo" vira botão
inline que cadastra pelo preço já digitado. Ele confirmou explicitamente.

O que **não** muda com isso, e vira gate (G5): o vínculo com o catálogo continua
existindo no dado (`procedimentoId`), o preço continua sendo pré-preenchido ao escolher
uma sugestão, e continua sendo possível salvar procedimento que **não** está no catálogo —
que é a maioria. É colapso de dois widgets, não de duas capacidades.

## 4. Tokens — extraídos do artefato, não deduzidos

Todos vêm de `src/app/globals.css`. Nenhum valor novo é criado por este item.

| | |
|---|---|
| **Cores** | `--teal` `#2f9c85` · `--teal-lt` `#5dbeb0` · `--teal-ink` (`#1e7060` claro / `#5dbeb0` escuro) · `--coral-ink` · `--warning-ink` · `--surface` · `--surface-alt` · `--border` · `--text-primary/secondary/muted` |
| **Tipografia** | título `--font-heading` (DM Serif Display) · corpo `--font-sans` (Outfit) · número `--font-mono` (DM Mono) |
| **Espaçamento** | 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 |
| **Raio** | modal 24px (`rounded-3xl`) · cartão 16px (`rounded-2xl`) · campo e botão 12px (`rounded-xl`) |
| **Larguras** | modal `82vw` até 1280px · coluna do dinheiro **416px** (384px em notebook) · empilha abaixo de 900px, dinheiro **acima** dos procedimentos |
| **Fundo da coluna** | `color-mix(in srgb, var(--teal) 4%, var(--surface))` — some no `--surface` puro, funciona nos dois temas |

**Proibido, e é o que sai:** o gradiente `#2f9c85 → #1a7a65`, `text-red-400`,
`bg-amber-500/10`, `text-emerald-600`, `rgba(47,156,133,…)`.

## 5. O funil — o bloco novo

Substitui os 3 cards de `/dashboard/orcamentos` (`orcamentos-client.tsx:792-836`) e passa
a viver no `/dashboard/financeiro`. Motivo: os números **já formam uma cadeia** que hoje
está partida em duas páginas.

```
Aguardando  →  Aprovado no mês  →  Receita prevista  →  Recebido no mês
 (enviado)                          (já existe no          (extrato)
                                     Financeiro)
```

### 5.1 O defeito que o funil revela — e que precisa ser corrigido junto

As três métricas de hoje **medem janelas diferentes** e o rótulo mente:

| Métrica | Filtro real (`orcamentos-client.tsx:369-385`) | Janela |
|---|---|---|
| "Aprovados **(Mês)**" | `status='aprovado' && created_at >= início do mês` | **mês** |
| "Aguardando" | `status='enviado'` — **sem filtro de data** | **todo o histórico** |
| "Taxa de Conversão" | `count(aprovado) / count(status<>'rascunho')` — **ambos sem data** | **todo o histórico** |

Empilhar isso num funil seria mentir: funil afirma que os números são etapas da mesma
coorte, e dois deles não são. **O funil roda numa janela só** — o mês corrente, obedecendo
o navegador de mês que o Financeiro já tem. A taxa de conversão passa a ser da mesma
coorte (aprovados do mês ÷ não-rascunhos do mês), o que muda o número exibido: hoje ele é
estável e pouco informativo porque acumula anos.

### 5.2 Gate por plano — risco medido, não hipotético

`/dashboard/financeiro` é travado por `temFeature(plano, 'financeiro')`
(`sidebar-content.tsx:77`); `/dashboard/orcamentos` não é. Mover os números para lá
poderia tirá-los de quem já os vê.

**Conferido:** os dois planos existentes (`planos.ts:61` e `:81`) têm `financeiro: true`.
O único caso que trava é `plano` nulo (`temFeature` devolve `false` sem plano). Logo o
risco **não é alcançável hoje** — mas o funil não deve ser a única casa desses números
sem que alguém decida isso conscientemente.

### 5.3 Quem vê

Hoje os 3 cards são `{!isSecretaria && …}` (`:792`) — **o dentista vê, a secretária não.**
O funil herda exatamente esse gate. Não é este item que reabre a discussão.

## 6. Invariantes

| # | Invariante |
|---|---|
| I1 | Nenhuma action muda de assinatura. Se o diff tocar a assinatura de uma action, o recorte está errado |
| I2 | Zero migration. Se aparecer necessidade de coluna, o item para e vira sub-item próprio |
| I3 | Todo número exibido continua vindo da mesma fonte de hoje — o redesign **não** recalcula nada, salvo a janela do funil (§5.1), que é mudança declarada |
| I4 | Clicar numa parcela pendente na coluna do dinheiro chama o **mesmo** caminho de `onIniciarFechamentoPagamento` de hoje (fecha por UPDATE — I4 da R-34) |
| I5 | Todo valor visual sai dos tokens do §4 — zero hex, zero `gray-*`, zero `text-white` sobre fundo colorido sem par `-ink` |
| I6 | O snapshot do aceite continua recebendo exatamente os mesmos campos |

## 7. Ordem de execução — 3 sub-itens

O item inteiro estoura o teto de spec e mistura riscos muito diferentes (dinheiro vs.
lista vs. dashboard). Executa em três, do mais arriscado ao mais barato — a tela de
referência é a **R-39a**, e nada replica antes dela estar aprovada em localhost.

| Sub-item | Escopo | Peso | Risco |
|---|---|---|---|
| **R-39a** | Esqueleto único em criar + criado. Mata o diálogo aninhado. Coluna do dinheiro com parcelas + formulário + ação no pé | M | **alto** — é a tela que movimenta dinheiro |
| **R-39b** | Aceite (mesmo esqueleto) + coluna "Pago" na lista de `/dashboard/orcamentos` | P | médio — a coluna "Pago" precisa de dado que a query da lista talvez não traga; conferir antes de prometer |
| **R-39c** | Funil no Financeiro (§5) + sheets de recebimento/saída no mesmo esqueleto | M | médio — inclui a correção de janela do §5.1 |

**Dependência com a [R-33](R-33-orcamento-tela-unica.md):** a R-39a define a forma onde os
15 itens da R-33 vão pousar. O rodapé já reserva o lugar de PDF · WhatsApp · Dex, mas
**este item não implementa nenhum deles**. Executar R-39a **antes** da R-33 evita
redesenhar duas vezes.

## 8. Gates de aceite

- [ ] **G1** — Nenhuma assinatura de action alterada (`git diff` em `actions.ts` só se for chamada, não definição)
- [ ] **G2** — Registrar um pagamento à vista num orçamento sem plano: valor, data e forma gravados; status auto-aprovado; log `pagamento.registrado`
- [ ] **G3** — Fechar uma parcela pendente clicando nela na coluna do dinheiro: fecha por **UPDATE** (conferir no banco que **não** nasceu linha nova)
- [ ] **G4** — Gerar parcelas com resto de centavo (ex.: R$ 1.220 em 3): soma das parcelas == total, exato
- [ ] **G5** — Criar orçamento com procedimento **fora do catálogo**, quantidade > 1 e valor editado na mão: grava nome, qtd e preço certos
- [ ] **G6** — Orçamento quitado: formulário some, entra o resumo, e **nenhuma** ação de cobrar aparece
- [ ] **G7** — Dark **e** light conferidos nas 6 telas
- [ ] **G8** — Celular: coluna do dinheiro **acima** dos procedimentos, e a ação principal alcançável sem rolar até o fim
- [ ] **G9** — **Gate de 2 contas** — dentista comum e admin: admin vê e não edita (R-32); a coluna do dinheiro não vaza orçamento de outro dentista
- [ ] **G10** *(R-39c)* — Funil e "Receita Prevista" na mesma janela de mês; trocar o mês move os quatro números juntos

## 9. Riscos

| # | Risco | Tratamento |
|---|---|---|
| R1 | O redesign toca `detalhe-orcamento-modal.tsx`, que a R-34 acabou de reescrever e **ainda não passou pelo gate de 2 contas** | Rodar o gate da R-34 **antes** de começar a R-39a, senão os dois se misturam e não dá pra saber qual quebrou |
| R2 | `orcamentos-client.tsx` está 🟡 (só typecheck, nunca aberto na tela) e a R-39b mexe nele | Abrir e clicar antes de mudar, para não empilhar defeito não verificado |
| R3 | Contraste do CTA: branco sobre `--teal` = **3,38:1**, reprova AA para 14px, nos dois temas | **Pré-existente e sistêmico** (é o botão primário do app inteiro). Não se resolve dentro deste item — vira item próprio; aqui só não se piora |
| R4 | Mudar de 2 campos para 1 no editor de item altera funcionamento | Trava do §3: só com confirmação dele |

## 10. Fora de escopo

- **A página `/dashboard/financeiro` inteira** (hero de custo/hora, gráficos, extrato):
  só os 2 sheets e o funil entram. Redesenhar o resto é item próprio.
- **`financeiro-hub.tsx`** — órfão, não é importado em lugar nenhum do `src/`. Redesenhar
  código morto é trabalho jogado fora; se for pra viver, primeiro alguém decide onde.
- **Os 15 itens da R-33** — o layout reserva o lugar, a R-33 os implementa.
- **Contraste do CTA primário** (R3) — sistêmico, item próprio.

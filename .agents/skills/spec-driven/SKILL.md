---
name: spec-driven
description: >
  Escreve o contrato técnico de uma feature ANTES do código: TypeScript interfaces,
  props de componente, API contracts (route/body/response/erros), schema de banco,
  schemas Zod, e invariantes. Salva em plans/specs/ como fonte da verdade — a implementação
  segue a spec, não improvisa. Use quando começar qualquer feature não-trivial:
  "spec para X", "vamos especificar", "escreve a spec", "spec antes de codar",
  "define o contrato", "spec first". NÃO usar para bug fixes óbvios, edições
  pontuais, ou quando o plano já tem os contratos definidos.
cpe:
  source: cpe-personal
  integrated_at: 2026-06-24
  adaptation: Atlas-authored — stack Next.js/React/Supabase/Zod/shadcn
---

# Spec-Driven

Produz o contrato técnico completo de uma feature antes de qualquer código.
A spec é a **fonte da verdade**: a implementação segue a spec; se precisar
desviar, atualiza a spec *primeiro*.

## Quando ativar

Ativar em: "spec para X", "vamos especificar", "escreve a spec antes de codar",
"define o contrato", "spec first", início de qualquer feature com > 1 arquivo
envolvido.

**Não ativar em:** bug fix com causa óbvia, edit pontual, refactor de < 50 linhas,
ou quando o handoff já documenta os contratos.

---

## Processo

### 1. Contexto (leia antes de perguntar)

Verifique o que já existe:
- `plans/ROADMAP.md` — o item existe na fila? Qual o ID (`R-NN`) e o objetivo declarado?
  Se não existe, crie a linha ⏳ antes de escrever a spec.
- `plans/ESTADO.md` — o que já foi feito e o que trava, se o item já estava ativo.
- Último handoff em `plans/handoffs/` — se houver um handoff de discussão recente, é o
  insumo desta spec: formalize o que foi debatido.
- `AGENTS.md` / `Codex.rules.md` — constraints do projeto
- `package.json` — stack real (Next.js versão, libs de auth, etc.)
- Schema existente — `supabase/migrations/` ou `prisma/schema.prisma`
- Tipos existentes — `types/`, `lib/`, `src/types/`

Quanto mais contexto você leu, menos perguntas precisa fazer.

### 2. Perguntas (máximo 3, só se crítico)

Pergunte APENAS o que bloqueia a spec e não é inferível do contexto:
- Quem é o ator? (usuário autenticado, admin, público?)
- Qual o limite de escopo? (o que esta spec NÃO cobre?)
- Há constraint de schema que ainda não está no código?

Se tiver `AskUserQuestion` disponível, use. Senão, pergunte em texto plano.
**Não manufacture perguntas** — se é inferível, infira e declare o que assumiu.

### 3. Gerar a spec

Produza o arquivo completo. Siga a estrutura abaixo.

### 4. Salvar em plans/specs/

Nome do arquivo: **`plans/specs/R-NN-{slug}.md`** — o `NN` é o ID do item no `ROADMAP.md`.
IDs são sequenciais, monotônicos e **nunca reaproveitados**. Data **não** entra no nome
(mora no bloco de abertura) — nome por data ordena pelo eixo errado.

Estrutura completa em `templates/spec.md`. Bloco de abertura obrigatório:

```markdown
# R-NN — {Título}

> **SPEC** · **R-NN** · 🔵 ativo
> **Aberto:** YYYY-MM-DD · **Fechado:** — · **Fase:** contrato
```

### 5. Fases — a spec cresce, não nasce pronta

Um documento, quatro fases. O campo `Fase` diz onde está:

| Fase | Significa | Preenchido até |
|---|---|---|
| `debate` | Discutindo o problema, sem compromisso | §2 |
| `plano` | Objetivo e funcionamento decididos | §3 |
| `contrato` | Contratos técnicos escritos, aguardando aprovação | §8 |
| `aprovada` | Congelada. A execução segue isto | — |

> Só o **usuário** marca `aprovada`. Você nunca aprova a própria spec.

Ao salvar em `contrato`, diga:

> **Spec salva em `plans/specs/R-NN-{slug}.md`, fase `contrato`.** Aguardando sua aprovação.
> Depois de aprovada, qualquer desvio durante o código atualiza a spec **primeiro**.

### 6. Se a feature tem UI

A seção **Referência visual** liga o artefato ao código:

- Artefato em `plans/artefatos/R-NN-{slug}.html`, com cabeçalho declarando item, rota alvo,
  componente alvo, data e status.
- **Os tokens vão pra spec em texto** (cores, espaçamentos, escala tipográfica). O artefato
  é a prova visual; o texto é o contrato que a implementação segue.
- O artefato **nunca é lido pro contexto** — dezenas de KB de HTML. Abre no browser.

### 7. O alvo funcional — §5 Comportamento

O par da Referência visual, e o que costuma faltar. Visual você **vê**; comportamento você
**enumera** — a lista enumerada é o alvo. Sem ela "100% funcional" fica indefinido e a
implementação improvisa cada caminho (é o que faz a funcionalidade demorar a fechar).

Preencha os três:
- **Estados** — vocabulário quase sempre igual: vazio · carregando · sucesso · erro de
  validação · sem permissão · não encontrado/desatualizado · conflito. N/A é decisão com motivo.
- **Caminho principal** — gatilho → validação → o que a função faz passo a passo → resultado.
- **Exemplos concretos** — dado → resultado esperado, um por ramo. O que se aprova em 30s.

**Cada estado da §5 vira um gate na §8** — é o que troca "está 100%?" por checagem finita.

---

## Estrutura da spec

Canônica em **`templates/spec.md`** — não reproduzida aqui, pra não divergir do template.
As 9 seções: 1 Problema · 2 Decisão · 3 Objetivo · 4 Contrato técnico · 5 Comportamento ·
6 Referência visual · 7 Invariantes · 8 Gates de aceite · 9 Fora de escopo.

Os dois alvos que fazem a implementação convergir rápido — preencha os dois: **§5 Comportamento**
(o que faz: estados + caminho + exemplos) e **§6 Referência visual** (como parece: tokens).
Sem eles a spec vira lista de código a produzir sem alvo pra mirar.

---

## Regras de qualidade

**Não especificar o que é inferível do stack.** Se o projeto usa Supabase Auth,
não documente como auth funciona — só documente o que é específico desta feature.

**Tipos antes de implementação.** Os tipos TypeScript são o coração da spec —
são eles que a IA vai seguir ao escrever o código. Seja preciso.

**Sem tipos genéricos desnecessários.** `any`, `object`, `Record<string, any>`
são red flags na spec — se você não sabe o tipo, descubra agora, não depois.

**Invariantes são não-negociáveis.** Se durante a implementação surgir pressão
pra violar uma invariante ("só por enquanto"), atualize a spec e registre o trade-off.

**Gates de aceite são testáveis.** Cada gate deve ter um "como eu verifico isso"
óbvio — seja via `qa-web`, curl, ou Playwright. Se não é verificável, reescreva.

---

## A barra de precisão

Precisão não é volume — é **tirar a adivinhação**. Toda linha que admite duas leituras é uma
linha onde o modelo escolhe uma, e é aí que a qualidade escapa. Detalhe a mais que enterra a
linha que prende deixa a spec *menos* precisa, não mais.

**O teste:** dois devs competentes implementariam esta linha **igual**? Se não, ela ainda não
está precisa. Vale pra cada gate, cada estado da §5, cada campo do contrato.

**Ancore em código real, não descreva o padrão.** "Segue `criarRecorrencia` em
`src/server/recorrencia.ts`" vale mais que um parágrafo descrevendo o padrão — o modelo lê a
realidade e casa com ela, em vez de inventar uma forma que não bate com a casa. Serve pra server
action, componente, query, shape de erro.

**Aterre o contrato no que existe.** Nome de coluna, tipo, função que a spec cita = os reais,
conferidos no schema e nos tipos **antes** de escrever. A §4 que *imagina* o schema é onde o
modelo herda o palpite. Não sabe o nome exato? Leia — não aproxime.

**Empurre a regra pro type.** Result como união discriminada (`{ ok: true; … } | { ok: false;
error }`) força todo call site a tratar o erro — o compilador impõe o que a prosa só pede. Type
é a invariante mais barata de manter, porque quebrá-la não compila.

**Precisão tem ótimo, não máximo.** Passou de especificar contrato/comportamento/fronteira e
começou a ditar corpo de loop ou qual hook usar? Você está escrevendo código em prosa — mais
lento, e prende a única parte que o modelo faz bem sozinho. Preciso no **quê** e no **contrato**;
calado no **como**.

---

## Relação com o resto do setup

| Skill / Agente | Quando entra |
|----------------|-------------|
| `intent-driven-development` | **Antes** da spec — converte pedido vago em escopo |
| `spec-driven` (esta) | **Depois** do escopo — define os contratos técnicos |
| `design-brief` | Junto com a spec, se tem UI — gera o artefato e os tokens |
| Implementação (`/executar`) | **Depois** da spec `aprovada` — executa contra os contratos |
| `/auditar` (gate) | **Depois** da impl — verifica os gates e fecha o item |
| `auditoria-completa` | Periódica — promove 🟡 → ✅ varrendo o sistema todo |
| `handoff` | **Fim da sessão** — referencia o item e reescreve o `ESTADO.md` |

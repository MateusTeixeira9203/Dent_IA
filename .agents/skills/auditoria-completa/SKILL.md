---
name: auditoria-completa
description: >
  Auditoria completa do sistema — visual E técnica — varrendo todas as rotas, todos os
  botões e todos os fluxos ponta a ponta. Gera relatório em plans/auditorias/, transforma
  achados em itens do roadmap e promove itens 🟡 (no ar não verificado) para ✅ (verificado).
  Use quando o usuário disser "auditoria completa", "auditar o sistema inteiro", "testa
  tudo", "testa todos os botões", "varredura completa", "quero saber o que está quebrado",
  "revisão geral antes do release", ou /auditar completa. NÃO usar para o gate de commit de
  uma feature — para isso use design-review + qa-web + os reviewers (o /auditar simples).
---

# Auditoria completa

Varredura total do sistema: **toda rota, todo botão, todo fluxo** — técnica e visual na
mesma passada. É cara (horas, sessão dedicada) e é a **única coisa que promove 🟡 → ✅**.

## Antes de qualquer clique — 3 checagens

**1. Onde vai rodar.** Auditoria completa clica em botões que criam, alteram e apagam dado.

| Ambiente | Permitido |
|---|---|
| **localhost + seed** | Tudo. É o padrão — insista nele |
| Staging / conta de teste | Tudo |
| **Produção** | **Só leitura.** Navegar, olhar, medir. Nenhum submit, nenhum delete, nenhum envio |

Se o usuário só tem produção com usuários reais dentro, **pare e diga isso** antes de começar.
Botão destrutivo (deletar, enviar, cobrar, convidar) testa até o **modal de confirmação** e
**cancela** — a existência e o texto do modal são o que se audita.

**2. Escopo.** `/auditar completa` sem argumento = sistema inteiro. Com argumento
(`/auditar completa financeiro`) = só aquela área. Sistema inteiro em app grande facilmente
passa de uma sessão — proponha fatiar por área e diga quantas rotas achou.

**3. Baseline.** Leia `plans/ROADMAP.md` e liste os itens 🟡. São os candidatos a promoção —
a auditoria existe em boa parte pra resolver essa fila.

## Fase 1 — Inventário (mecânico, não confie na memória)

Derive a lista de rotas do código, nunca de lembrança:

```bash
find src/app -name "page.tsx" -o -name "page.ts" | sort
find src/app -name "route.ts" | sort          # endpoints
```

Monte a tabela de rotas com: caminho, precisa de auth?, papel exigido, é destrutiva?
Rota que exige papel específico precisa ser visitada **com cada papel** — é onde mora
furo de autorização.

Declare o total: *"78 rotas, 12 endpoints. Vou auditar em N passadas."*

## Fase 2 — Varredura técnica, rota a rota

Para **cada** rota, com o browser (Playwright MCP / Codex Browser):

- **Carga limpa** — console sem erro/warning, network sem 4xx/5xx inesperado, sem request duplicado óbvio
- **Todo elemento interativo** — clique cada botão, link, tab, dropdown, accordion, menu. Anote o que não faz nada, o que erra silenciosamente, o que navega pro lugar errado
- **Todo formulário** — submit vazio (valida?), submit inválido (mensagem clara?), submit válido (**persiste após reload?**), duplo-clique no submit (duplica registro?)
- **Os 4 estados** — loading, erro, vazio, sucesso. O estado vazio é o mais esquecido e o que mais parece bug pro usuário
- **Voltar do browser** e refresh no meio do fluxo — quebra?

> **Verificação assertiva, nunca screenshot.** "A tela mostrou sucesso" não é verificação —
> recarregue e confirme que o dado está lá. Console e network são a fonte da verdade sobre
> o que realmente aconteceu.

## Fase 3 — Varredura visual

Rode os critérios do `design-review`, mas em **toda** tela — e obrigatoriamente nas 4 combinações:

|  | Desktop | Mobile |
|---|---|---|
| **Light** | ✓ | ✓ |
| **Dark** | ✓ | ✓ |

Procure: cor hardcoded vazando (o teste de dark mode pega), contraste insuficiente,
hierarquia fraca, espaçamento inconsistente entre telas equivalentes, componente
equivalente com aparência diferente em telas diferentes, overflow horizontal no mobile,
alvo de toque menor que 44px, AI slop (gradiente roxo, grid de 3 ícones em círculo,
bubbly uniforme, copy genérica).

**A régua de consistência:** se o projeto declara telas de referência no `AGENTS.md`, a
pergunta em cada tela é *"parece feita pela mesma equipe que fez as telas de referência?"*.

## Fase 4 — Fluxos ponta a ponta

Rotas isoladas passam e o fluxo quebra na junção. Percorra as **jornadas reais** do produto,
não as telas. Para cada uma: execute do início ao fim como usuário, e confirme o resultado
no estado persistido (recarregue, ou confira em outra tela que lê o mesmo dado).

Derive as jornadas do produto — tipicamente: cadastro/onboarding completo, o fluxo do
núcleo do produto, o fluxo de dinheiro (se houver), convite/permissão de outro usuário,
e o caminho de recuperação (esqueci senha, desfazer, cancelar).

## Fase 5 — Segurança e multi-tenant

**Fase fixa, nunca pulada** — é onde um furo custa mais caro que todo o resto somado.

- **Duas contas logadas de verdade** (dois navegadores/perfis, não script): usuário A cria,
  usuário B tenta ler e editar. B da mesma clínica: lê? edita conforme a regra? B de **outra**
  clínica: é barrado?
- **ID de outra clínica na URL** — troque o UUID na barra de endereço. Retorna 403/404 ou vaza?
- **Rota protegida sem sessão** — abre em aba anônima. Redireciona ou renderiza?
- **Papel sem permissão** — a UI esconde o botão *e* o servidor barra a ação? Esconder na UI não é autorização.
- **Endpoint direto** — chamada ao route handler sem passar pela UI respeita a mesma regra?

> RLS testada só por script não está testada. Policy passa em SQL e falha pelo login — é o
> modo de falha clássico.

## Fase 6 — Relatório

Salve em `plans/auditorias/YYYY-MM-DD-{escopo}.md`:

```markdown
# Auditoria — {escopo}

> **AUDITORIA** · {escopo} · 2026-07-21
> **Ambiente:** localhost + seed · **Rotas:** 78 de 78 · **Fluxos:** 6

## Veredito
{2–4 linhas: dá pra usar? o que assusta? o que surpreendeu bem?}

## Achados
Severidade: **crítico** (vaza dado / perde dado / bloqueia uso) · **alto** (fluxo principal
quebrado) · **médio** (atrito ou inconsistência visível) · **baixo** (polimento).

| # | Severidade | Onde | O que acontece | Como reproduzir |
|---|---|---|---|---|

## Promoções 🟡 → ✅
| Item | Como foi verificado |
|---|---|

## Não verificado
> O que a auditoria NÃO cobriu e por quê. Honestidade aqui vale mais que cobertura falsa.

## Cobertura
| Rota | Técnica | Visual | Papéis testados |
|---|---|---|---|
```

**Severidade em palavra, nunca emoji** — emoji é reservado ao vocabulário de status do roadmap.

## Fase 7 — Fechar o ciclo

Achado que não vira item de roadmap é achado desperdiçado.

1. **Crítico** → conserta na hora, ou entra como **próximo** item da fila. Não deixe pra depois.
2. **Alto e médio** → viram itens ⏳ em `plans/ROADMAP.md`, um por achado, com link pro relatório.
3. **Baixo** → um único item ⏳ "polimento pós-auditoria" agrupando todos.
4. **Promoções** → troque 🟡 por ✅ nos itens verificados, no mesmo commit.
5. **`plans/ESTADO.md`** → se apareceu crítico, ele entra em **Travado** ou vira o item ativo.

Depois, no chat: veredito em 2 linhas, os críticos, quantos itens entraram na fila, quantos 🟡 viraram ✅.

## Regras

- **Nunca reporte o que não testou.** Rota não visitada vai em "Não verificado", não some.
- **Reproduzir ou não existe.** Todo achado precisa de passos que outra pessoa segue e vê o mesmo.
- **Não conserte no meio da varredura** — perde o fio e a auditoria vira refactor. Anote, termine, conserte depois (exceto crítico de segurança, que para tudo).
- **Achado repetido em 5 telas é 1 achado sistêmico**, não 5. Reporte a causa, liste as ocorrências.
- Auditoria completa é **modo próprio**: não escreve feature, não re-escopa produto.

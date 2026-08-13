---
name: handoff
description: >
  Fecha a sessão: salva o handoff narrativo em plans/handoffs/ (decisões, erros E como eu
  pensava em resolver, o que ficou cogitando), reescreve plans/ESTADO.md com a situação
  atual, e arquiva os handoffs antigos. Use SEMPRE ao final de uma sessão, ou quando o
  usuário disser "handoff", "fecha a sessão", "registra onde paramos", "salva o progresso",
  "vou dormir", "terminamos por hoje", "encerra", "fechar o dia", "boa noite vou dormir".
---

# Fechamento de sessão

Duas escritas, com papéis diferentes — **não repita conteúdo entre elas:**

| Arquivo | O quê | Muda? |
|---|---|---|
| `plans/handoffs/handoff-…md` | **O que aconteceu** — narrativa e raciocínio da sessão | Nunca. É o log |
| `plans/ESTADO.md` | **Onde estamos** — situação atual do item ativo | Reescrito toda sessão |

## 1. Coletar contexto

```bash
git diff --name-only HEAD
git diff --name-only --cached
git log --oneline --since="8 hours ago"
git status --short
```

Sem git, liste o que você editou na sessão.

## 2. Handoff — `plans/handoffs/handoff-YYYY-MM-DD-HHmm.md`

Formato em `templates/handoff.md`. Seis seções:

1. **Bloco de abertura** — `> **HANDOFF** · **R-NN** · sessão #N · modo {…}`
2. **O que trabalhamos** — 2–5 bullets, mais importante primeiro
3. **O que concluímos** — pronto vs. pela metade. **Marque 🟡 o que subiu sem verificação real** — não vale ✅
4. **Decisões tomadas** — tabela: decisão · alternativa descartada · motivo
5. **Erros e como pensei em resolver** — tabela: erro · causa/hipótese · a abordagem que eu ia seguir · resolvido?
6. **O que eu estava cogitando** — direções que não viraram decisão
7. **Arquivos alterados**

> As colunas "como eu pensava em resolver" e "o que estava cogitando" **não são opcionais** —
> são o motivo de o handoff existir. Capture o raciocínio, não só o resultado.

## 3. Reescrever `plans/ESTADO.md`

Formato em `templates/ESTADO.md`. Do zero, refletindo a realidade **agora**:

- `## Agora` — item ativo, objetivo, **Feito** e **Falta** atualizados
- `## Travado` — o que impede avanço + hipótese. Vazio → "Nada travado."
- `## Esperando você` — decisões que só o usuário toma. Vazio → "Nada esperando."
- `## Próximo da fila` — uma linha, aponta pro ROADMAP

**Não copie o handoff aqui.** Handoff = o que aconteceu. ESTADO = onde estamos.

## 4. Arquivar

Handoffs além dos **3 mais recentes** → `git mv` pra `plans/_arquivo/handoffs/`.
Nada é deletado, nunca.

## 5. Checagem de consistência

Antes de fechar, confira e conserte:

- [ ] O item citado no `ESTADO.md` está 🔵 no `ROADMAP.md`?
- [ ] Existe mais de um 🔵? (só 1 é permitido)
- [ ] Item fechado nesta sessão teve spec **e artefato** movidos pro `_arquivo/`?
- [ ] Item que subiu sem teste real está 🟡, não ✅?

Achou divergência: conserte e diga o que consertou.

## 6. Obsidian (se houver algo durável)

Decisão de produto/arquitetura → `Produto/` ou `Arquitetura/` (template `Templates/decisao.md`).
Avanço de projeto → `Projetos/{Nome}.md`. Ideia solta → `Entrada/`.
Sessão só exploratória: pule.

## 7. Resumo no chat

Até 3 bullets do que concluímos · o próximo passo mais crítico · o que está bloqueado ·
o caminho do handoff salvo. Nada além disso.

## Regras

- **Honestidade acima de tudo.** Não testado é "não testado". Erro sem solução registra a
  hipótese — não invente que resolveu. **Código escrito ≠ código verificado.**
- `plans/` nunca perde informação: arquivar é `git mv`, deletar é proibido.

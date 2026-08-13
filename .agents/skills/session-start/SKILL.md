---
name: session-start
description: >
  Abre uma nova sessão de trabalho retomando de onde paramos. Lê plans/ESTADO.md (o item
  ativo, o que falta, o que trava, o que espera decisão) e o último handoff se precisar do
  raciocínio, e faz um recap acionável antes de começar. Use quando o usuário cumprimentar
  pra começar o dia: "bom dia", "boa tarde", "boa noite", "tudo bem Codex", "oi Codex",
  "começar sessão", "nova sessão", "vamos continuar", "onde paramos".
---

# Abertura de sessão

O usuário cumprimentou pra começar. Não comece do zero — **retome de onde paramos.**

## 1. Ler o estado (uma fonte, não três)

```bash
cat plans/ESTADO.md
```

É o arquivo do **agora**: item ativo, o que já foi feito e o que falta nele, o que está
travado, o que espera decisão do usuário. Se ele existe, é daqui que sai o recap.

**Só leia mais se precisar:**
- `plans/ROADMAP.md` — se o usuário perguntar do projeto como um todo, ou se o ESTADO não tem item ativo
- último handoff em `plans/handoffs/` — se o ESTADO cita erro/travamento e você precisa do **raciocínio** de como se pensou em resolver
- `plans/ESTADO.md` ausente → é a primeira sessão: cumprimente, diga que não há estado anterior, pergunte no que vamos trabalhar

Se o usuário mencionou um projeto por nome e existe vault Obsidian, cheque
`Projetos/{NomeProjeto}.md` antes — traz visão e decisões.

## 2. Recap acionável (não despeje o arquivo)

Cumprimente de volta em uma linha e entregue:

- **Item ativo:** qual é, e o que falta nele (do `## Agora`)
- **Travado:** o que impede avanço, e a hipótese registrada (do `## Travado`)
- **Esperando você:** decisões pendentes que só o usuário toma (do `## Esperando você`)
- **Divergência:** se o hook avisou que ESTADO e ROADMAP não batem, **traga isso primeiro** —
  o estado do projeto está mentindo e precisa ser consertado antes de trabalhar

Feche perguntando: **"Continuamos por aqui ou mudou alguma coisa?"** — não saia
implementando antes de confirmar (regra 2: discutir antes de codar).

## 3. Modo

Não adivinhe o modo pela saudação nem pelo handoff. O usuário ativa quando quiser
(`/discutir`, `/planejar`, `/executar`, `/auditar`). Se ele já disser o que quer fazer,
sugira o comando correspondente.

## 4. Desambiguação

"Boa noite" pode ser chegada **ou** despedida. Se o usuário disser "boa noite, vou dormir"
ou estiver claramente encerrando, **não** abra sessão — acione a skill `handoff`.

## Regra

Esta skill só lê e resume. Não altera código nem o `plans/`. O objetivo é a próxima sessão
começar com contexto, não da estaca zero.

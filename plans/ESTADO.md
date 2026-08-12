# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-12 · sessão #38
> **Item ativo:** R-103 · **Modo da sessão:** execução (R-101/R-102) → planejamento (R-103) →
> execução (R-103a) → pontual (campo mágico)

## Agora

**Nada em modo planejamento/execução ativo agora — sessão fechando.** R-103 (master) segue
🔵 como próximo item quando alguém retomar: R-103a fechado (`b427391`), falta R-103b/c/R-104,
todos travados nas 6 abertas do §4 do [master](specs/R-103-painel-do-dex.md).

**Nesta sessão, além do R-103a:** 2 pontuais no campo mágico do Meu dia, achados testando o
R-103a ao vivo — campo mágico não limpava ao trocar de paciente no rail (`e5e91f6`) e o
matcher local misturava dentes de procedimentos diferentes no mesmo relato (`199c232`). Os
dois confirmados ao vivo por ele. Testando o 2º, apareceram **2 achados novos, não
corrigidos** (detalhe no [ROADMAP.md](ROADMAP.md), header): matcher local não casa rótulo
singular com relato no plural; status realizado/indicado às vezes sai errado na extração por
IA. Nenhum dos dois virou item formal ainda — ver Esperando você.

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro solo continua criando clínica |

## Esperando você

- **Matcher local do campo mágico não casa plural** ("restaurações" não acha "Restauração") —
  qual abordagem: stemming pontual só pra -ção/-ções (mais comum), algo mais completo, ou vira
  item próprio com spec? Afeta pelo menos 5 rótulos (Restauração, Extração, Canal, Lesão
  periapical, Coroa total, Exame periodontal).
- **Status realizado/indicado errado na extração por IA** — "encontrei uma lesão periapical"
  saiu Realizado, "fratura" (mesma categoria clínica no código) saiu Planejado, no mesmo
  relato. Não investigado a fundo. Precisa virar item com eval antes/depois (regra do
  CLAUDE.md pra prompt de extração clínica).
- **R-103b — as 6 abertas do §4 do master:** definição das 3 pendências · dedup entre elas ·
  "nunca veio" (226 na Clindent) vira lista própria? · 30 ou 60 dias · escopo meu-vs-clínica
  (**a única que pode exigir RPC nova**) · CTA de WhatsApp em lote.
- **R-98b — por que desativar o botão "Salvar como meu modelo"?** Codado, migration 136 no ar,
  **não commitado**. Sem o motivo eu não sei quando/se reativar.
- **R-102 — G1-G6 sem teste formal**, mesmo no ar. Vale exercitar criar/conflito nos 2 sentidos/
  secretária escolhendo dentista na próxima vez que estiver na agenda.
- Veredito de produção do R-98a — sem confirmação desde a sessão #35
- Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita (§7: 3 decisões)
- G6 do R-94 — teste deliberado de 2 contas (dentista cria pedido → protético marca entregue)
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — parado há semanas
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados, ainda 🟡)

## Próximo da fila

Decidir os 2 achados do campo mágico (viram item? qual abordagem?) antes de mais alguém usar
o Meu dia com relato no plural. Depois, à escolha: R-103b/c. `ROADMAP.md` segue precisando de
poda dedicada — 218 linhas, teto ~200, estourado há várias sessões.

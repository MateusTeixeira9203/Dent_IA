# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-12 23:21 · sessão #38
> **Item ativo:** R-103 · **Modo da sessão:** pontual → planejamento (R-103b) → execução (R-103b)
> → planejamento (R-103c) → execução (R-103c) → sessão fechando

## Agora

**R-103 (master): a ✅ no ar, b e c 🟡 codados e não commitados, esperando gate de 2 contas.**
R-104 (curso do sistema) ainda sem spec, sem data.

- [R-103b](specs/R-103b-pendencias-do-dex.md) — as 3 pendências de retenção (faltou/cancelou/
  parou de vir). `classificarRetencao` (12/12 fixtures), rota `/api/dex/retencao`, hub atualizado.
  Testado ao vivo em Teste01 (sem dado nos 3 buckets lá — resposta zerada, mas correta).
- [R-103c](specs/R-103c-o-mes-do-dex.md) — coluna "O mês" (atendimentos, visitas/paciente,
  crescimento). Cortou "recorrentes" por decisão dele no meio do planejamento. `calcularNumerosMes`
  (7/7 fixtures), rota `/api/dex/mes`, limpou 4 queries órfãs de `context.ts`. Testado ao vivo em
  Império **com dado real** (6 atendimentos, +200%).

Typecheck, lint, `next build` limpos nos dois. 19/19 fixtures no total. **G3/G4/G5/G6/G8
pendentes nos dois** — todos exigem login que só ele tem, ou ferramenta (design-review) que não
usei. G3 é o mais crítico: motivo do R-103b ter sido Opus.

**Também nesta sessão:** plural do matcher local do campo mágico corrigido (`casaLabel`,
28/28 harness) — codado, não commitado. R-106 aberto (status realizado/indicado errado na
extração por IA) — zero código, zero investigação ainda.

Detalhe da sessão (raciocínio, decisões, erros): [handoff](handoffs/handoff-2026-08-12-2321.md).

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro solo continua criando clínica |
| G3 do R-103b/c sem dado nem conta pra testar | Fechar R-103b/c como ✅ | Ele recusou seed sintético (script SQL pronto, não rodado) — vai esperar dado real com o tempo, sem prazo |

## Esperando você

- **R-103b e R-103c — G3/G4/G5/G6/G8** (2 contas reais, secretária, protético, design-review
  contra o artefato). Sem eles os dois ficam 🟡, não ✅. Script SQL pra testar G3 com dado
  sintético já foi oferecido e recusado — a decisão foi esperar dado real.
- **R-98b — por que desativar o botão "Salvar como meu modelo"?** Codado, migration 136 no ar,
  não commitado. Sem o motivo eu não sei quando/se reativar.
- **R-102 — G1-G6 sem teste formal**, mesmo no ar.
- Veredito de produção do R-98a — sem confirmação desde a sessão #35
- Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita (§7: 3 decisões)
- G6 do R-94 — teste deliberado de 2 contas (dentista cria pedido → protético marca entregue)
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — parado há semanas
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados, ainda 🟡)

## Próximo da fila

Sem gate de 2 contas represa R-103b/c. Enquanto isso, sem trava de login: R-104 (curso do
sistema, sem spec) ou R-106 (status realizado/indicado — precisa investigação antes do eval).
`ROADMAP.md` segue precisando de poda dedicada — 254 linhas, teto ~200, estourado há sessões.

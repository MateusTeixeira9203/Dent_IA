# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-13 21:30 · sessão #41
> **Item ativo:** R-108b (no ar, não verificado por inteiro)

## Agora

**R-108b no ar desde hoje** — a visita passou a rotear. Pendência concluída volta pra ficha onde
foi planejada; só o que nasce na sessão escolhe destino, e o seletor nasce pré-marcado. O bug de
origem do épico (endodontia de 12/08 presa numa ficha de 26/07) está fechado.

Junto subiu o **`fichas.status` derivado do conteúdo** — sem isso o item não funcionava: 71 de 71
fichas do Meu dia nasciam `concluida`, então nenhum tratamento abria pela entrada principal e o
seletor nunca teria o que oferecer.

- **Provado ao vivo na Teste01** (dado apagado depois): G4 (os concluídos permanecem na origem, só
  o novo vai pra ficha nova), G6, G11 (não-destruição, RPC e tela), G12 (1 notificação por visita
  mesmo alcançando 2 fichas), G13 (nasce aberta, fecha sozinha), G10.
- **Não rodou:** **G3 — "absorver"** num tratamento aberto já existente. É o único caminho de
  escrita que subiu sem ser exercido. Usa a mesma função já provada 2x com pendência, então o
  risco é baixo — mas é onde olhar primeiro se algo quebrar. Também de fora: G7 (ficha assinada),
  G9 (R-85 não regride), G8 (2 contas).
- **Barra de encaminhar maior** (pontual): 🟡 no ar **sem eu ter visto na tela** — só typecheck e
  lint. Conferir em Prontuário → ficha com procedimento planejado → botão Encaminhar.

**Push feito:** 8 commits, `416bf2f..eac3b75`. A migration 142 já estava aplicada desde a tarde,
então o push fechou a assimetria entre schema e código em produção.

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| ~~G3 do R-108b~~ | — | ✅ **rodou 14/08 e passou**: novo procedimento absorvido num tratamento aberto (11→12 eventos, 0 fichas criadas, campos da ficha intactos). Restam G7, G9 e o G8 de 2 contas |
| Barra de encaminhar não vista | Fechar o pontual | Só renderiza em ficha expandida com procedimento `indicado`; não alcancei sem escrever dado |
| G8 (2 contas) do R-108/R-108b/R-103b/c | Fechar os três como ✅ | Represado há semanas — ele recusou seed sintético, espera dado real |
| Posição do "Modo multidente" (R-107d §9) | Fechar R-107d | Ele quer opinião de dentistas reais; 3 opções documentadas |
| Preço novo (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única |
| R-36 reescrita sem aprovação | Começar a codar a R-36 | §7 tem 3 decisões abertas |

## Esperando você

- **Conferir a barra de encaminhar** — 10 segundos, e vira ✅ ou volta pra ajuste
- **Horários da agenda valendo de verdade** — item novo ⏳ no ROADMAP, com 5 decisões que só você
  toma (dentista sem grade cadastrada · override da recepção · vale pro dentista também? ·
  editar/arrastar agendamento · agendamentos legados fora do horário)
- **Backfill de status?** As 71 fichas antigas com procedimento indicado continuam `concluida`.
  Não mexi — mudar status de ficha real sem você pedir é o tipo de coisa que aparece errada
  semanas depois
- R-102 — G1-G6 sem teste formal, mesmo no ar
- Veredito de produção do R-98a — sem confirmação desde a sessão #35
- Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita (§7: 3 decisões)
- G6 do R-94 — teste deliberado de 2 contas
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — parado há semanas
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados, ainda 🟡)

## Próximo da fila

R-109 (spec aprovada, zero código, independente, pode ir em Sonnet) ou fechar os gates soltos do
R-108b. `ROADMAP.md` segue precisando de poda dedicada — teto ~200 linhas, estourado há sessões.

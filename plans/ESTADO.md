# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-13 03:06 · sessão #39
> **Item ativo:** R-107 · **Modo da sessão:** discussão → planejamento → execução (×4) →
> discussão de design → commit → sessão fechando

## Agora

**R-107 (a-d): codado, testado ao vivo e commitado. 5 commits locais, zero push.**

- [R-107a](specs/R-107a-barra-meu-dia.md) — barra do campo mágico sem Status/Observação
  globais, chips de Profilaxia/Clareamento portados de `FichasTab.tsx`.
- [R-107b](specs/R-107b-perfil-do-dente.md) — busca livre no painel do dente, tipo genérico
  `outro`, "Dente ausente". **Migration 139 aplicada em produção.**
- [R-107c](specs/R-107c-altura-estavel-perfil-dente.md) — `min-h-[308px]` no card da direita,
  para o colapso visual entre dente vazio e mapa.
- [R-107d](specs/R-107d-lote-multidente.md) — faixa de lote (2+ dentes → 1 procedimento),
  Restauração pede face antes (checado em produção, não suposto). **+ adendo "Modo
  multidente"** (toggle que impede o clique de trocar o espelho pelo histórico — resolve o
  "clica, fecha, clica, fecha").

Todos os 4 com gates confirmados ao vivo por mim (typecheck/lint/build limpos, zero erro de
console, interações reais). Falta só a verificação dele mesmo — nenhum gate exige login que só
ele tem, diferente do R-103b/c.

**Pendente, não é bug:** posição do "Modo multidente" na tela. Está codado acima do
odontograma; recomendei mover pra dentro da faixa do campo mágico (mesma família de
Profilaxia/Clareamento). Ele quer opinião de dentistas reais antes de decidir — nada aplicado.
Raciocínio completo no [R-107d §9](specs/R-107d-lote-multidente.md#9-adendo-1308-pedido-dele-ao-vivo-depois-da-execução-original--modo-multidente).

**Também commitado nesta sessão:** R-103b/c (código de #38, sem trabalho novo meu hoje) — a
pedido dele, junto com o lote do R-107.

Detalhe da sessão (debate completo, decisões, achados de teste): [handoff](handoffs/handoff-2026-08-13-0306.md).

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro solo continua criando clínica |
| G3 do R-103b/c sem dado nem conta pra testar | Fechar R-103b/c como ✅ | Ele recusou seed sintético (script SQL pronto, não rodado) — vai esperar dado real com o tempo |
| Posição do "Modo multidente" (R-107d §9) | Fechar R-107d de vez | Ele quer opinião de dentistas reais amanhã — 3 opções já documentadas na spec, é só aplicar quando decidir |

## Esperando você

- **Posição do "Modo multidente"** — pega a opinião dos dentistas amanhã; 3 opções e minha
  recomendação estão no R-107d §9, pronto pra eu aplicar assim que decidir
- **Push dos 5 commits de hoje** (R-107a-d + R-103b/c) — nenhum foi pra produção ainda
- **R-107b/c/d — G3/G4/G5/G6/G8 formais** (gates que dependem de login/2 contas/design-review)
  — testei tudo que dava pra testar sozinho; o resto segue como sempre: exige você
- **R-103b e R-103c — mesmos gates**, mesma trava de #38 (2 contas reais). Script SQL de seed
  sintético já foi oferecido e recusado — decisão é esperar dado real
- **R-98b — por que desativar o botão "Salvar como meu modelo"?** Codado, migration 136 no ar,
  não commitado. Sem o motivo eu não sei quando/se reativar
- **R-102 — G1-G6 sem teste formal**, mesmo no ar
- Veredito de produção do R-98a — sem confirmação desde a sessão #35
- Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita (§7: 3 decisões)
- G6 do R-94 — teste deliberado de 2 contas (dentista cria pedido → protético marca entregue)
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — parado há semanas
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados, ainda 🟡)

## Próximo da fila

Sem sinal de push, R-107 fica como está. Depois da opinião dos dentistas sobre o "Modo
multidente", é só aplicar a posição escolhida e fechar o R-107d de vez. Sem gate de 2 contas
represa R-103b/c. Enquanto isso, sem trava de login: R-104 (curso do sistema, sem spec) ou
R-106 (status realizado/indicado — precisa investigação antes do eval). `ROADMAP.md` segue
precisando de poda dedicada — 255 linhas, teto ~200, estourado há várias sessões.

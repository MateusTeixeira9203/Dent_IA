# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-13 15:05 · sessão #40
> **Item ativo:** R-108 (+ R-108b, R-109 aprovadas, sem código ainda)

## Agora

**R-108 Fatia A+B — codado, gates verificados ao vivo por ele, nada commitado.**

- Migration 141 no ar: `fichas.nome` + tabela `ficha_evolucoes` (RLS = padrão
  `planejamento_secoes`) + backfill 174/174, 0 ficha tocada.
- Ficha com evento ganha cabeçalho (nome do tratamento + progresso) + timeline "Evoluções —
  uma por visita". Ficha legada (sem evento) continua exatamente como sempre foi.
- **Feito:** G1, G2, G4, G5, G6, G7, G8, G9, G10, G11 — G5/G7/G8/G9 confirmados ao vivo por
  ele (light e dark, paciente "tes"/"teste" em Teste01). Nome derivado com 8/8 testes.
- **Falta:** G3 (RLS 2 contas) — represado, mesma fila do G3 do R-103b/c. Commit e push —
  ele pediu pra segurar os dois até terminar ficha+Meu dia.

**R-108b (roteamento da visita) e R-109 (registro na ficha) — specs aprovadas por ele nesta
sessão, zero código ainda.** R-108b é quem mata o bug de origem que abriu esta discussão
inteira: evento de procedimento fica preso na ficha onde foi *planejado*, não na ficha da
visita que o concluiu (achado real, 12/08: endodontia presa numa ficha de 26/07, 17 dias de
distância). **Esse bug continua no ar** — a Fatia A+B do R-108 não o resolve, só monta o
modelo em cima do qual o R-108b vai rotear.

**Decisão dele no fechamento:** retomar o R-108b **em Opus** na próxima sessão — é a única
fatia do épico que muda rota de escrita com paciente real (a spec já marcava isso: "Opus,
não descer pra Sonnet"). R-109 pode ir em Sonnet, é independente e mais mecânico (porta
lote multidente/campo mágico já testados no Meu dia).

**Achado a não esquecer:** o backfill da migration 141 rodou em todas as 174 fichas do banco,
incluindo as 124 da Clindent (clínica real da família, só-leitura na minha memória) — é
INSERT aditivo, zero UPDATE/DELETE no dado deles, mas eu não separei o escopo por clínica
antes de rodar. Avisei ele, sem reação — registrado aqui, não silenciado.

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| G3 do R-108 sem 2 contas | Fechar R-108 como ✅ | Mesma fila do G3 do R-103b/c |
| G3 do R-103b/c sem dado nem conta pra testar | Fechar R-103b/c como ✅ | Ele recusou seed sintético — espera dado real |
| Posição do "Modo multidente" (R-107d §9) | Fechar R-107d de vez | Ele quer opinião de dentistas reais — 3 opções documentadas, é só aplicar quando decidir |
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas |

## Esperando você

- **Retomar R-108b em Opus** — spec pronta (`aprovada`), é o que mata o bug de origem
- **R-109** — spec pronta (`aprovada`), pode entrar em Sonnet, em qualquer ordem
- **Commit + push do R-108** — combinado que espera terminar ficha+Meu dia
- G3 do R-108 e do R-103b/c — represados junto (2 contas reais)
- Posição do "Modo multidente" — [R-107d §9](specs/R-107d-lote-multidente.md#9-adendo-1308-pedido-dele-ao-vivo-depois-da-execução-original--modo-multidente)
- R-102 — G1-G6 sem teste formal, mesmo no ar
- Veredito de produção do R-98a — sem confirmação desde a sessão #35
- Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita (§7: 3 decisões)
- G6 do R-94 — teste deliberado de 2 contas
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — parado há semanas
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados, ainda 🟡)

## Próximo da fila

R-108b assim que a sessão abrir em Opus — é o item que fecha o bug real. R-109 pode intercalar
em Sonnet a qualquer momento, sem depender do 108b. `ROADMAP.md` segue precisando de poda
dedicada — 258 linhas, teto ~200, estourado há várias sessões.

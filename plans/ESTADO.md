# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-12 · sessão #38
> **Item ativo:** R-103 · **Modo da última sessão:** execução → planejamento
> **Próxima sessão: execução do R-103a** (pedido dele ao fechar).

## Agora

**R-103 — Painel do Dex.** Spec em rascunho, **zero código**. Objetivo: o Dex vira o hub único do
dia — pendências que pedem ação, números do negócio, e a central de atualização/curso. Modal
central de 3 colunas.

**Feito:** artefato aprovado por ele (`plans/artefatos/R-103-painel-do-dex.html`, 3 colunas, modal
central, avatar de robô) · diagnóstico com 4 causas confirmadas no código · medição em produção
que definiu o recorte · 2 specs escritas ([master](specs/R-103-painel-do-dex.md) 126 linhas +
[R-103a](specs/R-103a-destravar-o-dex.md) 294 linhas) · R-26 absorvido.

**Falta:** ele aprovar as specs (o recorte e as 6 abertas do §4 do master — **nenhuma bloqueia o
R-103a**) e então codar o R-103a nas 7 fases do §7.

⚠️ **A ordem das fases do R-103a não é a intuitiva:** limpar o mock vem **antes** de destravar o
Dex. O mock nunca chegou a produção porque o painel estava fechado — destravar primeiro publicaria
a ficção no mesmo commit que conserta o bug. Está marcado na spec, mas é o tipo de coisa que
alguém reordena de boa-fé.

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro solo continua criando clínica |

## Esperando você

- **R-103 — aprovar as specs e o recorte** (a/b/c + R-104). O R-103a pode começar sem responder
  mais nada.
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

Codar o **R-103a** (fases 1-3 primeiro: limpar → alerta pro dentista → destravar). Depois, à
escolha: R-103b (precisa das 6 respostas) ou R-103c. `ROADMAP.md` segue precisando de poda
dedicada — 240 linhas, teto ~200, estourado há várias sessões.

# Estado — 2026-08-09 (sessão #35)

## Agora

**🔵 R-94 — Agenda do protético** ([spec](specs/R-94-agenda-do-protetico.md)), spec escrita,
**código ainda não começou**.

Ele pediu pra "matar hoje" a tela do protético e o Apresentar. Eu apontei que os dois estavam
explicitamente cortados na spec do R-92 que ele aprovou horas antes — **ele decidiu pausar o
R-92 mesmo assim**. Ordem definida: protético primeiro, Apresentar depois (ainda sem escopo —
o que ele disse foi só "mais liberdade pro dentista editar a apresentação").

**Escopo fechado com ele:** protético é membro da clínica (1 clínica, não laboratório N:N),
login criado pelo admin com senha como o da secretária (não usa convite), pedido é solto
(paciente + observação + data, sem vínculo com procedimento), dentista pede o prazo,
protético marca "entregue", e ele **vê o nome do paciente** no card.

**O achado que dimensiona o item:** a permissão do projeto é **deny-list sem exhaustive
check** — 63 arquivos com gates negativos (`if role === 'secretaria') nega`), zero `switch`
sobre role no projeto inteiro. Um role novo **não quebra o build** e nasce enxergando ficha,
prontuário e financeiro. Mitigação aprovada por ele: **gate de ponto único** no
`dashboard/layout.tsx` em vez de auditar os 63.

## Travado

**Nada trava o R-94** — dá pra começar a codar.

**O preço** (herdado do R-92, ainda de pé). Ele mandou ignorar o R$249/R$179 atual, número
novo não fechado. Agora é barato mudar: `lib/planos.ts` virou fonte única (commit `86fc722`).

## Esperando você

- [ ] **9 commits testados, sem push** — o lote do R-92 (`86fc722`..`dc0277e`). Ele pediu pra
      revisar antes de subir, revisou, e aí virou a sessão pro R-94. **Continua sem subir.**
- [ ] **Definir o preço** — não trava mais o R-94, mas trava o R-92 quando voltar.
- [ ] Testar pessoalmente R-85/R-86/R-65/R-66 (herdados do #33, ainda 🟡).
- [ ] Gate de 2 contas (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — 10 dias parado. **O R-94
      soma mais um** (G6: protético + dentista logados).
- [ ] **Escopar o Apresentar** — nunca foi discutido de verdade. Falta saber o que trava hoje
      pro dentista na apresentação ao paciente.

## Próximo da fila

Depois do R-94: o Apresentar (sem escopo) e a volta do R-92. Mapa de atrito
[rodada 2](auditorias/2026-08-09-mapa-de-atrito-2.md) e
[rodada 3](auditorias/2026-08-09-mapa-de-atrito-3-recontagem.md) têm achados soltos sem item
próprio. Ver `plans/ROADMAP.md`.

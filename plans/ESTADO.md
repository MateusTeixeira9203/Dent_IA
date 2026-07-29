# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-29 (sessão da tarde)
> **Item ativo:** R-28 (commitado, falta push)
> Handoff anterior: `handoffs/handoff-2026-07-29-0300.md`.

## Agora

**R-28 (pagamento fecha sem duplicar) — codado, verificado na `Teste01` e commitado. Falta push.**
Partes (1) `marcado_por_id` e (2) fechar parcela pendente sem duplicar, ver
[spec](specs/R-28-pagamento-fecha-sem-duplicar.md). `tsc`/`eslint` limpos (só warnings
pré-existentes). Testado ao vivo na `Teste01`: fechar parcela em data diferente de hoje → 1
UPDATE só (zero linha nova, conferido no banco antes/depois), `marcado_por_id` gravado e
aparecendo na UI, "Falta receber" abrindo em modo criar-novo, lápis sumindo em linha pendente
(vira "Marcar como pago"), auto-aprovação disparando quando a parcela fechada completa o total de
um orçamento `enviado`. Parte (3) (5 orçamentos dessincronizados, regra de auto-aprovação
across os 5 caminhos) fica de fora — decisão de negócio, registrada na spec.

**Sem item ativo antes disso.** A sessão anterior fechou o **R-27** e deixou o **R-03c-1** (aceite
assinado do orçamento) codado, pushado e em produção, mas 🟡 — não verificado com 2 contas ainda
(sem mudança nesta sessão).

**No ar e verificado ao vivo:** R-27. Migration 113 (R-03c-1) aplicada em prod e conferida no
schema vivo.

**No ar, verificado com 1 conta, falta a 2ª:** R-03c-1. Fluxo completo testado — assinatura, RPC,
PNG no bucket, snapshot batendo item a item, FK `RESTRICT` e índice único confirmados no banco.
**Falta:** secretária coleta (deve funcionar) · outro dentista da mesma clínica tenta coletar
(deve falhar `sem_permissao`) · dentista de outra clínica não vê o orçamento nem o aceite. Exige
segunda conta real logada — cogitamos usar a clínica `QA TESTE - apagar (financeiro)`, que já tem
os 3 papéis prontos (`qa-teste-admin@`, `qa-teste-dentista2@`, `qa-teste-secretaria@`), mas a
sessão desviou pro R-28 antes de logar nelas.

## Travado

**Nada travado tecnicamente.** O R-03c-1 só espera uma segunda conta pra fechar o gate — não é
bloqueio, é a próxima ação concreta.

Aprendizados de ferramenta pra próxima sessão:
- `computer.left_click` não basta pra componentes Base UI (`Tabs`, possivelmente outros) — eles
  escutam `PointerEvent`, não só `click` sintético. Precisa disparar a sequência completa
  (`pointerdown`→`mousedown`→`pointerup`→`mouseup`→`click`) via `javascript_tool`.
- Dev server (webpack) pode acusar erro de sintaxe em conteúdo que já não existe no arquivo depois
  de muitas edições seguidas na mesma sessão — comparar com `tsc`/`next build` (releem do zero)
  antes de desconfiar do código; se eles passam limpo, é cache do servidor, reinicia.
- `tsc --noEmit` e `next build` **não pegam** violação de export em arquivo `"use server"`
  (só função async pode ser exportada) — isso só aparece na chamada real em runtime.

## Esperando você

- [ ] **Push do R-28** — commitado localmente, nada subiu ainda. Sem migration (só
      `actions.ts` + os 2 componentes do paciente).
- [ ] **Segunda conta logada** pro teste de permissão do R-03c-1 (secretária · outro dentista ·
      idealmente outra clínica `QA TESTE - apagar (financeiro)`, já com os 3 papéis prontos) — é o
      único gate que falta pra virar ✅.
- [ ] **Decisão da parte (3) do R-28** — 5 orçamentos com pagamento mas sem `aprovado`; regra de
      auto-aprovação across os 5 caminhos que marcam `aprovado` é decisão de negócio, não ajuste.
- [ ] **Disposição das chips de rotina na ficha** — pendência de sessões anteriores, você ia
      perguntar aos outros dentistas. `Q1–Q4` duplicado (chips "Região" × chips de raspagem)
      continua sem uso nos dois formatos (0 de 73 fichas / 0 eventos).
- [ ] **Ver o badge "Quitado"** numa clínica com orçamento pago — ainda sem confirmação visual
      (pendência de sessões anteriores).
- [ ] **`procedimentos_concluidos`** — decisão aberta desde o R-11, não bloqueia nada.
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md))
      — P1 coroa hachura vs. circunferência; P3 legenda sem glifo. Ligados ao R-22, congelado.

## Próximo da fila

Com o R-28 esperando só push e o R-03c-1 esperando só a 2ª conta, os próximos candidatos
reais são:

- **R-03c-2** — congelamento/gate de edição do orçamento assinado (agora que R-03c-1 entrega a
  prova, R-03c-2 decide se/como bloquear edição — "Revisar" travado como saída, R-03c-3).
- **R-08c** — periograma completo (grade 6×32), G de verdade — migration+RLS+2 contas.

Fila completa no `ROADMAP.md` (10 itens · 24 concluídos · 1 congelado).

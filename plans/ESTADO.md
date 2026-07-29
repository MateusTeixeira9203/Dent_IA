# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-29 (sessão da tarde)
> **Item ativo:** nenhum — R-28 no ar 🟡 · R-29 especificado, não codado
> Handoff anterior: `handoffs/handoff-2026-07-29-0300.md`.

## Agora

**R-28 (pagamento fecha sem duplicar) — codado, verificado na `Teste01`, pushado (`c37107e..f2804b8`).**
🟡 até rodar em prod ou você confirmar visualmente.
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
**Já coberto nesta sessão:** outro dentista da mesma clínica **não enxerga** o orçamento (a conta
`teste`, como dentista na Império, recebeu 0 orçamentos) e dentista de outra clínica não vê nada.
**Ainda falta:** o **autor coletando com sucesso** e a **secretária coletando** — as duas exigem
login que eu não posso fazer. As contas `qa-teste-*@odontoia-test.local` existem, mas **ninguém
tem a senha**; o caminho que sobrou foi o Mateus pôr as duas contas dele na mesma clínica
(Império), o que já está feito.

**Achado grande de carona → R-29.** Ao montar esse teste apareceu que a lista de pacientes some
pro dentista agregado enquanto a RLS deixa passar, e que `get_my_dentista_id()` ignora a clínica
ativa. São restos do modelo pré-3.1. Diagnóstico completo e decisão do Mateus (paciente é da
clínica, todo dentista vê todos) na [spec R-29](specs/R-29-silo-resto-modelo-antigo.md).

## Travado

**Nada travado tecnicamente.** O R-03c-1 espera só um login que eu não posso fazer — não é
bloqueio de código, é a próxima ação concreta, e é do Mateus.

Aprendizados de ferramenta ficam no handoff, não aqui.

## Esperando você

- [ ] **Confirmar o R-28 rodando** (prod ou olhada sua) pra promover 🟡 → ✅.
- [ ] **Logar com a conta principal** (`mateusteixeira9203@`) pra fechar o R-03c-1 — falta só o
      autor coletando o aceite com sucesso. Eu não logo (regra: não digito senha).
- [ ] **Decisão da parte (3) do R-28** — 5 orçamentos com pagamento mas sem `aprovado`; regra de
      auto-aprovação across os 5 caminhos que marcam `aprovado` é decisão de negócio, não ajuste.
- [ ] **Quando atacar o R-29** — é o item com maior risco parado na fila (autorização), mas o raio
      hoje é 1 conta de teste. Antes de qualquer usuário real virar multi-clínica, precisa entrar.
- [ ] **Disposição das chips de rotina na ficha** — pendência de sessões anteriores, você ia
      perguntar aos outros dentistas. `Q1–Q4` duplicado (chips "Região" × chips de raspagem)
      continua sem uso nos dois formatos (0 de 73 fichas / 0 eventos).
- [ ] **Ver o badge "Quitado"** numa clínica com orçamento pago — ainda sem confirmação visual
      (pendência de sessões anteriores).
- [ ] **`procedimentos_concluidos`** — decisão aberta desde o R-11, não bloqueia nada.
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md))
      — P1 coroa hachura vs. circunferência; P3 legenda sem glifo. Ligados ao R-22, congelado.

## Próximo da fila

Ordem decidida com o Mateus em 29/07 — **o R-29 passa na frente do R-03c-2**:

- **R-29** — restos do silo pré-3.1 (spec escrita, não codada). Migration 114 + 3 linhas na lista.
  Passa na frente porque mexe em autorização e tem janela: hoje o raio é 1 conta de teste, e vira
  incidente com dado inconsistente no dia em que um dentista real entrar em 2 clínicas.
- **R-03c-2** — congelamento/gate de edição do orçamento assinado (agora que R-03c-1 entrega a
  prova, R-03c-2 decide se/como bloquear edição — "Revisar" travado como saída, R-03c-3).
- **R-08c** — periograma completo (grade 6×32), G de verdade — migration+RLS+2 contas.

Fila completa no `ROADMAP.md` (11 itens · 24 concluídos · 1 congelado).

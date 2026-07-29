# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-29 17:00
> **Item ativo:** nenhum · **Próximo:** R-29 (spec pronta, não codada)
> Handoff: `handoffs/handoff-2026-07-29-1700.md`.

## Agora

**Sem item ativo.** A sessão da tarde fechou o **R-28** (código no ar) e abriu o **R-29**
(especificado, não codado). O **R-03c-1** avançou mas não fechou.

**🟡 no ar, verificado só em clínica de teste — R-28.** Fechar parcela pendente agora é `UPDATE`
na linha existente, com data livre; `marcado_por_id` gravado nas 3 funções de escrita. Provado na
`Teste01` conferindo o banco antes/depois: **1 UPDATE, zero linha nova**. Pushado
(`c37107e..f2804b8`). Falta rodar em prod ou você confirmar na tela pra virar ✅.

**🟡 no ar, 2 de 4 cenários cobertos — R-03c-1.** O fluxo já estava provado com 1 conta
(assinatura → RPC → PNG no bucket → snapshot imutável; FK `RESTRICT` e índice único atacados no
banco). Nesta sessão confirmei mais dois: **outro dentista da mesma clínica não enxerga** o
orçamento, e **outra clínica não vê nada**. **Faltam os dois que exigem login:** o autor coletando
com sucesso e a secretária coletando.

**⏳ especificado, não codado — R-29.** Restos do modelo pré-3.1, achados montando o teste acima:
`get_my_dentista_id()` ignora a clínica ativa (app e RLS discordam de quem o usuário é, e falha
em silêncio), e a lista de pacientes ainda filtra por dentista enquanto a RLS libera a clínica
inteira. Diagnóstico e decisão na [spec R-29](specs/R-29-silo-resto-modelo-antigo.md).

## Travado

**Nada travado por código.** O R-03c-1 espera só um login — as contas `qa-teste-*` existem mas
**ninguém tem a senha**, e o caminho que sobrou (suas duas contas na mesma clínica) já está
montado. É ação sua, não bloqueio técnico.

## Esperando você

- [ ] **Logar com a conta principal** (`mateusteixeira9203@`) e coletar o aceite — fecha o
      R-03c-1. O fixture está pronto: paciente `Teste R-03c-1 (apagar)` na Império, orçamento
      `enviado` de R$300.
- [ ] **Confirmar o R-28 rodando** (prod ou olhada sua) pra promover 🟡 → ✅.
- [ ] **Decisão da parte (3) do R-28** — 5 orçamentos com pagamento mas sem `aprovado`. Qual dos
      5 caminhos deve auto-aprovar é regra de negócio, não ajuste.
- [ ] **Limpar os dados de teste** que deixei no banco — listados no fim do handoff. Não apaguei
      porque o fixture da Império ainda é necessário.
- [ ] **Disposição das chips de rotina na ficha** — você ia perguntar aos outros dentistas.
      `Q1–Q4` duplicado, sem uso nos dois formatos (0 de 73 fichas / 0 eventos).
- [ ] **Ver o badge "Quitado"** numa clínica com orçamento pago — sem confirmação visual ainda.
- [ ] **`procedimentos_concluidos`** — decisão aberta desde o R-11, não bloqueia nada.
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md))
      — P1 coroa hachura vs. circunferência; P3 legenda sem glifo. Ligados ao R-22, congelado.

## Próximo da fila

**R-29** é o primeiro ⏳ do `ROADMAP.md`, decidido em 29/07 à frente do R-03c-2 — mexe em
autorização e tem janela (hoje o raio é 1 conta de teste). Fila completa no `ROADMAP.md`
(11 itens · 23 concluídos · 1 congelado).

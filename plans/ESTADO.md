# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-27 · **Ativo:** nenhum — os 3 itens da sessão estão no ar e verificados ·
> **Modo da próxima:** o Mateus escolhe. Handoff: `handoffs/handoff-2026-07-27-1730.md`.

## Agora

**Sem item ativo.** A sessão de 27/07 abriu e fechou três: **R-05 · R-06 · R-07** no ar e
**verificados em prod pelo Mateus** (✅). Com eles, a regra de produto de 21/07 — *toda
especialidade precisa de entrada manual, não só voz* — está cumprida para orto, prótese fixa,
odontopediatria e rotina. **Zero migration** na leva: o banco já aceitava os tipos desde a 106.

**Duas ferramentas novas, que valem além dos itens:**
- **`evals/extracao-clinica`** — o gate que a regra do CLAUDE.md exigia pra mexer no prompt de
  extração e não existia. Rodar antes e depois de qualquer mudança de prompt/enum; aceite = ATUAL
  não cai, inventados não sobem. Baseline: **16/16 · 0 inventados · 4/4 nos tipos novos**. Precisa
  de dev server + sessão logada salva, e `NODE_PATH` apontando pro `node_modules` do projeto.
- **Símbolos parametrizados por fração** (const `G` em `Odontograma.tsx`) — portados do artefato
  canônico. Símbolo novo entra por fração de w/coroa/raiz, nunca por coordenada absoluta (o dente
  do artefato é 2–4× maior que o renderizado).

**Pronto pra retomar (specs prontas pra execução):**
- **R-11** — unificar a gravação da ficha. **Zero migration/RLS**; a Fase 0 (apagar código morto)
  pode ir sozinha. **Overlap com R-03b** (os 3 fluxos de assinatura) — coordenar antes de codar.
- **R-03a** — assinatura por procedimento. ⚠️ mexe em **prod** (migration + trigger + RLS):
  migration sozinha primeiro, **teste com 2 contas**. Migration nº **111**.

## Travado

**Nada travado.** Constraints de sempre: banco é prod (dev=prod), então escrita em prod pede
confirmação explícita e mudança de RLS/permissão pede teste com 2 contas logadas; o pane embutido
não renderiza a ficha logada — verificação de UI é por harness Playwright com a sessão salva.

## Esperando você

- [ ] **Escolher o próximo item** — **R-11** (leve) ou **R-03a** (pesado, prod); ou o que sobrou do
      cluster de especialidades: **R-08** (periograma, G — absorveu o `exame_periodontal`) e
      **R-09** (voz nas especialidades, começando pela endo).
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md)) —
      **P1** a coroa usa hachura (convenção anglo) e a norma latina usa circunferência envolvendo a
      coroa; **P3** a legenda explica só cores, nenhum glifo (parafuso, margem cervical, linha da
      ponte) é explicado. Ficam ligados ao R-22, congelado.
- [ ] **O que é "ficha rápida" pra você** (aberta desde 26/07) — as rotas `/dashboard/fichas/{nova,[id]}`
      são `redirect` pra 404; a criação viva é o "Nova Evolução" do FichasTab. Sua resposta fecha o
      diagnóstico do "Dex fora do ar".
- [ ] *(sugestão, decisão sua)* no R-22 há 1 fix de 1 linha (`globals.css:267` — o corpo do app
      renderiza em Times, não Outfit) — candidato a `/pontual` a qualquer momento, alto ganho.

## Próximo da fila

Fila em `ROADMAP.md` (11 itens · 16 concluídos · 1 congelado). As duas specs prontas (R-11, R-03a)
são os candidatos mais maduros; o resto precisa de escopo antes de código.

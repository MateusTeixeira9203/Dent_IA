# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-26 · **Ativo:** nenhum — tudo da sessão está no ar e verificado ·
> **Modo da próxima:** o Mateus escolhe (executar ou escopar). Handoff: `handoffs/handoff-2026-07-26-0300.md`.

## Agora

**Sem item ativo — sessão fechou tudo que abriu, no ar.** O que rodou (26/07):
- **Audit visual do Fable** → [relatório](auditorias/2026-07-26-relatorio-audit-visual.md) (115 achados)
  + [fingerprint canônico](auditorias/2026-07-26-fingerprint-canonico.md). Achados **congelados em R-22**.
- **Lote da semana** deployado (`929f84e..47a6e19` → Vercel) e validado em prod → **9 itens ✅** fechados.
- **R-04b** executado ponta a ponta e fechado ✅ (migration 110 aplicada + 2 contas + deploy `866c1d4`).
- Registrados R-24 e R-25; eslint silencia `.cjs`. Working tree limpo, tudo pushado.

**Pronto pra retomar (specs prontas pra execução):**
- **R-03a** — assinatura por procedimento (backend: tabela `assinaturas` genérica + trigger + RPC).
  ⚠️ mexe em **prod** (migration+trigger+RLS) → migration sozinha primeiro, **teste 2 contas**. Migration nº **111**.
- **R-11** — unificar gravação da ficha. **Zero migration/RLS**; a Fase 0 (apagar código morto) pode ir sozinha.
  **Overlap com R-03b** (os 3 fluxos de assinatura) — coordenar as duas antes de codar.

**Infra reutilizável (desta sessão):** captura logada = conta de teste e-mail/senha + Playwright headed;
`capture-audit-3.cjs` reusa a sessão salva (re-captura headless, sem login); workflow do Fable é retomável
(`resumeFromRunId`). Aplicar migration em prod = MCP `apply_migration` **com confirmação explícita** do Mateus.

## Travado

**Nada travado.** Constraints de sempre: pane embutido não renderiza a ficha (captura = Playwright);
banco é prod (dev=prod), então escrita em prod precisa de confirmação e RLS/permissão pede teste de 2 contas.

## Esperando você

- [ ] **Escolher o próximo passo** — executar **R-03a** (pesado, prod) ou **R-11** (leve, sem migration),
      ou escopar mais da fila (R-05 orto manual · R-09 voz nas especialidades · R-10 P2 · R-24 · R-25).
- [ ] **O que é "ficha rápida" pra você** — as rotas `/dashboard/fichas/{nova,[id]}` são `redirect` pra 404
      (mortas); a criação viva é o "Nova Evolução" no FichasTab. Então o "Dex fora do ar" ou é rota
      desmontada, ou é o Dex do Nova Evolução falhando por ambiente. Sua resposta fecha esse diagnóstico.
- [ ] *(sugestão, decisão sua)* dentro do R-22 congelado há 1 fix de 1 linha (`globals.css:267` — corpo do
      app renderiza em Times, não Outfit) — candidato a `/pontual` a qualquer momento, alto ganho.

## Próximo da fila

Fila em `plans/ROADMAP.md` (12 itens · 13 concluídos · 1 congelado). Sem ordem imposta — as duas specs
prontas (R-03a, R-11) são os candidatos mais maduros; o resto precisa de escopo antes de código.

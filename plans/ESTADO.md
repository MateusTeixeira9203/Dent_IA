# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-26 · **Ativo:** nenhum — audit do Fable FECHADO, achados congelados (R-22) ·
> **Modo:** voltando ao planejamento normal da fila

## Agora

**Audit visual do Fable concluído (26/07).** Captura completa (67 screenshots — logadas, light+dark,
estados interativos: modais, abas, odontograma expandido, dente aberto) + 15 auditores → 115 achados.
Saídas: [relatório priorizado](auditorias/2026-07-26-relatorio-audit-visual.md) +
[fingerprint canônico](auditorias/2026-07-26-fingerprint-canonico.md) (a régua reutilizável do design).
Achados **congelados em R-22** por decisão do Mateus — mexe neles quando quiser voltar ao design.

**Próxima sessão = planejamento:** escolher o próximo item da fila do ROADMAP. Candidatos pela ordem
da fila: R-19 (já tem código 🟡), R-03 (assinatura por procedimento), R-04b, R-05. Também na mesa
(adiados de 25/07): voz nas especialidades (R-09), unificar gravação (R-11), R-10 P2.

**Infra nova reutilizável (desta sessão):**
- Captura logada resolvida: conta de teste e-mail/senha (NUNCA o botão Google) + Playwright headed.
- `capture-audit-3.cjs --headless` reusa a sessão salva — re-captura sem login (até expirar no Supabase).
- Workflow do Fable é retomável (`resumeFromRunId`) — agentes prontos voltam do cache.

## Lote de código — 🟡 pronto, não verificado na tela

Tudo working tree, nada commitado. **🟡 = tratar como não-feito até o Mateus ver no localhost.**
- **R-21** registros por dente — **✅ validado ao vivo** (exceção). `agrupar-por-dente.ts`+teste, `dente-grupo-header.tsx`, `FichasTab`.
- **R-12** contraste AA 🟡 — o audit confirmou o furo: CTAs teal chapado escaparam em ~8 telas (detalhe no relatório R-22).
- **R-10 P1** jargão 🟡 — `derivarV2DosEventos` sem "- planejado" (forward-only, manual).
- **R-19** barra × dock 🟡 — var `--dock-inset`; voice-ux acima do dock na ficha.

## Travado

**Nada trava.** Constraints conhecidas: pane embutido não renderiza ficha (captura = Playwright);
banco é prod (auditoria nunca clica em botão destrutivo); Dex da ficha rápida fora do ar (ambiente,
chave/quota — diagnosticado 25/07, adiado).

## Esperando você

- [ ] **Commit + deploy do lote validado** — R-21 + R-16/R-17/R-18/R-04/R-02/R-20 + migration 109.
      É a pendência mais antiga; working tree grande é risco crescente.
- [ ] **Verificar os 🟡 no localhost** — R-12, R-19, R-10, R-02 símbolos.
- [ ] **Escolher o próximo item da fila** (abre a sessão de planejamento).
- [ ] **Dex da ficha rápida** — pegar o erro real do terminal quando for mexer.
- [ ] *(sugestão registrada, decisão sua)* dentro do R-22 congelado há 1 fix de linha única
      (`globals.css:267` — corpo do app inteiro renderiza em Times) — candidato a `/pontual` a qualquer momento.

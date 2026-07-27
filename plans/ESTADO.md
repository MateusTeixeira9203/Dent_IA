# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-26 · **Ativo:** nenhum — lote da semana **VALIDADO EM PROD E FECHADO** (9 itens → Concluído) ·
> **Próximo:** executar R-03a ou R-11 (specs prontas), ou escopar mais da fila (R-04b/R-05/R-09).

## Agora

**Audit visual do Fable concluído (26/07).** Captura completa (67 screenshots — logadas, light+dark,
estados interativos: modais, abas, odontograma expandido, dente aberto) + 15 auditores → 115 achados.
Saídas: [relatório priorizado](auditorias/2026-07-26-relatorio-audit-visual.md) +
[fingerprint canônico](auditorias/2026-07-26-fingerprint-canonico.md) (a régua reutilizável do design).
Achados **congelados em R-22** por decisão do Mateus — mexe neles quando quiser voltar ao design.

**Agora = escopar a fila (planejamento).** Plano combinado com o Mateus (26/07): (1) lote da semana
commitado ✅; (2) status dos não-verificados marcados 🟡; (3) **escopar as próximas coisas da fila**;
(4) SÓ ENTÃO fazer o deploy; (5) Mateus volta, testa tudo e a gente avalia (promove 🟡→✅).
**R-03 escopado (26/07):** virou **R-03a** (backend: tabela `assinaturas` + trigger de imutabilidade
+ RPC — [spec pronta pra execução](specs/R-03a-assinatura-por-procedimento.md)) + **R-03b** (captura/UI
+ reconciliar 3 fluxos legados — fila) + **R-03c** (assinatura de aceite do ORÇAMENTO — prova de
recebimento; ideia nova do Mateus 26/07, reusa a tabela `assinaturas` genérica). Decisões travadas:
assinatura por lote, trigger no banco, secretária+dentista via RPC, e **tabela `assinaturas` genérica**
(serve clínico + orçamento — ajustada no R-03a antes de virar migration). R-03a mexe em prod (migration+RLS)
→ item de execução próprio, 2 contas.
**R-11 escopado (26/07):** [spec pronta pra execução](specs/R-11-unificar-gravacao-ficha.md).
Reenquadre — não é "status divergente" (o `status` nunca é lido): são 9 caminhos + código morto
duplicando create/update/delete sem validação, + 2 furos vivos (client apaga sem checar autoria;
UPDATE de ficha assinada não barrado no servidor). Afunila em `salvarFicha`/`deletarFicha`, apaga o
morto, zero migration. Decisões travadas: arquivo novo, incluir DELETE, guard de imutabilidade,
apagar morto, não tocar assinatura. Também nasceu **R-24** (indicador de ficha em aberto — dar uso
ao `status`). Próximos candidatos a escopar: R-04b, R-05, R-09.
R-19/R-12/R-10-P1 já codados (só faltam verificar).

**Infra nova reutilizável (desta sessão):**
- Captura logada resolvida: conta de teste e-mail/senha (NUNCA o botão Google) + Playwright headed.
- `capture-audit-3.cjs --headless` reusa a sessão salva — re-captura sem login (até expirar no Supabase).
- Workflow do Fable é retomável (`resumeFromRunId`) — agentes prontos voltam do cache.

## Lote da semana — NO AR e FECHADO (deploy 26/07, `929f84e..47a6e19` → Vercel prod)

Mateus **validou tudo em prod (26/07)**. **9 itens fechados** → Concluído, specs/artefatos movidos pro
`_arquivo/`: R-21, R-20, R-19, R-18, R-17, R-16, R-12, R-04, R-02. **R-10 P1 verificado** (P2 segue na fila).
Rollback (se precisar): Vercel → promover deployment anterior, ou `git revert` do range.

## Travado

**Nada trava.** Constraints conhecidas: pane embutido não renderiza ficha (captura = Playwright);
banco é prod (auditoria nunca clica em botão destrutivo); Dex da ficha rápida fora do ar (ambiente,
chave/quota — diagnosticado 25/07, adiado).

## Esperando você

- [ ] **Executar R-03a e/ou R-11** (specs prontas) — próximo passo natural. R-03a mexe em prod (migration+trigger+RLS, 2 contas); R-11 é refactor sem migration (Fase 0 = apagar código morto pode ir sozinha).
- [ ] **Commit dos docs** — muita coisa em `plans/` no working tree desta sessão (roadmap/estado, specs R-03a/R-11, arquivamentos). Vai num `docs(plans)` no fim da sessão.
- [ ] **Escopar mais da fila** (opcional) — R-04b, R-05, R-09.
- [ ] **Esclarecer o que é "ficha rápida"** — o R-11 revelou que as rotas `/dashboard/fichas/{nova,[id]}`
      são `redirect` puro pra uma rota inexistente (**404 hoje**), não uma tela viva. A criação que
      funciona é o "Nova Evolução" no FichasTab do paciente. Então o "Dex da ficha rápida fora do ar"
      pode ser: (a) a rota foi desmontada de propósito, ou (b) o Dex do Nova Evolução que falha por
      ambiente. **Mateus dizer qual** → ajustar o diagnóstico (e se quer reviver a ficha rápida standalone).
- [ ] *(sugestão registrada, decisão sua)* dentro do R-22 congelado há 1 fix de linha única
      (`globals.css:267` — corpo do app inteiro renderiza em Times) — candidato a `/pontual` a qualquer momento.

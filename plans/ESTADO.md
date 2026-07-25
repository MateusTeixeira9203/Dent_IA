# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-25 (16:24) · **Ativo:** R-21 (registros por dente) ·
> **Modo:** planejamento fechado (spec aprovada) — próximo é execução

## Agora

**R-21 — Registros agrupados por dente.** Spec **✅ aprovada** pelo Mateus
([R-21](specs/R-21-registros-por-dente.md)). A lista de registros vira lista de **dentes**: dente com 1
procedimento mostra direto, 2+ colapsa num grupo "Dente N"; ordem 11→48; tabela de especialidade abre
dentro do dente aberto; clicar o dente no odontograma abre o grupo. Camada nova `agruparPorDente` por
cima do que já existe (não toca `agruparRegistros`, `RegistroCard`, nem a regra do R-01). Validada com um
dentista de verdade.

**Feito:** debate + spec + aprovação (§1 e §2 conferidos pelo Mateus).
**Falta (execução, próxima sessão):**
- [ ] **Mockup** dos 3 estados novos (dente fechado c/ pendência · aberto c/ vários · tabela dentro) →
      aprovação visual do Mateus **antes** do código.
- [ ] **Fase 1** — `agruparPorDente` + testes; render por dente nos 2 sites (`DenteGrupoHeader` novo).
- [ ] **Fase 2** — tabela de especialidade dentro do dente aberto (move o alvo do portal do R-20).
- [ ] **Fase 3** — clicar o dente no odontograma abre o grupo (`destacarDente`), fallback multi-dente.
- [ ] Conferir na execução: o card expõe `data.ancoras` (o dente)? senão ajustar a fonte.

## Travado

Nada trava. Constraint conhecida: o **browser pane embutido não renderiza a ficha** (`visibilityState:
hidden` → skeleton eterno, sem screenshot). Não é o código. Validação visual = Mateus no localhost dele,
ou Playwright por script (memória `project-qa-playwright-harness`).

## Esperando você

- [ ] **Deploy** — 9 commits à frente do origin, **nada foi pushado**. R-04/R-16/R-02/R-17/R-18/R-20
      prontos e (menos R-02 F3) validados. Deploy é decisão sua; migration 109 vai junto (já aplicada no
      banco, o commit só registra o arquivo).
- [ ] **Ver a R-02 Fase 3 na tela** — o modal "Continuar/Novo" de amarração de `grupo_id` está codado e
      committado mas **nunca foi visto ao vivo** (🟡). Abre um dente com trabalho aberto do mesmo tipo →
      o modal deve aparecer.
- [ ] **Símbolos do R-02** (implante/coroa) na tela — pendência antiga; o pino foi corrigido e validado.

## Próximo da fila

Retomar o R-21: mockup → aprovação visual → `/executar` Fase 1. Depois do R-21, o **modo consulta**
reusa o `OdontogramaComPainel` (item futuro). Fila completa em `plans/ROADMAP.md`.

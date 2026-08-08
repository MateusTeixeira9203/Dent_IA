## Agora

**R-78 — Meu dia orientado a fluxo.** F0 (casco: grid vira fluxo vertical, `RegistrarPainel`
vira hook, espelho a `zoom:.68`), F1 (lista "Nesta ficha" vira `RegistroCard` de verdade —
pill clicável, observação editável, "✓ tudo feito", remover) e F2 (tocar o dente abre
histórico, não o editor de faces direto) — **codados e verificados por mim no Brave**, dado
real (paciente Marcos, IA de verdade, save real gravando no banco). Mais o ⤢ (tabela de
especialidade abre no perfil do dente, dentro do card — corrigido 2× a partir de prints dele
até ficar certo). **Tudo 🟡, não ✅** — ele ainda não testou pessoalmente, e **nada foi
commitado ainda**.

**Falta do R-78:** F3 (gavetas — `FaixaGavetas` já reusa os blocos de sempre, pode já estar
coberto, não confirmei), F4 (ler grande — só sobrou o caso de observação/evolução longa no
Histórico; a tabela de especialidade já saiu do escopo, virou o ⤢), F5 (rótulo do rodapé,
ainda mostra "Já registrado hoje" binário em vez de "✓ N ficha(s) hoje").

## Travado

Nada travado.

## Esperando você

- [ ] **Testar pessoalmente o R-78** (F0+F1+F2+⤢) no Meu dia antes de eu commitar qualquer
      coisa — dictar, ver a lista, tocar num dente, abrir uma tabela de especialidade.
- [ ] **R-82 — campo mágico trava a aba** (`captura-livre-card.tsx`, "Maximum update depth
      exceeded", reproduzido 5× hoje, 1 vez travou de verdade). Achado ao vivo, não
      investigado. Decidir se entra antes de eu continuar o R-78 ou depois — é o coração do
      produto (Dex), mas o F3-F5 do R-78 são pequenos e já estão mapeados.
- [ ] **`.claude/worktrees/eager-antonelli-accfa2/`** — pasta com cópia inteira de `src/`,
      provável sobra de agente anterior. Causa OOM no `npm run lint` completo (contornei
      rodando `npx eslint` escopado). Confirmar se pode apagar antes de alguém apagar.
- [ ] `ROADMAP.md` (254 linhas) e a spec do R-78 (343 linhas) passaram do teto (~200/~300) —
      decidir se reorganiza agora ou deixa pro R-78 fechar primeiro.
- [ ] Testar upload de documento real (R-75) — segue pendente desde a sessão #27, arquivos
      intocados de novo nesta sessão.

## Próximo da fila

Ver `plans/ROADMAP.md` — depois do R-78 (F3-F5) e de decidir a prioridade do R-82, a fila
segue normal ({R-49, R-56, R-67} + o resto do Bloco 1).

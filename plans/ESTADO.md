# Estado — 2026-08-08 (sessão #31)

## Agora

**Nenhum item ativo.** R-84 passou pelo gate (`/auditar`) — 🟡 no ROADMAP, spec arquivada.
Falta só commit/push pra virar candidato a ✅. Fila livre.

## Travado

Nada travado.

## Esperando você

- [ ] **R-84 — decidir sobre commit/push.** Código completo (4 arquivos), typecheck+lint
      limpos, gates G1-G9 confirmados ao vivo com paciente real (Salvar de verdade incluso —
      conferi no banco que `ficha_id` não muda e que o Histórico mostra as 2 datas). Os 2
      reviewers do gate (`typescript-reviewer`, `ux-reviewer`) rodaram: UX aprovou sem
      CRITICAL/HIGH; TypeScript achou 1 regressão real (`podeTrocarFicha` perdia o `← Voltar`
      depois de escolher uma ficha específica numa lista de 2+) — **corrigida e reverificada
      ao vivo** (round-trip completo: escolher ficha → Voltar → lista intacta → escolher
      outra). Fica 🟡 até você decidir subir.
- [ ] **R-82 — testar o fix.** Memoizei `anexarTexto` em `meu-dia-client.tsx` (era objeto novo
      a cada render, alimentando o `useEffect` de `captura-livre-card.tsx`). Typecheck/lint
      limpos e regressão ao vivo sem nenhum "Maximum update depth". **Mas não fechei o loop:**
      o caminho só existe de verdade depois de anexar um documento real, e o Browser pane não
      faz upload. Precisa do seu teste com "Nesta ficha" populado + ⤢.
- [ ] **R-75 — testar o upload real na UI.** Eval rodado 2× hoje: ATUAL 15/16 sem regressão
      (a falha é `multi-dente`, timeout de 30s do Gemini, infra). O caso
      `upload-historico-completado-explicito` deu ~80% em 5 chamadas — quando erra, erra pro
      lado seguro (perde o evento, nunca inventa "realizado"). Você disse que testa o upload.
- [ ] **R-83** — segue 🟡. Você disse "já testei" sobre o R-78 em geral; nunca confirmou esse
      fluxo específico. Se testou, vira ✅.
- [ ] **Pilha de 🟡 esperando seu teste pessoal:** R-46h, R-76, R-77, R-80.

## Resolvido nesta sessão (não precisa mais decidir)

- **R-84 codado, gate `/auditar` passou.** Discriminador `idsDeAntes` (derivado de `boca`,
  R-61) distingue indicação nova de pendência antiga em "Nesta ficha"; a antiga ganha a
  marca "de consulta anterior" (mesmo padrão do R-58) e sai do orçamento automático — o
  merge do agregado do R-83 foi cortado. Testado com paciente real via Encaixe, incluindo
  Salvar de verdade (3 pendências de 01/08 fechadas hoje — `ficha_id` preservado no banco,
  confirmado por query direta). `plans/specs/R-84-*.md` arquivada em `_arquivo/specs/`.
- **Worktree órfão apagado.** `.claude/worktrees/eager-antonelli-accfa2/` (2,5GB) removido via
  `git worktree remove --force`. **Antes de apagar, recuperei o fix que estava perdido lá
  dentro**: `data-[selected]`/`data-[state=active]` → `data-[active]` em 4 arquivos (o bug que
  o R-63 achou em 06/08 e deixou "pra corrigir à parte" — nunca tinha sido corrigido no
  `main`). A branch `claude/eager-antonelli-accfa2` ainda existe no git.

## Nota técnica (fora do escopo de qualquer item, achada testando R-84)

Ficha nova sem nenhum evento indicado hoje, só "fazer hoje" de pendências antigas: no
`FichasTab.tsx` (tela do paciente) o card dessa ficha mostra "0/3 realizados" mesmo com os
3 procedimentos concluídos — porque esses eventos continuam com `ficha_id` apontando pra
ficha ANTIGA (comportamento intencional, §2.1 do R-84). O Histórico do Meu dia já resolve
isso certo (via `feitosAqui`, R-58); o card da tela do paciente não usa esse mecanismo.
Baixo risco (é só o número mostrado no card resumo, não afeta o dado), mas se incomodar,
vira item próprio — não é do R-84 nem foi introduzido por ele.

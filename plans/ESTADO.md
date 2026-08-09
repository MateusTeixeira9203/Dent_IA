# Estado — 2026-08-09 (sessão #33, fechada 02:45)

## Agora

**Nenhum item ativo.** Sessão foi auditoria de banco + correção do bloco financeiro. 4
commits, todos separados, sem push: R-86 (`e43e2af`), R-85 (`a32cd88`), R-65 (`0a8df0b`),
R-66 (`0ab1bd1`). Todos 🟡 — codados e testados por mim (R-65/R-66 ao vivo, ponta a ponta,
nesta sessão), nenhum confirmado pessoalmente por ele ainda. Fila livre — próximo item por
`/planejar` ou `/discutir`.

## Travado

Nada travado.

## Decisão dele nesta sessão — vale pro resto do projeto

**Dados da Clindent não são mexidos, ponto.** Ele recusou fechar as 10 parcelas fantasma
reais de lá (R-28 D9) mesmo com o dado tecnicamente inequívoco (`total_pago = valor_devido`
exato) — mesmo tendo aprovado limpar dado de teste seu no Império na mesma sessão. Critério
não é "dado é claro", é "é produção real de terceiros" (memória
`feedback_clindent_somente_leitura`). Código que PREVINE novo caso pode mexer em Clindent
normalmente; dado já existente lá, não.

## Achado, não escopado — decisão dele foi só anotar

**`excluirPagamento` não tem NENHUMA policy de DELETE em `pagamentos`.** RLS ligada, zero
policy `polcmd='d'` — todo clique em "Excluir pagamento" (modal do orçamento) é no-op
silencioso, pra qualquer papel, sempre (pior que o R-66, que só afetava não-dono). Precisa de
spec + migration + gate de 2 contas antes de codar — não é fix só de app-code.

## Esperando você

- [ ] **Testar R-85/R-86/R-65/R-66 pessoalmente.** Todos 🟡, todos testados por mim (R-65/R-66
      ao vivo nesta sessão, ponta a ponta — ver handoff pra roteiro exato), nenhum por você
      ainda. Nada foi pra produção.
- [ ] **Decidir sobre `excluirPagamento`** (achado acima) — virar item, especificar, ou deixar
      pra próxima sessão.
- [ ] **Responder o resto do "quais 🟡 você testou de verdade"** — R-46h, R-77, R-80 continuam
      sem sua confirmação pessoal.
- [ ] **Gate de 2 contas (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c)** — documento de 30/07 nunca
      foi executado, 10 dias parado. Precisa de você logado nas contas
      Paula/Renato/Gabriel/secretária — eu não posso autenticar nelas.
- [ ] **R-53 — pode precisar de segunda olhada** (pendência de sessões anteriores, não tocada
      nesta). O R-84 cortou parte do que ele fazia; G3/G9 não foram reverificados.
- [ ] **R-87 (achado, não investigado)** — erro de hidratação React (#418) em toda navegação.
      Só documentei o sintoma, não abri o código. Baixo risco aparente, mas sistêmico.

## Próximo da fila

Ver `plans/ROADMAP.md`. Sem item 🔵. Depois do financeiro (R-65/R-66/R-28p3), a fila sugerida
pela auditoria de banco desta sessão: R-67/R-44 (5 embeds ambíguos, fix mecânico `!fkey`) —
mesma classe de bug que já derrubou `/dashboard/orcamentos` por 2 meses uma vez.

# Estado — 2026-08-08 (sessão #31, fechada 23:21)

## Agora

**Nenhum item ativo.** R-84 fechado ✅ (gate passou, ele confirmou pessoalmente, commitado
e no ar). Push feito, deploy confirmado via API do Vercel (`dentia.app.br`, `READY`). Fila
livre — próximo item por `/planejar` ou `/discutir`.

## Travado

Nada travado.

## Esperando você

- [ ] **Responder qual dos 🟡 você testou de verdade.** Você disse "o que tá em amarelo já
      foi feito e aplicado em prod" — deploy eu confirmei (é fato, tá em produção), mas
      verificação pessoal é outra coisa: R-76/R-77/R-80 estão em produção **há dias** e
      continuam 🟡 porque a nota registrada é "ele ainda não testou". Não marquei nada disso
      como ✅ sem sua palavra — só o R-84 (que você confirmou nesta conversa). Testou algum
      de R-46h, R-76, R-77, R-80, R-82, R-83, R-75 (upload real) de verdade? Me diz quais.
- [ ] **R-82 — testar com documento real.** Fix aplicado (memoização), regressão ao vivo
      limpa, mas o crash original nunca foi reproduzido nem antes nem depois — o caminho que
      causava (documento anexado + "Nesta ficha" populado) exige upload de arquivo real, que
      o Browser pane não faz.
- [ ] **R-75 — testar upload real na UI.** Código e eval confirmados 2×, falta o clique real.
- [ ] **R-53 — pode precisar de segunda olhada.** O R-84 cortou parte do que ele fazia (merge
      automático no Meu dia); G3/G9 que já estavam em aberto nele não foram reverificados.

## Próximo da fila

Ver `plans/ROADMAP.md` — sem item 🔵. Fila tem 19 itens ⏳, mais a pilha de 🟡 esperando
teste pessoal (pergunta acima).

# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-31 22:00 · sessão #9
> **Item ativo:** R-46 (Meu dia) · **Modo da última sessão:** discussão → planejamento → execução

## Agora

R-46 em execução. R-46a (esqueleto + rail + contexto do Meu dia) codado. Fase 0 (diagnóstico
do Organizar com Dex) e R-47 (os 3 bugs de perda de dado que ela achou) corrigidos. Próxima
fatia planejada: R-46c (colar do Word, nível 1).

### Feito nesta sessão
- [x] R-46 — discussão de atrito da ficha virou spec aprovada; R-15 absorvido e arquivado
- [x] Fase 0 — diagnóstico do pipeline Dex da ficha rápida, 6 achados confirmados
- [x] R-47 — 3 bugs de perda silenciosa de dado corrigidos (2 rodadas de correção)
- [x] R-46a — rota `/dashboard/meu-dia` codada (rail + contexto), zero escrita nova
- [x] `pdf-parse` — import quebrado corrigido (campo mágico + importar-procedimentos)
- [x] Orçamentos — download liberado pra secretária; PDF sem cor de fundo e sem quebra de
      página corrigidos; orçamento novo nasce sem valor por item
- [x] 9 commits, todos pushados (`main` em `4331e61`)

### Falta
- [ ] Testar ao vivo R-47 e R-46a — verificados só estaticamente (2 rodadas de verificação
      adversarial cada + typecheck/lint/build). O browser pane ficou fora do ar quase a
      sessão inteira; voltou a funcionar mais tarde e não foram retestados
- [ ] R-46c (colar do Word, nível 1 sem IA) — próxima fatia, não iniciada
- [ ] Abertas da spec do R-46: A1 (revisão do Dex em lista escala pra cirurgia longa? decide
      a fase 3 de aposentar `/consulta`), pendência de colega (executa direto ou confirma),
      ordem de construção das próximas fatias

## Travado

Nada travado por código.

## Esperando você

- [ ] **R-28 Parte 3 — pagamento duplicado ("saldo pendente fantasma").** Achei 2 ocorrências
      reais com dinheiro errado na tela (orçamento da Gessica, R$250; orçamento do "marcos",
      R$5.360 fantasma) testando outra coisa — já era decisão de negócio em aberto desde o
      R-28. Vira item ⏳ agora, ou resolve manualmente o caso da Gessica primeiro? Ver
      hipótese da causa no handoff de 31/07 22:00.
- [ ] **[Gate de 2 contas](auditorias/2026-07-30-gate-2-contas.md)** — segue sem rodar,
      precisa do seu login (cobre R-29/R-32/R-34).
- [ ] **R-40** — termo de consentimento clínico ou contrato de prestação? Ainda sem decisão.
- [ ] **R-44 (2 telas extras)** — `command-palette.tsx` e `atender-agora-modal.tsx` também
      têm busca sensível a acento. Inclui agora ou espera.
- [ ] **R-45 (recall automático)** — ideia capturada em 30/07, não iniciado.
- [ ] **Lista interna de orçamentos** não esconde valor por item mesmo com o novo default —
      é intencional (R-38 sempre foi só sobre o PDF pro paciente), mas confirma se você quer
      isso também na visão interna de gestão.

## Próximo da fila

R-46c (colar do Word, nível 1) é a próxima fatia planejada do item ativo — a menos que a
decisão do R-28 Parte 3 fure a fila primeiro, por ser dinheiro errado na tela de um cliente
real. Fila completa no [ROADMAP](ROADMAP.md).

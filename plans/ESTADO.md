# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-01 · sessão #11
> **Item ativo:** R-46 (Meu dia) · **Modo:** planejamento (R-46c)

## Agora

**O Meu dia salva de verdade.** R-46b2 codado e provado ponta a ponta contra o banco real
(01/08): 1 clique gravou a ficha, o evento do odontograma, fechou o agendamento e notificou
a secretária — os 4 conferidos por query, não pela tela. As 3 decisões que estavam travando
o R-46b/g foram fechadas nesta sessão.

Agora em **planejamento do R-46c** (colar do Word) — spec escrita, fase `contrato`,
esperando aprovação.

### Feito (nada commitado — tudo working tree desde `02dd01a`)
- [x] R-46a — ✅ verificado ao vivo.
- [x] R-46g (a porta) — 🟡 codado, 6 gates confirmados clicando, resto só typecheck/estrutura.
- [x] **R-46b (registrar)** — 🟡 codado + **interação testada de verdade** (01/08): +dente,
      chips de região, typeahead, "fazer hoje", texto. G1/G4/G5 confirmados. Nada disso
      estava quebrado — era HMR velho do dev server.
- [x] **R-46b2 (salvar e chamar próximo)** — 🟡 codado e **provado no banco** (ficha
      `concluida` + evento + agendamento `completed` + notificação). Falta: G5 (duplo
      clique), G6 (falha da RPC), G2 (ficha idêntica no perfil).
- [x] **3 decisões fechadas** — R-46b A3 (busca única: catálogo comercial vira observação,
      tipo sempre confirmado à mão) · A4 ("fazer hoje" direto, aceito) · R-46g A1 (gate de
      assinatura **ignorado por ora** — não há sistema de pagamento que o sustente).
- [x] 2 bugs achados e corrigidos: busca mostrava `endodontia` em vez de "Canal" ·
      registro de boca toda dizia "quadrante undefined" (esse era compartilhado com `/consulta`).

### Falta
- [ ] **Aprovar a spec do R-46c** — [R-46c-colar-do-word.md](specs/R-46c-colar-do-word.md),
      fase `contrato`. Achado que muda o item: `fichas.origem` **nunca é exibido em lugar
      nenhum** hoje, e a timeline chama toda ficha de "Consulta realizada" — sem consertar
      isso, um histórico importado mente dizendo que foi um atendimento.
- [ ] Gates que faltam do R-46b/b2/g (lista acima) — nenhum é bloqueio pra seguir.
- [ ] **Commitar** — 5 sessões de trabalho paradas no working tree.

## Travado

Nada por código. O pane do browser continua intermitente; o jeito que funcionou hoje foi
dirigir por script com evento de ponteiro fiel (pointerdown/up/click), não `.click()`.

**Armadilha recorrente:** o dev server serve código velho depois de muitas edições (HMR).
Sintoma: erro de função que não existe mais no arquivo. Cura: reiniciar o servidor — não
caçar bug no código.

## Esperando você

- [ ] **Spec do R-46c** — aprovar, ou pedir mudança.
- [ ] **R-28 Parte 3** — D7 (fechar parcela só por valor exato) · D8 (WhatsApp/AbacatePay
      entram na correção?) · D9 (o que fazer com as duplicatas que já existem — dinheiro real).
- [ ] **Discussão do atrito** ([doc](discussoes/como-diminuir-o-atrito.md)) — o achado do endo
      (carry-forward do `detalhe`) vira item de roadmap quando?
- [ ] **[Gate de 2 contas](auditorias/2026-07-30-gate-2-contas.md)** — precisa do seu login.
- [ ] **R-40** — termo de consentimento clínico ou contrato de prestação?
- [ ] **R-44** — busca sensível a acento (2 telas), inclui agora ou espera.
- [ ] **R-45** (recall automático) — ideia de 30/07, não iniciado.
- [ ] **Lista interna de orçamentos** não esconde valor por item — confirma se quer isso também.

## Próximo da fila

R-46c (aprovar spec → executar). Depois: R-46d (Dex embutido), bloqueado pela Fase 0.
Fila completa no [ROADMAP](ROADMAP.md).

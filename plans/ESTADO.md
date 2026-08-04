# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-04 01:31 · sessão #16
> **Item ativo:** R-46 (Meu dia) · **Modo:** nenhum (sessão encerrada)

## Agora

**Bloco de execução fechado e commitado.** D1 (queixa null), R-46d D0 (dedup extraído pra
lib) e R-52 (encaminhar em lote) estão codados, verificados e commitados — R-52 com prova real
no banco (escrita confirmada, item some da lista de quem encaminhou). R-51 está codado e
commitado, mas **não** verificado em cenário multi-sessão real — só typecheck/lint/build e
dado sintético.

### Duas decisões de produto grandes fecharam nesta sessão
- **"Já feito" sai de vez** da coluna direita — o dado vira só `visitas[].eventos`, sem campo
  próprio. Histórico é a única fonte do acumulado clínico.
- **Campo mágico substitui a barra de procedimento inteira** — absorve o R-46b, muda a métrica
  de "3 gestos determinístico" pra um caminho com IA no meio (com fallback sem IA obrigatório
  pelo painel do dente).

### 4 specs em `contrato`/`aprovada`, nenhuma codada ainda
- **[C6](specs/R-46-C6-layout-cockpit.md)** `aprovada` — colunas redistribuídas (esquerda = o
  que aconteceu, direita = o que está pendente), painel do dente vira resumo + `Sheet`.
- **[R-46d D1](specs/R-46d-campo-magico.md)** `contrato` — campo mágico com detecção em tempo
  real (motion no odontograma, nunca cor).
- **[R-53](specs/R-53-orcamento-indicados-abertos.md)** `contrato` — orçamento nasce dos
  indicados em aberto, query ficha-cêntrica.
- **[R-58](specs/R-58-historico-detalhado.md)** `contrato` — histórico com texto em evidência,
  entra **antes** do R-53 (decisão dele).

## Travado

Nada tecnicamente. C6 e R-46d D1 precisam do browser pane pra qualquer verificação visual —
e o D5 (piso de 36px) + medir o G1 de verdade são **gate de entrada** dos dois, não consequência.

## Esperando você

- [ ] **Ordem de execução:** R-58 → R-53 (como está no ROADMAP), ou C6/R-46d D1 primeiro?
- [ ] **Push** — 13 commits acumulados (9 de antes + 4 desta sessão), produção continua em 31/07.
- [ ] **R-51** — testar em cenário multi-sessão real quando houver paciente de teste com
      tratamento em grupo.
- [ ] **R-46h e "marcar retorno"** — sem spec ainda.
- [ ] Itens antigos: R-56 · R-28 Parte 3 · gate de 2 contas · R-40 · R-44.

## Próximo da fila

D5 (piso 36px) + medir G1 de verdade → C6 + R-46d D1 juntos (UI nova, precisa do browser) ·
R-58 → R-53. Fila completa no [ROADMAP](ROADMAP.md).

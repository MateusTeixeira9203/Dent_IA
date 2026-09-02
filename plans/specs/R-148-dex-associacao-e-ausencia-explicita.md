# R-148 — Dex: associação local e ausência dentária explícita

> **SPEC** · `aprovada` · 02/09/2026

## Problema

No relato com mais de um procedimento, o indicador local podia associar dentes de frases
distintas ao procedimento errado. Além disso, a frase explícita “dente N está ausente” não
tinha uma normalização determinística para o estado clínico do odontograma.

Exemplo de regressão: “canal no 18, extração no 44, o dente 23 está ausente e vou usar
implante nele; o 37 está ausente”. O resultado correto é canal 18, extração 44, implante 23
e ausências pré-existentes em 23 e 37.

## Contrato

- O matcher local associa dentes apenas ao trecho do procedimento; com mais de um procedimento,
  ele não usa o conjunto global de dentes como fallback.
- O pronome `nele/nela` pode reutilizar somente o dente explicitamente citado no trecho clínico
  imediatamente anterior. Sem referência inequívoca, o chip pede seleção no odontograma.
- `dente N está/é ausente` gera um chip próprio **Dente ausente**, nunca **Extração**.
- Ao aplicar esse chip, cria-se `exodontia` com `status=realizado`,
  `origem=preexistente` e sem data de realização. Não representa extração feita hoje.
- O fluxo “Organizar com Dex” reaplica a mesma regra após a resposta estruturada, preservando
  implante ou outro procedimento no mesmo dente e substituindo somente uma exodontia ambígua.
- Negação explícita (“não está ausente”) não cria estado.

## Aceite

- A frase de regressão tem chips: Canal 18, Extração 44, Implante 23, Dentes ausentes 23 e 37.
- Os dentes 23 e 37 recebem o estado pré-existente no odontograma; nenhum deles aparece como
  extração planejada.
- Texto sem referência inequívoca não recebe dente por chute.
- Testes unitários cobrem associação, pronome, negação e normalização do estado.

## Fora de escopo

- Inferir ausências por radiografia, histórico implícito ou ausência de desenho no odontograma.
- Alterar o status de procedimentos que não foram explicitamente declarados como ausentes.

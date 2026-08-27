# R-136 — Financeiro do orçamento claro

## Objetivo

Reduzir a ambiguidade da lateral financeira do orçamento. O dentista vê o resumo e escolhe
um único caminho: receber à vista ou criar parcelamento. A tela nunca exibe os dois fluxos
de confirmação simultaneamente.

## Restrições

- Reutiliza a linguagem aprovada no R-135; não cria novo design system.
- Mantém procedimentos à esquerda e financeiro à direita no desktop.
- No celular, financeiro vem depois dos procedimentos e não cria rolagem horizontal.
- Quando não há itens aprovados, não mostra saldo `R$ 0,00`: mostra `Aguardando aprovação`.
- Editar valor final é uma ação secundária do resumo, nunca parte do formulário de pagamento.

## Tokens de referência

| Papel | Valor |
| --- | --- |
| Fundo | `#0d0d0d` |
| Superfície | `#111112` |
| Borda | `#27272a` |
| Texto | `#fafafa` |
| Texto secundário | `#a1a1aa` |
| Ação teal | `#5dbeb0` |
| Teal escuro | `#2f9c85` |

## Hierarquia

1. Resumo: aprovado, recebido e saldo.
2. Ajuste opcional de valor negociado.
3. Uma pergunta: `Como o paciente vai pagar?`.
4. Campos exclusivos do modo escolhido.
5. Uma única CTA: registrar recebimento ou criar plano.
6. Após parcelar, a lista de parcelas substitui o formulário inicial.

## Motion

Transição de conteúdo entre modos: 160ms, opacidade + deslocamento vertical máximo de 6px.
Sem animação contínua; respeitar `prefers-reduced-motion`.

# DESIGN.md — R-135 Orçamento claro
_Gerado em: 2026-08-26_

## 1. Produto e contexto

**Tipo:** fluxo operacional de SaaS odontológico B2B, desktop e mobile.
**Público:** dentista montando uma proposta durante ou logo depois da consulta.
**Direção:** bancada clínica compacta — cada informação precisa explicar sua origem e permitir
correção imediata.

**Princípio obrigatório:** complexidade progressiva. O caminho comum mostra somente seleção,
valor e próxima ação. “Já orçados”, falhas de origem e opções financeiras avançadas aparecem
apenas quando existem ou quando o usuário pede. Uma etapa, uma decisão e um CTA principal.

## 2. Estilo visual

Mantém a identidade atual de Dashboard, Meu Dia e Ficha: superfícies sóbrias, hierarquia
editorial nos títulos e teal reservado para seleção e ação. O diferencial da tela é uma
“linha de procedência”: ficha → procedimento → valor → orçamento.

## 3. Paleta

### Light

| Token | Hex | Uso |
|---|---:|---|
| Teal | `#2f9c85` | ação e seleção |
| Teal claro | `#5dbeb0` | foco e destaque secundário |
| Fundo | `#f4f4f6` | canvas |
| Superfície | `#ffffff` | modal e cards |
| Superfície alternativa | `#dadade` | inputs e áreas secundárias |
| Borda | `#c2c2c6` | separação |
| Texto | `#09090b` | informação principal |
| Texto secundário | `#4b5563` | contexto |
| Atenção | `#f59e0b` | preço/fonte pendente |

### Dark

| Token | Hex | Uso |
|---|---:|---|
| Fundo | `#0d0d0d` | canvas |
| Superfície | `#111112` | modal e cards |
| Superfície alternativa | `#1c1c1e` | inputs |
| Borda | `#27272a` | separação |
| Texto | `#fafafa` | informação principal |
| Texto secundário | `#a1a1aa` | contexto |
| Teal claro | `#5dbeb0` | foco e ações |

## 4. Tipografia

- Display: DM Serif Display — títulos de modal e totais importantes.
- Body: Outfit — campos, procedimentos e instruções.
- Mono: DM Mono — valores, quantidades e contadores.

## 5. Layout

- Desktop: modal de até 1240px; área de trabalho flexível + resumo de 340px.
- Mobile: uma coluna; resumo vira barra fixa inferior.
- Densidade compacta, unidade de 4px e espaçamentos 8/12/16/24/32px.
- Radius: 10px em controles, 14px em cards, 18px no modal.

## 6. Componentes

- Sem stepper na montagem: seleção e valores pertencem à mesma decisão.
- Origem resumida em uma frase; exceções ficam recolhidas.
- Card de procedimento com checkbox, nome, local clínico, origem e preço editável.
- Selo “Catálogo”, “Ajustado” ou “Manual”; nunca usar o dente como nome do catálogo.
- Grupos recolhíveis para “Já orçados” e “Precisam de atenção”.
- Resumo mostra somente total; ajuste negociado aparece sob demanda.
- Rodapé desktop com CTA; barra fixa mobile com quantidade, total e revisar.
- Recebimentos ficam em área própria, com parcela, valor, vencimento, estado e ação explícita.

## 7. Motion

Subtle: 150–220ms. Grupos expandem por altura/opacidade; alteração de valor atualiza o total sem
salto; seleção usa apenas mudança de borda/fundo. Respeitar `prefers-reduced-motion`.

## 8. Anti-padrões

- Não transformar a tela numa planilha horizontal.
- Não esconder exclusões da fonte.
- Não misturar plano de pagamento com a seleção clínica inicial.
- Não mostrar diagnóstico técnico onde uma orientação simples resolve.
- Não criar ações concorrentes com o CTA principal da etapa.
- Não colocar o mesmo raio “bubbly” em tudo.
- Não usar cor como único meio de explicar estado.

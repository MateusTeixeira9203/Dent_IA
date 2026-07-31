# R-38 — Orçamento: como o paciente vê

**Modelo:** Sonnet (apresentação + 1 coluna aditiva; nenhuma regra de dinheiro muda)
**Status:** plano — aguardando aprovação
**Origem:** pedido de um dentista real, trazido pelo Mateus em 30/07.
**Relacionado:** [R-34](R-34-plano-de-pagamento.md) (a condição negociada que o PDF passa a
mostrar nasce lá) · [R-33](R-33-orcamento-tela-unica.md) (o PDF é o item 1 dos 15 a portar)

---

## 1. O pedido

> *"Era legal não aparecer o valor do procedimento, só o valor total e a condição negociada."*
> — dentista usuário, via Mateus, 30/07

O argumento comercial é vender o **plano de tratamento como uma coisa só**, em vez de um cardápio
que o paciente escolhe item a item ou usa para negociar linha por linha.

## 2. Como está hoje

O PDF renderiza **preço por item** — `prontuario-html.ts:534-539`:

```ts
<div class="orc-item-desc">${esc(item.descricao)}...</div>
<div class="orc-item-price">${fmtMoney(item.preco_total)}</div>   // ← sai
```

E `condicoes_pagamento`, que deveria carregar o acordo, está **vazio nos 65 orçamentos** — nunca
foi escrito por código nenhum. Ou seja: hoje o PDF mostra exatamente o oposto do pedido — todos
os preços unitários, e nenhuma condição.

## 3. Decisões tomadas — 30/07

1. **Escolha por orçamento**, não configuração global nem regra fixa. Um controle no momento de
   gerar/enviar: *"mostrar valores por procedimento"*. Tratamento grande esconde, procedimento
   avulso mostra.
2. **A lista de procedimentos continua aparecendo**, sem os valores. O paciente vê **o que** será
   feito (limpeza, restauração D36, canal) — só não vê quanto custa cada um.

O segundo ponto é o que mantém o documento defensável: esconder preço unitário é decisão
comercial; esconder **o que foi combinado** vira disputa depois.

## 4. Trava de segurança

- **Nenhuma mudança em valor, total, desconto ou pagamento.** Isto é apresentação
- `orcamento_itens` continua gravando `preco_unitario` e `preco_total` — some da vista, não do dado
- A tela interna do dentista **sempre** mostra os valores. Ele precisa deles para montar o orçamento
- Migration aditiva, uma coluna, com default que preserva o comportamento atual

## 5. Contrato

### 5.1 A coluna

```sql
alter table public.orcamentos
  add column if not exists mostrar_valor_por_item boolean not null default true;
```

`default true` = todo orçamento existente e todo novo continuam saindo como hoje. **A mudança só
acontece quando alguém desligar de propósito** — nenhum dos 65 orçamentos muda de aparência
sozinho.

### 5.2 O PDF

`buildOrcamentoHTML` (`prontuario-html.ts:509`) passa a receber o flag. Com ele desligado:

- a linha do item perde a coluna de preço (`:538`) e o `qtd × unitário` (`:537`)
- o bloco de totais (`:541-554`) perde a linha de **Subtotal** — com item sem preço, subtotal só
  entrega a conta de volta. **Desconto e Total permanecem**
- ganha a **condição negociada**, vinda da [R-34](R-34-plano-de-pagamento.md) — é a outra metade
  do pedido, e sem ela o PDF fica só "um número grande e nada explicando"

> **Dependência real:** a parte "só o valor total" funciona sozinha; a parte "e a condição
> negociada" **precisa da R-34**, porque hoje não existe onde ler o acordo. Dá pra entregar em
> duas etapas, mas entregar só a primeira piora o documento — tira informação sem repor nenhuma.

### 5.3 O aceite assinado — o ponto que não pode passar batido

A migration 113 congela um snapshot do que o paciente aceitou. **O que ele assina tem que ser o
que ele viu.** Se o PDF esconder os preços e o snapshot guardar itemizado, o documento assinado
diverge do documento apresentado — e é justamente o documento assinado que vale numa disputa.

**Contrato:** o snapshot grava `mostrar_valor_por_item` junto, e a re-renderização do aceite
respeita o flag **daquele momento**. Trocar o flag depois **não** reescreve o que já foi assinado.

## 6. Invariantes

1. Esconder é só apresentação — `orcamento_itens` mantém `preco_unitario` e `preco_total`
2. A tela interna do dentista sempre mostra valores, independente do flag
3. A lista de procedimentos **nunca** some; só os valores
4. Documento assinado é imutável: re-renderiza com o flag vigente no aceite
5. Default `true` — nenhum orçamento existente muda de aparência sem ação humana

## 7. Gates de aceite

| # | Gate |
|---|---|
| G1 | Orçamento com o flag ligado (default) sai idêntico ao PDF de hoje |
| G2 | Com o flag desligado: itens listados **sem** valor, sem Subtotal, com Total e Desconto |
| G3 | A tela do dentista mostra os valores nos dois casos |
| G4 | Condição negociada (R-34) aparece no PDF quando existe |
| G5 | Orçamento aceito antes da mudança re-renderiza como foi assinado |
| G6 | Trocar o flag depois do aceite **não** altera o documento assinado |

## 8. Fora de escopo

- **Registrar o acordo** (à vista/parcelado/forma) → [R-34](R-34-plano-de-pagamento.md)
- **Levar o PDF ao paciente por WhatsApp** → item 2 dos 15 portes da
  [R-33](R-33-orcamento-tela-unica.md); hoje `sendOrcamentoWhatsApp` é código morto
- Redesign do PDF. Esta spec tira e põe informação; não redesenha o documento

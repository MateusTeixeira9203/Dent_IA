# R-28 — Pagamento pendente fecha sem duplicar + `marcado_por_id` gravado

> **SPEC** · **R-28** · fase **execução — codado e verificado na `Teste01` (29/07)** ·
> **Modelo:** Sonnet (bug fix contido, sem ambiguidade de produto).
> **Aberto:** 2026-07-29 · **Depende de:** nada (sem migration — schema já tem as colunas).
> **Escopo desta spec: partes (1) e (2) do achado no ROADMAP.** Parte (3) (39 orçamentos com
> pagamento mas só 34 `aprovado` — reconciliar dado histórico + regra de auto-aprovação
> across os 5 caminhos) **fica de fora** — é decisão de negócio, não ajuste, e não bloqueia (1)/(2).

## Verificação (29/07, clínica `Teste01`)

Todos os gates abaixo rodados de verdade (UI real + conferência no banco), não só compilado:

- [x] Gerar 3 parcelas, clicar no valor de uma pendente → abriu Registrar pagamento com banner
      "Fechando parcela de R$ 450,00", vencimento/parcelamento sumiram, valor travado.
- [x] Confirmar com data **diferente de hoje** (ontem) → **1 UPDATE**, zero linha nova (conferido no
      banco: mesmas 3 linhas antes/depois), `status='pago'`, `marcado_por_id` preenchido com quem
      estava logado, `data_vencimento` original preservada.
- [x] `registrado por` na aba Pagamentos passou a mostrar o nome real (antes "—") após
      `router.refresh()`.
- [x] "Falta receber" (sem parcela específica) → Registrar pagamento em modo criar novo, valor
      pré-preenchido, **sem** banner, campo valor editável.
- [x] Pagamento novo via "Confirmar Pagamento" (sem clicar em parcela) → `marcado_por_id` gravado
      (conferido no banco).
- [x] Lápis "Editar pagamento" só aparece em linha já `pago`; linha `pendente` mostra "Marcar como
      pago" no lugar — conferido nos `aria-label` dos botões renderizados.
- [x] **Auto-aprovação (D6):** orçamento `enviado` com 1 parcela pendente igual ao total → fechar a
      parcela virou `aprovado` sozinho (mesmo teste com fixture criada e removida via SQL na
      `Teste01`, paridade confirmada com `registrarPagamento`).

**Não testado nesta sessão:** `registrarPagamentoRapido` (mesma alteração de 1 campo que
`registrarPagamento`, já validado; UI que a chama fica em outra tela, não testada ao vivo).

## Diagnóstico (confirmado no código, 29/07)

- **`marcado_por_id`** só é gravado por `marcarPagamentoPago` ([actions.ts:212](../../src/app/dashboard/orcamentos/actions.ts:212)) — que **não é chamada em lugar nenhum do app** (código morto). `registrarPagamento` (:341) e `registrarPagamentoRapido` (:592) inserem `pago` direto sem preencher a coluna → 0 de 83 pagamentos hoje.
- **Fechar uma parcela pendente em data diferente de hoje não existe.** O pencil "Editar pagamento" (`editarPagamento`, :443) atualiza `valor`/`forma_pagamento`/`data_pagamento` mas **nunca toca `status`** — uma parcela `pendente` editada continua `pendente` no banco, só que agora com forma/data preenchidas sem sentido (estado inconsistente silencioso). O único caminho que fecha (`status: 'pago'`) é "Registrar pagamento", que **sempre insere linha nova** — daí a duplicata quando alguém tenta "receber" uma parcela já gerada.

## Decisões (Mateus, 29/07)

| # | Decisão | Motivo |
|---|---|---|
| D1 | `marcado_por_id` = **quem executa a ação** (dentista logado ou secretária), não o dentista responsável pelo orçamento | Mesma convenção já usada em `marcarPagamentoPago`; "marcado por" é sobre quem registrou, não sobre o dono do orçamento |
| D2 | Fechar parcela reaproveita `marcarPagamentoPago` (ganha parâmetro de data) em vez de criar função nova | Já existe, já grava `marcado_por_id`, só faltava a data livre — é o conserto descrito no próprio achado do ROADMAP |
| D3 | Fechar uma parcela **não permite mudar o valor** — só forma e data | Mudar valor de uma parcela já gerada é uma operação diferente (redistribuir parcelamento), fora do escopo deste bug |
| D4 | UI: clicar no valor de uma parcela pendente (ou no ícone que substitui o lápis) abre a aba **Registrar pagamento** já vinculada àquela parcela — não a edição inline | Mantém 1 lugar só para "receber dinheiro", em vez de duas UIs concorrentes fazendo a mesma coisa |
| D5 | Clicar em **"Falta receber"** (card agregado, sem parcela específica) pré-preenche o valor do saldo e abre Registrar pagamento em modo **criar novo** (sem `closingPagamentoId`) | Não existe uma linha específica pra fechar quando o orçamento não foi parcelado |
| D6 | Fechamento de parcela espelha a auto-aprovação já existente em `registrarPagamento` (status `enviado` + total pago ≥ total → `aprovado`) | Evita criar uma 3ª regra de auto-aprovação divergente; não é a reconciliação da parte (3), só paridade entre os dois caminhos irmãos |

## Parte 1 — Plano de implementação

| Arquivo | O que muda |
|---|---|
| `src/app/dashboard/orcamentos/actions.ts` | `registrarPagamento` e `registrarPagamentoRapido` passam a gravar `marcado_por_id`; `marcarPagamentoPago` reescrita (assinatura nova, busca a linha, guarda contra fechar 2x, auto-aprovação espelhada, notificação espelhada, log) |
| `.../pacientes/[id]/_components/paciente-detail-client.tsx` | Novo estado `closingPagamentoId` + `handleIniciarFechamentoPagamento` + `handleCancelarFechamentoPagamento` + `handleFecharPagamento`; `onRegistrarPagamento` passado ao modal alterna entre criar/fechar |
| `.../pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx` | Valor da parcela pendente e o ícone de ação viram "marcar como pago"; card "Falta receber" fica clicável; aba Registrar pagamento ganha banner de "fechando parcela X" + esconde vencimento/parcelamento/valor editável nesse modo |

## Parte 2 — Contrato técnico

### Server actions

```typescript
// registrarPagamento — só ganha 1 campo no insert, assinatura não muda.
// registrarPagamentoRapido — idem.

export async function marcarPagamentoPago(
  pagamentoId: string,
  dados: { formaPagamento: FormaPagamento; data: string },
): Promise<{ error?: string; autoAprovado?: boolean }>;
```

Erros: `"Pagamento não encontrado."` (linha some/outra clínica) · `"Este pagamento já está marcado como pago."` (guarda contra fechar 2x — a UI já não deveria deixar chegar aqui, mas o servidor é a fonte de verdade).

### Client (`paciente-detail-client.tsx`)

```typescript
const [closingPagamentoId, setClosingPagamentoId] = useState<string | null>(null);

function handleIniciarFechamentoPagamento(pg: Pagamento): void; // seta closingPagamentoId, pré-preenche pagForm (valor fixo, data=hoje, vencimento vazio)
function handleCancelarFechamentoPagamento(): void;             // limpa closingPagamentoId + pagForm
async function handleFecharPagamento(): Promise<void>;          // chama marcarPagamentoPago, update otimista do status da linha, router.refresh() (marcado_por é derivado no servidor — mesma disciplina do handleStatusChange)
```

`DetalheOrcamentoModal` ganha 3 props: `closingPagamentoId`, `onIniciarFechamentoPagamento`, `onCancelarFechamentoPagamento`. `onRegistrarPagamento` é escolhido no pai: `closingPagamentoId ? handleFecharPagamento : handleRegistrarPagamento`.

### Invariantes

- [ ] Fechar uma parcela pendente **nunca** cria uma linha nova em `pagamentos` — só `UPDATE` na existente.
- [ ] `marcado_por_id` sempre gravado quando um pagamento nasce ou é fechado como `pago` (as 3 funções de escrita, não só `marcarPagamentoPago`).
- [ ] Fechar 2x a mesma parcela → erro do servidor, nenhuma escrita.
- [ ] Fechar uma parcela **não muda seu `valor`** — campo desabilitado na UI, e o servidor nem recebe o parâmetro.
- [ ] `editarPagamento` (o pencil) continua só para pagamentos já `pago` — não aparece mais em linha `pendente`.

## Gates de aceite (clínica de teste, `Teste01` — a mesma já em uso na sessão)

- [ ] Gerar 2 parcelas num orçamento de teste → clicar no valor de uma pendente → aba Registrar pagamento abre com valor fixo, vencimento some, parcelamento some, banner "fechando parcela" visível.
- [ ] Confirmar com uma **data diferente de hoje** (ex.: ontem) → 1 UPDATE na parcela (conferir no banco: mesma linha, `status='pago'`, `marcado_por_id` preenchido) — **zero linhas novas** em `pagamentos` pra aquele orçamento.
- [ ] Tentar fechar a mesma parcela de novo (chamando a action direto) → erro, nada grava.
- [ ] Orçamento `enviado` + parcela fechada completa o total → vira `aprovado` sozinho (paridade com `registrarPagamento`).
- [ ] Clicar em "Falta receber" (sem parcela específica) → Registrar pagamento abre em modo criar novo, valor = saldo, sem banner de fechamento.
- [ ] Registrar um pagamento novo (fluxo antigo, sem clicar em nenhuma parcela) → `marcado_por_id` gravado (conferir no banco).
- [ ] Um pagamento já `pago` continua editável pelo lápis (valor/forma/data) — comportamento inalterado.

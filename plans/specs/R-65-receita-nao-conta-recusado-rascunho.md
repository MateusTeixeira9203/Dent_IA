# R-65 — Receita/Receita Prevista somam orçamento recusado e rascunho

> **SPEC** · **R-65** · fase **contrato — aprovada por decisão em chat (09/08)**
> **Modelo:** Sonnet (bug fix contido, guard + filtro, sem ambiguidade de produto)
> **Aberto:** 2026-08-06 (auditoria financeira) · **Escopo fechado:** 2026-08-09
> **Migration:** zero. Nenhuma coluna, nenhuma policy nova.

## Diagnóstico (confirmado no código e no banco, 09/08)

Todo lugar que soma "receita" em `financeiro/actions.ts` lê `pagamentos.status='pago'` **sem
olhar o status do `orcamento` pai**: `calcularSaldoMes`, `listarUltimos7Dias`,
`listarUltimosMeses`, `listarPagamentosPagos`, `exportarFinanceiroCsv` (soma "pago") e
`listarPagamentosPendentes` ("Receita Prevista", soma "pendente"). Um pagamento pode estar
`pago` mesmo com o orçamento `rascunho` (nunca enviado ao paciente) ou `recusado`
(paciente recusou) — e ainda assim conta.

**Prova real (09/08):** Clindent tinha 34 orçamentos `rascunho` com R$34.703,34 pagos e 1
`recusado` com R$500 pagos, contando como receita. Império tinha 1 `recusado` com R$1.050
ainda `pendente` contando em "Receita Prevista" — dinheiro que o paciente recusou pagar.

**Causa raiz — mais funda que "falta filtro no relatório":** dos 4 caminhos que escrevem
`pagamentos.status='pago'` (`registrarPagamento`, `registrarPagamentoRapido`,
`marcarPagamentoPago`, `registrarRecebimento` — todos em `orcamentos/actions.ts` exceto o
último, em `financeiro/actions.ts`), **nenhum verifica `orcamentos.status` antes de aceitar o
pagamento.** A auto-aprovação (D6, [R-28](R-28-pagamento-fecha-sem-duplicar.md)) só cobre
`enviado → aprovado` quando o total bate — não impede escrever contra `rascunho`/`recusado`,
e só existe em 3 dos 4 caminhos (`registrarRecebimento` não tem nem isso).

## Decisões (09/08, em chat)

| # | Decisão | Motivo |
|---|---|---|
| E1 | Guard de bloqueio (`rascunho`/`recusado` → erro, sem insert/update) entra nos **4** caminhos de escrita, não só `registrarRecebimento` | Achado no código: os outros 3 têm o mesmo buraco — nenhum checa status antes de aceitar dinheiro. Guard é aditivo (só bloqueia caso que nunca foi coberto pelos gates já verificados do R-28), não toca a lógica de auto-aprovação/dedup já testada |
| E2 | `registrarRecebimento` ganha a mesma auto-aprovação D6 (`enviado` + total ≥ devido → `aprovado`) | Paridade com os outros 3 — hoje é o único caminho sem isso |
| E3 | `recusado` **não** auto-aprova mesmo com pagamento cheio (nem hoje, em nenhum dos 3 que já têm D6) | Não inventar regra nova — mantém exatamente o que já existe. Reativar um recusado é ato manual (mudar status), não side-effect de um pagamento |
| E4 | Filtro nos 6 relatórios de leitura: `orcamentos.status not in ('rascunho','recusado')` | Cobre o que os guards de escrita não alcançam retroativamente — dado antigo (de antes do fix) some do relatório sem precisar tocar a linha |
| E5 | Dado sujo já existente **não é apagado** nesta spec | Fora de escopo — filtro de leitura (E4) já resolve o sintoma (número errado na tela) sem escrita em dado de clínica real. Limpeza de linha é decisão à parte, por clínica |

## Contrato técnico

### Guard compartilhado — novo arquivo

```typescript
// src/server/orcamentos/pagamento-guards.ts
export const STATUS_ORCAMENTO_SEM_PAGAMENTO = new Set(['rascunho', 'recusado']);
export const ERRO_ORCAMENTO_SEM_PAGAMENTO =
  'Este orçamento está rascunho ou recusado — não é possível registrar pagamento.';
```

Motivo de arquivo próprio (não exportar de `orcamentos/actions.ts`): arquivo `'use server'`
só pode exportar função async (server action) — uma constante/helper síncrono não pode viver
lá. `src/server/` já é convenção do projeto pra lógica server-side compartilhada.

### `orcamentos/actions.ts` — 3 funções ganham o guard no topo

```typescript
// registrarPagamento, registrarPagamentoRapido, marcarPagamentoPago —
// logo após buscar `orc`/`orcRow`/`pagAtual`+orçamento, antes de qualquer insert/update:
if (STATUS_ORCAMENTO_SEM_PAGAMENTO.has(orc.status)) {
  return { error: ERRO_ORCAMENTO_SEM_PAGAMENTO };
}
```

Assinaturas não mudam (mesmo `{ error?, id?, autoAprovado? }` de sempre).

### `financeiro/actions.ts` — `registrarRecebimento`

```typescript
export async function registrarRecebimento(dados: {
  pacienteId: string; orcamentoId: string; valor: number;
  formaPagamento: FormaRecebimento; data: string; dentistaId?: string;
}): Promise<{ error?: string; autoAprovado?: boolean }>; // ganha autoAprovado
```

Antes do insert: buscar `orc.status, total, valor_acordado` (mesma query que os outros 3 já
fazem) — guard igual, depois insert igual a hoje. Depois do insert: mesmo bloco D6
(`status === 'enviado'` + `totalPago >= valorDevido` → `UPDATE aprovado`), copiado do padrão
já usado 3x em `orcamentos/actions.ts` (não factorizado num helper maior — são 12 linhas que
já se repetem 3x hoje sem abstração; mover pra um helper cruzaria dois módulos por um ganho
pequeno, mantém o mesmo padrão de pequena duplicação já aceito nas 3 ocorrências existentes).

### `financeiro/actions.ts` — 6 funções de leitura ganham o join+filtro

```typescript
// calcularSaldoMes, listarUltimos7Dias, listarUltimosMeses, listarPagamentosPagos,
// exportarFinanceiroCsv (query de pagamentos), listarPagamentosPendentes:
.select('valor, ...(colunas de sempre), orcamentos!inner(status)')
.not('orcamentos.status', 'in', '(rascunho,recusado)')
```

`!inner` é obrigatório pro filtro em coluna de embed funcionar no PostgREST (sem ele, o filtro
é ignorado silenciosamente). Efeito colateral aceitável: pagamento cujo `orcamento_id` não
existe mais não apareceria — não é caso real (FK não tem `ON DELETE SET NULL` em `pagamentos.orcamento_id`
pra esse cenário surgir).

## Invariantes

- [ ] Nenhum dos 4 caminhos de escrita insere/atualiza `pagamentos.status='pago'` (ou reabre
      `pendente`→`pago`) quando o orçamento é `rascunho` ou `recusado`.
- [ ] `enviado` continua podendo receber pagamento normalmente (não é bloqueado — só
      `rascunho`/`recusado`).
- [ ] `registrarRecebimento` auto-aprova nas mesmas condições exatas que os outros 3
      (`enviado` + total pago ≥ devido) — nunca a mais, nunca a menos.
- [ ] As 6 leituras de receita nunca somam pagamento cujo orçamento pai é `rascunho`/`recusado`,
      `pago` ou `pendente`.
- [ ] Nenhum dado existente é apagado ou alterado por esta spec — só código (guard + filtro).

## Gates de aceite (Teste01 ou Império — nunca Clindent, ver `feedback_clindent_somente_leitura`)

- [ ] Orçamento `rascunho` → tentar `registrarPagamento`/`registrarPagamentoRapido`/
      `registrarRecebimento` → erro claro, zero linha em `pagamentos`.
- [ ] Orçamento `recusado` com pendente existente → `marcarPagamentoPago` nessa parcela → erro,
      parcela continua `pendente`.
- [ ] Orçamento `enviado`, pagar o total via `registrarRecebimento` → vira `aprovado` sozinho
      (conferir banco: `status`, sem `aprovado_por_id`/`aprovado_em` — só os outros 3 setam
      isso; documentar se `registrarRecebimento` deveria setar também, ver nota abaixo).
- [ ] Card "Receita" do mês e "Receita Prevista" não somam mais o pagamento de teste que
      existia no Império antes da limpeza desta sessão (conferir visualmente, já limpo no banco).
- [ ] Regressão: os gates do R-28 partes 1/2 (já ✅) continuam passando — orçamento `enviado`
      normal, fechar parcela pendente, auto-aprovação.

**Nota aberta pro código, não bloqueia:** `marcarPagamentoPago`/`registrarPagamento`/
`registrarPagamentoRapido` setam `aprovado_por_id`+`aprovado_em` no auto-aprova;
`registrarRecebimento` fica de fora dessas duas colunas por enquanto (é chamado pela
secretária, que não é quem "aprova" no sentido clínico) — mesma lacuna que já existe hoje,
não é regressão desta spec.

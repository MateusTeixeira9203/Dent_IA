# R-28 — Pagamento pendente fecha sem duplicar + `marcado_por_id` gravado

> **SPEC** · **R-28** · Partes (1)/(2): fase **execução — codado e verificado na `Teste01` (29/07)**.
> Parte (3): fase **plano escrito, aguardando revisão do Mateus** (31/07) — não implementar
> até aprovação explícita.
> **Modelo:** Sonnet (bug fix contido, sem ambiguidade de produto).
> **Aberto:** 2026-07-29 · **Depende de:** nada (sem migration — schema já tem as colunas).
> **Escopo desta spec: partes (1), (2) — no ar — e (3), abaixo.** Parte (3) (saldo pendente
> fantasma: uma parcela `pendente` que devia ter fechado quando o pagamento de verdade
> chegou, e não fechou) tem plano desde 31/07 — não bloqueia (1)/(2).

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

---

## Parte 3 — Saldo pendente fantasma (reconciliação + fechamento sem duplicar)

> **Status desta parte: plano escrito, 31/07 — aguardando revisão do Mateus.**
> Não implementar nada abaixo até aprovação explícita. Achado ao vivo nesta sessão e na
> anterior: orçamento "Gessica" R$250, orçamento "marcos" R$5.360, e de novo hoje — mesmo
> paciente "Marcos", 2 parcelas de R$250 (1 `PENDENTE` sem nenhum detalhe, 1 `PAGO` via Pix
> "por Portaria", ambas datadas de hoje 31/07).

### Causa raiz (relida no código, 31/07 — bate com o diagnóstico do handoff)

- `atualizarStatusOrcamento` (actions.ts:104-126) cria 1 linha `pendente` "placeholder"
  (`forma_pagamento`, `data_vencimento`, `parcela_numero` **todos `null`**) quando um
  orçamento vira `aprovado` sem plano — só se `count === 0`, então não duplica a si mesma.
  Essa assinatura (3 campos `null`) é única no schema: `gerarParcelas` sempre grava
  `data_vencimento`+`parcela_numero`, e um agendamento manual sempre grava `data_vencimento`.
  Bate exatamente com o "PENDENTE sem nenhum detalhe" do print.
- `registrarPagamento` (actions.ts:505) sempre faz `INSERT`, nunca olha se já existe uma
  `pendente` cujo valor bate — nem o placeholder, nem uma parcela normal de `gerarParcelas`.
  É o caminho por trás de "Registrar pagamento" manual **e** do atalho "Falta receber"
  (`preencherRestante()` no modal só pré-preenche `pagForm.valor`, nunca seta `closingPagamentoId`).
- `registrarPagamentoRapido` (actions.ts:772) já faz a coisa certa: lê as `pendente` abertas
  do orçamento antes, delega a `marcarPagamentoPago` (UPDATE) se existir uma aberta. É o
  modelo a generalizar — mas ele pega **a mais antiga sem checar valor**, regra que não
  serve pra `registrarPagamento` (ver D7).
- **2 caminhos a mais com o mesmo gap**, achados agora via grep de `.insert(` em `pagamentos`
  (pedido pelo escopo desta spec):
  - `src/lib/whatsapp/receipt-handler.ts:193` (`matchReceiptToOrcamento`) — insere `pago`
    sempre que o valor do comprovante bate com o `total` do orçamento (tolerância R$1),
    nunca fecha uma `pendente` existente.
  - `src/app/api/webhooks/abacatepay/route.ts:115` — webhook de cobrança avulsa. Tem
    idempotência própria (`external_payment_id` UNIQUE, protege contra o mesmo evento 2x),
    mas não checa `pendente` do mesmo orçamento antes de inserir.
  - Não achei, no código, nenhum caller que crie uma cobrança AbacatePay vinculada a
    `orcamento_id` — a rota existe e aceita webhook, mas não confirmei uso real em produção
    (não é "0 uso" confirmado, é "não encontrei o caminho que dispara").

### Decisões

| # | Decisão | Detalhe |
|---|---|---|
| D7 | `registrarPagamento` só fecha uma `pendente` existente quando o valor bate **exatamente** (tolerância 1 centavo) — nunca "pega a mais antiga" como `registrarPagamentoRapido` | Alternativa descartada: copiar a regra do rápido. Risco real: um pagamento parcial de R$50 numa parcela de R$100 fecharia a parcela inteira como paga, perdendo R$50 silenciosamente — pior que o bug atual |
| D8 — **ABERTA** | `receipt-handler.ts` e `abacatepay/route.ts` entram nesta correção agora, ou ficam de fora (uso real não confirmado)? | Ver "Não cobre" abaixo — deixei fora do plano de implementação até você decidir |
| D9 — **ABERTA** | O que fazer com as duplicatas **já existentes** (Gessica R$250, Marcos R$5.360, e as que a query abaixo achar)? Excluir a linha `pendente` fantasma? Precisa confirmar com o dentista antes de qualquer escrita? | Dado financeiro real de clínica em produção — não decido sozinho |

### Não cobre (nesta parte)

- `receipt-handler.ts` / `abacatepay/route.ts` — mesma checagem poderia se aplicar, mas fica fora até D8.
- Mudar como/quando o placeholder nasce em `atualizarStatusOrcamento` — só conserta o fechamento, não a criação.
- Escrever no dado já duplicado — fica só como query read-only + decisão D9.

### Plano de implementação (se aprovado)

| Arquivo | O que muda | Risco |
|---|---|---|
| `src/app/dashboard/orcamentos/actions.ts` | `registrarPagamento` ganha checagem de parcela `pendente` equivalente antes do `insert` (delega a `marcarPagamentoPago` se achar); nova função privada `ordenarParcelasPendentes` nomeia o critério de ordenação que `registrarPagamentoRapido` já usa inline; retorno ganha `parcelaFechada?: boolean` | BAIXO |
| `.../pacientes/[id]/_components/paciente-detail-client.tsx` | `handleRegistrarPagamento` bifurca no retorno: `parcelaFechada` → patch da linha existente + `router.refresh()` (mesmo padrão de `handleFecharPagamento`); senão → append otimista, como hoje | BAIXO |

**Verificável:** gates de aceite abaixo. **Dependências:** nenhuma (sem migration).

### Contrato técnico

```typescript
// registrarPagamento — mesma assinatura de entrada, retorno ganha 1 campo.
export async function registrarPagamento(dados: {
  orcamentoId: string; pacienteId: string; valor: number;
  formaPagamento: FormaPagamento; data: string;
  dataVencimento?: string; dentistaId?: string;
}): Promise<{
  error?: string;
  id?: string;
  autoAprovado?: boolean;
  parcelaFechada?: boolean; // true = fechou uma pendente existente (UPDATE); false/undefined = inseriu linha nova.
}>;

// Nova, privada (não exportada) — só nomeia o critério de ordenação que
// registrarPagamentoRapido já aplica inline hoje (actions.ts:810-815).
function ordenarParcelasPendentes<T extends {
  data_vencimento: string | null; parcela_numero: number | null; created_at: string;
}>(linhas: T[]): T[];
```

Regra de fechamento em `registrarPagamento` (antes do `insert` existente):
1. Se `isAgendado` (vencimento futuro) → pula a checagem, insere como hoje. Agendar é criar
   uma `pendente` nova por definição, nunca fechar outra.
2. Senão, busca as `pendente` do orçamento (mesma `clinica_id`), ordena com
   `ordenarParcelasPendentes`, acha a primeira cujo `valor` bate com `dados.valor`
   (`Math.abs(diff) < 0.005`).
3. Achou → `marcarPagamentoPago(equivalente.id, { formaPagamento, data })`; retorna
   `{ id: equivalente.id, parcelaFechada: true, ...resto }`. Não insere nada.
4. Não achou → comportamento de hoje (`INSERT`), `parcelaFechada: false`.

### Query de reconciliação (read-only — MCP Supabase não disponível nesta sessão; rodar antes de decidir D9, nenhum número abaixo foi inventado)

```sql
-- Orçamentos onde o total já pago cobre o valor devido, mas ainda existe
-- pelo menos 1 linha 'pendente' aberta -- a assinatura exata do "saldo fantasma"
-- relatado, independente de qual caminho criou a duplicata.
with resumo as (
  select
    o.id as orcamento_id, o.clinica_id, o.paciente_id,
    coalesce(o.valor_acordado, o.total, 0) as valor_devido,
    coalesce(sum(p.valor) filter (where p.status = 'pago'), 0) as total_pago,
    count(*)   filter (where p.status = 'pendente') as parcelas_pendentes,
    coalesce(sum(p.valor) filter (where p.status = 'pendente'), 0) as valor_pendente_fantasma
  from orcamentos o
  join pagamentos p on p.orcamento_id = o.id
  group by o.id
)
select r.*, pac.nome as paciente_nome
from resumo r join pacientes pac on pac.id = r.paciente_id
where r.parcelas_pendentes > 0 and r.total_pago >= r.valor_devido
order by r.valor_pendente_fantasma desc;
```

### Invariantes

- [ ] `registrarPagamento` nunca insere linha nova quando existe uma `pendente` do mesmo orçamento com valor idêntico (tolerância 1 centavo) e o pagamento não é agendamento futuro — fecha por `UPDATE` via `marcarPagamentoPago`.
- [ ] Duas ou mais `pendente` com o mesmo valor → fecha sempre a mais antiga (mesma ordenação de `registrarPagamentoRapido`), nunca ambíguo.
- [ ] Agendamento futuro (`dataVencimento > hoje`) nunca fecha uma `pendente` existente, mesmo se o valor bater — sempre cria nova.
- [ ] Cliente nunca soma uma linha otimista extra quando o servidor fechou (não inseriu) — reflete `UPDATE` na linha existente, igual ao padrão já usado em `handleFecharPagamento`.
- [ ] `marcarPagamentoPago` continua a única função que muda `status: 'pendente' → 'pago'` — nenhuma lógica de auto-aprovação/log/notificação duplicada dentro de `registrarPagamento`.

### Gates de aceite

- [ ] Orçamento aprovado sem plano (placeholder pendente do total) → "Falta receber" → Confirmar Pagamento → banco mostra 1 `UPDATE` na mesma linha (`status='pago'`), **zero** `INSERT` novo.
- [ ] Mesmo cenário, mas digitando o valor manualmente (sem clicar em "Falta receber") → mesmo resultado — fecha por `UPDATE`.
- [ ] 3 parcelas geradas, pagar a 2ª digitando o valor exato dela na aba geral (não clicando na linha da parcela) → fecha a **mais antiga** pendente daquele valor — determinístico, documentado, não necessariamente a 2ª.
- [ ] Digitar um valor que não bate com nenhuma `pendente` (ex.: parcial de R$50 numa parcela de R$100) → insere linha nova como hoje, nenhuma `pendente` é alterada.
- [ ] Agendar pagamento futuro com valor igual a uma `pendente` existente → não fecha a existente, cria uma `pendente` nova (2 linhas pendentes coexistindo é o comportamento correto aqui).
- [ ] UI: a linha antes "Pendente" vira "Pago" na hora, sem linha extra, sem precisar de refresh manual.
- [ ] `registrarPagamentoRapido` sem regressão — mesmo comportamento de antes.
- [ ] Query de reconciliação rodada contra o banco real, número de orçamentos afetados documentado (não estimado) — insumo pra D9.

# R-114 — Aprovação por item + status derivado

> **SPEC** · **R-114** · fase **contrato — aguardando aprovação**
> **Modelo:** Opus (as decisões de dono do `valor_acordado`, view derivada e guarda de edição
> não são dedutíveis sem julgamento)
> **Aberto:** 2026-08-16 · **Fechado:** —
> **Migration:** 1 coluna aditiva + 1 view read-only + **1 backfill obrigatório** (§3.6 — a
> versão anterior desta spec dizia "zero backfill" como se fosse segurança; é o que quebrava a
> migration). Zero DROP.
> **Medições:** [auditoria de 16/08](../auditorias/2026-08-16-orcamento-e-financeiro.md) §1, §2
> **Referência visual:** `artefatos/R-114-orcamento-aprovacao-por-item.html`

## 1. Problema

O paciente aprova o orçamento inteiro ou nada — e não é assim que orçamento funciona: ele fecha
parte agora e decide o resto depois. Isso forçou `orcamentos.status` a carregar dois papéis que
brigam: **intenção comercial** (rascunho/enviado) e **fato financeiro** (aprovado = tem dinheiro).
O resultado está medido na auditoria: 2 dos 4 estados nunca são usados, e 14 de 35 `rascunho`
têm pagamento recebido — o status é contradito pelo dinheiro.

## 2. Decisão (dele, 16/08 — não reabrir)

1. Aprovação passa a ser **por procedimento**. O item não aprovado **fica visível** no orçamento
   — é a lista viva do que ainda pode ser fechado, não lixo a esconder.
2. `status` do orçamento deixa de ser declarado. O que a tela mostra é **derivado dos fatos**.
3. O PDF do paciente **não mostra item não aprovado**. Ele é informativo, não cobrança: mostra
   os aprovados, o valor, quanto já foi pago e quanto falta.

Os dois são a mesma spec: separá-los produz um meio-termo onde item tem estado **e** orçamento
tem estado — pior que qualquer um dos extremos.

### 2.1 Por que `valor_acordado` NÃO é reusado

Era a proposta inicial da discussão, e está errada. O fallback de hoje, `valor_acordado ?? total`,
**quebra sozinho** no modelo por item: com zero item aprovado o devido tem que ser R$ 0, não a
proposta inteira. Ou seja, os 8 call sites que leem essa fórmula mudam **com ou sem** reuso —
reusar não economiza edição nenhuma e ainda cria a corrida prevista: o item escreve
`valor_acordado`, o R-34 sobrescreve ao parcelar, e depois que `gerar_parcelas_orcamento` trava o
campo (`plano_ja_definido`), item aprovado **depois** do plano nunca mais conta.

**Decisão:** `valor_acordado` continua escrito **só** pelas 2 RPCs do R-34, com o significado de
hoje ("o que foi formalmente negociado, pode divergir da soma dos itens"). O devido vira
`valor_acordado ?? soma(itens aprovados)`.

## 3. Contrato técnico

### 3.1 Migration

```sql
-- 144 — R-114: aprovação por item + estado derivado
alter table public.orcamento_itens
  add column if not exists aprovado boolean not null default false;

comment on column public.orcamento_itens.aprovado is
  'R-114 — true quando o paciente aprovou este item. Item nao aprovado continua visivel '
  'no orcamento (lista viva do que falta fechar); so nao conta no devido nem no PDF.';

-- security_invoker: RLS aplicada com o papel de quem consulta, nao do dono da view.
create or replace view public.orcamentos_com_estado
with (security_invoker = true) as
select o.*,
  coalesce(ai.soma_aprovada, 0)                   as valor_aprovado,
  coalesce(pg.total_pago, 0)                      as valor_pago,
  coalesce(o.valor_acordado, ai.soma_aprovada, 0) as valor_devido,
  case
    when coalesce(ai.soma_aprovada,0) = 0 then 'proposto'
    when coalesce(pg.total_pago,0) < coalesce(o.valor_acordado, ai.soma_aprovada, 0) then 'aceito'
    else 'quitado'
  end as estado
from public.orcamentos o
left join lateral (select sum(oi.preco_total) as soma_aprovada from public.orcamento_itens oi
                   where oi.orcamento_id = o.id and oi.aprovado) ai on true
left join lateral (select sum(p.valor) as total_pago from public.pagamentos p
                   where p.orcamento_id = o.id and p.status = 'pago') pg on true;

grant select on public.orcamentos_com_estado to authenticated;
```

`orcamentos.status` **não é dropada** — fica inerte. Dropar é item futuro, depois de verificado
em produção.

### 3.2 Types e a função pura

```typescript
export type EstadoOrcamento = 'proposto' | 'aceito' | 'quitado';

// src/lib/orcamentos/estado.ts — MESMA fórmula da view, em TS, pra quem já embeda itens+pagamentos
export function deriveEstadoOrcamento(input: {
  valorAcordado: number | null;
  itens: Array<{ precoTotal: number | null; aprovado: boolean }>;
  pagamentos: Array<{ valor: number; status: string }>;
}): { valorAprovado: number; valorDevido: number; valorPago: number; estado: EstadoOrcamento } {
  const valorAprovado = input.itens.filter(i => i.aprovado)
    .reduce((s, i) => s + (i.precoTotal ?? 0), 0);
  const valorDevido = input.valorAcordado ?? valorAprovado;
  const valorPago = input.pagamentos.filter(p => p.status === 'pago')
    .reduce((s, p) => s + p.valor, 0);
  const estado: EstadoOrcamento =
    valorAprovado === 0 ? 'proposto' : valorPago >= valorDevido ? 'quitado' : 'aceito';
  return { valorAprovado, valorDevido, valorPago, estado };
}
```

Regra de ouro: **toda leitura usa a view ou esta função — nunca reimplementa a conta inline.**
Mesma disciplina de `filtro-responsavel.ts` no R-53 (I3 de lá).

### 3.3 Actions

```typescript
alternarAprovacaoItem(itemId: string, aprovado: boolean):
  Promise<{ error?: string; estadoMudouPara?: EstadoOrcamento }>
marcarOrcamentoEnviado(orcamentoId: string): Promise<{ error?: string }>
aprovarTodosItens(orcamentoId: string):
  Promise<{ error?: string; itensAprovados: number; estado: EstadoOrcamento }>
```

**`aprovarTodosItens` — o atalho de 1 clique (decisão dele, 16/08).** Existe pelo motivo da I8:
o caso comum de balcão é o paciente aceitar tudo, e sem isto a secretária marcaria N caixas antes
de conseguir receber. Um UPDATE só, nunca N chamadas de `alternarAprovacaoItem`:

```typescript
const { data: afetados, error } = await supabase
  .from('orcamento_itens')
  .update({ aprovado: true })
  .eq('orcamento_id', orcamentoId).eq('clinica_id', clinicId)
  .eq('aprovado', false)          // idempotente: reclicar não reescreve o que já é true
  .select('id');

if (error) return { error: error.message };
// R-66/R-113 — RLS barrada devolve sucesso com 0 linhas. Aqui `0` é ambíguo (pode ser
// "já estava tudo aprovado"), então checa contra a existência de item não-aprovado ANTES.
```

**Direção única, de propósito.** Não existe "desmarcar tudo": desmarcar é a direção destrutiva e
bate na **I9** assim que houver pagamento. O controle só aparece quando há ≥1 item não aprovado, e
some quando tudo está aprovado — sem estado morto na tela.

`alternarAprovacaoItem` é UPDATE de 1 coluna — a RLS já cobre (`orcamento_itens_update`,
migration 089). Dispara a notificação que hoje `atualizarStatusOrcamento('aprovado')` dispara,
**só quando a soma sai de zero** (evita duplicar ao aprovar 2 itens em sequência).

`marcarOrcamentoEnviado` grava `enviado_em = now()` só se ainda `null` (idempotente).
✅ Conferido: a coluna existe desde a migration 001 (`:187`) e **nada em `src/` escreve nela** —
está morta desde sempre. É ela que passa a sustentar os alertas de "orçamento parado há X dias",
hoje baseados em `updated_at`.

Saem: `atualizarStatusOrcamento`, `STATUS_ORCAMENTO_SEM_PAGAMENTO` (vira
`orcamentoAceitaPagamento(estado)`) e os **3 blocos de auto-aprovação** (`registrarPagamento:574`,
`marcarPagamentoPago:364`, `registrarPagamentoRapido:885`).

### 3.4 Inventário — os 22 pontos que liam `orcamentos.status`

| Grupo | Arquivos | Vira |
|---|---|---|
| **Escrita** | `orcamentos/actions.ts` | guards→`estado`; auto-aprovação removida; insert mantém `'rascunho'` (inerte) |
| **Guard de pagamento** | `pagamento-guards.ts` | `orcamentoAceitaPagamento(estado)` |
| **UI de orçamento** | `orcamentos/page.tsx`, `orcamentos-client.tsx`, `paciente-detail-client.tsx`, `detalhe-orcamento-modal.tsx`, `use-orcamento-modal.ts`, `types.ts` | badge de `estado`; bloco "Alterar status" **sai**; toggle por item **entra** |
| **Financeiro (6 pontos)** | `financeiro/actions.ts` | embed `orcamentos!inner(status)` e o `.not(...)` do R-65 **removidos** — regra única (I7) |
| **Dashboards e Dex** | `dentista-dashboard.tsx`, `dex/context/route.ts`, `dex/alerts/route.ts`, `ai/context.ts`, `ai/prompts/briefing.ts` | contagens por `estado`; atraso por `enviado_em`, não `updated_at` |
| **PDF e export** | `prontuario-html.ts`, `api/orcamentos/[id]/pdf` | filtra `.aprovado`; badge de `estado`; devido vem de `valorDevido` |
| **WhatsApp** | `receipt-handler.ts`, `botao-enviar-whatsapp.tsx` | elegibilidade `estado != 'proposto'`; auto-flip removido; prop vira `enviadoEm` |
| **Paciente** | `get-patient-workspace-data.ts` | `status` vira legado opcional, `estado` é o campo ativo |
| **Não tocar** | `webhooks/abacatepay/route.ts` | decommission é tarefa própria já iniciada |
| **Falso positivo** | `whatsapp/reminders.ts` | é lembrete de agendamento, não lê status de orçamento |

### 3.5 Dois achados fora da lista original

**A RPC `aceitar_orcamento` quebraria em silêncio.** Ela grava `'statusNoAto', v_orc.status` cru
(migrations 113 e 124) — com o status inerte, todo aceite futuro registraria `'rascunho'` e o
snapshot perderia o sentido. ✅ Conferido. A RPC passa a ler `estado` da view.
`AceiteOrcamento.statusNoAto` (`types/orcamento.ts:16`) muda de união.

**Existe um segundo gerador de PDF.** `lib/pdf/orcamento.ts`, usado só por `whatsapp/send-pdf.ts`,
**nunca respeitou `mostrar_valor_por_item` (R-38) nem mostrou pago/falta** — diverge do PDF
principal desde sempre. ✅ Conferido: zero menção a esses campos no arquivo. Ganha a mesma regra
aqui; depois desta spec os dois PDFs mostram o mesmo dado.

### 3.6 Backfill — obrigatório (achado dele, 16/08)

`add column aprovado boolean not null default false` marca **todos os itens já existentes como
não aprovados**. Sem backfill, no segundo seguinte à migration:

- Todo orçamento do sistema calcula `valor_aprovado = 0` → **`estado = 'proposto'`**, inclusive
  os 73 aprovados da ClinDent e os 47 que já receberam dinheiro.
- Pior: a **I8** recusa pagamento em orçamento `proposto`. **Nenhum parcelamento em andamento
  conseguiria receber a próxima parcela** até alguém marcar os itens na mão, um a um.

Medido em produção (16/08), só leitura:

| Clínica | Itens | De orç. `aprovado` | Não-aprovado **mas com dinheiro** | Rascunho sem dinheiro | Backfill marca `true` |
|---|---|---|---|---|---|
| ClinDent | 358 | 243 | 31 | 82 | **274** |
| Império | 45 | 27 | 7 | 10 | 34 |
| Vip | 17 | 9 | 0 | 8 | 9 |

**Regra:** `aprovado = true` onde o orçamento pai tem `status = 'aprovado'` **ou** tem qualquer
pagamento `pago`. O segundo termo é o que resgata os 31 itens da ClinDent que moram em rascunho
mas já receberam dinheiro — sem ele, esses viram `proposto` e travam a cobrança do que falta.

Os **82 itens de rascunho sem dinheiro ficam `false`** — e é o comportamento certo: eles viram
"Proposto", que é exatamente o que `rascunho` significa hoje. **Nenhum rascunho some.**

```sql
-- roda DENTRO da mesma migration, logo após o add column
update public.orcamento_itens oi set aprovado = true
from public.orcamentos o
where o.id = oi.orcamento_id
  and (o.status = 'aprovado'
       or exists (select 1 from public.pagamentos p
                  where p.orcamento_id = o.id and p.status = 'pago'));
```

⚠️ **Escreve em ClinDent (clínica real).** É coluna nova — nenhum dado existente é alterado ou
perdido — mas exige o **ok explícito dele** antes de subir, e a contagem de linhas afetadas
conferida contra a tabela acima **antes e depois**.

## 4. Fases

**Sequenciamento da migration (decidido 16/08).** A migration existe escrita e simulada desde
16/08 (`20260816120000_144_orcamento_aprovacao_por_item.sql`) mas **não foi aplicada** — ela sobe
como primeiro passo do deploy do R-114, não antes. Motivo medido: a ClinDent cria **10,9 itens de
orçamento por dia**, então aplicar a coluna semanas antes do código faria ~150 itens nascerem
`aprovado = false` na janela; os aprovados ou pagos nesse intervalo apareceriam como `proposto` no
lançamento e a **I8** bloquearia o pagamento deles. Backfill e código no mesmo deploy = zero drift.

| # | O quê | Risco | Depende de |
|---|---|---|---|
| 1 | Migration 144 (coluna + backfill + view) + RPC `aceitar_orcamento` lendo `estado` | baixo | — |
| 2 | `estado.ts`, as 2 actions novas, remoção do `atualizarStatusOrcamento` e dos 3 blocos de auto-aprovação, guarda I5 | **médio** (mexe em guarda de dinheiro) | 1 |
| 3 | Os 22 pontos de leitura (§3.4) | médio | 2 |
| 4 | Os 2 PDFs | baixo | 2 |
| 5 | Receita retroativa aparece (consequência da 3, **sem UPDATE nenhum**) | médio | 3 |

## 5. Invariantes

- [ ] **I1** — `valor_acordado` é escrito **só** pelas RPCs do R-34. Aprovação nunca toca nele.
- [ ] **I2** — Item não aprovado nunca some do orçamento — só não conta no devido nem no PDF.
- [ ] **I3** — `total` continua sendo a proposta inteira (soma de **todos** os itens).
- [ ] **I4** — `estado` nunca é calculado inline fora de `deriveEstadoOrcamento()` / da view.
- [ ] **I5** — `editarOrcamento` **recusa** substituir os itens se algum já é `aprovado = true`.
- [ ] **I6** — Nenhum caminho de escrita seta `orcamentos.status` daqui pra frente.
- [ ] **I7** — `pagamentos.status='pago'` conta como receita **sem condição** — regra única.
- [ ] **I8** — Pagamento é recusado quando `estado === 'proposto'` — bloqueio por **fato** (zero
      item aprovado), não por status declarado.
      ⚠️ **Muda o fluxo de balcão:** hoje 14 dos 35 rascunhos da ClinDent receberam pagamento
      direto, sem passar por aprovação nenhuma. Sob a I8 a secretária precisa marcar o que o
      paciente aceitou **antes** de receber — um gesto a mais na frente do dinheiro. É o gesto
      que torna o dado verdadeiro, mas é atrito novo e ele decidiu sabendo.

## 6. Gates de aceite

- [ ] **G1** — Aprovar 1 de 3 itens: `estado` vira `aceito`; PDF mostra só o aprovado; "falta
      receber" = valor dele.
- [ ] **G2** — Aprovar os 3 e pagar a soma: `estado` vira `quitado` sem nenhum UPDATE de status.
- [ ] **G3** — Com 0 item aprovado, os 4 caminhos de pagamento recusam com o erro de
      `orcamentoAceitaPagamento`.
- [ ] **G4** — `editarOrcamento` com 1 item aprovado devolve erro **sem apagar nada**; o mesmo
      orçamento sem item aprovado edita normal (regressão zero).
- [ ] **G5** — Financeiro de setembro/2025 (ClinDent) soma **R$ 4.000,00 a mais** depois do
      deploy — bate com a auditoria §2.
- [ ] **G6** — PDF por link e PDF por WhatsApp mostram os mesmos itens e o mesmo pago/falta.
      Hoje divergem.
- [ ] **G7** — `/api/dex/alerts` conta "proposto" com o mesmo número de uma query manual de
      orçamentos sem nenhum item `aprovado = true`.
- [ ] **G8** *(2 contas logadas)* — dentista A não alcança `estado`/`valor_devido` de orçamento
      de B pela view. **Roda em "QA TESTE - apagar (financeiro)"**, que já tem 2 papéis.
- [ ] **G9** — Aceite coletado com 2 de 3 itens aprovados grava `statusNoAto = 'aceito'`.
- [ ] **G10** — "Aprovar tudo" num orçamento de 5 itens: **1 clique**, os 5 viram aprovados,
      `estado` vira `aceito`, **1** notificação disparada. Reclicar não muda nada e não notifica.
- [ ] **G11** — O controle "Aprovar tudo" some quando todos os itens já estão aprovados, e
      reaparece se algum for desmarcado.
- [ ] **G12** — Dentista que não é dono nem secretária clica "Aprovar tudo" → erro de permissão
      honesto (0 linhas afetadas com item não-aprovado existente), nada gravado.

## 7. Decisões fechadas (dele, 16/08 — "vai na sua recomendação")

| # | Decisão | Consequência no contrato |
|---|---|---|
| 1 | **Dentista e secretária** aprovam o item | `alternarAprovacaoItem` não ganha gate de role. A RLS `orcamento_itens_update` (`is_own_clinical_record` = dono **ou** secretária) já cobre exatamente isso — zero policy nova |
| 2 | **Desmarcar item já pago é bloqueado**, com motivo | `alternarAprovacaoItem` recusa quando `aprovado → false` deixaria `valor_devido < valor_pago`. Mensagem diz o valor já recebido. Nenhum conceito de crédito entra no sistema (**I9**) |
| 3 | **Item reativado entra no mesmo orçamento** | Marcar a caixa sobe o `valor_aprovado`; o saldo novo vira parcela pelo caminho normal do R-34. Nenhum orçamento novo nasce disso — é o motivo de o item não aprovado ficar na tela |

- [ ] **I9** — Nenhum caminho deixa `valor_devido` cair abaixo de `valor_pago`. Não existe
      crédito de paciente no sistema, e este item não cria um.
- [ ] **I10** — `aprovarTodosItens` confere **linhas afetadas** antes de reportar sucesso, e é
      idempotente (reclicar não reescreve nem redispara notificação). Zero é ambíguo — só é
      sucesso se não havia item não-aprovado antes; senão é RLS barrada, e a mensagem diz isso.
- [ ] **I11** — A notificação de "orçamento aceito" dispara **uma vez** por orçamento, quando o
      aprovado sai de zero — não uma por item, e não de novo no `aprovarTodosItens`.

## 8. Fora de escopo

- Dropar `orcamentos.status` — item futuro, depois de verificado.
- Portal do paciente: aprovação continua sendo o dentista/secretária registrando o que ele
  decidiu. Este item não cria self-service.
- Rastro de quem/quando aprovou cada item — 2 colunas, não bloqueia, item próprio.
- "Paciente recusou formalmente" — 0 linhas em produção; `excluirOrcamento` já cobre o caso real.
- Renegociação de plano do R-34.

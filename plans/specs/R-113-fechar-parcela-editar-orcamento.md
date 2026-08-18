# R-113 — Fechar a parcela escolhida em `/dashboard/orcamentos` + `editarOrcamento` confere linhas apagadas

> **SPEC** · **R-113** · fase **aprovada** (16/08 — ele fechou a única decisão aberta,
> "B1+B2", e mandou executar)
> **Modelo:** Sonnet 5 (Parte 1 é porte 1:1 de gesto existente; Parte 2 é a classe do R-66, já documentada)
> **Aberto:** 2026-08-16 · **Fechado:** —
> **Migration:** zero na Parte 1 e no B1. Uma migration **proposta** no B2 — entrega separada.

Duas partes, mesma família: **escrita que não confere linha afetada**. A Parte 2 está corrompendo
dado de paciente real agora — o caso mais recente é de **15/08 13:47**.

---

## Parte 1 — Fechar a parcela escolhida

### 1.1 Problema

`marcarPagamentoPago(pagamentoId, {formaPagamento, data})` ([actions.ts:304](../../src/app/dashboard/orcamentos/actions.ts:304))
já fecha **uma parcela por id**, e o gesto de escolher qual já existe — mas **só na ficha do
paciente** (`closingPagamentoId` + `onIniciarFechamentoPagamento`, painel em
[detalhe-orcamento-modal.tsx:775-793](../../src/app/dashboard/pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx:775)).

Em `/dashboard/orcamentos` — a tela onde a secretária trabalha — a lista de parcelas
([orcamentos-client.tsx:1439-1491](../../src/app/dashboard/orcamentos/_components/orcamentos-client.tsx:1439))
é **só leitura**: badge Pago/Vencido/Pendente e nenhum botão. O arquivo nem importa
`marcarPagamentoPago`. Sobram dois caminhos, e os dois erram:

- **"Registrar Pagamento"** → INSERE linha nova com `parcela_numero: null`. A parcela original fica
  `pendente` pra sempre.
- **`registrarPagamentoRapido`** → fecha sempre a **próxima** por vencimento, nunca a escolhida.

**Medido na ClinDent (16/08):** **12 orçamentos já quitados** que ainda carregam parcela pendente,
**R$ 8.090,00** de saldo fantasma. Eram 10 em 09/08 — está crescendo.

Isto é **paridade**, não feature: portar o gesto que já existe. Não criar action nova.

### 1.2 Contrato técnico

Import: adicionar `marcarPagamentoPago` ao bloco de `../actions` ([:63-74](../../src/app/dashboard/orcamentos/_components/orcamentos-client.tsx:63)).

Estado novo, junto de `pagForm`/`pagSaving`/`parcelasMode` (`:166-178`):

```typescript
const [closingPagamentoId, setClosingPagamentoId] = useState<string | null>(null);
```

Handlers — porte de [paciente-detail-client.tsx:742-799](../../src/app/dashboard/pacientes/[id]/_components/paciente-detail-client.tsx:742):

```typescript
const handleIniciarFechamentoPagamento = (pg: PagamentoRow) => {
  setClosingPagamentoId(pg.id);
  setParcelasMode(false);
  setPagForm({ valor: formatValorBR(pg.valor), formaPagamento: 'dinheiro',
               data: new Date().toISOString().split('T')[0], dataVencimento: '' });
  setPagError(null);
};

const handleCancelarFechamentoPagamento = () => {
  setClosingPagamentoId(null);
  setPagForm({ valor: '', formaPagamento: 'pix',
               data: new Date().toISOString().split('T')[0], dataVencimento: '' });
  setPagError(null);
};

const handleFecharPagamento = async () => {
  if (!closingPagamentoId || !selected) return;
  setPagError(null); setPagSaving(true);
  const result = await marcarPagamentoPago(closingPagamentoId, {
    formaPagamento: pagForm.formaPagamento, data: pagForm.data,
  });
  if (result.error) { setPagError(result.error); }
  else {
    const fechadoId = closingPagamentoId;
    const aplica = (o: OrcamentoRow): OrcamentoRow => ({
      ...o,
      pagamentos: o.pagamentos.map((p) => p.id === fechadoId
        ? { ...p, status: 'pago', forma_pagamento: pagForm.formaPagamento, data_pagamento: pagForm.data }
        : p),
      status: result.autoAprovado ? 'aprovado' : o.status,
    });
    setOrcamentos((prev) => prev.map((o) => (o.id === selected.id ? aplica(o) : o)));
    setSelected((prev) => (prev ? aplica(prev) : prev));
    handleCancelarFechamentoPagamento();
    toast.success('Parcela marcada como paga.');
    router.refresh();
  }
  setPagSaving(false);
};
```

UI — diffs sobre o JSX existente. **O visual continua o de `orcamentos-client.tsx`**; porta-se o
gesto, não o card da outra tela:

| Onde | Muda para |
|---|---|
| Badge da parcela (`:1478-1488`) | Se `status !== 'pago'`, vira `<button onClick={() => handleIniciarFechamentoPagamento(pag)}>` — mesmo texto e classe, mais `aria-label="Marcar parcela como paga"`. Pago segue `<span>` |
| Antes do painel (`:1501`) | `{closingPagamentoId && (…)}` — faixa "Fechando parcela de R$ X" + "Cancelar" |
| Label do painel (`:1503`) | `closingPagamentoId ? 'Marcar parcela como paga' : parcelasMode ? 'Dividir em Parcelas' : 'Registrar Pagamento'` |
| "Preencher restante" / "Dividir em parcelas" (`:1506-1523`) | dentro de `{!closingPagamentoId && (…)}` |
| **"Ações Rápidas" da secretária** (`:1194`) — *emenda de 16/08, durante a execução* | dentro de `{!closingPagamentoId && (…)}`. **Sem isto o bug sobrevive:** "Registrar Dinheiro" chama `registrarPagamentoRapido`, que fecha a **próxima parcela por vencimento** — não a que ela escolheu. Ficaria um caminho pra fechar a parcela errada dentro do próprio item que existe pra impedir isso. É paridade: na ficha esse botão já some quando `closingPagamentoId` está setado ([detalhe-orcamento-modal.tsx:561](../../src/app/dashboard/pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx:561)) |
| `parcelasMode ? … : …` (`:1526`) | `parcelasMode && !closingPagamentoId ? … : …` |
| Campo Valor (`:1576`) | `disabled={!!closingPagamentoId}` — o valor é o da parcela |
| Campo Vencimento (`:1589`) | some quando fechando — fechar não agenda |
| Submit (`:1651`) | chama `handleFecharPagamento` quando `closingPagamentoId`; label `'Confirmar'` |

### 1.3 Invariantes

- [ ] **I1** — Fechar parcela **nunca** cria linha em `pagamentos`. Sempre UPDATE.
- [ ] **I2** — Valor não é editável nesse fluxo — só forma e data.
- [ ] **I3** — O mesmo gesto nas duas telas produz o mesmo resultado no banco.

### 1.4 Gates

- [ ] **G1** — 3 parcelas, clicar na 2ª → painel muda, valor travado no da 2ª → confirmar → só a 2ª vira `pago`.
- [ ] **G2** — `count(*) from pagamentos where orcamento_id = X` igual antes e depois (prova de I1).
- [ ] **G3** — "Cancelar" reseta sem chamar action.
- [ ] **G4** — Regressão: com `closingPagamentoId = null`, "Registrar Pagamento" e "Dividir em parcelas" idênticos.

---

## Parte 2 — `editarOrcamento` confere linhas apagadas

### 2.1 Diagnóstico (confirmado no código e na RLS de produção, 15-16/08)

`editarOrcamento` ([actions.ts:737](../../src/app/dashboard/orcamentos/actions.ts:737)) apaga todos os
`orcamento_itens` e reinsere, checando só `error`. As 3 policies da tabela são **assimétricas**:

| Policy | Predicado | Secretária |
|---|---|---|
| `orcamento_itens_insert_own` | `can_act_as_dentista(o.dentista_id)` | ✅ passa |
| `orcamento_itens_update` | `is_own_clinical_record(o.dentista_id)` | ✅ passa |
| **`orcamento_itens_delete_own`** | `o.dentista_id = get_my_dentista_id()` | ❌ **barrada** |

DELETE barrado por RLS devolve **sucesso com 0 linhas**. Então, quando a secretária salva: nada
sai, tudo entra de novo, os itens acumulam.

**Provado em produção:** orçamento `75ca088c-…` (ClinDent) tem 4 linhas idênticas de "ajuste
oclusal por subtração" inseridas às 12:00, 12:19, 12:20 e 12:21 de 14/08, com `activity_logs`
mostrando a secretária "Portaria" operando entre elas. Mais 2 casos na mesma clínica — o último
em **15/08 13:47**. E `editarOrcamento` **não loga nada** em `activity_logs`, embora
`ORCAMENTO_EDITADO: 'orcamento.editado'` exista em [events.ts:13](../../src/lib/events.ts:13) ✅ conferido.

### 2.2 Os dois caminhos

**Decisão dele (16/08): os dois, na mesma rodada.** B1 para o dano de hoje; B2 devolve à
secretária a capacidade de editar. B2 sobe em commit próprio, atrás do gate de 2 contas.

| | **B1 — imediato** | **B2 — fast-follow** |
|---|---|---|
| O quê | `.select('id')` no DELETE + comparação com a contagem de antes | Alinha `orcamento_itens_delete_own` ao mesmo predicado que o UPDATE da própria tabela já usa (`is_own_clinical_record`) |
| Efeito | Para de duplicar. Falha honesta em vez de corromper | Devolve à secretária a capacidade de editar |
| Custo | zero migration, zero RLS | migration + **gate de 2 contas logadas** |

**O que o B1 sozinho custa, e que precisa estar dito:** depois dele a secretária **não consegue
mais editar item nenhum** — recebe erro claro no lugar da corrupção silenciosa. Na ClinDent quem
monta e corrige orçamento é ela (o `activity_logs` do dia 14/08 é ela aprovando, cobrando e
tentando consertar). Ou seja: B1 troca "corrompe calado" por "não deixa", e **só o B2 fecha o
buraco de verdade**. Recomendo os dois na mesma rodada, com o B2 atrás do seu gate.

**A assimetria parece falha de cobertura da migration 089, não decisão de produto** — INSERT e
UPDATE da mesma tabela já liberam secretária; só o DELETE ficou de fora.

**Sobre o gate de 2 contas:** ele está represado em 12 itens porque não havia dado real pra testar.
Aqui não precisa de seed sintético em clínica real — a clínica **"QA TESTE - apagar (financeiro)"**
já tem exatamente 1 admin e 1 secretária cadastradas. O gate roda lá.

### 2.3 Contrato — B1

```typescript
const { supabase, clinicId, dentistaId } = await requireClinicContext();

const { data: orcRow } = await supabase
  .from("orcamentos").select("paciente_id")
  .eq("id", orcamentoId).eq("clinica_id", clinicId).maybeSingle();
if (!orcRow) return { error: "Orçamento não encontrado." };

// R-113 — mesma classe do R-66: a policy de DELETE é só-dono, e RLS barrada devolve
// sucesso com 0 linhas. Sem este check o INSERT abaixo roda por cima do que sobrou.
const { data: itensAntes } = await supabase
  .from("orcamento_itens").select("id")
  .eq("orcamento_id", orcamentoId).eq("clinica_id", clinicId);

const { data: deletados, error: delError } = await supabase
  .from("orcamento_itens").delete()
  .eq("orcamento_id", orcamentoId).eq("clinica_id", clinicId)
  .select("id");

if (delError) return { error: delError.message };
if ((itensAntes?.length ?? 0) > 0 && (deletados?.length ?? 0) === 0) {
  return { error: "Você não tem permissão para editar os itens deste orçamento — só o dentista responsável pode." };
}

// …insert + update de total/desconto seguem idênticos ao código atual…

registrarLog(supabase, {
  clinicaId: clinicId, actorId: dentistaId, pacienteId: orcRow.paciente_id ?? undefined,
  entityType: 'orcamento', entityId: orcamentoId, action: 'orcamento.editado',
  metadata: { itens_count: itens.length, total, desconto },
});
```

Assinatura não muda. `dentistaId` já vem de `requireClinicContext()` — mesma fonte de
`excluirOrcamento`.

### 2.4 Contrato — B2 (entrega separada, atrás do gate)

```sql
-- 144_orcamento_itens_delete_secretaria.sql
-- Alinha o DELETE ao predicado que o UPDATE da mesma tabela já usa (migration 089).
drop policy if exists "orcamento_itens_delete_own" on public.orcamento_itens;
create policy "orcamento_itens_delete_own" on public.orcamento_itens for delete
  using (belongs_to_active_clinic(clinica_id) and exists (
    select 1 from orcamentos o
    where o.id = orcamento_itens.orcamento_id and is_own_clinical_record(o.dentista_id)
  ));
```

Migration sozinha, no próprio commit. **Só sobe depois do gate de 2 contas.**

### 2.5 Invariantes

- [ ] **I4** — `editarOrcamento` nunca insere por cima de item que a RLS impediu de apagar.
- [ ] **I5** — Toda edição bem-sucedida gera 1 linha `orcamento.editado` em `activity_logs`.
- [ ] **I6** — (com B2) Dono segue editando sem regressão; silo entre dentistas intacto pra quem
      não é dono nem secretária.

### 2.6 Gates

- [ ] **G5** — B1 sem B2: secretária tenta editar → erro na tela; `count(*) from orcamento_itens`
      antes/depois **igual** (nada duplicou).
- [ ] **G6** — B1: dono edita → funciona como hoje, itens refletem só a lista nova, +1 linha no log.
- [ ] **G7** — **B2, gate de 2 contas em "QA TESTE - apagar (financeiro)"**: secretária edita
      orçamento de um dentista da clínica → itens refletem só a lista nova, sem duplicar. Conta de
      outra clínica segue barrada.

---

## 3. Proposta de correção de dado (ClinDent) — leitura apenas

**Nenhum UPDATE/DELETE nesta spec.** A ClinDent é clínica real da família; qualquer escrita passa
por aprovação dele, ação por ação. A query abaixo só mostra o tamanho do estrago:

```sql
select o.id as orcamento_id, oi.descricao, oi.quantidade, oi.preco_unitario,
       count(*) as duplicatas,
       array_agg(oi.id order by oi.created_at)         as item_ids,
       array_agg(oi.created_at order by oi.created_at) as criados_em
from orcamento_itens oi
join orcamentos o on o.id = oi.orcamento_id
where o.clinica_id = 'd61ebff3-8bac-416e-a131-930fabc37f9d'
group by o.id, oi.descricao, oi.quantidade, oi.preco_unitario
having count(*) > 1
order by o.id, min(oi.created_at);
```

Com o B1 no ar, nenhum duplicado novo se acumula. Os que já existem esperam a revisão dele.

## 4. Fora de escopo

- Aprovação por item e status derivado — **R-114**.
- Redesenho da tela de orçamentos — vem com o R-114.
- Os R$ 8.090 de saldo fantasma já existentes: a Parte 1 impede novos, não limpa os velhos.

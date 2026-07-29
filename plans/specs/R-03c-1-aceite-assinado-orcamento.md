# R-03c-1 — Aceite assinado do orçamento + snapshot dos termos

> **SPEC** · **R-03c-1** · fase **execução** — codado e verificado com 1 conta, **falta 2ª conta** ·
> **Modelo:** Sonnet na execução (as decisões ambíguas foram fechadas 29/07).
> **Aberto:** 2026-07-29 · **Depende de:** R-03a (tabela `assinaturas` já em prod, migration 111).
>
> **Migration 113 aplicada em prod** (29/07) — coluna, FK `RESTRICT`, índice único e RPC
> `aceitar_orcamento`, todos conferidos no schema vivo (não em `schema_migrations`).

## Verificação (29/07)

**Provado com dado real, não só compilado:**
- [x] Fluxo completo pela UI: botão → modal → assinatura real → RPC → selo. `assinado_por`,
      `cro_no_ato` (do autor, não do coletor) e `assinatura_ref` gravados certos; PNG real no
      bucket `fichas` (6162 bytes).
- [x] `termos_snapshot` bate item a item com o orçamento no momento do aceite.
- [x] **Orçamento editado DEPOIS do aceite** (troquei um preço de propósito) — o vivo mudou, o
      snapshot **não mudou um centavo**. É o invariante central do item, confirmado no banco.
- [x] FK `RESTRICT` barra exclusão **no banco**, testado com `DELETE` direto (não só a guarda
      da action) — `violates foreign key constraint "assinaturas_orcamento_id_fkey"`.
- [x] Índice único barra 2º aceite **no banco**, testado com `INSERT` direto — `duplicate key
      value violates unique constraint "idx_assinaturas_orcamento_unico"`.
- [x] Aceite **não altera** `orcamentos.status` (continuou `aprovado`).

**Achado e corrigido durante a verificação:** `aceitarOrcamentoSchema` estava `export const`
num arquivo `"use server"` — Next.js só permite exportar funções async desse tipo de arquivo.
Passava no `tsc` e no `next build`, mas quebrava em runtime real (`500`, "A use server file can
only export async functions, found object"). Só o **tipo** derivado (`AceitarOrcamentoInput`)
deveria sair, igual ao padrão de `assinarProcedimentosSchema` do R-03a — corrigido.

**Ainda falta — não dá pra fazer sozinho:**
- [ ] **2 contas:** secretária coleta (deve funcionar) · outro dentista da mesma clínica tenta
      coletar (deve falhar com `sem_permissao`) · dentista de outra clínica não vê o orçamento
      nem o aceite. Isso exige uma segunda conta real logada — nenhuma checagem por script
      substitui, porque a RPC valida por `auth.uid()` de dentro da sessão.

## Visão geral

A assinatura clínica do R-03a prova que **o procedimento foi feito**. Esta prova o outro eixo:
**o paciente aceitou pagar isto, nestes termos, nesta data.** Hoje não existe — o sistema tem
5 caminhos que marcam um orçamento como `aprovado` e em 4 deles ninguém afirma nada; "aprovado"
ali significa *pagou*, não *aceitou*.

O corte é deliberadamente **só de registro**: captura o aceite, congela os termos e impede que a
prova seja apagada. **Nenhum fluxo existente passa a barrar o usuário** (exceto excluir um
orçamento que já tem aceite). O gate de edição fica no R-03c-2, com o "Revisar" (R-03c-3) logo
atrás — bloquear antes de existir saída é o que faz a feature ser contornada.

## O que já existe hoje (confirmado no código, não presumido)

- **`assinaturas` já é genérica** (migration 111, em prod): `tipo in ('procedimentos','orcamento')`,
  coluna `orcamento_id`, e o check `assinaturas_alvo_unico` que exige `orcamento_id not null`
  quando `tipo='orcamento'`. **Zero tabela nova neste item.** RLS: `assinaturas_select` por
  clínica; escrita **só** por RPC `security definer` (não há policy de INSERT para `authenticated`).
- **5 caminhos marcam `aprovado`** — só o primeiro registra quem aprovou:

  | Caminho | `aprovado_por_id`/`aprovado_em` |
  |---|---|
  | `atualizarStatusOrcamento` (`actions.ts:36`) | **sim** |
  | `registrarPagamento` — auto quando pago ≥ total (`actions.ts:400`) | não |
  | `registrarPagamentoRapido` (`actions.ts:629`) | não |
  | webhook AbacatePay (`api/webhooks/abacatepay/route.ts:134`, service role) | não |
  | `receipt-handler` do WhatsApp (`lib/whatsapp/receipt-handler.ts:211`, match por valor ±R$1,00) | não |

- **`assinaturas.orcamento_id` é `ON DELETE CASCADE`** (111, linha 13) e `excluirOrcamento`
  (`actions.ts:657`) só barra quando existe pagamento com status `pago` — hoje um orçamento
  assinado e não pago é apagável em 2 cliques, levando a prova junto.
- **`editarOrcamento` (`actions.ts:555`) apaga todos os `orcamento_itens` e reinsere** — os termos
  mudam por baixo sem apagar a linha do orçamento. É por isso que o snapshot é a peça central
  deste item, não um acessório.
- **`orcamentos.dentista_id` é nullable** desde a migration 027 (`ON DELETE SET NULL`), enquanto
  `assinaturas.dentista_id` é `NOT NULL` — a RPC precisa recusar explicitamente o orçamento órfão.
- **Template pronto pra copiar:** `assinarProcedimentos`
  (`app/consulta/[agendamentoId]/actions.ts:531`) — upload no bucket `fichas`, chamada da RPC,
  remoção do PNG órfão quando a RPC rejeita, tradução dos erros pra PT-BR. `SignaturePad`
  (`components/fichas/SignaturePad.tsx`) é o pad reusável.
- **Onde o selo entra:** `DetalheOrcamentoModal` já tem o bloco de auditoria da aprovação
  (`detalhe-orcamento-modal.tsx:359`).

## Escopo

**Cobre:** captura do aceite (assinatura do paciente) sobre um orçamento · snapshot imutável dos
termos aceitos, montado **no servidor** · proteção da prova contra exclusão · selo de "aceite
assinado" onde a aprovação já aparece.

**Não cobre:**
- **Gate de edição** de orçamento assinado → R-03c-2. Aqui `editarOrcamento` continua funcionando;
  o snapshot é o que protege a prova.
- **"Revisar"** (criar novo orçamento a partir de um assinado) → R-03c-3.
- **Aceite no PDF** → R-03c-4.
- **Segundo ponto de captura** em `/dashboard/orcamentos` — o painel lateral de lá não renderiza
  os itens, e não se assina o que não se vê. A captura fica no único lugar que já mostra os termos
  completos (`DetalheOrcamentoModal`). O selo read-only pode aparecer nos dois.
- Reconciliar os 5 caminhos de aprovação. O aceite é **independente** do `status` — quem quiser
  torná-lo pré-requisito faz isso no R-03c-2.

## Decisões travadas (Mateus, 29/07)

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | **Só registra** — nenhum bloqueio novo além da exclusão | Bloquear edição já neste corte | Bloquear sem o "Revisar" existir abre a janela "não posso editar", e o contorno é justamente excluir — destrutivo |
| D2 | **Snapshot em JSONB** na própria linha de `assinaturas` | PDF congelado no storage · os dois | Consultável e diferençável contra o orçamento vivo; não amarra este item à geração de PDF (R-03c-4) |
| D3 | `orcamento_id` vira **`ON DELETE RESTRICT`** | `SET NULL` | `SET NULL` é impossível: o check `assinaturas_alvo_unico` exige `orcamento_id not null` quando `tipo='orcamento'` |
| D4 | **Sem `orcamentos.assinatura_id`** — a ligação é só `assinaturas.orcamento_id` + índice único | Coluna espelho, como o R-03a sugeriu | Coluna espelho cria FK circular e uma segunda fonte de verdade que pode divergir. O índice único já garante 1 aceite por orçamento |
| D5 | Coletor = **autor do orçamento ou secretária** da mesma clínica, via RPC | Só o autor · service role | Mesma decisão #5 do R-03a: é a secretária que segura o tablet, mas o servidor valida |

## Assunções

- O snapshot é montado **dentro da RPC**, a partir do banco. O client nunca envia os termos —
  se enviasse, a prova não provaria nada.
- `procedimento_id` **não** entra no snapshot: é FK com `ON DELETE SET NULL`, e um snapshot que
  depende de linha viva não é snapshot. Só texto e números.
- Um orçamento tem no máximo **um** aceite. Re-assinar não existe (mesma regra do R-03a: sem
  desfazer). Assinatura coletada por engano se resolve marcando o orçamento como `recusado` — a
  linha permanece, o histórico não mente. **Limitação conhecida:** enquanto o R-03c-3 não existe,
  não há caminho para "refazer o aceite".
- Bucket `fichas` (silo por clínica) serve também o aceite — não se cria bucket novo.

## Parte 1 — Plano de implementação

| Arquivo | O que muda |
|---|---|
| `supabase/migrations/*_113_aceite_orcamento.sql` (novo) | coluna `termos_snapshot`, FK `RESTRICT`, índice único, RPC `aceitar_orcamento` |
| `src/app/dashboard/orcamentos/actions.ts` | `aceitarOrcamento` (wrapper) + guarda em `excluirOrcamento` |
| `src/app/dashboard/pacientes/[id]/_components/types.ts` | `aceite` em `OrcamentoComItens` |
| `src/server/patients/get-patient-workspace-data.ts` | embed do aceite na query do orçamento |
| `src/app/dashboard/pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx` | botão "Coletar aceite" + selo |
| `src/components/orcamentos/aceite-orcamento-modal.tsx` (novo) | pad + nome de quem assina |

### Fase 1 — Migration (risco **alto**, mexe em prod)

1. `alter table assinaturas add column termos_snapshot jsonb;`
2. Trocar a FK de `orcamento_id` para `on delete restrict`.
3. Índice único parcial `(orcamento_id) where tipo='orcamento'`.
4. RPC `aceitar_orcamento` — ver Parte 2.

**Verificável:** inserir um aceite por SQL e tentar `delete from orcamentos where id=…` → erro de
FK; tentar um segundo aceite no mesmo orçamento → violação do índice único.

### Fase 2 — Action wrapper + tipos (risco **baixo**)

1. `aceitarOrcamento` — cópia estrutural de `assinarProcedimentos`: upload → RPC → remove o PNG
   órfão se a RPC rejeitar → traduz os erros.
2. `excluirOrcamento` ganha a checagem de aceite **antes** dos deletes, com mensagem própria
   (a FK `RESTRICT` é a rede de segurança, não a mensagem de erro do usuário).
3. Tipos + embed do aceite no workspace do paciente.

### Fase 3 — UI (risco **baixo**)

1. `AceiteOrcamentoModal` — reusa `SignaturePad`, campo "quem assina", resumo dos termos visível
   acima do pad (o paciente precisa ver o que aceita).
2. `DetalheOrcamentoModal`: botão "Coletar aceite do paciente" quando não há aceite e o status não
   é `recusado`; selo com data + quem assinou quando há, junto ao bloco de aprovação existente.
3. Tokens: nada novo — segue `border-teal/15` + `bg-teal/5` do bloco de auditoria vizinho.

## Parte 2 — Contrato técnico

### TypeScript

```typescript
// src/types/orcamento.ts (novo) — ou junto de types.ts do paciente
/** Termos congelados no ato do aceite. Montado no servidor, nunca pelo client. */
export interface TermosSnapshot {
  versao: 1;
  subtotal: number;
  desconto: number;
  total: number;
  validadeDias: number;
  condicoesPagamento: string | null;
  /** Status do orçamento no momento do aceite — o aceite não muda status. */
  statusNoAto: 'rascunho' | 'enviado' | 'aprovado';
  itens: Array<{
    descricao: string | null;
    dente: string | null;
    quantidade: number;
    precoUnitario: number | null;
    precoTotal: number | null;
  }>;
}

export interface AceiteOrcamento {
  id: string;
  assinadoPor: string;
  croNoAto: string | null;
  assinadoEm: string;
  assinaturaRef: string;
  termos: TermosSnapshot;
}

// types.ts do paciente — adição
export type OrcamentoComItens = {
  // ...campos existentes
  aceite: AceiteOrcamento | null;
};
```

### Zod

```typescript
export const aceitarOrcamentoSchema = z.object({
  orcamentoId: z.string().uuid(),
  assinadoPor: z.string().trim().min(2).max(120),
  assinaturaDataUrl: z.string().startsWith('data:image/png;base64,'),
});
export type AceitarOrcamentoInput = z.infer<typeof aceitarOrcamentoSchema>;
```

### Server Action

```typescript
// src/app/dashboard/orcamentos/actions.ts
export async function aceitarOrcamento(
  params: AceitarOrcamentoInput,
): Promise<{ ok: boolean; error?: string }>;
```

| | |
|---|---|
| Auth | required — dentista do orçamento **ou** secretária da mesma clínica |
| Rate limit | não |

Erros da RPC → mensagem: `sem_permissao` ("Você não tem permissão para registrar o aceite deste
orçamento.") · `ja_aceito` ("Este orçamento já tem aceite assinado.") · `status_invalido`
("Não é possível coletar aceite de um orçamento recusado.") · `sem_responsavel` ("Este orçamento
não tem dentista responsável. Atribua um antes de coletar o aceite.").

### Database

```sql
-- 113 — R-03c-1: aceite assinado do orçamento + snapshot dos termos.
-- Não cria tabela: reusa `assinaturas` (migration 111), que já nasceu genérica.

alter table public.assinaturas add column if not exists termos_snapshot jsonb;

comment on column public.assinaturas.termos_snapshot is
  'R-03c-1: termos congelados no ato (tipo=orcamento). Montado pela RPC, nunca pelo client.';

-- D3: CASCADE apagava a prova junto com o orçamento.
alter table public.assinaturas drop constraint if exists assinaturas_orcamento_id_fkey;
alter table public.assinaturas
  add constraint assinaturas_orcamento_id_fkey
  foreign key (orcamento_id) references public.orcamentos(id) on delete restrict;

-- D4: 1 aceite por orçamento, garantido pelo banco (sem coluna espelho).
create unique index if not exists idx_assinaturas_orcamento_unico
  on public.assinaturas(orcamento_id) where tipo = 'orcamento';

create or replace function public.aceitar_orcamento(
  p_orcamento_id   uuid,
  p_assinado_por   text,
  p_assinatura_ref text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinica_id    uuid := get_my_clinica_id();
  v_caller        uuid := get_my_dentista_id();
  v_role          text := get_my_role();
  v_orc           record;
  v_cro           text;
  v_snapshot      jsonb;
  v_subtotal      numeric(10,2);
  v_assinatura_id uuid;
begin
  select o.id, o.paciente_id, o.dentista_id, o.status, o.total, o.desconto,
         o.validade_dias, o.condicoes_pagamento
    into v_orc
  from public.orcamentos o
  where o.id = p_orcamento_id and o.clinica_id = v_clinica_id;

  if v_orc.id is null then raise exception 'sem_permissao'; end if;
  if v_orc.status = 'recusado' then raise exception 'status_invalido'; end if;
  if v_orc.dentista_id is null then raise exception 'sem_responsavel'; end if;

  -- D5: autor do orçamento ou secretária da mesma clínica.
  if v_orc.dentista_id <> v_caller and v_role <> 'secretaria' then
    raise exception 'sem_permissao';
  end if;

  if exists (select 1 from public.assinaturas a
             where a.orcamento_id = p_orcamento_id and a.tipo = 'orcamento') then
    raise exception 'ja_aceito';
  end if;

  select d.cro into v_cro from public.dentistas d where d.id = v_orc.dentista_id;

  select coalesce(sum(i.preco_total), 0) into v_subtotal
  from public.orcamento_itens i where i.orcamento_id = p_orcamento_id;

  -- Snapshot montado AQUI, do banco. Sem procedimento_id: FK com SET NULL não é prova.
  select jsonb_build_object(
    'versao', 1,
    'subtotal', v_subtotal,
    'desconto', coalesce(v_orc.desconto, 0),
    'total', coalesce(v_orc.total, 0),
    'validadeDias', v_orc.validade_dias,
    'condicoesPagamento', v_orc.condicoes_pagamento,
    'statusNoAto', v_orc.status,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', i.descricao, 'dente', i.dente, 'quantidade', i.quantidade,
        'precoUnitario', i.preco_unitario, 'precoTotal', i.preco_total
      ) order by i.created_at)
      from public.orcamento_itens i where i.orcamento_id = p_orcamento_id
    ), '[]'::jsonb)
  ) into v_snapshot;

  insert into public.assinaturas
    (clinica_id, paciente_id, tipo, orcamento_id, dentista_id,
     assinado_por, cro_no_ato, assinatura_ref, termos_snapshot)
  values
    (v_clinica_id, v_orc.paciente_id, 'orcamento', p_orcamento_id, v_orc.dentista_id,
     p_assinado_por, v_cro, p_assinatura_ref, v_snapshot)
  returning id into v_assinatura_id;

  return v_assinatura_id;
end;
$$;

revoke execute on function public.aceitar_orcamento(uuid, text, text) from anon, public;
grant  execute on function public.aceitar_orcamento(uuid, text, text) to authenticated;
```

### Componentes

```
DetalheOrcamentoModal            ← Client (já existe)
  ├─ botão "Coletar aceite"     ← só quando aceite == null && status != 'recusado'
  ├─ selo de aceite             ← só quando aceite != null (junto ao bloco de aprovação, :359)
  └─ AceiteOrcamentoModal       ← Client (novo)
       ├─ resumo dos termos     ← itens + total + desconto, read-only
       └─ SignaturePad          ← reusado, sem alteração
```

### Invariantes

- [ ] O snapshot é montado **no servidor**, dentro da RPC. Nenhum campo dele vem do client.
- [ ] Um orçamento tem **no máximo um** aceite — garantido por índice único, não por checagem de app.
- [ ] Orçamento com aceite **não pode ser apagado** — garantido pela FK `RESTRICT`, não só pela action.
- [ ] `assinaturas.dentista_id` é sempre o **responsável pelo orçamento**, nunca o coletor.
- [ ] `cro_no_ato` e `termos_snapshot` são congelados no INSERT e **nunca recalculados**.
- [ ] Não existe "desfazer aceite" — nenhum endpoint apaga ou atualiza uma linha `tipo='orcamento'`.
- [ ] O aceite **não altera `orcamentos.status`** — aceitar e aprovar continuam sendo atos distintos.
- [ ] `editarOrcamento` continua funcionando; editar depois do aceite **não** altera o snapshot.

### Gates de aceite

- [ ] Coletar aceite num orçamento `enviado` → 1 linha em `assinaturas` com `tipo='orcamento'`,
      `termos_snapshot` batendo item a item com o que estava na tela, `status` do orçamento **inalterado**.
- [ ] Editar o orçamento depois do aceite (trocar item e preço) → sucesso, e o `termos_snapshot`
      **continua com os valores antigos** (conferido no banco).
- [ ] Tentar coletar um segundo aceite no mesmo orçamento → erro "já tem aceite", nada grava,
      PNG órfão removido do bucket.
- [ ] Tentar excluir um orçamento com aceite → erro na action **e**, forçando por SQL direto,
      erro de FK no banco.
- [ ] Orçamento `recusado` → botão não aparece; chamando a action na mão → `status_invalido`.
- [ ] Orçamento sem dentista responsável → `sem_responsavel`, mensagem clara.
- [ ] **2 contas:** dentista autor coleta (sucesso) · secretária da mesma clínica coleta (sucesso) ·
      **outro dentista** da mesma clínica coleta → `sem_permissao` · dentista de **outra clínica**
      não enxerga o orçamento nem o aceite.
- [ ] Selo aparece no modal com nome de quem assinou + data; sem aceite, só o botão.

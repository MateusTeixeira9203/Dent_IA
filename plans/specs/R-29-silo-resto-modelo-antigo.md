# R-29 — Restos do modelo antigo de silo: identidade multi-clínica e lista de pacientes

> **SPEC** · **R-29** · fase **plano** — escrita 29/07, **não codada** · **Modelo:** Sonnet na
> execução (o diagnóstico está fechado; a ambiguidade de produto foi resolvida pelo Mateus).
> **Aberto:** 2026-07-29 · **Depende de:** nada. **Encosta na** hierarquia 3.1 (Spec 1 + Fatia A,
> aplicadas 18/07) — este item é a **dívida que ficou** dessa migração.

## Por que existe

A hierarquia 3.1 mudou o modelo: **clínico é da clínica, trabalho é do autor, dinheiro e agenda
são privados.** A RLS foi migrada pra esse modelo. Duas coisas **não** foram, e só apareceram
agora porque o Mateus virou o primeiro usuário com perfil em 2 clínicas (29/07).

Nenhuma das duas quebra em clínica de 1 dentista — por isso passaram meses sem aparecer.

## Decisão de produto (Mateus, 29/07)

> **Paciente é da clínica, e todo dentista da clínica enxerga todos.** A razão é operacional:
> qualquer dentista pode precisar marcar ou atender qualquer paciente. Esconder a base cria
> atrito no dia a dia em vez de proteger alguma coisa.

Isso **confirma** a RLS atual (`pacientes_select` já é da clínica inteira) e **invalida** o filtro
que ainda existe na lista. Dinheiro e agenda continuam privados — nada nesta spec mexe neles.

## Achado A — `get_my_dentista_id()` ignora a clínica ativa

```sql
-- como está em prod hoje
SELECT id FROM dentistas WHERE user_id = auth.uid() LIMIT 1;
```

Sem filtro de `clinica_id` e sem `ORDER BY`. Para quem tem perfil em 2 clínicas, devolve uma
linha arbitrária. **Confirmado rodando a query real:** com a conta `teste` operando na *Império*,
devolve o `dentista_id` da *Teste01*.

O agravante é que a **camada de aplicação está certa** — `requireClinicContext`
([clinic.ts:57](../../src/server/auth/clinic.ts:57)) e `getDentistaCached`
([get-dentista.ts:59](../../src/lib/get-dentista.ts:59)) filtram por `clinica_id`. Então app e RLS
discordam sobre **quem o usuário é**:

| Camada | Resolve para |
|---|---|
| App (grava) | perfil da clínica **ativa** ✔ |
| RLS (autoriza) | perfil de **qualquer** clínica ✘ |

Toda policy que chama a função herda o furo: `orcamentos_select/update/delete_own`,
`pagamentos_access`, `orcamento_itens_select/update/delete_own`, `fichas_write_own`.

Efeito prático pro dentista multi-clínica: cria um orçamento na clínica B e **não consegue mais
vê-lo** (app gravou um id, RLS exige outro); `fichas_write_own` barra escrita de ficha na clínica
B. E como **UPDATE barrado por RLS volta como sucesso com 0 linhas**, falha em silêncio — a tela
mente. É o modo de falha nº 1 do projeto.

**Raio de alcance hoje: 1 conta (a de teste).** Nenhum usuário real é multi-clínica ainda, então
não há dado corrompido em produção. Mas o `CLAUDE.md` põe "dentista pode estar em mais de uma
clínica" como inegociável — é uma capacidade contratada que está quebrada.

## Achado B — lista de pacientes ainda aplica o silo antigo

[pacientes-list.tsx:48](../../src/app/dashboard/pacientes/_components/pacientes-list.tsx:48):

```ts
const isDentista = dentista.role === 'dentista';
if (isDentista) {
  // Filtro estrito: Dentistas convidados veem apenas os próprios pacientes
  query = query.eq('dentista_id', dentista.id);
}
```

O comentário descreve o modelo **anterior** à 3.1. A RLS diz clínica inteira; a lista diz só os
próprios. Resultado observado: a lista vem **vazia**, mas abrir o mesmo paciente **por URL direta
carrega normalmente** — mesma clínica, mesmo paciente, resposta diferente conforme o caminho.

Só não apareceu antes porque o filtro pega apenas `role === 'dentista'`, e o Mateus é `admin`.

**Varredura feita:** `pacientes-list.tsx:50` é o **único** lugar que filtra a lista de pacientes
por dentista. Os outros `.eq('dentista_id', …)` do código são agenda, financeiro, horários,
`google_tokens`, catálogo de procedimentos e guardas de escrita — **todos corretos** pela 3.1.

## Escopo

**Cobre:** A (função de RLS) · B (filtro da lista) · índice único `(user_id, clinica_id)` em
`dentistas` como trava (hoje **não existe** — sem ele, nem a função corrigida fica determinística
se alguém duplicar o vínculo; hoje há 0 duplicatas, então é barato travar agora).

**Não cobre:** agenda e financeiro (privados por design, e o Mateus reafirmou) · unificar
`clinica_usuarios` × `dentistas` como fonte de papel (`get_my_role` já lê os dois, com fallback —
é dívida real, mas de outra natureza e sem sintoma) · qualquer mudança no que a secretária vê.

## Plano

| Arquivo | O que muda |
|---|---|
| `supabase/migrations/*_114_dentista_id_por_clinica.sql` (novo) | `get_my_dentista_id()` passa a filtrar por `active_clinica_id`; índice único `(user_id, clinica_id)` |
| `src/app/dashboard/pacientes/_components/pacientes-list.tsx` | remove o bloco `isDentista` (3 linhas) |

### Migration (risco **alto** — toca autorização de tudo)

```sql
create unique index if not exists idx_dentistas_user_clinica
  on public.dentistas(user_id, clinica_id);

create or replace function public.get_my_dentista_id()
returns uuid language sql stable security definer set search_path = public as $$
  select d.id
  from public.dentistas d
  join public.users u on u.id = auth.uid()
  where d.user_id = auth.uid()
    and d.clinica_id = u.active_clinica_id
  limit 1;
$$;
```

Espelha o padrão que `get_my_role()` **já usa** (`u.active_clinica_id`) — não inventa fonte nova.

**Risco checado antes de escrever:** se `active_clinica_id` fosse nulo ou apontasse pra clínica
sem perfil, a função devolveria `NULL` e a pessoa perderia acesso aos próprios registros. Rodei a
contagem em prod: **0 usuários** em cada um desses casos (12 usuários no total). Falha fecha em
vez de abrir, que é a direção certa — mas é justamente por isso que o gate abaixo não é opcional.

## Invariantes

- [ ] `get_my_dentista_id()` devolve **sempre** o perfil da clínica ativa, ou `NULL` — nunca o de outra clínica.
- [ ] Um usuário tem no máximo **1** perfil por clínica (garantido por índice único, não por convenção).
- [ ] Lista de pacientes e RLS de pacientes concordam: **mesma clínica → mesmo conjunto**, por qualquer caminho (lista ou URL direta).
- [ ] Agenda e financeiro **não mudam** — continuam privados por dentista, secretária vê tudo.

## Gates de aceite (exigem **2 contas logadas** — script não pega furo de policy)

- [ ] Dentista agregado (não-admin) abre a lista → vê **todos** os pacientes da clínica; abrir por
      URL direta dá o mesmo resultado.
- [ ] Esse mesmo dentista **não** vê orçamento/pagamento de outro dentista (a 3.1 continua de pé).
- [ ] Conta multi-clínica: cria um orçamento na clínica B → **enxerga e edita** o que acabou de
      criar (é o que está quebrado hoje).
- [ ] Conta multi-clínica: salva uma ficha na clínica B → grava de verdade (conferir a linha no
      banco, não a mensagem da tela — UPDATE barrado por RLS mente).
- [ ] Trocar de clínica no seletor e repetir: nenhum dado da clínica A aparece na B.
- [ ] Dentista de **outra** clínica continua sem ver nada — o silo entre clínicas não afrouxou.
- [ ] Secretária: comportamento inalterado nas 3 telas (pacientes, agenda, financeiro).

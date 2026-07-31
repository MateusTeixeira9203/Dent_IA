# R-29 — Restos do modelo antigo de silo: identidade multi-clínica e lista de pacientes

> **SPEC** · **R-29** · fase **aprovada** — escrita 29/07, 2 defeitos corrigidos 30/07 (índice
> que já existia, gate do admin desatualizado — ver Escopo e Gates), **não codada** ·
> **Modelo:** Sonnet na execução (o diagnóstico está fechado; a ambiguidade de produto foi
> resolvida pelo Mateus). **Aberto:** 2026-07-29 · **Depende de:** nada. **Encosta na**
> hierarquia 3.1 (Spec 1 + Fatia A, aplicadas 18/07) — este item é a **dívida que ficou**
> dessa migração.

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

**Cobre:** A (função de RLS) · B (filtro da lista).

**Correção 30/07:** esta spec afirmava que o índice único `(user_id, clinica_id)` em
`dentistas` "hoje não existe" e propunha criá-lo. **Existe** — `idx_dentistas_clinica_user`,
`UNIQUE (clinica_id, user_id)` (ordem de coluna trocada, mesma trava). Confirmado por query
direta contra `pg_indexes`. A função corrigida abaixo já é determinística por causa dele —
nada a criar nesta parte.

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

## Status — 🟡 codado e aplicado 30/07, gates de conta única verificados 30/07 — falta o par de 2 dentistas

**Feito:** migration 120 (função corrigida) aplicada por Mateus, confirmada por
`pg_get_functiondef`. `pacientes-list.tsx` sem o filtro `isDentista`. `typecheck`/`build`
limpos. **Verificação por dado real** (não substitui o gate, mas prova a lógica): a única
conta multi-clínica (`teste`) tem `active_clinica_id` = Império e dois perfis (`dentistas`),
um em Império e um em Teste01 — a função nova resolve deterministicamente pro perfil de
Império (o que o app já esperava); a antiga podia devolver qualquer um dos dois.

**Verificado ao vivo 30/07** (conta `mateusteixeira834@gmail.com`, multi-clínica real —
Império + Teste01): lista de pacientes troca de 5→1 ao trocar clínica ativa; URL direta pra
paciente da clínica A enquanto ativa é B devolve 404 (não vaza dado, não é só lista vazia);
`POST /api/user/switch-clinic` pra clínica sem membership devolve 403. Os 3 bullets de conta
única abaixo estão cobertos.

**Falta:** o par de **2 dentistas comuns diferentes** (não a mesma conta trocando de
clínica) — isso exige login real, que eu não posso fazer (não digito senha de conta alheia).

## Resto ainda aberto — `get_my_role()` (achado 30/07, 3ª ocorrência da mesma classe)

Achado ao medir o risco de deixar a R-32 no ar sem gate. `get_my_role()` tem **o mesmo furo**
que esta spec corrigiu no `get_my_dentista_id()` e que o item 9 da
[R-35](R-35-riscos-nao-reportados.md) corrigiu no `has_active_membership()` — e passou batido
nas duas:

```sql
COALESCE(
  ( SELECT cu.role FROM clinica_usuarios cu ...
    WHERE cu.clinica_id = u.active_clinica_id AND cu.status='ativo' ),  -- escopado
  ( SELECT role FROM dentistas
    WHERE user_id = auth.uid() AND ativo = true LIMIT 1 )               -- SEM clinica
)
```

**Por que importa:** `get_my_role()` gateia `can_see_orcamento` (migration 121, R-32) — se o
fallback disparar devolvendo `admin` de outra clínica, a pessoa vê **todos** os orçamentos da
clínica ativa.

**Não é alcançável hoje:** os 12 usuários têm vínculo ativo em `clinica_usuarios` casado com
`active_clinica_id`, então o 1º ramo sempre resolve e o fallback nunca roda (conferido por query
30/07). Some de vez com a [R-36](R-36-um-login-uma-clinica.md), mas a correção é de 1 linha e não
precisa esperar por ela.

**Correção:** o fallback ganha `AND clinica_id = (select active_clinica_id from users where
id = auth.uid())`, igual ao que a migration 118 fez no `has_active_membership`.

**O padrão é o achado de verdade:** três funções `SECURITY DEFINER` de autorização, três com
fallback agnóstico de clínica. Vale varrer **todas** as helpers de RLS atrás do mesmo formato em
vez de corrigir uma por vez conforme aparecem.

## Gates de aceite (exigem **2 contas logadas** — script não pega furo de policy)

- [ ] Dentista agregado (não-admin) abre a lista → vê **todos** os pacientes da clínica; abrir por
      URL direta dá o mesmo resultado.
- [ ] Esse mesmo dentista **não** vê orçamento/pagamento de **outro dentista não-admin** (a 3.1
      continua de pé). **Admin e secretária vêem todos** — isso é esperado, não é furo: a
      [R-32](R-32-orcamento-visivel-autor-admin-secretaria.md) mudou essa regra e já está
      aplicada (migration 121, 30/07). O par de teste deste gate tem que ser dois dentistas
      comuns; testar com a conta admin não prova o invariante da R-29 (visibilidade de admin é
      regra da R-32, não desta spec).
- [ ] Conta multi-clínica: cria um orçamento na clínica B → **enxerga e edita** o que acabou de
      criar (é o que está quebrado hoje).
- [ ] Conta multi-clínica: salva uma ficha na clínica B → grava de verdade (conferir a linha no
      banco, não a mensagem da tela — UPDATE barrado por RLS mente).
- [x] Trocar de clínica no seletor e repetir: nenhum dado da clínica A aparece na B. — **verificado
      30/07**, lista 5→1, URL direta 404.
- [ ] Dentista de **outra** clínica continua sem ver nada — o silo entre clínicas não afrouxou.
- [ ] Secretária: comportamento inalterado nas 3 telas (pacientes, agenda, financeiro).

# R-32 — Orçamento visível para autor, admin e secretária

**Modelo:** Opus (mudança de autorização em produção)
**Status:** 🟡 aplicado 30/07, falta o gate de 2 contas (G1–G8) — decisões da §9 fechadas,
ver abaixo
**Origem:** auditoria 29/07 + decisão do Mateus. **Depende de:** [R-29](R-29-silo-resto-modelo-antigo.md)
**Corrige um gate da R-29** — ver §6.

---

## 1. O problema

Na Clindent existem **50 orçamentos**. Medido rodando o predicado da RLS contra o dado real:

| Quem | Papel | Vê | Não vê |
|---|---|---|---|
| Paula Monteiro | dentista | **0** | 50 |
| Armando | dentista | 8 | 42 |
| **Gabriel de O. Teixeira** | **admin** | **9** | **41** |
| Renato | dentista | 16 | 34 |
| Jenaina | dentista | 17 | 33 |
| Portaria | secretária | 50 | 0 |

**Nenhum orçamento foi apagado.** A policy em produção é:

```sql
orcamentos_select:  belongs_to_active_clinic(clinica_id) AND is_own_clinical_record(dentista_id)
is_own_clinical_record(x) = ( x = get_my_dentista_id() OR get_my_role() = 'secretaria' )
```

`admin` não aparece nessa expressão. E **nenhuma query de orçamento no app filtra por
dentista** — todas filtram `clinica_id`/`paciente_id`. O app pede a clínica, o banco entrega
só o do autor, e **SELECT cortado por RLS não devolve erro** — devolve menos linhas, calado.
Daí o relato de "orçamento sumindo".

Superfícies contaminadas além da tela de orçamento:

| Onde | Efeito |
|---|---|
| `get-visible-timeline-events.ts:74` | timeline do paciente esconde orçamento de colega |
| `lib/ai/context.ts:218-244` | briefing do Dex sub-reporta em silêncio |
| `get-patient-workspace-data.ts:119` | aba Orçamentos do perfil mostra parcial |

## 2. Decisão do Mateus (29/07)

> **Orçamento visível para o autor, o admin e a secretária.** Outros dentistas não veem.

E, sobre o perfil admin (29/07, mesma sessão):

> Deixa o admin como está, sem mexer, sem função extra. Ele é só alguém que convida e
> gerencia a clínica. Depois a gente trabalha no admin operacional, com mais tempo.

Portanto esta spec **não** cria coluna de papel, não mexe em `get_my_role()`, não separa admin
clínico de admin burocrático. Usa o modelo de papel que já existe.

## 3. A armadilha: NÃO mexer em `is_own_clinical_record`

O caminho óbvio seria adicionar `admin` na função. **Está errado.** Ela é usada por:

| Policy | Tabela | O que aconteceria |
|---|---|---|
| `agendamentos_access` | agendamentos | admin passaria a ver **agenda** de todos |
| `pagamentos_access` | pagamentos | admin passaria a ver **dinheiro** de todos |
| `horarios_access` | horarios_disponiveis | admin veria grade de todos |
| `procedimentos_select` | procedimentos | admin veria catálogo de todos |
| `planejamentos_select` | planejamentos | admin veria planejamento de todos |
| `orcamentos_select/update` | orcamentos | ✔ o que queremos |
| `orcamento_itens_select/update` | orcamento_itens | ✔ o que queremos |

Agenda e dinheiro são **privados por design** na hierarquia 3.1, e o Mateus reafirmou isso na
R-29. Mexer na função compartilhada vazaria os dois **como efeito colateral silencioso** de
uma mudança sobre orçamento.

**Decisão: helper novo, dedicado, e só as policies de orçamento passam a usá-lo.**

## 4. Trava de segurança — o que NÃO muda

- `is_own_clinical_record` fica **intacta**
- `agendamentos`, `pagamentos`, `horarios_disponiveis`, `procedimentos`, `planejamentos`:
  policies **não são tocadas**
- `get_my_role()` não muda
- `orcamentos_insert_own` (usa `can_act_as_dentista`) não muda — quem **cria** continua igual
- Nenhuma coluna, nenhum dado. **Zero migração de dado**

## 5. Contrato

```sql
-- Migration 115. Dedicada a orçamento. Não toca is_own_clinical_record.
-- Pré-requisito: migration 114 da R-29 (get_my_dentista_id por clínica) já aplicada.

create or replace function public.can_see_orcamento(record_dentista_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select record_dentista_id = public.get_my_dentista_id()
      or public.get_my_role() in ('admin', 'secretaria')
$$;
revoke all on function public.can_see_orcamento(uuid) from public, anon;
grant execute on function public.can_see_orcamento(uuid) to authenticated;

-- SELECT: autor + admin + secretária
drop policy if exists orcamentos_select on public.orcamentos;
create policy orcamentos_select on public.orcamentos for select
  using (belongs_to_active_clinic(clinica_id) and can_see_orcamento(dentista_id));

drop policy if exists orcamento_itens_select on public.orcamento_itens;
create policy orcamento_itens_select on public.orcamento_itens for select
  using (belongs_to_active_clinic(clinica_id) and exists (
    select 1 from public.orcamentos o
     where o.id = orcamento_itens.orcamento_id and can_see_orcamento(o.dentista_id)));

-- UPDATE: mantém is_own_clinical_record (autor + secretária). Ver §8, questão 1.
-- DELETE: mantém `dentista_id = get_my_dentista_id()` — só o autor apaga.
```

> **`revoke ... from public, anon` é obrigatório.** As migrations 091, 093, 095 e 096 existem
> só para fechar helpers `security definer` que nasceram expostos. Não repetir o erro.
> `grant execute ... to authenticated` é igualmente obrigatório — sem ele a RLS quebra
> (aprendizado registrado: revogar de `authenticated` derruba a policy).

## 6. Corrige um gate errado da R-29

A R-29 tem como gate de aceite:

> *"Esse mesmo dentista **não** vê orçamento/pagamento de outro dentista (a 3.1 continua de pé)."*

Escrito **antes** da decisão do Mateus. Continua correto para **dentista**, e fica **errado
para admin** — rodando como está, o gate passa com o Gabriel vendo 9 de 50 e o bug é aprovado.

**Ação:** ao aplicar esta spec, o gate da R-29 passa a ler *"dentista não vê orçamento de
outro dentista; **admin e secretária vêem todos**"*. Editar a R-29 nesta linha.

Segundo erro de fato na R-29, conferido no banco: ela afirma que o índice único
`(user_id, clinica_id)` em `dentistas` "hoje não existe". **Existe** —
`idx_dentistas_clinica_user UNIQUE (clinica_id, user_id)`. A migration usa `if not exists`,
então não quebra, mas a premissa que justifica o bloco está errada.

## 7. Invariantes

- [ ] Dentista vê o próprio orçamento e **não** vê o de colega
- [ ] Admin e secretária vêem **todos** os da clínica
- [ ] Agenda, pagamento, horário, catálogo e planejamento: **conjunto inalterado** para todos os papéis
- [ ] Nenhuma clínica vê orçamento de outra
- [ ] `orcamento_itens` mostra exatamente os itens dos orçamentos visíveis — nunca item órfão de orçamento invisível
- [ ] Quem **cria** orçamento não muda

## 8. Gates de aceite — exigem **2 contas logadas**

| # | Gate |
|---|---|
| G1 | Conta **admin** da Clindent abre Orçamentos → vê **50 de 50** (hoje 9) |
| G2 | Conta **dentista** da Clindent vê só os próprios; abrir por URL direta o de colega **nega** |
| G3 | Secretária: comportamento **inalterado** (já via 50) |
| G4 | Admin abre a **agenda** → conjunto inalterado (só a dele). Este é o gate anti-vazamento |
| G5 | Admin abre o **financeiro** → conjunto inalterado |
| G6 | Timeline do paciente e briefing do Dex passam a contar todos os orçamentos para admin |
| G7 | Dentista de outra clínica continua sem ver nada |
| G8 | Itens do orçamento aparecem junto com o orçamento, para admin |

G4 e G5 não são opcionais: são a prova de que o helper dedicado não vazou para agenda e dinheiro.

## 9. Decidido 30/07

1. **Admin edita orçamento de outro?** **Não, só vê** (confirmado). UPDATE fica com
   `is_own_clinical_record` (autor + secretária) — não mudou nesta migration.
2. **Admin apaga?** **Não, só o autor** (confirmado). DELETE não mudou.
3. **Secretária continua vendo tudo?** **Sim, intencional** (confirmado) — ela é quem
   registra recebimento e faz atendimento de balcão.

## 10. Status — 🟡 aplicado 30/07, falta o gate de 2 contas

Migration 121: `can_see_orcamento()` criada (`revoke ... from public, anon` +
`grant ... to authenticated`, confirmado por `has_function_privilege`), `orcamentos_select`
e `orcamento_itens_select` trocadas. `UPDATE`/`DELETE` não tocados (decisão da §9).
Nenhuma mudança de código de app — as 3 superfícies contaminadas (§1) leem só via RLS, sem
filtro adicional por `dentista_id` (conferido em `get-visible-timeline-events.ts` e
`lib/ai/context.ts`). Gate da R-29 (§6 acima) já atualizado.

**Falta:** os 8 gates (G1–G8), ao vivo, com 2 contas — G4 e G5 (agenda e financeiro
inalterados pro admin) não são opcionais, são a prova de que o helper não vazou.

-- Migration 121: orçamento visível para autor, admin e secretária (R-32)
--
-- Na Clindent existem 50 orçamentos: Paula (dentista) vê 0, Armando 8, Gabriel (admin) 9,
-- só a secretária vê os 50. orcamentos_select usa is_own_clinical_record, que não tem
-- admin, e nenhuma query do app filtra por dentista — SELECT cortado por RLS não devolve
-- erro, só menos linhas, em silêncio.
--
-- Decisão do Mateus 29/07: autor + admin + secretária veem. Admin só vê (não edita, não
-- apaga) — confirmado 30/07.
--
-- A armadilha: NÃO mexer em is_own_clinical_record — ela também governa agendamentos,
-- pagamentos, horarios_disponiveis, procedimentos e planejamentos, privados por design na
-- hierarquia 3.1. Helper novo, dedicado, só as policies de orçamento usam.
--
-- Pré-requisito: migration 120 da R-29 (get_my_dentista_id por clínica ativa) já aplicada.

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

-- UPDATE mantém is_own_clinical_record (autor + secretária) — admin só vê, não edita.
-- DELETE mantém dentista_id = get_my_dentista_id() — só o autor apaga. Nenhum dos dois
-- muda nesta migration.

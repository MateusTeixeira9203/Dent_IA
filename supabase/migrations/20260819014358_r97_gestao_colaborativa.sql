-- R-97 — gestão colaborativa. Sem backfill e sem ampliar WhatsApp.

drop trigger if exists prevent_last_admin_removal on public.clinica_usuarios;

create or replace function public.can_see_orcamento(record_dentista_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select record_dentista_id = public.get_my_dentista_id()
      or public.get_my_role() = 'secretaria'
$$;

drop policy if exists fichas_delete_admin on public.fichas;

drop policy if exists configuracoes_clinica_write_admin on public.configuracoes_clinica;
drop policy if exists configuracoes_clinica_write_dentista on public.configuracoes_clinica;
create policy configuracoes_clinica_write_dentista on public.configuracoes_clinica
for all to authenticated
using (belongs_to_active_clinic(clinica_id) and is_clinic_dentista())
with check (belongs_to_active_clinic(clinica_id) and is_clinic_dentista());

drop policy if exists convites_select_admin on public.convites;
drop policy if exists convites_select_dentista on public.convites;
create policy convites_select_dentista on public.convites for select to authenticated
using (belongs_to_active_clinic(clinica_id) and is_clinic_dentista());

drop policy if exists clinica_usuarios_select on public.clinica_usuarios;
create policy clinica_usuarios_select on public.clinica_usuarios for select to authenticated
using (usuario_id = auth.uid() or (belongs_to_active_clinic(clinica_id) and is_clinic_dentista()));

-- WhatsApp preserva as policies atuais e aparece somente como “Em breve”.

-- R-11 gate #6: admin apaga qualquer ficha da clínica. fichas_write_own (089) trava
-- DELETE no dono (dentista_id = get_my_dentista_id()), sem exceção — a policy de
-- 057 que dava esse bypass pro admin não existe mais no banco vivo (achado ao
-- vivo, confirmado por pg_policies + simulação com auth.uid() real: admin apaga
-- própria ficha ok, ficha de outro dentista devolve 0 linhas, sem erro).
-- Só DELETE — INSERT/UPDATE de conteúdo continuam travados no autor (fichas_write_own),
-- a spec do R-11 nunca pediu admin editando ficha alheia, só apagando.
--
-- Aplicada ao vivo via MCP em 28/07; este arquivo só fecha o histórico versionado.

drop policy if exists "fichas_delete_admin" on public.fichas;
create policy "fichas_delete_admin" on public.fichas for delete
  using (belongs_to_active_clinic(clinica_id) and is_clinic_admin());

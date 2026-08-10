-- Ajuste pos-advisor da migration 128 (R-94):
-- 1) consolida as 2 policies permissivas em 1 (o Postgres avaliava as 2 em toda query
--    pra SELECT/INSERT/UPDATE/DELETE -- mesmo padrao ja usado em pagamentos_access).
-- 2) indices simples nas FKs que nao tinham cobertura (protetico_id so estava coberto
--    como 2a coluna do indice composto, que nao serve pra busca so por ela).

drop policy pedidos_protetico_do_protetico on pedidos_protetico;
drop policy pedidos_protetico_equipe on pedidos_protetico;

create policy pedidos_protetico_access on pedidos_protetico
  for all to authenticated
  using (
    belongs_to_active_clinic(clinica_id)
    and (protetico_id = get_my_dentista_id() or get_my_role() <> 'protetico')
  )
  with check (
    belongs_to_active_clinic(clinica_id)
    and (protetico_id = get_my_dentista_id() or get_my_role() <> 'protetico')
  );

create index pedidos_protetico_protetico_id_idx on pedidos_protetico (protetico_id);
create index pedidos_protetico_dentista_id_idx on pedidos_protetico (dentista_id);
create index pedidos_protetico_paciente_id_idx on pedidos_protetico (paciente_id);
create index pedidos_protetico_agendamento_id_idx on pedidos_protetico (agendamento_id);

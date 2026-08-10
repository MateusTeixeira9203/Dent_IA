-- R-94: role novo "protetico" + tabela de pedidos ao laboratorio protetico.
-- Ver plans/specs/R-94-agenda-do-protetico.md.

-- Amplia os 2 CHECK que controlam o role de equipe.
alter table dentistas drop constraint dentistas_role_check;
alter table dentistas add constraint dentistas_role_check
  check (role = any (array['admin','dentista','secretaria','protetico']));

alter table clinica_usuarios drop constraint clinica_usuarios_role_check;
alter table clinica_usuarios add constraint clinica_usuarios_role_check
  check (role = any (array['admin','dentista','secretaria','protetico']));

-- Tabela de pedidos: pedido solto (paciente + observacao + data), sem vinculo com
-- procedimento/orcamento (decisao da spec parte 2). on delete restrict nos FKs de
-- dentistas -- apagar dentista nao pode arrastar pedido junto (mina do R-37).
create table pedidos_protetico (
  id             uuid primary key default gen_random_uuid(),
  clinica_id     uuid not null references clinicas(id) on delete cascade,
  protetico_id   uuid not null references dentistas(id) on delete restrict,
  dentista_id    uuid not null references dentistas(id) on delete restrict,
  paciente_id    uuid not null references pacientes(id) on delete cascade,
  agendamento_id uuid references agendamentos(id) on delete set null,
  observacao     text not null,
  data_entrega   date not null,
  status         text not null default 'pendente'
                 check (status in ('pendente', 'entregue')),
  entregue_em    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index pedidos_protetico_protetico_data_idx
  on pedidos_protetico (clinica_id, protetico_id, data_entrega);

create trigger pedidos_protetico_updated_at
  before update on pedidos_protetico
  for each row execute function update_updated_at();

alter table pedidos_protetico enable row level security;

-- Protetico so ve/edita os pedidos enderecados a ele, na clinica ativa.
create policy pedidos_protetico_do_protetico on pedidos_protetico
  for all to authenticated
  using (belongs_to_active_clinic(clinica_id) and protetico_id = get_my_dentista_id())
  with check (belongs_to_active_clinic(clinica_id) and protetico_id = get_my_dentista_id());

-- Resto da equipe (dentista/secretaria/admin) ve e cria pedidos da clinica.
create policy pedidos_protetico_equipe on pedidos_protetico
  for all to authenticated
  using (belongs_to_active_clinic(clinica_id) and get_my_role() <> 'protetico')
  with check (belongs_to_active_clinic(clinica_id) and get_my_role() <> 'protetico');

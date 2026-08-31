-- =====================================================================
-- R-140a — Fundação aditiva de Atendimento clínico
--
-- EXPAND somente: não escreve dados históricos, não muda o salvamento atual
-- e não troca nenhuma leitura. O backfill e o dual-write serão migrations/
-- commits posteriores, depois de validar esta estrutura e suas policies.
-- =====================================================================

create table public.atendimentos_clinicos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  dentista_id uuid not null references public.dentistas(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  chave_idempotencia uuid not null,
  data_atendimento date not null,
  origem text not null check (origem in ('meu_dia', 'ficha', 'importado', 'legado')),
  estado text not null check (estado in ('preparando', 'finalizado', 'falhou')),
  criado_por uuid references public.users(id) on delete set null,
  finalizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atendimentos_finalizado_coerente check (
    estado <> 'finalizado' or finalizado_em is not null
  ),
  constraint atendimentos_chave_idempotencia_unica unique (clinica_id, chave_idempotencia)
);

comment on table public.atendimentos_clinicos is
  'R-140a — âncora de uma visita clínica. Não é tratamento e não duplica evento/evolução; '
  'organiza as relações entre eles. A migration de fundação não altera nenhuma escrita existente.';

create index atendimentos_clinicos_paciente_data_idx
  on public.atendimentos_clinicos (clinica_id, paciente_id, data_atendimento desc, id desc);
create index atendimentos_clinicos_dentista_data_idx
  on public.atendimentos_clinicos (clinica_id, dentista_id, data_atendimento desc, id desc);
create unique index atendimentos_clinicos_agendamento_unico_idx
  on public.atendimentos_clinicos (clinica_id, agendamento_id)
  where agendamento_id is not null;

create trigger atendimentos_clinicos_updated_at
  before update on public.atendimentos_clinicos
  for each row execute function public.update_updated_at();

alter table public.ficha_evolucoes
  add column if not exists atendimento_id uuid
  references public.atendimentos_clinicos(id) on delete set null;

comment on column public.ficha_evolucoes.atendimento_id is
  'R-140a — visita que contém esta evolução. NULL preserva leitura legada até o backfill.';

-- O dual-write consulta por este par antes de criar uma evolução. A constraint também fecha a
-- corrida entre dois retries da mesma chave. Esta migration ainda não foi aplicada fora do
-- ambiente local, portanto o índice pode nascer junto da fundação sem tocar dado clínico.
create unique index ficha_evolucoes_atendimento_unico_idx
  on public.ficha_evolucoes (ficha_id, atendimento_id)
  where atendimento_id is not null;

create table public.atendimento_eventos (
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  atendimento_id uuid not null references public.atendimentos_clinicos(id) on delete cascade,
  evento_id uuid not null references public.odontograma_eventos(id) on delete cascade,
  papel text not null check (papel in ('registrado', 'realizado')),
  created_at timestamptz not null default now(),
  primary key (atendimento_id, evento_id, papel),
  constraint atendimento_evento_papel_unico unique (evento_id, papel)
);

comment on table public.atendimento_eventos is
  'R-140a — relação do evento odontológico com a visita. Um mesmo evento pode ter uma visita '
  'de registro e outra de realização; por isso atendimento_id não mora no evento.';

create index atendimento_eventos_evento_idx
  on public.atendimento_eventos (clinica_id, evento_id);

-- FKs simples não garantem que a evolução e o Atendimento pertençam ao mesmo
-- paciente/autor. A trigger fecha essa travessia no banco, inclusive diante de
-- chamada manual à Data API. SECURITY INVOKER: não cria uma via que contorne RLS.
create or replace function public.validar_evolucao_atendimento_contexto()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.atendimento_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.atendimentos_clinicos atendimento
    join public.fichas ficha on ficha.id = new.ficha_id
    where atendimento.id = new.atendimento_id
      and atendimento.clinica_id = new.clinica_id
      and ficha.clinica_id = new.clinica_id
      and atendimento.paciente_id = ficha.paciente_id
      and atendimento.dentista_id = new.dentista_id
  )
  then
    raise exception 'evolucao_atendimento_contexto_invalido';
  end if;

  return new;
end;
$$;

create trigger ficha_evolucoes_validar_atendimento_contexto
  before insert or update of atendimento_id, ficha_id, clinica_id, dentista_id
  on public.ficha_evolucoes
  for each row execute function public.validar_evolucao_atendimento_contexto();

create or replace function public.validar_atendimento_evento_contexto()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.atendimentos_clinicos atendimento
    join public.odontograma_eventos evento on evento.id = new.evento_id
    where atendimento.id = new.atendimento_id
      and atendimento.clinica_id = new.clinica_id
      and evento.clinica_id = new.clinica_id
      and atendimento.paciente_id = evento.paciente_id
      and atendimento.dentista_id = evento.dentista_id
  )
  then
    raise exception 'atendimento_evento_contexto_invalido';
  end if;

  return new;
end;
$$;

create trigger atendimento_eventos_validar_contexto
  before insert or update of clinica_id, atendimento_id, evento_id
  on public.atendimento_eventos
  for each row execute function public.validar_atendimento_evento_contexto();

alter table public.atendimentos_clinicos enable row level security;
alter table public.atendimento_eventos enable row level security;

revoke all on table public.atendimentos_clinicos from anon, authenticated;
grant select, insert, update on table public.atendimentos_clinicos to authenticated;

revoke all on table public.atendimento_eventos from anon, authenticated;
grant select, insert on table public.atendimento_eventos to authenticated;

create policy atendimentos_clinicos_select on public.atendimentos_clinicos
  for select to authenticated
  using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

-- A secretária pode ler o núcleo clínico, mas não cria/edita uma visita clínica.
create policy atendimentos_clinicos_write_own on public.atendimentos_clinicos
  for all to authenticated
  using (
    belongs_to_active_clinic(clinica_id)
    and is_clinic_dentista()
    and dentista_id = get_my_dentista_id()
  )
  with check (
    belongs_to_active_clinic(clinica_id)
    and is_clinic_dentista()
    and dentista_id = get_my_dentista_id()
  );

create policy atendimento_eventos_select on public.atendimento_eventos
  for select to authenticated
  using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

create policy atendimento_eventos_insert_own on public.atendimento_eventos
  for insert to authenticated
  with check (
    belongs_to_active_clinic(clinica_id)
    and exists (
      select 1
      from public.atendimentos_clinicos atendimento
      where atendimento.id = atendimento_eventos.atendimento_id
        and atendimento.clinica_id = atendimento_eventos.clinica_id
        and is_clinic_dentista()
        and atendimento.dentista_id = get_my_dentista_id()
    )
  );

revoke execute on function public.validar_evolucao_atendimento_contexto() from public, anon, authenticated;
revoke execute on function public.validar_atendimento_evento_contexto() from public, anon, authenticated;

-- =====================================================================
-- 138 — R-102: compromisso pessoal na agenda (bloqueio sem paciente)
--
-- Spec: plans/specs/R-102-compromisso-pessoal-agenda.md
--
-- Tabela ISOLADA de `agendamentos` (nao torna paciente_id opcional la --
-- ~25 call sites leem apt.paciente.nome/.id sem optional chaining). RLS
-- espelha agendamentos_access 1:1 (migration 089): dono OU secretaria.
-- on delete cascade em dentista_id -- bloqueio de agenda nao carrega
-- valor clinico/de negocio que sobreviva ao dono (diferente do R-37/R-94).
-- =====================================================================

begin;

create table agenda_bloqueios (
  id              uuid primary key default gen_random_uuid(),
  clinica_id      uuid not null references clinicas(id) on delete cascade,
  dentista_id     uuid not null references dentistas(id) on delete cascade,
  data_hora       timestamptz not null,
  duracao_minutos int not null check (duracao_minutos > 0),
  titulo          text,
  criado_por      uuid references dentistas(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index agenda_bloqueios_dentista_data_idx
  on agenda_bloqueios (clinica_id, dentista_id, data_hora);

create trigger agenda_bloqueios_updated_at
  before update on agenda_bloqueios
  for each row execute function update_updated_at();

alter table agenda_bloqueios enable row level security;

-- Mesma regra que agendamentos_access ja tem hoje (migration 089): dono OU secretaria.
create policy agenda_bloqueios_access on agenda_bloqueios
  for all to authenticated
  using (belongs_to_active_clinic(clinica_id) and is_own_clinical_record(dentista_id))
  with check (belongs_to_active_clinic(clinica_id) and is_own_clinical_record(dentista_id));

commit;

-- R-92 — exceções auditáveis de trial; ausência de linha preserva o padrão de 7 dias.
-- Não contém e-mails, nomes ou dados pessoais.

create table public.politicas_trial_assinatura (
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  usuario_id uuid not null references public.users(id) on delete restrict,
  dias_trial smallint not null check (dias_trial in (0, 7)),
  motivo text not null check (char_length(trim(motivo)) between 3 and 240),
  criado_em timestamptz not null default now(),
  primary key (clinica_id, usuario_id)
);

alter table public.politicas_trial_assinatura enable row level security;

comment on table public.politicas_trial_assinatura is
  'Política server-side para trial de assinatura. Sem policies de cliente; service role somente.';

-- 147 — R-120: documentos clínicos/financeiros assinados e termos de uso versionados.
-- Aditiva: não altera nem reinterpreta assinaturas e documentos já existentes.

create table public.aceites_termos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.users(id) on delete cascade,
  clinica_id uuid references public.clinicas(id) on delete set null,
  versao text not null,
  conteudo_hash text not null,
  aceito_em timestamptz not null default now(),
  ip inet,
  user_agent text,
  unique (usuario_id, versao)
);

create index aceites_termos_usuario_idx on public.aceites_termos (usuario_id, aceito_em desc);

alter table public.aceites_termos enable row level security;

create policy aceites_termos_select_own on public.aceites_termos
  for select to authenticated using (usuario_id = (select auth.uid()));

create policy aceites_termos_insert_own on public.aceites_termos
  for insert to authenticated with check (usuario_id = (select auth.uid()));

revoke all on public.aceites_termos from anon;
revoke update, delete, truncate, references, trigger on public.aceites_termos from authenticated;
grant select, insert on public.aceites_termos to authenticated;

create table public.documentos_aceite (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  dentista_id uuid not null references public.dentistas(id) on delete restrict,
  ficha_id uuid references public.fichas(id) on delete set null,
  orcamento_id uuid references public.orcamentos(id) on delete restrict,
  assinatura_id uuid references public.assinaturas(id) on delete restrict,
  tipo text not null check (tipo in ('orcamento', 'tcle', 'conclusao_procedimento')),
  template_versao text not null,
  template_hash text not null,
  conteudo_snapshot jsonb not null,
  assinatura_paciente_ref text not null,
  assinado_por text not null,
  assinado_em timestamptz not null default now(),
  pdf_path text not null unique,
  paciente_documento_id uuid not null references public.paciente_documentos(id) on delete restrict,
  unique (assinatura_id),
  check ((tipo = 'orcamento') = (orcamento_id is not null))
);

create index documentos_aceite_paciente_idx
  on public.documentos_aceite (clinica_id, paciente_id, assinado_em desc);
create index documentos_aceite_ficha_idx
  on public.documentos_aceite (ficha_id) where ficha_id is not null;

alter table public.documentos_aceite enable row level security;

-- Escrita é exclusivamente server-side com service role, após validação do contexto clínico.
-- Não criar policy de insert/update/delete impede fabricar ou alterar prova pelo cliente.
create policy documentos_aceite_select_clinical on public.documentos_aceite
  for select to authenticated
  using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

revoke all on public.documentos_aceite from anon;
revoke insert, update, delete, truncate, references, trigger on public.documentos_aceite from authenticated;
grant select on public.documentos_aceite to authenticated;

comment on table public.documentos_aceite is
  'R-120: snapshot e PDF final de aceite. Sem escrita client-side; PDF e snapshot são imutáveis.';

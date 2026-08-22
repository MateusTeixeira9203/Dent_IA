-- R-92 — assinatura individual Stripe e formação segura de Clínica.
-- Migration aditiva: não cria assinatura nem modifica membro existente.

create table public.formacoes_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  criado_por_usuario_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'aguardando_equipe'
    check (status in ('aguardando_equipe', 'coletando_pagamento', 'ativando', 'ativa', 'expirada', 'cancelada')),
  expires_at timestamptz not null,
  trial_ends_at timestamptz,
  activated_at timestamptz,
  activation_lease_token uuid,
  activation_lease_until timestamptz,
  activation_attempted_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index formacoes_clinica_aberta_unica
  on public.formacoes_clinica(clinica_id)
  where status in ('aguardando_equipe', 'coletando_pagamento', 'ativando');
create index formacoes_clinica_expiracao_idx on public.formacoes_clinica(status, expires_at);
alter table public.formacoes_clinica enable row level security;
create trigger formacoes_clinica_updated_at before update on public.formacoes_clinica
for each row execute function public.update_updated_at();

create table public.assinaturas_dentista (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  usuario_id uuid not null references public.users(id) on delete restrict,
  dentista_id uuid not null references public.dentistas(id) on delete restrict,
  formacao_id uuid references public.formacoes_clinica(id) on delete restrict,
  plano text not null check (plano in ('CONSULTORIO', 'CLINICA')),
  ciclo text not null check (ciclo in ('mensal', 'anual')),
  oferta text not null default 'fundador' check (oferta in ('fundador', 'publico')),
  stripe_customer_id text,
  stripe_setup_session_id text,
  stripe_checkout_session_id text,
  stripe_payment_method_id text,
  stripe_subscription_id text,
  stripe_subscription_schedule_id text,
  stripe_price_id text not null,
  status text not null default 'aguardando_formacao'
    check (status in ('aguardando_formacao', 'checkout_pendente', 'cartao_pronto', 'trialing', 'active', 'past_due', 'suspended', 'canceled', 'unpaid')),
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  current_period_ends_at timestamptz,
  billing_paused_at timestamptz,
  last_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assinaturas_dentista_usuario_dentista_unico unique (usuario_id, dentista_id)
);

create unique index assinaturas_dentista_stripe_customer_unico on public.assinaturas_dentista(stripe_customer_id) where stripe_customer_id is not null;
create unique index assinaturas_dentista_stripe_subscription_unico on public.assinaturas_dentista(stripe_subscription_id) where stripe_subscription_id is not null;
create unique index assinaturas_dentista_setup_session_unico on public.assinaturas_dentista(stripe_setup_session_id) where stripe_setup_session_id is not null;
create unique index assinaturas_dentista_checkout_session_unico on public.assinaturas_dentista(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index assinaturas_dentista_usuario_idx on public.assinaturas_dentista(usuario_id, clinica_id);
create index assinaturas_dentista_formacao_status_idx on public.assinaturas_dentista(formacao_id, status) where formacao_id is not null;
alter table public.assinaturas_dentista enable row level security;
create trigger assinaturas_dentista_updated_at before update on public.assinaturas_dentista
for each row execute function public.update_updated_at();

-- Sem policies client-side: services autenticados e webhooks usam service role.
alter table public.billing_events
  drop constraint billing_events_provider_check,
  add constraint billing_events_provider_check check (provider in ('abacatepay', 'stripe'));
alter table public.billing_events
  drop constraint billing_events_outcome_check,
  add constraint billing_events_outcome_check check (outcome in ('pending', 'processed', 'duplicate', 'error')),
  add column dentista_id uuid references public.dentistas(id) on delete set null,
  add column attempts integer not null default 1 check (attempts > 0),
  add column last_error text,
  add column received_at timestamptz not null default now(),
  add column processing_token uuid,
  add column processing_lease_until timestamptz,
  alter column outcome set default 'pending',
  alter column processed_at drop not null,
  alter column processed_at drop default;
create index billing_events_dentista_id_idx on public.billing_events(dentista_id) where dentista_id is not null;

alter table public.clinica_usuarios
  drop constraint clinica_usuarios_status_check,
  add constraint clinica_usuarios_status_check check (status in ('ativo', 'removido', 'pendente', 'suspenso'));

alter table public.clinicas
  add column status_elegibilidade text not null default 'regular'
    check (status_elegibilidade in ('regular', 'recompondo_equipe', 'decisao_pendente', 'bloqueada')),
  add column equipe_minima_ends_at timestamptz;

-- Lease atômico: uma execução cria subscriptions; queda é retomável após 5 min.
create or replace function public.claim_formacao_ativacao(p_formacao_id uuid, p_lease_token uuid)
returns table (formacao_id uuid, clinica_id uuid, trial_ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_formacao public.formacoes_clinica%rowtype;
  v_participantes_prontos integer;
begin
  select * into v_formacao from public.formacoes_clinica where id = p_formacao_id for update;
  if not found
     or v_formacao.status not in ('coletando_pagamento', 'ativando')
     or v_formacao.expires_at <= now()
     or (v_formacao.activation_lease_until is not null and v_formacao.activation_lease_until > now()) then
    return;
  end if;

  -- Uma retomada pode encontrar a primeira subscription já criada e a segunda
  -- ainda como cartão pronto. Ambas contam; a chave idempotente impede duplicação.
  select count(*) into v_participantes_prontos from public.assinaturas_dentista ad
  where ad.formacao_id = p_formacao_id and (
    (ad.status = 'cartao_pronto'
      and ad.stripe_customer_id is not null
      and ad.stripe_payment_method_id is not null)
    or
    (ad.status in ('trialing', 'active') and ad.stripe_subscription_id is not null)
  );
  if v_participantes_prontos < 2 then return; end if;

  update public.formacoes_clinica
  set status = 'ativando',
      trial_ends_at = coalesce(v_formacao.trial_ends_at, now() + interval '7 days'),
      activation_lease_token = p_lease_token,
      activation_lease_until = now() + interval '5 minutes',
      activation_attempted_at = now(),
      last_error = null
  where id = p_formacao_id
  returning id, formacoes_clinica.clinica_id, formacoes_clinica.trial_ends_at
  into formacao_id, clinica_id, trial_ends_at;
  return next;
end;
$$;
revoke all on function public.claim_formacao_ativacao(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_formacao_ativacao(uuid, uuid) to service_role;

create or replace function public.claim_stripe_billing_event(
  p_external_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_processing_token uuid
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_event public.billing_events%rowtype;
begin
  select * into v_event from public.billing_events
  where external_event_id = p_external_event_id for update;

  if not found then
    insert into public.billing_events (
      external_event_id, provider, event_type, outcome, payload,
      processed_at, processing_token, processing_lease_until
    ) values (
      p_external_event_id, 'stripe', p_event_type, 'pending', p_payload,
      null, p_processing_token, now() + interval '2 minutes'
    );
    return true;
  end if;

  if v_event.provider <> 'stripe' or v_event.outcome = 'processed' then
    return false;
  end if;
  if v_event.processing_lease_until is not null and v_event.processing_lease_until > now() then
    return false;
  end if;

  update public.billing_events
  set outcome = 'pending', attempts = attempts + 1, last_error = null,
      processing_token = p_processing_token,
      processing_lease_until = now() + interval '2 minutes'
  where id = v_event.id;
  return true;
end;
$$;
revoke all on function public.claim_stripe_billing_event(text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.claim_stripe_billing_event(text, text, jsonb, uuid) to service_role;

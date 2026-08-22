-- R-105b — outbox idempotente da primeira semana.
create table if not exists public.onboarding_comunicacoes (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  marco text not null,
  enviado_em timestamptz,
  tentativas smallint not null default 0 check (tentativas >= 0),
  last_error text,
  processing_token uuid,
  processing_lease_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (usuario_id, marco)
);

alter table public.onboarding_comunicacoes enable row level security;
revoke all on public.onboarding_comunicacoes from anon, authenticated;

comment on table public.onboarding_comunicacoes is
  'R-105b — controle operacional de comunicações; sem conteúdo clínico ou identidade de paciente.';

create or replace function public.claim_onboarding_comunicacao(
  p_usuario_id uuid,
  p_marco text,
  p_processing_token uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_linha public.onboarding_comunicacoes%rowtype;
begin
  insert into public.onboarding_comunicacoes (usuario_id, marco)
  values (p_usuario_id, p_marco)
  on conflict (usuario_id, marco) do nothing;
  select * into v_linha from public.onboarding_comunicacoes
  where usuario_id = p_usuario_id and marco = p_marco for update;
  if v_linha.enviado_em is not null
     or (v_linha.processing_lease_until is not null and v_linha.processing_lease_until > now()) then
    return false;
  end if;
  update public.onboarding_comunicacoes
  set tentativas = tentativas + 1,
      processing_token = p_processing_token,
      processing_lease_until = now() + interval '5 minutes',
      last_error = null,
      updated_at = now()
  where usuario_id = p_usuario_id and marco = p_marco;
  return true;
end;
$$;
revoke all on function public.claim_onboarding_comunicacao(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_onboarding_comunicacao(uuid, text, uuid) to service_role;

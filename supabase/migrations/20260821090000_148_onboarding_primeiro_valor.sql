-- R-105a — progresso global do usuário até a primeira ficha real.
-- Não contém clinica_id porque a missão não deve repetir quando o usuário troca de clínica.
create table if not exists public.onboarding_usuarios (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  etapa text not null default 'intro'
    check (etapa in ('intro','escolha_atendimento','em_atendimento','revisao','concluido','pulado')),
  caminho text check (caminho in ('existente','novo','demonstracao')),
  iniciou_atendimento_em timestamptz,
  usou_campo_magico_em timestamptz,
  primeira_ficha_em timestamptz,
  concluido_em timestamptz,
  pulado_em timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_usuarios enable row level security;

drop policy if exists "onboarding_usuarios_select_own" on public.onboarding_usuarios;
create policy "onboarding_usuarios_select_own"
  on public.onboarding_usuarios for select to authenticated
  using ((select auth.uid()) = usuario_id);

revoke insert, update, delete on public.onboarding_usuarios from authenticated;
grant select on public.onboarding_usuarios to authenticated;

comment on table public.onboarding_usuarios is
  'R-105 — progresso global e não clínico até a primeira ficha real; escrita apenas no servidor.';

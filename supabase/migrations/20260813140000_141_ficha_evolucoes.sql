-- =====================================================================
-- 141 — R-108 Fatia A: ficha vira documento de tratamento
--
-- Spec: plans/specs/R-108-ficha-tratamento.md §4.1
--
-- ADITIVA. Nenhum caminho de escrita muda nesta migration — quem passa a
-- rotear a visita é o R-108b. Aqui só nasce o lugar da evolução por visita
-- e o nome do tratamento.
--
-- Por que a evolução precisa de tabela: `fichas.anotacoes` é UM campo por
-- ficha. Com a ficha durando meses (modelo novo), o texto de cada visita ou
-- sobrescreve o anterior ou vira um blocão sem data e sem autor -- que é o
-- que o CFO não aceita. Uma linha por visita resolve os dois.
--
-- RLS espelha planejamento_secoes (migration 099) linha a linha: leitura
-- clinica (is_clinic_staff), escrita do autor (can_act_as_dentista).
-- =====================================================================

begin;

-- ── 1. O tratamento ganha nome ───────────────────────────────────────
-- Nullable de proposito: as 174 fichas existentes nascem sem nome e a
-- leitura cai no nome derivado (spec §4.3). Backfill de nome NAO entra
-- aqui -- derivar depende de TIPO_LABEL, que vive no TS, nao no banco.
alter table public.fichas add column if not exists nome text;

comment on column public.fichas.nome is
  'R-108 — nome do tratamento. NULL = usa o nome derivado dos eventos
   (spec §4.3, calculado no TS). Renomeavel inline pelo dentista.';

-- ── 2. Evolução por visita ───────────────────────────────────────────
create table public.ficha_evolucoes (
  id          uuid primary key default gen_random_uuid(),
  clinica_id  uuid not null references public.clinicas(id)  on delete cascade,
  ficha_id    uuid not null references public.fichas(id)    on delete cascade,
  dentista_id uuid not null references public.dentistas(id),
  data        date not null,
  texto       text,
  -- true = nascida do sistema (ex.: ficha aberta por procedimento novo achado
  -- em outra sessao), nao ditada pelo dentista. Nunca conta como evolucao
  -- assinavel.
  automatica  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.ficha_evolucoes is
  'R-108 — uma linha por VISITA dentro de uma ficha de tratamento. E a
   evolucao do CFO: data + autor + relato. A ficha e o tratamento; esta
   tabela e a sequencia de atendimentos dele. Ver spec R-108 §4.1.';

create index idx_ficha_evolucoes_ficha on public.ficha_evolucoes (ficha_id, data desc);

alter table public.ficha_evolucoes enable row level security;

create policy ficha_evolucoes_select on public.ficha_evolucoes
  for select
  using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

create policy ficha_evolucoes_write_own on public.ficha_evolucoes
  for all
  using      (belongs_to_active_clinic(clinica_id) and can_act_as_dentista(dentista_id))
  with check (belongs_to_active_clinic(clinica_id) and can_act_as_dentista(dentista_id));

-- ── 3. Backfill — exato, nao aproximado ──────────────────────────────
-- Hoje toda ficha E uma visita: o modelo atual e o caso degenerado do novo.
-- 1 evolucao por ficha existente, sem perda e sem adivinhacao. Nenhuma
-- coluna de `fichas` e tocada (G2).
insert into public.ficha_evolucoes (clinica_id, ficha_id, dentista_id, data, texto, automatica)
select clinica_id, id, dentista_id, data_atendimento, anotacoes, false
from public.fichas;

commit;

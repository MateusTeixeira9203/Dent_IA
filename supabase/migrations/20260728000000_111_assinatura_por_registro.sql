-- R-03a — assinatura por procedimento: modelo + congelamento no banco.
-- spec: plans/specs/R-03a-assinatura-por-procedimento.md (Parte 1 Fases 1-2, Parte 2)
--
-- Tabela GENÉRICA (decisão Mateus 26/07): serve R-03a (clínico, tipo='procedimentos')
-- E R-03c (aceite de orçamento, tipo='orcamento'). Alvo = ficha_id XOR orcamento_id.
-- R-03a só cria/usa o caminho clínico; R-03c depois liga orcamentos.assinatura_id + trigger próprio.
create table public.assinaturas (
  id             uuid primary key default gen_random_uuid(),
  clinica_id     uuid not null references public.clinicas(id) on delete cascade,
  paciente_id    uuid not null references public.pacientes(id) on delete cascade,
  tipo           text not null check (tipo in ('procedimentos','orcamento')),
  ficha_id       uuid references public.fichas(id) on delete cascade,     -- só quando tipo='procedimentos'
  orcamento_id   uuid references public.orcamentos(id) on delete cascade, -- só quando tipo='orcamento' (R-03c)
  dentista_id    uuid not null references public.dentistas(id), -- autor/responsável, nao o coletor
  assinado_por   text not null,
  cro_no_ato     text,
  assinatura_ref text not null,
  assinado_em    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint assinaturas_alvo_unico check (
    (tipo = 'procedimentos' and ficha_id is not null and orcamento_id is null) or
    (tipo = 'orcamento'     and orcamento_id is not null and ficha_id is null)
  )
);

alter table public.odontograma_eventos
  add column assinatura_id uuid references public.assinaturas(id) on delete set null;

create index idx_odontograma_eventos_assinatura on public.odontograma_eventos(assinatura_id)
  where assinatura_id is not null;

alter table public.assinaturas enable row level security;

-- Leitura: nucleo clinico compartilhado (mesmo padrao de odontograma_eventos_select).
create policy "assinaturas_select" on public.assinaturas for select
  using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

-- Escrita: SO pela RPC (security definer) -- sem policy de INSERT/UPDATE/DELETE direta para
-- authenticated, pra ninguem inserir uma "assinatura" fabricada sem passar pela validacao da RPC.

create or replace function public.bloquear_edicao_evento_assinado()
returns trigger language plpgsql as $$
begin
  if old.assinatura_id is not null then
    raise exception 'evento_assinado_imutavel';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_odontograma_evento_imutavel
  before update or delete on public.odontograma_eventos
  for each row execute function public.bloquear_edicao_evento_assinado();

create or replace function public.assinar_procedimentos(
  p_evento_ids      uuid[],
  p_assinado_por    text,
  p_assinatura_ref  text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ficha_id      uuid;
  v_clinica_id    uuid := get_my_clinica_id();
  v_autor_id      uuid;
  v_cro           text;
  v_caller        uuid := get_my_dentista_id();
  v_role          text := get_my_role();
  v_count         int;
  v_assinatura_id uuid;
begin
  select e.ficha_id into v_ficha_id
  from public.odontograma_eventos e where e.id = p_evento_ids[1];

  select count(*) into v_count
  from public.odontograma_eventos e
  where e.id = any(p_evento_ids)
    and e.clinica_id = v_clinica_id
    and e.ficha_id = v_ficha_id
    and e.status = 'realizado'
    and e.assinatura_id is null;

  if v_count <> coalesce(array_length(p_evento_ids, 1), 0) then
    raise exception 'status_invalido';
  end if;

  select f.dentista_id, d.cro into v_autor_id, v_cro
  from public.fichas f join public.dentistas d on d.id = f.dentista_id
  where f.id = v_ficha_id and f.clinica_id = v_clinica_id;

  if v_autor_id is null or (v_autor_id <> v_caller and v_role <> 'secretaria') then
    raise exception 'sem_permissao';
  end if;

  insert into public.assinaturas
    (clinica_id, paciente_id, tipo, ficha_id, dentista_id, assinado_por, cro_no_ato, assinatura_ref)
  select v_clinica_id, e.paciente_id, 'procedimentos', v_ficha_id, v_autor_id, p_assinado_por, v_cro, p_assinatura_ref
  from public.odontograma_eventos e where e.id = p_evento_ids[1]
  returning id into v_assinatura_id;

  update public.odontograma_eventos set assinatura_id = v_assinatura_id
  where id = any(p_evento_ids);

  return v_assinatura_id;
end;
$$;

revoke execute on function public.assinar_procedimentos(uuid[], text, text) from anon, public;
grant  execute on function public.assinar_procedimentos(uuid[], text, text) to authenticated;

-- Ajuste na RPC de save (107): uma linha assinada nunca pode ser apagada (mesmo se saiu do
-- payload por engano) nem re-escrita (resalvar a ficha preserva o registro assinado intacto —
-- sem isso, o trigger acima quebraria o save inteiro na primeira linha assinada do lote).
create or replace function public.salvar_eventos_odontograma(p_ficha_id uuid, p_clinica_id uuid, p_paciente_id uuid, p_eventos jsonb)
 returns void
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_assinado_em timestamptz;
begin
  -- Lock da linha da ficha: mesma serialização da 104 — segunda chamada concorrente
  -- na MESMA ficha só prossegue depois que a primeira commitou.
  select assinado_em into v_assinado_em
  from public.fichas
  where id = p_ficha_id and clinica_id = p_clinica_id and paciente_id = p_paciente_id
  for update;

  if not found then
    raise exception 'ficha_nao_encontrada';
  end if;

  if v_assinado_em is not null then
    raise exception 'ficha_assinada';
  end if;

  -- 1) some só o que saiu do rascunho — por id, nunca por dente/tipo. Nunca apaga um evento
  --    assinado, mesmo se ele saiu do payload por engano (R-03a).
  delete from public.odontograma_eventos
  where ficha_id = p_ficha_id and clinica_id = p_clinica_id
    and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_eventos) e)
    and assinatura_id is null;

  -- 2) upsert por id — o registro mantém a identidade entre saves. Uma linha assinada nunca é
  --    tocada pelo DO UPDATE (R-03a): o WHERE abaixo faz o Postgres pular a linha em silêncio,
  --    sem disparar trg_odontograma_evento_imutavel e sem falhar o resto do lote.
  insert into public.odontograma_eventos (
    id, clinica_id, paciente_id, dentista_id, ficha_id, grupo_id, tipo, status,
    origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, observacao,
    detalhe, realizado_em
  )
  select
    (e->>'id')::uuid,
    (e->>'clinica_id')::uuid,
    (e->>'paciente_id')::uuid,
    (e->>'dentista_id')::uuid,
    (e->>'ficha_id')::uuid,
    nullif(e->>'grupo_id', '')::uuid,
    e->>'tipo',
    e->>'status',
    e->>'origem',
    e->>'nivel',
    nullif(e->>'arcada', ''),
    nullif(e->>'quadrante', '')::smallint,
    nullif(e->>'dente', '')::smallint,
    coalesce((select array_agg(x) from jsonb_array_elements_text(e->'faces') x), '{}'),
    nullif(e->>'papel_no_grupo', ''),
    nullif(e->>'observacao', ''),
    e->'detalhe',
    nullif(e->>'realizado_em', '')::date
  from jsonb_array_elements(p_eventos) e
  on conflict (id) do update set
    grupo_id       = excluded.grupo_id,
    tipo           = excluded.tipo,
    status         = excluded.status,
    origem         = excluded.origem,
    nivel          = excluded.nivel,
    arcada         = excluded.arcada,
    quadrante      = excluded.quadrante,
    dente          = excluded.dente,
    faces          = excluded.faces,
    papel_no_grupo = excluded.papel_no_grupo,
    observacao     = excluded.observacao,
    detalhe        = excluded.detalhe,
    realizado_em   = excluded.realizado_em
  where odontograma_eventos.assinatura_id is null;
end;
$function$;

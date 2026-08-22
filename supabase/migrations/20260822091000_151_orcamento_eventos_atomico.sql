-- R-125b — orçamento nasce com seus itens e eventos de origem numa única transação.
-- Um evento indicado pode pertencer a no máximo um orçamento. Sem links parciais e sem
-- fallback silencioso: qualquer validação recusada faz toda a chamada falhar.

create table if not exists public.orcamento_eventos (
  clinica_id uuid not null references public.clinicas(id),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  evento_id uuid not null references public.odontograma_eventos(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (orcamento_id, evento_id),
  unique (evento_id)
);

create index if not exists orcamento_eventos_clinica_orcamento_idx
  on public.orcamento_eventos(clinica_id, orcamento_id);

alter table public.orcamento_eventos enable row level security;

drop policy if exists orcamento_eventos_select on public.orcamento_eventos;
create policy orcamento_eventos_select on public.orcamento_eventos
  for select to authenticated
  using (
    belongs_to_active_clinic(clinica_id)
    and exists (
      select 1
      from public.orcamentos o
      where o.id = orcamento_eventos.orcamento_id
        and public.can_see_orcamento(o.dentista_id)
    )
  );

create or replace function public.criar_orcamento_com_eventos(
  p_paciente_id uuid,
  p_dentista_id uuid,
  p_ficha_id uuid,
  p_desconto numeric,
  p_itens jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_orcamento_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_evento_ids uuid[] := '{}';
  v_todos_evento_ids uuid[] := '{}';
  v_evento_id uuid;
  v_descricao text;
  v_quantidade integer;
  v_preco_unitario numeric;
  v_procedimento_id uuid;
begin
  if auth.uid() is null or v_clinica_id is null then
    raise exception 'orcamento_sem_contexto';
  end if;

  if not public.can_act_as_dentista(p_dentista_id) then
    raise exception 'orcamento_dentista_invalido';
  end if;

  if not exists (
    select 1 from public.pacientes p
    where p.id = p_paciente_id and p.clinica_id = v_clinica_id
  ) then
    raise exception 'orcamento_paciente_invalido';
  end if;

  if p_ficha_id is not null and not exists (
    select 1 from public.fichas f
    where f.id = p_ficha_id
      and f.clinica_id = v_clinica_id
      and f.paciente_id = p_paciente_id
  ) then
    raise exception 'orcamento_ficha_invalida';
  end if;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'orcamento_itens_invalidos';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_descricao := btrim(coalesce(v_item->>'descricao', ''));
    v_quantidade := nullif(v_item->>'quantidade', '')::integer;
    v_preco_unitario := nullif(v_item->>'preco_unitario', '')::numeric;
    v_procedimento_id := nullif(v_item->>'procedimento_id', '')::uuid;

    if v_descricao = '' or char_length(v_descricao) > 500
      or v_quantidade is null or v_quantidade < 1 or v_quantidade > 99
      or v_preco_unitario is null or v_preco_unitario < 0 then
      raise exception 'orcamento_item_invalido';
    end if;

    if v_procedimento_id is not null and not exists (
      select 1 from public.procedimentos pr
      where pr.id = v_procedimento_id and pr.clinica_id = v_clinica_id
    ) then
      raise exception 'orcamento_procedimento_invalido';
    end if;

    if jsonb_typeof(coalesce(v_item->'evento_ids', '[]'::jsonb)) <> 'array' then
      raise exception 'orcamento_eventos_invalidos';
    end if;

    select coalesce(array_agg(value::text::uuid), '{}')
      into strict v_evento_ids
    from jsonb_array_elements_text(coalesce(v_item->'evento_ids', '[]'::jsonb));

    if cardinality(v_evento_ids) <> cardinality(array(select distinct unnest(v_evento_ids))) then
      raise exception 'orcamento_evento_duplicado';
    end if;

    v_todos_evento_ids := v_todos_evento_ids || v_evento_ids;
    v_subtotal := v_subtotal + (v_quantidade * v_preco_unitario);
  end loop;

  if cardinality(v_todos_evento_ids) <> cardinality(array(select distinct unnest(v_todos_evento_ids))) then
    raise exception 'orcamento_evento_duplicado';
  end if;

  if p_desconto is null or p_desconto < 0 then
    raise exception 'orcamento_desconto_invalido';
  end if;

  v_total := greatest(0, v_subtotal - p_desconto);

  -- Valida todos os eventos antes de criar qualquer registro. A exclusividade tambem e
  -- protegida pela unique(evento_id), que fecha a corrida entre dois cliques concorrentes.
  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    for v_evento_id in
      select value::text::uuid
      from jsonb_array_elements_text(coalesce(v_item->'evento_ids', '[]'::jsonb))
    loop
      if not exists (
        select 1
        from public.odontograma_eventos e
        join public.fichas f on f.id = e.ficha_id
        where e.id = v_evento_id
          and e.clinica_id = v_clinica_id
          and f.paciente_id = p_paciente_id
          and e.status = 'indicado'
          and e.assinatura_id is null
          and coalesce(e.encaminhado_para, f.dentista_id) = p_dentista_id
      ) then
        raise exception 'orcamento_evento_invalido';
      end if;

      if exists (select 1 from public.orcamento_eventos oe where oe.evento_id = v_evento_id) then
        raise exception 'orcamento_evento_ja_orcado';
      end if;
    end loop;
  end loop;

  insert into public.orcamentos (
    clinica_id, dentista_id, paciente_id, ficha_id, status, total, desconto,
    validade_dias, mostrar_valor_por_item
  ) values (
    v_clinica_id, p_dentista_id, p_paciente_id, p_ficha_id, 'rascunho', v_total,
    p_desconto, 30, false
  ) returning id into v_orcamento_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_descricao := btrim(v_item->>'descricao');
    v_quantidade := (v_item->>'quantidade')::integer;
    v_preco_unitario := (v_item->>'preco_unitario')::numeric;
    v_procedimento_id := nullif(v_item->>'procedimento_id', '')::uuid;

    insert into public.orcamento_itens (
      orcamento_id, clinica_id, descricao, procedimento_id, quantidade,
      preco_unitario, preco_total
    ) values (
      v_orcamento_id, v_clinica_id, v_descricao, v_procedimento_id, v_quantidade,
      v_preco_unitario, v_quantidade * v_preco_unitario
    );

    for v_evento_id in
      select value::text::uuid
      from jsonb_array_elements_text(coalesce(v_item->'evento_ids', '[]'::jsonb))
    loop
      insert into public.orcamento_eventos (clinica_id, orcamento_id, evento_id)
      values (v_clinica_id, v_orcamento_id, v_evento_id);
    end loop;
  end loop;

  return v_orcamento_id;
end;
$$;

revoke all on function public.criar_orcamento_com_eventos(uuid, uuid, uuid, numeric, jsonb) from public, anon;
grant execute on function public.criar_orcamento_com_eventos(uuid, uuid, uuid, numeric, jsonb) to authenticated;

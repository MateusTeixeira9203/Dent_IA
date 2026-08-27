-- R-135 — acrescenta procedimentos novos da mesma ficha a um orçamento existente.
-- A proposta já emitida é preservada: esta RPC só insere itens/vínculos novos e soma o total.
-- Não toca em valor_acordado, desconto, aceite, pagamentos nem parcelas.

create or replace function public.adicionar_itens_orcamento_com_eventos(
  p_orcamento_id uuid,
  p_itens jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_orcamento public.orcamentos%rowtype;
  v_item jsonb;
  v_evento_id uuid;
  v_evento_ids uuid[] := '{}';
  v_todos_evento_ids uuid[] := '{}';
  v_descricao text;
  v_quantidade integer;
  v_preco_unitario numeric;
  v_procedimento_id uuid;
  v_total_adicionado numeric := 0;
begin
  if auth.uid() is null or v_clinica_id is null then
    raise exception 'orcamento_sem_contexto';
  end if;

  select * into v_orcamento
  from public.orcamentos o
  where o.id = p_orcamento_id
    and o.clinica_id = v_clinica_id;

  if not found then
    raise exception 'orcamento_nao_encontrado';
  end if;

  if not public.can_act_as_dentista(v_orcamento.dentista_id) then
    raise exception 'orcamento_sem_permissao';
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
    v_total_adicionado := v_total_adicionado + (v_quantidade * v_preco_unitario);
  end loop;

  if cardinality(v_todos_evento_ids) <> cardinality(array(select distinct unnest(v_todos_evento_ids))) then
    raise exception 'orcamento_evento_duplicado';
  end if;

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
          and f.paciente_id = v_orcamento.paciente_id
          and e.origem = 'clinica'
          and coalesce(e.encaminhado_para, f.dentista_id) = v_orcamento.dentista_id
      ) then
        raise exception 'orcamento_evento_invalido';
      end if;

      if exists (
        select 1 from public.orcamento_eventos oe where oe.evento_id = v_evento_id
      ) then
        raise exception 'orcamento_evento_ja_orcado';
      end if;
    end loop;
  end loop;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_descricao := btrim(v_item->>'descricao');
    v_quantidade := (v_item->>'quantidade')::integer;
    v_preco_unitario := (v_item->>'preco_unitario')::numeric;
    v_procedimento_id := nullif(v_item->>'procedimento_id', '')::uuid;

    insert into public.orcamento_itens (
      orcamento_id, clinica_id, descricao, procedimento_id, quantidade,
      preco_unitario, preco_total, aprovado
    ) values (
      v_orcamento.id, v_clinica_id, v_descricao, v_procedimento_id, v_quantidade,
      v_preco_unitario, v_quantidade * v_preco_unitario, false
    );

    for v_evento_id in
      select value::text::uuid
      from jsonb_array_elements_text(coalesce(v_item->'evento_ids', '[]'::jsonb))
    loop
      insert into public.orcamento_eventos (clinica_id, orcamento_id, evento_id)
      values (v_clinica_id, v_orcamento.id, v_evento_id);
    end loop;
  end loop;

  update public.orcamentos
  set total = coalesce(total, 0) + v_total_adicionado
  where id = v_orcamento.id
    and clinica_id = v_clinica_id;

  return v_total_adicionado;
end;
$$;

revoke all on function public.adicionar_itens_orcamento_com_eventos(uuid, jsonb) from public, anon;
grant execute on function public.adicionar_itens_orcamento_com_eventos(uuid, jsonb) to authenticated;

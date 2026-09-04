-- R-145 — acordo financeiro flexível.
--
-- `pagamentos` permanece a integração comum de orçamento e Financeiro. A diferença é
-- semântica: pendente = previsão; pago = dinheiro confirmado; cancelado = histórico
-- preservado. Todas as escritas abaixo travam o orçamento, evitando que duas telas
-- registrem mais dinheiro que o valor combinado ao mesmo tempo.

drop index if exists public.uq_pagamentos_orcamento_parcela;
create unique index uq_pagamentos_orcamento_parcela_pendente
  on public.pagamentos (orcamento_id, parcela_numero)
  where parcela_numero is not null and status = 'pendente';

create or replace function public.registrar_recebimento_orcamento(
  p_orcamento_id uuid,
  p_valor numeric,
  p_forma text,
  p_data date
) returns public.pagamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_orc public.orcamentos%rowtype;
  v_valor_aprovado numeric := 0;
  v_valor_devido numeric := 0;
  v_valor_pago numeric := 0;
  v_pagamento public.pagamentos%rowtype;
begin
  if p_valor is null or p_valor <= 0 or round(p_valor * 100) <> p_valor * 100 then
    raise exception 'valor_invalido';
  end if;
  if p_data is null then raise exception 'data_invalida'; end if;
  if p_forma is null or p_forma not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro') then
    raise exception 'forma_invalida';
  end if;

  select o.* into v_orc
    from public.orcamentos o
   where o.id = p_orcamento_id and o.clinica_id = v_clinica_id
   for update;

  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;

  select coalesce(sum(oi.preco_total) filter (where oi.aprovado), 0)
    into v_valor_aprovado
    from public.orcamento_itens oi
   where oi.orcamento_id = v_orc.id and oi.clinica_id = v_clinica_id;
  if v_valor_aprovado <= 0 then raise exception 'orcamento_sem_aprovacao'; end if;

  v_valor_devido := coalesce(v_orc.valor_acordado, v_valor_aprovado);
  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_valor_pago
    from public.pagamentos p
   where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id;
  if round((v_valor_pago + p_valor) * 100) > round(v_valor_devido * 100) then
    raise exception 'valor_acima_do_saldo';
  end if;

  insert into public.pagamentos (
    clinica_id, orcamento_id, paciente_id, dentista_id, valor, status,
    forma_pagamento, data_pagamento, marcado_por_id
  ) values (
    v_clinica_id, v_orc.id, v_orc.paciente_id, v_orc.dentista_id, p_valor, 'pago',
    p_forma, p_data, v_actor_id
  ) returning * into v_pagamento;

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.registrado', jsonb_build_object('valor', p_valor, 'forma', p_forma, 'orcamento_id', v_orc.id)
  );

  return v_pagamento;
end;
$$;

create or replace function public.confirmar_previsao_orcamento(
  p_pagamento_id uuid,
  p_forma text,
  p_data date
) returns public.pagamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_pagamento public.pagamentos%rowtype;
  v_orc public.orcamentos%rowtype;
  v_valor_aprovado numeric := 0;
  v_valor_devido numeric := 0;
  v_valor_pago numeric := 0;
begin
  if p_data is null then raise exception 'data_invalida'; end if;
  if p_forma is null or p_forma not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro') then
    raise exception 'forma_invalida';
  end if;

  select p.* into v_pagamento
    from public.pagamentos p
   where p.id = p_pagamento_id and p.clinica_id = v_clinica_id;
  if v_pagamento.id is null or v_pagamento.status <> 'pendente' then
    raise exception 'previsao_indisponivel';
  end if;

  select o.* into v_orc
    from public.orcamentos o
   where o.id = v_pagamento.orcamento_id and o.clinica_id = v_clinica_id
   for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;

  select coalesce(sum(oi.preco_total) filter (where oi.aprovado), 0)
    into v_valor_aprovado
    from public.orcamento_itens oi
   where oi.orcamento_id = v_orc.id and oi.clinica_id = v_clinica_id;
  if v_valor_aprovado <= 0 then raise exception 'orcamento_sem_aprovacao'; end if;
  v_valor_devido := coalesce(v_orc.valor_acordado, v_valor_aprovado);
  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_valor_pago
    from public.pagamentos p
   where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id;
  if round((v_valor_pago + v_pagamento.valor) * 100) > round(v_valor_devido * 100) then
    raise exception 'valor_acima_do_saldo';
  end if;

  update public.pagamentos
     set status = 'pago', forma_pagamento = p_forma, data_pagamento = p_data, marcado_por_id = v_actor_id
   where id = v_pagamento.id and clinica_id = v_clinica_id
   returning * into v_pagamento;

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.registrado', jsonb_build_object('valor', v_pagamento.valor, 'forma', p_forma, 'orcamento_id', v_orc.id, 'origem', 'previsao')
  );

  return v_pagamento;
end;
$$;

create or replace function public.corrigir_recebimento_orcamento(
  p_pagamento_id uuid,
  p_valor numeric,
  p_forma text,
  p_data date
) returns public.pagamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_pagamento public.pagamentos%rowtype;
  v_antes jsonb;
  v_orc public.orcamentos%rowtype;
  v_valor_aprovado numeric := 0;
  v_valor_devido numeric := 0;
  v_valor_pago numeric := 0;
begin
  if p_valor is null or p_valor <= 0 or round(p_valor * 100) <> p_valor * 100 then
    raise exception 'valor_invalido';
  end if;
  if p_data is null then raise exception 'data_invalida'; end if;
  if p_forma is null or p_forma not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro') then
    raise exception 'forma_invalida';
  end if;

  select p.* into v_pagamento
    from public.pagamentos p
   where p.id = p_pagamento_id and p.clinica_id = v_clinica_id;
  if v_pagamento.id is null or v_pagamento.status <> 'pago' then
    raise exception 'recebimento_indisponivel';
  end if;
  v_antes := jsonb_build_object('valor', v_pagamento.valor, 'forma', v_pagamento.forma_pagamento, 'data', v_pagamento.data_pagamento);

  select o.* into v_orc
    from public.orcamentos o
   where o.id = v_pagamento.orcamento_id and o.clinica_id = v_clinica_id
   for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;
  select coalesce(sum(oi.preco_total) filter (where oi.aprovado), 0)
    into v_valor_aprovado
    from public.orcamento_itens oi
   where oi.orcamento_id = v_orc.id and oi.clinica_id = v_clinica_id;
  if v_valor_aprovado <= 0 then raise exception 'orcamento_sem_aprovacao'; end if;
  v_valor_devido := coalesce(v_orc.valor_acordado, v_valor_aprovado);
  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_valor_pago
    from public.pagamentos p
   where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id;
  if round((v_valor_pago - v_pagamento.valor + p_valor) * 100) > round(v_valor_devido * 100) then
    raise exception 'valor_acima_do_saldo';
  end if;

  update public.pagamentos
     set valor = p_valor, forma_pagamento = p_forma, data_pagamento = p_data, marcado_por_id = v_actor_id
   where id = v_pagamento.id and clinica_id = v_clinica_id
   returning * into v_pagamento;

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.editado', jsonb_build_object('antes', v_antes, 'depois', jsonb_build_object('valor', p_valor, 'forma', p_forma, 'data', p_data))
  );
  return v_pagamento;
end;
$$;

create or replace function public.estornar_recebimento_orcamento(
  p_pagamento_id uuid,
  p_motivo text
) returns public.pagamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_pagamento public.pagamentos%rowtype;
  v_orc public.orcamentos%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if v_motivo = '' or length(v_motivo) > 500 then raise exception 'motivo_invalido'; end if;
  select p.* into v_pagamento
    from public.pagamentos p
   where p.id = p_pagamento_id and p.clinica_id = v_clinica_id;
  if v_pagamento.id is null or v_pagamento.status <> 'pago' then
    raise exception 'recebimento_indisponivel';
  end if;
  select o.* into v_orc
    from public.orcamentos o
   where o.id = v_pagamento.orcamento_id and o.clinica_id = v_clinica_id
   for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;

  update public.pagamentos
     set status = 'cancelado', observacoes = concat_ws(E'\n', observacoes, 'Estorno: ' || v_motivo), marcado_por_id = v_actor_id
   where id = v_pagamento.id and clinica_id = v_clinica_id
   returning * into v_pagamento;

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.estornado', jsonb_build_object('valor', v_pagamento.valor, 'motivo', v_motivo, 'orcamento_id', v_orc.id)
  );
  return v_pagamento;
end;
$$;

create or replace function public.reorganizar_parcelas_orcamento(
  p_orcamento_id uuid,
  p_valor_acordado numeric,
  p_parcelas jsonb
) returns setof public.pagamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_orc public.orcamentos%rowtype;
  v_valor_aprovado numeric := 0;
  v_valor_pago numeric := 0;
  v_saldo numeric := 0;
  v_soma numeric := 0;
  v_quantidade integer := 0;
  v_indice integer := 0;
  v_item jsonb;
  v_valor numeric;
  v_data date;
begin
  if p_valor_acordado is null or p_valor_acordado <= 0 or round(p_valor_acordado * 100) <> p_valor_acordado * 100 then
    raise exception 'valor_invalido';
  end if;
  if jsonb_typeof(p_parcelas) <> 'array' then raise exception 'parcelas_invalidas'; end if;
  v_quantidade := jsonb_array_length(p_parcelas);
  if v_quantidade > 24 then raise exception 'numero_parcelas_invalido'; end if;

  select o.* into v_orc
    from public.orcamentos o
   where o.id = p_orcamento_id and o.clinica_id = v_clinica_id
   for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;
  select coalesce(sum(oi.preco_total) filter (where oi.aprovado), 0)
    into v_valor_aprovado
    from public.orcamento_itens oi
   where oi.orcamento_id = v_orc.id and oi.clinica_id = v_clinica_id;
  if v_valor_aprovado <= 0 then raise exception 'orcamento_sem_aprovacao'; end if;
  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_valor_pago
    from public.pagamentos p
   where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id;
  if round(p_valor_acordado * 100) < round(v_valor_pago * 100) then raise exception 'valor_menor_que_recebido'; end if;
  v_saldo := p_valor_acordado - v_valor_pago;

  for v_item in select value from jsonb_array_elements(p_parcelas) loop
    begin
      v_valor := (v_item ->> 'valor')::numeric;
      v_data := (v_item ->> 'data_vencimento')::date;
    exception when others then
      raise exception 'parcelas_invalidas';
    end;
    if v_valor is null or v_valor <= 0 or round(v_valor * 100) <> v_valor * 100 or v_data is null then
      raise exception 'parcelas_invalidas';
    end if;
    v_soma := v_soma + v_valor;
  end loop;
  if v_quantidade > 0 and round(v_soma * 100) <> round(v_saldo * 100) then
    raise exception 'parcelas_nao_fecham_saldo';
  end if;

  update public.pagamentos
     set status = 'cancelado', observacoes = concat_ws(E'\n', observacoes, 'Previsão substituída em ' || to_char(now(), 'YYYY-MM-DD HH24:MI'))
   where orcamento_id = v_orc.id and clinica_id = v_clinica_id and status = 'pendente';

  update public.orcamentos
     set valor_acordado = p_valor_acordado,
         plano_forma = case when v_quantidade = 0 then 'avista' else 'parcelado' end,
         plano_parcelas = case when v_quantidade = 0 then null else v_quantidade end,
         plano_entrada_valor = null,
         plano_entrada_forma = null,
         plano_parcelas_forma = null,
         plano_definido_em = now(),
         plano_definido_por_id = v_actor_id
   where id = v_orc.id and clinica_id = v_clinica_id;

  v_indice := 0;
  for v_item in select value from jsonb_array_elements(p_parcelas) loop
    v_indice := v_indice + 1;
    v_valor := (v_item ->> 'valor')::numeric;
    v_data := (v_item ->> 'data_vencimento')::date;
    insert into public.pagamentos (
      clinica_id, orcamento_id, paciente_id, dentista_id, valor, status,
      data_vencimento, parcela_numero, total_parcelas
    ) values (
      v_clinica_id, v_orc.id, v_orc.paciente_id, v_orc.dentista_id, v_valor, 'pendente',
      v_data, v_indice, v_quantidade
    );
  end loop;

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.previsao_reorganizada', jsonb_build_object('valor_acordado', p_valor_acordado, 'parcelas', p_parcelas)
  );

  return query
    select p.* from public.pagamentos p
     where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id and p.status = 'pendente'
     order by p.parcela_numero;
end;
$$;

revoke all on function public.registrar_recebimento_orcamento(uuid, numeric, text, date) from public, anon;
revoke all on function public.confirmar_previsao_orcamento(uuid, text, date) from public, anon;
revoke all on function public.corrigir_recebimento_orcamento(uuid, numeric, text, date) from public, anon;
revoke all on function public.estornar_recebimento_orcamento(uuid, text) from public, anon;
revoke all on function public.reorganizar_parcelas_orcamento(uuid, numeric, jsonb) from public, anon;
grant execute on function public.registrar_recebimento_orcamento(uuid, numeric, text, date) to authenticated;
grant execute on function public.confirmar_previsao_orcamento(uuid, text, date) to authenticated;
grant execute on function public.corrigir_recebimento_orcamento(uuid, numeric, text, date) to authenticated;
grant execute on function public.estornar_recebimento_orcamento(uuid, text) to authenticated;
grant execute on function public.reorganizar_parcelas_orcamento(uuid, numeric, jsonb) to authenticated;

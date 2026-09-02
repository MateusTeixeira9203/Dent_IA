-- R-145 revisão 2 — cobrança por etapa.
--
-- Expansão aditiva: orçamentos e pagamentos anteriores continuam operando sem `cobranca_id`.
-- Uma etapa só nasce quando o dentista a cria explicitamente; proposta clínica não vira dívida.

create table if not exists public.orcamento_cobrancas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  dentista_id uuid not null references public.dentistas(id) on delete cascade,
  subtotal numeric(10,2) not null check (subtotal > 0),
  desconto numeric(10,2) not null default 0 check (desconto >= 0 and desconto <= subtotal),
  valor_final numeric(10,2) not null check (valor_final >= 0 and valor_final = subtotal - desconto),
  situacao text not null default 'aberta' check (situacao in ('aberta', 'cancelada')),
  cancelado_em timestamptz,
  cancelado_por_id uuid references public.dentistas(id) on delete set null,
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (situacao = 'aberta' and cancelado_em is null and cancelado_por_id is null and motivo_cancelamento is null)
    or (situacao = 'cancelada' and cancelado_em is not null and cancelado_por_id is not null and motivo_cancelamento is not null)
  )
);

create index if not exists orcamento_cobrancas_clinica_orcamento_idx
  on public.orcamento_cobrancas(clinica_id, orcamento_id, created_at desc);
create index if not exists orcamento_cobrancas_clinica_paciente_idx
  on public.orcamento_cobrancas(clinica_id, paciente_id, situacao);

create table if not exists public.orcamento_cobranca_itens (
  cobranca_id uuid not null references public.orcamento_cobrancas(id) on delete cascade,
  orcamento_item_id uuid not null references public.orcamento_itens(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  preco_total_snapshot numeric(10,2) not null check (preco_total_snapshot >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (cobranca_id, orcamento_item_id)
);

create unique index if not exists orcamento_cobranca_item_ativo_unico
  on public.orcamento_cobranca_itens(orcamento_item_id)
  where ativo;
create index if not exists orcamento_cobranca_itens_clinica_cobranca_idx
  on public.orcamento_cobranca_itens(clinica_id, cobranca_id);

alter table public.pagamentos
  add column if not exists cobranca_id uuid references public.orcamento_cobrancas(id) on delete set null;
create index if not exists pagamentos_clinica_cobranca_idx
  on public.pagamentos(clinica_id, cobranca_id, status)
  where cobranca_id is not null;

alter table public.orcamento_cobrancas enable row level security;
alter table public.orcamento_cobranca_itens enable row level security;

drop policy if exists orcamento_cobrancas_select on public.orcamento_cobrancas;
create policy orcamento_cobrancas_select on public.orcamento_cobrancas
  for select to authenticated
  using (
    public.belongs_to_active_clinic(clinica_id)
    and public.can_see_orcamento(dentista_id)
  );

drop policy if exists orcamento_cobranca_itens_select on public.orcamento_cobranca_itens;
create policy orcamento_cobranca_itens_select on public.orcamento_cobranca_itens
  for select to authenticated
  using (
    public.belongs_to_active_clinic(clinica_id)
    and exists (
      select 1 from public.orcamento_cobrancas c
      where c.id = orcamento_cobranca_itens.cobranca_id
        and public.can_see_orcamento(c.dentista_id)
    )
  );

-- Mantém uma única previsão pendente igual ao saldo da etapa. As linhas pagas/canceladas nunca
-- são reescritas; a previsão substituída vira histórico cancelado.
create or replace function public.recompor_previsao_cobranca(
  p_cobranca_id uuid,
  p_clinica_id uuid,
  p_actor_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cobranca public.orcamento_cobrancas%rowtype;
  v_pago numeric := 0;
  v_saldo numeric := 0;
begin
  select c.* into v_cobranca
    from public.orcamento_cobrancas c
   where c.id = p_cobranca_id and c.clinica_id = p_clinica_id
   for update;
  if v_cobranca.id is null then raise exception 'cobranca_invalida'; end if;

  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_pago
    from public.pagamentos p
   where p.cobranca_id = v_cobranca.id and p.clinica_id = p_clinica_id;
  v_saldo := greatest(0, round((v_cobranca.valor_final - v_pago) * 100) / 100);

  update public.pagamentos
     set status = 'cancelado',
         observacoes = concat_ws(E'\n', observacoes, 'Previsão da etapa substituída em ' || to_char(now(), 'YYYY-MM-DD HH24:MI')),
         marcado_por_id = p_actor_id
   where cobranca_id = v_cobranca.id
     and clinica_id = p_clinica_id
     and status = 'pendente';

  if v_cobranca.situacao = 'aberta' and v_saldo > 0 then
    insert into public.pagamentos (
      clinica_id, orcamento_id, cobranca_id, paciente_id, dentista_id, valor, status, data_vencimento
    ) values (
      p_clinica_id, v_cobranca.orcamento_id, v_cobranca.id, v_cobranca.paciente_id,
      v_cobranca.dentista_id, v_saldo, 'pendente',
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;
end;
$$;

create or replace function public.criar_cobranca_orcamento(
  p_orcamento_id uuid,
  p_item_ids uuid[],
  p_desconto numeric default 0
) returns public.orcamento_cobrancas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_orc public.orcamentos%rowtype;
  v_cobranca public.orcamento_cobrancas%rowtype;
  v_subtotal numeric := 0;
  v_valor_final numeric := 0;
  v_item public.orcamento_itens%rowtype;
  v_item_id uuid;
begin
  if v_clinica_id is null or v_actor_id is null then raise exception 'sem_permissao'; end if;
  if p_item_ids is null or cardinality(p_item_ids) is null or cardinality(p_item_ids) = 0
     or cardinality(p_item_ids) <> cardinality(array(select distinct unnest(p_item_ids))) then
    raise exception 'itens_invalidos';
  end if;
  if p_desconto is null or p_desconto < 0 or round(p_desconto * 100) <> p_desconto * 100 then
    raise exception 'desconto_invalido';
  end if;

  select o.* into v_orc
    from public.orcamentos o
   where o.id = p_orcamento_id and o.clinica_id = v_clinica_id
   for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;

  foreach v_item_id in array p_item_ids loop
    select oi.* into v_item
      from public.orcamento_itens oi
     where oi.id = v_item_id
       and oi.orcamento_id = v_orc.id
       and oi.clinica_id = v_clinica_id
     for update;
    if v_item.id is null or not v_item.aprovado then raise exception 'item_nao_aprovado'; end if;
    if exists (
      select 1
      from public.orcamento_cobranca_itens ci
      join public.orcamento_cobrancas c on c.id = ci.cobranca_id
      where ci.orcamento_item_id = v_item.id
        and ci.ativo
        and c.situacao = 'aberta'
    ) then
      raise exception 'item_ja_cobrado';
    end if;
    v_subtotal := v_subtotal + coalesce(v_item.preco_total, 0);
  end loop;
  if v_subtotal <= 0 then raise exception 'subtotal_invalido'; end if;
  if p_desconto > v_subtotal then raise exception 'desconto_acima_subtotal'; end if;
  v_valor_final := v_subtotal - p_desconto;

  insert into public.orcamento_cobrancas (
    clinica_id, orcamento_id, paciente_id, dentista_id, subtotal, desconto, valor_final
  ) values (
    v_clinica_id, v_orc.id, v_orc.paciente_id, v_orc.dentista_id, v_subtotal, p_desconto, v_valor_final
  ) returning * into v_cobranca;

  foreach v_item_id in array p_item_ids loop
    select oi.* into v_item from public.orcamento_itens oi where oi.id = v_item_id;
    insert into public.orcamento_cobranca_itens (
      cobranca_id, orcamento_item_id, clinica_id, preco_total_snapshot
    ) values (
      v_cobranca.id, v_item.id, v_clinica_id, coalesce(v_item.preco_total, 0)
    );
  end loop;

  perform public.recompor_previsao_cobranca(v_cobranca.id, v_clinica_id, v_actor_id);
  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'cobranca.etapa_criada', jsonb_build_object(
      'cobranca_id', v_cobranca.id, 'item_ids', p_item_ids, 'subtotal', v_subtotal,
      'desconto', p_desconto, 'valor_final', v_valor_final
    )
  );
  return v_cobranca;
end;
$$;

create or replace function public.registrar_recebimento_cobranca(
  p_cobranca_id uuid,
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
  v_cobranca public.orcamento_cobrancas%rowtype;
  v_pago numeric := 0;
  v_pagamento public.pagamentos%rowtype;
begin
  if p_valor is null or p_valor <= 0 or round(p_valor * 100) <> p_valor * 100 then raise exception 'valor_invalido'; end if;
  if p_data is null then raise exception 'data_invalida'; end if;
  if p_forma is null or p_forma not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro') then raise exception 'forma_invalida'; end if;

  select c.* into v_cobranca
    from public.orcamento_cobrancas c
   where c.id = p_cobranca_id and c.clinica_id = v_clinica_id
   for update;
  if v_cobranca.id is null or v_cobranca.situacao <> 'aberta'
     or not public.can_act_as_dentista(v_cobranca.dentista_id) then raise exception 'cobranca_indisponivel'; end if;
  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_pago from public.pagamentos p
   where p.cobranca_id = v_cobranca.id and p.clinica_id = v_clinica_id;
  if round((v_pago + p_valor) * 100) > round(v_cobranca.valor_final * 100) then raise exception 'valor_acima_do_saldo'; end if;

  insert into public.pagamentos (
    clinica_id, orcamento_id, cobranca_id, paciente_id, dentista_id, valor, status,
    forma_pagamento, data_pagamento, marcado_por_id
  ) values (
    v_clinica_id, v_cobranca.orcamento_id, v_cobranca.id, v_cobranca.paciente_id,
    v_cobranca.dentista_id, p_valor, 'pago', p_forma, p_data, v_actor_id
  ) returning * into v_pagamento;
  perform public.recompor_previsao_cobranca(v_cobranca.id, v_clinica_id, v_actor_id);

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_cobranca.paciente_id, 'orcamento', v_cobranca.orcamento_id::text,
    'pagamento.registrado', jsonb_build_object('cobranca_id', v_cobranca.id, 'valor', p_valor, 'forma', p_forma)
  );
  return v_pagamento;
end;
$$;

create or replace function public.cancelar_cobranca_orcamento(
  p_cobranca_id uuid,
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_cobranca public.orcamento_cobrancas%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if v_motivo = '' or length(v_motivo) > 500 then raise exception 'motivo_invalido'; end if;
  select c.* into v_cobranca from public.orcamento_cobrancas c
   where c.id = p_cobranca_id and c.clinica_id = v_clinica_id for update;
  if v_cobranca.id is null or v_cobranca.situacao <> 'aberta'
     or not public.can_act_as_dentista(v_cobranca.dentista_id) then raise exception 'cobranca_indisponivel'; end if;
  if exists (
    select 1 from public.pagamentos p
     where p.cobranca_id = v_cobranca.id and p.clinica_id = v_clinica_id and p.status = 'pago'
  ) then raise exception 'cobranca_com_recebimento'; end if;

  update public.orcamento_cobrancas
     set situacao = 'cancelada', cancelado_em = now(), cancelado_por_id = v_actor_id,
         motivo_cancelamento = v_motivo, updated_at = now()
   where id = v_cobranca.id and clinica_id = v_clinica_id;
  update public.orcamento_cobranca_itens set ativo = false
   where cobranca_id = v_cobranca.id and clinica_id = v_clinica_id;
  perform public.recompor_previsao_cobranca(v_cobranca.id, v_clinica_id, v_actor_id);

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_cobranca.paciente_id, 'orcamento', v_cobranca.orcamento_id::text,
    'cobranca.etapa_cancelada', jsonb_build_object('cobranca_id', v_cobranca.id, 'motivo', v_motivo)
  );
end;
$$;

-- Pagamentos de etapa não podem usar o teto do orçamento inteiro. As duas RPCs legadas mantêm
-- o mesmo contrato, mas quando `cobranca_id` existe passam a validar e recompor somente a etapa.
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
  v_orc public.orcamentos%rowtype;
  v_cobranca public.orcamento_cobrancas%rowtype;
  v_antes jsonb;
  v_valor_aprovado numeric := 0;
  v_valor_devido numeric := 0;
  v_valor_pago numeric := 0;
begin
  if p_valor is null or p_valor <= 0 or round(p_valor * 100) <> p_valor * 100 then raise exception 'valor_invalido'; end if;
  if p_data is null then raise exception 'data_invalida'; end if;
  if p_forma is null or p_forma not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro') then raise exception 'forma_invalida'; end if;
  select p.* into v_pagamento from public.pagamentos p
   where p.id = p_pagamento_id and p.clinica_id = v_clinica_id;
  if v_pagamento.id is null or v_pagamento.status <> 'pago' then raise exception 'recebimento_indisponivel'; end if;
  v_antes := jsonb_build_object('valor', v_pagamento.valor, 'forma', v_pagamento.forma_pagamento, 'data', v_pagamento.data_pagamento);

  if v_pagamento.cobranca_id is not null then
    select c.* into v_cobranca from public.orcamento_cobrancas c
     where c.id = v_pagamento.cobranca_id and c.clinica_id = v_clinica_id for update;
    if v_cobranca.id is null or v_cobranca.situacao <> 'aberta'
       or not public.can_act_as_dentista(v_cobranca.dentista_id) then raise exception 'cobranca_indisponivel'; end if;
    select coalesce(sum(p.valor) filter (where p.status = 'pago' and p.id <> v_pagamento.id), 0)
      into v_valor_pago from public.pagamentos p
     where p.cobranca_id = v_cobranca.id and p.clinica_id = v_clinica_id;
    if round((v_valor_pago + p_valor) * 100) > round(v_cobranca.valor_final * 100) then raise exception 'valor_acima_do_saldo'; end if;
    update public.pagamentos set valor = p_valor, forma_pagamento = p_forma, data_pagamento = p_data, marcado_por_id = v_actor_id
     where id = v_pagamento.id and clinica_id = v_clinica_id returning * into v_pagamento;
    perform public.recompor_previsao_cobranca(v_cobranca.id, v_clinica_id, v_actor_id);
    select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
    insert into public.activity_logs (clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata)
    values (v_clinica_id, v_actor_id, v_actor_nome, v_cobranca.paciente_id, 'orcamento', v_cobranca.orcamento_id::text,
      'pagamento.editado', jsonb_build_object('cobranca_id', v_cobranca.id, 'antes', v_antes, 'depois', jsonb_build_object('valor', p_valor, 'forma', p_forma, 'data', p_data)));
    return v_pagamento;
  end if;

  select o.* into v_orc from public.orcamentos o
   where o.id = v_pagamento.orcamento_id and o.clinica_id = v_clinica_id for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then raise exception 'sem_permissao'; end if;
  select coalesce(sum(oi.preco_total) filter (where oi.aprovado), 0) into v_valor_aprovado
   from public.orcamento_itens oi where oi.orcamento_id = v_orc.id and oi.clinica_id = v_clinica_id;
  if v_valor_aprovado <= 0 then raise exception 'orcamento_sem_aprovacao'; end if;
  v_valor_devido := coalesce(v_orc.valor_acordado, v_valor_aprovado);
  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0) into v_valor_pago
   from public.pagamentos p where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id;
  if round((v_valor_pago - v_pagamento.valor + p_valor) * 100) > round(v_valor_devido * 100) then raise exception 'valor_acima_do_saldo'; end if;
  update public.pagamentos set valor = p_valor, forma_pagamento = p_forma, data_pagamento = p_data, marcado_por_id = v_actor_id
   where id = v_pagamento.id and clinica_id = v_clinica_id returning * into v_pagamento;
  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata)
  values (v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.editado', jsonb_build_object('antes', v_antes, 'depois', jsonb_build_object('valor', p_valor, 'forma', p_forma, 'data', p_data)));
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
  v_cobranca public.orcamento_cobrancas%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if v_motivo = '' or length(v_motivo) > 500 then raise exception 'motivo_invalido'; end if;
  select p.* into v_pagamento from public.pagamentos p
   where p.id = p_pagamento_id and p.clinica_id = v_clinica_id;
  if v_pagamento.id is null or v_pagamento.status <> 'pago' then raise exception 'recebimento_indisponivel'; end if;

  if v_pagamento.cobranca_id is not null then
    select c.* into v_cobranca from public.orcamento_cobrancas c
     where c.id = v_pagamento.cobranca_id and c.clinica_id = v_clinica_id for update;
    if v_cobranca.id is null or v_cobranca.situacao <> 'aberta'
       or not public.can_act_as_dentista(v_cobranca.dentista_id) then raise exception 'cobranca_indisponivel'; end if;
    update public.pagamentos set status = 'cancelado', observacoes = concat_ws(E'\n', observacoes, 'Estorno: ' || v_motivo), marcado_por_id = v_actor_id
     where id = v_pagamento.id and clinica_id = v_clinica_id returning * into v_pagamento;
    perform public.recompor_previsao_cobranca(v_cobranca.id, v_clinica_id, v_actor_id);
    select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
    insert into public.activity_logs (clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata)
    values (v_clinica_id, v_actor_id, v_actor_nome, v_cobranca.paciente_id, 'orcamento', v_cobranca.orcamento_id::text,
      'pagamento.estornado', jsonb_build_object('cobranca_id', v_cobranca.id, 'valor', v_pagamento.valor, 'motivo', v_motivo));
    return v_pagamento;
  end if;

  select o.* into v_orc from public.orcamentos o
   where o.id = v_pagamento.orcamento_id and o.clinica_id = v_clinica_id for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then raise exception 'sem_permissao'; end if;
  update public.pagamentos set status = 'cancelado', observacoes = concat_ws(E'\n', observacoes, 'Estorno: ' || v_motivo), marcado_por_id = v_actor_id
   where id = v_pagamento.id and clinica_id = v_clinica_id returning * into v_pagamento;
  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata)
  values (v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.estornado', jsonb_build_object('valor', v_pagamento.valor, 'motivo', v_motivo, 'orcamento_id', v_orc.id));
  return v_pagamento;
end;
$$;

revoke all on function public.recompor_previsao_cobranca(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.criar_cobranca_orcamento(uuid, uuid[], numeric) from public, anon;
revoke all on function public.registrar_recebimento_cobranca(uuid, numeric, text, date) from public, anon;
revoke all on function public.cancelar_cobranca_orcamento(uuid, text) from public, anon;
grant execute on function public.criar_cobranca_orcamento(uuid, uuid[], numeric) to authenticated;
grant execute on function public.registrar_recebimento_cobranca(uuid, numeric, text, date) to authenticated;
grant execute on function public.cancelar_cobranca_orcamento(uuid, text) to authenticated;

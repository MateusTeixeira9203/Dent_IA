-- R-145 complemento — o acordo à vista é uma cobrança prevista, não um recebimento.
--
-- Antes desta migration, `definir_plano_avista` só gravava metadados em `orcamentos`.
-- Isso fazia o Financeiro não ter nada para mostrar até alguém registrar o dinheiro manualmente.
-- A linha abaixo nasce `pendente`; apenas as RPCs de recebimento podem transformá-la em `pago`.

create or replace function public.definir_plano_avista(
  p_orcamento_id   uuid,
  p_valor_acordado numeric,
  p_entrada_valor  numeric default null,
  p_entrada_forma  text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinica_id uuid := public.get_my_clinica_id();
  v_actor_id uuid := public.get_my_dentista_id();
  v_actor_nome text;
  v_orc public.orcamentos%rowtype;
  v_valor_pago numeric := 0;
  v_saldo numeric := 0;
begin
  if p_valor_acordado is null or p_valor_acordado <= 0 or round(p_valor_acordado * 100) <> p_valor_acordado * 100 then
    raise exception 'valor_invalido';
  end if;
  if p_entrada_valor is not null and (p_entrada_valor < 0 or round(p_entrada_valor * 100) <> p_entrada_valor * 100) then
    raise exception 'valor_invalido';
  end if;
  if p_entrada_forma is not null and p_entrada_forma not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro') then
    raise exception 'forma_invalida';
  end if;

  select o.* into v_orc
    from public.orcamentos o
   where o.id = p_orcamento_id and o.clinica_id = v_clinica_id
   for update;
  if v_orc.id is null or not public.can_act_as_dentista(v_orc.dentista_id) then
    raise exception 'sem_permissao';
  end if;
  if v_orc.plano_forma is not null or exists (
    select 1 from public.pagamentos p
     where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id and p.status = 'pendente'
  ) then
    raise exception 'plano_ja_definido';
  end if;

  select coalesce(sum(p.valor) filter (where p.status = 'pago'), 0)
    into v_valor_pago
    from public.pagamentos p
   where p.orcamento_id = v_orc.id and p.clinica_id = v_clinica_id;
  if round(p_valor_acordado * 100) < round(v_valor_pago * 100) then
    raise exception 'valor_menor_que_recebido';
  end if;
  v_saldo := p_valor_acordado - v_valor_pago;

  update public.orcamentos
     set plano_forma           = 'avista',
         plano_parcelas        = null,
         plano_entrada_valor   = p_entrada_valor,
         plano_entrada_forma   = p_entrada_forma,
         plano_parcelas_forma  = null,
         valor_acordado        = p_valor_acordado,
         plano_definido_em     = now(),
         plano_definido_por_id = v_actor_id
   where id = v_orc.id and clinica_id = v_clinica_id;

  -- `entrada_valor` é somente termo comercial; não é dinheiro confirmado e portanto não reduz
  -- o saldo previsto. O recebimento real é registrado pela RPC própria.
  if v_saldo > 0 then
    insert into public.pagamentos (
      clinica_id, orcamento_id, paciente_id, dentista_id, valor, status, data_vencimento
    ) values (
      v_clinica_id, v_orc.id, v_orc.paciente_id, v_orc.dentista_id, v_saldo, 'pendente',
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;

  select d.nome into v_actor_nome from public.dentistas d where d.id = v_actor_id;
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id, v_actor_id, v_actor_nome, v_orc.paciente_id, 'orcamento', v_orc.id::text,
    'pagamento.previsao_criada', jsonb_build_object('forma', 'avista', 'valor', v_saldo)
  );
end;
$$;

-- Quando o acordo é reeditado sem parcelas explícitas (inclusive pelo editor de valor), mantém
-- uma única previsão à vista em vez de cancelar a cobrança e abandonar o Financeiro.
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

  if v_quantidade = 0 and v_saldo > 0 then
    insert into public.pagamentos (
      clinica_id, orcamento_id, paciente_id, dentista_id, valor, status, data_vencimento
    ) values (
      v_clinica_id, v_orc.id, v_orc.paciente_id, v_orc.dentista_id, v_saldo, 'pendente',
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;

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
     order by p.parcela_numero nulls first, p.data_vencimento;
end;
$$;

revoke all on function public.definir_plano_avista(uuid, numeric, numeric, text) from public, anon;
revoke all on function public.reorganizar_parcelas_orcamento(uuid, numeric, jsonb) from public, anon;
grant execute on function public.definir_plano_avista(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.reorganizar_parcelas_orcamento(uuid, numeric, jsonb) to authenticated;

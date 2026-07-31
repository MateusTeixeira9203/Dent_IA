-- 122 — R-34 commit 3: define o plano de pagamento em RPC SECURITY DEFINER, mesma transação
-- que grava as parcelas (I3). Padrão de aceitar_orcamento (migration 113): auth resolvida no
-- banco via get_my_clinica_id()/get_my_dentista_id(), nunca recebida do client.
--
-- Duas formas, mutuamente exclusivas (plano_forma só é escrito uma vez — renegociar plano é
-- fora de escopo, spec R-34 §3):
--   gerar_parcelas_orcamento  — parcelado, grava plano + N linhas de pagamentos.pendente
--   definir_plano_avista      — à vista, só grava o acordo (decisão §10.2: entrada nunca cria
--                                 linha de pagamento — nasce quando o dinheiro entrar)

create or replace function public.gerar_parcelas_orcamento(
  p_orcamento_id     uuid,
  p_valor_total      numeric,
  p_numero_parcelas  smallint,
  p_primeiro_vencimento date,
  p_entrada_valor    numeric default null,
  p_entrada_forma    text default null,
  p_parcelas_forma   text default null
) returns setof public.pagamentos
language plpgsql security definer set search_path = public as $$
declare
  v_clinica_id     uuid := get_my_clinica_id();
  v_caller         uuid := get_my_dentista_id();
  v_orc            record;
  v_a_parcelar     numeric;
  v_total_centavos bigint;
  v_base_centavos  bigint;
  v_resto_centavos bigint;
  v_valor_parcela  numeric;
  i                smallint;
begin
  if p_numero_parcelas is null or p_numero_parcelas < 2 or p_numero_parcelas > 24 then
    raise exception 'numero_parcelas_invalido';
  end if;
  if p_valor_total is null or p_valor_total <= 0 then
    raise exception 'valor_invalido';
  end if;
  if p_primeiro_vencimento is null then
    raise exception 'vencimento_invalido';
  end if;

  select o.id, o.paciente_id, o.dentista_id, o.plano_forma into v_orc
    from public.orcamentos o
   where o.id = p_orcamento_id and o.clinica_id = v_clinica_id;

  if v_orc.id is null then raise exception 'sem_permissao'; end if;
  if v_orc.plano_forma is not null then raise exception 'plano_ja_definido'; end if;
  if exists (
    select 1 from public.pagamentos
     where orcamento_id = p_orcamento_id and parcela_numero is not null
  ) then
    raise exception 'plano_ja_definido';
  end if;

  -- Entrada é separada do que é parcelado: "R$200 de entrada + 3x" divide só os R$ restantes.
  v_a_parcelar := p_valor_total - coalesce(p_entrada_valor, 0);
  if v_a_parcelar <= 0 then raise exception 'valor_invalido'; end if;

  update public.orcamentos
     set plano_forma           = 'parcelado',
         plano_parcelas        = p_numero_parcelas,
         plano_entrada_valor   = p_entrada_valor,
         plano_entrada_forma   = p_entrada_forma,
         plano_parcelas_forma  = p_parcelas_forma,
         valor_acordado        = p_valor_total,
         plano_definido_em     = now(),
         plano_definido_por_id = v_caller
   where id = p_orcamento_id;

  -- Split em centavos, resto vai pra última parcela — mesma lógica que já existia em JS
  -- (gerarParcelas), só migrada pra dentro da transação que também grava as linhas.
  v_total_centavos := round(v_a_parcelar * 100)::bigint;
  v_base_centavos  := v_total_centavos / p_numero_parcelas;
  v_resto_centavos := v_total_centavos - v_base_centavos * p_numero_parcelas;

  for i in 1..p_numero_parcelas loop
    v_valor_parcela := (v_base_centavos
      + case when i = p_numero_parcelas then v_resto_centavos else 0 end) / 100.0;

    insert into public.pagamentos
      (clinica_id, orcamento_id, paciente_id, dentista_id, valor, status,
       data_vencimento, parcela_numero, total_parcelas)
    values
      (v_clinica_id, p_orcamento_id, v_orc.paciente_id, v_orc.dentista_id, v_valor_parcela,
       'pendente', (p_primeiro_vencimento + (i - 1) * interval '1 month')::date, i, p_numero_parcelas);
  end loop;

  return query
    select * from public.pagamentos
     where orcamento_id = p_orcamento_id and parcela_numero is not null
     order by parcela_numero;
end;
$$;

revoke execute on function public.gerar_parcelas_orcamento(uuid, numeric, smallint, date, numeric, text, text) from anon, public;
grant  execute on function public.gerar_parcelas_orcamento(uuid, numeric, smallint, date, numeric, text, text) to authenticated;

create or replace function public.definir_plano_avista(
  p_orcamento_id   uuid,
  p_valor_acordado numeric,
  p_entrada_valor  numeric default null,
  p_entrada_forma  text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinica_id uuid := get_my_clinica_id();
  v_caller     uuid := get_my_dentista_id();
  v_orc        record;
begin
  if p_valor_acordado is null or p_valor_acordado <= 0 then
    raise exception 'valor_invalido';
  end if;

  select o.id, o.plano_forma into v_orc
    from public.orcamentos o
   where o.id = p_orcamento_id and o.clinica_id = v_clinica_id;

  if v_orc.id is null then raise exception 'sem_permissao'; end if;
  if v_orc.plano_forma is not null then raise exception 'plano_ja_definido'; end if;

  update public.orcamentos
     set plano_forma           = 'avista',
         plano_parcelas        = null,
         plano_entrada_valor   = p_entrada_valor,
         plano_entrada_forma   = p_entrada_forma,
         plano_parcelas_forma  = null,
         valor_acordado        = p_valor_acordado,
         plano_definido_em     = now(),
         plano_definido_por_id = v_caller
   where id = p_orcamento_id;
end;
$$;

revoke execute on function public.definir_plano_avista(uuid, numeric, numeric, text) from anon, public;
grant  execute on function public.definir_plano_avista(uuid, numeric, numeric, text) to authenticated;

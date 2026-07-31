-- 123 — corrige gerar_parcelas_orcamento (migration 122) antes de qualquer código chamá-la.
--
-- Achado ao ler o caller existente (paciente-detail-client.tsx:757-785): "Gerar Parcelas" já é
-- usado também DEPOIS de pagamento parcial — hoje o cliente calcula "saldo restante" e manda
-- como se fosse o valor total, pra não duplicar o que já foi pago. Se a RPC gravasse esse valor
-- em valor_acordado, o "total combinado" ficaria errado (viraria o saldo, não o preço real).
--
-- Correção: valor_acordado é explícito e default pro que já está no orçamento (não muda sozinho
-- só por gerar parcela); o que já foi pago é somado AQUI, no banco — nunca confiado do client.

drop function if exists public.gerar_parcelas_orcamento(uuid, numeric, smallint, date, numeric, text, text);

create or replace function public.gerar_parcelas_orcamento(
  p_orcamento_id        uuid,
  p_numero_parcelas     smallint,
  p_primeiro_vencimento date,
  p_valor_acordado      numeric default null,  -- null = mantém coalesce(valor_acordado, total)
  p_entrada_valor       numeric default null,
  p_entrada_forma       text default null,
  p_parcelas_forma      text default null
) returns setof public.pagamentos
language plpgsql security definer set search_path = public as $$
declare
  v_clinica_id     uuid := get_my_clinica_id();
  v_caller         uuid := get_my_dentista_id();
  v_orc            record;
  v_ja_pago        numeric;
  v_valor_acordado numeric;
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
  if p_primeiro_vencimento is null then
    raise exception 'vencimento_invalido';
  end if;

  select o.id, o.paciente_id, o.dentista_id, o.plano_forma, o.total, o.valor_acordado into v_orc
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

  v_valor_acordado := coalesce(p_valor_acordado, v_orc.valor_acordado, v_orc.total, 0);
  if v_valor_acordado <= 0 then raise exception 'valor_invalido'; end if;

  -- Já pago é somado AQUI — nunca recebido do client (evita duplicar receita se o
  -- caller calculou saldo restante com dado desatualizado).
  select coalesce(sum(valor), 0) into v_ja_pago
    from public.pagamentos
   where orcamento_id = p_orcamento_id and status = 'pago';

  v_a_parcelar := v_valor_acordado - v_ja_pago - coalesce(p_entrada_valor, 0);
  if v_a_parcelar <= 0 then raise exception 'valor_invalido'; end if;

  update public.orcamentos
     set plano_forma           = 'parcelado',
         plano_parcelas        = p_numero_parcelas,
         plano_entrada_valor   = p_entrada_valor,
         plano_entrada_forma   = p_entrada_forma,
         plano_parcelas_forma  = p_parcelas_forma,
         valor_acordado        = v_valor_acordado,
         plano_definido_em     = now(),
         plano_definido_por_id = v_caller
   where id = p_orcamento_id;

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

revoke execute on function public.gerar_parcelas_orcamento(uuid, smallint, date, numeric, numeric, text, text) from anon, public;
grant  execute on function public.gerar_parcelas_orcamento(uuid, smallint, date, numeric, numeric, text, text) to authenticated;

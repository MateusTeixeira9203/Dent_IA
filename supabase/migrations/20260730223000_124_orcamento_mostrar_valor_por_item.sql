-- 124 — R-38: orçamento como o paciente vê — flag de valor por item + snapshot do aceite.

alter table public.orcamentos
  add column if not exists mostrar_valor_por_item boolean not null default true;

comment on column public.orcamentos.mostrar_valor_por_item is
  'R-38: false esconde preço por item e Subtotal no PDF — Total e condição negociada continuam. Default true preserva o comportamento anterior à R-38 em todo orçamento existente.';

-- Re-cria aceitar_orcamento (migration 113) só pra incluir o flag no snapshot congelado —
-- resto do corpo idêntico. O que o paciente assinou precisa registrar COM QUE flag o
-- documento foi apresentado; sem isso um orçamento aceito hoje re-renderiza amanhã com o
-- flag corrente, e o documento assinado deixa de bater com o que foi assinado (R-38 §5.3).
create or replace function public.aceitar_orcamento(
  p_orcamento_id   uuid,
  p_assinado_por   text,
  p_assinatura_ref text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinica_id    uuid := get_my_clinica_id();
  v_caller        uuid := get_my_dentista_id();
  v_role          text := get_my_role();
  v_orc           record;
  v_cro           text;
  v_snapshot      jsonb;
  v_subtotal      numeric(10,2);
  v_assinatura_id uuid;
begin
  select o.id, o.paciente_id, o.dentista_id, o.status, o.total, o.desconto,
         o.validade_dias, o.condicoes_pagamento, o.mostrar_valor_por_item
    into v_orc
  from public.orcamentos o
  where o.id = p_orcamento_id and o.clinica_id = v_clinica_id;

  if v_orc.id is null then raise exception 'sem_permissao'; end if;
  if v_orc.status = 'recusado' then raise exception 'status_invalido'; end if;
  if v_orc.dentista_id is null then raise exception 'sem_responsavel'; end if;

  -- D5: autor do orçamento ou secretária da mesma clínica.
  if v_orc.dentista_id <> v_caller and v_role <> 'secretaria' then
    raise exception 'sem_permissao';
  end if;

  if exists (select 1 from public.assinaturas a
             where a.orcamento_id = p_orcamento_id and a.tipo = 'orcamento') then
    raise exception 'ja_aceito';
  end if;

  select d.cro into v_cro from public.dentistas d where d.id = v_orc.dentista_id;

  select coalesce(sum(i.preco_total), 0) into v_subtotal
  from public.orcamento_itens i where i.orcamento_id = p_orcamento_id;

  -- Snapshot montado AQUI, do banco. Sem procedimento_id: FK com SET NULL não é prova.
  select jsonb_build_object(
    'versao', 1,
    'subtotal', v_subtotal,
    'desconto', coalesce(v_orc.desconto, 0),
    'total', coalesce(v_orc.total, 0),
    'validadeDias', v_orc.validade_dias,
    'condicoesPagamento', v_orc.condicoes_pagamento,
    'mostrarValorPorItem', v_orc.mostrar_valor_por_item,
    'statusNoAto', v_orc.status,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', i.descricao, 'dente', i.dente, 'quantidade', i.quantidade,
        'precoUnitario', i.preco_unitario, 'precoTotal', i.preco_total
      ) order by i.created_at)
      from public.orcamento_itens i where i.orcamento_id = p_orcamento_id
    ), '[]'::jsonb)
  ) into v_snapshot;

  insert into public.assinaturas
    (clinica_id, paciente_id, tipo, orcamento_id, dentista_id,
     assinado_por, cro_no_ato, assinatura_ref, termos_snapshot)
  values
    (v_clinica_id, v_orc.paciente_id, 'orcamento', p_orcamento_id, v_orc.dentista_id,
     p_assinado_por, v_cro, p_assinatura_ref, v_snapshot)
  returning id into v_assinatura_id;

  return v_assinatura_id;
end;
$$;

revoke execute on function public.aceitar_orcamento(uuid, text, text) from anon, public;
grant  execute on function public.aceitar_orcamento(uuid, text, text) to authenticated;

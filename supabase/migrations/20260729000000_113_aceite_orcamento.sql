-- 113 — R-03c-1: aceite assinado do orçamento + snapshot dos termos.
-- Não cria tabela: reusa `assinaturas` (migration 111), que já nasceu genérica.

alter table public.assinaturas add column if not exists termos_snapshot jsonb;

comment on column public.assinaturas.termos_snapshot is
  'R-03c-1: termos congelados no ato (tipo=orcamento). Montado pela RPC, nunca pelo client.';

-- D3: CASCADE apagava a prova junto com o orçamento.
alter table public.assinaturas drop constraint if exists assinaturas_orcamento_id_fkey;
alter table public.assinaturas
  add constraint assinaturas_orcamento_id_fkey
  foreign key (orcamento_id) references public.orcamentos(id) on delete restrict;

-- D4: 1 aceite por orçamento, garantido pelo banco (sem coluna espelho).
create unique index if not exists idx_assinaturas_orcamento_unico
  on public.assinaturas(orcamento_id) where tipo = 'orcamento';

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
         o.validade_dias, o.condicoes_pagamento
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

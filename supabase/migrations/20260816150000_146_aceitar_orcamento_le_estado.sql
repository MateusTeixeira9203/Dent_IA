-- 146 — R-114 §3.5: aceitar_orcamento passa a ler o estado derivado, não `status` cru.
--
-- Duas coisas quebrariam em silêncio sem isto:
-- 1. `status = 'recusado'` como bloqueio perdeu sentido — 0 orçamentos usam esse valor em
--    produção, e daqui pra frente `status` fica inerte (R-114). O bloqueio certo agora é
--    "nada foi aprovado ainda" (nenhum item marcado aprovado=true).
-- 2. O snapshot assinado incluía TODOS os itens, aprovados ou não. Sob I2 (item não
--    aprovado continua visível mas não é compromisso do paciente), assinar a lista inteira
--    faria o paciente "confirmar que aceita pagar" por procedimento que ele nem escolheu —
--    o oposto do que a assinatura prova. Snapshot passa a conter só os aprovados, e
--    subtotal/total refletem a soma deles (valorDevido), não a proposta inteira.

create or replace function public.aceitar_orcamento(
  p_orcamento_id uuid, p_assinado_por text, p_assinatura_ref text
) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_clinica_id    uuid := get_my_clinica_id();
  v_caller        uuid := get_my_dentista_id();
  v_role          text := get_my_role();
  v_orc           record;
  v_cro           text;
  v_snapshot      jsonb;
  v_subtotal      numeric(10,2);
  v_valor_aprovado numeric(10,2);
  v_assinatura_id uuid;
begin
  select o.id, o.paciente_id, o.dentista_id, o.status, o.total, o.valor_acordado, o.desconto,
         o.validade_dias, o.condicoes_pagamento, o.mostrar_valor_por_item
    into v_orc
  from public.orcamentos o
  where o.id = p_orcamento_id and o.clinica_id = v_clinica_id;

  if v_orc.id is null then raise exception 'sem_permissao'; end if;
  if v_orc.dentista_id is null then raise exception 'sem_responsavel'; end if;

  -- R-114 — "recusado" não existe mais como bloqueio; o bloqueio real é zero item aprovado
  -- (nada pra confirmar). Mesmo predicado de orcamentoAceitaPagamento (I8), aplicado aqui.
  select coalesce(sum(i.preco_total), 0) into v_valor_aprovado
  from public.orcamento_itens i where i.orcamento_id = p_orcamento_id and i.aprovado;

  if v_valor_aprovado = 0 then raise exception 'status_invalido'; end if;

  -- D5: autor do orçamento ou secretária da mesma clínica.
  if v_orc.dentista_id <> v_caller and v_role <> 'secretaria' then
    raise exception 'sem_permissao';
  end if;

  if exists (select 1 from public.assinaturas a
             where a.orcamento_id = p_orcamento_id and a.tipo = 'orcamento') then
    raise exception 'ja_aceito';
  end if;

  select d.cro into v_cro from public.dentistas d where d.id = v_orc.dentista_id;

  -- subtotal segue sendo a soma de TODOS os itens (a proposta inteira, I3) — só o snapshot
  -- assinado abaixo passa a listar somente os aprovados.
  select coalesce(sum(i.preco_total), 0) into v_subtotal
  from public.orcamento_itens i where i.orcamento_id = p_orcamento_id;

  -- Snapshot montado AQUI, do banco. Sem procedimento_id: FK com SET NULL não é prova.
  select jsonb_build_object(
    'versao', 2,
    'subtotal', v_subtotal,
    'valorAprovado', v_valor_aprovado,
    'desconto', coalesce(v_orc.desconto, 0),
    'total', coalesce(v_orc.valor_acordado, v_valor_aprovado, 0),
    'validadeDias', v_orc.validade_dias,
    'condicoesPagamento', v_orc.condicoes_pagamento,
    'mostrarValorPorItem', v_orc.mostrar_valor_por_item,
    'estadoNoAto', 'aceito',
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', i.descricao, 'dente', i.dente, 'quantidade', i.quantidade,
        'precoUnitario', i.preco_unitario, 'precoTotal', i.preco_total
      ) order by i.created_at)
      from public.orcamento_itens i where i.orcamento_id = p_orcamento_id and i.aprovado
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
$function$;

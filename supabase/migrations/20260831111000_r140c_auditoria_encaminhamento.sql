-- =====================================================================
-- R-140c — trilha imutável de alterações em procedimentos encaminhados
--
-- `realizado_em` é uma data clínica; ela não prova quem mexeu no registro nem
-- quando a alteração ocorreu. As RPCs abaixo mantêm a escrita estreita já
-- existente e inserem, na mesma transação, o log com autor e instante do servidor.
-- =====================================================================

begin;

create or replace function public.encaminhar_eventos_odontograma(
  p_evento_ids uuid[],
  p_destino_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id   uuid := get_my_clinica_id();
  v_caller       uuid := get_my_dentista_id();
  v_role         text := get_my_role();
  v_count        int;
  v_actor_nome   text;
  v_destino_nome text;
begin
  if v_role not in ('admin', 'dentista') then
    raise exception 'sem_permissao';
  end if;

  if coalesce(array_length(p_evento_ids, 1), 0) = 0 then
    raise exception 'evento_invalido';
  end if;

  select d.nome into v_actor_nome
  from public.dentistas d
  where d.id = v_caller and d.clinica_id = v_clinica_id;

  if v_actor_nome is null then
    raise exception 'sem_permissao';
  end if;

  if p_destino_id is not null then
    select d.nome into v_destino_nome
    from public.dentistas d
    where d.id = p_destino_id
      and d.clinica_id = v_clinica_id
      and d.ativo = true
      and d.role in ('admin', 'dentista')
      and d.id <> v_caller;

    if v_destino_nome is null then
      raise exception 'destino_invalido';
    end if;
  end if;

  select count(*) into v_count
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = any(p_evento_ids)
    and e.clinica_id = v_clinica_id
    and e.dentista_id = v_caller
    and e.status = 'indicado'
    and f.assinado_em is null;

  if v_count <> coalesce(array_length(p_evento_ids, 1), 0) then
    raise exception 'sem_permissao';
  end if;

  with alterados as (
    update public.odontograma_eventos
       set encaminhado_para = p_destino_id
     where id = any(p_evento_ids)
       and clinica_id = v_clinica_id
    returning id, paciente_id
  )
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  )
  select
    v_clinica_id,
    v_caller,
    v_actor_nome,
    alterados.paciente_id,
    'odontograma_evento',
    alterados.id::text,
    case when p_destino_id is null
      then 'odontograma_evento.encaminhamento_removido'
      else 'odontograma_evento.encaminhado'
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'destino_id', p_destino_id,
      'destino_nome', v_destino_nome
    ))
  from alterados;
end;
$$;

create or replace function public.concluir_evento_encaminhado(
  p_evento_ids   uuid[],
  p_novo_status  text,
  p_realizado_em date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid := get_my_clinica_id();
  v_caller     uuid := get_my_dentista_id();
  v_role       text := get_my_role();
  v_count      int;
  v_actor_nome text;
begin
  if v_role not in ('admin', 'dentista') then
    raise exception 'sem_permissao';
  end if;
  if p_novo_status not in ('indicado', 'realizado') then
    raise exception 'status_invalido';
  end if;

  select d.nome into v_actor_nome
  from public.dentistas d
  where d.id = v_caller and d.clinica_id = v_clinica_id;

  if v_actor_nome is null then
    raise exception 'sem_permissao';
  end if;

  select count(*) into v_count
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = any(p_evento_ids)
    and e.clinica_id = v_clinica_id
    and e.encaminhado_para = v_caller
    and f.assinado_em is null;

  if v_count <> coalesce(array_length(p_evento_ids, 1), 0) then
    raise exception 'sem_permissao';
  end if;

  with alterados as (
    update public.odontograma_eventos
       set status       = p_novo_status,
           realizado_em = case when p_novo_status = 'realizado' then p_realizado_em else null end
     where id = any(p_evento_ids)
       and clinica_id = v_clinica_id
    returning id, paciente_id
  )
  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  )
  select
    v_clinica_id,
    v_caller,
    v_actor_nome,
    alterados.paciente_id,
    'odontograma_evento',
    alterados.id::text,
    case when p_novo_status = 'realizado'
      then 'odontograma_evento.marcado_realizado'
      else 'odontograma_evento.reaberto'
    end,
    jsonb_build_object('status', p_novo_status, 'realizado_em', p_realizado_em)
  from alterados;
end;
$$;

create or replace function public.preencher_detalhe_encaminhado(
  p_evento_id uuid,
  p_detalhe   jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid := get_my_clinica_id();
  v_caller     uuid := get_my_dentista_id();
  v_role       text := get_my_role();
  v_tipo       text;
  v_paciente_id uuid;
  v_actor_nome text;
begin
  if v_role not in ('admin', 'dentista') then
    raise exception 'sem_permissao';
  end if;

  select e.tipo, e.paciente_id into v_tipo, v_paciente_id
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = p_evento_id
    and e.clinica_id = v_clinica_id
    and e.encaminhado_para = v_caller
    and f.assinado_em is null;

  if v_tipo is null then
    raise exception 'sem_permissao';
  end if;
  if v_tipo not in ('endodontia', 'implante') then
    raise exception 'tipo_nao_suportado';
  end if;

  select d.nome into v_actor_nome
  from public.dentistas d
  where d.id = v_caller and d.clinica_id = v_clinica_id;

  if v_actor_nome is null then
    raise exception 'sem_permissao';
  end if;

  update public.odontograma_eventos
     set detalhe = p_detalhe
   where id = p_evento_id
     and clinica_id = v_clinica_id;

  insert into public.activity_logs (
    clinica_id, actor_id, actor_nome, paciente_id, entity_type, entity_id, action, metadata
  ) values (
    v_clinica_id,
    v_caller,
    v_actor_nome,
    v_paciente_id,
    'odontograma_evento',
    p_evento_id::text,
    'odontograma_evento.detalhe_alterado',
    jsonb_build_object('tipo', v_tipo)
  );
end;
$$;

revoke execute on function public.encaminhar_eventos_odontograma(uuid[], uuid) from anon, public;
grant execute on function public.encaminhar_eventos_odontograma(uuid[], uuid) to authenticated;

revoke execute on function public.concluir_evento_encaminhado(uuid[], text, date) from anon, public;
grant execute on function public.concluir_evento_encaminhado(uuid[], text, date) to authenticated;

revoke execute on function public.preencher_detalhe_encaminhado(uuid, jsonb) from anon, public;
grant execute on function public.preencher_detalhe_encaminhado(uuid, jsonb) to authenticated;

commit;

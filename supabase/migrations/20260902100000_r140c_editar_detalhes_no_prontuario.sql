begin;

-- R-140c: edição contextual no Prontuário unificado. A autorização e o log ficam na
-- mesma transação: autor altera observação e detalhe; destinatário de encaminhamento
-- altera somente detalhe de endodontia/implante.
create or replace function public.editar_detalhes_evento_odontograma(
  p_evento_id uuid,
  p_detalhe jsonb default null,
  p_alterar_detalhe boolean default false,
  p_observacao text default null,
  p_alterar_observacao boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid := get_my_clinica_id();
  v_caller uuid := get_my_dentista_id();
  v_role text := get_my_role();
  v_tipo text;
  v_paciente_id uuid;
  v_autor_id uuid;
  v_encaminhado_para uuid;
  v_assinatura_id uuid;
  v_ficha_assinada_em timestamptz;
  v_actor_nome text;
begin
  if v_role not in ('admin', 'dentista') or v_caller is null then
    raise exception 'sem_permissao';
  end if;

  if not p_alterar_detalhe and not p_alterar_observacao then
    raise exception 'nenhuma_alteracao';
  end if;

  select
    e.tipo,
    e.paciente_id,
    e.dentista_id,
    e.encaminhado_para,
    e.assinatura_id,
    f.assinado_em
  into
    v_tipo,
    v_paciente_id,
    v_autor_id,
    v_encaminhado_para,
    v_assinatura_id,
    v_ficha_assinada_em
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = p_evento_id
    and e.clinica_id = v_clinica_id;

  if v_tipo is null or v_assinatura_id is not null or v_ficha_assinada_em is not null then
    raise exception 'registro_bloqueado';
  end if;

  if v_caller <> v_autor_id and v_caller <> v_encaminhado_para then
    raise exception 'sem_permissao';
  end if;

  if v_caller <> v_autor_id and p_alterar_observacao then
    raise exception 'sem_permissao';
  end if;

  if p_alterar_detalhe and v_tipo not in ('endodontia', 'implante') then
    raise exception 'tipo_nao_suportado';
  end if;

  select d.nome into v_actor_nome
  from public.dentistas d
  where d.id = v_caller
    and d.clinica_id = v_clinica_id;

  if v_actor_nome is null then
    raise exception 'sem_permissao';
  end if;

  update public.odontograma_eventos
     set detalhe = case when p_alterar_detalhe then p_detalhe else detalhe end,
         observacao = case when p_alterar_observacao then nullif(btrim(p_observacao), '') else observacao end
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
    jsonb_build_object(
      'tipo', v_tipo,
      'detalhe_alterado', p_alterar_detalhe,
      'observacao_alterada', p_alterar_observacao
    )
  );
end;
$$;

revoke execute on function public.editar_detalhes_evento_odontograma(uuid, jsonb, boolean, text, boolean) from anon, public;
grant execute on function public.editar_detalhes_evento_odontograma(uuid, jsonb, boolean, text, boolean) to authenticated;

commit;

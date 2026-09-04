-- R-152 — exclusão unitária e auditável de procedimento na Ficha unificada.
-- O evento só pode ser removido pelo autor, antes de qualquer assinatura e sem vínculo
-- financeiro. A própria função revalida tudo sob lock e deixa a trilha de auditoria na
-- mesma transação do delete.

begin;

create or replace function public.excluir_evento_odontograma(
  p_evento_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid := get_my_clinica_id();
  v_caller uuid := get_my_dentista_id();
  v_role text := get_my_role();
  v_paciente_id uuid;
  v_autor_id uuid;
  v_ficha_id uuid;
  v_assinatura_id uuid;
  v_ficha_assinada_em timestamptz;
  v_tipo text;
  v_status text;
  v_dente smallint;
  v_actor_nome text;
begin
  if v_role not in ('admin', 'dentista') or v_caller is null then
    raise exception 'sem_permissao';
  end if;

  select
    e.paciente_id,
    e.dentista_id,
    e.ficha_id,
    e.assinatura_id,
    f.assinado_em,
    e.tipo,
    e.status,
    e.dente
  into
    v_paciente_id,
    v_autor_id,
    v_ficha_id,
    v_assinatura_id,
    v_ficha_assinada_em,
    v_tipo,
    v_status,
    v_dente
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id and f.clinica_id = e.clinica_id
  where e.id = p_evento_id
    and e.clinica_id = v_clinica_id
  for update of e;

  if v_paciente_id is null then
    raise exception 'registro_nao_encontrado';
  end if;

  if v_caller <> v_autor_id then
    raise exception 'sem_permissao';
  end if;

  if v_assinatura_id is not null or v_ficha_assinada_em is not null then
    raise exception 'registro_bloqueado';
  end if;

  if exists (
    select 1
    from public.orcamento_eventos oe
    where oe.evento_id = p_evento_id
      and oe.clinica_id = v_clinica_id
  ) then
    raise exception 'registro_orcado';
  end if;

  select d.nome into v_actor_nome
  from public.dentistas d
  where d.id = v_caller
    and d.clinica_id = v_clinica_id;

  if v_actor_nome is null then
    raise exception 'sem_permissao';
  end if;

  delete from public.odontograma_eventos
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
    'odontograma_evento.excluido',
    jsonb_strip_nulls(jsonb_build_object(
      'ficha_id', v_ficha_id,
      'tipo', v_tipo,
      'status', v_status,
      'dente', v_dente
    ))
  );
end;
$$;

revoke execute on function public.excluir_evento_odontograma(uuid) from anon, public;
grant execute on function public.excluir_evento_odontograma(uuid) to authenticated;

commit;

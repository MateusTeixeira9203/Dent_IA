-- R-127 — fecha o escopo da RPC de eventos ao contexto da ficha.
--
-- A RLS já exige que o dentista seja o autor da linha, mas a versão 150 aceitava
-- um id de evento próprio de outra ficha/paciente da mesma clínica no payload.
-- Esta migration não altera dado: a RPC passa a recusar o payload antes de escrever.

create or replace function public.salvar_eventos_odontograma(
  p_ficha_id     uuid,
  p_clinica_id   uuid,
  p_paciente_id  uuid,
  p_eventos      jsonb,
  p_sincronizar  boolean default true
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_assinado_em timestamptz;
begin
  if jsonb_typeof(p_eventos) <> 'array' then
    raise exception 'eventos_invalidos';
  end if;

  select assinado_em into v_assinado_em
  from public.fichas
  where id = p_ficha_id and clinica_id = p_clinica_id and paciente_id = p_paciente_id
  for update;

  if not found then
    raise exception 'ficha_nao_encontrada';
  end if;

  if v_assinado_em is not null then
    raise exception 'ficha_assinada';
  end if;

  -- Cada linha do payload nasce ou permanece no contexto exato que a chamada
  -- bloqueou. Nunca aceitamos "mover" um evento de outra ficha/paciente por id.
  if exists (
    select 1
    from jsonb_array_elements(p_eventos) e
    where nullif(e->>'id', '') is null
      or nullif(e->>'clinica_id', '')::uuid is distinct from p_clinica_id
      or nullif(e->>'paciente_id', '')::uuid is distinct from p_paciente_id
      or nullif(e->>'ficha_id', '')::uuid is distinct from p_ficha_id
  ) then
    raise exception 'evento_contexto_invalido';
  end if;

  -- Se o id já existe, ele também precisa pertencer à mesma ficha/paciente no
  -- banco. A RLS continua responsável pela autoria; este guard fecha o escopo
  -- clínico que RLS sozinha não expressa.
  if exists (
    select 1
    from jsonb_array_elements(p_eventos) e
    join public.odontograma_eventos existente
      on existente.id = (e->>'id')::uuid
    where existente.clinica_id is distinct from p_clinica_id
      or existente.paciente_id is distinct from p_paciente_id
      or existente.ficha_id is distinct from p_ficha_id
  ) then
    raise exception 'evento_contexto_invalido';
  end if;

  -- Quem recebe precisa ser dentista/admin ativo desta clínica, nunca o próprio autor.
  -- Só evento indicado pode nascer ou permanecer encaminhado. Em evento existente, a autoria
  -- vem da própria linha: nunca da chave dentista_id controlada pelo payload.
  if exists (
    select 1
    from jsonb_array_elements(p_eventos) e
    left join public.odontograma_eventos existente
      on existente.id = (e->>'id')::uuid
      and existente.clinica_id = p_clinica_id
    where e ? 'encaminhado_para'
      and nullif(e->>'encaminhado_para', '') is not null
      and (
        e->>'status' <> 'indicado'
        or nullif(e->>'encaminhado_para', '')::uuid = coalesce(
          existente.dentista_id,
          nullif(e->>'dentista_id', '')::uuid
        )
        or not exists (
          select 1
          from public.dentistas destino
          where destino.id = nullif(e->>'encaminhado_para', '')::uuid
            and destino.clinica_id = p_clinica_id
            and destino.ativo = true
            and destino.role in ('dentista', 'admin')
        )
      )
  ) then
    raise exception 'encaminhamento_invalido';
  end if;

  if p_sincronizar then
    delete from public.odontograma_eventos
    where ficha_id = p_ficha_id and clinica_id = p_clinica_id
      and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_eventos) e);
  end if;

  update public.odontograma_eventos evento
  set encaminhado_para = nullif(payload.e->>'encaminhado_para', '')::uuid
  from jsonb_array_elements(p_eventos) as payload(e)
  where evento.id = (payload.e->>'id')::uuid
    and evento.clinica_id = p_clinica_id
    and evento.paciente_id = p_paciente_id
    and evento.ficha_id = p_ficha_id
    and payload.e ? 'encaminhado_para';

  insert into public.odontograma_eventos (
    id, clinica_id, paciente_id, dentista_id, ficha_id, grupo_id, tipo, status,
    origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, observacao,
    detalhe, realizado_em, momento_planejado, encaminhado_para
  )
  select
    (e->>'id')::uuid, (e->>'clinica_id')::uuid, (e->>'paciente_id')::uuid,
    (e->>'dentista_id')::uuid, (e->>'ficha_id')::uuid,
    nullif(e->>'grupo_id', '')::uuid, e->>'tipo', e->>'status', e->>'origem', e->>'nivel',
    nullif(e->>'arcada', ''), nullif(e->>'quadrante', '')::smallint,
    nullif(e->>'dente', '')::smallint,
    coalesce((select array_agg(x) from jsonb_array_elements_text(e->'faces') x), '{}'),
    nullif(e->>'papel_no_grupo', ''), nullif(e->>'observacao', ''), e->'detalhe',
    nullif(e->>'realizado_em', '')::date,
    coalesce(nullif(e->>'momento_planejado', ''), 'sessao_atual'),
    nullif(e->>'encaminhado_para', '')::uuid
  from jsonb_array_elements(p_eventos) e
  on conflict (id) do update set
    grupo_id = excluded.grupo_id, tipo = excluded.tipo, status = excluded.status,
    origem = excluded.origem, nivel = excluded.nivel, arcada = excluded.arcada,
    quadrante = excluded.quadrante, dente = excluded.dente, faces = excluded.faces,
    papel_no_grupo = excluded.papel_no_grupo, observacao = excluded.observacao,
    detalhe = excluded.detalhe, realizado_em = excluded.realizado_em,
    momento_planejado = excluded.momento_planejado
  where public.odontograma_eventos.clinica_id = p_clinica_id
    and public.odontograma_eventos.paciente_id = p_paciente_id
    and public.odontograma_eventos.ficha_id = p_ficha_id;
end;
$$;

comment on function public.salvar_eventos_odontograma is
  'Upsert atômico do event-log. R-127: cada payload e evento existente deve pertencer à ficha/paciente bloqueados.';

revoke execute on function public.salvar_eventos_odontograma(uuid, uuid, uuid, jsonb, boolean) from anon, public;
grant execute on function public.salvar_eventos_odontograma(uuid, uuid, uuid, jsonb, boolean) to authenticated;

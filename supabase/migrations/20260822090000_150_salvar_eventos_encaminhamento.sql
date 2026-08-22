-- =====================================================================
-- 150 — R-125a: encaminhamento no mesmo save atomico do evento
--
-- Preserva encaminhamento existente quando o JSON nao traz a chave; `null`
-- explicito remove o destino. Nenhuma linha historica e alterada nesta migration.
-- =====================================================================

begin;

drop function if exists public.salvar_eventos_odontograma(uuid, uuid, uuid, jsonb, boolean);

create function public.salvar_eventos_odontograma(
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

  -- Quem recebe precisa ser dentista/admin ativo desta clínica, nunca o próprio autor.
  -- Só evento indicado pode nascer ou permanecer encaminhado. Em evento existente, a autoria
  -- vem da própria linha: nunca da chave `dentista_id` controlada pelo payload.
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

  -- Eventos existentes só recebem esta coluna quando ela veio no payload. Isso evita que um
  -- formulário antigo apague o encaminhamento por não conhecer o campo.
  update public.odontograma_eventos evento
  set encaminhado_para = nullif(payload.e->>'encaminhado_para', '')::uuid
  from jsonb_array_elements(p_eventos) as payload(e)
  where evento.id = (payload.e->>'id')::uuid
    and evento.clinica_id = p_clinica_id
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
    momento_planejado = excluded.momento_planejado;
end;
$$;

comment on function public.salvar_eventos_odontograma is
  'Upsert atomico do event-log (R-01/107/142). R-125a soma encaminhamento opcional: chave ausente preserva destino; null remove explicitamente.';

revoke execute on function public.salvar_eventos_odontograma(uuid, uuid, uuid, jsonb, boolean) from anon, public;
grant execute on function public.salvar_eventos_odontograma(uuid, uuid, uuid, jsonb, boolean) to authenticated;

commit;

\set ON_ERROR_STOP on

-- Requer o seed local R-140a/R-140-browser. Toda a prova termina em ROLLBACK.
begin;

insert into public.procedimentos (id, clinica_id, dentista_id, nome, categoria)
values
  (
    'b1400000-0000-4000-8000-0000000000a1',
    'b0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-0000000000a1',
    '__R140B_CURATIVO_A__',
    'Outros'
  ),
  (
    'b1400000-0000-4000-8000-0000000000b1',
    'b0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-0000000000b1',
    '__R140B_CURATIVO_B__',
    'Outros'
  );

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"b0000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
declare
  v_ficha_id uuid;
  v_paciente_id uuid := 'b0000000-0000-4000-8000-0000000000a2';
  v_clinica_id uuid := 'b0000000-0000-4000-8000-000000000001';
  v_dentista_id uuid := 'b0000000-0000-4000-8000-0000000000a1';
  v_evento_id uuid := 'b1400000-0000-4000-8000-0000000000e1';
  v_rejeitou boolean := false;
  v_row record;
begin
  select id into v_ficha_id
  from public.fichas
  where clinica_id = v_clinica_id
    and paciente_id = v_paciente_id
    and dentista_id = v_dentista_id
    and assinado_em is null
  limit 1;

  if v_ficha_id is null then
    raise exception 'fixture_r140b_sem_ficha_editavel';
  end if;

  perform public.salvar_eventos_odontograma(
    v_ficha_id,
    v_clinica_id,
    v_paciente_id,
    jsonb_build_array(jsonb_build_object(
      'id', v_evento_id,
      'clinica_id', v_clinica_id,
      'paciente_id', v_paciente_id,
      'dentista_id', v_dentista_id,
      'ficha_id', v_ficha_id,
      'grupo_id', null,
      'tipo', 'outro',
      'procedimento_id', 'b1400000-0000-4000-8000-0000000000a1',
      'procedimento_nome', 'Troca de curativo',
      'status', 'realizado',
      'origem', 'clinica',
      'momento_planejado', 'sessao_atual',
      'nivel', 'geral',
      'arcada', null,
      'quadrante', null,
      'dente', null,
      'faces', jsonb_build_array(),
      'papel_no_grupo', null,
      'observacao', 'Sem intercorrencias',
      'detalhe', null,
      'realizado_em', current_date
    )),
    false
  );

  select procedimento_id, procedimento_nome, nivel, arcada, quadrante, dente, faces
  into v_row
  from public.odontograma_eventos
  where id = v_evento_id;

  if v_row.procedimento_id is distinct from 'b1400000-0000-4000-8000-0000000000a1'::uuid
    or v_row.procedimento_nome is distinct from 'Troca de curativo'
    or v_row.nivel is distinct from 'geral'
    or v_row.arcada is not null
    or v_row.quadrante is not null
    or v_row.dente is not null
    or v_row.faces <> '{}'::text[] then
    raise exception 'r140b_persistencia_flexivel_falhou';
  end if;

  -- Simula um retry de cliente anterior, que ainda nao envia os campos R-140b.
  perform public.salvar_eventos_odontograma(
    v_ficha_id,
    v_clinica_id,
    v_paciente_id,
    jsonb_build_array(jsonb_build_object(
      'id', v_evento_id,
      'clinica_id', v_clinica_id,
      'paciente_id', v_paciente_id,
      'dentista_id', v_dentista_id,
      'ficha_id', v_ficha_id,
      'grupo_id', null,
      'tipo', 'outro',
      'status', 'realizado',
      'origem', 'clinica',
      'momento_planejado', 'sessao_atual',
      'nivel', 'geral',
      'arcada', null,
      'quadrante', null,
      'dente', null,
      'faces', jsonb_build_array(),
      'papel_no_grupo', null,
      'observacao', 'Retry legado',
      'detalhe', null,
      'realizado_em', current_date
    )),
    false
  );

  select procedimento_id, procedimento_nome into v_row
  from public.odontograma_eventos
  where id = v_evento_id;

  if v_row.procedimento_id is distinct from 'b1400000-0000-4000-8000-0000000000a1'::uuid
    or v_row.procedimento_nome is distinct from 'Troca de curativo' then
    raise exception 'r140b_retry_perdeu_snapshot';
  end if;

  begin
    perform public.salvar_eventos_odontograma(
      v_ficha_id,
      v_clinica_id,
      v_paciente_id,
      jsonb_build_array(jsonb_build_object(
        'id', 'b1400000-0000-4000-8000-0000000000e2',
        'clinica_id', v_clinica_id,
        'paciente_id', v_paciente_id,
        'dentista_id', v_dentista_id,
        'ficha_id', v_ficha_id,
        'tipo', 'outro',
        'procedimento_id', 'b1400000-0000-4000-8000-0000000000b1',
        'procedimento_nome', 'Item de outra clinica',
        'status', 'indicado',
        'origem', 'clinica',
        'momento_planejado', 'sessao_atual',
        'nivel', 'geral',
        'faces', jsonb_build_array(),
        'observacao', '',
        'detalhe', null
      )),
      false
    );
  exception when others then
    v_rejeitou := sqlerrm like '%procedimento_catalogo_invalido%';
  end;

  if not v_rejeitou then
    raise exception 'r140b_aceitou_catalogo_de_outra_clinica';
  end if;

  raise notice 'R-140b: persistencia, retry e isolamento de catalogo passaram.';
end;
$$;

rollback;

-- R-140a — Backfill determinístico de evoluções legadas.
--
-- Dados, sem DDL: cada evolução que ainda não pertence a uma visita recebe um contêiner técnico
-- `legado`, usando o próprio UUID da evolução. Isso preserva todo o histórico sem inferir que
-- evoluções de fichas diferentes na mesma data pertenciam à mesma visita.
--
-- Não infere agendamento nem cria vínculos de eventos históricos: ambos exigem evidência que o
-- modelo legado não guarda de forma inequívoca. A migration é repetível.

do $$
declare
  evolucoes_pendentes integer;
  evolucoes_vinculadas integer;
begin
  select count(*)
    into evolucoes_pendentes
  from public.ficha_evolucoes
  where atendimento_id is null;

  -- O UUID da evolução é a chave determinística do contêiner legado. Uma colisão com um
  -- Atendimento que não seja exatamente o contêiner esperado é ambiguidade crítica: abortar é
  -- preferível a conectar história clínica errada.
  if exists (
    select 1
    from public.ficha_evolucoes evolucao
    join public.fichas ficha on ficha.id = evolucao.ficha_id
    join public.atendimentos_clinicos atendimento on atendimento.id = evolucao.id
    where evolucao.atendimento_id is null
      and (
        atendimento.clinica_id <> evolucao.clinica_id
        or atendimento.paciente_id <> ficha.paciente_id
        or atendimento.dentista_id <> evolucao.dentista_id
        or atendimento.origem <> 'legado'
      )
  ) then
    raise exception 'r140a_backfill_uuid_colisao';
  end if;

  insert into public.atendimentos_clinicos (
    id,
    clinica_id,
    paciente_id,
    dentista_id,
    agendamento_id,
    chave_idempotencia,
    data_atendimento,
    origem,
    estado,
    criado_por,
    finalizado_em,
    created_at,
    updated_at
  )
  select
    evolucao.id,
    evolucao.clinica_id,
    ficha.paciente_id,
    evolucao.dentista_id,
    null,
    evolucao.id,
    evolucao.data,
    'legado',
    'finalizado',
    null,
    evolucao.created_at,
    evolucao.created_at,
    evolucao.updated_at
  from public.ficha_evolucoes evolucao
  join public.fichas ficha on ficha.id = evolucao.ficha_id
  where evolucao.atendimento_id is null
  on conflict (id) do nothing;

  update public.ficha_evolucoes evolucao
  set atendimento_id = evolucao.id
  from public.fichas ficha,
    public.atendimentos_clinicos atendimento
  where evolucao.ficha_id = ficha.id
    and evolucao.atendimento_id is null
    and atendimento.id = evolucao.id
    and atendimento.clinica_id = evolucao.clinica_id
    and atendimento.paciente_id = ficha.paciente_id
    and atendimento.dentista_id = evolucao.dentista_id
    and atendimento.origem = 'legado';

  get diagnostics evolucoes_vinculadas = row_count;

  if exists (
    select 1
    from public.ficha_evolucoes
    where atendimento_id is null
  ) then
    raise exception 'r140a_backfill_evolucoes_pendentes';
  end if;

  raise notice 'R-140a backfill: % evolução(ões) pendentes; % vínculo(s) criado(s).',
    evolucoes_pendentes,
    evolucoes_vinculadas;
end;
$$;

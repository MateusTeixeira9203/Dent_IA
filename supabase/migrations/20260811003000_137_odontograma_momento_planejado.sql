-- =====================================================================
-- 137 — R-101: 3º estado do odontograma, "próxima seção" (âmbar)
--
-- Spec: plans/specs/R-101-odontograma-proxima-secao.md
--
-- `status` continua com exatamente 2 valores (indicado/realizado) — não é um 3º
-- status. `momento_planejado` é um eixo ORTOGONAL (mesmo padrão de `origem`):
-- dentro do que ainda está "indicado", diferencia planejado pra AGORA
-- (sessao_atual, default) de deliberadamente empurrado pro dentista tratar numa
-- sessão futura (proxima_sessao). Só o dentista seta; a IA nunca decide (mesma
-- classe de invariante de `realizado_em`).
--
-- Risco real, não hipotético: a RPC de upsert (migration 107) monta o insert
-- coluna a coluna a partir de JSON. A própria 107 documenta que isso já perdeu
-- dado em silêncio uma vez (`detalhe`, 2 dias sem estar na lista de colunas,
-- 4/4 eventos de endo/implante descartados sem erro). Por isso a coluna E a
-- function entram juntas, nesta mesma migration.
-- =====================================================================

begin;

alter table public.odontograma_eventos
  add column momento_planejado text not null default 'sessao_atual'
  check (momento_planejado in ('sessao_atual', 'proxima_sessao'));

comment on column public.odontograma_eventos.momento_planejado is
  'R-101 - dentro do que ainda esta indicado, se o dentista planejou pra AGORA (sessao_atual,
   default) ou deliberadamente pra depois (proxima_sessao). Eixo ORTOGONAL a status/origem
   (mesmo padrao de corDoRegistro) - nunca redefine o que e pendencia, so cor/rotulo. So o
   dentista seta; a IA nunca decide.';

-- realizado + "planejado pra depois" é contraditório
alter table public.odontograma_eventos add constraint odontograma_eventos_momento_coerente check (
  momento_planejado = 'sessao_atual' or status = 'indicado'
);

-- RPC de upsert (substitui a 107 inteira — MESMA assinatura, corpo ganha a coluna nova nas 3
-- posições: insert columns, select, on conflict update). Esquecer 1 das 3 é o mesmo bug
-- silencioso que já aconteceu com `detalhe` entre a 104 e a 107 (ver comentário da 107).
create or replace function public.salvar_eventos_odontograma(
  p_ficha_id    uuid,
  p_clinica_id  uuid,
  p_paciente_id uuid,
  p_eventos     jsonb
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

  delete from public.odontograma_eventos
  where ficha_id = p_ficha_id and clinica_id = p_clinica_id
    and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_eventos) e);

  insert into public.odontograma_eventos (
    id, clinica_id, paciente_id, dentista_id, ficha_id, grupo_id, tipo, status,
    origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, observacao,
    detalhe, realizado_em, momento_planejado
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
    coalesce(nullif(e->>'momento_planejado', ''), 'sessao_atual')
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
  'Upsert atomico do event-log do odontograma por id estavel (R-01/107). R-101 (137) soma
   momento_planejado nas 3 posicoes - coluna sem isso grava sempre o DEFAULT da tabela, nunca
   o valor que o client manda.';

commit;

-- =====================================================================
-- 110 — detalhe clínico do encaminhado, escrita pelo DESTINO (R-04b)
--
-- Spec: plans/specs/R-04b-encaminhamento-detalhe-clinico.md
--
-- Complementa a 109 (concluir_evento_encaminhado, que só toca status/
-- realizado_em). Aqui o DESTINO de um encaminhamento grava a TABELA clínica
-- (detalhe jsonb) do que recebeu — canais do endo, dados do implante. Mesmo
-- padrão da 109: RPC SECURITY DEFINER porque o destino não é dono da linha
-- (dentista_id continua o autor) e a RLS de escrita (odontograma_eventos_write_own,
-- migration 101) não o alcança.
--
-- Estreita de propósito: só `detalhe`, e só em endo/implante. NUNCA toca
-- `observacao` — ela é do AUTOR (contexto do encaminhamento, R-04b Decisão 4),
-- nem status, tipo, âncora, autoria ou encaminhado_para. Marcar realizado
-- continua sendo a 109. Opera em 1 evento por chamada (detalhe não é ação em
-- lote como o status).
-- =====================================================================

begin;

create or replace function public.preencher_detalhe_encaminhado(
  p_evento_id  uuid,
  p_detalhe    jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := get_my_dentista_id();
  v_tipo   text;
begin
  select e.tipo into v_tipo
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = p_evento_id
    and e.clinica_id = get_my_clinica_id()
    and e.encaminhado_para = v_caller
    and f.assinado_em is null;

  -- linha inexistente / de outra clínica / não encaminhada a mim / ficha assinada → nega
  if v_tipo is null then
    raise exception 'sem_permissao';
  end if;
  if v_tipo not in ('endodontia', 'implante') then
    raise exception 'tipo_nao_suportado';
  end if;

  -- SET direto, nunca merge: o valor final (inclusive limpar pra null) é decidido na action,
  -- não no banco. NUNCA toca observacao — é do autor (Decisão 4).
  update public.odontograma_eventos
     set detalhe = p_detalhe
   where id = p_evento_id;
end;
$$;

comment on function public.preencher_detalhe_encaminhado is
  'Escrita estreita do DESTINO de um encaminhamento (R-04b): so o detalhe (tabela clinica),
   restrita a tipo in (endodontia, implante). NUNCA toca observacao (do autor), status, tipo,
   ancora, autoria nem encaminhado_para -- marcar realizado continua em concluir_evento_encaminhado
   (migration 109).';

revoke execute on function public.preencher_detalhe_encaminhado(uuid, jsonb) from anon, public;
grant  execute on function public.preencher_detalhe_encaminhado(uuid, jsonb) to authenticated;

commit;

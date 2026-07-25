-- =====================================================================
-- 109 — encaminhamento de procedimento a outro dentista (R-04, Fases 1-4)
--
-- Spec: plans/specs/R-04-encaminhar-procedimento.md
--
-- `odontograma_eventos.encaminhado_para` já existe desde a migration 106.
-- O AUTOR já pode gravar esse campo hoje: `odontograma_eventos_write_own`
-- (migration 101) é FOR ALL com dentista_id = get_my_dentista_id(), e o
-- ON CONFLICT DO UPDATE SET da migration 107 não toca a coluna, então
-- resalvar a ficha não apaga um encaminhamento existente.
--
-- O que falta é o caminho de escrita do DESTINO: ele não é o dono do evento
-- (dentista_id continua o autor), então a RLS de escrita não o alcança. Em
-- vez de abrir UPDATE geral da tabela pra quem tiver encaminhado_para = si
-- mesmo, esta RPC restringe a escrita a exatamente status + realizado_em
-- (Fases 1-4 = Opção B do #2) — nunca tipo, âncora, detalhe, observação,
-- dentista_id ou ficha_id. Edição de detalhe/observação pelo destino é
-- R-04b, com RPC própria quando entrar na fila.
-- =====================================================================

begin;

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
  v_caller uuid := get_my_dentista_id();
  v_count  int;
begin
  if p_novo_status not in ('indicado','realizado') then
    raise exception 'status_invalido';
  end if;

  select count(*) into v_count
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = any(p_evento_ids)
    and e.clinica_id = get_my_clinica_id()
    and e.encaminhado_para = v_caller
    and f.assinado_em is null;

  if v_count <> coalesce(array_length(p_evento_ids, 1), 0) then
    raise exception 'sem_permissao';
  end if;

  update public.odontograma_eventos
     set status       = p_novo_status,
         realizado_em = case when p_novo_status = 'realizado' then p_realizado_em else null end
   where id = any(p_evento_ids);
end;
$$;

comment on function public.concluir_evento_encaminhado is
  'Escrita estreita do DESTINO de um encaminhamento (R-04): so status/realizado_em, nunca
   tipo/ancora/detalhe/autoria. O autor continua gravando pela RLS direta (write_own).';

revoke execute on function public.concluir_evento_encaminhado(uuid[], text, date) from anon, public;
grant  execute on function public.concluir_evento_encaminhado(uuid[], text, date) to authenticated;

create index if not exists idx_odontograma_eventos_encaminhado
  on public.odontograma_eventos (clinica_id, encaminhado_para, status)
  where encaminhado_para is not null;

commit;

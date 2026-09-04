-- R-153 — guardas independentes da UI para novos vínculos de orçamento.
-- Não reescreve nenhum dado histórico: só valida INSERTs novos.

create or replace function public.validar_item_orcamento_catalogo_dono()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento public.orcamentos%rowtype;
begin
  if new.procedimento_id is null then
    return new;
  end if;

  select * into v_orcamento
  from public.orcamentos o
  where o.id = new.orcamento_id
    and o.clinica_id = new.clinica_id;

  if not found or not exists (
    select 1
    from public.procedimentos p
    where p.id = new.procedimento_id
      and p.clinica_id = new.clinica_id
      and p.dentista_id = v_orcamento.dentista_id
  ) then
    raise exception 'orcamento_procedimento_de_outro_dentista';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_item_orcamento_catalogo_dono on public.orcamento_itens;
create trigger validar_item_orcamento_catalogo_dono
before insert or update of procedimento_id, clinica_id, orcamento_id on public.orcamento_itens
for each row execute function public.validar_item_orcamento_catalogo_dono();

create or replace function public.validar_evento_orcamento_da_ficha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento public.orcamentos%rowtype;
begin
  select * into v_orcamento
  from public.orcamentos o
  where o.id = new.orcamento_id
    and o.clinica_id = new.clinica_id;

  if not found or v_orcamento.ficha_id is null or not exists (
    select 1
    from public.odontograma_eventos e
    join public.fichas f on f.id = e.ficha_id
    where e.id = new.evento_id
      and e.clinica_id = new.clinica_id
      and e.ficha_id = v_orcamento.ficha_id
      and f.paciente_id = v_orcamento.paciente_id
      and e.origem = 'clinica'
      and coalesce(e.encaminhado_para, f.dentista_id) = v_orcamento.dentista_id
  ) then
    raise exception 'orcamento_evento_ficha_invalido';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_evento_orcamento_da_ficha on public.orcamento_eventos;
create trigger validar_evento_orcamento_da_ficha
before insert on public.orcamento_eventos
for each row execute function public.validar_evento_orcamento_da_ficha();

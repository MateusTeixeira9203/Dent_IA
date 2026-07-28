-- Fix de hardening (achado pelo advisor de segurança logo após a 111): a função de trigger
-- bloquear_edicao_evento_assinado ficou sem search_path fixo, diferente de toda outra função
-- do projeto (inclusive assinar_procedimentos, no mesmo migration 111).
create or replace function public.bloquear_edicao_evento_assinado()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.assinatura_id is not null then
    raise exception 'evento_assinado_imutavel';
  end if;
  return coalesce(new, old);
end;
$$;

-- Migration 120: get_my_dentista_id() passa a filtrar pela clínica ativa (R-29)
--
-- Dívida que sobrou da hierarquia 3.1 (18/07): a função de RLS ignora clinica_id e não tem
-- ORDER BY — SELECT id FROM dentistas WHERE user_id = auth.uid() LIMIT 1. Pra um usuário com
-- perfil em 2 clínicas, devolve uma linha arbitrária. Confirmado rodando a query real: com a
-- conta de teste operando na Império, devolvia o dentista_id da Teste01.
--
-- App (requireClinicContext, getDentistaCached) já filtra por clinica_id — só a RLS
-- discordava de quem o usuário é. Toda policy que chama esta função herdava o furo:
-- orcamentos_select/update/delete_own, pagamentos_access, orcamento_itens_select/update/
-- delete_own, fichas_write_own.
--
-- Espelha o padrão que get_my_role() já usa (u.active_clinica_id) — não inventa fonte nova.
--
-- Índice único que garante no máximo 1 perfil por (usuário, clínica) e torna esta função
-- determinística já existe — idx_dentistas_clinica_user, UNIQUE (clinica_id, user_id).
-- Nada a criar aqui (a spec original errou ao afirmar que não existia).

create or replace function public.get_my_dentista_id()
returns uuid
language sql
stable security definer
set search_path to 'public'
as $function$
  select d.id
  from public.dentistas d
  join public.users u on u.id = auth.uid()
  where d.user_id = auth.uid()
    and d.clinica_id = u.active_clinica_id
  limit 1;
$function$;

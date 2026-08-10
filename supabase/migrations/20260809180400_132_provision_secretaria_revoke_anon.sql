-- Achado do advisor (nao introduzido por esta sessao, so ampliado por ela): anon tinha
-- EXECUTE em provision_secretaria -- SECURITY DEFINER, sem checagem de autorizacao
-- interna (quem e' admin de p_clinica_id e' checado so na app, em team.ts:35-37).
-- Sem login nenhum daria pra chamar /rest/v1/rpc/provision_secretaria e criar usuario
-- em qualquer clinica. Revogado -- mesmo padrao que ja existe em quase toda outra
-- SECURITY DEFINER do projeto (so esta e can_act_as_dentista escaparam da faxina
-- anterior; can_act_as_dentista fica fora do escopo desta sessao, nao foi tocada aqui).

REVOKE EXECUTE ON FUNCTION public.provision_secretaria(uuid, text, text, uuid, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provision_secretaria(uuid, text, text, uuid, text, uuid, text) FROM anon;

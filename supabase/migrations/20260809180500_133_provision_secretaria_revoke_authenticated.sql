-- criarSecretaria() (team.ts) chama esta RPC via createServiceClient() -- SUPABASE_SERVICE_ROLE_KEY,
-- que sempre tem acesso independente de GRANT. Nenhum caminho legitimo do app chama esta
-- RPC como usuario autenticado comum. Revoga tambem de authenticated -- so service_role
-- (e postgres) devem poder executar.

REVOKE EXECUTE ON FUNCTION public.provision_secretaria(uuid, text, text, uuid, text, uuid, text) FROM authenticated;

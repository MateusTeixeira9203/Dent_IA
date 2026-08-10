-- Corrige a migration 130: CREATE OR REPLACE com assinatura diferente criou uma
-- SOBRECARGA em vez de substituir -- ficaram 2 versoes de provision_secretaria (6 e 7
-- parametros), o que pode ambiguar a chamada via RPC. So deve existir a versao com p_role.

DROP FUNCTION IF EXISTS public.provision_secretaria(uuid, text, text, uuid, text, uuid);

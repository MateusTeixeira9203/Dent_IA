-- R-94 secao 4.4, opcao (b): provision_secretaria ganha p_role (default 'secretaria')
-- pra tambem provisionar protetico. O insert em secretarias (must_change_password)
-- fica condicional -- protetico nao tem tabela de perfil propria nem esse fluxo
-- (nao pedido na spec; dashboard/layout.tsx so ativa esse guard p/ role secretaria).
--
-- NOTA: esta migration usa CREATE OR REPLACE com uma assinatura DIFERENTE da funcao
-- existente (parametro p_role novo) -- isso cria uma SOBRECARGA em vez de substituir,
-- deixando 2 versoes da funcao no banco. Corrigido na migration seguinte (131), que
-- remove a versao antiga de 6 parametros. Documentado aqui porque foi o que realmente
-- aconteceu ao aplicar, nao para ser reproduzido -- rode 130+131 juntas.

CREATE OR REPLACE FUNCTION public.provision_secretaria(
  p_uid uuid,
  p_email text,
  p_nome text,
  p_clinica_id uuid,
  p_telefone text DEFAULT NULL::text,
  p_invited_by uuid DEFAULT NULL::uuid,
  p_role text DEFAULT 'secretaria'::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_uid IS NULL OR p_email IS NULL OR p_nome IS NULL OR p_clinica_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: campos obrigatórios ausentes';
  END IF;

  IF p_role NOT IN ('secretaria', 'protetico') THEN
    RAISE EXCEPTION 'INVALID_ROLE: provision_secretaria só provisiona secretaria ou protetico';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   clinica_usuarios
    WHERE  usuario_id = p_uid
      AND  clinica_id = p_clinica_id
      AND  status     = 'ativo'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_MEMBERSHIP: usuário já é membro ativo desta clínica';
  END IF;

  INSERT INTO public.users (id, email, active_clinica_id)
  VALUES (p_uid, p_email, p_clinica_id)
  ON CONFLICT (id) DO UPDATE
    SET email             = EXCLUDED.email,
        active_clinica_id = EXCLUDED.active_clinica_id;

  INSERT INTO dentistas (clinica_id, user_id, nome, email, telefone, role, ativo)
  VALUES (p_clinica_id, p_uid, p_nome, p_email, p_telefone, p_role, true)
  ON CONFLICT (clinica_id, user_id) DO UPDATE
    SET nome     = EXCLUDED.nome,
        email    = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        role     = p_role,
        ativo    = true;

  INSERT INTO clinica_usuarios (usuario_id, clinica_id, role, status, invited_by, joined_at)
  VALUES (p_uid, p_clinica_id, p_role, 'ativo', p_invited_by, now());

  IF p_role = 'secretaria' THEN
    INSERT INTO secretarias (usuario_id, clinica_id, nome, telefone, must_change_password)
    VALUES (p_uid, p_clinica_id, p_nome, p_telefone, true)
    ON CONFLICT (usuario_id, clinica_id) DO UPDATE
      SET nome                 = EXCLUDED.nome,
          telefone             = EXCLUDED.telefone,
          must_change_password = true;
  END IF;
END;
$function$

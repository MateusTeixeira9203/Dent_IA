-- Migration 118: has_active_membership() escopa o fallback por clínica (R-35 item 9)
--
-- Achado da auditoria 29/07: has_active_membership() tem 2 caminhos —
--   1) clinica_usuarios casado com users.active_clinica_id (correto, escopado)
--   2) fallback: EXISTS dentistas WHERE user_id = auth.uid() AND ativo = true
--      (SEM casar clínica nenhuma)
--
-- O fallback existe pra cobrir contas antigas com linha em `dentistas` sem membership
-- correspondente em `clinica_usuarios`. Mas do jeito que está, um usuário removido da
-- clínica A (active_clinica_id ainda aponta pra lá) continua com has_active_membership()
-- = true enquanto for dentista ativo em QUALQUER outra clínica B — retenção de acesso
-- após remoção. belongs_to_active_clinic(A) herda o furo (chama esta função).
--
-- Verificado: 0 casos hoje (todos os 12 usuários têm membership na clínica ativa) —
-- corrige antes de virar incidente, não incidente confirmado.
--
-- Fix: o fallback passa a exigir dentistas.clinica_id = users.active_clinica_id, igual
-- ao primeiro caminho — mantém a cobertura pra conta antiga sem clinica_usuarios, mas só
-- para a clínica que está de fato ativa pro usuário.

CREATE OR REPLACE FUNCTION public.has_active_membership()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinica_usuarios cu
    JOIN public.users u ON u.id = auth.uid()
    WHERE cu.usuario_id = auth.uid()
      AND cu.clinica_id = u.active_clinica_id
      AND cu.status = 'ativo'
  )
  OR EXISTS (
    SELECT 1
    FROM public.dentistas d
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.user_id = auth.uid()
      AND d.ativo = true
      AND d.clinica_id = u.active_clinica_id
  )
$function$;

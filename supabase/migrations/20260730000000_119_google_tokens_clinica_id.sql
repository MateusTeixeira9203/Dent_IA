-- Migration 119: google_tokens ganha clinica_id (R-35 item 7)
--
-- Achado da auditoria 29/07: google_tokens foi criada sem clinica_id — viola a regra
-- inegociável do CLAUDE.md ("toda tabela multi-tenant tem clinica_id + RLS"). A policy viva
-- (google_tokens_own) já escopa corretamente por clínica ATIVA via join em dentistas
-- (dentista_id IN (SELECT id FROM dentistas WHERE user_id = auth.uid() AND clinica_id =
-- get_my_clinica_id())) — não é o furo de RLS que a spec original supôs — mas depende
-- inteiramente dessa indireção. clinica_id direto é defesa em profundidade: credencial de
-- terceiro (token OAuth em texto puro) merece o mesmo padrão explícito que fichas/pagamentos.
--
-- 0 linhas na tabela hoje — NOT NULL sem default é seguro, nada pra violar a constraint.

ALTER TABLE public.google_tokens
  ADD COLUMN clinica_id uuid NOT NULL REFERENCES public.clinicas(id);

DROP POLICY IF EXISTS "google_tokens_own" ON public.google_tokens;

CREATE POLICY "google_tokens_own"
ON public.google_tokens FOR ALL
USING (
  clinica_id = public.get_my_clinica_id()
  AND dentista_id IN (
    SELECT id FROM public.dentistas
    WHERE user_id = auth.uid() AND clinica_id = public.get_my_clinica_id()
  )
)
WITH CHECK (
  clinica_id = public.get_my_clinica_id()
  AND dentista_id IN (
    SELECT id FROM public.dentistas
    WHERE user_id = auth.uid() AND clinica_id = public.get_my_clinica_id()
  )
);

-- Migration 117: bucket avatars privado + policies escopadas (R-35 item 1, P0)
--
-- Achado da auditoria 29/07: bucket avatars é public=true com foto de paciente real
-- legível sem login (sem fronteira de clínica), e as únicas policies de escrita
-- (avatars_authenticated_upload / avatars_own_update / avatars_own_delete) só checam
-- auth.uid() IS NOT NULL — qualquer usuário autenticado, de qualquer clínica, apaga
-- ou substitui qualquer avatar do sistema.
--
-- Decisão do Mateus 29/07: a feature de foto de paciente é removida do app (não
-- reintroduzir o caminho pacientes/...); o arquivo real que já está no bucket
-- (pacientes/<id>/...) fica onde está, só deixa de ser alcançável.
--
-- Correção, mesmo padrão da migration 058 (bucket fichas):
--   1. Bucket privado (public = false)
--   2. Policies escopadas por dono (avatar de dentista, path {user_id}/...) ou por
--      clínica (logo, path clinicas/{clinica_id}/...) — mesmo helper get_my_clinica_id()
--      usado em fichas_objects_*
--   3. Sem policy para o caminho pacientes/... — fica fechado por padrão de RLS

UPDATE storage.buckets SET public = false WHERE id = 'avatars';

DROP POLICY IF EXISTS "avatars_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_delete" ON storage.objects;

-- Avatar de dentista: só o dono, path = {user_id}/avatar.*
CREATE POLICY "avatars_own_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "avatars_own_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "avatars_own_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "avatars_own_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

-- Logo da clínica: só quem é da clínica, path = clinicas/{clinica_id}/*
CREATE POLICY "avatars_clinic_logo_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'clinicas'
  AND split_part(name, '/', 2) = public.get_my_clinica_id()::text
);

CREATE POLICY "avatars_clinic_logo_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'clinicas'
  AND split_part(name, '/', 2) = public.get_my_clinica_id()::text
);

CREATE POLICY "avatars_clinic_logo_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'clinicas'
  AND split_part(name, '/', 2) = public.get_my_clinica_id()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'clinicas'
  AND split_part(name, '/', 2) = public.get_my_clinica_id()::text
);

CREATE POLICY "avatars_clinic_logo_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'clinicas'
  AND split_part(name, '/', 2) = public.get_my_clinica_id()::text
);

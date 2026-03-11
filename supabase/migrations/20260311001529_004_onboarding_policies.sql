-- Migration: 004_onboarding_policies.sql
-- Policies para permitir onboarding: criar clinica e dentista na primeira vez

-- Clinicas: permitir INSERT para usuários autenticados (criação no onboarding)
DROP POLICY IF EXISTS clinicas_insert_policy ON clinicas;
CREATE POLICY clinicas_insert_policy ON clinicas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Dentistas: permitir INSERT quando user_id = auth.uid() (onboarding)
DROP POLICY IF EXISTS dentistas_insert_own_policy ON dentistas;
CREATE POLICY dentistas_insert_own_policy ON dentistas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

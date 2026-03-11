-- Migration: 005_fix_dentistas_rls_recursion.sql
-- Corrige recursão infinita na política RLS da tabela dentistas.
--
-- Problema: a policy "dentistas_all_policy" fazia subquery na própria tabela
-- dentistas dentro de uma política aplicada a dentistas → loop infinito.
--
-- Solução: função SECURITY DEFINER que executa fora do contexto RLS,
-- usada tanto em dentistas quanto nas demais tabelas.

-- ============================================================
-- Função auxiliar: retorna o clinica_id do usuário autenticado
-- SECURITY DEFINER = ignora RLS ao executar, quebrando o loop
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinica_id
  FROM dentistas
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- Corrige política da tabela dentistas (causadora da recursão)
-- ============================================================
DROP POLICY IF EXISTS dentistas_all_policy ON dentistas;
CREATE POLICY dentistas_all_policy ON dentistas
  FOR ALL TO authenticated
  USING (clinica_id = get_my_clinica_id())
  WITH CHECK (clinica_id = get_my_clinica_id());

-- ============================================================
-- Atualiza demais políticas para usar a função (consistência)
-- As políticas abaixo não causavam recursão, mas padronizamos
-- ============================================================

-- pacientes
DROP POLICY IF EXISTS pacientes_all_policy ON pacientes;
CREATE POLICY pacientes_all_policy ON pacientes
  FOR ALL TO authenticated
  USING (clinica_id = get_my_clinica_id())
  WITH CHECK (clinica_id = get_my_clinica_id());

-- procedimentos
DROP POLICY IF EXISTS procedimentos_all_policy ON procedimentos;
CREATE POLICY procedimentos_all_policy ON procedimentos
  FOR ALL TO authenticated
  USING (clinica_id = get_my_clinica_id())
  WITH CHECK (clinica_id = get_my_clinica_id());

-- fichas
DROP POLICY IF EXISTS fichas_all_policy ON fichas;
CREATE POLICY fichas_all_policy ON fichas
  FOR ALL TO authenticated
  USING (clinica_id = get_my_clinica_id())
  WITH CHECK (clinica_id = get_my_clinica_id());

-- orcamentos
DROP POLICY IF EXISTS orcamentos_all_policy ON orcamentos;
CREATE POLICY orcamentos_all_policy ON orcamentos
  FOR ALL TO authenticated
  USING (clinica_id = get_my_clinica_id())
  WITH CHECK (clinica_id = get_my_clinica_id());

-- orcamento_itens
DROP POLICY IF EXISTS orcamento_itens_all_policy ON orcamento_itens;
CREATE POLICY orcamento_itens_all_policy ON orcamento_itens
  FOR ALL TO authenticated
  USING (clinica_id = get_my_clinica_id())
  WITH CHECK (clinica_id = get_my_clinica_id());

-- clinicas: mantém lógica de acesso pela clinica_id do dentista
DROP POLICY IF EXISTS clinicas_select_policy ON clinicas;
CREATE POLICY clinicas_select_policy ON clinicas
  FOR SELECT TO authenticated
  USING (id = get_my_clinica_id());

-- Migration: 006_procedimentos_padrao_write_policy.sql
-- Permite usuários autenticados inserir e atualizar procedimentos padrão
-- Necessário para a aba Configurações > Procedimentos

DROP POLICY IF EXISTS procedimentos_padrao_write_policy ON procedimentos_padrao;
CREATE POLICY procedimentos_padrao_write_policy ON procedimentos_padrao
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

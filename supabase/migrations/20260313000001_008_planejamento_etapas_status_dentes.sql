-- Adiciona colunas de dentes (múltiplos) e status às etapas do planejamento
ALTER TABLE planejamento_etapas
  ADD COLUMN IF NOT EXISTS dentes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberto';

-- Constraint de status
ALTER TABLE planejamento_etapas
  DROP CONSTRAINT IF EXISTS planejamento_etapas_status_check;
ALTER TABLE planejamento_etapas
  ADD CONSTRAINT planejamento_etapas_status_check
  CHECK (status IN ('aberto', 'pendente', 'concluido'));

-- Trigger updated_at para planejamentos (se não existir)
DROP TRIGGER IF EXISTS planejamentos_updated_at ON planejamentos;
CREATE TRIGGER planejamentos_updated_at
  BEFORE UPDATE ON planejamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS para planejamentos
ALTER TABLE planejamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planejamentos_all_policy ON planejamentos;
CREATE POLICY planejamentos_all_policy ON planejamentos
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

-- RLS para planejamento_etapas
ALTER TABLE planejamento_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planejamento_etapas_all_policy ON planejamento_etapas;
CREATE POLICY planejamento_etapas_all_policy ON planejamento_etapas
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

-- Trigger updated_at para planejamento_etapas
DROP TRIGGER IF EXISTS planejamento_etapas_updated_at ON planejamento_etapas;
CREATE TRIGGER planejamento_etapas_updated_at
  BEFORE UPDATE ON planejamento_etapas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

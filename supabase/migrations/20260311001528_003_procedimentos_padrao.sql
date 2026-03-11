-- Migration: 003_procedimentos_padrao.sql
-- Também: policy para usuário verificar se tem dentista (onboarding check)

-- Policy: permite usuário autenticado ler seu próprio registro em dentistas
DROP POLICY IF EXISTS dentistas_select_own_policy ON dentistas;
CREATE POLICY dentistas_select_own_policy ON dentistas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Tabela procedimentos_padrao
CREATE TABLE IF NOT EXISTS procedimentos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL,
  preco_sugerido numeric(10,2) NOT NULL DEFAULT 0,
  duracao_minutos int NOT NULL DEFAULT 30,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedimentos_padrao_ativo ON procedimentos_padrao(ativo);

ALTER TABLE procedimentos_padrao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procedimentos_padrao_select_policy ON procedimentos_padrao;
CREATE POLICY procedimentos_padrao_select_policy ON procedimentos_padrao
  FOR SELECT TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS procedimentos_padrao_updated_at ON procedimentos_padrao;
CREATE TRIGGER procedimentos_padrao_updated_at
  BEFORE UPDATE ON procedimentos_padrao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO procedimentos_padrao (nome, descricao, categoria, preco_sugerido, duracao_minutos, ativo) VALUES
  ('Consulta inicial', 'Avaliação clínica e planejamento', 'Consulta', 150.00, 30, true),
  ('Consulta de retorno', 'Retorno para acompanhamento', 'Consulta', 80.00, 15, true),
  ('Profilaxia', 'Limpeza e polimento dental', 'Preventivo', 200.00, 45, true),
  ('Restauração em resina', 'Restauração classe I ou II', 'Restauração', 250.00, 45, true),
  ('Extração simples', 'Extração de dente permanente', 'Cirurgia', 180.00, 30, true),
  ('Radiografia periapical', 'Exame radiográfico', 'Diagnóstico', 60.00, 10, true),
  ('Aplicação de flúor', 'Aplicação tópica de flúor', 'Preventivo', 80.00, 15, true),
  ('Clareamento dental', 'Clareamento em consultório', 'Estética', 800.00, 60, true),
  ('Canal (tratamento endodôntico)', 'Tratamento de canal', 'Endodontia', 600.00, 60, true),
  ('Avaliação ortodôntica', 'Consulta para planejamento ortodôntico', 'Ortodontia', 200.00, 45, true);

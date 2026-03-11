-- Migration: 001_core_tables.sql
-- DentAI - Tabelas principais multi-tenant
-- UUID PKs, clinica_id em todas, RLS, triggers updated_at

-- Função para atualizar updated_at (idempotente)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABELA: clinicas (tenant raiz, referenciada pelas demais)
-- =============================================================================
CREATE TABLE IF NOT EXISTS clinicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinicas_select_policy ON clinicas;
CREATE POLICY clinicas_select_policy ON clinicas
  FOR SELECT TO authenticated
  USING (id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS clinicas_updated_at ON clinicas;
CREATE TRIGGER clinicas_updated_at
  BEFORE UPDATE ON clinicas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: dentistas
-- =============================================================================
CREATE TABLE IF NOT EXISTS dentistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cro text,
  especialidade text,
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dentistas_clinica_id ON dentistas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_dentistas_user_id ON dentistas(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dentistas_clinica_user ON dentistas(clinica_id, user_id);

ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dentistas_all_policy ON dentistas;
CREATE POLICY dentistas_all_policy ON dentistas
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS dentistas_updated_at ON dentistas;
CREATE TRIGGER dentistas_updated_at
  BEFORE UPDATE ON dentistas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: pacientes
-- =============================================================================
CREATE TABLE IF NOT EXISTS pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text,
  email text,
  telefone text,
  data_nascimento date,
  endereco text,
  cidade text,
  estado text,
  whatsapp text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON pacientes(clinica_id, cpf);

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pacientes_all_policy ON pacientes;
CREATE POLICY pacientes_all_policy ON pacientes
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS pacientes_updated_at ON pacientes;
CREATE TRIGGER pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: procedimentos
-- =============================================================================
CREATE TABLE IF NOT EXISTS procedimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  codigo_tuss text,
  preco_padrao numeric(10,2),
  duracao_minutos int,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedimentos_clinica_id ON procedimentos(clinica_id);

ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procedimentos_all_policy ON procedimentos;
CREATE POLICY procedimentos_all_policy ON procedimentos
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS procedimentos_updated_at ON procedimentos;
CREATE TRIGGER procedimentos_updated_at
  BEFORE UPDATE ON procedimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: fichas
-- =============================================================================
CREATE TABLE IF NOT EXISTS fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  audio_url text,
  transcricao text,
  foto_ficha_url text,
  radiografia_url text,
  anotacoes text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'concluida')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fichas_clinica_id ON fichas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_fichas_paciente_id ON fichas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_fichas_dentista_id ON fichas(dentista_id);
CREATE INDEX IF NOT EXISTS idx_fichas_status ON fichas(clinica_id, status);

ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fichas_all_policy ON fichas;
CREATE POLICY fichas_all_policy ON fichas
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS fichas_updated_at ON fichas;
CREATE TRIGGER fichas_updated_at
  BEFORE UPDATE ON fichas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: orcamentos
-- =============================================================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  ficha_id uuid NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado')),
  validade_dias int NOT NULL DEFAULT 30,
  condicoes_pagamento text,
  total numeric(10,2),
  pdf_url text,
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_clinica_id ON orcamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_ficha_id ON orcamentos(ficha_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_paciente_id ON orcamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_dentista_id ON orcamentos(dentista_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(clinica_id, status);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orcamentos_all_policy ON orcamentos;
CREATE POLICY orcamentos_all_policy ON orcamentos
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS orcamentos_updated_at ON orcamentos;
CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: orcamento_itens
-- =============================================================================
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  orcamento_id uuid NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  procedimento_id uuid REFERENCES procedimentos(id) ON DELETE SET NULL,
  descricao text,
  dente text,
  quantidade int NOT NULL DEFAULT 1,
  preco_unitario numeric(10,2),
  preco_total numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_clinica_id ON orcamento_itens(clinica_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_procedimento_id ON orcamento_itens(procedimento_id);

ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orcamento_itens_all_policy ON orcamento_itens;
CREATE POLICY orcamento_itens_all_policy ON orcamento_itens
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS orcamento_itens_updated_at ON orcamento_itens;
CREATE TRIGGER orcamento_itens_updated_at
  BEFORE UPDATE ON orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

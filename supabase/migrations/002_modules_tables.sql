-- Migration: 002_modules_tables.sql
-- DentAI - Módulos: agenda, bot WhatsApp, caixa, configurações
-- Mesmas regras: UUID PK, clinica_id, RLS, updated_at trigger

-- =============================================================================
-- TABELA: horarios_disponiveis
-- =============================================================================
CREATE TABLE IF NOT EXISTS horarios_disponiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  dia_semana int NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  intervalo_minutos int NOT NULL DEFAULT 30,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_horarios_disponiveis_clinica_id ON horarios_disponiveis(clinica_id);
CREATE INDEX IF NOT EXISTS idx_horarios_disponiveis_dentista_id ON horarios_disponiveis(dentista_id);
CREATE INDEX IF NOT EXISTS idx_horarios_disponiveis_dentista_dia ON horarios_disponiveis(dentista_id, dia_semana);

ALTER TABLE horarios_disponiveis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS horarios_disponiveis_all_policy ON horarios_disponiveis;
CREATE POLICY horarios_disponiveis_all_policy ON horarios_disponiveis
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS horarios_disponiveis_updated_at ON horarios_disponiveis;
CREATE TRIGGER horarios_disponiveis_updated_at
  BEFORE UPDATE ON horarios_disponiveis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: agendamentos
-- =============================================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  data_hora timestamptz NOT NULL,
  duracao_minutos int NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'cancelado', 'realizado', 'faltou')),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'bot', 'app')),
  observacoes text,
  confirmado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_id ON agendamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_id ON agendamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_dentista_id ON agendamentos(dentista_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON agendamentos(clinica_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(clinica_id, status);

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agendamentos_all_policy ON agendamentos;
CREATE POLICY agendamentos_all_policy ON agendamentos
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS agendamentos_updated_at ON agendamentos;
CREATE TRIGGER agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: conversas_bot
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversas_bot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id uuid REFERENCES pacientes(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  etapa text NOT NULL DEFAULT 'inicio',
  contexto jsonb NOT NULL DEFAULT '{}',
  ultimo_contato timestamptz NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversas_bot_clinica_id ON conversas_bot(clinica_id);
CREATE INDEX IF NOT EXISTS idx_conversas_bot_paciente_id ON conversas_bot(paciente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_bot_telefone ON conversas_bot(clinica_id, telefone);
CREATE INDEX IF NOT EXISTS idx_conversas_bot_ultimo_contato ON conversas_bot(clinica_id, ultimo_contato);

ALTER TABLE conversas_bot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversas_bot_all_policy ON conversas_bot;
CREATE POLICY conversas_bot_all_policy ON conversas_bot
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS conversas_bot_updated_at ON conversas_bot;
CREATE TRIGGER conversas_bot_updated_at
  BEFORE UPDATE ON conversas_bot
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: mensagens_bot
-- =============================================================================
CREATE TABLE IF NOT EXISTS mensagens_bot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES conversas_bot(id) ON DELETE CASCADE,
  direcao text NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'documento')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_bot_clinica_id ON mensagens_bot(clinica_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_bot_conversa_id ON mensagens_bot(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_bot_created_at ON mensagens_bot(conversa_id, created_at);

ALTER TABLE mensagens_bot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mensagens_bot_all_policy ON mensagens_bot;
CREATE POLICY mensagens_bot_all_policy ON mensagens_bot
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS mensagens_bot_updated_at ON mensagens_bot;
CREATE TRIGGER mensagens_bot_updated_at
  BEFORE UPDATE ON mensagens_bot
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: pagamentos
-- =============================================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  orcamento_id uuid NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL,
  forma_pagamento text CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'outro')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  data_vencimento date,
  data_pagamento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_clinica_id ON pagamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_orcamento_id ON pagamentos(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_paciente_id ON pagamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_dentista_id ON pagamentos(dentista_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_vencimento ON pagamentos(clinica_id, data_vencimento);

ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagamentos_all_policy ON pagamentos;
CREATE POLICY pagamentos_all_policy ON pagamentos
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS pagamentos_updated_at ON pagamentos;
CREATE TRIGGER pagamentos_updated_at
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABELA: configuracoes_clinica (uma config por clínica)
-- =============================================================================
CREATE TABLE IF NOT EXISTS configuracoes_clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL UNIQUE REFERENCES clinicas(id) ON DELETE CASCADE,
  nome_clinica text,
  telefone text,
  endereco text,
  horario_atendimento text,
  mensagem_boas_vindas text,
  mensagem_confirmacao text,
  mensagem_lembrete text,
  formas_pagamento jsonb NOT NULL DEFAULT '[]',
  aceita_convenio boolean NOT NULL DEFAULT false,
  convenios jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_clinica_clinica_id ON configuracoes_clinica(clinica_id);

ALTER TABLE configuracoes_clinica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracoes_clinica_all_policy ON configuracoes_clinica;
CREATE POLICY configuracoes_clinica_all_policy ON configuracoes_clinica
  FOR ALL TO authenticated
  USING (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()))
  WITH CHECK (clinica_id IN (SELECT clinica_id FROM dentistas WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS configuracoes_clinica_updated_at ON configuracoes_clinica;
CREATE TRIGGER configuracoes_clinica_updated_at
  BEFORE UPDATE ON configuracoes_clinica
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vincula orcamento_itens com planejamento_etapas
-- Permite que os itens de orçamento sejam gerados automaticamente
-- a partir das etapas do planejamento, com cascade ao deletar etapa.

ALTER TABLE orcamento_itens
  ADD COLUMN IF NOT EXISTS etapa_id uuid
    REFERENCES planejamento_etapas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_etapa_id
  ON orcamento_itens(etapa_id);

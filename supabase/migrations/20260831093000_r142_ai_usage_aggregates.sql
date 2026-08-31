-- R-142: observabilidade agregada do Dex. Todos os campos são aditivos e sem PHI.
ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS input_size INTEGER,
  ADD COLUMN IF NOT EXISTS output_items INTEGER,
  ADD COLUMN IF NOT EXISTS status_counts JSONB,
  ADD COLUMN IF NOT EXISTS evidence_counts JSONB,
  ADD COLUMN IF NOT EXISTS retry_count SMALLINT,
  ADD COLUMN IF NOT EXISTS http_status SMALLINT;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_input_size_nonnegative
  CHECK (input_size IS NULL OR input_size >= 0) NOT VALID;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_output_items_nonnegative
  CHECK (output_items IS NULL OR output_items >= 0) NOT VALID;

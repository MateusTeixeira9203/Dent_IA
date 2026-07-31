-- 126 — R-31a §3.4: CPF é identificador de pessoa, passa a ser único por clínica.
-- Índice parcial: ~95% dos pacientes não têm CPF e ficam de fora (WHERE cpf IS NOT NULL).
-- Pré-requisito conferido: zero CPF repetido hoje — aplica limpo, sem limpeza prévia.
--
-- Spec pedia CONCURRENTLY (evita lock de escrita durante a criação); o executor de
-- migration do MCP roda dentro de uma transação e CONCURRENTLY não é permitido nesse
-- contexto (25001). Trocado pela versão simples — em 238 linhas o lock dura
-- microssegundos, o motivo de usar CONCURRENTLY não se aplica nesta escala.

CREATE UNIQUE INDEX IF NOT EXISTS uq_pacientes_clinica_cpf
  ON public.pacientes (clinica_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';

-- DOWN: DROP INDEX uq_pacientes_clinica_cpf;

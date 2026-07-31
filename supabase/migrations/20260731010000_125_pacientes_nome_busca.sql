-- 125 — R-31a §3.3: nome_busca, definição única de "mesmo nome" pra busca (insensível a
-- acento), checagem de duplicata (§3.1) e o relatório de grupos da R-31b. Sem extensão
-- unaccent (não instalada neste banco) — translate()+lower() são IMMUTABLE, indexáveis
-- direto, unaccent() não é.

ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS nome_busca text;

CREATE OR REPLACE FUNCTION public.normalizar_nome(txt text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT lower(regexp_replace(translate(btrim(txt),
    'áàâãäéèêëíìîïóòôõöúùûüñçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'), '\s+', ' ', 'g'))
$$;

-- Backfill — nunca toca `nome`, só preenche a coluna derivada (G6 do R-31a).
UPDATE public.pacientes
   SET nome_busca = public.normalizar_nome(nome)
 WHERE nome_busca IS DISTINCT FROM public.normalizar_nome(nome);

-- Mantém nome_busca sincronizada daqui pra frente — todo INSERT, e todo UPDATE que mexer
-- em `nome` (trigger não dispara nos demais UPDATEs, então não onera o resto da tabela).
CREATE OR REPLACE FUNCTION public.trg_pacientes_nome_busca() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.nome_busca := public.normalizar_nome(NEW.nome);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pacientes_nome_busca ON public.pacientes;
CREATE TRIGGER trg_pacientes_nome_busca
  BEFORE INSERT OR UPDATE OF nome ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.trg_pacientes_nome_busca();

-- Backfill já rodou acima — a partir daqui a coluna nunca fica para trás do nome.
ALTER TABLE public.pacientes ALTER COLUMN nome_busca SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_nome_busca ON public.pacientes (clinica_id, nome_busca);

-- DOWN: DROP INDEX idx_pacientes_nome_busca; DROP TRIGGER trg_pacientes_nome_busca ON
-- pacientes; DROP FUNCTION trg_pacientes_nome_busca; DROP FUNCTION normalizar_nome(text);
-- ALTER TABLE pacientes DROP COLUMN nome_busca. `nome` nunca foi tocado — reversível sem perda.

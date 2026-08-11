-- R-99 — anotação de radiografia: overlay (coordenada + tipo) guardado na própria seção.
-- Nunca regrava a imagem original (invariante I1) — só o array de marcadores.
alter table planejamento_secoes
  add column if not exists anotacoes jsonb not null default '[]'::jsonb;
-- Só tem sentido quando tipo='imagem'; nas demais linhas fica '[]' e nunca é lido.
-- Sem tabela própria: dado pequeno, por-seção, sem índice ou join necessário.

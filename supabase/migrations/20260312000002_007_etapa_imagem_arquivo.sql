-- Adiciona coluna de imagem (raio-x) às etapas do planejamento
ALTER TABLE planejamento_etapas
  ADD COLUMN imagem_arquivo_id uuid REFERENCES ficha_arquivos(id) ON DELETE SET NULL;

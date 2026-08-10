-- =====================================================================
-- 134 — Apresentar visual: tipo de bloco (R-98a)
--
-- Spec: plans/specs/R-98-apresentar-visual-blocos-modelo.md §4.1
--
-- A seção do Apresentar ganha tipo: texto (título+corpo, como sempre foi),
-- imagem (1 documento em tela cheia) ou odontograma (boca inteira, derivado
-- de odontograma_eventos, sem escolha manual de dente).
--
-- Sem backfill de conteúdo: as 7 linhas existentes (4 com título vazio)
-- viram 'texto', que é exatamente o que sempre foram. Nenhuma apagada,
-- nenhuma reescrita.
-- =====================================================================

begin;

alter table public.planejamento_secoes
  add column if not exists tipo text not null default 'texto'
    check (tipo in ('texto', 'imagem', 'odontograma'));

comment on column public.planejamento_secoes.tipo is
  'R-98a — layout do bloco na apresentação: texto (título+corpo, como sempre foi), imagem
   (1 documento em tela cheia) ou odontograma (boca inteira, derivado de odontograma_eventos,
   sem escolha manual de dente). Ver plans/specs/R-98-apresentar-visual-blocos-modelo.md §4.1.';

commit;

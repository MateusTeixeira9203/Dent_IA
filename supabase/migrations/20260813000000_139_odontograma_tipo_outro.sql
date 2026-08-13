-- 139 — tipo genérico 'outro' no odontograma
--
-- Spec: plans/specs/R-107b-perfil-do-dente.md
--
-- Destrava o campo de busca livre do painel do dente: procedimento digitado sem tipo
-- estrutural correspondente (ex.: faceta) precisa de um valor de `tipo` pra existir como
-- evento. Pinta o dente com a cor do status (buildResumos não tem case pra 'outro' — cai
-- fora do switch, só a cor dominante, já setada antes do switch, se aplica). Sem símbolo
-- próprio, sem tabela de especialidade.
--
-- 100% aditiva: só amplia o vocabulário permitido, nenhum dado existente muda.

alter table public.odontograma_eventos drop constraint if exists odontograma_eventos_tipo_check;
alter table public.odontograma_eventos add constraint odontograma_eventos_tipo_check check (tipo in (
  'carie_restauracao','exodontia','endodontia','lesao_periapical',
  'implante','coroa','ponte','selante','inclusao','esfoliacao',
  'fratura','pino_nucleo',
  'exame_periodontal','profilaxia','raspagem','clareamento','fluor',
  'outro'
));

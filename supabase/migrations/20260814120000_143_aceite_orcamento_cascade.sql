-- =====================================================================
-- 143 — o aceite assinado deixa de travar a exclusao do orcamento
--
-- Reverte a decisao da migration 113 (R-03c-1), que criou a FK como
-- ON DELETE RESTRICT pra proteger a prova de aceite do paciente.
--
-- POR QUE MUDA. Decisao de 14/08: quem decide se apaga e o dentista, nao o
-- sistema. Ele ja recebe o aviso na tela -- "este orcamento tem aceite
-- assinado e pagamento recebido, tem certeza?" -- e a partir dai a
-- responsabilidade e dele. O RESTRICT tirava a escolha e deixava o
-- orcamento errado preso na lista pra sempre, sem caminho de saida.
--
-- O QUE ISSO SIGNIFICA. Apagar o orcamento passa a apagar junto a
-- assinatura de aceite -- a prova de que o paciente concordou com aquele
-- valor. As outras duas filhas (orcamento_itens, pagamentos) ja eram
-- CASCADE desde sempre; `assinaturas` era a unica RESTRICT.
--
-- O QUE NAO MUDA. Nada de INSERT/UPDATE em `assinaturas`: a tabela segue
-- com uma unica policy, a de SELECT. O cascade e acao referencial do
-- Postgres, executada pelo sistema -- nao precisa (e nao ganha) policy de
-- DELETE. Assinatura de ficha (`ficha_id`) e de paciente seguem CASCADE
-- como ja eram. Quem pode excluir o orcamento continua sendo so o dentista
-- dono (policy `orcamentos_delete_own`).
-- =====================================================================

alter table public.assinaturas
  drop constraint if exists assinaturas_orcamento_id_fkey;

alter table public.assinaturas
  add constraint assinaturas_orcamento_id_fkey
  foreign key (orcamento_id) references public.orcamentos(id) on delete cascade;

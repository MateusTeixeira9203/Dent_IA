-- 144 — R-113 (B2): fecha a assimetria de RLS em `orcamento_itens`
--
-- As 3 policies da tabela (migrations 089 e 098) tratam a secretária de 3 formas diferentes:
--
--   orcamento_itens_insert_own  can_act_as_dentista(o.dentista_id)     -> secretaria PASSA
--   orcamento_itens_update      is_own_clinical_record(o.dentista_id)  -> secretaria PASSA
--   orcamento_itens_delete_own  o.dentista_id = get_my_dentista_id()   -> secretaria BARRADA
--
-- `editarOrcamento` apaga todos os itens e reinsere. DELETE barrado por RLS devolve SUCESSO
-- com 0 linhas (nao erro), entao o INSERT rodava por cima do que nao saiu e a lista duplicava
-- a cada save da secretaria. Provado em producao (ClinDent): 3 orcamentos com item repetido,
-- o mais recente em 15/08. O B1 (codigo) ja faz a acao falhar honestamente; esta migration e
-- o que devolve a ela a capacidade de editar.
--
-- Alinha o DELETE ao MESMO predicado que o UPDATE da propria tabela ja usa. Nao inventa
-- permissao nova: se a secretaria ja podia alterar o item, apagar era a lacuna, nao a regra.
--
-- ⚠️ NAO SOBE SEM O GATE DE 2 CONTAS LOGADAS (regra do AGENTS.md — script nao pega furo de
--    policy). Gate G7 da spec R-113, roda na clinica "QA TESTE - apagar (financeiro)", que ja
--    tem 1 admin e 1 secretaria cadastradas: secretaria edita orcamento de um dentista da
--    clinica (deve funcionar, sem duplicar) e conta de outra clinica segue barrada.
--
-- Rollback (migration forward-only separada): recriar `orcamento_itens_delete_own` com o
-- predicado anterior `o.dentista_id = get_my_dentista_id()`. Isso volta a bloquear DELETE da
-- secretaria; o B1 no codigo continua impedindo duplicacao silenciosa durante o rollback.

drop policy if exists "orcamento_itens_delete_own" on public.orcamento_itens;

create policy "orcamento_itens_delete_own" on public.orcamento_itens
  for delete
  using (
    belongs_to_active_clinic(clinica_id)
    and exists (
      select 1 from public.orcamentos o
       where o.id = orcamento_itens.orcamento_id
         and is_own_clinical_record(o.dentista_id)
    )
  );

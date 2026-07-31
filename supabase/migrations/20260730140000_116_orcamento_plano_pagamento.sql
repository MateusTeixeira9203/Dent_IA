-- 116 — R-34: plano de pagamento do orçamento (colunas aditivas + índice único).
-- Aplicada via MCP em 30/07; este arquivo é o registro retroativo, texto idêntico ao rodado.

alter table public.orcamentos
  add column if not exists plano_forma            text,         -- 'avista' | 'parcelado' | null
  add column if not exists plano_parcelas         smallint,     -- null quando não parcelado
  add column if not exists plano_entrada_valor    numeric(10,2),
  add column if not exists plano_entrada_forma    text,
  add column if not exists plano_parcelas_forma   text,
  add column if not exists valor_acordado         numeric(10,2),-- null → usar total
  add column if not exists plano_definido_em      timestamptz,
  add column if not exists plano_definido_por_id  uuid references public.dentistas(id) on delete set null;

alter table public.orcamentos
  add constraint orcamentos_plano_forma_check check (
    plano_forma is null or plano_forma in ('avista','parcelado')),
  -- fecha o estado "parcelado sem N". Range igual ao que gerarParcelas já valida.
  add constraint orcamentos_plano_parcelas_coerente check (
    (plano_forma is distinct from 'parcelado' and plano_parcelas is null)
    or (plano_forma = 'parcelado' and plano_parcelas between 2 and 24)),
  -- MESMO vocabulário de pagamentos.forma_pagamento. Sem 'transferencia' de propósito.
  add constraint orcamentos_plano_formas_check check (
    (plano_entrada_forma  is null or plano_entrada_forma  in ('dinheiro','pix','cartao_credito','cartao_debito','boleto','outro'))
    and (plano_parcelas_forma is null or plano_parcelas_forma in ('dinheiro','pix','cartao_credito','cartao_debito','boleto','outro'))),
  add constraint orcamentos_valor_acordado_check check (valor_acordado is null or valor_acordado > 0),
  add constraint orcamentos_plano_entrada_check check (plano_entrada_valor is null or plano_entrada_valor > 0);

-- A trava que impede o conjunto duplicado de parcelas
create unique index if not exists uq_pagamentos_orcamento_parcela
  on public.pagamentos (orcamento_id, parcela_numero) where parcela_numero is not null;

-- Backfill: NÃO altera pagamentos. Só preenche colunas novas (todas NULL antes), derivando
-- o acordo do que já estava gravado. Idempotente pelo WHERE.
update public.orcamentos o
   set plano_forma = 'parcelado', plano_parcelas = p.total_parcelas,
       plano_parcelas_forma = p.forma_conhecida,
       valor_acordado = coalesce(o.total, p.soma_parcelas),
       plano_definido_em = p.criado_em, plano_definido_por_id = o.dentista_id
  from (select orcamento_id, max(total_parcelas) total_parcelas, sum(valor) soma_parcelas,
               min(created_at) criado_em,
               (array_agg(forma_pagamento) filter (where forma_pagamento is not null))[1] forma_conhecida
          from public.pagamentos where total_parcelas is not null group by orcamento_id) p
 where o.id = p.orcamento_id and o.plano_forma is null;

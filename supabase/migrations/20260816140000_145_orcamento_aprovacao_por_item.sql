-- 144 — R-114: aprovação por item + estado derivado do orçamento
--
-- Roda como PRIMEIRO passo do deploy do R-114, sozinha, antes do código.
-- O backfill mora aqui de propósito: sem ele, `default false` marca todo item existente como
-- não aprovado, todo orçamento vira `proposto`, e a invariante I8 impede QUALQUER parcelamento
-- em andamento de receber a próxima parcela. Column + backfill são atômicos.
--
-- Simulado contra produção em 16/08 (só leitura, sem escrita). ClinDent, 109 orçamentos:
--   aprovado -> aceito  51 | aprovado -> quitado 22
--   rascunho -> aceito  11 | rascunho -> quitado  3 | rascunho -> proposto 21
--   enviado  -> proposto 1
-- Nenhum orçamento com dinheiro recebido cai em `proposto`. 274 de 358 itens recebem true.

-- ── 1. A coluna ───────────────────────────────────────────────────────────────
alter table public.orcamento_itens
  add column if not exists aprovado boolean not null default false;

comment on column public.orcamento_itens.aprovado is
  'R-114 — true quando o paciente aprovou este item. Item nao aprovado continua visivel no '
  'orcamento (lista viva do que falta fechar); so nao conta no devido nem sai no PDF.';

-- ── 2. Backfill — obrigatório, ver cabeçalho ──────────────────────────────────
-- Regra: aprovado onde o orçamento pai ja estava `aprovado` OU ja recebeu dinheiro.
-- O segundo termo resgata os 31 itens que moram em rascunho mas tem pagamento pago — sem ele
-- esses travam a cobranca do saldo restante.
update public.orcamento_itens oi
   set aprovado = true
  from public.orcamentos o
 where o.id = oi.orcamento_id
   and (
     o.status = 'aprovado'
     or exists (
       select 1 from public.pagamentos p
        where p.orcamento_id = o.id and p.status = 'pago'
     )
   );

-- ── 3. O estado derivado ──────────────────────────────────────────────────────
-- View read-only. Nenhuma escrita nova, nenhuma tabela nova.
-- security_invoker = true: a RLS e aplicada com o papel de QUEM CONSULTA, nao do dono da view.
-- Sem isso a view viraria um bypass de silo entre dentistas (gate G8).
--
-- `valor_devido` = valor_acordado ?? soma dos aprovados. `valor_acordado` continua sendo
-- escrito SO pelas RPCs do R-34 (plano de pagamento) — a aprovacao por item nunca toca nele (I1).
create or replace view public.orcamentos_com_estado
with (security_invoker = true) as
select
  o.*,
  coalesce(ai.soma_aprovada, 0)                   as valor_aprovado,
  coalesce(pg.total_pago, 0)                      as valor_pago,
  coalesce(o.valor_acordado, ai.soma_aprovada, 0) as valor_devido,
  case
    when coalesce(ai.soma_aprovada, 0) = 0
      then 'proposto'
    when coalesce(pg.total_pago, 0) < coalesce(o.valor_acordado, ai.soma_aprovada, 0)
      then 'aceito'
    else 'quitado'
  end as estado
from public.orcamentos o
left join lateral (
  select sum(oi.preco_total) as soma_aprovada
    from public.orcamento_itens oi
   where oi.orcamento_id = o.id
     and oi.aprovado
) ai on true
left join lateral (
  select sum(p.valor) as total_pago
    from public.pagamentos p
   where p.orcamento_id = o.id
     and p.status = 'pago'
) pg on true;

grant select on public.orcamentos_com_estado to authenticated;

-- `orcamentos.status` NAO e dropada — fica inerte. Dropar e item futuro, depois de o estado
-- derivado estar verificado em producao.

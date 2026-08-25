# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-24

## Agora

🔵 **R-129 — Estabilização pós-varredura.** Plano de implementação pronto em
`plans/specs/R-129-estabilizacao-pos-varredura.md`; aguarda o comando do usuário para executar.

O corte começa no R-127. Tudo anterior foi declarado pronto e testado pelo usuário; achados
novos em telas antigas pertencem às specs filhas do R-129, sem reabrir os itens encerrados.

### Ordem aprovada para execução

1. QA/fechamento do R-127.
2. QA, commit e deploy isolado do R-128 (código local ainda não publicado).
3. R-129a — performance e hidratação.
4. R-129b — Agenda e modais mobile.
5. R-129e — edição explícita de ficha histórica.
6. R-129c — estado comercial verdadeiro.
7. R-129d — acessibilidade operacional.
8. Gate com dentista, secretária, protético, mobile real e Stripe.

## Estado local que deve ser preservado

- R-128 altera `registrar-painel.tsx` e `FichasTab.tsx` e adiciona o componente/lib/teste de
  escopo regional. TypeScript, build e 2 testes passaram; falta QA visual.
- `plans/auditorias/2026-08-24-resultado-varredura.md` e specs R-129 ainda não estão commitados.
- `supabase/.temp/*` e `tmp/` são alheios ao lote e não entram nos commits.

## Bloqueios

- Nenhum bloqueio de implementação conhecido.
- R-129c não sobe sem teste financeiro próprio; isenção precisa ser testada separadamente.
- Mudança inesperada de schema/API/RLS interrompe a execução e volta para planejamento.

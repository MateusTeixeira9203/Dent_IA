# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-25

## Agora

🔵 **R-130 — Compromisso da secretária, orçamento completo e ponte fixa.** Implementação
local pronta para validação em `plans/specs/R-130-compromisso-e-orcamento-operacional.md`.

O corte começa no R-127. Tudo anterior foi declarado pronto e testado pelo usuário; achados
novos em telas antigas pertencem às specs filhas do R-129, sem reabrir os itens encerrados.

## Estado local que deve ser preservado

- Migration `152_orcamento_eventos_ficha_completa.sql` foi aplicada em produção em 25/08:
  só altera a elegibilidade de eventos dentro da RPC já atômica para `origem='clinica'`; a
  exclusividade em `orcamento_eventos` permanece.
- TypeScript, ESLint e build de produção passaram. Falta executar os gates manuais de orçamento,
  ponte e agenda com dentista + secretária antes de publicar o código.
- `supabase/.temp/*` e `tmp/` são alheios ao lote e não entram nos commits.

## Bloqueios

- Nenhum bloqueio de implementação conhecido.
- Publish depende de confirmação explícita do usuário depois do teste local.

# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-23

## Agora

🔵 **R-126a — Estabilização mobile crítica.** Corrigir os recortes e compressões reais vistos
em produção na agenda, retorno, orçamento, protético e ficha antes do lançamento.

**Auditoria 24/08:** o P1 da RPC `salvar_eventos_odontograma` foi corrigido pela migration
`20260824033242` e validado em produção com rollback: evento cruzado é recusado e evento da
própria ficha segue aceito. Permanece o gate mobile; isolamento entre dentistas foi confirmado pelo usuário e Stripe será validado na primeira compra real (ou em modo teste se necessário).

### Feito nesta rodada

- **R-110 ✅:** grade de quarta 13h–18h e agendamento às 08h verificados em produção; a tela
  avisa e permite "Marcar mesmo assim". Criação e edição compartilham a mesma regra.

## Travado

- Nenhum bloqueio de código conhecido.
- Cobrança não deve ser ativada antes do E2E financeiro real (R-92 permanece localmente pronto).
- **Produção mobile — 23/08:** bloqueios reais de usabilidade ainda sem correção: retorno usa a
  grade semanal de desktop e afasta a confirmação; agenda diária/semanal é recortada; modal de
  orçamento preserva duas colunas e embaralha resumo/itens; cards da ficha comprimem conteúdo;
  encaminhamento ao protético precisa de reprodução específica. O onboarding pula de identidade
  para Dex/Meu Dia e, portanto, não alcança pagamento/checkout.

## Próximo da fila

Resend → limites/telemetria de IA → otimização do Dex → auditoria financeira completa.

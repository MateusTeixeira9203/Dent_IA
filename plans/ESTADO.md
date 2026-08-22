# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-22

## Agora

🔵 **R-92 — Assinatura individual Stripe.** Integração implementada e configurada para a oferta
Fundador: Consultório e Clínica por R$200/mês ou R$2.000/ano por dentista. Clínica exige 2–8
dentistas e formação em até 48 horas.

### Feito

- Checkout, portal, webhook idempotente, trial de 7 dias, carência e formação implementados.
- Quatro Prices Fundador, chaves live e segredo do webhook configurados no `.env.local`.
- Endpoint de produção definido em `https://odontoia.app/api/webhooks/stripe`.
- Migrations R-92, R-97, R-105 e R-120 aplicadas; R-97 conferida diretamente no schema.
- R-105, R-113, R-121, R-122 e R-123 validados localmente nos fluxos discutidos.
- R-125a e R-125b validados no localhost; migrations 150 e 151 aplicadas. Falta conferir o
  fluxo publicado antes de promovê-los a concluídos.
- TypeScript, testes unitários de billing/especialidades e build de produção passaram antes do push.

### Falta

1. Fazer E2E real do Consultório mensal e anual com um usuário novo.
2. Fazer E2E Clínica com duas contas e dois cartões, incluindo formação e migração.
3. Confirmar no Stripe que os eventos do webhook chegam e não geram duplicidade.
4. Testar R-97 com duas contas logadas antes de promovê-lo a verificado.
5. Manter `STRIPE_BILLING_ENABLED=false` até os gates financeiros acima passarem.

## Travado

- Nenhum bloqueio de código conhecido.
- Cobrança não deve ser ativada antes do E2E financeiro real.

## Esperando você

- Executar os fluxos reais de Checkout e portal após o deploy.
- Confirmar o teste de duas contas da gestão colaborativa.

## Próximo da fila

Resend → limites/telemetria de IA → otimização do Dex → auditoria financeira completa.

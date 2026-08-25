# R-129c — Estado comercial verdadeiro

> **SPEC** · **R-129c** · fase **plano — aguardando execução**
> **Aberto:** 2026-08-24 · **Migration:** zero prevista

## 1. Problema

Conta isenta pode aparecer como Consultório/Inativo/R$200 e receber CTA de checkout. O card de
indicação usa domínio aposentado e métricas fixas. Retorno de checkout pode esperar sem fim.

## 2. Decisão

Derivar um estado comercial único no servidor e passá-lo pronto à UI. Isenção vence qualquer
fallback legado. Indicação sem backend real não exibe números/promessa automática. Checkout
tem estado terminal orientando a repetir ou contatar suporte.

## 3. Contrato técnico

```ts
type EstadoComercial =
  | { tipo: 'isento'; plano: PlanoId }
  | { tipo: 'trial'; plano: PlanoId; terminaEm: string }
  | { tipo: 'ativo'; plano: PlanoId }
  | { tipo: 'past_due'; plano: PlanoId; graceEndsAt: string | null }
  | { tipo: 'suspenso'; plano: PlanoId }
  | { tipo: 'formacao'; plano: 'CLINICA'; expiresAt: string | null; cartoesProntos: number }
  | { tipo: 'inativo'; plano: PlanoId };
```

- Criar função server-only pura que combina isenção por env, assinatura individual, formação e
  fallback legado, nesta ordem.
- Configurações e `/planos` consomem o mesmo estado; não recalculam labels inline.
- `isento`: mostra `Acesso parceiro — sem cobrança`, plano real e nenhum portal/checkout/preço.
- `NEXT_PUBLIC_APP_URL` é a única origem do link público; valor inválido falha de forma visível.
- Até existir persistência de indicação, esconder estatísticas e trocar promessa por `Em breve`
  ou remover o card inteiro.
- Checkout após tentativas esgotadas mostra retry e canal de suporte; não libera acesso sem
  webhook nem inventa sucesso.

## 4. Estados e ações

| Estado | CTA permitido |
|---|---|
| Isento | nenhum CTA financeiro |
| Trial | assinar/gerenciar conforme customer existente |
| Ativo | portal Stripe |
| Past due | atualizar pagamento no portal |
| Suspenso | regularizar |
| Formação | continuar formação |
| Inativo | escolher plano |

## 5. Referência visual

Mesmos cards atuais. Mudar conteúdo/estado, não criar painel. Badge e mensagem usam tokens
semânticos existentes; isento usa teal neutro, sem preço riscado ou urgência falsa.

## 6. Invariantes

- Isenção nunca cria Checkout, Customer, assinatura ou webhook.
- Apenas webhook confirma assinatura.
- Secretária/protético herdam acesso da clínica e não veem checkout individual.
- Nenhuma chave Stripe ou ID sensível chega ao cliente.

## 7. Gates de aceite

- [ ] ClinDent/VIP/clínica teste isenta mostram plano correto e zero CTA financeiro.
- [ ] Conta ativa mostra portal; inativa mostra planos; past_due mostra prazo correto.
- [ ] Formação 1/2 e 2/2 não se confunde com assinatura ativa.
- [ ] Nenhum link contém `dentia.app.br`; todos usam `https://odontoia.app`.
- [ ] Zero estatística hardcoded apresentada como real.
- [ ] Webhook atrasado termina em estado acionável, sem loop infinito.
- [ ] Testes unitários cobrem a precedência dos sete estados.

## 8. Fora de escopo

- Programa de indicação real, cupons e mudança de preços/produtos Stripe.
- Nova migration; se faltar uma fonte persistida, a execução pausa para replanejar.

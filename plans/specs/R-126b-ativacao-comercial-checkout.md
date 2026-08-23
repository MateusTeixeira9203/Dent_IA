# R-126b — Ativação comercial e checkout obrigatório

> **SPEC** · **R-126b** · ⏳ fila
> **Aberto:** 2026-08-23 · **Fechado:** — · **Fase:** aprovada
> **Depende de:** R-92 e webhook Stripe configurados em produção.
> **Migration:** nenhuma prevista; só será adicionada se o inventário encontrar coluna ausente para o estado já modelado no R-92.

## 1. Problema

O onboarding atual cria a clínica, mas pula de identidade para Dex e Meu Dia. Plano, ciclo e
Stripe nunca são apresentados. Além disso, a escolha Clínica em `/planos` desvia para
Configurações, sem chamar `createCheckout`.

## 2. Decisão

Com `STRIPE_BILLING_ENABLED=true`, todo cadastro novo passa por plano e checkout antes da
apresentação Dex. O usuário cadastra cartão, recebe sete dias de trial na Stripe e só então segue
para Dex → Meu Dia. A Clínica entra em "formação" depois do checkout, mas o criador não fica
bloqueado: ele pode usar o sistema e tem até 48h para completar equipe ou migrar para Consultório.

Com a flag `false`, o fluxo atual de teste local continua sem cobrança deliberadamente.

## 3. Objetivo

Não existir conta comercial nova que chegue ao Meu Dia sem ter escolhido ciclo, plano e passado
pela confirmação do Checkout; sem ativar cobrança para ClinDent, VIP Odontologia ou contas já
isentas.

## 4. Contrato técnico

| Ponto | Mudança contratada |
|---|---|
| `onboarding-client.tsx` | Após `iniciarOnboarding` bem-sucedido e billing ativo, navega para `/planos?onboarding=1`; não chama `setStep('dex')` ainda. |
| `planos-client.tsx` | Lê `onboarding=1`, mantém ciclo mensal/anual e usa `createCheckout` para Solo **e** Clínica. Não desvia Clínica diretamente para Configurações. |
| `planos/actions.ts#createCheckout` | Permanece o único início de checkout. Para Clínica chama `iniciarFormacaoClinica` antes de criar a sessão; para Solo não cria formação. |
| retorno Stripe | `success_url` retorna a uma rota autenticada que confirma estado via webhook/banco, então apresenta Dex uma vez. Cancelamento retorna a `/planos?onboarding=1&cancelado=1`, sem marcar onboarding completo. |
| `marcarOnboardingCompleto` | Só é chamado depois de retorno comercial válido; nunca ao criar identidade. |
| acesso | Guard de billing já existente é a autoridade. Cliente nunca libera dashboard apenas pelo `success_url`; webhook Stripe sincroniza estado. |

O contrato de preços continua o do R-92: Fundador Solo ou Clínica, mensal R$200 e anual R$2.000;
Clínica é 2–8 dentistas e cada profissional tem sua própria assinatura. Este item não muda preço,
webhook, produto ou Price ID no Stripe.

## 5. Comportamento

### Cadastro Solo

1. Dentista informa identidade; clínica e contexto são criados.
2. Escolhe Solo e mensal/anual em `/planos`.
3. Checkout Stripe coleta cartão, cria trial de 7 dias e retorna ao aplicativo.
4. Com assinatura sincronizada, Dex aparece e então leva ao Meu Dia.

### Cadastro Clínica

1. Dentista escolhe Clínica e ciclo; o checkout é iniciado, nunca apenas um link para Configurações.
2. Após retorno válido, vê estado "Clínica em formação", convite de colega e prazo de 48h.
3. Pode usar pacientes, Meu Dia e fichas enquanto aguarda.
4. Ao expirar sem equipe mínima, recebe escolhas explícitas: reenviar convite ou migrar para Solo; não é bloqueado silenciosamente.

### Estados de erro

- Checkout cancelado: mantém a identidade, volta à escolha de plano, mostra mensagem e não inicia trial.
- Webhook pendente: página de retorno aguarda/pesquisa estado e permite tentar novamente; não finge sucesso.
- Conta isenta: não é redirecionada para checkout.
- Assinatura ativa: `/planos` não cria outra sessão e segue para Dex/dashboard conforme estado de onboarding.

## 6. Referência visual

Reutiliza `/planos` e apresentação Dex existentes. Sem nova landing ou token. O retorno comercial
usa card de progresso compacto, com estado visível e CTA único; não usa tela branca de espera.

## 7. Invariantes

- I1: um checkout só pode ser iniciado para o usuário/clinica autenticados do contexto ativo.
- I2: confirmação no navegador não é prova de pagamento; estado vem do webhook sincronizado.
- I3: `STRIPE_BILLING_ENABLED=false` não cria sessão Stripe nem altera trial local.
- I4: ClinDent e VIP Odontologia continuam isentas e nunca recebem redirect comercial.
- I5: cancelar checkout não deixa onboarding marcado completo.
- I6: nenhum dado clínico, convite ou assinatura existente é apagado neste fluxo.

## 8. Gates de aceite

- [ ] Com flag desligada, cadastro de teste segue identidade → Dex → Meu Dia e não chama Stripe.
- [ ] Em Stripe test mode/conta de teste, Solo mensal e anual abrem Checkout com preço/ciclo corretos, voltam e liberam Dex só após estado confirmado.
- [ ] Clínica abre Checkout, cria formação uma vez e, após retorno, permite convidar colegas sem bloquear o criador.
- [ ] Cancelar o Checkout volta ao plano, não marca onboarding completo e permite nova tentativa.
- [ ] ClinDent e VIP Odontologia entram no produto sem checkout.
- [ ] Evento Stripe inválido recebe 400; evento válido é idempotente; repetir o callback não duplica assinatura/trial.

## 9. Fora de escopo

- Alterar produtos, preços, impostos, invoice, portal Stripe ou política de cobrança.
- Mudar o modelo de assinaturas individuais da R-92.
- Onboarding pedagógico além do slide Dex já aprovado.

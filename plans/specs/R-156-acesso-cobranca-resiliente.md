# R-156 — Acesso e cobrança resilientes

> **SPEC** · **R-156** · 🔵 ativo
> **Aberto:** 2026-09-05 · **Fechado:** — · **Fase:** aprovada por instrução explícita do usuário

## 1. Problema

Um redirect do apex `odontoia.app` para `www` impede a Stripe de entregar o webhook configurado
no apex. Um checkout pago pode então permanecer como `checkout_pendente` no banco e o Dashboard
entra em ciclo com o fluxo de agregado, embora o dentista seja administrador da própria clínica.
Para uma assinatura realmente não regularizada, o redirect para fora do Dashboard esconde os dados
e não explica o caminho para regularizar.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| `odontoia.app` é canônico; `www` e domínio legado redirecionam para ele | manter o apex redirecionando para `www` | O endpoint Stripe já é o apex e webhook não pode depender de redirect. |
| Reconciliar uma Checkout Session concluída com a Stripe antes de oferecer outro checkout | criar checkout novo quando o banco diz pendente | Evita dupla cobrança e recupera falha transitória de entrega. |
| Dashboard continua renderizado com overlay de bloqueio | redirecionar para planos ou fluxo de agregado | Preserva visibilidade dos dados e dá uma ação única de pagamento, sem ciclo. |

## 3. Objetivo e como funciona

**Objetivo:** uma dentista paga nunca perde acesso por atraso de webhook, e uma assinatura não
regularizada vê o próprio Dashboard preservado com uma ação clara de regularização.

O webhook continua sendo a sincronização normal. O botão de regularização consulta a sessão Stripe
já vinculada ao usuário e à clínica: se ela foi concluída, sincroniza a assinatura atual; se ainda
está aberta, abre a mesma URL; se não há sessão pagável, leva ao fluxo de planos. O Dashboard não
redireciona um administrador/dentista para o onboarding de agregado por estado comercial.

## 4. Contrato técnico

- `resolverEstadoComercial()` mantém a fonte única de estado e expõe `estadoComercialBloqueiaOperacao()`.
- `DashboardLayout` passa `bloqueioPagamento` ao `DashboardShell` somente para roles `admin` e
  `dentista` não isentos, sem assinatura ativa/trial/formação liberada.
- `PaymentBlockOverlay` é um Client Component dentro de `DashboardShell`; `regularizarPagamento()`
  é uma Server Action autenticada que chama a reconciliação da assinatura da `clinicId` ativa.
- A reconciliação verifica a metadata da Checkout Session contra `assinatura.id`, `usuario_id` e
  `clinica_id`, lê a Subscription atual na Stripe e atualiza apenas a linha correspondente. Nunca
  usa URL de retorno como prova de pagamento e nunca cria cobrança durante a reconciliação.
- O webhook e a reconciliação consultam o estado atual da Subscription na Stripe; Stripe permanece
  a fonte de verdade.
- `proxy.ts` redireciona `www.odontoia.app` e `dentia.app.br` para `https://odontoia.app`, preservando
  caminho e query. A configuração Vercel precisa servir o apex diretamente antes desse deploy.

## 5. Comportamento — o alvo funcional

| Estado | Quando acontece | O que a tela mostra | O que a função faz |
|---|---|---|---|
| Assinatura ativa/trial/isenção/formação liberada | Estado comercial liberado | Dashboard normal | Não mostra bloqueio. |
| Pagamento pendente ou não identificado | Checkout pendente, assinatura suspensa/inativa ou `past_due` | Dashboard por baixo; card central “Pagamento não identificado” | Intercepta a operação e oferece “Regularizar pagamento”. |
| Checkout concluído, banco atrasado | Stripe Session `complete` e metadata confere | Botão fica em processamento e Dashboard atualiza | Sincroniza estado Stripe atual, revalida a rota e remove o bloqueio se ativo. |
| Checkout ainda aberto | Session válida `open` | Botão abre checkout existente | Não cria outra Session. |
| Sem checkout recuperável | Session ausente, expirada ou cancelada | Link para escolher/retomar plano | Não altera dados clínicos. |
| Falha Stripe/DB | consulta ou escrita falha | Mensagem acionável; botão pode tentar novamente | Não assume pagamento nem libera acesso. |

```
clique em “Regularizar pagamento”
  → autentica usuário e resolve a clínica ativa
  → lê a assinatura da própria clínica e a Checkout Session vinculada
  → valida metadata e consulta estado atual da Stripe
  → sincroniza a Subscription se paga; ou devolve a URL aberta; ou devolve /planos
  → cliente abre checkout ou atualiza o Dashboard
```

| Dado / situação | O sistema faz | Resultado esperado |
|---|---|---|
| Checkout pago, webhook atrasado | reconcilia a Subscription `active` existente | Dashboard libera sem nova cobrança. |
| Fatura não regularizada | mantém dados e mostra bloqueio | dentista entende que os dados não serão perdidos e tem CTA único. |
| Administradora da própria clínica com `checkout_pendente` | permanece em `/dashboard` | nunca é enviada para `/bem-vindo-agregado`. |

## 6. Referência visual

- **Artefato:** — estado inserido no contrato visual existente do Dashboard; não há tela nova.
- **Rota alvo:** `/dashboard` · **Componente alvo:** `src/components/layout/dashboard-shell.tsx`
- **Tokens:** `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`;
  card com a geometria e ações primárias já usadas pelo Dashboard.

## 7. Invariantes

- [ ] Dados clínicos, pacientes, agenda, prontuários e orçamento nunca são apagados ou alterados pelo bloqueio.
- [ ] Um pagamento é reconhecido somente pela Stripe verificada no servidor ou pelo webhook assinado.
- [ ] Reconciliação só alcança a assinatura do usuário autenticado e da clínica ativa, com metadata correspondente.
- [ ] `www` e domínio legado não são destinos canônicos.
- [ ] Nenhum usuário ativo é encaminhado ao fluxo de agregado só por `checkout_pendente`.
- [ ] Server Actions clínicas são recusadas centralmente enquanto o bloqueio comercial está ativo;
  checkout e reconciliação são as únicas exceções explícitas.

## 8. Gates de aceite

- [ ] `odontoia.app/api/webhooks/stripe` responde sem redirect e Stripe entrega webhook novo com sucesso.
- [ ] Checkout concluído pendente no banco reconcilia para `active` sem criar Session ou Subscription nova.
- [ ] Usuária administradora com assinatura pendente carrega `/dashboard`, sem ciclo com `/bem-vindo-agregado`.
- [ ] Assinatura não regularizada vê o Dashboard preservado, bloqueio central e CTA de pagamento.
- [ ] Testes unitários cobrem estados comercial liberado/bloqueado e domínio canônico; typecheck passa no recorte.

## 9. Fora de escopo

- Bloquear chamadas diretas às rotas HTTP que não passam por Server Action. Essa política de API/RLS
  é um item de segurança próprio.
- Alterar preços, planos, grace period ou os dados clínicos de clientes.

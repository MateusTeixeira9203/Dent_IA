# Auditoria pré-merge — `codex/r97-gestao-colaborativa` → `main`

Data: 24/08/2026. Escopo: 210 arquivos / 7 migrations desde `origin/main`.

## Veredito

**Não liberar para `main` ainda.** O bloqueador de integridade abaixo foi corrigido e validado
em produção em 24/08. O lote ainda reúne cobrança, RLS, onboarding e mobile; estes últimos
precisam dos gates manuais abaixo.

## Bloqueador

### P1 — RPC permitia alterar evento próprio de outra ficha — **corrigido 24/08**

`salvar_eventos_odontograma` (migration 150) bloqueia e valida a `p_ficha_id` recebida, mas
o `UPDATE` e o `ON CONFLICT DO UPDATE` identificam um evento existente somente por `id` +
`clinica_id`. Um dentista autenticado, dono de dois eventos não assinados na mesma clínica,
pode chamar a RPC diretamente com a ficha A como argumento e o id de um evento da ficha B.
A RLS impede alcançar evento de outro dentista, mas não impede este cruzamento de ficha/paciente
do próprio autor. Resultado possível: editar detalhes/status/encaminhamento de B durante o
salvamento de A, fora da interface normal.

Correção mínima antes do merge:

- validar antes da escrita que cada `id` existente pertence a `p_ficha_id`, `p_paciente_id` e
  `p_clinica_id`;
- validar que todo evento novo no payload traz exatamente esses mesmos ids;
- restringir tanto o `UPDATE` quanto o `ON CONFLICT DO UPDATE` ao mesmo vínculo.

Foi aplicada a migration `20260824033242_fix_salvar_eventos_escopo_ficha.sql`, registrada no
histórico remoto e verificada com dois testes transacionais (`ROLLBACK`): payload cruzado foi
recusado com `evento_contexto_invalido`; payload da própria ficha foi aceito. Nenhum registro
clínico foi persistido durante os testes.

## Passou

- `git diff --check origin/main...HEAD`: sem whitespace error.
- `npm run typecheck`, com heap Node de 4 GB: passou. O heap padrão de 2 GB estoura.
- `npm run build`, com 4 GB: passou; 62 rotas geradas.
- Testes unitários de Stripe: 4/4 passaram (`price-validation` e `stripe-state`).
- Revisão do webhook: assinatura Stripe, separação live/test, idempotência e releitura da
  subscription atual estão presentes.
- Revisão das migrations: tabelas e RPCs novas existem em produção, RLS ativa nas tabelas
  expostas; tabelas de processamento interno ficaram sem policy deliberadamente e são acessadas
  apenas via service role.
- Landing pública: sem overflow horizontal em viewport 360 px; CTAs, sete dias e provas sociais
  renderizaram sem erro no console.

## Gates obrigatórios antes do merge

1. **R126a mobile:** validar em produção os cenários que já quebraram: agenda, retorno,
   orçamento, ficha e encaminhamento ao protético em celular.
3. **R97/R92:** teste com duas contas reais: dentista A não vê orçamento/financeiro de B;
   secretária mantém o escopo previsto; clínica em formação e saída da clínica preservam os
   vínculos corretos.
4. **Stripe E2E:** Checkout, webhook `checkout.session.completed`, trial de 7 dias,
   `invoice.payment_failed` e carência/suspensão. Fazer em modo teste ou com cliente de teste,
   nunca cobrando uma pessoa real por acidente.

## Higiene de release (não bloqueia a correção do P1, mas não deve ficar esquecida)

- Não existe script `test` configurado. A execução nativa encontrou 92 testes, 89 passaram;
  3 não carregam porque o runner nativo não resolve o alias `@/`. É cobertura que não roda em
  CI hoje.
- `npm run lint` inclui `.claude/worktrees/.next`; o lint amplo não é utilizável. O lint de
  `src` reporta 17 erros e 65 warnings; a maioria é anterior ao branch, mas há um erro no
  `detalhe-orcamento-modal.tsx` que foi tocado neste lote.
- A configuração externa ainda precisa ter o domínio canônico `https://odontoia.app` e
  `https://www.odontoia.app` em Vercel, Supabase e Google OAuth. O código ativo não referencia
  `dentia.app.br`; ocorrências remanescentes são o nome histórico do componente de logo.

## Não coberto por esta auditoria

Não foram submetidos formulários, logins ou pagamentos em produção. A revisão visual foi
somente pública/read-only; os gates autenticados acima precisam de uma clínica de teste.

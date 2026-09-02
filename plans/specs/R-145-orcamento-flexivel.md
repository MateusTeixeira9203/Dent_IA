# R-145 — Orçamento financeiro flexível

> **SPEC** · **R-145** · 🔵 ativo
> **Aberto:** 2026-09-02 · **Fechado:** — · **Fase:** aprovada pelo usuário na conversa

## 1. Problema

Hoje uma parcela prevista e um recebimento real são linhas da mesma tabela, mas a UI obriga o
dentista a “fechar” uma parcela específica. Depois de parcelar, `gerar_parcelas_orcamento` recusa
novo plano; `editarValorAcordado` também recusa qualquer plano existente. O resultado é criar outro
orçamento para refletir uma negociação ou pagamento real diferente do previsto.

O orçamento permanece a proposta clínica; as finanças precisam comportar negociação e recebimentos
parciais sem perder autoria, data ou valor já confirmado.

## 2. Decisão

- **Orçamento único:** mudar pagamento ou previsão não cria outro orçamento.
- **Recebimento livre:** o dentista informa valor, data e forma; ele não escolhe procedimento nem
  parcela. O saldo é `valor combinado − soma dos recebimentos pagos`.
- **Previsão separada no comportamento:** `pagamentos.status='pendente'` é parcela futura;
  `status='pago'` é dinheiro real. A lista visual explicita as duas seções.
- **Futuro reorganizável:** a operação troca somente linhas pendentes por novas previsões, na mesma
  transação. Linhas pagas e canceladas permanecem no histórico.
- **Correção auditável:** editar um recebimento registra antes/depois em `activity_logs`; estornar
  altera a linha para `cancelado`, exige motivo e registra ator/data. Não há exclusão de pago.
- **Proteções:** nenhum recebimento ou edição pode fazer o total pago superar o valor combinado;
  o valor combinado não pode ficar abaixo do recebido. `quitado` não aceita novo recebimento até
  estorno ou correção que reabra o saldo.

## 3. Objetivo

No modal de orçamento do perfil do paciente, transformar a coluna financeira em:

1. **Acordo financeiro** — valor combinado editável; ao mudar com previsão ativa, a mesma ação
   exige a redistribuição do saldo futuro.
2. **Recebido / saldo** — números derivados, com CTA principal `Registrar recebimento` enquanto
   houver saldo.
3. **Previsão de cobrança** — opcional e reorganizável sem afetar recebimentos. Nesta primeira
   entrega, o dentista redefine quantidade e primeiro vencimento; o banco divide o saldo em
   centavos e preserva o histórico. Edição individual de cada valor/data fica como evolução
   posterior, não promessa implícita desta tela.
4. **Histórico de recebimentos** — pago, corrigido e estornado com responsável, data e ações
   contextualizadas.

`/dashboard/financeiro` reutiliza a mesma escrita transacional; sua lista de pendências continua
lendo somente linhas `pendente` e sua receita somente linhas `pago`.

## 4. Contrato técnico

### Dados existentes e semântica

```ts
type StatusPagamento = 'pendente' | 'pago' | 'cancelado';

interface ParcelaPrevistaInput {
  valor: number;             // centavos positivos; soma exatamente o saldo
  dataVencimento: string;    // ISO date
}

interface RecebimentoInput {
  orcamentoId: string;
  pacienteId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  data: string;
}
```

`pagamentos` continua sendo a fonte de compatibilidade para Financeiro. A migration altera o índice
de número de parcela para considerar apenas as pendências ativas, permitindo manter linhas
`cancelado` como histórico e criar uma nova previsão começando em 1.

### RPCs transacionais novas

```ts
registrar_recebimento_orcamento(
  p_orcamento_id uuid, p_valor numeric, p_forma text, p_data date
) returns public.pagamentos

reorganizar_parcelas_orcamento(
  p_orcamento_id uuid, p_valor_acordado numeric,
  p_parcelas jsonb -- [] para saldo zerado, ou [{ valor, data_vencimento }]
) returns setof public.pagamentos

estornar_recebimento_orcamento(
  p_pagamento_id uuid, p_motivo text
) returns public.pagamentos

corrigir_recebimento_orcamento(
  p_pagamento_id uuid, p_valor numeric, p_forma text, p_data date
) returns public.pagamentos
```

Todas usam `get_my_clinica_id()` e `get_my_dentista_id()`, validam autoria/secretária conforme a
policy atual de `pagamentos`, travam o orçamento com `FOR UPDATE`, e retornam erro simbólico que a
Server Action traduz. `SECURITY DEFINER` só é usado para manter a alteração e a validação numa
transação; revoga `PUBLIC`, concede apenas a `authenticated`, fixa `search_path = public` e valida
o usuário dentro da função.

### Server Actions

- `registrarPagamento` e `registrarRecebimento` passam a delegar à RPC de recebimento, sem insert
  direto.
- `editarPagamento` delega à RPC de correção e só opera linhas `pago`.
- `excluirPagamento` deixa de apagar linha `pago`; é substituída por `estornarPagamento`.
- `gerarParcelas` mantém o caso de primeiro plano; `reorganizarParcelas` atende plano existente e
  mudança do valor combinado, inclusive limpando apenas a previsão quando o saldo chega a zero.

### Componentes

`DetalheOrcamentoModal` é a superfície canônica do dentista. O cliente do paciente mantém somente
o estado efêmero dos formulários; após qualquer escrita faz `router.refresh()` em vez de estimar
saldo local. A página dedicada de Orçamentos recebe `valor_acordado` para não calcular o saldo pelo
`total` original e usa as mesmas actions protegidas.

## 5. Comportamento

| Estado | Resultado |
|---|---|
| Sem item aprovado | Mostra proposta; bloqueia recebimento com explicação. |
| Saldo positivo sem previsão | `Registrar recebimento` e `Organizar cobrança` disponíveis. |
| Saldo positivo com previsão | Recebimento livre disponível; previsão mostra `Reorganizar`. |
| Quitado | Exibe quitado e histórico; não oferece novo recebimento. |
| Valor acima do saldo | Bloqueia sem gravar. |
| Valor combinado menor que pago | Bloqueia sem gravar. |
| Previsões não somam saldo | Bloqueia sem gravar e informa a diferença. |
| Estorno | Exige motivo, conserva a linha cancelada e reabre saldo. |
| Sem permissão ou objeto desatualizado | Não muda UI otimista; mostra erro e recarrega. |

Exemplos:

- Acordo de R$ 1.800, pagamento de R$ 250 PIX: cria um recebido de R$ 250 e saldo de R$ 1.550.
- Se havia 6 previsões, elas não são “quitadas” à força; o dentista pode redistribuir R$ 1.550.
- Se R$ 250 foi digitado como R$ 350, `Corrigir` grava o antes/depois e o saldo passa a refletir
  R$ 350. Se o dinheiro foi devolvido, `Estornar` cancela R$ 250 e registra o motivo.

## 6. Referência visual

- **Rota alvo:** `/dashboard/pacientes/[id]` · **Componente:**
  `src/app/dashboard/pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx`.
- **Base visual:** modal financeiro atual e tokens existentes: `bg-surface`, `bg-surface-alt`,
  `text-text-primary`, `text-text-secondary`, `border-border`, `text-teal-ink`, `bg-teal/10`.
- Densidade compacta, radius `rounded-xl`; números em `font-mono`; CTA única em teal.
- A ordem fixa é acordo → saldo → recebimentos → previsões. Ações destrutivas ficam dentro do
  recebimento correspondente, nunca no CTA principal.

## 7. Invariantes

1. Recebimento pago/cancelado nunca é apagado fisicamente por esta feature.
2. Receita usa somente `status='pago'`; previsão usa somente `status='pendente'`.
3. Toda escrita limita `clinica_id`; uma clínica não lê nem altera orçamento de outra.
4. Só pendências são canceladas/recriadas em reorganização; histórico pago não é reescrito.
5. Soma de previsões novas é exatamente o saldo no instante da transação, em centavos.
6. Correção e estorno deixam `activity_logs` com ator, antes/depois ou motivo.

## 8. Gates de aceite

- [ ] Registrar três recebimentos parciais em um mesmo orçamento sem criar outra proposta.
- [ ] Reorganizar 3 previsões para 4 após um recebimento, mantendo as linhas pagas intactas.
- [ ] Alterar valor combinado e plano no mesmo salvamento; tentar valor abaixo de pago falha.
- [ ] Corrigir recebimento e verificar saldo/histórico; estornar com motivo e verificar reabertura.
- [ ] Depois de quitado, novo recebimento é bloqueado; após estorno, volta a ser permitido.
- [ ] Financeiro mostra só recebidos como receita e só previsões pendentes como contas a receber.
- [ ] Duas contas de clínicas diferentes não leem nem alteram dados uma da outra.
- [ ] TypeScript, testes, lint do recorte, build com rede e teste manual no perfil passam.

## 9. Fora de escopo

- Nota fiscal, conciliação bancária, gateway de cobrança e parcelamento de cartão da adquirente.
- Crédito excedente e devolução financeira automatizada.
- Alterar itens clínicos aprovados, PDF/aceite já assinado ou dados clínicos da Ficha.

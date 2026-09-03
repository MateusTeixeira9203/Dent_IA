# R-145 — Orçamento financeiro flexível

> **SPEC** · **R-145** · 🔵 ativo
> **Aberto:** 2026-09-02 · **Fechado:** — · **Fase:** revisão 3 aprovada pelo usuário na conversa

## 1. Problema

Hoje uma parcela prevista e um recebimento real são linhas da mesma tabela, mas a UI obriga o
dentista a “fechar” uma parcela específica. Depois de parcelar, `gerar_parcelas_orcamento` recusa
novo plano; `editarValorAcordado` também recusa qualquer plano existente. O resultado é criar outro
orçamento para refletir uma negociação ou pagamento real diferente do previsto.

O orçamento permanece a proposta clínica; as finanças precisam comportar negociação e recebimentos
parciais sem perder autoria, data ou valor já confirmado.

Há duas lacunas de integração que impedem a operação diária: ao gerar por uma Ficha, a interface
não explica quais eventos pertencem ao dentista atual e quais foram encaminhados a outro colega; e
o acordo explícito **à vista** não cria uma conta a receber, embora o parcelado já crie previsões.

Há ainda uma ambiguidade crítica: `valor_acordado` pertence ao orçamento inteiro. Se a proposta
tem R$ 5.000, mas o paciente escolhe somente uma coroa de R$ 1.000 com desconto de R$ 100, usar
aquele valor global pode cobrar R$ 4.900 em vez dos R$ 900 corretos. Isso também impede o fluxo
real de pagar procedimento por procedimento conforme o tratamento acontece.

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
- **Responsável canônico por procedimento:** um evento sem encaminhamento pertence ao autor da
  Ficha; um evento encaminhado pertence exclusivamente ao destino. O banco já impõe esta regra e
  a interface a torna explícita, sem oferecer ao dentista o procedimento de outro responsável.
- **À vista é uma cobrança prevista, não receita:** ao escolher esse plano, cria uma única linha
  `pendente` para o valor acordado e vencimento de hoje. Ela só passa a receita quando alguém a
  marca como `pago`. A proposta/orçamento, isoladamente, continua sem lançar dinheiro.
- **Cobrança por etapa (revisão 3):** o orçamento continua sendo a proposta; a dívida nasce
  somente quando o dentista escolhe um ou mais itens para cobrar agora. Cada etapa tem subtotal,
  desconto e valor final próprios. Um recebimento reduz exclusivamente a etapa escolhida.
- **Parcelado ocupa os meses, não um mês só:** a etapa parcelada divide seu valor final em N
  previsões mensais. Nenhum mês recebe o montante integral; a soma das parcelas fecha o valor da
  etapa em centavos.
- **Sem rateio invisível:** um item não entra em duas etapas ativas. Para cobrar vários
  procedimentos em um único PIX, o dentista os seleciona juntos e cria uma única etapa.

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
5. **Origem clínica legível** — o modal informa quantos procedimentos da Ficha estão disponíveis
   para o orçamento do responsável atual e quantos pertencem a colegas. Itens de colegas ficam
   visíveis apenas como contexto, nunca selecionáveis nem enviados à RPC.
6. **Cobrar nesta etapa** — o dentista seleciona itens inteiros aprovados, informa desconto e
   escolhe à vista ou N parcelas mensais antes de confirmar. A etapa mostra `Pendente`, `Parcial`,
   `Paga` ou `Cancelada`; não há status manual de dinheiro.

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

interface CobrancaEtapaInput {
  orcamentoId: string;
  itemIds: string[];          // itens inteiros, únicos e pertencentes ao orçamento
  desconto: number;           // 0 <= desconto <= subtotal
  numeroParcelas: number;     // 1 = à vista; 2..24 = mensal
  primeiroVencimento: string; // ISO date
}
```

`definir_plano_avista` mantém a assinatura atual e passa a criar a cobrança pendente única com
`data_vencimento = CURRENT_DATE`. `entrada_valor` continua sendo somente informação de acordo:
não reduz a cobrança e não representa dinheiro recebido. Para reduzir a cobrança, registra-se um
recebimento real ou confirma-se a previsão.

`pagamentos` continua sendo a fonte de compatibilidade para Financeiro. A migration altera o índice
de número de parcela para considerar apenas as pendências ativas, permitindo manter linhas
`cancelado` como histórico e criar uma nova previsão começando em 1.

### Cobrança por etapa (revisão 2)

```ts
type EstadoCobranca = 'pendente' | 'parcial' | 'paga' | 'cancelada';

interface CobrancaEtapa {
  id: string;
  orcamentoId: string;
  subtotal: number;
  desconto: number;
  valorFinal: number;
  situacao: 'aberta' | 'cancelada'; // fato persistido; estado financeiro é derivado
}
```

As tabelas aditivas são `orcamento_cobrancas` e `orcamento_cobranca_itens`. `pagamentos` ganha
`cobranca_id` anulável: linhas antigas continuam legíveis e cada recebimento ou previsão aponta
para sua etapa. À vista cria uma pendência; parcelado cria N pendências mensais, divididas em
centavos e com eventual resto na última parcela. Receber parcialmente preserva o recebido e
recompõe somente o saldo futuro da mesma etapa.

O desconto de `orcamentos.desconto` permanece metadado da proposta e compatibilidade do fluxo
legado; ele **não é aplicado automaticamente** a uma nova etapa. O desconto aplicado é sempre o
valor que o dentista informou e conferiu naquela cobrança. Item com `quantidade > 1` é atômico
nesta primeira versão: para cobrar unidades separadas, elas devem ser itens separados no orçamento.

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

criar_cobranca_orcamento(
  p_orcamento_id uuid, p_item_ids uuid[], p_desconto numeric,
  p_numero_parcelas smallint, p_primeiro_vencimento date
) returns public.orcamento_cobrancas

registrar_recebimento_cobranca(
  p_cobranca_id uuid, p_valor numeric, p_forma text, p_data date
) returns public.pagamentos

cancelar_cobranca_orcamento(
  p_cobranca_id uuid, p_motivo text
) returns void
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
- `criarCobrancaEtapa`, `registrarRecebimentoCobranca` e `cancelarCobrancaEtapa` delegam às RPCs
  acima. A correção/estorno de um pagamento ligado a uma etapa recompõe somente a previsão daquela
  etapa; nunca altera o total do orçamento ou uma cobrança vizinha.

### Componentes

`DetalheOrcamentoModal` é a superfície canônica do dentista. O cliente do paciente mantém somente
o estado efêmero dos formulários; após qualquer escrita faz `router.refresh()` em vez de estimar
saldo local. A página dedicada de Orçamentos recebe `valor_acordado` para não calcular o saldo pelo
`total` original e usa as mesmas actions protegidas.

Com ao menos uma etapa, a coluna financeira troca o resumo global pela lista de etapas. Cada card
mostra itens, subtotal, desconto, recebido e saldo; o formulário de recebimento fica ligado ao card
escolhido. Orçamentos legados, sem etapa, preservam a interface atual até o primeiro uso do fluxo
novo — sem migração silenciosa de negociação ou dinheiro histórico.

## 5. Comportamento

| Estado | Resultado |
|---|---|
| Sem item aprovado | Mostra proposta; bloqueia recebimento com explicação. |
| Saldo positivo sem previsão | `Registrar recebimento` e `Organizar cobrança` disponíveis. |
| Plano à vista | Uma cobrança pendente do saldo aparece no Financeiro com vencimento hoje; confirmar pagamento a torna receita. |
| Saldo positivo com previsão | Recebimento livre disponível; previsão mostra `Reorganizar`. |
| Quitado | Exibe quitado e histórico; não oferece novo recebimento. |
| Valor acima do saldo | Bloqueia sem gravar. |
| Valor combinado menor que pago | Bloqueia sem gravar. |
| Previsões não somam saldo | Bloqueia sem gravar e informa a diferença. |
| Estorno | Exige motivo, conserva a linha cancelada e reabre saldo. |
| Sem permissão ou objeto desatualizado | Não muda UI otimista; mostra erro e recarrega. |
| Etapa R$ 1.000 com R$ 100 de desconto | Cria previsão de R$ 900; R$ 500 recebido deixa R$ 400 pendentes. |
| Etapa de R$ 900 em 3 meses | Cria 3 previsões mensais de R$ 300; nunca R$ 900 em um único mês. |
| Item já em etapa aberta/paga | Não aparece elegível nem pode ser cobrado outra vez pela RPC. |
| Cancelar etapa sem recebido | Cancela sua previsão e libera seus itens para uma nova etapa. |

Exemplos:

- Acordo de R$ 1.800, pagamento de R$ 250 PIX: cria um recebido de R$ 250 e saldo de R$ 1.550.
- Se havia 6 previsões, elas não são “quitadas” à força; o dentista pode redistribuir R$ 1.550.
- Se R$ 250 foi digitado como R$ 350, `Corrigir` grava o antes/depois e o saldo passa a refletir
  R$ 350. Se o dinheiro foi devolvido, `Estornar` cancela R$ 250 e registra o motivo.
- A Ficha de A tem dois eventos próprios e um encaminhado para B: A recebe os dois próprios no
  orçamento e vê um aviso de que o terceiro pertence a B; B recebe somente o encaminhado.
- Proposta R$ 5.000: o dentista seleciona uma coroa de R$ 1.000 e desconto de R$ 100; a etapa
  nasce em R$ 900. PIX de R$ 500 deixa a etapa `Parcial` em R$ 400; os outros itens continuam
  proposta, não viram conta a receber.

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
7. Um evento de odontograma entra em no máximo um orçamento e somente no orçamento do seu
   responsável canônico (`encaminhado_para ?? ficha.dentista_id`).
8. A cobrança à vista nasce `pendente`; criar ou aprovar orçamento nunca a transforma em `pago`.
9. Toda cobrança por etapa contém ao menos um item inteiro do próprio orçamento; desconto nunca
   ultrapassa seu subtotal e seu valor final nunca é negativo.
10. Um item participa de no máximo uma etapa não cancelada; recebimento, correção e estorno de uma
    etapa não afetam saldo/previsão de outra.
11. Etapa parcelada gera de 2 a 24 previsões mensais cuja soma é exatamente seu valor final.

## 8. Gates de aceite

- [ ] Registrar três recebimentos parciais em um mesmo orçamento sem criar outra proposta.
- [ ] Reorganizar 3 previsões para 4 após um recebimento, mantendo as linhas pagas intactas.
- [ ] Alterar valor combinado e plano no mesmo salvamento; tentar valor abaixo de pago falha.
- [ ] Corrigir recebimento e verificar saldo/histórico; estornar com motivo e verificar reabertura.
- [ ] Depois de quitado, novo recebimento é bloqueado; após estorno, volta a ser permitido.
- [ ] Financeiro mostra só recebidos como receita e só previsões pendentes como contas a receber.
- [ ] À vista cria exatamente uma pendência para hoje; ao confirmá-la, a pendência some e a receita
  aparece no Financeiro.
- [ ] Em Ficha com eventos de A e encaminhado para B, cada dentista vê e consegue orçar somente
  seus eventos; a interface explica os itens de outro responsável.
- [ ] Duas contas de clínicas diferentes não leem nem alteram dados uma da outra.
- [ ] Selecionar somente item de R$ 1.000 com desconto de R$ 100 cria uma etapa e previsão de
  R$ 900, mesmo que a proposta inteira seja R$ 5.000.
- [ ] Parcelar essa etapa de R$ 900 em 3 meses cria 3 pendências de R$ 300 em meses consecutivos;
  o Financeiro não concentra R$ 900 no primeiro mês.
- [ ] Registrar R$ 500 nessa etapa deixa `Parcial` e R$ 400 no Financeiro; registrar R$ 400 muda
  imediatamente para `Paga`, sem mexer nos outros itens.
- [ ] Cancelar etapa sem recebido libera seus itens; tentativa de duplicar item em etapa aberta ou
  paga falha na RPC.
- [ ] TypeScript, testes, lint do recorte, build com rede e teste manual no perfil passam.

## 9. Fora de escopo

- Nota fiscal, conciliação bancária, gateway de cobrança e parcelamento de cartão da adquirente.
- Crédito excedente e devolução financeira automatizada.
- Rateio de um único recebimento entre etapas distintas e cobrança fracionada de um item com
  `quantidade > 1`; o dentista cria uma etapa com vários itens ou itens separados, respectivamente.
- Alterar itens clínicos aprovados, PDF/aceite já assinado ou dados clínicos da Ficha.

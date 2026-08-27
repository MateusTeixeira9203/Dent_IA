# R-136 — Financeiro do orçamento claro

> **SPEC** · **R-136** · 🔵 ativo
> **Aberto:** 2026-08-27 · **Fechado:** — · **Fase:** aprovada · implementação em andamento

## 1. Problema

No detalhe do orçamento do perfil do paciente, a lateral financeira oferece ao mesmo tempo
`Registrar Dinheiro`, percentual pago, saldo, edição do valor negociado, lista de recebimentos,
formulário de pagamento e alternância de parcelamento. O dentista não sabe qual ação iniciar.

Há também uma informação enganosa: orçamento sem item aprovado mostra `0%` e `Falta receber
R$ 0,00`, embora o correto seja informar que ainda não há nada aceito pelo paciente.

## 2. Decisão

O detalhe continua com Procedimentos à esquerda e Financeiro à direita. A lateral passa a ter
uma sequência única:

1. resumo de aprovado, recebido e saldo;
2. valor final negociado como ajuste secundário;
3. escolha entre `À vista` e `Parcelado` quando ainda não existe plano;
4. somente os campos do caminho escolhido;
5. uma CTA por vez;
6. depois do parcelamento, a lista de parcelas substitui a criação de um novo plano.

`Registrar Dinheiro` sai desta tela. O atalho continua existindo na tela operacional da
secretária (`/dashboard/orcamentos`), que não é redesenhada neste item.

## 3. Objetivo

Permitir que dentista ou secretária entendam em poucos segundos: o que foi aceito, o que entrou,
o que falta, se é pagamento à vista ou parcelado, e qual é a próxima ação possível — sem mudar
regra de cobrança, dados persistidos ou permissões.

## 4. Contrato técnico

### Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/app/dashboard/pacientes/[id]/_components/modals/detalhe-orcamento-modal.tsx` | Reorganiza a coluna financeira; remove o atalho duplicado; adiciona estados visuais de fluxo. |
| `src/app/dashboard/pacientes/[id]/_components/paciente-detail-client.tsx` | Remove o estado/handler/props exclusivos de `Registrar Dinheiro` nesta modal. |
| `plans/artefatos/R-136-financeiro-orcamento-claro.html` | Artefato aprovado. |

Não há migration, nova tabela, policy ou server action nova.

### Dados e ações reutilizados

| Necessidade | Fonte existente | Regra preservada |
| --- | --- | --- |
| Resumo | `deriveEstadoOrcamento()` | `valorDevido = valor_acordado ?? soma(itens aprovados)`; nunca usar `total` cru. |
| Receber/agendar à vista | `registrarPagamento()` | Continua criando `pago` para recebimento imediato e `pendente` quando o vencimento é futuro. |
| Criar parcelas | `gerarParcelas()` | Continua usando RPC transacional, de 2 a 24 parcelas e sem dividir valor já recebido. |
| Fechar parcela | `marcarPagamentoPago()` | Atualiza a parcela escolhida; nunca insere nova linha. |
| Editar/excluir recebimento | `editarPagamento()` / `excluirPagamento()` | Valores, forma e data permanecem editáveis conforme autorização atual. |
| Valor negociado | `editarValorAcordado()` | Continua bloqueado se há plano ativo ou parcela pendente; nunca fica menor que o já recebido. |

### Estado local da modal

```ts
type ModoRecebimento = 'avista' | 'parcelado';

type EstadoFinanceiro =
  | 'aguardando_aprovacao'
  | 'configurar_recebimento'
  | 'fechar_parcela'
  | 'plano_parcelado'
  | 'quitado';
```

- `modoRecebimento` inicia em `avista` ao abrir um orçamento sem plano e sem parcela pendente.
- A troca para `parcelado` apenas alterna a interface; a escrita só ocorre no clique de
  `Gerar parcelas`.
- O vencimento futuro do pagamento único fica recolhido em `Agendar recebimento`, para manter
  o uso comum (recebido agora) curto sem remover o recurso já existente.
- `closingPagamentoId` mantém prioridade sobre qualquer modo: exibe somente os campos de forma
  e data para fechar a parcela selecionada.

## 5. Comportamento

### Estados

| Estado | Condição | Conteúdo e ação |
| --- | --- | --- |
| Aguardando aprovação | `valorAprovado === 0` | Resumo mostra `Aguardando aprovação do paciente`; nenhum formulário, parcela ou CTA de recebimento é renderizado. |
| Configurar recebimento | Há item aprovado, não quitado e nenhum plano parcelado ativo | Segmento `À vista` / `Parcelado`; mostra apenas o formulário do modo ativo. |
| Fechar parcela | `closingPagamentoId !== null` | Destaca a parcela escolhida, fixa o valor e permite só forma/data + `Marcar como pago`. |
| Plano parcelado | `plano_forma === 'parcelado'` ou há parcelas pendentes | Lista recebimentos/parcelas; não exibe criação de outro plano. Uma parcela pendente abre o estado de fechamento. |
| Quitado | `quitado === true` | Mostra valor recebido, quantidade/formas; não oferece receber ou parcelar. |

### Caminho principal — à vista

1. O usuário vê `Aprovado`, `Recebido` e `Saldo`.
2. Em `À vista`, informa valor, forma e data de recebimento.
3. Opcionalmente abre `Agendar recebimento` e informa vencimento futuro.
4. A CTA é única: `Registrar recebimento` ou `Agendar recebimento`.
5. `registrarPagamento()` confirma no servidor; a lista, resumo e estado derivado são atualizados
   como hoje.

### Caminho principal — parcelado

1. O usuário escolhe `Parcelado`.
2. Informa número de parcelas e primeiro vencimento.
3. A prévia mostra saldo real dividido, calculado a partir de `restante` apenas como explicação.
4. `Gerar parcelas` chama `gerarParcelas()`; o servidor decide o saldo e grava o plano de forma
   atômica.
5. A lateral passa para `Plano parcelado`, com cada parcela como próxima ação.

### Exemplos

| Dado | Resultado esperado |
| --- | --- |
| 8 itens, nenhum aprovado | Não mostra `R$ 0,00` como saldo e bloqueia todo recebimento visualmente. |
| R$1.000 aprovados, R$0 pagos | `Saldo R$1.000`; `À vista` abre recebimento, `Parcelado` cria plano. |
| 3 parcelas pendentes de R$300 | Exibe a lista; clicar na 2ª permite fechar somente R$300. |
| R$1.000 aprovados e R$1.000 pagos | Exibe `Quitado`; nenhum formulário financeiro aparece. |
| Vencimento único para amanhã | Usuário abre `Agendar recebimento`; ação cria uma linha pendente, como hoje. |

## 6. Referência visual

- **Artefato:** `plans/artefatos/R-136-financeiro-orcamento-claro.html` (aprovado)
- **Rota:** `/dashboard/pacientes/[id]` · **Componente:** `detalhe-orcamento-modal.tsx`

| Papel | Token do produto | Referência do artefato |
| --- | --- | --- |
| Fundo | `bg-background` | `#0d0d0d` |
| Superfície | `bg-card` | `#111112` |
| Borda | `border-border` | `#27272a` |
| Texto | `text-foreground` | `#fafafa` |
| Secundário | `text-muted-foreground` | `#a1a1aa` |
| Ação | tokens teal existentes | `#5dbeb0` / `#2f9c85` |

Desktop preserva duas colunas. Abaixo de `sm`, financeiro vem depois dos procedimentos, sem
rolagem horizontal. Mudanças entre `À vista` e `Parcelado` usam 160ms de opacidade e no máximo
6px de deslocamento; `prefers-reduced-motion` desativa movimento.

## 7. Invariantes

- Nenhuma ação de pagamento é mostrada ou aceita sem item aprovado.
- Há somente uma CTA financeira primária visível por estado.
- Fechar parcela faz `UPDATE` da parcela escolhida; não cria pagamento novo.
- Parcelamento continua sendo decidido pela RPC; o cliente não calcula nem persiste saldo.
- Edição/exclusão de recebimento e bloqueios de `valor_acordado` mantêm a regra atual.
- Não alterar `orcamentos`, `pagamentos`, RLS, PDF, aceite nem a tela `/dashboard/orcamentos`.
- A implementação usa tokens de tema; os hex do artefato não entram em TSX/CSS de produção.

## 8. Gates de aceite

- [ ] Sem item aprovado: detalhe mostra `Aguardando aprovação do paciente`; não há botão para
      registrar ou parcelar e uma tentativa de action pelo estado antigo continua recusada pelo servidor.
- [ ] Com item aprovado e saldo: só um formulário é visível; alternar à vista/parcelado não grava
      nada até a CTA correspondente.
- [ ] À vista imediato: registrar R$X cria exatamente um `pagamentos.status='pago'` com forma/data corretas.
- [ ] À vista agendado: vencimento futuro cria exatamente um `pagamentos.status='pendente'`.
- [ ] Parcelado: 3x cria três linhas pendentes pela RPC e, ao reabrir, o formulário de criação não reaparece.
- [ ] Parcela pendente: clicar nela e confirmar atualiza apenas sua linha para `pago`.
- [ ] Valor final: erro existente para plano ativo, parcela pendente ou valor menor que recebido continua visível.
- [ ] Desktop e 390px: nenhuma sobreposição ou rolagem horizontal; conteúdo segue a ordem do artefato.
- [ ] `npm run typecheck` passa; lint dos arquivos alterados não introduz erros.

## 9. Fora de escopo

- Renegociar ou trocar um plano depois de criado.
- Tela dedicada de orçamento da secretária (`/dashboard/orcamentos`).
- Alterar preços clínicos, aprovação por item, PDF, Stripe ou o contrato de pagamento.
- Migration, backfill ou mudança de permissões.

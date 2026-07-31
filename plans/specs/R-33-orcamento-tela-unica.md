# R-33 — Orçamento: uma tela só

**Modelo:** Opus (corte de superfície em produção; a execução dos portes pode ir em Sonnet)
**Status:** plano — aguardando aprovação dos 3 descartes e das 2 decisões de §7
**Origem:** decisão do Mateus 29/07 · inventário item por item feito sobre os 5 arquivos
**Depende de:** [R-32](R-32-orcamento-visivel-autor-admin-secretaria.md) — sem ela, o admin
continua vendo 9 de 50 e o corte é validado contra dado incompleto.

---

## 1. Decisão do Mateus

> Uma tela de orçamento. Hoje tem duas no sistema, não faz sentido, e as duas estão
> incompletas. A outra morre — **mas só depois de você me apresentar o inventário item por
> item do que ela tem e a nova não tem. Nada pode ser perdido.**

**Sobrevive:** a modal do perfil do paciente (`detalhe-orcamento-modal.tsx` +
`novo-orcamento-modal.tsx`, orquestradas por `paciente-detail-client.tsx`).
**Morre:** a tela de **detalhe** de `/dashboard/orcamentos` (o painel lateral de
`orcamentos-client.tsx`).
**Continua:** a **lista** de `/dashboard/orcamentos` — a secretária precisa da visão
cross-paciente. Ela perde a tela de detalhe própria; clicar numa linha abre a mesma modal.

Uma tela de detalhe, dois pontos de entrada.

## 2. Por que as duas existem (não é duplicação acidental)

`orcamentos/page.tsx:106`:

```ts
// Solo: dentista cria orçamentos manualmente. BASICO/CLINICA: cria via perfil do paciente.
// Secretária sempre pode criar orçamentos independente do plano.
const canEdit = !isUserOverride && (dentista.plano === 'SOLO' || dentista.role === 'secretaria');
```

Clindent é plano `CLINICA` → dentista tem `canEdit=false` ali e cria pelo perfil; a secretária
faz o inverso. A divisão é **por papel e por plano**, deliberada. É por isso que o corte precisa
do inventário: matar sem portar tira capacidade de trabalho de alguém.

## 3. Trava de segurança — o que NÃO muda

- `orcamentos/actions.ts` (936 linhas) é **compartilhada** pelas duas telas e **não morre**
- Nenhum nome de campo, nenhuma coluna, nenhuma chamada de API
- Nenhuma migração de dado
- `/dashboard/orcamentos` continua existindo como **lista** (busca, filtros, métricas, badge
  "Novo", contador). Nada da lista é portado — fica onde está
- A regra de plano (`canEdit`) continua valendo para o botão "Novo Orçamento" da lista

## 4. PORTAR — os 15 itens

Ordem: os que não têm dependência primeiro.

| # | O que | De (linha) | Custo |
|---|---|---|---|
| 1 | ✅ **PDF do orçamento** (`FileDown` → `/api/orcamentos/{id}/pdf`) — **já portado, R-39a, 30/07** | `orcamentos-client.tsx:1083` + `botao-download-pdf.tsx` | zero backend. Pendurado no rodapé do `detalhe-orcamento-modal.tsx`, sem alteração no componente |
| 2 | ✅ **Enviar por WhatsApp** (`wa.me` + link do PDF + rascunho→enviado) — **já portado, R-39a, 30/07** | `:1091-1097` + `botao-enviar-whatsapp.tsx:38-72` | precisa `paciente.telefone`/`nome` — vêm de `displayTelefone`/`displayNome` do pai |
| 3 | **DEX Traduzir** (ícone + dialog + textarea readOnly + "Copiar texto" + `DexLoader`) | `:1079-1082`, `:405-430`, `:1714-1751` | zero backend — a rota só recebe `orcamentoId` |
| 4 | **DEX Gerar mensagem** (5 tipos, copiar) | `:1084-1090` + `botao-mensagem-ia.tsx` | precisa `dentistaNome` → mesma dependência do item 9 |
| 5 | **Registrar Dinheiro** (secretária, gesto de balcão) | `:1124-1131` → `:727-763` | **não portar como está** — ver §5 |
| 6 | **QR Code PIX** + "Confirmar Pagamento PIX" | `:1132-1138`, `:1679-1712` | ver descarte 3 |
| 7 | **Bloco "Ações Rápidas" da secretária** (container dos itens 2–6, só quando `status <> 'aprovado'`) | `:1118-1156` | só layout |
| 8 | **Nudge "Confirmar e enviar para secretaria"** (card em rascunho, explica que a secretária será notificada) | `:1159-1176` | só UI. Hoje nada sinaliza que um rascunho precisa ser enviado |
| 9 | **Nome do dentista responsável** no detalhe | `:994-1004` | **único item que sai da tela**: `dentista:dentistas(nome)` em `get-patient-workspace-data.ts:121` + campo em `types.ts:22-36` |
| 10 | **Checklist de procedimentos pendentes**, varrendo **todas** as fichas e **excluindo os já concluídos** | `:246-310` (filtro em `:265`), `:1901-1953` | o sobrevivente pega **uma** ficha inteira, por uma query que **não seleciona `procedimentos_concluidos`** (`paciente-detail-client.tsx:924`) → hoje **é possível orçar procedimento já concluído** |
| 11 | **Aplicar `result.autoAprovado`** ao status + `router.refresh()` após registrar pagamento | `:495`, `:502`, `:511` | sem isso, quitar um orçamento `enviado` deixa a tela mostrando "Enviado" até recarregar. O fechamento de parcela já faz certo (`paciente-detail-client.tsx:745-747`) |
| 12 | **"Preencher restante"** — botão que joga o saldo no campo de valor | `:1496-1509` (aparece sempre que `restante > 0`) | **achado do verificador, corrigido:** eu tinha marcado JÁ TEM. O equivalente do sobrevivente (tile "Falta receber", `detalhe-orcamento-modal.tsx:478-492`) está **dentro do ramo `else`** de `pagamentos.length === 0` (`:443`) → **não existe no primeiro pagamento de nenhum orçamento**, que é o caso mais frequente. Hoje a secretária teria que digitar o valor à mão |
| 13 | **Quanto falta, visível sempre e no celular** | `:1272-1281` | mesmo gate do item 12. E o único outro lugar do sobrevivente que mostra o saldo no cabeçalho é `hidden sm:inline` (`:263-268`) — **invisível no celular** |
| 14 | **Rótulos do log de atividade de orçamento** | — | **achado do verificador.** `ACTION_LABEL` (`detalhe-orcamento-modal.tsx:177-186`) usa chave com underscore (`orcamento_aprovado`) e o log grava com ponto (`orcamento.aprovado`, `src/lib/events.ts:8-13`). Conferido no banco: dos 120 registros, **58 são de orçamento** e todos caem no fallback, mostrando a string crua. Os 4 de pagamento estão certos. `status_alterado` é chave morta — nunca escrita |
| 15 | **X / Cancelar na etapa "selecionar ficha" do Novo Orçamento** | — | `showCloseButton={false}` (`novo-orcamento-modal.tsx:89`) e o Cancelar só existe no ramo "itens" (`:384-390`). Hoje só ESC fecha. Não é porte, é buraco na tela que absorve tudo |

**O item 10 é o mais importante da lista** e não parece: ele não é uma conveniência, é o que
impede cobrar duas vezes o mesmo procedimento. Encosta na [R-30](R-30-ficha-fonte-unica-procedimento.md)
— quando o orçamento passar a ler dos eventos, a fonte do checklist muda. **Executar o 10
depois da R-30**, senão porto lógica que vai ser reescrita.

## 5. O item 5 não é um porte, é um redesenho

"Registrar Dinheiro" hoje (`orcamentos/actions.ts:666-731`):

- INSERT de `dados.total` — o **total do orçamento, não o saldo restante**
- `UPDATE orcamentos SET status='aprovado'` **incondicional**, sem `.select()`, retorno
  descartado — se a RLS barrar, passa por sucesso com 0 linhas
- não grava log
- `data_pagamento` em **UTC** (`:685`) → depois das 21h BRT, data de amanhã
- erro engolido na UI (`orcamentos-client.tsx:731`)

E ele **ignora parcelas existentes**: orçamento `enviado` com 3 parcelas pendentes → 1 clique
grava o total cheio, força `aprovado`, e as 3 pendentes ficam órfãs. A receita do mês dobra.

O Mateus foi explícito: *"prefiro 2 cliques e número confiável do que 1 clique e caixa que não
fecha"*. O contrato do atalho é **[R-34](R-34-plano-de-pagamento.md)**, não esta spec.

### Erro de sequência que eu cometi — corrigido

Eu havia escrito que o item 5 fica "bloqueado por R-34". **Está errado, e o verificador pegou.**

`registrarPagamentoRapido` tem **exatamente um chamador em todo o app**:
`orcamentos-client.tsx:730`. No dia em que a tela morre, a função fica **sem chamador** — a
secretária perde o gesto de balcão **imediatamente**, não quando a R-34 ficar pronta.

**Portanto: ou o item 5 entra ANTES do corte, ou o corte espera a R-34.** Não existe a terceira
opção que eu tinha escrito. Recomendo o corte esperar: portar um atalho que grava o total cheio
e força `aprovado` sem condição é levar o bug de dinheiro para a tela nova.

## 6. Três descartes — julgamento meu, confirme antes

| # | Descarte | Justificativa | Se quiser de volta |
|---|---|---|---|
| 1 | **Voltar status para "Rascunho"** (`:1185`) | o R-27a removeu de propósito; 2 de 52 orçamentos usaram enviado/recusado | 1 linha em `STATUS_OPTIONS` (`detalhe-orcamento-modal.tsx:42-64`) |
| 2 | **Desconto por % (5/10/15) e em R$** (`:2124-2158`) | o sobrevivente resolve com "Valor final negociado" (`novo-orcamento-modal.tsx:310-321`) e grava o **mesmo** campo `desconto`. Perde-se o atalho, não a capacidade | recriar os 3 botões |
| 3 | **QR Code PIX** (item 6) | o QR gerado é **string descritiva, não payload PIX válido** (`:1691`) — a própria tela avisa (`:1698-1700`). Portar mantém uma promessa que o produto não cumpre | portar quando houver chave PIX de verdade |

Descartes por contexto, sem decisão necessária: busca de paciente no criar (o paciente é fixo
no perfil), "Ver Perfil do Paciente →" (a tela **é** o perfil), nome do paciente no cabeçalho
(já está no cabeçalho da página).

## 7. Riscos que o inventário revelou — e que o corte piora

| # | Risco | Detalhe |
|---|---|---|
| R1 | **A secretária ganha poder que não tinha** | `orcamentos-client.tsx:1077` e `:1179` escondem Editar/Excluir/status dela. `detalhe-orcamento-modal.tsx:984-1000` e `:274-295` **não têm gate de papel**. Matar a tela dá à secretária Editar, Excluir e trocar status de orçamento. **Decidir o gate antes do corte** |
| R2 | **`canEdit` some da criação** | `orcamentos/page.tsx:106` é o único ponto onde a regra de plano é aplicada ao criar. `paciente-detail-client.tsx:1529` não tem gate |
| R3 | `editarOrcamento` **zera o desconto** | `actions.ts:626` tem `desconto = 0` como default e **os dois** lados chamam sem o 3º argumento (`:700` e `:1116`). Editar item apaga o desconto em silêncio. Bug pré-existente que **sobrevive ao corte** — vai para a [R-35](R-35-riscos-nao-reportados.md) |
| R4 | `desconto` é gravado e **nunca exibido** | nenhuma das duas telas renderiza. Quem confere depois não vê o desconto aplicado. 6 orçamentos têm desconto |
| R5 | `condicoes_pagamento` é dado morto | 0 de 64 preenchidos; só a tela que morre renderizava. **Não portar** — a R-34 dá função nova a essa coluna |

R1 e R2 são **decisões de produto**, não de implementação. Sem elas o corte não pode acontecer.

## 7b. O único ganho de dado do corte

Você está decidindo esse corte olhando só o que se perde. Existe um ganho, e ele é de dado:

A tela que morre chama `criarOrcamento` **sem `fichaId`** (`orcamentos-client.tsx:617-624`); o
sobrevivente **passa** (`paciente-detail-client.tsx:1046-1050`). Matar a tela **elimina uma
fonte de orçamento órfão de ficha** — hoje 21 dos 50 orçamentos da Clindent não têm ficha
vinculada, e sem ficha não há como rastrear de qual atendimento aquele valor saiu.

## 8. O que o sobrevivente já faz melhor (não mexer)

Registrado para ninguém "consertar" para trás depois:

- itens com índice, `qtd × unitário` e linha de Total (o que morre não tem quantidade)
- empty state com CTA (o que morre esconde a seção)
- edição e exclusão de pagamento inline, com confirmação por linha
- fechar parcela pendente por **UPDATE** (R-28) — o que morre só sabe INSERT
- aceite assinado do paciente, `aprovado_por`/`aprovado_em`, log de atividade
- `Dialog` Radix: ESC fecha, focus trap, aria (o que morre é `motion.aside`, sem nada disso)
- mobile: empilha em coluna; o modal de criar da tela que morre tem `width: 58vw` **fixo** e
  coluna de 320px — em 375px de largura ele é inutilizável
- erro de exclusão exibido (o que morre **engole** `result.error`, `:768-776`)

## 9. Invariantes

- [ ] Toda capacidade da tabela §4 existe na tela sobrevivente, ou está em §6 com seu ok
- [ ] `/dashboard/orcamentos` continua listando, buscando, filtrando e medindo
- [ ] Uma tela de detalhe. Dois pontos de entrada, mesmo componente
- [ ] Nenhum papel ganha permissão que não tinha (R1, R2 resolvidos antes)
- [ ] `orcamentos/actions.ts` intacta

## 10. Gates de aceite

| # | Gate | Conta |
|---|---|---|
| G1 | Dentista: cria pelo perfil, baixa PDF, envia WhatsApp, traduz com Dex | 1 |
| G2 | Secretária: abre pela lista, cai na mesma modal, e **não** ganha Editar/Excluir/status sem decisão de R1 | 2 contas |
| G3 | Clicar numa linha da lista abre a modal do perfil, não o painel antigo | 1 |
| G4 | Nome do dentista responsável aparece no detalhe | 1 |
| G5 | Checklist não oferece procedimento já concluído | 1, ficha com concluído |
| G6 | Quitar orçamento `enviado` atualiza o status na hora, sem recarregar | 1 |
| G7 | Modal usável em 375px de largura | dispositivo real |
| G8 | Regra de plano continua aplicada ao criar | 2 contas, planos diferentes |

## 11. Fora de escopo

- **Parcelamento na geração** → [R-34](R-34-plano-de-pagamento.md)
- **O atalho de 1 clique** → R-34 (item 5 desta spec fica bloqueado por ela)
- **Desconto invisível (R4) e desconto zerado na edição (R3)** → [R-35](R-35-riscos-nao-reportados.md)
- **Policy de visibilidade** → [R-32](R-32-orcamento-visivel-autor-admin-secretaria.md)
- Redesign visual. Esta spec **consolida** duas telas; não redesenha a sobrevivente

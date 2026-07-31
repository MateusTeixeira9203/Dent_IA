# R-34 — Plano de pagamento: registrar o acordo

**Modelo:** Opus (regra de negócio de dinheiro + migração)
**Status:** **os 3 commits da §8 codados e testados** 30/07 — falta só o gate de 2 contas (I6)
e clicar PDF/prontuário/`orcamentos-client.tsx` ao vivo. Ver `plans/ESTADO.md` pro detalhe
**Origem:** pedido do Mateus 29/07 · **Depende de:** nada para a migration; a parte do atalho
depende de [R-33](R-33-orcamento-tela-unica.md) ter definido onde ele vive.

---

## 1. O pedido

> As opções de parcelamento têm que ter, para o dentista. Como que foi parcelado, como ficou
> acordado — três vezes de tanto, quatro vezes de tanto, se foi cartão de crédito, débito.

E o requisito que ele levantou junto, que é o mais importante desta spec:

> Se o atalho de 1 clique gravar por um caminho próprio, o sistema passa a ter **duas fontes
> de verdade sobre dinheiro** — e quando elas divergirem eu não vou saber qual está certa.

## 2. Onde está hoje

**Parcelamento existe e está em uso:** 17 dos 93 pagamentos têm `total_parcelas` preenchido.
O que **não** existe é registrar o **acordo** no momento de fechar o orçamento.
`orcamentos.condicoes_pagamento` é texto livre e está **vazio em todos os 64** — nunca foi
escrito por nenhum código.

**Quatro escritores de `pagamentos`, e nenhum consulta um plano:**

| Função | Escreve | `dentista_id` | `marcado_por` | Auto-aprova | Log |
|---|---|---|---|---|---|
| `registrarPagamento` (`orcamentos/actions.ts:414`) | `pagamentos` | sim | sim (se não agendado) | com trava | sim |
| `registrarPagamentoRapido` (`:666`) | `pagamentos` + `orcamentos.status` | sim | sim | **sempre, sem condição** | **não** |
| `registrarRecebimento` (`financeiro/actions.ts:693`) | `pagamentos` **+ `receitas_manuais`** | **NULL** | **NULL** | não | não |
| `atualizarStatusOrcamento` (`:92-111`) | `pagamentos` (linha `pendente` do total) | — | — | — | — |

### O bug de receita dobrada — e por que ele é grátis de consertar

`registrarRecebimento` grava a **mesma receita nas duas tabelas** (`:720-728` e `:737-744`), e
`calcularSaldoMes` (`:174-176`) soma `pagamentos` **+** `receitas_manuais`. Um recebimento
conta duas vezes.

Pior: a linha de `pagamentos` nasce com `dentista_id` NULL, e as leituras filtram
`.eq('dentista_id', ...)` quando `role <> 'secretaria'` (`:565`, `:164`). Então **o dentista vê
1×, a secretária vê 2×**, no mesmo mês, na mesma tela. E como `is_own_clinical_record(NULL)` é
falso, a RLS **barra o INSERT** para dentista e admin — o botão simplesmente não funciona fora
do papel secretária.

**No banco: 0 linhas em `receitas_manuais`, 0 `pagamentos` com `dentista_id` NULL.** A função
**nunca gravou nada.** Hipótese do motivo (não confirmada): o tipo `FormaRecebimento`
(`financeiro/actions.ts:691`) inclui `'transferencia'`, que **não está no CHECK** de
`pagamentos.forma_pagamento` — escolher essa opção estoura o CHECK.

> **Procedência dos números desta spec.** Todas as contagens (64 orçamentos · 93 pagamentos ·
> 17 com `total_parcelas` · 0 em `receitas_manuais` · 0 com `dentista_id` nulo · 89 com
> `marcado_por_id` nulo · `condicoes_pagamento` 0 de 64 · `pdf_url` 0 de 64) vêm de consulta
> **direta ao banco de produção em 29/07/2026**, somente leitura. Não são estimativa.
> Comentários no código citam números diferentes — "2 de 52" (`detalhe-orcamento-modal.tsx:270`)
> e "83 de 83" (`:614`) — porque são **snapshots antigos** deixados em comentário. Onde
> divergirem, vale a contagem ao vivo. Recomendo rodar as contagens de novo antes de aplicar a
> migration: a base cresce.

> **Consequência: apagar as 8 linhas do INSERT em `receitas_manuais` mata a classe inteira do
> bug e não perde nenhum dado, porque não há dado.** É a correção mais barata da mesa, cabe
> num commit próprio e **não precisa de spec**. Recomendo fazer isso antes de qualquer coisa
> desta spec.

### Bug de fuso, nos dois escritores principais

`new Date().toISOString().split('T')[0]` (`:685`, `:435`) em servidor UTC: depois das 21h BRT
o pagamento é datado **amanhã**. O projeto já tem o padrão certo (`src/lib/hora-brt.ts`,
`salvar-ficha.ts:76`). Financeiro não usa.

## 3. A decisão de modelo, e a alternativa que eu descartei

Considerei tabela nova `orcamento_planos_pagamento` (1:N, histórico de renegociação).
**Descartei:** 64 orçamentos, 0 usos de `condicoes_pagamento`, e renegociação de plano é
feature a especificar, não a presumir. Tabela nova custa um join para resolver nada que
exista hoje. Se renegociação virar requisito, a migração daqui para lá é **aditiva**
(`INSERT INTO planos SELECT ... FROM orcamentos`) e nada se perde.

**Decisão: colunas em `orcamentos` + um índice único em `pagamentos`.**

E `condicoes_pagamento` **deixa de ser coluna morta**: passa a ser a renderização humana do
plano. Ela é lida em **3 superfícies vivas**:

| Superfície | Onde |
|---|---|
| PDF do orçamento | `api/orcamentos/[id]/pdf/route.ts:19` |
| Prontuário | `api/pacientes/[id]/prontuario/route.ts:42` → `lib/prontuario-html.ts:293`, `:637` |
| Snapshot imutável do aceite assinado | migration 113, campo `condicoesPagamento` |

> **Correção do verificador:** eu havia escrito "4 superfícies, incluindo WhatsApp". **São 3.**
> `lib/whatsapp/send-pdf.ts:89` lê o campo, mas a única função exportada do arquivo
> (`sendOrcamentoWhatsApp`, `:99`) tem **zero chamadores** em todo o `src/` — é código morto.
> E o WhatsApp é justamente o canal que mais interessa. Ou seja: **preencher a coluna não faz
> o acordo chegar ao paciente por WhatsApp** — isso precisa do porte do item 2 da
> [R-33](R-33-orcamento-tela-unica.md), que usa outro caminho (`wa.me` + link do PDF).

### O ponto de contrato que decide o resto: `valor_acordado`

"Desconto à vista" **não é** `orcamentos.desconto` — esse já está embutido em `total`
(`criarOrcamento:369-370`). É um desconto **condicional ao caminho escolhido**. E é onde o
caixa quebra em silêncio: a auto-aprovação compara `soma(pagos) >= orcamentos.total`
(`registrarPagamento:475`, `marcarPagamentoPago:280`). Se o paciente pagar à vista com 10%
off, a soma **nunca alcança `total`** e o orçamento nunca aprova sozinho.

> **Invariante central: escolhido o caminho, existe UM valor devido, e todo mundo compara
> contra ele.** Uma coluna, um `coalesce`.

## 4. Trava de segurança

- **Nenhum UPDATE nas 93 linhas de `pagamentos`.** `parcela_numero`/`total_parcelas` continuam
  sendo a verdade de quais parcelas existem
- As 17 linhas com `total_parcelas` não são tocadas
- `orcamentos.desconto` e `total` mantêm o significado atual
- Nada é renomeado nem removido
- Migration 100% aditiva

## 5. Contrato — migration 116

```sql
-- ── PRÉ-FLIGHT (rodar sozinho ANTES; se voltar linha, PARAR) ────────────────
-- Detecta orçamento com dois conjuntos de parcelas (gerarParcelas não é idempotente
-- e não há índice único hoje). Se voltar linha, o CREATE INDEX abaixo FALHA —
-- falha segura, nada é alterado — e o dado precisa de limpeza manual primeiro.
--   select orcamento_id, parcela_numero, count(*)
--     from public.pagamentos where parcela_numero is not null
--    group by 1,2 having count(*) > 1;

alter table public.orcamentos
  add column if not exists plano_forma            text,         -- 'avista' | 'parcelado' | null
  add column if not exists plano_parcelas         smallint,     -- null quando não parcelado
  add column if not exists plano_entrada_valor    numeric(10,2),
  add column if not exists plano_entrada_forma    text,
  add column if not exists plano_parcelas_forma   text,
  add column if not exists valor_acordado         numeric(10,2),-- null → usar total
  add column if not exists plano_definido_em      timestamptz,
  add column if not exists plano_definido_por_id  uuid references public.dentistas(id) on delete set null;

alter table public.orcamentos
  add constraint orcamentos_plano_forma_check check (
    plano_forma is null or plano_forma in ('avista','parcelado')),
  -- fecha o estado "parcelado sem N". Range igual ao que gerarParcelas já valida (:144).
  add constraint orcamentos_plano_parcelas_coerente check (
    (plano_forma is distinct from 'parcelado' and plano_parcelas is null)
    or (plano_forma = 'parcelado' and plano_parcelas between 2 and 24)),
  -- MESMO vocabulário de pagamentos.forma_pagamento. Sem 'transferencia' de propósito:
  -- hoje FormaRecebimento oferece um valor que o CHECK de pagamentos rejeita.
  add constraint orcamentos_plano_formas_check check (
    (plano_entrada_forma  is null or plano_entrada_forma  in ('dinheiro','pix','cartao_credito','cartao_debito','boleto','outro'))
    and (plano_parcelas_forma is null or plano_parcelas_forma in ('dinheiro','pix','cartao_credito','cartao_debito','boleto','outro'))),
  add constraint orcamentos_valor_acordado_check check (valor_acordado is null or valor_acordado > 0),
  add constraint orcamentos_plano_entrada_check check (plano_entrada_valor is null or plano_entrada_valor > 0);

-- A trava que impede o conjunto duplicado de parcelas
create unique index if not exists uq_pagamentos_orcamento_parcela
  on public.pagamentos (orcamento_id, parcela_numero) where parcela_numero is not null;

-- Backfill: NÃO altera pagamentos. Só preenche colunas novas (todas NULL agora),
-- derivando o acordo do que já está gravado. Idempotente pelo WHERE.
update public.orcamentos o
   set plano_forma = 'parcelado', plano_parcelas = p.total_parcelas,
       plano_parcelas_forma = p.forma_conhecida,       -- null se desconhecida: não inventar
       valor_acordado = coalesce(o.total, p.soma_parcelas),
       plano_definido_em = p.criado_em, plano_definido_por_id = o.dentista_id
  from (select orcamento_id, max(total_parcelas) total_parcelas, sum(valor) soma_parcelas,
               min(created_at) criado_em,
               (array_agg(forma_pagamento) filter (where forma_pagamento is not null))[1] forma_conhecida
          from public.pagamentos where total_parcelas is not null group by orcamento_id) p
 where o.id = p.orcamento_id and o.plano_forma is null;
```

**Rollback:** `drop index uq_pagamentos_orcamento_parcela`, `drop constraint` das 5, `drop
column` das 8. Derruba o acordo registrado **depois** da migration (esse dado não tem cópia);
o backfill é recuperável, porque é derivado de `pagamentos.total_parcelas`, que a migration
nunca tocou.

## 6. O custo real não é a DDL — são estas invariantes

| # | Invariante | Onde muda |
|---|---|---|
| I1 | quitação compara `coalesce(valor_acordado, total)`, nunca `total` cru | `registrarPagamento:475`, `marcarPagamentoPago:280`, `buscarOrcamentosPendentesPorPaciente:672` |
| I2 | `soma(pagamentos) <= coalesce(valor_acordado, total)` — nenhum caminho cobra mais que o acordado | os 4 escritores |
| I3 | `count(parcelas) = plano_parcelas` quando parcelado | `gerarParcelas` grava plano + linhas na **mesma transação** → vira RPC `SECURITY DEFINER`, no padrão de `aceitar_orcamento` (migration 113) |
| I4 | parcela fecha por **UPDATE**, nunca por INSERT — um escritor só | hoje só `marcarPagamentoPago:246-255` obedece |
| I5 | `condicoes_pagamento` é escrita a partir das colunas estruturadas, num lugar só | hoje: 0 escritores, 4 leitores |
| I6 | as colunas novas entram sob a policy existente de `orcamentos` — **exige teste de 2 contas** | — |

## 7. O atalho de 1 clique

### 7.0 Onde ele mora — decidido 30/07

> **Atrito de organização é barato. Atrito de gesto é caro.**
> Aba para o que se **consulta**; ação direta para o que se **faz** com alguém esperando.

O padrão de abas do [R-27](../_arquivo/specs/R-27-redesign-modais-orcamento.md) fica — ele
organiza bem os quatro assuntos do orçamento. **Menos numa coisa:** hoje "Registrar pagamento" é
uma **aba** (`detalhe-orcamento-modal`, ao lado de Procedimentos / Pagamentos / Atividade), e os
outros três são consulta enquanto esse é gesto de balcão.

Custo atual do gesto: abrir a modal → achar a aba → clicar → preencher. Com a confirmação
rotulada desta spec somada por cima, viraria o quarto clique de uma sequência que já é longa —
e a proteção que eu projetei viraria estorvo.

**Contrato:** registrar pagamento sai da aba e vira **ação persistente**, visível de qualquer
aba — na coluna de ação fixa que o próprio esqueleto do R-27 já define. As abas
Procedimentos / Pagamentos / Atividade ficam como estão.

**Isto é revisão deliberada de uma tela recém-redesenhada**, não conserto de descuido: o R-27
acertou o esqueleto; o que muda é a classificação de **um** dos quatro itens, de consulta para
ação. Decidido com o Mateus em 30/07, depois de ele levantar que o padrão atual é "mais atrito,
mais organização" — a distinção acima é o que separa o atrito que vale do que não vale.

### 7.1 O comportamento

**Recomendação: o atalho fecha a PRÓXIMA parcela aberta. Nunca quita o orçamento inteiro.**

- **Sem plano** (os 64 de hoje): continua **1 clique**, quitando `coalesce(valor_acordado, total)`
- **Com plano:** **1 clique + 1 confirmação rotulada** — `Parcela 2/3 · R$ 400,00 → Confirmar`.
  Botão, não formulário: nada para digitar

**Por que não "quita tudo":** é o único comportamento cujo erro é **invisível na tela**.
Fabrica receita que não entrou e órfã as parcelas pendentes. É exatamente o "caixa que não
fecha".

**Por que não "desabilitar":** é pior. A secretária está com o dinheiro na mão no balcão — se o
atalho estiver cinza ela usa "Registrar pagamento" e cria linha nova, que é a duplicação de
hoje com mais cliques. Desabilitar não remove o caminho ruim, remove o bom.

**Por que fechar a próxima parcela é o certo:** "Registrar Dinheiro" e "Confirmar Pagamento
PIX" são gestos de balcão — entrou dinheiro agora. No balcão o que entra é **uma parcela**. O
atalho já está semanticamente certo; o que está errado é o INSERT.

E há um segundo motivo para a confirmação que não é segurança: **hoje o atalho não diz quanto
vai gravar.** Ele lê `selected.total` e grava. A confirmação é a única superfície onde o número
aparece antes de virar dado.

### Primeiro: o que é "parcela aberta" — a definição que faltava

O verificador achou que meu contrato dizia "existe parcela aberta → fecha por UPDATE" **sem
definir o termo** — e que existe uma linha que cai no meio da ambiguidade.

`atualizarStatusOrcamento` (`orcamentos/actions.ts:90-108`), o 4º escritor, insere um pagamento
`status='pendente'` do **total cheio**, com `parcela_numero` e `total_parcelas` **NULOS**, quando
o status vira `aprovado` e não existe pagamento nenhum. Essa linha é um **avulso pendente**, não
uma parcela.

| Se "aberta" for definida como… | O atalho faz | Resultado |
|---|---|---|
| `status = 'pendente'` | fecha aquela linha de total cheio | ✔ correto — é exatamente o valor devido |
| `parcela_numero is not null` | não a enxerga, **INSERT de linha nova** | ✘ dobra a receita |

**Definição normativa desta spec:**

> **Parcela aberta** = linha de `pagamentos` do orçamento com `status = 'pendente'`, ordenada
> por `coalesce(data_vencimento, created_at)` ascendente, `parcela_numero` ascendente. A
> primeira dessa ordem é a que o atalho fecha. **`parcela_numero` não entra na definição** — ele
> só define o rótulo mostrado na confirmação (`Parcela N/M` quando existir, `Pagamento único`
> quando nulo).

Isso resolve os dois casos com uma regra só: o avulso pendente do 4º escritor **é** a próxima
aberta, e fecha por UPDATE como qualquer parcela.

### Contrato: `registrarPagamentoRapido(orcamentoId, formaPagamento, pagamentoId?)`

| # | Regra | Contra o que está hoje |
|---|---|---|
| 1 | uma leitura antes: plano + parcelas abertas + soma paga | hoje: zero leitura |
| 2 | existe parcela aberta → **delega ao UPDATE de `marcarPagamentoPago`** | hoje: INSERT sempre |
| 3 | sem parcela e nada pago → INSERT de `coalesce(valor_acordado, total)` | hoje: `dados.total` |
| 4 | sem parcela e já tem pago → INSERT do **saldo restante** | hoje: total cheio → cobra a mais |
| 5 | nunca UPDATE direto em `orcamentos.status`; usa a auto-aprovação travada **e** seta `aprovado_por_id`/`aprovado_em` | hoje: incondicional, sem autoria, retorno descartado |
| 6 | sempre `registrarLog('pagamento.registrado')` | hoje: nenhum log |
| 7 | `data_pagamento` em BRT | hoje: UTC |
| 8 | notificação usa o `dentista_id` da linha, não `dados.dentistaId` | hoje: pula em silêncio |
| 9 | erro sanitizado | hoje: `error.message` cru — e **não é desvio, é a regra**: `orcamentos/actions.ts` devolve erro cru em `:386, 456, 545, 593, 636, 645, 660, 703, 783`; só 3 pontos sanitizam (`:49, :193, :259`). Sanitizar é trabalho de ~9 pontos, não 1 (correção do verificador) |

## 8. Ordem de execução — 3 commits, do mais barato ao mais caro

1. **Apagar o INSERT em `receitas_manuais`** (`financeiro/actions.ts:737-744`). Mata a segunda
   fonte de verdade. 0 dado perdido. Commit sozinho. **Não precisa de spec.**
2. **Migration 116** (pré-flight → DDL → backfill), sozinha, com teste de 2 contas. Nada de
   código junto.
3. **O atalho + `gerarParcelas` como RPC.** Mexe em 4 escritores, em API e em regra de dinheiro.

## 9. Gates de aceite

| # | Gate |
|---|---|
| G1 | Pré-flight volta vazio; migration aplica; os 17 orçamentos parcelados ganham plano derivado correto |
| G2 | Gerar parcelas duas vezes no mesmo orçamento **falha** na segunda (índice único) |
| G3 | Orçamento à vista com desconto **auto-aprova** ao receber o valor acordado |
| G4 | Atalho sem plano: 1 clique, grava o valor acordado |
| G5 | Atalho com plano: mostra `Parcela N/M · R$ X` e fecha **por UPDATE** — zero linha nova |
| G6 | Atalho com parte já paga grava o **saldo**, não o total |
| G7 | `condicoes_pagamento` aparece no PDF, no prontuário e no WhatsApp |
| G8 | Pagamento registrado às 22h BRT tem a data de **hoje** |
| G9 | 2 contas: dentista e secretária vêem **o mesmo** total do mês para o mesmo recebimento |
| G10 | Rollback aplica e o sistema volta a funcionar |
| G11 | Registrar pagamento é alcançável **de qualquer aba**, sem trocar de aba antes (§7.0) |
| G12 | As abas Procedimentos / Pagamentos / Atividade continuam funcionando como hoje |

## 10. Decisões — tomadas 30/07

1. ~~Desconto à vista é percentual ou valor final?~~ **Valor final negociado.** O dentista digita
   quanto o paciente vai pagar (ex.: R$ 900 num orçamento de R$ 1.000) e isso vira
   `valor_acordado`. Mesmo vocabulário do campo que a tela de criar orçamento já usa — sem termo
   novo, e o valor devido é um número escolhido, não uma conta com centavo quebrado.
2. ~~Entrada gera linha de `pagamentos` na hora?~~ **Não — só registra o acordo.** A linha de
   pagamento nasce quando o dinheiro entrar. Não fabrica receita no caixa antes de existir.
3. **`atualizarStatusOrcamento` cria linha `pendente` do total cheio ao aprovar** (`:92-111`).
   Com plano registrado isso passa a estar errado. Entra no escopo do commit 3. *(segue aberto —
   é detalhe de implementação do commit 3, não bloqueia os commits 1 e 2.)*

## 11. Estado da execução — reconferido 30/07

Contagens refeitas contra produção antes de aprovar (a spec pedia isso na §2):

| Medida | 29/07 | **30/07** |
|---|---|---|
| `receitas_manuais` | 0 | **0** — a função nunca gravou |
| `pagamentos` com `dentista_id` NULL | 0 | **0** |
| `pagamentos` com `total_parcelas` | 17 | **17** |
| `orcamentos` | 64 | **65** |
| `condicoes_pagamento` preenchido | 0 | **0 de 65** |
| **Pré-flight: parcelas duplicadas** | — | **0 — o índice único aplica limpo** |

**Recorte, afinado 30/07:** parcelar e pagar já **funcionam** por Orçamentos e pelo perfil do
paciente — só o "Registrar recebimento" do Financeiro nunca funcionou. O commit 1 (§8) remove um
caminho morto, não tira função de ninguém.

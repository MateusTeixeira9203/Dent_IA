# Auditoria — Orçamento e financeiro · 2026-08-16

> Levantamento **só leitura** contra o banco de produção, disparado por três relatos dele:
> dentistas com dificuldade no orçamento, secretária da ClinDent com procedimento "voltando",
> e o botão do protético supostamente invisível pro admin.
> **Nenhuma escrita foi feita.** Nenhum dado de produção foi corrigido.
> Alimenta as specs **R-112**, **R-113** e **R-114**.

## 1. O status do orçamento não descreve a realidade

ClinDent, 109 orçamentos:

| Status | Qtd | Com pagamento recebido |
|---|---|---|
| aprovado | 73 | 47 |
| **rascunho** | **35** | **14** |
| enviado | 1 | 0 |
| recusado | **0** | — |

Dois dos quatro estados são letra morta. `rascunho` é contradito pelo dinheiro em 14 casos.

## 2. R$ 33.203,34 de receita real que o financeiro não mostra

O R-65 (09/08) fez o financeiro excluir pagamento cujo orçamento esteja em `rascunho`/`recusado`
— `.not('orcamentos.status','in','(rascunho,recusado)')` em 5 queries de `financeiro/actions.ts`
(:158, :215, :260, :523, :587) mais o guard de `pagamento-guards.ts`.

O efeito na ClinDent, por mês de `data_pagamento`:

| Mês | Valor oculto |
|---|---|
| 2025-09 | R$ 4.000,00 |
| 2025-10 | R$ 8.000,00 |
| 2026-01 | R$ 5.000,00 |
| 2026-03 | R$ 2.000,00 |
| 2026-05 | R$ 1.500,00 |
| 2026-06 | R$ 2.100,00 |
| 2026-07 | R$ 4.658,34 |
| 2026-08 | R$ 5.945,00 |
| **Total** | **R$ 33.203,34** em 22 pagamentos |

Dinheiro que entrou, está gravado como `pago`, e não aparece em nenhuma tela do financeiro.
O R-65 resolveu um risco hipotético e criou um real: ninguém mediu quantos pagamentos
verdadeiros moravam em rascunho antes de ligar o filtro.

→ **R-114** remove o filtro. A receita de meses fechados sobe retroativamente.

## 3. R$ 8.090,00 de saldo fantasma

12 orçamentos da ClinDent **já quitados** que ainda carregam parcela `pendente`. Causa: em
`/dashboard/orcamentos` não existe o gesto de fechar uma parcela específica — o formulário
"Registrar Pagamento" insere linha nova com `parcela_numero: null` e a parcela original nunca
fecha. O `ROADMAP.md` registrou 10 casos em 09/08; hoje são 12.

→ **R-113 Parte 1** porta o gesto que já existe na ficha do paciente.

## 4. Itens de orçamento duplicando por RLS assimétrica

Policies de `orcamento_itens`: INSERT (`can_act_as_dentista`) e UPDATE (`is_own_clinical_record`)
liberam **secretária**; DELETE (`orcamento_itens_delete_own`) é **só dono**. `editarOrcamento`
apaga tudo e reinsere checando só `error` — e DELETE barrado por RLS devolve sucesso com 0 linhas.

Casos encontrados na ClinDent:

| Orçamento | Sintoma | Quando |
|---|---|---|
| `75ca088c…` | 4 cópias de "ajuste oclusal por subtração"; total travado em R$550 enquanto os itens somam R$2.200 | 14/08, 12:00→12:21 |
| `874966cc…` | orçamento de implante inteiro duplicado — 6 itens viraram 12 | 13/08, 71 min de intervalo |
| `1465a8db…` | prótese total duplicada | **15/08, 13:47** |

O `activity_logs` do caso `75ca088c` mostra a secretária "Portaria" aprovando, cobrando, apagando
e re-registrando pagamento entre as inserções — o retrato de alguém tentando consertar uma tela
que piorava a cada tentativa. `editarOrcamento` não grava nada no log, embora
`ORCAMENTO_EDITADO` exista em `events.ts:13`.

→ **R-113 Parte 2**. Correção do dado existente **não foi feita** — espera aprovação dele, item a item.

## 5. O beco do filtro no modal de orçamento

`abrirNovoOrcamento` abre com filtro fixo em "Meus"; os chips só renderizam com ≥2 responsáveis;
o reset do R-18 nunca foi portado pro modal. Quem não é autor dos indicados abre a tela vazia
sem controle pra corrigir.

| Medida (ClinDent) | Valor |
|---|---|
| Pacientes com indicado em aberto | 44 |
| Indicados em aberto | 186 |
| Pacientes com **1 só** responsável (chips não aparecem) | **42** |
| Pacientes com 2+ | 2 |

→ **R-112**.

## 6. Botão primário do sistema reprova AA

`bg-teal` + `text-white` mede **3,38:1** nos dois temas; AA exige 4,5 pra texto de 14px.
**103 ocorrências em 97 arquivos** — "Registrar Dinheiro", "Salvar", "Confirmar", cadastro,
convites, agenda. O `globals.css` já documenta que a família viva é fill, não texto — o botão
só nunca seguiu a regra. Trocar o fundo por `--teal-ink` mede 6,01 light / 8,6 dark.

**Nada aplicado** — é o botão primário de toda a aplicação e a decisão visual é dele.
Mesmo tratamento que o R-94 deu ao achado do `slate-ink`.

→ vira item ⏳ próprio quando ele decidir.

## 7. Protético — o relato procede, e a causa era cadastro

O bloco "Enviar pro protético" (R-94) **não tem gate de role** — admin, dentista e secretária
veem igual. A única condição é a clínica ter protético com `ativo = true`.

A ClinDent tem **duas** linhas do mesmo protético: uma criada 14/08 20:40 **inativa**, outra
15/08 09:34 ativa. Entre um momento e outro o bloco não renderizava — comportamento correto
segundo a spec, mas invisível pra quem reportou. **Deve aparecer agora.**

Duas limitações de recorte do R-94, não bugs: o pedido só pode ser criado **junto com um
agendamento novo** (o modal de editar não tem o bloco), e a ClinDent tem **0 pedidos** criados
até hoje — o módulo está no ar e nunca foi usado.

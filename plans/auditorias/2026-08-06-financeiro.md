# Auditoria — Financeiro (orçamento, pagamentos, parcelas, dashboard)

> **AUDITORIA COMPLETA** · Financeiro (dashboard, orçamentos, pagamentos, parcelas, despesas/receitas)
> · 2026-08-06 · **Técnica, leitura de código + banco de produção** · zero escrita, zero clique
> **Autorização:** Mateus, "varredura completa do financeiro... se aprofunde mais pra deixarmos 100%"
> **Ambiente:** leitura direta do schema/dado de produção (projeto `zenfemoxvwerplrjgfqz`) + leitura
> de código. **Sem teste ao vivo no browser** — pane embutido não composita nesta sessão (mesma
> falha já registrada em auditorias anteriores), Playwright MCP sem Chrome instalado (instalação
> pede administrador, indisponível aqui).
> **Origem:** continuação da investigação de bugs na ficha/prontuário (ver
> [R-59](../specs/R-59-ficha-orcamento-integridade.md)) — o usuário pediu a varredura completa do
> financeiro na mesma sessão.

## Veredito

O financeiro tem **dois problemas de integridade financeira ativos, com dado real de produção
provando**: a Receita/Receita Prevista soma dinheiro de orçamentos recusados e ainda-rascunho, e
9 orçamentos têm parcela "pendente" fantasma (paciente já pagou o total, sistema ainda mostra
devendo). Nenhum dos dois é regressão recente — são buracos estruturais nunca fechados. Fora
isso, o padrão de erro-descartado-em-silêncio que já derrubou `/dashboard/orcamentos` por 2 meses
em 17/07 está espalhado por quase toda leitura do módulo, incluindo 4 pontos fora do financeiro
estrito (timeline do paciente, "próximo agendamento", export de prontuário) achados na mesma
varredura.

## Achados

| # | Severidade | Onde | O quê | Confiança |
|---|---|---|---|---|
| 1 | **Crítico** | `financeiro/actions.ts` (`calcularSaldoMes`, `listarUltimosMeses`, `listarUltimos7Dias`, `listarPagamentosPagos/Pendentes`, `exportarFinanceiroCsv`) | Receita/Receita Prevista somam `pagamentos.valor` filtrando só o status do **pagamento** — nunca olham `orcamentos.status`. Provado com dado real: **R$ 105.501,04 pago + R$ 1.050 pendente presos a 1 orçamento `recusado`**; **R$ 32.353,34 pagos presos a orçamentos ainda `rascunho`** (nunca aprovados). Causa raiz: nenhuma trava de estado — dá pra gerar parcela em orçamento de qualquer status, e dá pra recusar orçamento que já tem pagamento anexado (UI oferece as 4 transições sem restrição, `orcamentos-client.tsx:1186`) | Alta — query rodada contra produção |
| 2 | **Crítico** | Pagamentos/parcelas — [R-28](../specs/R-28-pagamento-fecha-sem-duplicar.md) Parte 3 | Parcela "pendente" que deveria fechar sozinha quando outro pagamento já cobriu o total continua sem essa checagem (`registrarPagamento`, `orcamentos/actions.ts:505-607`, insere sem checar parcela equivalente). **9 orçamentos reais hoje** com `total_pago ≥ valor_devido` e parcela `pendente` ainda aberta — a spec de 31/07 citava 2 exemplos, cresceu pra 9 | Alta — mesma query da spec original, rodada de novo |
| 3 | **Alto** | `DetalheOrcamentoModal` dentro da ficha do paciente (`paciente-detail-client.tsx:1471-1483`, `orcamentos/actions.ts:943-947`) | Secretária clica "Excluir orçamento" — a policy `orcamentos_delete_own` não libera secretária (diferente das policies-irmãs do mesmo domínio), o DELETE é bloqueado de verdade pela RLS, mas `excluirOrcamento` não confere `.select()`/linhas afetadas: retorna sucesso, a tela remove o item e fecha o modal. O orçamento **continua no banco** — reaparece só num reload. O mesmo botão já está corretamente escondido pra secretária em `/dashboard/orcamentos` (`orcamentos-client.tsx:1079`) — só a superfície da ficha do paciente ficou destravada | Alta — RLS conferida direto no banco |
| 4 | **Alto** | `get-visible-timeline-events.ts:69,78` · `get-patient-workspace-data.ts:112` · `api/pacientes/[id]/prontuario/route.ts:48` | 4 embeds `dentista:dentistas(nome)` sem desambiguar (`agendamentos` tem 2 FKs pra dentistas, `orcamentos` tem 3) — mesma classe que derrubou `/dashboard/orcamentos` por ~2 meses em 17/07, nunca corrigida nestes 4 pontos. Efeito: timeline do paciente nunca mostra "Consulta agendada/cancelada/reagendada" nem "Orçamento criado"; o widget "próximo agendamento" do perfil sempre mostra vazio; **o export de prontuário completo (`/api/pacientes/[id]/prontuario`) sai sem nenhuma consulta**. Varri os 14 pontos do código inteiro que embutem `dentistas` — só estes 4 estão quebrados, os outros 10 (todos em `fichas`/`pacientes`, só 1 FK) estão seguros | Alta — confirmado linha a linha + FKs conferidas no schema |
| 5 | **Alto** | `financeiro/actions.ts` (quase toda função de leitura) | Padrão sistemático de `const { data } = await query` sem checar `error`, resultado em `data ?? []`. Lista: `listarDespesas:130`, `calcularSaldoMes:168`, `listarUltimos7Dias:212`, `listarUltimosMeses:259`, `listarReceitas:366`, `listarPagamentosPagos:569`, `listarPagamentosPendentes:608`, `exportarFinanceiroCsv:509`, `buscarOrcamentosPendentesPorPaciente:648,655`, `dentistasClinica` (`page.tsx:54`). Hoje nenhum desses embeds está ambíguo (achado 4 é fora deste arquivo) — mas qualquer falha de rede/RLS futura vira "R$ 0" / "nada este mês" sem aviso nenhum, o mesmo mecanismo do incidente de 17/07, só que sem gatilho ativo agora | Alta — grep + leitura confirmados |
| 6 | **Médio** | `atualizarStatusOrcamento` (`orcamentos/actions.ts:104-124`) | Corrida check-then-act: aprovar sem plano lê `count` de pagamentos e só insere pendente se `count===0`, sem lock. O único freio é um `setTimeout(1200ms)` local no modal — não amarrado à promise, não vale entre abas/usuários. Dois cliques rápidos ou 2 dentistas aprovando quase-junto podem duplicar a linha de dívida | Média |
| 7 | **Médio** | `excluirDespesa`/`excluirReceita` (`financeiro/actions.ts:331-347,416-432`) | `.delete()` sem `.select()` — mesma classe do achado 3. Não é furo de acesso hoje (RLS já restringe igual ao que a UI restringe), mas herda o mesmo risco se a policy mudar | Média |

## Esclarecido nesta auditoria (não é achado novo, é correção de entendimento)

- **O "trigger" de `pago_total`/`situacao_pagamento` da memória do projeto nunca existiu.**
  Conferido no schema ao vivo: essas colunas não existem em `orcamentos`; `pg_trigger` só tem os
  genéricos de `updated_at`. O que existe são **3 cálculos redundantes e independentes** no
  código (`marcarPagamentoPago:365`, `registrarPagamento:565`, `registrarPagamentoRapido:805`),
  cada um refazendo `pagamentos.filter(status==='pago').reduce(valor)`. Não é drift entre trigger
  e tela — é ausência de fonte única. Memória `project_financeiro_correcao_spec.md` desatualizada
  neste ponto.
- **`registrarRecebimento` NÃO é código morto.** Chamado de verdade por `financeiro-client.tsx:33,198`,
  botão "Registrar Recebimento" visível só pra secretária. A nota "0 uso em prod" (17/07) está errada hoje.
- **Cálculo de parcelas (RPC `gerar_parcelas_orcamento`, migration 122) não tem bug de arredondamento** —
  usa centavos em `bigint`, resto vai pra última parcela, soma sempre bate exato.

## Aberto — precisa da sua decisão, não tratei como bug

**RLS de `pagamentos` — admin não vê pagamento registrado por outro dentista da clínica.**
Policy `pagamentos_access` usa `is_own_clinical_record`, que só abre exceção pra `secretaria`, não
pra `admin`. Contradiz "admin vê tudo", mas bate com a nota de memória "dinheiro/agenda privados"
(hierarquia 3.1) e com o comentário da própria migration 089 ("silo por dentista"). Pode ser
decisão deliberada — preciso que você confirme antes de eu tratar isso como defeito.

## Não verificado

- **Nenhum teste ao vivo no browser** — os 2 caminhos tentados (pane embutido, Playwright) falharam
  por limitação de ambiente, não por causa do código. Achados desta auditoria vêm de leitura de
  código + consulta direta ao schema/dado real de produção, não de clique na tela.
- **A anomalia do orçamento `e39b2041...`** (recusado, com R$ 105.501,04 em pagamento 'pago' contra
  R$ 1.050 de dívida) é o mesmo registro do achado 1 — não investiguei se os R$ 105 mil são vários
  pagamentos somados por engano ou 1 lançamento com valor digitado errado.
- **Mobile e light mode** — fora do escopo desta auditoria (é técnica, não visual).
- **RLS de `orcamento_itens`, `despesas`, `receitas_manuais`** — não auditadas policy por policy,
  só onde o comportamento observado exigiu conferir.

## Cobertura

| Área | Técnica | Não coberto |
|---|---|---|
| `financeiro/actions.ts` (dashboard, receita, despesas) | Leitura completa + conferência no banco | — |
| `orcamentos/actions.ts` (CRUD, status, pagamentos, parcelas) | Leitura completa + conferência no banco | — |
| Modais de orçamento na ficha do paciente | Leitura completa | Clique ao vivo |
| `get-visible-timeline-events.ts`, `get-patient-workspace-data.ts`, export de prontuário | Leitura completa + FKs conferidas no schema | Clique ao vivo |
| RPCs de parcela (migration 116/122) | Leitura completa da função SQL | — |
| RLS de `orcamentos`/`pagamentos` | Policies lidas via `pg_policies` | `despesas`/`receitas_manuais` só parcial |

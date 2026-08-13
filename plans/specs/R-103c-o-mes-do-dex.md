# R-103c — Coluna "O mês" do Dex

> **SPEC** · **R-103c** · status: **🟡 codado, não commitado — G3/G4/G5/G8 pendentes (2 contas
> reais, secretária, protético, design-review)**
> **Aberto:** 2026-08-12 · **Fechado:** —
> **Modelo:** Sonnet 5 — escopo "meu" já resolvido por D11 (R-103a), nenhuma RLS nova nem
> assimetria a cruzar (a de `fichas` já foi mapeada e resolvida pelo R-103b). É arithmetic +
> 1 rota nova no mesmo molde das irmãs.
> **Master:** [R-103](R-103-painel-do-dex.md) — problema, fala do usuário (§2) e recorte (§3).
> **Depende de:** [R-103a](../_arquivo/specs/R-103a-destravar-o-dex.md) — a casca de 3 colunas,
> `ColunaNumeros`, `useDexHub`, `tipos.ts`. No ar (`b427391`). **Não depende do R-103b** — são
> fatias paralelas do mesmo master. **Bloqueia:** nada.
> **Artefato:** `plans/artefatos/R-103-painel-do-dex.html` — **não conferido nesta spec.** Esta
> sessão não tinha como servir o HTML por HTTP local (sem browser/computer-use disponível); ler
> o arquivo cru é proibido pela regra do projeto. O bloco "O mês" do artefato fica como gap não
> verificado — ver §6.

## 1. Decisão

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | **Rota nova** `GET /api/dex/mes`, Route Handler + `getDentistaCached` + `withRateLimit` | (a) Estender `/api/dex/context`; (b) Server Action no molde de `financeiro/actions.ts` (`requireClinicContext`) | (a) `context` já tem 13 queries paralelas de contagem pura (`head:true`); a natureza aqui é diferente (linhas cruas pra agregar, não contagem), mesmo raciocínio do D1 do R-103b. (b) `useDexHub.carregar()` já é `Promise.all` de `fetch()` uniforme com rate limit em toda rota do Dex; misturar 1 Server Action ali quebraria esse contrato só pra copiar a assinatura de auth do financeiro. "Copiar o molde" (pedido do master) é copiar o **padrão de janela de mês**, não o mecanismo de auth |
| ~~D2~~ | ~~Definição de "recorrente"~~ — **cortado, não vira métrica nesta fase** | Propor uma definição técnica (3 alternativas levantadas) | **Decisão dele, 12/08:** sem conceito de recorrência hoje em nenhum lugar do código, e nenhuma das 3 leituras (ficha antes do mês / mês anterior / 2+ no mês) tinha um "óbvio certo" — tirar é melhor que forçar uma métrica que ele mesmo não confia. Coluna "O mês" fica com 3 números, não 4. Pode virar item próprio depois, com uma definição vinda dele, não do planner |
| D3 | **Δ é só de "atendimentos"**, em card dedicado "Crescimento" (3º card) — não aplicado a visitas-por-paciente | Δ nas 2 métricas | Fala literal dele no master §2: **"% de crescimento dos atendimentos"** — o pedido é específico de atendimentos. Não confirmado contra o artefato (§6) |
| D4 | Query em **1 estágio só**: fichas do mês atual (linhas cruas) + contagem do mês anterior, em paralelo — sem 2º estágio dependente | O plano original tinha um 2º estágio pra achar "quem já tinha ficha antes" (só existia por causa de D2) | Com D2 cortado, não existe mais nada que precise olhar pra fora da janela do mês atual/anterior. A rota fica mais simples do que a 1ª versão desta spec — corte de escopo virou corte de código, não só de UI |
| D5 | **Sem índice novo** nesta fase | Índice composto em `fichas(clinica_id, data_atendimento)` | Mesmo raciocínio do D4 do R-103b e do comentário da migration 100 ("sem índice novo, 33 fichas em prod"). Gatilho de revisão: EXPLAIN com seq scan caro, ou uma clínica passando de alguns milhares de fichas |
| D6 | **Remove** de `context.ts` as 4 queries que ficam órfãs: `consultasSemana`, `orcamentosAprovadosSemana`, `orcamentosPendentes`, `aniversariantesHoje` | Deixar paradas no `DexContextData` | `grep` confirma: as 4 só alimentavam `construirNumeros(ctx)`, que passa a consumir `/api/dex/mes`. Nenhum outro ponto do hub as lê (a faixa "agora" usa `proximoPaciente`, `agendamentosHoje`, `entrouHoje`, `agendamentosAmanha` — nenhum dos 4). Deixar paradas é 4 round-trips desperdiçados toda vez que o hub abre (Performance, CLAUDE.md) |
| D7 | Protético ganha **gate explícito** na rota nova — zerado, nenhuma query dispara | Deixar sem gate (como `context` hoje) | `context` não gateia porque protético nunca chega lá (bola escondida, `floating-dock.tsx:128`). Defesa em profundidade é barata e é o mesmo padrão que `alerts`/`retencao` já adotaram — reforça I7 do R-103a |
| D8 | `DexNumero` e `DexHubData` **não mudam de shape** — só o conteúdo que popula `numeros` muda | Adicionar campos novos em `DexNumero` (ex.: `delta`) | `{ label, valor, detalhe }` já aguenta os 4 cards (Δ formatado como texto no `detalhe`/`valor` do card "Crescimento", igual R-103a fez pra tudo que já existe). Menor superfície de mudança em `coluna-numeros.tsx`, `dex-hub-modal.tsx` |

## 2. Objetivo

A coluna 2 do hub deixa de ser "Hoje e a semana" (provisória, D10 do R-103a) e vira "O mês":
3 números reais — atendimentos, visitas por paciente, crescimento — com fonte em `fichas`, sem
inventar dado. Sem card de "recorrentes" (D2 — cortado, ver §1).

**Cobre:** rota `/api/dex/mes` · função pura `calcularNumerosMes` testável (molde de
`retencao.ts`) · troca de título "Hoje e a semana" → "O mês" em `coluna-numeros.tsx` · remoção
das 4 queries órfãs de `context.ts` (D6) · escopo "meu" (D11 herdado, `scopado = role !==
'secretaria'`).

**Não cobre:** métrica de "paciente recorrente" (D2 — cortada, sem definição confiável hoje;
pode virar item próprio no futuro) · redesenho visual da coluna (mesma estrutura de card do
R-103a, só o conteúdo muda) · qualquer métrica de dinheiro (caixa já está no Dashboard/
financeiro, fora do escopo do Dex) · mudança na faixa "agora" (segue vindo de `context.ts`,
intocada) · R-104.

## 3. Assunções

- **Não filtrei por `fichas.origem`.** Um import em lote (R-46c, `origem='importado'`) que grave
  `data_atendimento` retroativa **dentro do mês atual** infla "atendimentos" artificialmente.
  Não medi se isso acontece na prática — histórico transcrito normalmente carrega data passada
  de verdade, não deste mês, mas não é garantido pelo schema.
- **D3 (Δ só de atendimentos) não foi conferido contra o artefato** — ver §6, gap não verificado
  nesta sessão. Resolvido por leitura da fala literal do usuário no master §2, não por pixel.
- **Não medi o volume real de `fichas` por clínica hoje** — a migration 100 registra 33 em prod
  na época; o produto está em uso há semanas desde então (R-46/R-46d) e pode ter crescido. D5 tem
  o gatilho de revisão.

---

## 4. Contrato técnico

### 4.1 Schema e RLS

**Nenhuma migration. Nenhuma policy nova.** As queries usam o client normal (RLS ligada), mesmo
padrão de toda rota do Dex. A mesma assimetria que o R-103b já mapeou vale aqui: `fichas_select`
(migration 099) é **da clínica inteira**, não por dentista — o filtro `dentista_id` quando
`scopado` é obrigação da query, não da RLS (herdado do R-103b §4.1, não repetido aqui).

### 4.2 TypeScript

```typescript
// src/lib/dex/tipos.ts — adição
export interface DexMesData {
  atendimentos: number;
  atendimentosMesAnterior: number;
  /** null = mês anterior sem atendimentos, sem base pra calcular % */
  crescimentoPct: number | null;
  pacientesAtendidos: number;      // distintos este mês
  visitasPorPaciente: number;      // atendimentos / pacientesAtendidos; 0 se pacientesAtendidos = 0
}
```

```typescript
// src/lib/dex/numeros-mes.ts — novo. Função PURA, sem fetch, sem React (molde de retencao.ts).
export interface FichaMesRaw { pacienteId: string }

export function calcularNumerosMes(
  fichasMesAtual: FichaMesRaw[],   // 1 linha por atendimento; repete pacienteId se >1 no mês
  atendimentosMesAnterior: number,
): DexMesData
```

**Algoritmo:**
1. `atendimentos = fichasMesAtual.length`.
2. `pacientesAtendidos = new Set(fichasMesAtual.map(f => f.pacienteId)).size`.
3. `visitasPorPaciente = pacientesAtendidos > 0 ? atendimentos / pacientesAtendidos : 0`.
4. `crescimentoPct = atendimentosMesAnterior > 0 ? Math.round((atendimentos - atendimentosMesAnterior) / atendimentosMesAnterior * 100) : null`.

### 4.3 Rotas

#### GET /api/dex/mes

| | |
|---|---|
| Auth | required (`getDentistaCached`) |
| Rate limit | sim — `dex:mes`, 60/60s (mesmo padrão de `context`/`alerts`/`retencao`) |
| Protético | gate — devolve `DexMesData` zerado, nenhuma query roda (D7) |

**Response (sucesso):** `DexMesData` (§4.2), sempre 200 — mesmo padrão de `context`/`alerts`/
`retencao`: catch cai pra zerado, não pra erro.
**Erros:** sem autenticação → 401.

**Implementação** — 1 estágio, 2 queries em paralelo (D4), `scopado = role !== 'secretaria'` (D11):

```typescript
// A: fichas deste mês, linhas cruas
supabase.from('fichas')
  .select('paciente_id, data_atendimento')
  .eq('clinica_id', dentista.clinica_id)
  .gte('data_atendimento', inicioMes)       // 'YYYY-MM-DD' -- coluna e `date` (migration 100)
  .lt('data_atendimento', inicioProxMes)
  // + .eq('dentista_id', dentista.id) quando scopado

// B: contagem do mes anterior (so total, alimenta o Delta)
supabase.from('fichas')
  .select('id', { count: 'exact', head: true })
  .eq('clinica_id', dentista.clinica_id)
  .gte('data_atendimento', inicioMesAnterior)
  .lt('data_atendimento', inicioMes)
  // + .eq('dentista_id', dentista.id) quando scopado
```

Depois: `calcularNumerosMes(A, B.count ?? 0)`.

### 4.4 Componentes

```
src/lib/dex/tipos.ts              -- + DexMesData
src/lib/dex/numeros-mes.ts        -- NOVO: calcularNumerosMes() -- funcao pura (parte 4.2)
src/app/api/dex/mes/route.ts      -- NOVO (parte 4.3)
src/app/api/dex/context/route.ts  -- remove consultasSemana, orcamentosAprovadosSemana,
                                      orcamentosPendentes, aniversariantesHoje e as 4 queries que
                                      so as alimentavam (D6)
src/hooks/useDexHub.ts            -- Promise.all vira 4 fetches (retencao do R-103b + mes);
                                      construirNumeros(ctx) troca por
                                      construirNumerosMes(mes: DexMesData | null) -- so formatacao
                                      pt-BR, 0 logica de negocio (mora em numeros-mes.ts)
src/components/layout/dex-hub/coluna-numeros.tsx -- titulo "Hoje e a semana" -> "O mes" (resolve
                                      D10 do R-103a); resto do componente nao muda -- segue
                                      recebendo DexNumero[] generico
```

`dex-hub-modal.tsx`, `coluna-pendencias.tsx`, `pendencia-card.tsx` **não mudam** — a faixa "agora"
continua vindo de `context.ts` intocada.

**Formatação em `construirNumerosMes` (useDexHub):**

| Card | `valor` | `detalhe` |
|---|---|---|
| Atendimentos | `String(mes.atendimentos)` | `null` |
| Visitas por paciente | `mes.visitasPorPaciente` em pt-BR 1 casa decimal, ou `'—'` quando `pacientesAtendidos = 0` | `null` |
| Crescimento | `'+N%'`/`'-N%'` quando `crescimentoPct !== null`; `'novo'` quando mês anterior = 0 e atual > 0; `'—'` quando os 2 meses são 0 | `${atendimentos} vs ${atendimentosMesAnterior} no mês passado`, ou `'sem atendimentos no mês passado'` quando anterior = 0 |

## 5. Comportamento

| Estado | Quando | Tela |
|---|---|---|
| Mês sem atendimento | 0 fichas no mês atual | Atendimentos "0" · Visitas/paciente "—" · Crescimento conforme mês anterior |
| Mês anterior sem atendimento | `atendimentosMesAnterior = 0`, mês atual > 0 | Crescimento mostra "novo", detalhe "sem atendimentos no mês passado" |
| Secretária | `role === 'secretaria'` | os 3 números somam a clínica inteira (sem filtro de dentista) |
| Protético | `role === 'protetico'` | rota devolve zerado sem query (D7) |

```
useDexHub.carregar()
  -> Promise.all(/api/dex/alerts, /api/dex/context, /api/dex/retencao, /api/dex/mes)
  -> construirNumerosMes(mes) -> 3 DexNumero -> coluna "O mês"
```

| Situação | Sistema faz | Resultado |
|---|---|---|
| Paciente com 3 fichas este mês | 3 linhas em A, 1 paciente distinto | atendimentos +3, pacientesAtendidos +1, visitasPorPaciente sobe |
| Clínica sem ficha nenhuma nos 2 meses | A e B vazios | os 3 cards mostram "0"/"—", nunca erro nem número inventado |
| Import em lote (R-46c) grava fichas retroativas dentro do mês atual | sem filtro de `origem` | infla atendimentos — gap sinalizado em §3, não coberto por este item |
| Dentista A e B na mesma clínica, paciente só de B | `scopado` filtra `dentista_id` nas 2 SELECTs | A não vê esse paciente em nenhuma das 3 métricas |

## 6. Referência visual

`plans/artefatos/R-103-painel-do-dex.html` — o bloco "O mês" **não foi conferido nesta sessão**.
Não havia como servir o HTML por HTTP local (sem browser/computer-use disponível neste contexto),
e ler o arquivo cru é proibido pela regra do projeto (`artefato-visual`). D3 (Δ só de
atendimentos, em card dedicado) foi resolvido por texto — a fala literal dele no master §2 — não
por pixel. **Gate de design-review obrigatório antes de fechar**, mesma prática que o R-103b já
registrou pro bloco de retenção.

---

## 7. Fases

| Fase | Ações | Risco | Verificável | Depende |
|---|---|---|---|---|
| **1 — Função pura** | `src/lib/dex/numeros-mes.ts` (`calcularNumerosMes`), `DexMesData` em `tipos.ts` | BAIXO | fixtures cobrindo: mês vazio, mês anterior vazio, mês com atendimentos, paciente com múltiplas fichas no mês — `node --test`, função pura sem rede | — |
| **2 — Rota** | `src/app/api/dex/mes/route.ts`, as 2 queries em paralelo, gate protético, rate limit | MÉDIO | resposta como dentista bate com contagem manual em produção (Clindent ou clínica de teste); resposta como secretária soma a clínica inteira | 1 |
| **3 — Fiação + limpeza** | `useDexHub` vira 4 fetches; `construirNumerosMes` substitui `construirNumeros`; `coluna-numeros.tsx` troca o título; `context.ts` perde as 4 queries órfãs (D6) | MÉDIO | coluna 2 mostra "O mês" com dado real; `context.ts` sem `consultasSemana`/`orcamentosAprovadosSemana`/`orcamentosPendentes`/`aniversariantesHoje` | 2 |
| **4 — Gates** | rodar G1-G8 (§9) | BAIXO | todos fechados | 1-3 |

### Riscos

| Risco | Prob. | Mitigação |
|---|---|---|
| Filtro de `dentista_id` esquecido em alguma das 2 SELECTs — vaza atendimento de colega no número | média | Mesmo risco já mapeado pelo R-103b; G3 é o gate com 2 contas reais |
| Import em lote (R-46c) infla o mês corrente | baixa (imports normalmente carregam data passada) | Sinalizado em §3; não é bloqueante, é gap documentado |
| `crescimentoPct` undefined/Infinity quando mês anterior = 0 | média sem tratamento explícito | §4.4 já define o caso (`null` + `'novo'` na formatação) — coberto por fixture da fase 1 |

## 8. Invariantes

- [x] **I1** — Nenhum número na coluna "O mês" sem origem em query. Zero fallback pra valor
      bonito quando o fetch falha (mesmo `DexMesData` zerado, nunca um placeholder inventado).
      Testado ao vivo: 6 atendimentos reais renderizados, nenhum mock.
- [ ] **I2** — As 2 queries novas filtram `clinica_id` sempre, e `dentista_id` explicitamente
      quando `scopado` — a RLS de `fichas` sozinha não impõe isso (herdado do R-103b I3). Código
      revisado, filtro presente — **falta G3 (2 contas reais) pra virar garantia**, mesmo status
      do R-103b.
- [x] **I3** — `crescimentoPct` nunca é `NaN`/`Infinity` — mês anterior = 0 sempre vira `null` +
      tratamento explícito na formatação. Coberto por G2.
- [x] **I4** — `visitasPorPaciente` nunca é `NaN` — `pacientesAtendidos = 0` sempre vira `0` na
      função pura, `'—'` na formatação. Coberto por fixture "mês vazio".
- [x] **I5** — Protético nunca alcança `/api/dex/mes` com query real (D7). Código revisado (mesmo
      padrão de `alerts:37`/`retencao`) — falta G5 (login real) pra confirmar ao vivo.
- [x] **I6** — Zero migration, zero policy nova neste item. `git status` confere.

## 9. Gates de aceite

- [x] **G1** — Fixture: mês atual com 5 fichas de 3 pacientes distintos → `atendimentos=5`,
      `pacientesAtendidos=3`, `visitasPorPaciente≈1.67`. `node --test`, 7/7 passando
- [x] **G2** — Fixture: mês anterior com 0 fichas, mês atual com fichas → `crescimentoPct=null`,
      formatação mostra "novo" (I3)
- [ ] **G3** — 2 contas logadas (dentista A, dentista B, mesma clínica): fichas exclusivas de B
      nunca entram nos 3 números de A (I2) — teste manual, não script. **Pendente — precisa de
      você, mesmo bloqueio do G3 do R-103b**
- [ ] **G4** — Login como secretária: os 3 números somam os 2 dentistas. **Pendente**
- [ ] **G5** — Login como protético: `/api/dex/mes` não dispara query, resposta zerada (I5).
      **Pendente**
- [x] **G6** — Clínica sem ficha nenhuma nos 2 meses: coberto por fixture ("mês vazio", 7/7).
      Não observado ao vivo (a clínica de teste tinha 6 atendimentos reais no mês)
- [x] **G7** — `context.ts` sem `consultasSemana`/`orcamentosAprovadosSemana`/
      `orcamentosPendentes`/`aniversariantesHoje` — `grep` confirma (D6)
- [ ] **G8** — Light e dark, comparado com o artefato — primeira conferência real do bloco "O mês"
      (§6 estava pendente até aqui). **Pendente**

**Verificado nesta sessão:** typecheck + lint limpos, `next build` passa, 7/7 fixtures
(`numeros-mes.test.ts`) + as 12 do R-103b (19/19 no total, `node --test`). Testado ao vivo em
`localhost:3000` (Império, logado): coluna "O mês" renderizou com dado real — 6 atendimentos, 1,5
visitas/paciente, +200% de crescimento (6 vs 2 no mês passado) — zero erro no console.

**G1 e G3 definem o item.** G1 fechado. **G3 segue aberto**, mesmo motivo do R-103b — só ele pode
logar como 2 dentistas reais.

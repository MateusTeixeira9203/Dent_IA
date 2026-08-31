# R-139c — Status clínico confiável na saída do Dex

> **SPEC** · **R-139c** · 🔵 ativo
> **Aberto:** 2026-08-28 · **Fechado:** — · **Fase:** aprovada para execução · **Revisão:** 2

## 1. Problema

O usuário confirmou em produção que toda saída do Dex chega como **realizada**, inclusive
procedimentos apenas indicados. A revisão 1 corrigiu um overwrite determinístico no Meu Dia e
essa correção continua válida: mescla, payload, RPC e releitura preservam o status recebido.

A validação real, porém, invalidou a premissa de que a classificação do endpoint estava correta.
Hoje `parseEventos` só produz `realizado` quando o Gemini devolve
`evidencia_status: 'execucao_explicita'`; a hipótese principal é que o modelo esteja usando essa
evidência também para necessidade/planejamento. O prompt contribui: seus campos iniciais falam em
“procedimentos realizados” e o único exemplo JSON completo é realizado.

Consequência: um planejamento pode virar registro de execução clínica sem o dentista perceber.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Reabrir o mesmo item como revisão 2 | declarar a correção downstream pronta | o resultado clínico do item falhou |
| Prompt neutro + exemplos balanceados | lista crescente de palavras proibidas | exemplos contrastivos generalizam melhor |
| `execucao_explicita` é a única promoção para realizado | confiar no `status` sugerido pelo modelo | backstop determinístico já existente |
| Ambíguo/histórico nasce indicado e revisável | escolher realizado “por contexto” | falso realizado é o erro de maior consequência |
| Eval antes/depois com repetição | ajustar o prompt por uma demonstração | saída probabilística exige evidência comparável |
| Testar bruto → parser → persistência | apenas teste unitário da mescla | o defeito atual está antes da mescla |
| Sem conteúdo clínico em logs | salvar prompt/resposta para depuração | prontuário não pode virar log operacional |

## 3. Objetivo e como funciona

**Objetivo:** a mesma captura pode gerar eventos realizados e indicados, e nenhum evento vira
realizado sem uma frase que declare explicitamente a execução daquele procedimento.

Relato normativo:

> “Hoje fiz restauração no 14. O 46 precisa de tratamento de canal.”

Saída obrigatória: restauração 14 `realizado + execucao_explicita`; endodontia 46
`indicado + indicacao_explicita`. Meu Dia e Ficha preservam essa distinção até a releitura.

## 4. Contrato técnico

### 4.1 Evidência e normalização

```ts
type EvidenciaStatus =
  | 'execucao_explicita'
  | 'indicacao_explicita'
  | 'negacao'
  | 'historico'
  | 'ambiguo';

type ClassificacaoDex = {
  status: 'indicado' | 'realizado';
  revisar_status: boolean;
};

function classificarStatusDex(
  evidencia: EvidenciaStatus,
  modo: 'consulta' | 'exame_inicial',
  statusSugerido: 'indicado' | 'realizado',
): ClassificacaoDex;
```

Contrato em `consulta`:

| Evidência | Status | Revisar |
|---|---|---|
| `execucao_explicita` | `realizado` | não |
| `indicacao_explicita` | `indicado` | não |
| `negacao` | `indicado` | não |
| `historico` | `indicado` | sim |
| `ambiguo` | `indicado` | sim |

`exame_inicial` preserva a regra histórica existente e nunca converte documento anexado em
execução da clínica atual por inferência.

### 4.2 Prompt

`src/app/api/dex/formatar-evolucao/route.ts` deve:

- trocar descrições iniciais enviesadas por “procedimentos feitos, indicados ou mencionados”;
- trazer as regras de status antes do exemplo JSON;
- conter exemplos mínimos contrastivos de realizado, indicado e frase mista;
- exigir que a evidência pertença ao procedimento específico, não à frase inteira;
- manter negação, histórico e modo `exame_inicial` fail-safe;
- manter uma única chamada estruturada, `temperature: 0.2` e thinking desligado.

### 4.3 Pipeline e compatibilidade

- `mesclarEventosSemPerda` continua sem modo manual e não muda.
- `montarRowsEventos` continua persistindo `ev.status` e calculando `realizado_em` apenas para
  `realizado + clinica`.
- Body e resposta de `POST /api/dex/formatar-evolucao` permanecem compatíveis.
- `evidencia_status` e `revisar_status` continuam transitórios; não há migration.
- O parser deve sair da route para módulo puro ou receber teste direto sem inicializar provider.
- Testes de rota usam provider mockado; nenhum teste pago é necessário no CI comum.

### 4.4 Eval clínico

O golden deve incluir execução, indicação, frase mista, negação, histórico, ambiguidade, passado
sem sujeito claro, execução por outro profissional, a fala normativa e uma transcrição fiel da
falha real quando disponível.

Cada caso roda três vezes no baseline e três vezes depois. O artefato guarda somente ID, campos
esperados/recebidos, métricas e latência — nunca relato real de paciente.

## 5. Comportamento — alvo funcional

| Estado | Resultado observável | Efeito persistente |
|---|---|---|
| Realizado explícito | pill “Realizado” | realizado + data da consulta |
| Indicado explícito | pill “Planejado” | indicado + data nula |
| Misto | cada card mantém seu status | rows heterogêneos |
| Ambíguo/histórico | indicado + “Confira o status” | só salva após regra da R-143 |
| Negado | nunca realizado | indicado ou nenhum evento, conforme intervenção |
| Provider/JSON inválido | erro recuperável; relato permanece | nenhuma escrita parcial |
| Repetição da captura | dedup atual | não duplica nem sobrescreve edição humana |

## 6. Referência visual

Sem tela nova. Reutiliza `RegistroCard`, pills e aviso existentes. Confirmação obrigatória,
undo e acessibilidade pertencem à R-143.

## 7. Invariantes

- [ ] Só `execucao_explicita` pode produzir realizado em modo consulta.
- [ ] Evidência de um procedimento não contamina outro da mesma frase.
- [ ] Negação, histórico e ambiguidade nunca promovem para realizado.
- [ ] Indicado nunca recebe `realizado_em`.
- [ ] Meu Dia e Ficha não aplicam modo manual sobre classificação da IA.
- [ ] Falha não altera rascunho nem banco.
- [ ] Prompt clínico só muda com eval antes/depois.
- [ ] Conteúdo clínico real não entra em log, fixture ou artefato de eval.

## 8. Gates de aceite

- [ ] **G1:** `classificarStatusDex` cobre cinco evidências e dois modos em teste unitário.
- [ ] **G2:** provider mockado com resposta mista produz HTTP misto e rows mistos.
- [ ] **G3:** fala normativa passa 3/3 vezes; zero falso realizado para o 46.
- [ ] **G4:** `realizadoPrecision = 1`, `negacaoViolations = 0` e todos os indicados obrigatórios
  passam; qualquer regressão bloqueia.
- [ ] **G5:** Ficha e Meu Dia mostram os dois status antes do save e depois do reload.
- [ ] **G6:** falha/timeout preserva o relato e não cria evento parcial.
- [ ] **G7:** os 23 arquivos de teste são executados explicitamente; o glob de `npm test` é
  corrigido em commit isolado do R-132 antes do gate final.
- [ ] **G8:** validação autenticada ocorre em localhost/clínica de teste, nunca com escrita
  destrutiva em produção.

## 9. Fora de escopo

- Procedimento fora do vocabulário e reconciliação sem perda — R-133.
- Captura/áudio e concorrência de salvamento — R-141.
- Schemas Server Action, limites, rate limit e observabilidade — R-142.
- Confirmação obrigatória, undo e acessibilidade — R-143.
- Reclassificar registros históricos; exige auditoria de dados separada.

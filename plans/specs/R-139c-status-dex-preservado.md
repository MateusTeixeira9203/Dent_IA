# R-139c — Preservar status clínico por evento na saída do Dex

> SPEC · R-139c · 🔵 validação clínica  
> Aberto em 2026-08-28 · Fase: implementação concluída; teste clínico pendente · Prioridade: regressão clínica

## 1. Problema

Na demonstração, a saída do Dex apareceu sempre como **realizado**, sem separar procedimentos indicados. A classificação feita pela IA não é a causa principal: o endpoint já distingue execução explícita, indicação, negação, ambiguidade e histórico.

O defeito ocorre depois da resposta. No Meu Dia, `CampoMagicoMeuDia.aplicar` chama `mesclarEventosSemPerda` passando o modo global do painel. A mescla então executa `camposDoModoLancamento` em cada evento e sobrescreve `status`, `origem`, `momento_planejado` e `realizado_em` derivados pela rota. Se o dentista selecionou “realizado hoje”, inclusive numa visita anterior, todos os eventos da nova transcrição viram realizados.

O modo também não é reiniciado na troca de agendamento/paciente. A Ficha não passa esse contexto para a mescla e preserva a IA, portanto dois pontos de entrada do mesmo Dex se comportam de maneiras diferentes.

## 2. Decisões fechadas

- Texto/áudio interpretado pelo Dex preserva o status **de cada evento** retornado pela IA.
- O modo global (`a_fazer`, `realizado_hoje` etc.) continua existindo somente para lançamentos manuais que não foram semanticamente classificados pela IA.
- Meu Dia e Ficha devem produzir o mesmo rascunho a partir da mesma resposta estruturada.
- Ao trocar o agendamento/paciente, o modo manual volta para `a_fazer`.
- A interface atual de revisão será reutilizada: pills de status, “Confira status”, “Tudo indicado” e “✓ tudo feito”. Não haverá novo modal.
- A regra de deduplicação existente será preservada: o draft atual nunca é sobrescrito por um evento novo de mesma chave semântica.
- Não haverá migration, novo status, percentual de confiança ou persistência de evidência textual.
- O prompt e o `responseSchema` não serão alterados neste item. Isolar a correção evita atribuir ao modelo um erro determinístico da aplicação e mantém o contrato clínico protegido por eval.

## 3. Objetivo verificável

Dada a fala:

> “Hoje fiz a restauração do 14. O 46 precisa de canal.”

o rascunho e os rows persistidos devem conter:

| Evento | Status | Origem | Momento planejado | Evidência transitória |
|---|---|---|---|---|
| Restauração no 14 | `realizado` | `clinica` | `sessao_atual` | `execucao_explicita` |
| Endodontia no 46 | `indicado` | `clinica` | `sessao_atual` | `indicacao_explicita` |

Isso deve ocorrer mesmo que o modo manual visível antes da captura esteja em “realizado hoje”.

## 4. Fluxo atual completo

```text
CapturaLivreCard (texto ou transcrição de áudio)
  └─ CampoMagicoMeuDia
      └─ POST /api/dex/formatar-evolucao
          body: texto, pacienteNome, modo
          └─ generateStructuredGemini(responseSchema)
              └─ parseEventos()
                  ├─ execução explícita → realizado
                  ├─ demais evidências → indicado
                  └─ ambíguo/histórico → indicado + revisar_status
                      └─ EvolucaoFormatada
                          └─ CampoMagicoMeuDia.aplicar
                              └─ mesclarEventosSemPerda(..., modo global)
                                  └─ ERRO: sobrescreve classificação individual
                                      └─ rascunho da visita
                                          └─ salvarVisitaMeuDia
                                              └─ rotearVisitaMeuDia
                                                  └─ montarRowsEventos
                                                      └─ RPC / odontograma_eventos
```

Na Ficha, a mesma `mesclarEventosSemPerda` é chamada sem modo global, por isso o evento mantém a classificação da IA. A mudança deve remover essa divergência sem alterar o endpoint.

## 5. Contratos existentes que permanecem

O objeto de evento continua sendo `OdontogramaEventoInput`. Os campos relevantes são:

```ts
interface OdontogramaEventoInput {
  status: 'indicado' | 'realizado'
  origem: 'clinica' | 'preexistente'
  momento_planejado: 'sessao_atual' | 'proxima_sessao'
  evidencia_status?: EvidenciaStatus
  revisar_status?: boolean
  // demais campos clínicos existentes permanecem inalterados
}
```

Ao entrar no rascunho, o tipo existente acrescenta os metadados locais:

```ts
interface OdontogramaEventoDraft extends OdontogramaEventoInput {
  id: string
  realizado_em: string | null
  fonteFluxo?: 'novo' | 'pendencia'
  encaminhadoParaId?: string | null
  chaveCaptura?: string
}
```

`revisar_status` e `evidencia_status` não entram em `odontograma_eventos`; eles só orientam a revisão humana antes do salvamento.

## 6. Novo limite entre IA e lançamento manual

Substituir o contexto de mescla atual por um contexto que só complete metadados, sem impor semântica clínica:

```ts
interface ContextoMesclaIA {
  capturaId: string
  encaminharParaId?: string | null
}
```

Contrato de `mesclarEventosSemPerda`:

```ts
function mesclarEventosSemPerda(
  draftAtual: OdontogramaEventoDraft[],
  novosDaIA: OdontogramaEventoInput[],
  realizadoEmPadrao: string,
  contexto?: ContextoMesclaIA,
): OdontogramaEventoDraft[]
```

Ao receber um evento novo da IA, a função deve:

1. Preservar `status`, `origem`, `momento_planejado`, `evidencia_status` e `revisar_status` do evento recebido.
2. Usar `capturaId` apenas para formar `chaveCaptura`, no formato já adotado pelo draft; não existe coluna `captura_id`.
3. Aplicar `encaminharParaId` somente ao campo de encaminhamento correspondente.
4. Calcular `realizado_em` com a regra já usada quando não há contexto manual:
   - `status === 'realizado' && origem === 'clinica'` → `realizadoEmPadrao`;
   - qualquer outro caso → `null`;
   - nunca usar o modo manual para decidir esse campo.
5. Manter a chave de captura/deduplicação atual.
6. Preservar `chaveDedupEvento` e a precedência atual: mesma chave semântica já presente no draft faz o novo evento ser descartado; status diferente continua sendo chave diferente e permanece visível para revisão, como documentado no módulo atual.

`camposDoModoLancamento` e `criarEventosContextuais` continuam válidos, mas apenas nos fluxos manuais, como faixa/lote, regional e criação direta de registro.

## 7. Mudanças por caminho

| Caminho | Mudança contratada |
|---|---|
| `src/lib/odontograma/dedup-eventos-draft.ts` | Trocar `ContextoLancamento` por `ContextoMesclaIA`; não chamar `camposDoModoLancamento` na mescla de IA; preservar dedup atual |
| `src/app/dashboard/meu-dia/_components/campo-magico-meu-dia.tsx` | Remover prop `modoLancamento`; ao aplicar Dex, passar somente `capturaId` e metadados não semânticos |
| `src/app/dashboard/meu-dia/_components/registrar-painel.tsx` | Parar de injetar modo manual no Campo Mágico; adicionar `setModoLancamento('a_fazer')` ao bloco `agendamentoIdAoResetar` |
| `src/components/pacientes/FichasTab.tsx` | Manter a chamada sem contexto semântico; cobrir paridade em teste, sem criar outra implementação |
| `src/app/api/dex/formatar-evolucao/route.ts` | Sem mudança funcional; somente testes podem ser adicionados |
| `src/lib/odontograma/montar-rows-eventos.ts` | Sem mudança funcional; confirmar que os campos preservados chegam intactos à RPC |
| `src/server/patients/rotear-visita.ts` e `src/server/patients/salvar-ficha.ts` | Sem nova regra; continuam chamando `montarRowsEventos` e `salvar_eventos_odontograma` |

Os nomes finais de arquivos/funções devem respeitar a organização existente, mas o limite de responsabilidade acima é obrigatório.

## 8. Fluxo corrigido

```text
Dex classifica cada evento
  └─ EvolucaoFormatada.odontograma_eventos[]
      └─ mesclarEventosSemPerda
          ├─ completa chaveCaptura no draft
          ├─ deduplica sem perder edição humana
          └─ preserva status/origem/momento_planejado de cada evento
              └─ cards de revisão
                  ├─ usuário confirma
                  └─ usuário pode corrigir status individual ou em lote
                      └─ montarRowsEventos
                          └─ odontograma_eventos
```

O modo manual segue um fluxo separado:

```text
Faixa/lote ou lançamento regional
  └─ modo escolhido pelo dentista
      └─ camposDoModoLancamento
          └─ OdontogramaEventoInput manual
```

## 9. Regras da classificação do endpoint

Estas regras já existem e ficam congeladas neste item:

| Evidência na fala | Saída esperada |
|---|---|
| “fiz”, “realizei”, “foi feita hoje” | `realizado` + `execucao_explicita` |
| “precisa”, “indico”, “vamos fazer” | `indicado` + `indicacao_explicita` |
| “não fiz”, “não precisa” | `indicado` + evidência `negacao`; nunca realizado |
| “tem uma restauração” sem afirmar execução | `indicado`, marcado para revisar |
| relato histórico sem data/execução inequívoca | não promover automaticamente a realizado; revisar |

Qualquer alteração posterior nessas regras é outro item e exige eval antes e depois.

## 10. Estados de interface

| Estado | Comportamento |
|---|---|
| Resposta com indicados e realizados | Cards mostram pills individuais correspondentes |
| Um ou mais eventos ambíguos | Mostrar sinalização existente “Confira status” nesses eventos |
| Usuário toca “Tudo indicado” | Atualiza explicitamente os eventos selecionados; decisão humana prevalece |
| Usuário toca “✓ tudo feito” | Atualiza explicitamente os eventos selecionados; decisão humana prevalece |
| Captura reaplicada sem alteração de chave | Não duplica nem sobrescreve o evento já presente |
| Troca de paciente/agendamento | Limpa rascunho conforme regra atual e redefine modo manual para `a_fazer` |
| Falha do endpoint | Mantém o texto/captura para nova tentativa e não cria evento parcial |

## 11. Exemplos normativos

### Mistura de execução e indicação

“Fiz restauração no 14 e o 46 precisa de canal.” → dois eventos, um realizado e um indicado.

### Negação

“Não fiz a extração do 18.” → `indicado` + `negacao`; nunca realizado. A UI pode permitir remoção/correção antes do save conforme fluxo atual.

### Ambiguidade

“O 11 tem restauração.” → não inferir que foi executada hoje; indicar revisão.

### Histórico

“A restauração do 21 foi feita há dois anos.” → não registrar como execução de hoje. Preservar data histórica se o contrato atual conseguir normalizá-la; caso contrário, revisar.

### Vazamento do modo manual

Dentista lança manualmente um procedimento como “realizado hoje”, depois dita “46 precisa de canal”. O evento do 46 deve continuar `indicado`.

## 12. Referência visual

Não exige artefato: não há tela nova nem mudança de hierarquia. A implementação reutiliza os controles e pills existentes de Meu Dia/Ficha. Ajustes visuais só serão aceitos se necessários para expor um estado que já existe e devem usar tokens do sistema.

## 13. Invariantes clínicas e técnicas

- Nenhum modo global pode transformar silenciosamente uma lista heterogênea da IA em um único status.
- Eventos indicados nunca recebem `realizado_em`.
- Evento negativo nunca vira realizado.
- Evento já presente no draft não é sobrescrito silenciosamente por reextração de mesma chave.
- Meu Dia e Ficha usam a mesma função e a mesma precedência.
- `revisar_status` e `evidencia_status` não são gravados como se fossem dado clínico definitivo.
- Nenhuma query, tabela, RLS ou RPC muda neste item.
- Nenhum prompt muda sem eval clínico antes e depois.
- Toda chamada de IA mantém `feature` para observabilidade.

## 14. Gates de aceite

### Unitários

- Mescla preserva um evento `indicado` mesmo se o estado manual externo estiver em realizado.
- Mescla preserva um evento `realizado`, `origem: 'clinica'` e evidência explícita.
- Lista mista permanece mista.
- Indicado sai com `realizado_em: null`.
- Reaplicação com a mesma chave semântica não duplica.
- Reextração com status diferente continua visível como card distinto, preservando a regra atual de não perder dado.
- Reset de agendamento redefine modo manual para `a_fazer`.

### Integração

- Mock da mesma resposta do endpoint produz rascunhos equivalentes em Meu Dia e Ficha.
- `salvarVisitaMeuDia` envia os dois status distintos.
- `montarRowsEventos` preserva `status`, `origem`, `momento_planejado` e `realizado_em` compatíveis.
- Leitura posterior do odontograma mostra a distinção salva.
- Falha/retry não duplica a captura.

### Eval e verificação humana

- Rodar o eval clínico existente antes da mudança para registrar baseline do endpoint.
- Rodar o mesmo eval depois; como prompt/schema não mudam, qualquer diferença de classificação é regressão.
- Testar pelo menos: execução explícita, indicação, mistura, negação, ambiguidade e histórico.
- Fazer uma ditada real na Ficha e no Meu Dia com a mesma frase mista.
- Confirmar visualmente as pills antes de salvar e os eventos depois de recarregar.
- A regressão só pode ser marcada verificada depois de reproduzir a fala real que falhou na demonstração, ou uma transcrição textual fiel dela.

## 15. Fora de escopo

- Reescrever prompt ou exemplos do Dex.
- Criar novos valores de status.
- Exibir score numérico de confiança.
- Aprendizado automático com correções do usuário.
- Redesenhar cards, Campo Mágico ou painel de registro.
- Persistir evidência textual da classificação.
- Reclassificar eventos históricos já salvos incorretamente; isso exige auditoria e plano de dados separado.

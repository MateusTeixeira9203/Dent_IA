# R-139b — Face incisal como `I`

> SPEC · R-139b · 🟡 implementação local  
> Aberto em 2026-08-28 · Fase: validação manual antes de publicação · Sem mudança de schema

## 1. Problema

O sistema usa `O` como código canônico da face oclusal/incisal. Esse código é correto para persistência e já é interpretado contextualmente por `faceLabel('O', dente)`: em dentes anteriores, o nome completo exibido é **Incisal**; em posteriores, **Oclusal**.

O defeito está nas apresentações abreviadas. Alguns componentes imprimem o valor bruto da face (`O`) em SVGs, cards, histórico e documentos. Como consequência, dentes anteriores aparecem com `O`, embora a convenção esperada pelo dentista seja `I`.

Esta mudança é exclusivamente de apresentação. Alterar o código persistido criaria dois valores para a mesma posição geométrica, quebraria deduplicação e exigiria mudanças desnecessárias em banco, IA e integrações.

## 2. Decisões fechadas

- `O` continua sendo o valor canônico interno da face oclusal/incisal.
- Dente anterior exibe abreviação `I`; dente posterior exibe `O`.
- O nome extenso continua sendo obtido por `faceLabel`: **Incisal** ou **Oclusal**.
- Não haverá migration, conversão de dados, alteração de prompt, `responseSchema`, RPC ou API.
- A regra contextual ficará centralizada; nenhum consumidor deve reimplementar a lógica.
- Seleções que misturem dentes anteriores e posteriores exibem `I/O`, mas continuam enviando e persistindo `O`.
- Textos históricos já persistidos não serão reescritos; apenas a renderização estruturada passa a usar a regra nova.

## 3. Objetivo verificável

Sempre que uma face estruturada `O` for exibida com a informação do dente disponível:

| Dente | Código salvo | Abreviação exibida | Nome acessível/completo |
|---|---:|---:|---|
| 11, 12, 13 | `O` | `I` | Incisal |
| 21, 22, 23 | `O` | `I` | Incisal |
| 14–18, 24–28 | `O` | `O` | Oclusal |
| 51, 52, 53 | `O` | `I` | Incisal |
| 54, 55 | `O` | `O` | Oclusal |

O dado enviado para services, API, RPC e banco permanece exatamente `O` em todos os casos.

## 4. Fonte de verdade atual

### 4.1 Tipo canônico

`src/types/odontograma.ts` define:

```ts
export type FaceDental = 'O' | 'M' | 'D' | 'V' | 'L'
```

Esse union continua inalterado. Não será criado `I` como valor persistível.

### 4.2 Persistência

`odontograma_eventos.faces` armazena `text[]`. Eventos oriundos de lançamento manual, Meu Dia, Ficha e Dex gravam `O` para a face central.

### 4.3 IA

O Structured Output do Dex aceita somente `O`, `M`, `D`, `V` e `L`. A IA não deve passar a produzir `I`; a interpretação visual depende do número do dente, que já está presente no evento estruturado.

### 4.4 Geometria

Os odontogramas usam a mesma geometria para a área central de dentes anteriores e posteriores. `O` identifica essa região; `I` é apenas o rótulo clínico apresentado para dentes anteriores.

## 5. Contrato de domínio e apresentação

Adicionar ao módulo utilitário odontológico já usado pelos consumidores — preferencialmente onde `faceLabel` e a classificação do dente vivem — os contratos:

```ts
export type FaceDentalVisual = 'O' | 'I' | 'M' | 'D' | 'V' | 'L'

export function ehDenteAnteriorFDI(dente: number): boolean

export function faceAbreviacao(
  face: FaceDental,
  dente: number,
): FaceDentalVisual
```

Regras de `ehDenteAnteriorFDI`:

1. O número deve ser um dente FDI válido nos quadrantes permanentes `1–4` ou decíduos `5–8`.
2. O segundo algarismo `1`, `2` ou `3` identifica incisivos e caninos, portanto dente anterior.
3. Segundo algarismo `4–8` identifica dente posterior.
4. Entrada inválida retorna `false`; validação de dente continua sendo responsabilidade da borda que cria o evento.

Regras de `faceAbreviacao`:

```text
face !== O                    → retorna a própria face
face === O e dente anterior  → retorna I
face === O e dente posterior → retorna O
```

`faceLabel` deve continuar responsável pelo nome completo. A abreviação nunca substitui o texto acessível: controles com apenas uma letra devem expor `aria-label="Face incisal"` ou `aria-label="Face oclusal"`, conforme o dente.

## 6. Fluxo dos dados

```text
Entrada manual ou Dex
  └─ FaceDental = O
      └─ OdontogramaEventoInput.faces = ['O']
          └─ services / API / RPC
              └─ odontograma_eventos.faces = ['O']
                  └─ consulta lê evento + número do dente
                      ├─ regra clínica usa O canônico
                      └─ UI chama faceAbreviacao(O, dente)
                          ├─ anterior → I
                          └─ posterior → O
```

Em nenhum ponto a abreviação visual volta para o fluxo de persistência.

## 7. Consumidores que devem ser ajustados

| Caminho | Uso atual | Comportamento exigido |
|---|---|---|
| `src/components/odontograma/ToothDetailPanel.tsx` | Face central e listas imprimem valor bruto | Usar abreviação contextual no SVG, seleção e eventos; manter valor do clique como `O` |
| `src/components/odontograma/faixa-lote.tsx` | Seletor de face compartilhado | `I` quando todos os dentes selecionados forem anteriores; `O` quando todos forem posteriores; `I/O` quando mistos |
| `src/components/fichas/registro-card.tsx` | Resume dente/faces do registro | Mapear cada face usando o dente do evento |
| `src/components/odontograma/tooth-group-list.tsx` | Agrupa e exibe faces | Aplicar abreviação por dente antes da composição do texto |
| `src/app/dashboard/meu-dia/_components/dente-historico-card.tsx` | Histórico clínico estruturado | Mostrar `I` para eventos de dentes anteriores sem modificar o evento |
| `src/app/dashboard/meu-dia/_components/meu-dia-format.ts` | Monta rótulos do Meu Dia | Receber/usar o dente ao formatar a face; não formatar `O` sem contexto |
| `src/lib/prontuario-html.ts` | Produz HTML usado em impressão/PDF | Renderizar `I` contextual nos registros estruturados |
| Rotas de PDF que consomem `prontuario-html` | Exportação | Herdar a correção do formatador central, sem lógica duplicada |

Durante a implementação, uma busca por renderizações de `faces`, `FaceDental` e interpolação direta de `face` é obrigatória. Todo consumidor que tenha número do dente e mostre abreviação entra no ajuste, mesmo que não esteja nesta tabela. Consumidores que apenas transmitem ou persistem o valor não mudam.

## 8. Seleção em lote

O seletor em lote precisa representar uma face geométrica comum a dentes de classes diferentes:

- seleção `[11, 12, 13]`: botão central mostra `I`;
- seleção `[14, 15, 16]`: botão central mostra `O`;
- seleção `[11, 14]`: botão central mostra `I/O` e nome acessível “Face incisal ou oclusal”;
- ao selecionar qualquer uma dessas opções, `faces: ['O']` é enviado para todos os eventos;
- filtros, deduplicação e comparação continuam usando `O`.

Não será duplicado um botão `I` e outro `O`, pois seriam dois comandos para a mesma região.

## 9. Estados e casos de borda

| Estado | Resultado |
|---|---|
| Evento anterior com `faces: ['O', 'M']` | Exibe `I, M` |
| Evento posterior com `faces: ['O', 'M']` | Exibe `O, M` |
| Evento sem face | Mantém a representação atual de dente inteiro/sem face |
| Dente inválido vindo de legado | Não lança erro de renderização; `O` permanece `O` |
| Texto livre que contém “oclusal” | Não é reescrito; somente campos estruturados são afetados |
| Evento criado antes da mudança | Passa a exibir `I` ao ser lido, sem backfill |

## 10. Referência visual

Não exige artefato. É uma correção sem mudança de layout, geometria ou fluxo. Deve preservar tipografia, tamanho, contraste, estados de hover/focus e tokens existentes.

## 11. Invariantes

- `FaceDental` não ganha o valor `I`.
- `odontograma_eventos.faces` nunca recebe `I` por esta feature.
- O schema de Structured Output do Dex continua limitado aos códigos canônicos.
- Chaves de deduplicação e agrupamento continuam usando `O`.
- A área clicável da face central não muda.
- A classificação de anterior/posterior é a mesma em todos os consumidores.
- Light e dark mode não recebem cores novas ou hardcoded.

## 12. Gates de aceite

### Unitários

- `ehDenteAnteriorFDI` cobre os quatro quadrantes permanentes e quatro decíduos.
- `faceAbreviacao('O', 11) === 'I'`.
- `faceAbreviacao('O', 13) === 'I'`.
- `faceAbreviacao('O', 14) === 'O'`.
- `faceAbreviacao('O', 51) === 'I'`.
- `faceAbreviacao('O', 54) === 'O'`.
- Faces `M`, `D`, `V` e `L` nunca são alteradas.
- Entrada FDI inválida não quebra a renderização.

### Integração

- Selecionar visualmente `I` no dente 11 produz payload com `faces: ['O']`.
- Reabrir o registro salvo no dente 11 mostra `I`.
- O mesmo registro no dente 14 mostra `O`.
- Seleção em lote mista mostra `I/O` e salva `O`.
- Meu Dia, Ficha, histórico e PDF exibem a mesma abreviação para o mesmo evento.
- Nenhum payload, row de banco ou resposta do Dex contém `I`.

### Verificação visual

- Conferir dentes 11, 13, 14, 51 e 54 no odontograma.
- Conferir foco por teclado e nome acessível dos controles.
- Conferir light e dark mode nas telas afetadas.

## 13. Fora de escopo

- Alterar nomenclatura das demais faces.
- Introduzir `I` no banco, no tipo canônico ou no schema da IA.
- Migrar eventos históricos.
- Mudar geometria dos dentes ou do SVG.
- Redesenhar odontograma, cards, histórico ou PDF.
- Corrigir texto livre legado que tenha sido ditado como “oclusal”.

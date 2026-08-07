# R-50 — Orto ponta a ponta pelo Dex (ditar a manutenção e ela cair estruturada)

> **SPEC** · **R-50** · fase **`aprovada`** — aprovada por ele 05/08, sem ressalva
> **Aberto:** 2026-08-05 · **Fechado:** —
> **Modelo:** Sonnet 5 — o contrato está fechado (3 consertos no mesmo caminho, escopo medido).
> O risco real é regressão de extração, e ele é coberto por eval, não por julgamento.
> **Depende de:** nada. `salvarFicha` já aceita `ortoManutencao` (migration 105), `salvarVisitaMeuDia`
> já repassa ([actions.ts:53](../../src/app/dashboard/meu-dia/actions.ts)), `OrtoForm`/`OrtoCard` já
> tratam "ambas" com 2 blocos. **Só o caminho da IA está incompleto.**

## 1. Problema

Ele: *"manual sempre terá atrito, não adianta"* — orto é o pior fluxo do Meu dia hoje, e o Dex
deveria resolvê-lo. A IA **já extrai** `orto_manutencao` no pass 1. Três furos impedem que isso
chegue à ficha:

| # | Furo | Onde | Efeito |
|---|---|---|---|
| **F1** | Schema aceita `arcada: "ambas"` mas só tem **1** conjunto de campos | [formatar-evolucao/route.ts:122-132](../../src/app/api/dex/formatar-evolucao/route.ts) | Ditar "superior 0.018 aço, inferior 0.016 NiTi" guarda **um fio só**. O outro se perde |
| **F2** | `arcada` é obrigatória sem instrução de recusa | mesmo schema, :126 | IA **inventa** a arcada quando o dentista não disse — viola "nunca inventa" do CLAUDE.md |
| **F3** | O Meu dia **descarta** o orto estruturado que recebe | [campo-magico-meu-dia.tsx:54,59-61](../../src/app/dashboard/meu-dia/_components/campo-magico-meu-dia.tsx) | Degrada pra texto com toast "a estruturar". O dado chega e é jogado fora |

Relatado por ele ao vivo em 04/08: *"independente de colocarmos ambas, só aparece um campo
quando deveriam ser 2"* — F1 é a causa (o form manual está correto, conferido).

## 2. Decisão e alternativas descartadas

**F2 — decidido por ele (05/08):** `arcada` **continua obrigatória**. É clinicamente essencial,
como o fio. A correção é a IA **recusar** (emitir `orto_manutencao: null`) quando não consegue
determinar a arcada — não afrouxar o schema.

| Descartado | Por quê |
|---|---|
| Tornar `arcada` nullable (leitura original do R-50a, de 02/08) | **Revogado por ele em 05/08.** Campo nullable empurra o problema pra frente: ficha com manutenção sem arcada não descreve o procedimento |
| Objeto aninhado `{ superior: {...}, inferior: {...} }` no schema da IA | Quebraria `OrtoManutencaoInfo` e os 2 componentes que já funcionam. Os campos `_inferior` planos já existem no tipo desde 04/08 — o schema da IA é que não os conhece |
| Estender o schema também pra endo/implante nesta fatia | Escopo separado (R-49 tem spec própria). Um schema de extração por vez, com eval entre eles |

## 3. Objetivo e como funciona

O dentista dita ou digita no campo mágico: *"manutenção nas duas arcadas — superior 0.018 aço,
inferior 0.016 NiTi, ativei e troquei as ligaduras"*. O Dex devolve orto estruturado com os
**dois** conjuntos, o chip "Manutenção ortodôntica" abre já preenchido, e o dentista corrige o
que quiser antes de salvar. Se ele não disser a arcada, o Dex **não** inventa: manda pro texto
da visita como hoje, com o mesmo aviso.

## 4. Contrato técnico

### 4.1 Schema da IA (F1 + F2)

```typescript
// formatar-evolucao/route.ts — OrtoManutencaoWire ganha os 4 campos _inferior (todos opcionais)
interface OrtoManutencaoWire {
  arcada:                 string;
  fio?:                   string | null;
  ativacao?:              string | null;
  elastico_corrente?:     string | null;
  elastico_intermaxilar?: string | null;
  fio_inferior?:                  string | null;
  ativacao_inferior?:             string | null;
  elastico_corrente_inferior?:    string | null;
  elastico_intermaxilar_inferior?: string | null;
}
```

`EVOLUCAO_SCHEMA.orto_manutencao.properties` ganha os mesmos 4, todos
`{ type: Type.STRING, nullable: true }`. **Nenhum campo existente muda de tipo ou
obrigatoriedade** (mesma regra que a v3 seguiu).

`parseOrto` passa a ler os 4 novos com o mesmo `str()` já usado. A guarda de arcada
([route.ts:229](../../src/app/api/dex/formatar-evolucao/route.ts)) **não muda** — ela já devolve
`null` quando a arcada não é um dos 3 valores; é o backstop de F2 no código.

**Prompt (F1 + F2)** — a instrução de `orto_manutencao` ([route.ts:322-324](../../src/app/api/dex/formatar-evolucao/route.ts)) ganha 2 frases:

- *"Com `arcada: "ambas"`, os campos base descrevem a arcada SUPERIOR e os campos `_inferior`
  a INFERIOR. Se o relato descrever as duas arcadas com procedimentos diferentes, preencha os
  dois conjuntos."*
- *"Se o relato for manutenção mas NÃO disser em qual arcada, devolva `orto_manutencao: null`
  — nunca escolha uma arcada por conta própria."*

### 4.2 O Meu dia para de descartar (F3)

`ortoValor` hoje é `useState` local em [registrar-painel.tsx:184](../../src/app/dashboard/meu-dia/_components/registrar-painel.tsx), e o `CampoMagicoMeuDia` é filho dele — então o campo
mágico não alcança o estado. **Não sobe o estado pro `meu-dia-client`** (o C1 §5.4 subiu
`eventosDraft`/`textoVisita` porque a coluna direita precisa ler; orto não tem esse consumidor).
Basta uma prop de callback, mesmo padrão de `onAlertaNovoChange` que já existe:

```typescript
// CampoMagicoMeuDiaProps — nova prop, mesmo shape do onAlertaNovoChange
onOrtoDetectado: (orto: OrtoManutencaoInfo) => void;
```

Em `registrar-painel.tsx`, o handler faz 2 coisas: `setOrtoValor(orto)` e
`setOrtoChipAberto(true)` — o chip abre já preenchido, o dentista vê e corrige. Mesmo gesto do
`criarDenteTipo` que abre a tabela de endo sozinha na criação (guarda-corpo: o dado nunca entra
invisível).

`formatarOrto` e o toast de "a estruturar" **saem** — o dado agora tem casa. O texto da visita
deixa de receber a linha de orto (era o fallback de I2, que perde a razão de existir).

**I2 continua valendo** por outro caminho: se `parseOrto` devolver `null` (arcada não dita, F2),
o campo mágico não recebe orto nenhum — nada a descartar. Não há caso novo de perda silenciosa.

### 4.3 Eval — o gate que a regra do projeto exige

Baseline rodado 05/08 contra a rota real (`evals/extracao-clinica/run.cjs`, 20 casos):

```
ATUAL (não pode regredir): 15/16 casos OK
  eventos: 13/13 casados · 1 inventado (falso-positivo)
NOVO: 4/4 presentes
```

**Depois do conserto (22 casos, +2 novos):**

```
ATUAL (não pode regredir): 16/16 casos OK
  eventos: 15/15 casados · 0 inventados (falso-positivo)
NOVO: 6/6 presentes
```

> **Ressalva do baseline:** `multi-dente` deu **ERRO 500 na rota** (não é falha de match — a API
> caiu). É defeito separado, fora do escopo desta spec; anotado como achado. Os 15/16 são
> "15 passaram, 1 errou por 500", não "1 regrediu".

**O golden não tem nenhum caso com `arcada: "ambas"`** — só testa arcada única
(`orto-manutencao`, superior). Esta spec adiciona 2 casos, e eles são o teste do conserto:

| id | cat | relato | esperado |
|---|---|---|---|
| `orto-ambas-arcadas` | `novo` | *"manutenção nas duas arcadas: superior 0.018 de aço, inferior 0.016 NiTi, ativei e troquei as ligaduras"* | `arcada: 'ambas'` + `fio` **e** `fio_inferior` preenchidos |
| `orto-sem-arcada` | `novo` | *"fiz a manutenção do aparelho, troquei as ligaduras"* | `orto: null` (F2 — não pode inventar arcada) |

`run.cjs` precisa de 1 ajuste: `ORTO_CAMPOS` ([run.cjs:19](../../evals/extracao-clinica/run.cjs))
lista só os 4 campos base — ganha os 4 `_inferior`, senão `camposPreenchidos` não consegue
exigir `fio_inferior`.

## 5. Referência visual

Nenhuma tela nova. O `OrtoForm` (chips de arcada + 2 blocos em "ambas") e o `OrtoCard` já estão
como ele aprovou em 04/08 — esta fatia só faz o dado chegar neles. Zero token novo.

## 6. Invariantes

- [ ] A IA **nunca** escolhe arcada por conta própria — sem arcada dita, `orto_manutencao: null`
- [ ] Orto detectado **nunca** entra invisível: o chip abre preenchido, o dentista vê antes de salvar
- [ ] Nenhum campo existente do `EVOLUCAO_SCHEMA` muda de tipo ou obrigatoriedade — só campos novos, todos nullable
- [ ] Nada muda em `salvarFicha`, RLS, migration ou schema de banco — `orto_manutencao` já persiste desde a migration 105
- [ ] O dentista sempre pode corrigir o que a IA preencheu (o chip é editável, não é confirmação cega)

## 7. Gates de aceite

- [x] **G1** — eval DEPOIS: **16/16** ATUAL (subiu de 15/16 — o 500 do `multi-dente` era transitório), **15/15** eventos casados, **0** inventados (caiu de 1). Sem regressão
- [x] **G2** — `orto-ambas-arcadas`: PASS. `fio:"0.018 de aço"` × `fio_inferior:"0.016 NiTi"`, distintos
- [x] **G3** — `orto-sem-arcada`: PASS na eval, **e confirmado sistemático antes do reforço do prompt** — a IA escolhia `"ambas"` como padrão em 2 de 3 tentativas manuais (não era ruído). Prompt reforçado com contraste explícito (errado/certo); reconfirmado 3/3 depois
- [x] **G4** — ao vivo (agendamento de teste criado no paciente "Teste R-31a"): ditar as duas arcadas abriu o chip sozinho, com os 2 blocos e `orto-sup-fio`/`orto-inf-fio` com os valores certos nos `<input>` (lido via DOM, não só visual)
- [x] **G5** — ao vivo: relato sem arcada — resposta real da API confirmada via `read_network_requests`: `orto_manutencao: null`. Chip não abriu
- [x] **G6** — ao vivo, gravação real: `fichas.orto_manutencao` consultado direto no banco após o Salvar — os 8 campos gravados, `fio`/`fio_inferior` distintos, elásticos `null` como esperado
- [x] **G7** — `git diff --stat` em `orto-form.tsx`/`orto-card.tsx`: **zero mudança** — caminho manual intocado por construção, não só por teste
- [x] **G8** — `grep "a estruturar"` em `src/`: vazio
- [x] **G9** — `git diff --stat`: `formatar-evolucao/route.ts`, `campo-magico-meu-dia.tsx`, `registrar-painel.tsx`, `evals/`, `types/odontograma.ts` (comentário) — zero `supabase/`

**Achado durante G3, registrado à parte:** a 1ª versão do prompt tinha a regra de recusa mas a
IA ainda chutava "ambas" como default quando nada foi dito — reforçado com um par
errado/certo explícito no texto. Fica como lição pro R-49 (endo/implante): regra de recusa
sozinha não basta, precisa de contraste concreto e teste repetido, não só 1 rodada.

## 8. Fora de escopo

- **Endo/implante pelo Dex** — mesma família, spec própria ([R-49](R-49-voz-e-campos-de-especialidade.md), já escrita). Um schema de extração por vez, com eval entre eles
- **Tirar o "Registrar sem IA"** — só depois que endo também tiver extração; hoje o fallback ainda cobre o que a IA não emite
- **Controle de recorrência/presença** ("esse paciente veio esse mês?") — é [R-60](../ROADMAP.md#-congelado)/R-45, item próprio. `MeuDiaOrto.data` já traz a data da última manutenção; derivar "há N dias" é barato, mas intervalo por tipo e visão de atrasados é feature
- **Layout "mais completo" da ficha rápida** — depende do R-60 descongelar (ele traz uma ficha real de orto)
- **ERRO 500 em `multi-dente`** — achado do baseline, defeito separado, vira item próprio
- Periodontia — segue pelo R-08, tem extractor determinístico e caminho próprio

# R-109 — Registro na ficha: as peças do Meu dia + trilho único

> **SPEC** · **R-109** · 🔵 ativo
> **Aberto:** 2026-08-13 · **Fechado:** — · **Fase:** **`aprovada`** (por ele, 13/08)
> **Modelo:** Sonnet — porte de mecanismo que já existe e já foi testado ao vivo; o risco é
> threading de prop e remoção de caminho morto, não ambiguidade de desenho.
> **Irmã:** [R-108](R-108-ficha-tratamento.md) — ficha vira documento de tratamento.
> **Independente dela**: pode subir antes, depois ou em paralelo.
> **Artefato:** [`R-108`](../artefatos/R-108-ficha-tratamento.html) bloco 3 — aprovado, mostra
> os três caminhos de lançamento lado a lado.
> **Predecessor:** [R-30](R-30-ficha-fonte-unica-procedimento.md) §7 (*"consolidar as 6
> representações"*, marcado lá como item separado) — em produção desde 30/07.

---

## 1. Problema

Ele quer na ficha o que ficou bom no Meu dia. Levantamento de 13/08 mostra que **a maior
parte já está lá** — o buraco é menor e mais específico do que parecia:

| Caminho | Na ficha? |
|---|---|
| 1 dente → perfil com chips, busca livre, "Dente ausente" | ✅ já está (R-107b, no ar 13/08 — `ToothDetailPanel`, 11 refs) |
| Boca inteira → chips de rotina | ✅ já está — **a ficha foi a origem**; o Meu dia é que portou de lá |
| **2+ dentes → 1 procedimento (lote)** | ❌ **só no Meu dia** |
| **Campo mágico com chips locais (zero IA)** | ❌ **meio ligado** |

**O campo mágico da ficha é meio funcional.** `CapturaLivreCard` é montado sem
`catalogoProcedimentos` e sem `onAplicarSugestao`
([FichasTab.tsx:1661](../../src/components/pacientes/FichasTab.tsx:1661)) — comparar com o Meu
dia ([registrar-painel.tsx:667](../../src/app/dashboard/meu-dia/_components/registrar-painel.tsx:667)),
que passa os dois. Consequência: na ficha, digitar "canal 17" **não** oferece o chip
instantâneo; só resta esperar a IA pra uma coisa que `casarProcedimentoLocal` resolve local,
sem rede, com 18/18 testes passando.

**E o trilho de escrita é duplo.** `FichasTab` roda `selectedTeeth`/`teethNotes` (seleção de
dente amarrada a texto livre) **em paralelo** com `eventosDraft`, e os dois se fundem no save:

```typescript
// FichasTab.tsx:1267
const dentesAfetados = [...new Set([...selectedTeeth, ...sharedTeeth, ...derivado.dentes])];
```

Portar o lote pra cima disso é construir no que vai ser demolido — por isso o trilho morre
primeiro (§2).

---

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Trilho único antes do porte.** `eventosDraft` vira o único caminho de **escrita**; `selectedTeeth`/`teethNotes` continuam só na **leitura** de ficha antiga | Portar o lote primeiro, limpar depois | O lote sobre o trilho velho paga a migração duas vezes |
| **Compartilhar o mecanismo, não o layout** | Um componente de registro só, dois hosts | Ele definiu jobs diferentes: *"no Meu dia você tem panorama e agilidade; na ficha você precisa de algo completo e organizado"*. Forçar um layout piora os dois — mas duplicar a **lógica** é o que faz as telas divergirem em seis meses |
| **Lote sai de `registrar-painel.tsx` pra módulo compartilhado**, ambas as telas consomem | Copiar o bloco pra `FichasTab` | Cópia diverge; o R-107a já provou o caminho certo ao extrair `rotina-boca.ts` de `FichasTab` pro Meu dia |
| **Modo multidente vai junto com o lote** | Só o lote | Sem ele o 1º clique troca o espelho pelo histórico e volta o "clica, fecha, clica, fecha" — o atrito que motivou o R-107d |
| **Na ficha, espelho e perfil do dente ficam lado a lado** (artefato bloco 3) | Copiar o "1 ocupante por vez" do Meu dia (R-78) | A ficha tem largura; ela é a tela do *completo e organizado*. **Consequência assumida:** na ficha o Modo multidente vira quase supérfluo — o espelho nunca some. Fica mesmo assim, pra não criar duas gramáticas de clique |

---

## 3. Objetivo

Lançar procedimento na ficha com os mesmos gestos do Meu dia — um dente, vários dentes, boca
inteira, ou digitando — sem que exista um segundo mecanismo de seleção competindo por baixo.

---

## 4. Contrato técnico

> ### Emenda 14/08 — conferência do código antes da 1ª linha
>
> Quatro coisas que a spec afirma e o código desmente. Nenhuma muda a decisão do §2; a terceira
> muda o **tamanho** do item.
>
> 1. **`paciente-detail-client.tsx` não muda.** Ele **já repassa** `catalogoProcedimentos` pro
>    `FichasTab` ([:1390](../../src/app/dashboard/pacientes/[id]/_components/paciente-detail-client.tsx:1390)),
>    ligado pelo R-107b pro painel do dente. Um dos 5 arquivos do §4.1 sai da lista.
> 2. **A justificativa do `categoria` está errada.** A query pega `id, nome, preco_padrao` — o
>    R-107b **não** adicionou `categoria`; ela é preenchida como `''` no `.map()`, com comentário
>    explicando. Inofensivo: `casarProcedimentoLocal` não lê `categoria` (zero ocorrências).
> 3. **O campo mágico da ficha não é "passar 2 props".** `SugestaoLocal` tem **dois ramos** —
>    `tipo` (estrutural) e `catalogo` (nome comercial, que pede "qual tipo clínico?" depois) — e
>    o `registrar()` do Meu dia ainda trata um terceiro caso: tipo de **nível boca** (âncora
>    sempre boca) e tipo **sem dente ainda** (vira `tipoPendente`, espera o clique). A ficha não
>    tem nenhum desses três mecanismos.
>    **Decisão:** ligar **só o ramo de tipo** e **filtrar as sugestões de catálogo na ficha**. O
>    G5 é literalmente *"digitar 'canal 17' oferece o chip local"* — caso de tipo; e a busca por
>    nome comercial **já existe na ficha**, dentro do `ToothDetailPanel` (R-107b), com o fluxo de
>    catálogo pendente completo. Nada se perde, e não nasce UI que o artefato não mostra.
> 4. **Linhas defasadas:** o trilho duplo está em `:1311` (não 1267) e o `CapturaLivreCard` em
>    `:1705` (não 1661) — o R-107 entrou no meio.
> 6. **A ordem do §2 está invertida, e o "trilho único" não é limpeza — é remoção de duas coisas
>    vivas.** O §4.3 trata `selectedTeeth`/`teethNotes` como encanamento morto. Não são:
>    - **Os chips "Região"** (Arcada sup./inf., Boca toda, Q1–Q4,
>      [:1774](../../src/components/pacientes/FichasTab.tsx:1774)) escrevem **só** em
>      `selectedTeeth`, como sentinela, e **não criam evento**. Tirar `selectedTeeth` da escrita
>      apaga o recurso — é o mesmo sentinela `99` que a limpeza do G3 do R-108b encontrou.
>    - **`teethNotes` na escrita é o que preserva texto de ficha legada na EDIÇÃO.** Não há mais
>      UI pra digitar texto por dente (só nasce `['']`, que o save filtra); ele só carrega
>      conteúdo quando se edita uma ficha antiga. Tirar da escrita faria a edição **apagar** o
>      texto por dente que veio do banco.
>
>    **E a justificativa da ordem não se sustenta:** o §2 diz que portar o lote em cima do trilho
>    velho é "construir no que vai ser demolido". Mas **o lote não toca `selectedTeeth`** — no Meu
>    dia ele roda numa seleção própria (`onde`) e na ficha entra como prop controlada
>    (`FaixaLoteProps.dentes`). São independentes.
>
>    **Proposta:** inverter — **lote/faixa primeiro** (é independente e entrega valor sozinho), e
>    o trilho só morre depois que a Região tiver equivalente em evento. Duas decisões dele antes
>    disso: (a) o que a Região vira — seleção que alimenta a faixa, como o lote? evento de nível
>    arcada/quadrante? (b) editar ficha legada preserva o texto por dente, ou aceita perdê-lo?
> 5. **O risco do §4.3 não existe.** A spec avisa que `derivarV2DosEventos` "pula evento com
>    `dente == null`" e que por isso profilaxia poderia sumir de `procedimentos` ao trocar a
>    fonte — é o medo que justifica o G4. **Falso:** o `procedimentos.push(rotulo)` está **fora**
>    do `if (d != null)` ([derivar-campos-legado.ts:41](../../src/lib/odontograma/derivar-campos-legado.ts:41)).
>    Evento de nível boca **entra** em `procedimentos`; o que ele não alimenta é `dentes` e
>    `observacoes`, que é o correto (nível boca não pinta dente — D5 do R-06/07).
>    O G4 continua valendo como verificação, mas o trilho único é **menos arriscado** do que a
>    spec supõe.

> ### Emenda 14/08 (2) — dois desvios do §4.1/§4.2, decididos no código
>
> 1. **O toggle "Modo multidente" NÃO entrou no `<FaixaLote>`.** No Meu dia ele vive colado no
>    cabeçalho do odontograma, longe da faixa — trazer pra dentro mudaria o layout daquela tela,
>    e "o Meu dia não muda em nada" é invariante (§7). A faixa recebe só `onModoMultidenteChange`
>    (precisa **desligar** o modo ao aplicar); quem desenha o botão é cada tela. Por isso
>    `modoMultidente: boolean` saiu de `FaixaLoteProps`.
> 2. **O que alimenta `dentes` na ficha é estado próprio (`dentesLote`), não `selectedTeeth`.**
>    Reusar `selectedTeeth` — que era a hipótese inicial — está errado por três motivos, todos
>    conferidos no código: (a) ele carrega **sentinela de região** 91–99 (`toggleArch`), e isso
>    viraria evento ancorado no "dente 97", que o odontograma não desenha e o
>    `derivarV2DosEventos` não emite; (b) editar ficha legada **pré-carrega** `selectedTeeth` com
>    `dentes_afetados`, então a faixa nasceria cheia e um clique de chip lançaria procedimento em
>    N dentes que ninguém selecionou; (c) `selectedTeeth` é fonte de escrita de `dentes_afetados`,
>    então reusar juntaria de novo os dois trilhos exatamente onde este item quer separá-los.
>    O modelo é o mesmo do Meu dia (`onde` + `modoMultidente`) — a mesma mecânica, não uma cópia.
>    O odontograma pinta a **união** dos dois (trocar faria a pintura da ficha legada sumir ao
>    ligar o modo, e o lote sumir quando a faixa desliga o modo depois de aplicar).
>
> **Consequência pro pedaço 1:** os dois trilhos coexistem sem brigar — provado ao vivo (chip Q1
> continua marcando e **não** alimenta a faixa). A remoção do trilho velho segue dependendo só
> das duas decisões dele (o que a Região vira; texto por dente na edição de ficha legada).

### 4.1 Arquivos

| Arquivo | Muda |
|---|---|
| `src/lib/odontograma/lote-multidente.ts` (novo) | recebe `aplicarLote`, `aplicarLoteRestauracao`, `aplicarLoteAusente`, `lancarLoteAvulso` — extraídos de `registrar-painel.tsx` §3 do [R-107d](R-107d-lote-multidente.md), **sem mudança de comportamento** |
| `src/components/odontograma/faixa-lote.tsx` (novo) | a faixa visual (contador, chips, busca, ✕ limpar) + o toggle Modo multidente. Props controladas — nenhum estado próprio de seleção |
| `registrar-painel.tsx` | passa a **consumir** os dois acima; some a implementação inline |
| `FichasTab.tsx` | monta `<FaixaLote>`; `CapturaLivreCard` ganha `catalogoProcedimentos` + `onAplicarSugestao`; `selectedTeeth`/`teethNotes` saem do caminho de escrita |
| `paciente-detail-client.tsx` | repassa `catalogoProcedimentos` (a query já existe — R-107b adicionou `categoria` ao `.select()`) |

### 4.2 Types

```typescript
// src/components/odontograma/faixa-lote.tsx
export interface FaixaLoteProps {
  /** Dentes selecionados. A faixa só renderiza com length >= 2 (invariante do R-107d §4). */
  dentes: number[];
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (e: OdontogramaEventoDraft[]) => void;
  catalogoProcedimentos: MeuDiaCatalogoProcedimento[];
  /** 'YYYY-MM-DD' — `realizado_em` dos eventos criados em lote. */
  dataPadrao: string;
  onLimpar: () => void;
  modoMultidente: boolean;
  onModoMultidenteChange: (v: boolean) => void;
}
```

### 4.3 O trilho único — o que sai e o que fica

**Sai** (escrita): `selectedTeeth` como fonte de `dentesAfetados`; `teethNotes` como fonte de
`dentes_observacoes` em ficha nova. Os dois passam a vir de `derivarV2DosEventos(eventosDraft)`
— função que **já existe e já é a fonte no Meu dia**.

**Fica** (leitura): `evo.teethNotes` na renderização de ficha antiga
([FichasTab.tsx:2133](../../src/components/pacientes/FichasTab.tsx:2133) e o ramo legado). 55 fichas
em produção só têm texto — o renderer legado continua, decisão dele em 13/08.

> `derivarV2DosEventos` **pula evento com `dente == null`** (nível boca/arcada/quadrante) —
> comportamento conhecido e documentado no R-30 §1. Trocar a fonte não pode fazer profilaxia
> sumir de `procedimentos` em ficha nova. É o G4.

---

## 5. Comportamento

| Estado | Quando | A tela mostra |
|---|---|---|
| **Vazio** | 0 ou 1 dente selecionado | faixa ausente; perfil do dente é o caminho (inalterado) |
| **Sucesso** | 2+ dentes | faixa com contador, chips, busca livre, ✕ limpar |
| **Restauração em lote** | chip "Restauração ▾" | 5 faces (V M O D L); **nada é criado até escolher uma** |
| **Sem match na busca** | termo desconhecido | "Lançar '<termo>' nos N dentes" → tipo `outro` + oferta de salvar no catálogo |
| **Duplicata** | dente já tem o tipo com `origem: 'clinica'` | pulado em silêncio (guard do R-107d §3) |
| **Erro / sem permissão** | N/A | a faixa não escreve no banco — só monta `eventosDraft`. Erro de permissão só existe no save da ficha, que não muda aqui |

**Caminho principal:** seleciona 2+ dentes (com Modo multidente, em sequência direta) → chip
ou busca → eventos criados em todos de uma vez → aparecem em "Nesta ficha" → save da ficha
(inalterado).

---

## 6. Referência visual

Artefato [R-108](../artefatos/R-108-ficha-tratamento.html), **bloco 3** — aprovado 13/08.
Mostra os três caminhos: espelho + perfil do dente lado a lado (`.dupla`, 1fr/1fr) e a faixa
de lote abaixo. Tokens: os mesmos da [R-108 §6](R-108-ficha-tratamento.md#6-referência-visual)
— nenhum token novo neste item.

A faixa de lote **não muda de aparência** em relação ao que já está em produção no Meu dia
(R-107d): mesmo contador, mesmos chips, mesma busca. Porte, não redesenho.

---

## 7. Invariantes

- [x] Extração do lote pro módulo compartilhado é **byte-equivalente em comportamento** — o
      Meu dia não muda em nada (os 8 gates do R-107d continuam passando) · 14/08, ao vivo
- [x] Faixa só aparece com `dentes.length >= 2` · a regra vive dentro do componente
- [x] Nenhum chip de lote cria evento duplicado (guard do R-107d) · 2º clique em "Canal" criou 0
- [x] Restauração em lote sempre pede face antes · provado nas **duas** telas
- [ ] Leitura de ficha antiga por `teethNotes` continua intacta
- [x] `derivarV2DosEventos` não muda de assinatura nem de comportamento
- [x] Nenhuma migration, nenhuma policy — item 100% de client/lib

---

## 8. Gates de aceite

- [x] **G1** — Meu dia: os 8 gates do [R-107d §5](R-107d-lote-multidente.md) repassados após a
      extração; nenhum regride · **14/08, localhost, Teste01.** Faixa renderiza igual · chip
      "Canal" criou 1 evento por dente (16, 17) · 2º clique criou 0 (guard) · Restauração pediu
      face e não criou nada antes da escolha · busca "zxqw" ofereceu *Lançar "zxqw" nos 2 dentes*
      · "✕ limpar" esvaziou a seleção e o modo sem desfazer o lançado · modo desliga ao aplicar
- [x] **G2** — ficha: 2+ dentes → faixa aparece; chip aplica nos N; contador de "Nesta
      evolução" sobe pelo número certo · **14/08:** modo ligado, 24 e 25 selecionados **sem
      abrir o painel do dente**, "Coroa total" → 2 registros. Com o modo desligado, clicar num
      dente volta a abrir o perfil (26). Chip "Região" Q1 continua marcando e **não** alimenta a
      faixa
- [x] **G3** — ficha: "Restauração ▾" não cria nada até a face ser escolhida · **14/08:** faces
      V M O D L com 0 registros; face O → "Restauração O · dente 34" e "· dente 35"
- [ ] **G4** — ficha nova com **só** profilaxia (nível boca, `dente == null`): `procedimentos`
      gravado corretamente — a regressão que a troca de fonte pode causar (§4.3)
- [ ] **G5** — digitar "canal 17" no campo mágico da ficha oferece o chip local **sem rede**
      (Network vazio no devtools)
- [ ] **G6** — `grep -n "selectedTeeth\|teethNotes" FichasTab.tsx` não devolve nenhuma
      ocorrência em caminho de **escrita**; as de leitura continuam
- [ ] **G7** — ficha antiga só-texto (uma das 55) abre igual a antes
- [x] **G8** — typecheck + lint + `next build` limpos; zero erro de console · 14/08

---

## 9. Fora de escopo

- **Selante e Esfoliação em lote** — herdado do R-107d §6; entram fácil se ele sentir falta
- **Matriz dente×face** (faces diferentes por dente numa rodada) — vetado no R-107d
- **Unificar o layout das duas telas** — decisão dele: jobs diferentes (§2)
- **Consolidar `procedimentos_status`/`procedimentos_concluidos`** — item próprio (R-30 §7)
- **Qualquer coisa do modelo de tratamento** — é a [R-108](R-108-ficha-tratamento.md)

---

> **Spec salva em `plans/specs/R-109-registro-na-ficha.md`, fase `contrato`.** Aguardando sua
> aprovação. Depois de aprovada, qualquer desvio durante o código atualiza a spec **primeiro**.

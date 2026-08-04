# R-46d — Campo mágico no Meu dia (arquivo, voz e organizar)

> **SPEC** · sub-item do **R-46**
> **Aberto:** 2026-08-03 · **Fechado:** — · **Fase:** **`aprovada` pra D0** (já commitado) **·
> D1 codado, testado ao vivo e ajustado 04/08** — D4 (moldura) resolvido; D2 (fusão com
> `ColarDoWordDialog`) segue como recomendação a confirmar, não bloqueia. D1.2 (fallback sem
> IA) foi **testado ao vivo e revisado por ele na hora** (`OndeSeletor` fora, chip de orto
> dentro, 1 clique abre o resumo — ver D1.2 revisão). **Só D1.3 segue com 1 ponto em aberto**
> (redundância do botão "Anexar" do `CapturaLivreCard` × a caixa nova do D8, marcado ⚠️ lá)
> **Modelo:** Sonnet 5 na fatia D0 (extração mecânica, behavior-preserving) · Opus na
> fatia D1 (decisão de forma visual em aberto + componente compartilhado passa a ter 2 telas
> consumidoras)
> **Depende de:** nada bloqueante tecnicamente. Toca o mesmo caminho de código que o
> **R-47** corrigiu (2 rodadas, 31/07) e que **nunca foi testado ao vivo** (🟡) — ver riscos.
> **Não bloqueia nem é bloqueado por:** R-46c (fica como está, ver D2 abaixo).

> ⚠️ **D2 é recomendação, não fato consumado — ele confirma antes do código.** D4 **já foi
> respondido** (ver §4 D4) — a moldura do campo mágico é expansão in-place, não overlay,
> decisão independente da moldura do painel do dente (C6, que usa `Sheet`): são dois
> problemas diferentes (revisar texto extraído × caber odontograma+painel). D0 e D1 são
> contrato pronto pra codar.

## 1. Problema

O Meu dia hoje só tem "+ texto da visita" — um link cinza que abre uma `<textarea>` simples.
Sem voz, sem anexo, sem estruturação por IA. Enquanto isso, o perfil do paciente já tem
`CapturaLivreCard`: fala, cola ou anexa (áudio/pdf/docx/txt), e "Organizar com Dex" estrutura
tudo em procedimentos e eventos de odontograma. O cockpit **já reserva o espaço** pro campo
mágico (contrato §4, fatia C4: "campo mágico em tela cheia — só o container"), mas nenhuma
fatia o entregou. É a lacuna mais visível do redesign: a tela pensada pra ser mais rápida que
o Word ainda obriga digitação crua onde a IA já resolve isso em outro lugar do produto.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **D1** — `CapturaLivreCard`/`useCapturaLivre` são **reusados tal qual** (fix cosmético à parte, ver D5) dentro de um wrapper novo no Meu dia | Recriar um componente do zero | Único call site hoje é `FichasTab.tsx` (confirmado por grep). A API do componente (`onOrganizado(data)`) já é presentation-agnostic — não tem acoplamento ao form do perfil |
| **D2** — ✅ **DECIDIDO POR ELE (03/08, após a spec):** o campo mágico é **um só componente**. `ColarDoWordDialog` e o campo mágico do Meu dia **são a mesma coisa em telas diferentes** — o que muda é o **destino** da gravação, não a ferramenta | ~~Manter os 2 separados~~ (era a recomendação do planner, **revogada**) | Palavra dele: *"É único sim o campo mágico, os dois são a mesma coisa. Só que em telas diferentes."* Precedência: conversa vence documento. O componente ganha um **modo/destino**, não um irmão. ⚠️ **As travas de honestidade do R-46c não podem se perder na fusão** — ver I7 |
| **D3** — extrair `dedupEventosDraft`/`chaveDedupEvento` + o bloco "nunca perde pra reextração" pra `src/lib/odontograma/dedup-eventos-draft.ts`, generalizado numa 3ª função nova (`mesclarEventosSemPerda`) | Duplicar a lógica no Meu dia (copiar/colar o bloco) | Duplicar reabre exatamente o bug que o R-47 levou 2 rodadas pra fechar — a próxima correção teria que lembrar de mexer nos 2 lugares. ~40 linhas, zero closure sobre o form do FichasTab — extração mecânica, risco baixo |
| **D4** — ✅ **RESPONDIDO POR ELE (03/08):** tela cheia é **expansão**, e existe por um motivo funcional: **o dentista precisa conferir o que a extração tirou do arquivo**. Não é estética — é a superfície de revisão do texto extraído de uma ficha antiga | ~~Overlay modal~~ · ~~decidir só no artefato~~ | Palavra dele: *"muitas vezes o dentista vai subir e a gente vai extrair o arquivo, e aí ele quer dar uma conferida no que subiu desse arquivo, dessa ficha antiga — por isso eu falei de expandir."* Medidas do contrato do cockpit §3 continuam valendo (`min 520`, textarea `16px/400`, `max-width 90ch`) |
| **D6** — ✅ **DECIDIDO POR ELE (03/08):** no Meu dia o fluxo é **escrever → salvar → o odontograma mostra → o dentista confirma**, igual à ficha | Aplicar direto no rascunho sem passo de conferência | Palavra dele: *"o dentista vai poder escrever o que ele fez na sessão, salvar, e vai mostrando no odontograma — o dentista confirma, da mesma forma que funciona na ficha."* O odontograma segue com o comportamento padrão de hoje (só o rascunho) — ver Q5, cortada |
| **D5** — corrigir o hardcode `bg-red-100 text-red-600` do estado "gravando" em `captura-livre-card.tsx:179` para tokens do projeto | Deixar como está (é código do perfil, não desta fatia) | O componente está entrando numa 2ª tela com light/dark auditado a fundo (cockpit). 1 linha, e evita um badge rosa quebrando o dark mode logo na estreia |
| **D7** — ✅ **DECIDIDO POR ELE (04/08): o campo mágico SUBSTITUI a barra de procedimento.** Não convivem | ~~Barra fica pro caso rápido + campo mágico embaixo pro relato completo~~ (era minha recomendação, **recusada**) | Palavra dele: *"substituir a barra que hoje tem, que fica embaixo do onde/dente, e colocar o campo mágico. Porque aí ele vai de todo jeito ter que digitar, falar ou anexar."* Entrada única, sem escolher ferramenta antes de começar. ⚠️ **Consequência de maior peso desta spec — ver §2.1** |
| **D8** — ✅ **DECIDIDO POR ELE (04/08):** anexo de documento vira **caixa própria embaixo do Histórico** (coluna esquerda), separada do campo mágico. Com botão **"usar este documento de base"** que carrega a transcrição no campo mágico | Anexo só dentro do campo mágico (como o `CapturaLivreCard` faz hoje) | Palavra dele: *"a gente separa essa parte de anexar o documento do Dex, cria uma caixinha aqui embaixo do histórico pra anexar documentos, e no campo mágico um botão 'usar este documento de base' — aí ele já vai criar uma ficha usando esse documento, da transcrição."* Separa **ter o documento** de **usar o documento**: o anexo fica no paciente, o uso é por sessão |
| **D9** — ✅ **DECIDIDO POR ELE (04/08):** o campo mágico mostra a **detecção em tempo real** — procedimento e dente aparecendo enquanto o texto entra —, e o dentista continua acrescentando embaixo | "Organizar com Dex" como botão único no fim (comportamento de hoje) | Palavra dele: *"o campo mágico mostra aquela detecção em tempo real, que fica bem legal, e embaixo ele pode acrescentar mais coisas, e aí a gente organiza pra ele se trazer num contexto muito completo."* ⚠️ **Custo real a decidir na implementação — ver §2.2** |
| **D10** — extração de **valor** pelo texto **NÃO entra nesta fatia** — vira item próprio, depois do [R-53](R-53-orcamento-indicados-abertos.md) | Extrair valor junto, com trava de confirmação | Decisão dele, 04/08. O R-53 ainda vai mudar de onde vem o item do orçamento; empilhar "IA propõe preço" sobre um caminho que vai mudar multiplica risco em cima de **dinheiro**. Ele também quer rever o estilo do orçamento antes |

### 2.1 ⚠️ O que o D7 custa — precisa estar escrito

Substituir a barra **não é trocar um input por outro**. A barra é o typeahead do R-46b: 17 tipos
estruturais + catálogo comercial da clínica, com `"restauração 35"` resolvendo o dente pelo
texto, ordem livre (procedimento antes ou depois do "onde") e o chip de catálogo pendente.

**O que morre com ela:** o caminho de **3 gestos** (digitar → Enter → Salvar), determinístico,
instantâneo e sem custo de token. O `MAPA-MEU-DIA.md §3` chama esse número de *"o ativo do
produto"* e o §0 define **gestos por registro** como a métrica que governa o roadmap inteiro —
é a única em que o Word ainda ganha.

**Depois do D7, todo registro passa por IA.** Consequências que a implementação tem que
enfrentar, não descobrir:

| Risco | Mitigação mínima |
|---|---|
| Latência entra no caminho crítico de todo registro | Medir antes/depois. Se o registro simples ficar mais lento que hoje, o D7 piorou a métrica que justifica o produto |
| Falha de rede/API deixa o dentista sem caminho pra registrar | **Fallback obrigatório:** o painel do dente (odontograma → `ToothDetailPanel`) continua registrando sem IA nenhuma. Não pode existir estado em que registrar é impossível |
| Custo por token em toda entrada, não só nas ricas | `feature` no logger de provider (regra do `CLAUDE.md`) pra medir custo real por registro |

⚠️ **A métrica não é medida hoje** (`MAPA §6.7`: nenhuma spec instrumenta gestos). Então o D7
**não pode ser declarado bom ou ruim** — só observado. Recomendação: instrumentar a contagem
de gestos **antes** de trocar, senão a comparação vira opinião.

**Absorve o R-46b.** A fatia "Registrar" do R-46b deixa de existir como está. O R-46b não é
cortado — ele é **substituído** aqui, e o roadmap precisa dizer isso, senão fica uma spec
`aprovada` descrevendo uma tela que não existe mais.

### 2.3 ✅ D11 (04/08) — a detecção acende o odontograma, com MOTION e não com tinta

**Decisão dele:** *"conforme ele vai detectando os procedimentos, os dentes, o odontograma vai
acendendo, inserindo já. Aí o dentista clica no procedimento."*

O valor é **confirmação espacial**: falar "26" e ver o 26 acender prova que ele entendeu o dente
certo, sem ler lista nenhuma. Nenhum chip de texto entrega isso.

⚠️ **O risco, e por que motion resolve.** Enquanto se digita, **toda frase é um fragmento**:
`"extração do 38"` existe como texto antes de `"...está descartada"` ser digitado. Mesma coisa
com *"não fiz o canal do 26 hoje"* e *"se não melhorar, extração"*. Pintar o dente durante a
digitação quebra a invariante que **ele mesmo protegeu ao cortar a Q5**: *"o que está no
odontograma é exatamente o que o Salvar grava"*.

**Dois estados visuais distintos, e a diferença é movimento:**

| Estado | Significa | Como |
|---|---|---|
| **Detectado** | "estou vendo isso no texto" | pulso / contorno animado, **sem preenchimento** |
| **Confirmado** | "isso vai ser gravado" | pinta com a cor de sempre (`corDoRegistro`) |

Isso respeita a restrição do `MAPA §7.1` — *"a gramática de cor está esgotada, elemento novo não
ganha cor"* — que lista **motion** explicitamente como livre (*"o cockpit não tem uma única
animação"*). Zero cor nova, invariante preservada, e a sensação de "ele já entendeu" mantida.

### 2.4 ✅ D12 (04/08) — a faixa ONDE/STATUS morre junto com a barra

Consequência do D7 que precisa estar escrita: com o campo mágico como entrada, os chips de
**ONDE** (`+ dente · Arc. sup. · Arc. inf. · Boca toda · Q1-Q4`) e de **STATUS** (`a fazer ·
feito`) **saem do painel Registrar**. O texto resolve os dois — *"extração do 38"* já traz onde,
*"vou fazer semana que vem"* já traz status.

O centro passa a ser: **campo mágico → detecção → odontograma**. Nada mais.

⚠️ **O `OndeSeletor` não é deletado** — ele continua sendo o caminho sem-IA (fallback do §2.1)
quando acessado pelo painel do dente. Sai da faixa fixa do centro, não do código.

### 2.2 ⚠️ "Tempo real" (D9) — o que precisa ser decidido antes de codar

Hoje é um botão: o dentista escreve, clica "Organizar com Dex", revê o resultado. "Tempo real"
pode significar três coisas com custos muito diferentes:

| Leitura | Custo | Quando faz sentido |
|---|---|---|
| **Debounce** (extrai ~800ms depois de parar de digitar) | 1 chamada por pausa | **Recomendado** — entrega a sensação de "ele já entendeu" sem streaming |
| **Streaming por token** | chamada contínua, texto mudando sob o dedo | Só se a sensação for o produto em si |
| **Ao colar/anexar + botão** (hoje) | 1 chamada por ação | Mais barato, menos "mágico" |

**Não decidido.** Fica pro brief de implementação, mas o default recomendado é o debounce — é o
que dá a sensação descrita sem transformar cada tecla em custo.

## 3. Objetivo e como funciona

**Objetivo:** no Meu dia, o dentista registra a visita de hoje falando, anexando um arquivo ou
digitando — no mesmo lugar, sem escolher a ferramenta antes de começar.

**Atualizado 04/08 (D7-D9).** O campo mágico **é** a entrada do painel "Registrar": ocupa o
lugar da barra de procedimento, logo abaixo dos chips de "onde"/dente. O dentista fala, anexa
ou digita ali — e **enquanto o texto entra, a detecção aparece**: procedimento e dente
reconhecidos vão surgindo como chips abaixo do campo, e ele continua acrescentando embaixo.
Quando manda organizar, o resultado **se soma** ao rascunho — nunca substitui evento já lançado
(mesmo princípio do R-47) — e o odontograma + "Concluídos hoje"/"Novos procedimentos" refletem
na hora.

**O anexo saiu daqui (D8).** Documento vive numa caixa própria embaixo do Histórico (coluna
esquerda), presa ao **paciente**, não à sessão. De lá, "usar este documento de base" carrega a
transcrição no campo mágico — separando *ter o documento* de *usar o documento nesta consulta*.

**O que continua sem IA (trava do §2.1):** o painel do dente. Clicar um dente e lançar pelo
`ToothDetailPanel` registra sem nenhuma chamada de rede — é o caminho de fallback obrigatório
quando a IA falha, e não pode ser removido junto com a barra.

## 4. Contrato técnico

### D0 — extração (Sonnet 5, mecânica, sem UI)

```typescript
// src/lib/odontograma/dedup-eventos-draft.ts — NOVO
import type { OdontogramaEventoDraft, OdontogramaEventoInput } from '@/types/odontograma';

/** Chave semântica — mesmo tipo/status/origem/âncora/papel, mesmo com id diferente.
 *  Extraído de FichasTab.tsx (R-30 Parte 2), comportamento idêntico. */
export function chaveDedupEvento(ev: OdontogramaEventoDraft): string;

/** Colapsa eventos equivalentes numa lista, mantém o de menor id (determinístico).
 *  Evento com `assinaturaId` nunca é candidato a descarte (R-30 invariante #2). */
export function dedupEventosDraft(eventos: OdontogramaEventoDraft[]): OdontogramaEventoDraft[];

/** R-47 — funde uma extração nova da IA num draft existente sem NUNCA perder o que já
 *  está lá: se a chave semântica de um evento novo já existe no draft atual, o novo é
 *  descartado (reextrair é no-op, não upgrade automático). Generaliza o bloco que hoje
 *  vive só dentro de `aplicarEvolucaoDoOrganizar` (FichasTab.tsx:1203-1213). */
export function mesclarEventosSemPerda(
  draftAtual: OdontogramaEventoDraft[],
  novosDaIA: OdontogramaEventoInput[],
  realizadoEmPadrao: string,
): OdontogramaEventoDraft[];
```

`FichasTab.tsx` — `aplicarEvolucaoDoOrganizar` (1165-1219) passa a **importar e chamar** as 3
funções em vez de defini-las; `handleSave` (linha 1386, `dedupEventosDraft(eventosDraft)`)
importa também. Nada muda de comportamento — behavior-preserving, mesmo padrão de
`derivar-campos-legado.ts` (extraído antes pro mesmo motivo). O mapeamento específico do form
(`queixa_principal→type`, `teethNotes`, `procedimentos`, `conduta`, `ortoManutencao`) **fica**
em `FichasTab.tsx` — não serve ao Meu dia.

### D1 — o componente no Meu dia (Opus, decisão visual em aberto)

> ⚠️ **04/08 (revisão) — este contrato foi escrito ANTES do D7 (campo mágico substitui a
> barra inteira, não só "+ texto da visita") e do D12 (chips ONDE/STATUS somem do centro)
> existirem como decisão.** O texto abaixo, como estava, só substituía o link "+ texto da
> visita" — a Combobox/`OndeSeletor`/Status continuavam na tela, e nada no §4 removia a barra
> de verdade. As subseções **D1.1** e **D1.2** fecham essa lacuna; o resto do contrato
> (props do componente, `aplicar()`, `alertaNovo`, schema) já estava certo e não muda.

#### D1.1 — o que sai de `registrar-painel.tsx` (D7/D12)

`CampoMagicoMeuDia` substitui, no arquivo atual, **todo o bloco entre a `Combobox` e o botão
Salvar** — não só o link "+ texto da visita":

| Sai (linhas do arquivo atual) | Vira |
|---|---|
| `Combobox`/`ComboboxInput`/`ComboboxContent` (busca de tipo + catálogo) | Texto livre no campo mágico — a IA resolve tipo e âncora |
| Bloco `catalogoPendente` ("qual tipo clínico?") | Não existe mais — não há mais 2 gestos pra resolver nome comercial → tipo estrutural |
| `OndeSeletor` (chips de região) | **Deletado de vez** (04/08, ver D1.2 revisão) — não sobrevive nem escondido. Clicar o dente resolve "onde" pros tipos por-dente; os de boca resolvem por tipo |
| Linha de chips Status (`indicado`/`realizado`) | Some da faixa fixa (D12), sobrevive na disclosure "Registrar sem IA". Texto do campo mágico resolve status pelo relato — "vou fazer semana que vem" já traz status |
| Aviso `tipoPendente` ("aguardando onde") | Não existe mais — não há mais tipo escolhido sem âncora esperando |
| Trigger "+ texto da visita" + `textarea` (`textoAberto`) | Absorvido pelo campo mágico — `aplicar()` já escreve em `textoVisita` |

**O que fica, sem mudar:** `Odontograma` (só o wrapper simplifica, por C6), `onde`/
`ancorasDoOnde` como mecanismo interno (agora só dente — região saiu de vez, ver D1.2 revisão),
bloco `eventosPendentes` (retry de gravação), botão Salvar. **`onToothToggle` muda** (D1.2
revisão, item 3): 1 clique já mostra o resumo, não precisa mais de 2.

#### D1.2 — Registrar sem IA: o fallback que o §2.1 já exige, agora concreto

O §2.1 já escreve a invariante ("não pode existir estado em que registrar é impossível") mas
o contrato original nunca dizia COMO ela se cumpre depois que a barra sai. Checagem contra o
código real (`registrar-painel.tsx` + `ToothDetailPanel.tsx`) achou um buraco: **5 tipos não
têm nível "dente"** — `profilaxia`, `clareamento`, `fluor`, `exame_periodontal` (sempre
`{nivel:'boca'}`, auto-resolvido hoje pela própria função `registrar()`) e `raspagem`
(ambíguo, quadrante OU boca — o único que precisa mesmo do chip `OndeSeletor` pra resolver).
`ToothDetailPanel` é **inteiramente por-dente** (`CHIPS` em `ToothDetailPanel.tsx:59-69` não
inclui nenhum dos 5) — clicar um dente no odontograma **não** é caminho pra estes 5 tipos.
Sem a barra, e com a IA fora do ar, estes 5 tipos ficariam **sem nenhum caminho de registro**.
Texto livre (`textoVisita`) tem o mesmo problema pela mesma razão: hoje só entra no rascunho
via `aplicar()` (que depende da chamada de IA ter sucesso) — se `/api/dex/formatar-evolucao`
falhar, o texto digitado no campo mágico fica preso lá, nunca chega em `textoVisita`.

**Proposta (não é decisão de produto nova — é a leitura mecânica mais direta de "sai da faixa
fixa, não do código", D12):** o bloco inteiro do D1.1 (Combobox + catalogoPendente +
`OndeSeletor` + Status + aviso + textarea de "+ texto da visita") **continua existindo,
código igual, zero mudança de lógica** — só passa a renderizar dentro de uma disclosure
fechada por padrão, um link tipo "Registrar sem IA" perto do campo mágico. Isso:

- Fecha o buraco dos 5 tipos boca/região (a única UI que sabe criar `{nivel:'boca'|'arcada'|'quadrante'}` continua existindo, só escondida)
- Fecha o buraco do texto (a `textarea` de `textoVisita` volta a ser um caminho manual, sem depender de `/api/dex/formatar-evolucao`)
- Preserva o G12 do C6 (seleção múltipla no odontograma) sem tocar em `onToothToggle` — o mecanismo é o mesmo de hoje, só a visibilidade do chip que o representa muda
- Custo de implementação ~zero — é mover JSX existente pra dentro de um `<details>`/disclosure, não escrever nada novo

```typescript
// registrar-painel.tsx — novo estado local, só visibilidade
const [fallbackAberto, setFallbackAberto] = useState(false);
// o bloco Combobox…Status…tipoPendente…textarea (hoje sempre visível) passa a viver
// dentro de `{fallbackAberto && (...)}`, atrás de um botão/link "Registrar sem IA"
```

⚠️ **Isto precisa da sua confirmação antes de virar código** — é a única peça deste contrato
que não é transcrição de algo já decidido; é uma proposta pra fechar uma invariante que o
próprio spec já exige. Se preferir outro mecanismo (ex.: um formulário minúsculo só pros 5
tipos, em vez de reaproveitar a barra inteira), este é o lugar pra dizer.

#### D1.2 — revisão 04/08 (ao vivo): ele testou a proposta e pediu 3 mudanças

A proposta acima (mover a barra pra dentro de uma disclosure, código igual) foi codada,
testada ao vivo, e ele pediu ajuste na hora — não é mais o que está no ar. Três mudanças:

| # | O quê | Por quê |
|---|---|---|
| 1 | **`OndeSeletor` (chips Arc. sup./Arc. inf./Q1-Q4) sai de vez, não só escondido** | Palavra dele: *"entre os cliques e digitar no campo mágico é muito mais fácil digitar"* — clicar direto no dente do odontograma (`onToothToggle`, inalterado) já resolve "onde" pros tipos por-dente; os 4 tipos de boca resolvem sozinhos por tipo (já resolviam, código de `TIPOS_NIVEL_BOCA` nunca dependeu do chip). `onde-seletor.tsx` e `fdi-popover.tsx` **deletados** (zero call site restante) |
| 2 | **Chip "Manutenção ortodôntica" entra no lugar** | Ortodontia é o 1º tipo real de "não usa o odontograma" (palavra dele). Reusa `OrtoForm` (`src/components/fichas/orto-form.tsx`, já existia, já era `PluginFormProps`-genérico — zero componente novo) e pré-preenche com `contexto.orto` quando existe (mesma herança do R-05b) — sem isso seria "mais um formulário vazio pra preencher toda visita", o oposto do que a régua de atrito do `MAPA §0` pede |
| 3 | **1 clique no dente já mostra o balão, não 2** | Palavra dele: *"não eu ter que clicar em dente 28 e abrir"* — `onToothToggle` mudou: 1º clique num dente ainda-não-selecionado agora seleciona **e** chama `onDenteAbertoChange` na mesma tacada (antes: só selecionava, precisava de um 2º toque no mesmo dente pra abrir). Multi-seleção sobrevive como efeito colateral — clicar um 2º dente diferente ainda acumula em `onde.dentes` (serve o caso de `tipoPendente` aguardando onde); clicar um dente JÁ selecionado ainda remove ele do lote |

**Consequência pro `raspagem` (o único tipo com nível ambíguo, quadrante OU boca):** sem chip
de região, ele perde a opção de ancorar por quadrante inteiro sem clicar dente a dente.
Aceito conscientemente (mesma razão do item 1) — continua 100% registrável via clique direto
no dente (âncora de dente, mais preciso que quadrante) ou via campo mágico (a IA resolve
"raspagem no Q2" pelo texto). Não é um buraco novo: é o mesmo trade-off do item 1, só que
nomeado pro único tipo que ele afeta de verdade.

**Threading do orto (schema, não migration):** `salvarFicha` já aceita `ortoManutencao` desde
a migration 105 (`orto_manutencao` em `fichas`) — o "bloqueio" que o `MAPA §2.2` registrava
era só `salvarVisitaMeuDia` (o wrapper fino deste arquivo) não repassar o campo. Mesmo padrão
do `alertaNovo`: 1 campo a mais no schema Zod + na chamada pra `salvarFicha`, zero coluna nova.

```typescript
// actions.ts — salvarVisitaMeuDiaSchema ganha 1 campo (mesmo padrão do alertaNovo)
ortoManutencao: z.unknown().nullable().optional(),
// dentro da função: salvarFicha({ ..., ortoManutencao: dados.ortoManutencao ?? null })
```

```typescript
// src/app/dashboard/meu-dia/_components/campo-magico-meu-dia.tsx — NOVO
export interface CampoMagicoMeuDiaProps {
  pacienteNome: string;
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  textoVisita: string;
  onTextoVisitaChange: (texto: string) => void;
  onAlertaNovoChange: (alerta: string | null) => void; // só escrita — quem lê é handleSalvar (registrar-painel.tsx)
  anexarTexto?: { texto: string; nonce: number }; // D8 — repassado direto pro CapturaLivreCard
}
```

> **04/08 (implementação) — ajuste de 1 campo no contrato acima:** `alertaNovo` (o valor, não
> o setter) saiu — `CampoMagicoMeuDia` nunca o lê, só escreve via `onAlertaNovoChange`; quem lê
> é `handleSalvar` no estado local do próprio `registrar-painel.tsx`. Carregar um valor que
> ninguém consome é exatamente a prop morta que o `ponytail`/CLAUDE.md pedem pra cortar.

Renderiza o gatilho (substitui **a barra inteira**, D1.1 — não só "+ texto da visita" como a
versão original desta frase dizia) e, aberto, o container tela cheia hospedando
`<CapturaLivreCard pacienteNome={...} formDirty={eventosDraft.length > 0 ||
textoVisita.trim() !== ''} onOrganizado={aplicar} />`. `aplicar(data: EvolucaoFormatada)`:

```typescript
function aplicar(data: EvolucaoFormatada) {
  onEventosDraftChange(mesclarEventosSemPerda(eventosDraft, data.odontograma_eventos, hojeBRT()));

  // 04/08 (implementação) — a versão anterior deste exemplo chamava onTextoVisitaChange((t) =>
  // ...) num prop tipado (texto: string) => void, que não aceita função updater; e chamava a
  // prop 2× em sequência (2ª leria o `textoVisita` da closure, ainda desatualizado). Corrigido
  // pra montar a string final numa passada só, orto incluído.
  const partes = [
    textoVisita,
    data.anotacoes,
    data.conduta && `Conduta: ${data.conduta}`,
    data.orto_manutencao && `Orto (a estruturar — ver R-50): ${formatarOrto(data.orto_manutencao)}`,
  ].filter((s): s is string => Boolean(s));
  onTextoVisitaChange(partes.join('\n\n'));

  if (data.alerta_novo) onAlertaNovoChange(data.alerta_novo); // I3
  if (data.orto_manutencao) { // I2 — sem tabela própria (R-50); nunca descarta em silêncio
    toast('Detectamos manutenção ortodôntica — sem tabela própria no Meu dia ainda; foi para o texto da visita.');
  }
}
```

`registrar-painel.tsx` ganha `alertaNovo`/`onAlertaNovoChange` como **estado local** (não sobe
pro `meu-dia-client` — só `handleSalvar` o lê, ao contrário de `eventosDraft`/`textoVisita`
que a coluna direita também precisa ler). `handleSalvar` passa `alertaNovo` pro payload.

```typescript
// src/app/dashboard/meu-dia/actions.ts — salvarVisitaMeuDia ganha 1 campo
const salvarVisitaMeuDiaSchema = z.object({
  pacienteId: z.string().uuid(),
  agendamentoId: z.string().uuid(),
  textoVisita: z.string().trim().max(5000),
  eventosDraft: z.array(z.unknown()),
  alertaNovo: z.string().trim().nullable().optional(), // NOVO — I3
});
// dentro da função: salvarFicha({ ..., alertaNovo: dados.alertaNovo ?? null })
```

`captura-livre-card.tsx:179` — `'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'` vira
`'bg-coral/10 text-coral-ink hover:bg-coral/20 animate-pulse'` (D5).

#### D1.3 — D8: Anexar documentos (caixa embaixo do Histórico)

> ⚠️ **04/08 (revisão) — D8 estava decidido (§2) mas nunca virou contrato técnico.** Sem
> arquivo, sem props, sem definir onde o estado do documento vive. Fechado abaixo.

```typescript
// src/app/dashboard/meu-dia/_components/anexar-documentos-bloco.tsx — NOVO
export interface AnexarDocumentosBlocoProps {
  documentoNome: string | null;
  documentoTexto: string | null;
  onAnexado: (nome: string, texto: string) => void;
  onUsarComoBase: () => void;
  aberto: boolean;
  onToggle: () => void;
}
```

Reusa a MESMA extração de texto que `captura-livre-card.tsx` já faz em `handleArquivo`
(`/api/transcrever` pra áudio, `/api/extrair-texto` pra pdf/docx/doc/txt) — extraída pra
`src/lib/dex/extrair-texto-arquivo.ts` (`extrairTextoDeArquivo(file: File): Promise<{ texto:
string } | { error: string }>`), a mesma função chamada dos dois lugares (esta caixa nova E o
`handleArquivo` que já existe). Evita duplicar a lógica de decidir áudio vs. documento pela
extensão, mesmo motivo do D3.

**Onde o estado vive:** `meu-dia-client.tsx`, ao lado de `eventosDraft`/`textoVisita` — **NÃO
persiste no banco** (nenhuma migration nesta fatia). "Fica no paciente" (§2, D8) significa
"não reseta junto com o rascunho da visita", mas ainda é estado de cliente: reseta ao trocar
de paciente, no MESMO bloco de reset explícito do contrato §5.4 (`idAoResetar`). Se ele quiser
que o documento sobreviva a um F5 ou volte numa sessão futura, é escopo maior — precisa de
tabela nova, não assumido aqui.

**"Usar este documento de base"** precisa empurrar o texto extraído pra dentro do campo
mágico — e `CapturaLivreCard` hoje **não tem entrada pra isso** (`texto` é 100% interno ao
hook `useCapturaLivre`, `CapturaLivreCardProps` não aceita valor inicial nem texto externo).
Proposta mínima, mesmo padrão de append que `handleArquivo` já usa internamente:

```typescript
// captura-livre-card.tsx — 1 prop nova, opcional — callers existentes (FichasTab) não passam,
// comportamento deles 100% preservado
export interface CapturaLivreCardProps {
  pacienteNome: string;
  formDirty: boolean;
  onOrganizado: (evolucao: EvolucaoFormatada) => void;
  anexarTexto?: { texto: string; nonce: number }; // NOVO — nonce muda a cada clique em "usar como base"
}
// dentro do componente (ou do hook useCapturaLivre): useEffect observando `anexarTexto?.nonce`,
// faz setTexto(prev => prev ? `${prev}\n\n${anexarTexto.texto}` : anexarTexto.texto) quando muda
```

`meu-dia-client.tsx` guarda um `nonce` (`useState(0)`) que incrementa em `onUsarComoBase`, e
passa `{ texto: documentoTexto, nonce }` pro `CampoMagicoMeuDia`, que repassa pro
`CapturaLivreCard`.

⚠️ **Não decidido — precisa da sua palavra:** `CapturaLivreCard` mantém o próprio botão
"Anexar" inline (D1 diz que ele é "reusado tal qual") — que dizer que, no Meu dia, existem
**2** jeitos de anexar um documento (a caixa nova E o botão inline dentro do campo mágico
aberto), fazendo a mesma coisa por caminhos diferentes. Recomendo aceitar a redundância por
agora (zero mudança no componente reusado, resolve sozinho se um dia incomodar) em vez de
abrir uma prop só pra esconder o botão — mas é call sua, não assumo.

## 5. Referência visual

- **Artefato:** não é necessário — a moldura (§ D4) já está decidida: expansão in-place,
  container tela cheia na coluna central. Não é UI nova (a régua da regra 4), é o mesmo
  container que o R-46c já usa pro colar do Word, com o mesmo `CapturaLivreCard`.
- **Rota alvo:** `/dashboard/meu-dia` · **Componente alvo:**
  `_components/campo-magico-meu-dia.tsx`
- **Tokens já conhecidos** (aprovados no contrato do cockpit §3 — não precisam de novo brief):

| Token | Valor |
|---|---|
| Altura mínima do container aberto | `520px` |
| Textarea | `16px`/400, `max-width: 90ch` |
| Header do campo mágico (herdado do `CapturaLivreCard`) | `border-teal/30` · `bg-surface-alt/40` · `text-teal-ink` uppercase |
| Estado "gravando" (após D5) | `bg-coral/10 text-coral-ink` |

- **Ainda em aberto (não bloqueia D1, decide durante a implementação):** posição/rótulo do
  gatilho · se fecha sozinho após "Organizar" ou fica aberto pro dentista revisar.

## 6. Invariantes

- [ ] **I1** — Evento já no rascunho **nunca** é perdido ao reextrair (`mesclarEventosSemPerda`) — mesma regra do R-47, agora também no Meu dia.
- [ ] **I2** — `orto_manutencao` detectado **nunca** é descartado em silêncio — vira texto visível + toast, até o R-50 dar um lugar de verdade.
- [ ] **I3** — `alerta_novo` detectado é sempre gravado em `fichas.alerta_novo` — mesma classe do achado 6 do R-47, superfície nova.
- [ ] **I4** — Reabrir o campo mágico com rascunho existente pede confirmação antes de sobrescrever o **texto** (mesmo texto do perfil, adaptado — nunca some com o odontograma já clicado).
- [ ] **I5** — `chaveDedupEvento`/`dedupEventosDraft`/`mesclarEventosSemPerda` têm **1 única definição** (`src/lib/odontograma/`) — FichasTab e Meu dia importam, nenhum reimplementa.
- [ ] **I6** — Trocar de paciente (`agendamentoId` muda) zera o campo mágico junto com `eventosDraft`/`textoVisita` — herda o reset explícito do contrato §5.4.
- [ ] **I7** — **(D2, fusão)** O componente único **nunca** deixa o destino vazar: o caminho `origem='importado'` continua gravando data retroativa e **jamais** se apresenta como atendimento real (as 3 superfícies + badge do PDF que o R-46c construiu seguem valendo); o caminho "hoje" **jamais** grava `origem='importado'`. Testar os dois destinos no banco, não na tela.
- [ ] **I8** — **(D1.2, 04/08, revisada)** `profilaxia`/`clareamento`/`fluor`/`exame_periodontal` continuam registráveis via Combobox (disclosure "Registrar sem IA") sem qualquer chamada de IA. `raspagem` continua registrável clicando o dente diretamente no odontograma (âncora de dente — perdeu a opção de quadrante/boca sem clicar dente a dente, aceito 04/08). Texto puro continua gravável via `textarea` de fallback. Nenhum tipo do catálogo fica sem NENHUM caminho de registro com `/api/dex/formatar-evolucao` fora do ar.
- [ ] **I9** — **(D1.2, 04/08)** `ortoManutencao` do chip "Manutenção ortodôntica" grava em `fichas.orto_manutencao` — conferir no banco, não só na tela (mesma classe de prova que I3/I5 já exigem pro resto do payload).

## 6b. Q5 — ✂️ CORTADA por ele (03/08)

Cogitou-se pintar em coral, no odontograma do Meu dia, a pendência de sessões anteriores
(hoje `<Odontograma eventos={eventosDraft} />`, `registrar-painel.tsx:387`, só recebe o
rascunho do dia). **Ele cortou do planejamento** — o odontograma do Meu dia continua com o
padrão de hoje.

Motivo do corte: mostrar "o que é devido" com a mesma aparência de "o que vai ser gravado no
Salvar" quebra a invariante silenciosa que vale hoje (*o que está no odontograma é exatamente
o que o Salvar grava*) — mesma classe de defeito de R-30/R-47/R-55. E o dente em tratamento
multi-sessão ficaria **idêntico** a um nunca tocado, porque a precedência do componente
(`Odontograma.tsx:198`) faz coral vencer teal.

Se voltar algum dia, o pré-requisito é distinção visual entre os dois estados — não é só
alimentar o componente com mais eventos.

## 7. Gates de aceite

**D0:**
- [ ] **G1** — `FichasTab.tsx` typecheck/lint/build limpos após o import. Reorganizar 2× uma ficha salva com evento já lançado **não apaga nada** — testado ao vivo (fecha o 🟡 do R-47 que nunca foi provado em navegador).
- [ ] **G2** — `dedup-eventos-draft.test.ts` novo cobre: reextração idêntica é no-op · evento novo distinto entra · evento com `assinaturaId` nunca sai.

**D1:**
- [ ] **G3** — No Meu dia: ditar, anexar ou digitar + "Organizar com Dex" preenche `eventosDraft`/`textoVisita` sem apagar dente já clicado manualmente antes.
- [ ] **G4** — Reextrair o mesmo relato 2× não duplica evento (mesma chave semântica dos dois cards).
- [ ] **G5** — `alerta_novo` detectado grava em `fichas.alerta_novo` — conferir no banco, não na tela.
- [ ] **G6** — `orto_manutencao` detectado aparece no texto da visita com o toast de aviso — nunca silencioso.
- [ ] **G7** — Estado "gravando" usa `coral`, não hex — conferido dark **e** light.
- [ ] **G8** — Trocar de paciente zera o campo mágico (aberto ou fechado) junto com o resto do rascunho.
- [ ] **G9** — Falha da chamada `/api/dex/formatar-evolucao` (rede, 500) **não** apaga o texto já digitado — toast de erro, texto continua no campo.
- [ ] **G10** — (D1.2, I8) Com a disclosure "Registrar sem IA" aberta: registrar profilaxia (ou outro dos 4 tipos de boca) via Combobox, sem tocar em nada de IA, e salvar — evento grava `{nivel:'boca'}`, sem passar por `/api/dex/formatar-evolucao`. `raspagem`: clicar um dente diretamente no odontograma com o tipo escolhido antes ou depois (ordem livre) — grava âncora de dente, também sem IA.
- [ ] **G11** — (D1.2) Digitar texto na `textarea` de fallback, sem clicar em "Organizar com Dex" em lugar nenhum, e salvar — `textoVisita` grava exatamente o que foi digitado.
- [ ] **G12** — (D1.2, 04/08 revisado) 1 clique num dente ainda-não-selecionado já mostra o resumo (C6) — não precisa de 2º toque. Clicar um 2º dente diferente acumula seleção (serve `tipoPendente` aguardando onde); clicar um dente JÁ selecionado remove do lote. Testar com a disclosure "Registrar sem IA" fechada OU aberta — comportamento idêntico nos dois estados.
- [ ] **G13** — (D1.2, 04/08) Chip "Manutenção ortodôntica": abrir sem histórico prévio nasce com `OrtoForm` vazio (arcada "Superior", resto null — `ORTO_VAZIO`); abrir COM `contexto.orto` existente nasce pré-preenchido com a última manutenção real do paciente (herança R-05b). Editar e salvar — grava em `fichas.orto_manutencao` (I9). Visita só-de-orto (zero evento, zero texto) habilita o botão Salvar (não fica preso em "Já registrado hoje").
- [ ] **G14** — (D8) Anexar um documento na caixa nova extrai o texto (mesmo backend que o anexo de hoje usa) e mostra nome+preview; "usar este documento de base" leva o texto pro campo mágico (aparece na `textarea` dele, sem apagar o que já estava digitado — append, não substituição).
- [ ] **G15** — (D8) Trocar de paciente limpa o documento anexado (nome+texto), mesmo bloco de reset do `eventosDraft`/`textoVisita` (§5.4).

## 8. Fora de escopo

- Forma visual final do "tela cheia" — decide no brief/artefato antes de D1 entrar em código.
- Fundir `ColarDoWordDialog` com o campo mágico novo (D2 — recomendação é não fundir; ele confirma).
- Resolver o R-50 de verdade (orto sem ativação manual) — o toast/fallback de texto aqui é rede de segurança, não solução.
- ~~Responsividade/tablet — herdado do P8 do cockpit.~~ **REVOGADO — ver nota abaixo.**
- Trocar `window.confirm` por modal estilizado — debt pré-existente do perfil, não desta fatia.
- Trocar o `Loader2` ad-hoc do `CapturaLivreCard` pelo `DexLoader` canônico — cosmético, registrado, não expandido sozinho.

> ⚠️ **04/08 (revisão) — a isenção de responsivo acima está desatualizada.** O P8 (P de
> "polimento", tablet/celular fora de escopo) foi revogado em 03/08 pelo [C6 §2.5](R-46-C6-layout-cockpit.md#25--decidido-por-ele-0308-responsivo-entra-nesta-fatia-o-p8-morre),
> que diz explicitamente: *"Isso encarece esta fatia e o R-46d D1"* — ou seja, o próprio C6 já
> contava esta fatia como alcançada pela revogação. `campo-magico-meu-dia.tsx` e
> `anexar-documentos-bloco.tsx` (D8) entram no mesmo gate de iPad retrato (768px) que o C6/G14
> mede — não têm isenção própria.

## 9. Riscos registrados (não bloqueiam D0)

| Risco | Nota |
|---|---|
| Rate limit compartilhado | `/api/dex/formatar-evolucao` usa a chave `dex:formatar-evolucao` (20/60s) **por dentista**, somando o uso do perfil **e** do Meu dia. O Meu dia é a tela de maior frequência — monitorar depois do push |
| R-47 nunca testado ao vivo | D0 refatora exatamente o caminho que corrigiu perda silenciosa de dado em 31/07, verificado só por typecheck/lint/build + workflow adversarial. G1 é a primeira vez que isso vira teste ao vivo |
| `CapturaLivreCard` ganha 2ª tela consumidora | Qualquer mudança futura nele passa a afetar perfil **e** Meu dia — testar os dois sempre que mexer nele depois desta fatia |

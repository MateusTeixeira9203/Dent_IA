# R-61 — o odontograma do Meu dia mostra a boca, não só o rascunho da sessão

> **SPEC** · fase **`aprovada`** — aprovada por ele 05/08. Decisão do §2.3: **opção A**
> (ponto no dente mexido nesta sessão).
> **Aberto:** 2026-08-05 · **Fechado:** —
> **Modelo:** Opus 5 — não é prop-lifting mecânico. O contrato de dados é barato (§4.1), mas a
> escolha de codificação visual tem 3 canais já ocupados no componente e um risco real de
> afogar o sinal da sessão. É julgamento, não digitação.
> **Nasce de:** conversa de 05/08 (ele pediu "dentes a fazer em âmbar, registrados sem fazer em
> vermelho, teal quando concluídos"). A investigação reformulou o pedido — ver §1.
> **Relacionado:** [R-42](../ROADMAP.md) (odontograma geral do paciente, só leitura, agregando
> todas as fichas) — **é o mesmo problema numa tela diferente**; se este item fechar bem, o R-42
> herda o mecanismo em vez de inventar outro.

## 1. Problema (e por que o pedido original estava mal formulado)

O pedido dele foi de cor: pendência em âmbar, achado novo em vermelho, concluído em teal.
Investigando pra escrever o contrato, o pressuposto caiu:

```tsx
// registrar-painel.tsx:500
<Odontograma eventos={eventosDraft} … />
// meu-dia-client.tsx:77
const [eventosDraft, setEventosDraft] = useState<OdontogramaEventoDraft[]>([]);
```

**O odontograma do Meu dia abre vazio.** Ele não mostra a boca do paciente — mostra o rascunho
desta sessão. Pendência antiga só é pintada depois que o dentista clica "fazer hoje →", que a
copia pro draft ([`meu-dia-client.tsx:160`](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx:160)).

Logo: **os dentes que ele quer ver em âmbar hoje não estão pintados de cor nenhuma.** O pedido
real não é trocar a paleta — é *trazer o estado persistido da boca pro odontograma*. Cor é
consequência, não causa.

O que isso custa hoje, na prática: o dentista olha o odontograma no meio do atendimento e não
vê o que já foi feito nem o que está aberto naquele paciente. Pra saber, ele lê o bloco "A
fazer" (texto) e o "Histórico" (texto). O mapa — que é o artefato que a odontologia usa pra
isso há um século — está mudo.

## 2. Decisão e alternativas

### 2.1 O que já está decidido

O odontograma passa a renderizar **duas camadas**: o estado persistido do paciente
(leitura) e o rascunho da sessão (edição). O rascunho continua sendo a única coisa
editável e a única coisa que `Salvar` grava. Nada do caminho de escrita muda.

### 2.2 Alternativas descartadas

| Opção | Por que não |
|---|---|
| Mesclar persistido + rascunho num array só e passar pro `Odontograma` | O `ToothDetailPanel` edita esse mesmo array por referência (`onChange={setEventosDraft}`). Evento persistido cairia no draft e **seria regravado como novo** no `Salvar` — duplicata silenciosa no prontuário. Inaceitável |
| Trocar a paleta pra âmbar/vermelho/teal (pedido original) | Não resolve o problema (§1: os dentes nem são pintados). Além disso: cria 4ª cor num sistema que declara 3 de propósito (`corDoRegistro` é função pura de `status`+`origem`, 6 call sites), e âmbar×vermelho é exatamente o par confusável da deuteranopia (~8% dos homens) |
| Pintar o persistido só quando o dentista pede (botão "ver a boca") | Era a opção C do §2.3 — **descartada em 05/08** em favor da A (ver §2.3/§2.4) |

### 2.3 ✅ Decidido por ele (05/08): **opção A**

**Como o dentista separa, olhando, "o que já estava na boca" de "o que eu fiz agora"?**

Eu sugeri tracejado/sólido na conversa. **Retirado — eu estava errado, e conferi depois:**
o tracejado já está ocupado três vezes no componente.

| Canal | Já significa | Onde |
|---|---|---|
| `strokeDasharray: '4 3'` | dente incluso · histórico | [`Odontograma.tsx:419`](../../src/components/odontograma/Odontograma.tsx:419) |
| `strokeDasharray: '3 3'` | dente ausente (contorno fantasma) | [`Odontograma.tsx:346`](../../src/components/odontograma/Odontograma.tsx:346) |
| textura pontilhada (`<pattern>`) | pré-existente | [`Odontograma.tsx:428`](../../src/components/odontograma/Odontograma.tsx:428) |
| matiz (coral/teal/slate) | a fazer · feito aqui · pré-existente | `corDoRegistro` |

Sobra pouco. As três opções que sobrevivem:

**✅ Opção A — marcar a minoria. ESCOLHIDA.** O persistido pinta com a paleta normal (é o
estado real da boca, e é assim que o dentista já lê um odontograma em qualquer software). O
que foi mexido **nesta sessão** ganha um **ponto teal no canto superior direito da célula do
dente**. Racional: numa consulta típica o dentista mexe em 1-5 dentes e a boca tem 32; marcar
o conjunto menor é mais barato, mais quieto e não reestiliza nada que já existe. Custo: 1
marca nova, zero canal existente tocado.

Descartadas na mesma decisão:

| Opção | Por que não |
|---|---|
| **A2** — marca no número do dente (sublinhado) em vez de no desenho | Zero pixel novo sobre o dente, mas a marca some quando o dentista varre só as formas — que é como se lê um odontograma |
| **B** — persistido em opacidade reduzida (fantasma) | Rebaixa 27+ dentes pra destacar 1-5 (mexe na maioria pra marcar a minoria). Colide com o `opacity: 0.8` do dente ausente, e opacidade baixa em light mode tem histórico ruim de contraste neste projeto |
| **C** — toggle "ver a boca", mantendo o padrão de hoje | Elimina o problema de codificação, mas custa um gesto e o mapa segue mudo até alguém lembrar de clicar — o critério do roadmap penaliza gesto que não devolve benefício na hora |

### 2.4 Especificação da marca (opção A)

- **Forma:** círculo cheio, `var(--color-teal)`, com borda de `1.6px` em `var(--color-surface)`
  (o anel de fundo é o que sustenta a marca sobre dente escuro **e** claro, sem cor nova).
- **Posição:** canto superior direito da célula do dente, **fora** do path do dente.
- **Por que não colide:** o anel de seleção do C5 é `stroke` no próprio dente
  ([`Odontograma.tsx:302`](../../src/components/odontograma/Odontograma.tsx:302)); tracejado e
  textura estão nos paths. A marca vive na célula, num espaço hoje vazio.
- **Tamanho:** a definir na implementação contra o artefato (≈9px no protótipo, a conferir
  no arco cheio — dente mais estreito é o incisivo inferior).
- **Acessibilidade:** cor sozinha não comunica (achado auditoria UX 19/07, HIGH #5). A marca
  **precisa** entrar no `aria-label` do dente, junto do `STATUS_CLINICO_LABEL` que já existe —
  algo como "…, alterado nesta consulta".

## 3. Objetivo e como funciona

Ao abrir um paciente no Meu dia, o odontograma já mostra a boca dele: o que está aberto
(coral), o que foi feito aqui antes (teal), o que era pré-existente (slate), e os dentes
ausentes some da renderização normal — exatamente a semântica que `buildResumos` já
implementa, só que alimentada também pelo que está no banco.

Clicar num dente continua abrindo o `ToothDetailPanel`, que continua editando **só o rascunho**.
Um evento persistido aparece pintado mas **não é editável a partir daqui** — pra mexer nele o
caminho continua sendo "fazer hoje →" (que o copia pro draft) ou a ficha do paciente.

## 4. Contrato técnico

### 4.1 Dados — custo zero de query

`getMeuDiaData` **já busca todos os `odontograma_eventos` dos pacientes do dia**
([`get-meu-dia.ts:372-389`](../../src/server/dashboard/get-meu-dia.ts:372)) e já os agrupa em
`eventosPorPaciente` ([`:523`](../../src/server/dashboard/get-meu-dia.ts:523)). O dado está em
memória no servidor e é descartado. Esta fatia **não adiciona uma única query** — só deixa de
jogar fora o que já foi buscado.

```typescript
// get-meu-dia.ts — MeuDiaContexto ganha 1 campo
export interface MeuDiaContexto {
  visitas: MeuDiaVisita[];
  pendencias: MeuDiaPendencia[];
  orto: MeuDiaOrto | null;
  alertas: string[];
  /** R-61 — estado persistido da boca, pra CAMADA DE LEITURA do odontograma. Vem do
   *  mesmo `eventosPorPaciente` que o histórico já usa; zero query nova. NUNCA entra em
   *  `eventosDraft` — o que grava é só o draft (I1). */
  boca: OdontogramaEventoDraft[];
}
```

**Mapeamento `EventoRow` → `OdontogramaEventoDraft`:** reusar a forma que
`pendenciaParaDraft` já monta ([`registrar-painel.tsx:~130`](../../src/app/dashboard/meu-dia/_components/registrar-painel.tsx)),
extraindo o pedaço comum. **`id` é o `id` real do evento** — é isso que sustenta o dedup do
§4.3.

**Filtro:** eventos de fichas de qualquer data, os dois status. Excluir `encaminhado_para != null`
de outro dentista? **Não** — o núcleo clínico é compartilhado (hierarquia 3.1) e a boca é a
boca; "A fazer" é que é a lista pessoal, não o mapa.

### 4.2 Componente

```typescript
// Odontograma.tsx — OdontogramaProps ganha 1 prop
export interface OdontogramaProps {
  // …existentes
  /** v3: camada EDITÁVEL (rascunho da sessão). Inalterada. */
  eventos?: OdontogramaEventoDraft[];
  /** R-61: camada de LEITURA (estado persistido). Pinta junto com `eventos`, mas o
   *  `ToothDetailPanel` nunca a recebe — não é editável daqui. */
  eventosPersistidos?: OdontogramaEventoDraft[];
}
```

`buildResumos` passa a receber as duas listas e a devolver, por dente, também a informação de
**origem da camada** (persistido / rascunho / ambos) — é ela que alimenta a codificação
escolhida no §2.3.

`clinico` hoje é `eventos != null` ([`:748`](../../src/components/odontograma/Odontograma.tsx:748)) —
passa a ser `eventos != null || eventosPersistidos != null`.

### 4.3 Dedup (obrigatório)

"fazer hoje →" copia a pendência pro draft **reusando o `id` real do evento** (é o mecanismo
que faz o upsert marcar `realizado` na MESMA linha em vez de criar outra —
[`get-meu-dia.ts:41-45`](../../src/server/dashboard/get-meu-dia.ts:41)). Logo, depois de
"fazer hoje", o mesmo evento existe nas duas camadas.

**Regra: draft vence persistido, por `id`.** Sem isso o dente pinta duas vezes e a cor
dominante mente (coral persistido venceria o teal do draft — `corDominante` prioriza coral —
e o dentista veria "a fazer" num procedimento que ele acabou de marcar como feito).

### 4.4 O que NÃO muda

`ToothDetailPanel` continua recebendo só `eventos={eventosDraft}` e `onChange={setEventosDraft}`.
`semRascunho` ([`registrar-painel.tsx:193`](../../src/app/dashboard/meu-dia/_components/registrar-painel.tsx:193))
continua olhando só o draft — **boca cheia não é rascunho**, e confundir isso habilitaria o
`Salvar` num paciente onde o dentista não fez nada.

## 5. Referência visual

**Artefato feito, decisão tomada.** `plans/artefatos/R-61-odontograma-boca.html` — servido por
HTTP local, tokens extraídos de `globals.css` (não deduzidos). Mostra as 3 opções do §2.3 lado
a lado (ele escolheu A) **e** a matriz de 6 estados do §5 num card próprio, dark e light:
persistido-aberto · persistido-feito-antes · pré-existente · só-rascunho-marcado ·
nas-duas-camadas-marcado (o caso do dedup §4.3) · ausente/sem registro.

**A marca (opção A, ver §2.4):** ponto sólido `var(--color-teal)` no canto superior direito da
célula, borda `1.6px` em `var(--color-surface)`. Implementação segue o `<span class="dot">`
do artefato — 9px de diâmetro no protótipo, a conferir contra o dente mais estreito no arco
real antes de fechar o CSS final.

## 6. Invariantes

- [x] **I1 — `Salvar` grava exatamente o que gravava antes.** Provado numericamente (G6):
      30→31 eventos, exatamente o novo, zero duplicata dos 30 persistidos
- [x] **I2 — nenhum evento pintado duas vezes.** Dedup por `id` confirmado no G4 (coral→teal
      numa pintura só, não duas cores simultâneas)
- [x] **I3 — zero query nova.** `Promise.all` de `getMeuDiaData` inalterado (leitura de código
      + typecheck, não precisa de prova ao vivo — é ausência de mudança)
- [x] **I4 — `corDoRegistro` continua pura e com 3 cores.** Confirmado por leitura — a opção A
      não tocou a função, só `buildResumos` (dedup) e o `<span>` da marca (fora do path)
- [x] **I5 — o trabalho da sessão continua legível numa boca cheia.** Provado pelo G5 na
      versão mais dura (teal vs. teal, não só coral vs. teal)
- [x] Nenhuma mudança de RLS, schema ou migration — confirmado no `git diff --stat` (G9)

## 7. Gates de aceite

- [x] **G1** — testado ao vivo 05/08 (paciente "marcos", histórico real de 24-30/07): abrir o
      Meu dia sem clicar em nada já mostra dente 14 "feito aqui" e dentes 16/22/23/35/37 "a
      fazer" (`aria-label` conferido) — inclusive nos dois casos com realizado+indicado
      misturado (23, 37), onde coral venceu corretamente
- [ ] **G2** — parcial: coral+teal simultâneos confirmados (G1). Slate (pré-existente) **não
      re-testado** — é caminho de `corDoRegistro`/`CROWN_FILL` que esta fatia não toca, e
      nenhum paciente de teste tinha evento `origem='preexistente']` sem inserir mais dado
      sintético (decidi não inserir mais — a fila de limpeza já está grande)
- [x] **G3** — testado ao vivo 05/08: dente 17 (endodontia indicado, persistido, autor
      "Mateus Teixeira", nunca no meu draft) abre o painel, mas o chip "Canal" fica **sem
      destaque** — computed style idêntico a "Coroa total" (nunca usado): `bg rgb(28,28,30)`,
      mesma borda, mesma cor. O painel não sabe que o evento existe, então não há como editar
- [x] **G4 (dedup, crítico)** — testado ao vivo 05/08: dente 46 tinha pendência "Canal"
      (`aria-label`: "a fazer"). Clicar "fazer hoje →" mudou pra **"feito aqui, alterado
      nesta consulta"** — dedup por id confirmado (rascunho venceu, coral→teal em 1 pintura
      só) E a marca de "mexido" confirmada no mesmo teste
- [x] **G5 (o risco, crítico)** — testado ao vivo 05/08, versão mais dura do que o gate
      pedia: não só "achar entre 19 dentes pintados" — **achar entre dois dentes da MESMA
      cor**. Dente 41 (canal registrado agora, teal) e dente 14 (implante+endo antigos do
      Mateus, também teal) comparados por `computed style`: só o 41 tem o `<span>` circular
      (`border-radius:50%`) no DOM. Testado com E sem o anel de seleção (clicando o dente pra
      desmarcar) — o ponto sobrevive à desseleção, só ele carrega o sinal
- [x] **G6 (I1)** — testado ao vivo 05/08 **com autorização explícita, Salvar real**: baseline
      30 eventos/8 fichas → depois **31 eventos/9 fichas** (+1 exato nos dois). Conferido
      qual evento entrou: só `{dente:41, tipo:endodontia, status:realizado}` — nenhuma
      duplicata dos 30 eventos persistidos. Ficha marcada "(apagar)" na observação
- [x] **G7** — testado ao vivo 05/08: botão mostra "Salvar" e `disabled:true` com a boca
      cheia (19 dentes pintados) e nenhum registro novo na sessão
- [x] **G8** — testado ao vivo 05/08 nos dois temas via `computed style` (não estimado):
      ponto é `rgb(47,156,133)` (`--color-teal`, igual nos dois temas) com borda
      `rgb(255,255,255)` em light / escura em dark — a borda de contorno sempre contrasta
      com o fundo do tema ativo
- [x] **G9** — `git diff --stat` conferido: sem `supabase/`, sem migration, sem
      `salvarVisitaMeuDia` na lista de arquivos tocados

## 8. Fora de escopo

- **A ficha do paciente (`FichasTab`) e o `/consulta`** — esta fatia é só o Meu dia. Se der
  certo, o R-42 (odontograma geral do paciente) herda o mecanismo
- **Editar evento persistido a partir do Meu dia** — deliberadamente fora (§3). O caminho é
  "fazer hoje →"
- **Filtro temporal / cursor no tempo** ("mostrar a boca como estava em DD/MM") — é o R-42
- **Paleta nova** — ver I4
- **Odontometria/detalhe de especialidade da camada persistida** — a camada é pintura, não
  formulário

# R-46 cockpit — contrato de implementação

> **CONTRATO** · anexo de [R-46-cockpit.md](R-46-cockpit.md) (spec aprovada 02/08)
> **Fonte visual:** [R-46-cockpit.html](../artefatos/R-46-cockpit.html) v2 `aprovado`
> **Modelo:** Sonnet 5 nas fatias mecânicas · Opus nas que tocam componente compartilhado
> **Escopo:** desktop. Responsividade é fatia posterior (P8).
>
> **v2 — reescrito 02/08 depois de revisão adversarial (4 lentes, 24 achados, 21 confirmados).**
> A v1 tinha buracos graves: mandava usar tokens que o projeto não usa, pedia dados que o
> servidor não devolve e declarava dependências erradas. O que mudou está no §8.

## 0. Fronteira — o que este contrato NÃO cobre

Só entra **layout e o servidor que o alimenta**. Fora: **upload/campo mágico organizando**
(R-46c — aqui só o espaço) · **modal de orçamento** (R-46h — aqui só o botão) ·
**preencher campos de especialidade** (R-49 — aqui só o container) · **tablet/celular** (P8).

⚠️ **Consequência:** enquanto o R-46h não existir, o CTA é **"Salvar"**. O rótulo
*"Salvar e gerar orçamento"* do artefato só vale quando aquele item entrar.

## 1. Tokens — usar os que o projeto usa DE VERDADE

⚠️ **O `CLAUDE.md` está desatualizado neste ponto.** Ele lista `bg-background · bg-card ·
text-foreground · text-muted-foreground`; medido no código: **`bg-card` 0 usos ·
`text-foreground` 0 · `text-muted-foreground` 0**. A família real é `surface` / `text-*`:

| Papel no artefato | **Usar no código** | Usos hoje |
|---|---|---|
| `--bg` (fundo da página) | `bg-bg` | — |
| `--surface` (card) | **`bg-surface`** | 777 |
| `--surface-alt` / `--inset` | **`bg-surface-alt`** | — |
| `--border` / `--border-soft` | **`border-border`** | 655 |
| `--text` | **`text-text-primary`** | 655 |
| `--text-2` | **`text-text-secondary`** | 1008 |
| `--text-3` (só decorativo) | `text-text-muted` | 30 |
| `--teal` (fill, borda, ponto) | `bg-teal` · `border-teal` | — |
| `--teal` **como texto** | **`text-teal-ink`** | 69 |
| `--coral` **como texto** | **`text-coral-ink`** | — |
| `--gold` → alerta clínico | `text-warning-ink` · `bg-warning-pale` | 8 |
| `--on-teal` (texto sobre teal sólido) | ver ⚠️ abaixo | — |

⚠️ **CTA:** `text-white` sobre `bg-teal` (`#2f9c85`) dá ~3.1:1 — **reprova AA** para texto de
14px. Usar `bg-teal-dark` (`#1e7060`) como fundo do CTA, ou texto ≥18px bold. **Medir antes.**

**Estados selecionados** (o artefato usa opacidade; o projeto tem token): `bg-teal/12` +
`border-teal/35` + `text-teal-ink`. Nunca hex solto.

## 2. O servidor primeiro — `get-meu-dia.ts` (fatia C0)

**Metade do cockpit pede dado que o servidor não devolve.** Isso não é apresentação; é a
fatia C0, e **nenhuma coluna funciona sem ela**.

| Zona | Precisa | Hoje |
|---|---|---|
| Histórico (`Histórico · 12`, N visitas + nota) | `visitas[]` | `ultimaVisita` — **1 visita**, sem nota, sem contador |
| Já feito (`Já feito · 8`, acumulado) | `jaFeito[]` | calculado e **descartado** (`:290` só é lido filtrado por data) |
| phead (`34 anos`) | idade | **não está na query** |
| Badge de alergia | alerta **tipado** | `alertas: string[]` — nada diz que é alergia |
| topbar (`5 de 8 · 1 sem registro`) | contagem | derivável de `slots`, **sem régua escrita** |

```typescript
export interface MeuDiaVisita {
  fichaId: string;
  data: string;                 // 'YYYY-MM-DD'
  dentistaNome: string;
  resumo: string;               // fallback atual, regra inalterada
  nota: string | null;          // 1ª linha de `anotacoes`, ≤160 chars; vazio → null
  eventos: MeuDiaEventoVisita[];
}

/** Acumulado clínico: 1 item por âncora vencedora com status 'realizado', histórico inteiro. */
export interface MeuDiaEventoFeito extends MeuDiaEventoVisita { registradoEm: string; }

export interface MeuDiaContexto {
  visitas: MeuDiaVisita[];      // SUBSTITUI ultimaVisita (consumidor único é contexto-coluna, que SAI)
  jaFeito: MeuDiaEventoFeito[]; // NOVO
  // …pendencias, orto, alertas: inalterados…
}
```

**Zero query nova** — os dois saem do que já é buscado:
- `visitas`: das `fichasRecentes` (`:211-217`), `select` ganha `id, anotacoes`. Ordem atual
  (`data_atendimento` desc, `created_at` desc) preservada. **Duas fichas na mesma data: os
  eventos entram só na primeira**, senão a lista duplica.
- `jaFeito`: o **mesmo** `vencedorPorAncora` (`:290`), mesmo ramo `status !== 'indicado'`,
  **sem** o filtro de data. O algoritmo do vencedor por âncora **não muda** (trava §2 da spec).

  ⚠️ **Emenda 03/08 ([R-55](R-55-historico-sem-perda-de-dado.md)):** essa trava vale só pro
  lado da **pendência**. Achado em produção — o mesmo vencedor único usado pro histórico
  colapsa ocorrências repetidas da mesma âncora (toda profilaxia/flúor/clareamento do paciente
  cai numa chave só, pra sempre) e apaga evento de visita antiga. Histórico e `jaFeito` passam
  a ler `eventosRaw` sem dedup — ver contrato do R-55.
- **Sem campo de contador.** O badge é `.length` — é isso que faz o G7 valer por construção.
  Contador separado foi um dos 3 achados confirmados do v1 (spec §5c).
- `semNadaAinda` vira `visitas.length === 0 && pendencias.length === 0 && !orto` — **a regra
  migra, não morre** (trava §2).

## 3. Medidas — do artefato (1440px), corrigidas na revisão

**Grid:** `320px | 1fr | 312px` · gap e padding da coluna `12px`.

| Peça | Altura | Padding | Raio | Fonte/peso |
|---|---|---|---|---|
| topbar / rail / phead | 46 / 129 / 62 | 12·16 | — | 14/400 |
| slot do rail | 104 (min 36) | 8·12 | 8 | — |
| badge de alergia | 36 | 8·12 | 8 | 12/**700** |
| **cabeçalho do bloco** | **36** | 8·12 | — | 11/700 uppercase, `tracking .08em` |
| contador · badge de status | 18 · auto | 0·4 · 2·8 | 4 | 11/700 · 11/600 |
| linha de visita | 78 | 8·0 | — | data 11/600 · evento 12/400 · nota 11 itálico |
| "ver mais" · "fazer hoje" · ghost | 36 | — · 8 · 8·12 | 4 | 11/600 · 11/700 · 11/600 |
| input typeahead | 39 (min 36) | 8·12 | 4 | 14/400 |
| opção do dropdown | 36 | 8·12 | — | 12/**400** (600 só no ativo) |
| **chip** | **36** | 8·12 | **999** | 12/**400** (600 só selecionado) |
| **dente** | ver ⚠️ | — | 4 | rótulo 11 mono |
| linha de pendência | 77 (min 36) | 8·0 | — | título 12/600 · "desde" 11 mono |
| **CTA** | **45 (min 44)** | 12·16 | 4 | 14/700 |
| campo mágico tela cheia | min 520 | — | — | textarea **16**/400, `max-width 90ch` |
| painel lateral do dente | auto (larg. **290**) | — | 8 | — |
| face (mapa oclusal) | 40 (min 36) | — | 4 | 12 mono |
⚠️ **Dente: NÃO fixar 34×46.** No artefato ele é **fluido** (`flex:1`, `max-width:34px`,
`aspect-ratio:19/26`) — é a fluidez que faz o §5.3 funcionar. O que vale como gate é o
**mínimo de 24px de largura** (WCAG 2.2 SC 2.5.8), não um valor exato. **E na tela real quem
desenha é o `Odontograma.tsx`, que tem geometria própria** — o placeholder do artefato define
só o espaço.

**Escala:** espaçamento `4/8/12/16/24` · raio `4` controle, `8` card, `999` pill · fonte
`11/12/14/16/20` · peso `400/600/700`. **Vale para o código novo.** Componentes reusados
(`Odontograma`, `ToothDetailPanel`, `Combobox`) têm escala própria e **não** entram no gate.

## 4. Árvore

```
src/server/dashboard/get-meu-dia.ts   MUDA  — §2 (fatia C0, pré-requisito de tudo)

src/app/dashboard/meu-dia/
  page.tsx                  MUDA  — grid de 3 zonas; preservar o `?ag=` (porta do R-46g)
  loading.tsx / error.tsx   MUDA  — skeleton e erro no shape de 3 colunas
  _components/
    cockpit-grid.tsx        NOVO  — 3 colunas + colapso da direita (§5.3)
    bloco-moldavel.tsx      NOVO  — acordeão (§5.1)
    historico-bloco.tsx     NOVO  — consome `visitas[]`
    a-fazer-bloco.tsx       NOVO  — pendências (de contexto-coluna)
    ja-feito-bloco.tsx      NOVO  — consome `jaFeito[]`
    nesta-sessao-bloco.tsx  NOVO  — o "Registros de hoje" que sai do centro (Z2)
    rail.tsx                MUDA  — drag (§5.2); mantém a saída pro atendimento (R-46g)
    meu-dia-client.tsx      MUDA  — orquestra zonas; dono do `eventosDraft` (§5.4)
    contexto-coluna.tsx     SAI   — vira 3 blocos; `ondeLabel`/`fmtData`/alertas/orto/
                                    "ver perfil" MIGRAM (não somem)
    registrar-painel.tsx    MUDA  — perde "Registros de hoje"; ganha o split do dente
    onde-seletor.tsx        INTOCADO — P13 adiado (§5.5); os chips de dente continuam aqui
    fdi-popover.tsx         INTOCADO
```

**Reuso — não recriar:** `Odontograma` · `ToothDetailPanel` (tem `tabelaContainer`) ·
`ToothGroupList` · `Combobox` · `DexLoader` · `salvarVisitaMeuDia`.
`CapturaLivreCard`/`useCapturaLivre` e os Forms de especialidade **não** entram nesta fatia
(§0) — só o espaço é reservado.

## 5. Comportamento

### 5.1 `BlocoMoldavel`
```typescript
export interface BlocoMoldavelProps {
  id: string;                      // chave do acordeão
  titulo: string;
  contador?: number;               // SEMPRE derivado da lista renderizada, nunca prop solta
  resumo?: React.ReactNode;        // visível só FECHADO
  aberto: boolean;                 // controlado — dono é a coluna
  onToggle: () => void;
  children: React.ReactNode;
}
```
- **1 aberto por coluna.** Estado na coluna (`useState<string|null>`).
- **Nasce aberto:** esquerda → `historico` · direita → `aFazer`.
- Fechado **não monta** o corpo. Se um dia o corpo virar formulário com rascunho, isso muda —
  hoje os 3 blocos são leitura.

### 5.2 Rail
Barra escondida (`scrollbar-width:none` + `::-webkit-scrollbar`), **não** removida — teclado
navega. `cursor:grab/grabbing`, `scroll-snap-type:x proximate`.
**Limiar de 5px:** `pointerdown` guarda a posição; `pointerup` a <5px é **clique**, acima é
**arraste** e o clique é suprimido. Sem isso o arraste engole a seleção do paciente.
Gradiente de "há mais" só quando `scrollWidth > clientWidth`.

### 5.3 Colapso da direita
Painel do dente aberto → coluna direita vira faixa fina e devolve **312px** ao centro.
Medido sem o colapso: dente a **22,8px** (reprova WCAG 2.2); com colapso, ~34px.
**Volta** ao fechar o painel — mesmo toque.

### 5.4 `eventosDraft` muda de dono — a trava tem que ir junto
Hoje o rascunho vive na `RegistrarPainel`, protegido por `key={agendamentoId}`. Com
"Nesta sessão" na direita, o dono sobe para `meu-dia-client`. **O `key` deixa de proteger.**
→ O reset por troca de paciente passa a ser **explícito**: `useEffect` limpando
`eventosDraft`, `denteAberto` e `textoVisita` quando `agendamentoId` muda. Sem isso, rascunho
de um paciente vaza para o próximo — perda/contaminação de dado clínico.

### 5.5 Múltipla seleção (P13) — fatia C5

**O defeito:** `computeToothState` (`Odontograma.tsx:61`) devolve `default` quando `clinico`,
e `clinico = resumo != null` (`:343`). O contorno de seleção (`:370`, `:375`) só existe em
`!clinico` — **dente com evento nunca mostra seleção**. Cicatriz disso no código:
`FichasTab.tsx:2282` faz `selectedTeeth={eventosVis.length > 0 ? [] : …}`.

**Correção ADITIVA** — o `<svg>` já tem `overflow:visible` (`:407`), então o anel é desenhado
por fora, em camada própria, sem tocar `crownFill`/`crownStroke`/`strokeW`:
1. `ToothSVGProps` (`:246`) ganha `selecionado?: boolean`, **independente** de `state`.
2. `ToothSVG` desenha o anel quando `selecionado`: `<rect>` envolvendo o dente, `fill="none"`,
   `stroke="var(--color-teal)"`, `strokeWidth={2}`, `pointerEvents:"none"`.
3. `renderArch` (`:746`) passa `selecionado={selectedTeeth.includes(num)}`.

**Seguro:** os outros consumidores passam `selectedTeeth={[]}` (`consulta-client:1010`,
`registrar-painel:310`) ou já usam seleção (`FichasTab:1843`) — com `[]` nenhum anel aparece.
É o que o R-30 Parte 7 já queria (`:349-355`: *"Selecionado ganha CONTORNO sólido"*).

**Fonte única do "onde":** nada de estado novo — manda o `OndeValor` que a `RegistrarPainel`
já tem. O odontograma lê (`selectedTeeth = onde?.tipo === 'dentes' ? onde.dentes : []`) e escreve:

```typescript
function onToothToggle(dente: number) {
  const sel = onde?.tipo === 'dentes' ? onde.dentes : [];
  if (!sel.includes(dente)) return onChange({ tipo: 'dentes', dentes: [...sel, dente] });
  if (sel.length === 1) return setDenteAberto(dente);          // aceso e sozinho → abre painel
  const resto = sel.filter((d) => d !== dente);                // 2+ acesos → só remove do lote
  onChange(resto.length > 0 ? { tipo: 'dentes', dentes: resto } : null);
}
```

**Invariante herdada** (`onde-seletor.tsx:4-6`): âncora é dente(s) **OU** região, nunca as duas
— selecionar dente limpa a região, e vice-versa.

### 5.6 Salvar — e as duas portas de ficha duplicada
```
handleSalvar()
  → salvarVisitaMeuDia(...)              // fecha agendamento + notifica (já existe)
  → se eventosFalharam: avisa e PARA     // R-46b2 I4
  → router.refresh()                     // OBRIGATÓRIO — sem ele a tela mostra dado velho
  → NÃO avança de paciente               // P7
```
⚠️ **Sem o auto-avanço, o dentista continua na tela com o rascunho salvo.** `salvarFicha` **não
é idempotente por agendamento** — segundo clique cria **2ª ficha**. Duas travas obrigatórias:
1. Após salvar, **limpar `eventosDraft`/`textoVisita`** e desabilitar o CTA até haver rascunho novo.
2. Slot já `completed` **com ficha hoje**: CTA nasce desabilitado, com "já registrado hoje".

## 6. Fatias

| # | Entrega | Depende |
|---|---|---|
| **C0** | `get-meu-dia.ts`: `visitas[]`, `jaFeito[]`, idade, alerta tipado (§2) | — |
| **C1** | Grid de 3 zonas + `BlocoMoldavel` + os 3 blocos + loading/error | C0 |
| **C2** | Rail arrastável + CTA **"Salvar"** (sem orçamento — §0) + travas do §5.6 | C1 |
| **C3** | Painel do dente ao lado + colapso da direita | C1 |
| **C4** | Campo mágico em tela cheia — **só o container** | C1 + R-46c |
| **C5** | Múltipla seleção P13: anel no `ToothSVG` + `onToothToggle` do §5.5 | C1 |

**C0 → C1 → (C2 ∥ C3 ∥ C5)** — as três são independentes entre si. C4 espera o R-46c.

⚠️ **C5 é a única fatia que toca componente compartilhado** (`Odontograma.tsx`, usado por
`consulta-client`, `FichasTab` e `OdontogramaComPainel`). Vai com **G16** (regressão nas 3
telas) e é a candidata natural a ir sozinha num commit.

## 7. Gates

**Visuais** — script rodado na tela real, 1440×900, **descontando o shell do dashboard**:
- [ ] **G1** — o cockpit cabe na viewport sem scroll da página. Medir `.cockpit` **dentro** da
      moldura real (shell + header da rota), não o artefato isolado.
- [ ] **G2** — zero reprovação WCAG AA, **compondo alfa sobre o fundo real** (o dashboard tem
      gradiente, não cor chapada). Falso alarme já aconteceu — ver §8.
- [ ] **G3** — clicáveis ≥36px **incluindo os que só existem após interação** (painel do dente,
      dropdown aberto, campo mágico expandido). Dente ≥24px.
- [ ] **G4** — código **novo** só usa a escala do §3; zero hex solto; zero `gray-*`.
      Componentes reusados estão fora.
- [ ] **G5** — light e dark: rodar G2 **nos dois temas** e anexar os dois números.
- [ ] **G6** — `text-warning-ink`/`bg-warning-pale` só no alerta de alergia.

**Comportamentais** — clicando, com prova de qual caminho rodou:
- [ ] **G7** — abrir um bloco fecha o outro da coluna; contador == itens renderizados.
- [ ] **G8** — arraste >5px não seleciona; clique <5px seleciona; **Tab/setas navegam**.
- [ ] **G9** — salvar **não** avança de paciente **e** histórico/pendências atualizam
      (prova do refresh: a pendência recém-fechada **some** da direita).
- [ ] **G10** — **2º clique no CTA não cria 2ª ficha** (contar linhas em `fichas` no banco).
- [ ] **G11** — slot já registrado hoje → CTA desabilitado.
- [ ] **G12** — trocar de paciente **zera** rascunho, dente aberto e texto (§5.4).
- [ ] **G13** — painel do dente aberto → direita colapsa → dente ≥24px → fechar **restaura**.
- [ ] **G14** — os 5 estados: dia vazio · dia todo atendido · paciente sem histórico ·
      carregando · erro. Cada um renderiza sem mentir (coluna vazia ≠ afirmação clínica).

**C5 — múltipla seleção:**
- [ ] **G16** — **regressão do componente compartilhado.** Abrir as 3 telas que usam o
      `Odontograma` (`/consulta/[id]`, perfil do paciente → Fichas, `OdontogramaComPainel`) e
      confirmar que **nada mudou visualmente** — as duas primeiras passam `selectedTeeth={[]}`,
      então não pode aparecer anel nenhum.
- [ ] **G17** — dente **com evento** (pintado) mostra o anel ao ser selecionado. É o defeito
      que a fatia existe pra corrigir; testar justamente no dente que já tem registro.
- [ ] **G18** — 1º toque acende · 2º toque com **1 aceso** abre o painel · 2º toque com **2+
      acesos** só remove do lote · remover o último limpa o "onde" (`null`).
- [ ] **G19** — selecionar dente **limpa** a região escolhida (e vice-versa) — invariante
      "âncora é dente(s) OU região" (`onde-seletor.tsx:4-6`).
- [ ] **G20** — o ternário defensivo de `FichasTab.tsx:2282`
      (`eventosVis.length > 0 ? [] : …`) foi **removido** e a seleção funciona lá também.

**No banco:**
- [ ] **G15** — regressão R-46b2 completa: 1 clique grava ficha `concluida` **+ eventos do
      odontograma** + fecha agendamento + cria notificação + **pendência puxada faz upsert
      (não duplica)**. Os 5 por query, não pela tela.
- [ ] **G21** — dentes selecionados pelo odontograma gravam a **âncora certa** (`nivel:'dente'`,
      um evento por dente) — conferir no banco, não na tela.

## 8. Histórico

**v2 corrigiu 21 achados de revisão adversarial** — os que mais custariam: tokens que o projeto
não usa (`bg-card` 0 usos) · `visitas[]`/`jaFeito[]` inexistentes no servidor · dependências
invertidas · as 2 portas de ficha duplicada. **C5 entrou** depois de medir o custo real (~12
linhas) em vez de estimar. **Executável a partir de C0.**
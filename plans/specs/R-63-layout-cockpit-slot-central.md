# R-63 — o cockpit do Meu dia pensado como dentista: slot central e colunas

> **SPEC** · fase **`aprovada`** — aprovada por ele 05/08. Execução começa pela F1.
> **Aberto:** 2026-08-05 · **Fechado:** —
> **Modelo:** Sonnet 5. As decisões ambíguas já foram tomadas (§3); resta lifting de estado e
> refactor de casca, com gates medíveis. Opus só se o F1.1 revelar acoplamento não previsto.
> **Sub-item de:** R-46 (Meu dia), o 🔵 ativo — mesmo padrão de C6/C7. Não disputa o slot único.
> **Nasce de:** conversa de 05/08 (pedido adiado da sessão #19). O §3 são palavras dele.
> **Referência visual:** [`artefatos/R-63-layout-meu-dia.html`](../artefatos/R-63-layout-meu-dia.html)
> — dente portado de `tooth-geometry.ts`, tabela de `endo-form.tsx`, orto de `orto-form.tsx`.
> Tokens no §9. **Nunca leia o HTML pro contexto** — abra no browser.
> **Relacionado:** [R-60](../ROADMAP.md) 🧊 — **não conflita**: R-63 decide *onde* o orto mora,
> R-60 *o que ele mostra* · R-46d D9/D11 (odontograma acender) é motion **diferente** daqui.

## 1. O problema (medido, não estimado)

`MAPA-MEU-DIA.md` §1 tinha medido o centro em 635px contra 441px de orçamento a 1440×900,
antes do C7 e da F1. **Esses números ficaram velhos.** Remedido ao vivo 05/08 (tarde), F1 já
no ar, mesmo viewport, paciente com 1 alerta:

| Estado do centro | Altura | vs. orçamento (até o dock, y=785) |
|---|---|---|
| Só o odontograma (linha de base) | **598px** | **estoura 124px** |
| Endo, tabela ocupando o slot | **567px** | cabe (folga 27px) |
| Orto ocupando o slot | **659px** | **estoura 42px** |

A troca condicional (§4.1) já ajuda — endo cabe hoje. Mas o achado que importa mais que o
número: **o próprio mapa**, não só o rodapé, já termina 26px dentro do território do dock —
dentes inferiores clicáveis ficam parcialmente cobertos, não só o botão Salvar. Rail e linha
do paciente vieram enxutos na remedição (137px e 30px) — não há gordura óbvia ali pra cortar.
Decisão do que fazer: §4.8.

Três defeitos motivaram a troca condicional e a direita híbrida (§4.1/§4.4), **já resolvidos
pela F1**: tabela nascia abaixo da dobra, orto empurrava em vez de ocupar, e as 3 colunas
tinham o mesmo peso visual (violava o G-densidade do mapa §7.5 — hoje eram 3 containers na
direita e 3 na esquerda).

## 2. Trava de segurança — o que este item NÃO pode mudar

Por padrão: **apresentação muda, o resto não.** Explicitamente intocados:

| Intocado | Por quê |
|---|---|
| `salvarVisitaMeuDia` · `salvarEventosOdontograma` · RPC 107/109 | Zero mudança de caminho de escrita. Nenhuma migration |
| `buildResumos` · `corDoRegistro` · `CROWN_FILL` · `eventosPersistidos` | R-61 fechou 05/08 com 8/9 gates. Não se mexe no que acabou de ser provado |
| `dedupEventosDraft` · `casar-procedimento-local.ts` | R-46d D0 e R-62. Nada de match ou dedup entra aqui |
| Filtro autoral de "A fazer" (`responsavelPassaFiltro`, R-52) | Muda de acordeão pra aba. A **regra** de quem aparece não muda |
| Gramática de cor (mapa §7.1) | Elemento novo **não ganha cor**. Slot usa neutro + posição |
| `ToothDetailPanel` pros outros 3 consumidores | `FichasTab`, `consulta-client`, `OdontogramaComPainel` não podem regredir (§5 I3) |

## 3. O que ele quer — decisões desta conversa (05/08)

Seção dele. Registrada com as palavras que ele usou, não parafraseada:

| # | Decisão | Palavras dele |
|---|---|---|
| D1 | Os **dois** momentos de uso valem | *"os dois, por isso mantemos a voz e também um acesso rápido pra montar fichas ou concluir procedimentos… trazer em uma tela tudo que o dentista precisa"* |
| D2 | **Chairside = nada** ganha tamanho de distância | *"o que precisa ser visto quando tiver longe, nada"* |
| D3 | Procedimento precisa **expandir com detalhe** | *"seria interessante expandir os procedimentos pra ficar mais detalhado, principalmente se tiver uma tabela de input"* |
| D4 | Direita **híbrida** — perfil do dente fixo + abas | escolhido no picker de 4 opções |
| D5 | Troca **condicional** + gatilho de volta | *"fica o trigger de fechou o perfil do dente a tabela some, e o odontograma só some se tiver um evento que ele precisa, assim como a manutenção orto"* |
| D6 | Ditado **devolve o mapa** | *"o ditado devolve o mapa"* |
| D7 | Motion leve na troca | *"coloque uma animação leve nessa parte"* |

**Decisão revogada, com consentimento informado:** D4 mata a liberdade de *"deixar quantos
blocos quiser abertos ao mesmo tempo"* (pedido dele ao vivo em 04/08, hoje em
[`meu-dia-client.tsx:109-113`](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx:109)).
O custo foi declarado no picker antes da escolha. **Aba = 1 por vez, por construção.**

## 4. Contrato

### 4.1 O slot central — 1 ocupante por vez

Hoje o centro empilha `Odontograma` **e** (quando há dente) o `tabelaContainer`, **e** (quando
o chip está aberto) o `OrtoForm`. Passa a existir **um slot** que renderiza exatamente um:

```ts
/** Derivado — NUNCA estado novo persistido (§5 I2). */
type SlotCentral =
  | { tipo: 'mapa' }                          // <Odontograma> — o default
  | { tipo: 'detalhe'; dente: number }        // portal do ToothDetailPanel (tabela de especialidade)
  | { tipo: 'orto' };                         // <OrtoForm>

function slotCentral(
  denteAberto: number | null,
  detalheEspecialidadeAberto: boolean,
  ortoChipAberto: boolean,
): SlotCentral {
  if (ortoChipAberto) return { tipo: 'orto' };
  if (denteAberto != null && detalheEspecialidadeAberto) return { tipo: 'detalhe', dente: denteAberto };
  return { tipo: 'mapa' };
}
```

**A troca é condicional (D5).** O mapa só cede o lugar pra conteúdo que precisa do espaço **e**
não usa o mapa pra nada:

| Ocupante | Troca? | Frequência |
|---|---|---|
| Tabela de especialidade aberta (endo, implante) | **sim** | 2 de 17 tipos |
| Manutenção ortodôntica (`ortoChipAberto`) | **sim** | contextual |
| Qualquer outro procedimento (restauração, selante, exodontia…) | **não** — perfil abre na direita, mapa fica | 15 de 17 tipos |
| Linhas de evento + observação, sem tabela aberta | **não** — continuam empilhando abaixo do mapa, como hoje | — |

> **É a condicional que salva a proposta.** Sem ela, todo procedimento pagaria o custo de
> esconder o mapa, e a régua do projeto (3 gestos por registro, *"nada pode piorá-lo"*)
> reprovaria o item inteiro. Com ela, a troca deixa de ser regra e vira exceção.

### 4.2 Gatilhos de volta (D5)

| Gesto | Efeito |
|---|---|
| `✕` no perfil do dente | fecha o perfil **e** a tabela — `denteAberto = null`, slot volta pro mapa |
| `‹ voltar ao mapa` (cabeçalho do slot) | fecha **só** a tabela — perfil continua aberto |
| Clicar um dente no mapa | seleciona e abre o perfil; **slot continua no mapa** (dente novo nasce sem tabela) |
| Fechar o chip de orto | slot volta pro mapa |

### 4.3 Ditado devolve o mapa — versão estreita (D6)

`registrar()` passa a devolver o mapa **só quando há confirmação real a dar**:

```ts
/** true → fecha o ocupante do slot e volta pro mapa. */
function ditadoDevolveMapa(slot: SlotCentral, ancoras: AncoraClinica[]): boolean {
  if (slot.tipo === 'mapa') return false;                       // nada a devolver
  // Só âncora que PINTA dente conta: buildResumos indexa por dente, então
  // boca/arcada/quadrante não produzem resumo nenhum — devolver seria trocar a tela por nada.
  const dentes = ancoras.filter(a => a.nivel === 'dente' || a.nivel === 'face')
                        .map(a => a.dente).filter((d): d is number => d != null);
  if (dentes.length === 0) return false;
  if (slot.tipo === 'orto') return true;                        // orto não tem dente
  return dentes.some(d => d !== slot.dente);                    // dente DIFERENTE
}
```

Os 3 casos, todos já demonstrados no artefato:

| Com a tabela do 36 aberta, o dentista dita… | Resultado | Por quê |
|---|---|---|
| "restauração no 24" | mapa volta, 24 selecionado e pintado | há o que confirmar |
| algo no próprio 36 | **tabela fica** | arrancar a tabela por nada, no meio do preenchimento |
| "profilaxia" (nível boca) | **tabela fica** | nível boca nunca pinta dente (D5 do R-06-07) |

### 4.4 Direita híbrida (D4)

Card do dente **fixo** no topo (não é acordeão — `painelDenteAberto` MORRE, o ✕ já fecha).
Abaixo, **1** card de abas (`A fazer` / `Novos` / futuro `Orçamento`) — 36px de cromo no
lugar de N cabeçalhos. `aFazerAberto` / `novosProcedimentosAberto` / `painelDenteAberto` saem;
entra `abaDireita: 'afazer' | 'novos'`. Contador vai na aba, **sempre `lista.length`** do que
é renderizado (§5.1 do contrato do cockpit segue valendo por construção).

**Honestidade sobre o ganho:** com os 3 blocos de hoje o híbrido economiza **0px** (medido:
562px nos dois layouts). Ele não é economia agora — é o que impede a direita de explodir
quando Orçamento (R-46h), Retorno e Orto entrarem: o mapa projetou **252px só de cromo** no
cenário de 7 blocos.

### 4.5 Esquerda em abas — decisão minha, confirmada por ele em 06/08

`Histórico` · `Hoje` (concluídos) · `Anexos`. Mesma mecânica da direita. **Medido: −98px**
(373 → 275). Não foi pedido por ele originalmente (04/08) — perguntado antes de F2 começar
(06/08), confirmou "abas nas duas colunas".

### 4.6 Rodapé de ação + o fix de AA

Mapa §7.3: orçamento e retorno são **ações terminais**, não blocos. Uma linha no pé do centro,
**exatamente 1 primário** (mapa §7.5, G-primário) e o resto ghost.

O CTA muda de `bg-teal` + `text-white` (**3.38:1 — reprova AA**, D6 do mapa, avisado por
escrito no §7.4 e nunca feito) pra `bg-teal-dark`. **Medido no artefato: 5.93:1** nos dois
temas.

### 4.7 Motion (D7)

`AnimatePresence mode="wait"` no slot, **180ms `ease-out`**, opacidade + 6px de deslocamento.

**Não anima altura, de propósito:** mapa e ocupante têm alturas diferentes, e animar o colapso
de ~300px é exatamente onde motion vira *percebida* em vez de *sentida* (CLAUDE.md). Só o
conteúdo do slot faz crossfade; o reflow do que está abaixo é instantâneo.
`useReducedMotion()` da Motion desliga tudo — o projeto não trata `prefers-reduced-motion` em
lugar nenhum hoje, e este é o primeiro.

### 4.8 Estouro vertical: página inteira rola, sem mecanismo novo (decisão de 05/08, tarde)

**Tentado e revogado no mesmo dia.** Primeira decisão foi scroll interno só no centro
(`overflow-y-auto` + teto medido via `getBoundingClientRect`/`--dock-inset`, recalculado por
`ResizeObserver`) — codado, testado ao vivo, os 3 gates passaram. Ele testou na tela e voltou
atrás: *"exclua o scroll dentro do card do odontograma, qualquer coisa o dentista rola a
página inteira do jeito que tava, tava sensacional."* Scroll aninhado (um dentro do outro)
lê pior na prática do que qualquer medição prevê — é exatamente o tipo de coisa que só se
descobre usando, não lendo spec. Revertido, zero resíduo no código.

**Decisão final: nenhum mecanismo novo.** A página já rola inteira quando o conteúdo excede
o viewport — sempre rolou, é o comportamento padrão do browser. O G1 do contrato do cockpit
("cabe na viewport sem scroll") fica formalmente relaxado: **rolar a página é aceito**, não é
mais defeito. Cortar o odontograma pra evitar isso continua descartado (zoom reduzido o
bastante deixa o incisivo lateral com ~16px de alvo — pior que rolar).

## 5. Invariantes

| # | Invariante | Por que é invariante |
|---|---|---|
| **I1** | O slot **nunca** muda o que `Salvar` grava | Troca é apresentação. Salvar com a tabela aberta grava exatamente o mesmo que com ela fechada |
| **I2** | Zero estado novo persistido — o slot é **derivado** de 3 estados que já existem | Mesmo princípio de `emAndamento` (R-51) e `semPendencia` (R-58): não criar 3º status por acidente |
| **I3** | `ToothDetailPanel` continua idêntico pros outros 3 consumidores | `FichasTab`, `consulta-client` e `OdontogramaComPainel` montam ele. A prop nova é **opcional**, e ausente = comportamento de hoje |
| **I4** | Evento que pinta dente **nunca** nasce sem o mapa poder confirmá-lo | É o que o R-61 entregou 05/08; esconder o mapa na hora de registrar desfaria isso |
| **I5** | Nenhum evento é criado, alterado ou removido por causa da troca | A troca lê estado, não escreve |

## 6. Fases

### F1 — o slot central *(o item de verdade)*
`registrar-painel.tsx` · `ToothDetailPanel.tsx` · `meu-dia-client.tsx`

1. **Lifting do `detalheAbertoIdx`.** Hoje é `useState` local do `ToothDetailPanel`
   ([linha 142](../../src/components/odontograma/ToothDetailPanel.tsx:142)). Ganha prop
   opcional `onDetalheAbertoChange?: (aberto: boolean) => void` — ausente = comportamento de
   hoje (I3). É o único ponto com risco de acoplamento não previsto.
2. Slot em `registrar-painel.tsx` substituindo `<Odontograma>` + `tabelaContainer` + o
   `OrtoForm` da faixa. `ortoChipAberto` sai da faixa e vira ocupante.
3. `ditadoDevolveMapa` dentro de `registrar()` (§4.3).
4. Rodapé de ação + CTA `bg-teal-dark` (§4.6 — mesma linha, não vale separar).
5. Motion (§4.7).

### F2 — as colunas
`meu-dia-client.tsx` · `bloco-moldavel.tsx` · os 4 blocos consumidores

Casca de abas substitui `BlocoMoldavel` nas duas colunas. `BlocoMoldavel` tem **6 consumidores,
todos dentro de `meu-dia/_components`** — nenhum fora. Se sobrar órfão depois, deleta (mesmo
tratamento de `combobox.tsx` no R-62); se ainda tiver uso, fica. **Não prometo a deleção aqui.**

### F3 — o resto do §7.4 do mapa *(candidato a `/pontual`, o mapa diz que não precisa de spec)*
Varredura de token restante + piso de 36px nos controles que sobraram (tabs do odontograma,
"Legenda", "ver mais" do histórico — os outros morreram com o R-46d D12).

**Fechada 06/08.** Token: `text-teal`→`-ink` em 4 chips do `registrar-painel.tsx` (catálogo,
Status, orto, "+ texto da visita") e 2 no `Odontograma.tsx` (tab ativa, "Legenda" ativa) —
`registrar-painel.tsx` calculado 3.38:1 → 5.93:1. Badge de contador do odontograma (branco
sobre teal cheio) trocado pra `teal-dark`, mesmo fix do CTA. Piso de 36px: **achado ao vivo,
não no papel** — o wrapper `compact` do `Odontograma` (`zoom: 0.85`) faz `h-9` (36px de CSS)
medir **30.6px de verdade** via `getBoundingClientRect()`. Fix: altura condicional a
`compact` (já em escopo no componente) — `h-11` (44px CSS → 37.4px renderizado) só quando
`compact`, senão `h-9` normal (36px reais, sem zoom) — protege os outros 3 consumidores do
`Odontograma` (`FichasTab`, `/consulta`, `OdontogramaComPainel`) de ganhar 44px à toa. `ver
mais` do histórico (fora do zoom) só precisou de `h-9`. Chips ONDE/STATUS/orto/"+texto"
**não foram redimensionados** — o texto original do mapa dizia que
"morrem com R-46d D12", o que não se confirmou (R-62 os reintroduziu como faixa sempre
visível), mas a spec só nomeia os 3 controles acima pro piso de 36px; redimensionar os chips
seria escopo novo, não "resto do §7.4" — decisão de manter o escopo literal da spec.

## 7. Gates de aceite

**F1**

| # | Gate | Como verifico |
|---|---|---|
| G1 | Dente **sem** tabela → mapa fica | Selecionar dente com restauração; `.odo` presente no DOM |
| G2 | `Detalhes ›` em endo → mapa sai, tabela ocupa | `.odo` ausente; altura do centro **≤ 790px** a 1440×900 (era 1051) |
| G3 | Chip de orto → mapa sai, `OrtoForm` ocupa | `.odo` ausente; altura do centro **≤ 710px** (era 977) |
| G4 | `✕` do perfil → mapa volta **e** perfil some | `denteAberto === null` + `.odo` presente |
| G5 | `‹ voltar` → mapa volta, perfil **fica** | `.odo` presente + card do dente ainda montado |
| G6 | Ditar dente **diferente** com tabela aberta → mapa volta, dente novo selecionado e pintado | Sobrescrever `window.fetch`? Não — usar o chip local (R-62, zero rede). Conferir `computed style` do dente novo |
| G7 | Ditar **mesmo** dente → tabela fica | `.detalhe` ainda montado |
| G8 | Ditar **profilaxia** (nível boca) → tabela fica | idem, e o evento existe no rascunho |
| G9 | **Salvar não muda** — com a tabela aberta grava o mesmo | Salvar real autorizado; contar linhas antes/depois em `odontograma_eventos` (+N exato) e conferir `detalhe` jsonb gravado |
| G10 | Motion: 180ms, e **nada** com `prefers-reduced-motion` | `getComputedStyle().animationDuration`; emular a media query no browser |
| G11 | `FichasTab` e `/consulta` não regridem | Abrir os dois, abrir tabela de endo, conferir que ela renderiza inline como hoje (I3) |

**F2**

| # | Gate | Como verifico |
|---|---|---|
| G12 | Direita = perfil fixo + **1** card de abas; nunca 2 corpos visíveis | Contar containers de 1º nível na coluna = 2 (perfil + abas) |
| G13 | Trocar de paciente reseta aba e fecha o perfil | Clicar outro slot do rail; conferir aba default e `denteAberto === null` |
| G14 | Contador da aba = `length` da lista renderizada | Comparar badge com nº de linhas no DOM |
| G15 | `BlocoMoldavel` órfão → deletado, ou uso restante justificado por escrito | `grep` + `npm run build` |

**F3**

| # | Gate | Como verifico |
|---|---|---|
| G16 | CTA ≥ 4.5:1 nos **dois** temas | Cálculo de contraste no `computed style` (já dá 5.93:1 no artefato) |
| G17 | Nenhum controle da coluna central < 36px | Medir `getBoundingClientRect().height` de todo `button` do centro |

## 8. Fora de escopo — e o maior deles não está resolvido

| O quê | Por quê fica de fora |
|---|---|
| Responsivo / mobile (C8) | Nunca verificado no cockpit. Item próprio |
| Mais tipos ganharem tabela de input | É o **R-49**, spec madura na fila |
| Orto com interface própria e controle de recorrência | É o **R-60** 🧊 — este item só decide **onde** ele mora |
| Motion do odontograma acender ao ditar | R-46d **D9/D11**, seguem pendentes |

**Descartadas, medidas:** **B** (índice dos 32 dentes, célula 22px, abaixo do piso D5) · **C**
(mapa zoom .55, incisivo lateral **16px** — pior que a B). **A** (escolhida) ficou menor que as duas.

## 9. Referência visual — tokens em texto

Do `globals.css`, medidos no artefato. **A implementação segue estes valores, não o HTML.**

| Token | Light | Dark |
|---|---|---|
| `--color-surface` | `#ffffff` | `#111112` |
| `--color-surface-alt` | `#dadade` | `#1c1c1e` |
| `--color-border` | `#c2c2c6` | `#27272a` |
| `--color-text-primary` | `#09090b` | `#fafafa` |
| `--color-text-secondary` | `#4b5563` | `#a1a1aa` |
| `--color-teal` / `-dark` | `#2f9c85` / `#1e7060` | idem |
| `--color-coral` / `--color-slate` | `#e57373` / `#64748b` | `#ef9a9a` / `#94a3b8` |

**Medidas:** grid `320px | minmax(0,1fr) | 312px`, gap 12px · cabeçalho de aba **36px** ·
card `rounded-2xl` (16px) · painel central `p-5` · odontograma `zoom .85`.

**F2 — abas (extraído do artefato por JS, 05/08, estilo underline — não o pill de
`ui/tabs.tsx` default):**

```css
.tabbar        { display:flex; border-bottom:1px solid var(--color-border); }
.tabbar button { flex:1; min-width:0; background:transparent; border:0; height:36px;
                 font-size:11px; font-weight:700; color:var(--color-text-secondary);
                 padding:0 6px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
.tabbar button[ativo]        { color:var(--color-teal-ink); }
.tabbar button[ativo]::after { content:''; position:absolute; left:6px; right:6px; bottom:0;
                                height:2px; border-radius:2px 2px 0 0; background:var(--color-teal); }
.badge { margin-left:4px; font-family:var(--font-mono); font-size:10px; padding:1px 5px;
         border-radius:99px; background:var(--color-surface-alt); color:var(--color-text-secondary); }
```

Card externo = mesmo `.card` (rounded-2xl, border-border, bg-surface) de sempre; corpo da
aba ativa `padding: 10px 12px 12px`. **Badge sempre visível, mesmo em 0** (Novos: 0 aparece).
Sem nuance `destaque` (teal no título) — uniforme em todas as abas, o artefato não distingue.
**Rótulos da aba ≠ título antigo do acordeão:** "Hoje" (não "Concluídos hoje"), "Anexos"
(não "Anexar documentos"). Direita ganha 3ª aba "Orçamento" **no artefato só** — não constrói
agora (R-46h não existe ainda).

**Fontes:** Outfit (sans) · DM Mono (mono, números clínicos e tabulares).

⚠️ **`globals.css` reescreve os micro-tamanhos** (`@layer utilities`): `text-[9px]`→**10px** ·
`text-[10px]`→**11px** · `text-[11px]`→**12px**. Quem calcular altura no papel sem isso erra.

# R-46 — Redesign: Meu dia vira cockpit em tela cheia

> **SPEC (redesign)** · sub-item do **R-46** · ✅ no ar e verificado; registro histórico
> **Aberto:** 2026-08-02 · **Fechado:** — · **Fase:** **aprovada** (02/08 — *"assim fechamos
> tudo"*, depois de 6 rodadas de ajuste sobre o artefato)
> **Modelo:** Opus 5 (decisão de layout ambígua, sem contrato de dados novo)
> **Artefato:** [R-46-cockpit.html](../artefatos/R-46-cockpit.html) — **v2, `aprovado`**.
> **Escopo desta spec:** **desktop apenas.** Responsividade (tablet/celular) é fatia posterior,
> por decisão dele (P8).
> **→ O "como" mora em [R-46-cockpit-contrato.md](R-46-cockpit-contrato.md)**: tradução de
> tokens, medidas extraídas do artefato, árvore de componentes, comportamento, 4 fatias de
> execução e 15 gates. O preenchimento dos campos saiu para
> **[R-49](R-49-voz-e-campos-de-especialidade.md)** — os dois recortes nasceram do teto de 300 linhas.

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Meu dia (o novo modo consulta) |
| **Tipo** | redesign de tela existente |
| **Rota** | `/dashboard/meu-dia` |
| **Arquivos envolvidos** | `page.tsx` · `_components/{rail,meu-dia-client,contexto-coluna,onde-seletor,fdi-popover,registrar-painel}.tsx` · `actions.ts` · `loading.tsx` · `error.tsx` · `src/server/dashboard/get-meu-dia.ts` |

## 1. Estado atual (inventário read-only, 02/08)

**Hoje é uma coluna única empilhada** (`meu-dia-client.tsx:54`): `Rail` → `ContextoColuna`
(última visita + pendências + orto no MESMO bloco) → `RegistrarPainel`. Upload de histórico e
voz **não existem** na tela atual.

**O que a implementação precisa saber (acoplamento real, não cosmético):**
- `ContextoColuna` **quebra em pedaços**: última visita → esquerda · pendências → direita ·
  orto → estado contínuo (nem um nem outro).
- `podeAtender()` (`rail.tsx:36`) é regra de negócio morando em componente visual, reimportada
  por `meu-dia-client.tsx`. `semNadaAinda` (`contexto-coluna.tsx:64`) e `semRegistro`
  (`rail.tsx:59`) são classificação calculada inline no JSX.
- `avancarProximo()` (`meu-dia-client.tsx:46-51`) mistura 3 coisas — ver ⚠️ do P7.
- `get-meu-dia.ts` é a exceção limpa: server puro, isolado.
- **5 estados hoje, em 5 lugares diferentes:** loading de rota · erro de rota · dia sem
  agendamento (`rail.tsx:47-53`) · dia todo atendido (`meu-dia-client.tsx:72-77`) · paciente
  sem histórico (`contexto-coluna.tsx:92-95`). O redesign ainda **não** decidiu unificar.

**Paleta atual (a converter na implementação):** `bg-surface`/`bg-surface-alt` · `border-border` ·
`text-text-primary`/`text-text-secondary` · `teal` como única cor de marca · `coral` para erro ·
`amber-500` só no badge de alergia. `font-mono` para todo dado posicional — padrão deliberado,
**preservar**.

## 2. O que NÃO pode mudar — trava de segurança

- [x] Nomes de campos e variáveis do domínio (`OndeValor`, `OdontogramaEventoDraft`, etc.)
- [x] `podeAtender`, `semNadaAinda`, o algoritmo "vencedor por âncora" (`get-meu-dia.ts`) —
      **emenda 03/08 ([R-55](R-55-historico-sem-perda-de-dado.md)):** a trava vale só pro lado
      da pendência. Histórico e acumulado ("Já feito") saem dela — o vencedor único escondia
      procedimento repetido (achado real em produção)
- [x] `salvarVisitaMeuDia` / `salvarFicha` — contrato e efeitos (fecha agendamento + notifica)
- [x] Estrutura do banco / RLS
- [x] `key={agendamentoId}` remontando o painel ao trocar de atendimento (evita herdar
      rascunho de outro paciente)
- [x] `router.refresh()` pós-save — ver ⚠️ do P7. Sai o auto-avanço, **não** o refresh

**Muda por decisão explícita dele (fora do default "só apresentação"):**
- **Fluxo de navegação** — o auto-avanço pro próximo paciente sai (P7).
- **Capacidade nova**, cada uma com item próprio: orçamento no cockpit (R-46h) · upload do
  histórico (R-46c) · preenchimento por texto/voz (R-49). Esta spec define **onde na tela**
  cada uma mora; o contrato de cada uma vive na spec dela.

> Default para todo o resto: **apresentação muda, o resto não.**

## 3. O que ele quer — decisões das 6 rodadas de 02/08

> Ditado por ele e transcrito na hora. **Aprovado visualmente em 02/08** ("assim fechamos tudo").

**São 3 zonas, não 4** — a voz deixou de ser zona própria: *"a voz pode ficar já dentro do
campo mágico"*. **Esquerda** histórico + campo mágico · **Centro** ficha rápida
(*"majoritariamente"*) · **Direita** em aberto em cima, procedimentos embaixo.

| # | Decisão dele | Como ficou |
|---|---|---|
| **P1** | Histórico expande **sem sair da aba** | Bloco com contador + rolagem interna; "ver as 12 visitas aqui mesmo" |
| **P2** | *"Diminuir a scrollagem — tudo numa tela"* | **Acordeão: 1 bloco aberto por vez por coluna.** Medido: 1033px → **757px** |
| **P3** | Sem histórico, o campo mágico **abre sozinho** | Assume a coluna + **2 destinos** ("visita de hoje" × "histórico antigo + data") |
| **P4** | *"Os outros eventos têm que caber — a tela tem que ser moldável"* | Tabelas de especialidade no centro, por detecção determinística (§5a) |
| **P5** | Campo mágico abre em **tela cheia** | Linha de ~90 caracteres a 16px (medido: 776px). Ele cogitou mostrar histórico junto e descartou |
| **P6** | Rail **arrasta pro lado**, sem barra | `cursor:grab` + `scroll-snap` + barra escondida. **Implementação:** limiar de ~5px pra não engolir o clique no slot |
| **P7** | CTA vira **"Salvar e gerar orçamento"**; auto-avanço sai | Ver ⚠️ abaixo |
| **P8** | **iPad sai do caminho crítico** | *"Primeiro vamos fazer funcionar no PC."* Responsividade vira fatia posterior |
| **P9** | Orçamento é **opcional pelo cancelar** | A ficha já foi salva antes do modal abrir; cancelar descarta só o orçamento. Sem estado desabilitado |
| **P10** | Odontograma é **o do sistema** | `ToothSVG` anatômico (`Odontograma.tsx`); o do artefato é **placeholder de layout**. `RegistrarPainel` já o usa (`compact hideFilters`) |
| **P11** | Perfil do dente: 5 faces + 9 chips + tabela por portal | Tudo já existe em `ToothDetailPanel.tsx` (870 ln) — ver §5a |
| **P12** | Painel do dente abre **AO LADO**, não embaixo | ✅ **com condição medida** — ver §5b |
| **P13** | Múltipla seleção: **opção B aprovada e ENTRA** (fatia C5) | Toque seleciona; toque no já-selecionado abre o painel **só com 1 dente aceso** — com 2+, só remove do lote. Exige um anel de seleção no `ToothSVG` porque hoje dente com evento ignora `selectedTeeth` (`:61`+`:343`): **~12 linhas aditivas**, sem alterar o visual existente ([contrato §5.5](R-46-cockpit-contrato.md)) |

⚠️ **P7 — o que NÃO pode sair junto.** `avancarProximo()` (`meu-dia-client.tsx:46-51`) faz
**duas** coisas: `setSelecionadoId()` **e** `router.refresh()`. Tirar o auto-avanço é a decisão
dele; **tirar o refresh seria bug** — é ele que recarrega o histórico e some com a pendência
recém-fechada. O fechamento do agendamento e a notificação **não** dependem disso: vêm do
`salvarFicha` com `origem='modo_consulta'`.

⚠️ **P7 — invariante a preservar (R-46b2 I4):** se `eventosFalharam`, o fluxo **para** e mostra
o aviso. O modal de orçamento **não pode** abrir por cima dele.

### Ambiguidades que o artefato tem que resolver mostrando

| # | Tensão | Por quê importa |
|---|---|---|
| **Z1** | "O que já foi feito" está na **direita** (parte 2 dela), mas "histórico" está na **esquerda**. Ou são coisas diferentes (esquerda = visitas passadas · direita = procedimentos já feitos, como estado clínico acumulado), ou há duplicação | Se for duplicação, uma das duas sai. O artefato desenha a leitura "esquerda = linha do tempo · direita = estado clínico por procedimento" e ele confirma |
| **Z2** | "Adicionado nesta sessão" na direita é hoje o bloco *"Registros de hoje · N"* que vive no **centro** (v6 e o código atual). Se migra pra direita, o centro vira só entrada e a conferência acontece ao lado | Separa o gesto de registrar do de conferir. Pode ficar mais limpo ou fazer o olho viajar — só vendo |
| **Z3** | **Onde fica o odontograma.** Peça grande, hoje no centro (v6: colapsável "nasce fechado"). Não foi mencionado | Se a direita virar "procedimentos", o odontograma pode ser a cabeça dela — ou continua no centro |
| **Z4** | As **propostas do Dex** (✓ uma a uma) nasciam no centro no v6. Com a voz na esquerda, elas aparecem onde? | Proposta vira registro; registro é centro. Provável que a voz capte na esquerda e proponha no centro |

## 4. Tokens — fonte única da verdade

Extraídos por JS dos 3 artefatos do R-46 (`artefato-visual`, 02/08) — **os três usam a
mesma paleta**, então ela é a base do cockpit sem conversão nenhuma.

| Token | Valor | Papel |
|---|---|---|
| `--bg` | `#0D1013` | fundo da página |
| `--surface` | `#14181B` | card |
| `--surface-alt` | `#1A1F23` | card elevado / hover |
| `--inset` | `#171C1F` | campo embutido (input, textarea) |
| `--border` | `#242B30` | borda padrão |
| `--border-soft` | `#1E2429` | divisória interna |
| `--text` | `#E9EDEF` | texto primário |
| `--text-2` | `#97A1A8` | secundário |
| `--text-3` | `#6E7A82` | terciário / kicker |
| `--teal` | `#2FBFAD` | marca, ação, seleção |
| `--teal-dim` / `--teal-line` | `rgba(47,191,173,.12)` / `.35` | fundo e borda do estado ativo |
| `--coral` | `#F0705F` | erro / alerta forte |
| `--coral-dim` / `--coral-line` | `rgba(240,112,95,.12)` / `.4` | idem |
| `--gold` | `#D9A441` | atenção clínica (alergia) |
| `--gold-dim` / `--gold-line` | `rgba(217,164,65,.12)` / `.4` | idem |
| `--sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | corpo e títulos |
| `--mono` | `"DM Mono", ui-monospace, "Cascadia Mono", Consolas, monospace` | **todo dado posicional** — dente, horário, "onde", medida |

⚠️ **Os artefatos são dark-only.** O produto exige dark **e** light impecáveis (CLAUDE.md).
A conversão pros tokens reais (`bg-surface`, `text-text-primary`, `border-border`…) acontece
na implementação — o artefato não precisa provar o light, mas a spec registra que ele falta.

### O que cada artefato antigo contribui (extração de 02/08)

| Artefato | O que é | Destino |
|---|---|---|
| `R-46-ficha-dia.html` (v6) | **O layout de tela.** Grid `duo` = 350px (contexto) + 764px (registro) · topbar · rail horizontal de slots (`done`/`warn`/`now`/`next`) · `phead` com badges (alergia, orto ativo, endo em curso) · 6 zonas empilhadas na direita: Orto · **Registrar** (typeahead + chips Onde + Status + popover FDI) · Dex propostas (✓/✕ um a um) · **Registros de hoje agrupados por dente** · Odontograma + perfil do dente · Texto da visita · rodapé com ghost buttons + CTA "Salvar e chamar próximo → {próximo}" | **É a base real do cockpit.** As 6 zonas se redistribuem nas 3 colunas novas |
| `R-46-ficha-estado-evento.html` | **Doutrina, não layout** — modelo estado × evento, "o que o desenho se proíbe" (herdar evento; nada pré-marcado), contagem de gestos | Já virou §2 (D1–D14) da spec-mãe. **Nada a unificar** — arquivar |
| `R-46-orto-grade-tratamento.html` | Grade de manutenção orto (treatment card, padrão Open Dental/Dolphin/Ortho2) | O próprio artefato decide que a grade mora em **aba "Tratamento" no perfil** — é o **R-46e**, não o cockpit. **Não unificar aqui** |

**Microcópia a preservar do v6** (copy inventada na implementação vira divergência):
"Salvar e chamar próximo → {nome}, {hora}" · "fazer hoje →" · "sem registro" · "+ dente" ·
"a fazer" / "feito" · "todas as visitas → perfil completo" · "Registros de hoje · N".

## 5. Decisões (02/08)

| # | Decisão | Consequência |
|---|---|---|
| **F1** | Campo mágico entra **inteiro** no R-46c, incluindo "Organizar com Dex" (IA) — R-46c passa a fazer parte do que era escopo do R-46d. **Correção 02/08:** os achados 1/2/6 da Fase 0 (o risco real disso) **já foram corrigidos** — R-47 (commitado 31/07, 2 rodadas de verificação adversarial, falta só o teste ao vivo pra ✅) e R-48 (01/08, confirmado no iPhone, falta commitar). Não é pré-requisito novo — já satisfeito, código em disco | Nenhuma dependência nova de fato. `R-46-meu-dia.md` §3 atualizado com a correção |
| **F2** | Botão de orçamento na ficha rápida abre **modal completo dentro do cockpit** (não navega pro perfil) | Precisa **extrair** `NovoOrcamentoModal` + tipos `FichaParaOrc`/`EventoOdontogramaParaOrc` + a lógica de `abrirOrcamentoParaFicha` de `paciente-detail-client.tsx` pra um lugar compartilhado — nunca duplicar o componente. Isso é trabalho de extração comportamento-preservando (mesmo padrão do `derivarV2DosEventos`/`derivar-campos-legado.ts` recente), não é 1 botão simples. Vira fatia própria (nome sugerido: **R-46h**), com contrato fino quando ativar — não cabe dentro desta spec de redesign |

**Fila que essa decisão abre, fora deste documento:**
1. **R-46h** — extrair o modal de orçamento pra componente compartilhado, plugar no cockpit.

F1 não abre fila nova — já satisfeito (ver acima). Nenhuma das duas bloqueia o §3 nem o
artefato — são presentation-agnostic, entram na implementação depois que a tela estiver
desenhada.

## 5a. Campos de especialidade — onde eles aparecem na tela

> **O preenchimento** (parser determinístico, voz, medição de produção dos campos vazios)
> foi recortado para **[R-49](R-49-voz-e-campos-de-especialidade.md)** quando esta spec
> estourou o teto de 300 linhas. Aqui fica só o que é **layout do cockpit**.

### D-atrito-4 · Ativação de especialidade: 3 caminhos, e a voz não é obrigatória

**Pergunta dele:** como ativar a tabela de uma especialidade **sem** o campo mágico.

**Resposta — já está resolvido por construção para 16 dos 17 tipos.** O registry mapeia
tipo → plugin (`pluginDoTipo()`, `registry.ts:116`); escolher "Canal" no typeahead abre a
tabela de endo. **Custo zero, nenhum botão novo.**

| Caminho | Gesto | Cobre |
|---|---|---|
| **1 · Typeahead** (já existe) | o mesmo de sempre — a tabela vem junto | 16 de 17 tipos |
| **2 · Chips de atalho** | 1 toque | os mais usados da clínica — **ordem aprendida do uso, seleção nunca** (D5/NORCAL) |
| **3 · Campo mágico** | falar ou digitar | preenche a tabela; a revisão é a própria tabela ([R-49 D2](R-49-voz-e-campos-de-especialidade.md)) |

**Mapa real (17 tipos → 8 plugins; só 4 abrem tabela):**

| Plugin | Tipos que o ligam | Form? |
|---|---|---|
| Dentística | restauração, selante, fratura, pino/núcleo, profilaxia, clareamento, flúor | ❌ `Form: null` — *"o dado É o próprio evento"* |
| **Endodontia** | canal, lesão periapical | ✅ |
| Cirurgia | extração, incluso | ❌ |
| **Implantodontia** | implante | ✅ (8 campos) |
| Prótese fixa | coroa, ponte | ❌ |
| **Periodontia** | raspagem, exame periodontal | ✅ (PSR) |
| Odontopediatria | esfoliado | ❌ |
| **Ortodontia** | **nenhum** (`tiposEvento: []`) | ✅ |

**10 dos 17 tipos não abrem tabela nenhuma** — o caso comum segue procedimento → onde → status.

### 🐛 Buraco destapado por essa pergunta — orto não tem ativação manual

`orto.ts:30` — `tiposEvento: []`, porque manutenção é registro de **arcada**, não de dente:
nenhum tipo do catálogo a alcança. A única forma de ligar o `OrtoForm` hoje é a IA detectar
`orto_manutencao` no relato (`orto.ts:38`). **Sem o campo mágico, o dentista não consegue
registrar manutenção ortodôntica manualmente.** Por isso o artefato dá a orto um **chip próprio
em linha de nível arcada** — não é preferência de layout, é a única porta manual que existe.
Some com o R-50 (`arcada` não-nullable) num item só de orto.

### D-atrito-2 · Orçamento: um botão faz tudo

**Decisão dele (02/08):** *"clicou, salvou e já mostrar o orçamento, um botão pra fazer tudo"*.
O R-46h passa a ser **salvar + abrir o orçamento no mesmo gesto** — resolve o problema do
`fichaId` que só existe após o save, sem estado desabilitado.

### Direção futura registrada (não é item ainda)

Dele, 02/08: *"a gente pode até tirar o campo mágico da ficha futuramente, porque a ficha vai
virar só um documento de registro"* — o trabalho do dia migra pro cockpit e o perfil vira
consulta/documento. Não vira item agora; fica registrado para não se perder.

## 5b. Gates visuais — medidos por script, não no olho

Rodados contra o artefato v2 servido por HTTP (`getBoundingClientRect` + composição de alfa
para contraste). Valem como gate na implementação também.

| Gate | Alvo | v1 | v2 |
|---|---|---|---|
| Altura total em 1440×900 | ≤ 900px | 1033 ❌ | **757** ✅ |
| Contraste WCAG AA | 0 reprovando | 0 ✅ | **0** ✅ |
| Alvo de toque | ≥ 36px | 22 de 54 abaixo ❌ | **0 abaixo** ✅ |
| Escala de espaçamento | 4/8/12/16/24 | 11 valores ❌ | **4** ✅ |
| Raios | 3 | 10 ❌ | **3** (+`50%` do avatar) ✅ |
| Tamanhos de fonte | ≤ 5 | 12 ❌ | **3** (11/12/14) ✅ |
| Pesos | 400/600/700 | tinha 650 ❌ | **3** ✅ |
| Cor fora da paleta | 0 | 1 (`#08211E`) ❌ | **0** (virou `--on-teal`) ✅ |
| Overflow horizontal | nenhum | ✅ | ✅ |

⚠️ **A primeira medição de contraste que rodei foi falso alarme** (acusou 25 elementos): meu
script lia `rgba(47,191,173,.12)` ignorando o alfa, comparando teal contra teal e dando
ratio 1.0. Compondo o alfa sobre o fundo real, **nenhum elemento reprova**. Fica registrado
porque a mesma armadilha pega qualquer verificação de contraste em cima de `--*-dim`.

**iPad retrato (768×1024): 1703px** — as 3 colunas empilham e viram 1,7 tela de rolagem, o
oposto do P2. Empilhar é fallback, não desenho. Alvo de toque lá já está bom (dente 34×46px).
A decisão do tablet é dele, depois de abrir no aparelho.

## 5c. Revisão adversarial do v1 (workflow, 02/08)

4 lentes independentes → 57 achados → 15 verificados por refutador (a máquina hibernou no meio).
**3 confirmados, 12 derrubados.**

- **Confirmados e corrigidos:** gold significava 3 coisas (alergia + "a fazer" + CTA comercial)
  → gold só para alerta clínico · contador não batia com a lista · cor hardcoded → token.
- **Derrubados** (registrados p/ não voltarem): "4 saídas apagam o rascunho" · "3 dentes em
  estados contraditórios" · "campo mágico funde 2 destinos" · "centro não é majoritário".
- **Confirmados à mão e aplicados:** são **17 tipos**, não 16 (`TIPO_LABEL`) · endodontia se
  chama **"Canal"** no sistema · o odontograma do artefato é placeholder, não paridade.

## 6. Fluxo de execução

```
Inventário (feito) → §2 confirmado + F1/F2 decididos → §3 escrito por você → artefato →
sua aprovação visual → código em UMA tela → localhost → produção → replicar (não há "demais"
aqui, é tela única)
```

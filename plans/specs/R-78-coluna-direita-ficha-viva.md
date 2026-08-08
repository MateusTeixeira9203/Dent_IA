# R-78 — Coluna direita: a ficha viva (redesign)

> **SPEC** · **R-78** · ✅ aprovada — **"exatamente como o artefato"** (dele, 08/08) ·
> **Fase:** `aprovada`
> **Aberto:** 2026-08-08 · **Fechado:** —
> **Implementação copia, não adapta** (mesma regra do R-01/artefato-visual): §4.2 abaixo é o
> contrato pixel-a-pixel, extraído por JS do artefato renderizado — não é referência solta.
> **Modelo:** Opus 5 (redesign de tela em uso, decisão de hierarquia visual)
> **Tipo:** redesign de tela existente → segue `templates/spec-redesign.md`
> **Depende de:** [R-46h](R-46h-orcamento-no-meu-dia.md) (mesma área, já codado hoje) ·
> [R-63](R-63-layout-cockpit-slot-central.md) (o slot central que este item estende)
> **Zero migration · zero RLS · zero mudança de escrita.**

## 1. Inventário — o que existe hoje (eu levantei, você confere)

### 1.1 As duas listas do rascunho

`meu-dia-client.tsx` particiona **um único array** (`eventosDraft`, o rascunho não-salvo) por
status, e joga as metades em **colunas opostas** da tela:

```ts
const concluidosHoje    = eventosDraft.filter((e) => e.status === 'realizado'); // aba "Hoje", ESQUERDA
const novosProcedimentos = eventosDraft.filter((e) => e.status === 'indicado');  // aba "Novos", DIREITA
```

Ambas renderizam `NestaSessaoBloco` → `ToothGroupList`. Consequências medidas no código:

| Fato | Onde |
|---|---|
| **Nenhuma das duas mostra ficha salva** — só o rascunho de agora. Salvou → limpa → vira Histórico | `handleSalvo()` zera `eventosDraft` |
| `ToothGroupList` mostra o pill de status (`A fazer`/`Feito`) mas **só-leitura** — não há como corrigir | `tooth-group-list.tsx:112-121` |
| Clicar num card **não** abre detalhe ali — só seleciona o dente e abre o painel na direita | `onDenteClick` |
| Observação do procedimento é cortada com `truncate` (1 linha, sem "ver mais") | `tooth-group-list.tsx:107` |

### 1.2 O componente que já faz o que falta

`RegistroCard` (usado no Histórico e no `FichasTab`) **já tem**:
- `onToggleStatus` — alterna planejado ⇄ realizado no clique do pill
- corpo de especialidade colapsável (`children` + `ChevronRight`), `defaultOpen=false`
- `editavel` — troca `<p>` por `<input>` no mesmo componente (*"O mesmo componente-fonte
  desenha criação E leitura (I1)"*, comentário no arquivo)
- `TextoExpansivel` na observação (R-77, hoje)

**A direita usa `ToothGroupList` e não tem nada disso.** É a duplicação que este item resolve.

### 1.3 Iniciar ficha nova

**Já funciona.** `salvarVisitaMeuDia` é sempre `create`, nunca update
(`actions.ts:36` — *"I2 — sempre create (nunca fichaId)"*). Rascunhar de novo e salvar
produz ficha nova. O que trava é o **rótulo**: `temFichaHoje && semRascunho` mostra
"Já registrado hoje" em cinza (`disabled`), que lê como bloqueio.

### 1.4 O que precisa abrir grande — correção de escopo (08/08)

**Primeira leitura minha estava errada.** Eu tinha entendido "expandir o detalhe" como *tabela
de especialidade*. Ele corrigiu: o problema é **conteúdo denso em geral numa coluna estreita**.

Os casos que ele nomeou:
- observação complexa que um dentista **passou pro outro** sobre um procedimento
- ficha que veio **completíssima** e precisa ser lida inteira pra dar contexto

Ou seja, o que precisa de espaço não é um tipo de dado — é **qualquer texto/tabela longo**.
A tabela de endo é um caso, não *o* caso.

**Consequência pro R-77 (feito hoje):** o `TextoExpansivel` resolve pela metade — expande,
mas *dentro* da coluna de ~360px. Continua ruim de ler. O gesto que falta é **sair da coluna**.

**Consequência pro contra-argumento dos 66%:** os 66% de odontometria vazia valem contra
*preencher*. Este item é sobre **ler** o que já existe — o dado não se aplica, e o caso de uso
é mais forte do que eu tinha avaliado.

### 1.5 Detalhe de especialidade — onde abre hoje

| Contexto | Onde a tabela abre | Editável? |
|---|---|---|
| Rascunho, dente aberto | **centro**, cedendo o odontograma (R-63 §4.1, slot central) | sim (`ToothDetailPanel` monta os forms) |
| Histórico do Meu dia | dentro do card, **coluna de ~360px** | não (`corpoEspecialidade` = cards read-only) |
| Ficha do paciente (`FichasTab`) | dentro do card | sim (`editavel`) |

Os forms (`endo-form`, `implante-form`, `psr-form`) já existem e já rodam nos 2 contextos
editáveis. O problema é **tamanho**, não capacidade: odontometria de 4 canais em 312px.

## 2. Trava de segurança — o que NÃO pode mudar

Redesign mexe em aparência. Estas são as linhas que a implementação não cruza:

| # | Trava |
|---|---|
| T1 | **Escrita não muda.** `salvarVisitaMeuDia` continua sempre-create; nenhum campo novo, nenhuma migration, nenhuma policy tocada |
| T2 | **O rascunho continua com dono único** (`eventosDraft` em `meu-dia-client`) — nenhuma cópia local nova que possa divergir (C1 §5.4) |
| T3 | **Toggle de status só no que é meu e não assinado.** Ficha de outro dentista ou assinada nunca vira editável — a RLS já recusaria, mas a UI não pode nem oferecer (o UPDATE barrado por RLS volta "sucesso" com 0 linhas, mentindo na tela) |
| T4 | **Nada some da tela sem substituto.** Remover a aba "Hoje" só é legítimo porque o conteúdo dela passa a viver na lista unificada — não porque "dá pra ver no Histórico" (o Histórico só sabe da ficha DEPOIS de salvar) |
| T5 | **Orçamento vertical.** `MAPA-MEU-DIA.md` já registra a tela estourada. Toda mudança de layout declara o que ganha e o que cede — nada cresce sem contrapartida |
| T6 | O odontograma continua sendo o centro por padrão. Ceder o slot é **condicional** e reversível (R-63 §4.1), nunca permanente |
| T7 | **Editar procedimento de ficha antiga vira registro de HOJE, nunca update da ficha antiga** (decisão dele, 08/08 — ver §2.1) |
| T8 | **Só na direção `indicado → realizado`.** O caminho inverso migraria o evento pra ficha de hoje e a ficha antiga perderia o registro do que foi feito lá — reescrita do passado por porta lateral (ver §2.1) |

### 2.1 Editar ficha antiga — a decisão de 08/08 e por quê

Pergunta dele: *"caso o dentista queira editar, ele muda pra uma ficha nova ou só altera a
antiga?"* **Decisão: vira registro de hoje.** Não é mecanismo novo — é o que o projeto já faz.

`montarRowsEventos` (`salvar-ficha.ts:106`) seta `ficha_id: ctx.fichaId`. Um evento com id
existente salvo na ficha de hoje **migra** pra ela. É literalmente o "fazer hoje →" do bloco
*A fazer* (`pendenciaParaDraft` preserva o id — *"I3: nunca deixar a pendência original
fantasma"*), e o Histórico já sabe renderizar o resultado: a entrada de hoje ganha
*"indicada em DD/MM"* (R-58 §2, via `feitosAqui`). **O passado não é reescrito, é referenciado.**

O que o R-78 faz é **generalizar o gesto**: hoje ele só existe dentro do "A fazer" (que lista
pendências); passa a existir também no Histórico e no detalhe aberto no centro.

**O limite (T8):** isso é limpo na direção `indicado → realizado`. Na inversa — procedimento
já `realizado` numa ficha antiga sendo remarcado como `indicado` — o evento migra e a ficha
antiga fica sem o registro do que foi feito lá. A UI **não pode oferecer** esse caminho pra
ficha de outro dia. Dentro do rascunho de hoje, ambas as direções são livres (nada foi gravado
ainda).

**Débito conhecido, fora deste item:** não existe rastro de edição — `salvar-ficha.ts` grava
só `updated_at` no ramo de update, sem quem/o quê. Virou item próprio (R-79).

## 3. O que eu quero

> **Fechado 08/08 — "aprovado, mas reforço quero algo exatamente como o artefato".**
> A resposta de cada linha é o artefato (`plans/artefatos/R-78-meu-dia-fluxo.html`),
> com as medidas exatas em §4.2.

| Elemento | Como está | Como quero |
|---|---|---|
| Aba "Hoje" (esquerda) | Bloco próprio, `realizado` do rascunho | **Sai.** Absorvida pela lista única "Nesta ficha" |
| Aba "Novos" (direita) | Bloco próprio, `indicado` do rascunho, `ToothGroupList` só-leitura | Vira **"Nesta ficha"** — lista única (feito+indicado), `RegistroCard`, status clicável |
| Status do procedimento | Só-leitura, corrigir = apagar e recriar | **Pill clicável**, 1 toque alterna `✓`/`○` (T3/T7/T8) |
| Detalhe (tabela de endo/PSR) | Espremido em ~360px, dentro do card | **`⤢` abre grande**, cede a área do espelho — vale pra qualquer conteúdo denso, não só tabela (§1.4) |
| Botão quando já salvou hoje | "Já registrado hoje", cinza, parece bloqueio | `✓ 1 ficha hoje` + botão **"Salvar 2ª ficha"** — nunca bloqueado |
| "Destaque extra" da direita | — | Não cresce a direita: **o odontograma cede espaço** (~800px→522px), vira espelho a `zoom .68` (§4.1 A1) |
| Odontograma | ~800px, centro, sempre grande | **Espelho ~555px**, ao lado da lista (proporção 1,50:1, §4.2) |
| Perfil do dente | Coluna fixa (C7) | **Ocupante da direita** — espelho por padrão, perfil ao tocar um dente, `✕ voltar à boca` (§3.2, D4) |
| "A fazer" | Coluna fixa na direita | **Gaveta** + contador `⏳ N pendentes` na linha do paciente (D2) |

**Contexto da conversa de 08/08 (para você conferir, não é a sua resposta):**
- "no lugar do novo podemos colocar ficha nova e remover o hj"
- "dando um destaque extra pra coluna da direita"
- "podendo mudar os status dos procedimentos da ficha e abrilos"
- "caso use o campo magico e ele ja venha com informaçoes importantes"
- "quando clicar pro detalhe expandir de alguma forma pra ficar sempre bem visivel" (vale
  também pro Histórico)
- "muitas vezes os dentistas vao importar uma ficha q n ta completamente feita, e mts vezes
  ele vao iniciar uma nova ficha"

## 3.1 Direção fechada (08/08) — o Meu dia é operação, a ficha é documento

Ele definiu a tese em 08/08: *"não queria que o Meu dia fosse travado com uma ficha; queria
que a ficha ficasse como documento, e o Meu dia fosse algo rápido, ver rápido, entender
rápido"*. E o alvo: **dentista de alto fluxo** — *"se a gente atende quem tem fluxo muito
alto, também atende quem tem fluxo baixo"*.

**Artefato:** `plans/artefatos/R-78-meu-dia-fluxo.html` (aprovado visualmente 08/08 — martelo
batido nas 3 decisões abaixo).

**Princípio de sensibilidade:** diferença de estado é diferença de **forma** (`✓` / `○`), cor
só reforça. Cor sozinha exige aprender um código e falha em pressa, tela ruim e daltonismo.

**As 3 decisões batidas:**

| # | Decisão | Custo aceito |
|---|---|---|
| D1 | Odontograma vira **espelho menor** ao lado da lista | Clicar dente específico fica mais difícil; o gesto principal virou ditar |
| D2 | "A fazer" vira **gaveta + contador** na linha do paciente | Pendência sai da vista permanente; o `⏳ N pendentes` é o que impede esquecer |
| D3 | Artefato **porta tokens e geometria reais**, só a organização muda | Nada de revisar paleta/tipografia junto — 1 mudança por vez |
| D4 | **O perfil do dente FICA** — vira ocupante da direita, não some | Achado dele 08/08: a 1ª versão do artefato tinha tirado o perfil sem substituto, violando a T4. Ver §3.2 |

### 3.2 Por que o perfil do dente não pode sumir (achado dele, 08/08)

Pergunta dele: *"acredita q n sera mais necessário o perfil do dente?"* — e a resposta é
**não, ele ainda é necessário**. A lista "Nesta ficha" só sabe do que entrou HOJE. Três
perguntas ficam sem resposta sem o perfil:

| Pergunta | Lista responde? | Consequência de perder |
|---|---|---|
| "o que existe nesse dente?" (histórico + hoje) | ❌ só o de hoje | Paciente aponta o dente e o dentista não tem resposta |
| "esse canal já foi iniciado?" (**grupo aberto**, R-51) | ❌ não sabe de grupo | **Multi-sessão quebra** — 2ª sessão viraria tratamento novo em vez de continuar o grupo |
| adicionar procedimento por esse dente | ❌ a entrada é o ditado | Perde o caminho alternativo quando ditar não serve |

**Contrato: a direita tem 1 ocupante por vez.**
- default → **odontograma espelho**
- tocar um dente → **perfil daquele dente** (com aviso de grupo aberto quando houver)
- `✕ voltar à boca` → espelho de volta

Mesma regra do slot central do R-63 (§4.1): ação vence consulta, sem perguntar. E são **dois
gestos distintos**, que não podem se confundir na UI:
- tocar o **dente** (espelho) → perfil do dente
- tocar o **⤢** de um item (lista) → aquele procedimento grande, pra ler/editar

**Layout:** rail → contexto (1 linha) → campo mágico (largura total) → **lista do que entrou
(~60%) + odontograma espelho (~40%)** → faixa de gavetas → ações. Some as duas barras de abas.

**`✓ tudo feito`** no cabeçalho da lista: no alto fluxo o normal é ter feito tudo que ditou —
1 toque em vez de N.

**2ª ficha do dia:** o rodapé mostra `✓ 1 ficha hoje` e o botão vira **"Salvar 2ª ficha"**.
Nunca "Já registrado hoje" em cinza — o estado é informativo, jamais parece bloqueio. O
mecanismo não muda (§1.3, sempre `create`).

## 4. Tokens e geometria — medidos, não estimados

Extraídos por JS da produção (localhost, Brave, 08/08). Ambos os temas reais:

| Token | Light | Dark |
|---|---|---|
| `surface` | `#ffffff` | `#111112` |
| `surface-alt` | `#dadade` | `#1c1c1e` |
| `border` | `#c2c2c6` | `#27272a` |
| `text-primary` | `#09090b` | `#fafafa` |
| `text-secondary` | `#4b5563` | `#a1a1aa` |
| `teal` / `teal-ink` | `#2f9c85` / `#1e7060` | `#2f9c85` / `#5dbeb0` |
| `teal-pale` / `teal-dark` | `#e4f4f1` / `#1e7060` | `#1e3a35` / `#1e7060` |
| `coral` / `coral-ink` / `-pale` | `#e57373` / `#b3261e` / `#fce8e8` | `#ef9a9a` / `#ef9a9a` / `#3d1f1f` |
| `warning` / `-ink` / `-pale` | `#f59e0b` / `#92400e` / `#fef3c7` | `#fbbf24` / `#fbbf24` / `#451a03` |

Tipografia: `DM Serif Display` (h1 30px/700, nome do paciente 14px/700) · `Outfit` (corpo) ·
`DM Mono` (números, horários, dentes).

**Geometria do odontograma:** dente `viewBox "0 0 51 74"`, renderizado **43,4 × 62,9px**,
gap **3px**, `zoom: 0.85` no container (modo compact).

### 4.2 Geometria pixel-a-pixel (extraída por JS do artefato renderizado, viewport 1536px)

**"Exatamente como o artefato"** — estes números são o contrato, não arredondamento:

| Elemento | Medida |
|---|---|
| Largura útil da tela (`.app`, max-width) | **1400px** |
| Miolo (lista + espelho) — colunas do grid | **832,8px │ 555,2px** — proporção **1,50 : 1**, não "60/40" |
| Gap entre lista e espelho | **12px** |
| Rail | altura 90px · padding 10px · radius 16px · gap entre slots 8px |
| Campo mágico | altura 68px · padding 16px 20px · radius 16px · gap ícone↔texto 12px |
| Faixa de gavetas | altura 49px · padding 7px 9px · radius 14px · gap 6px |
| Linha de item da lista | altura 45px |
| Símbolo `✓`/`○` | 22 × 22px, `border-radius: 999px` |
| Botão primário (Salvar e passar) | altura 46px · padding 14px 20px · radius 14px · max-width 420px |
| Arcada (16 dentes) dentro do espelho | **522px** de largura total |
| Dente no espelho | **30 × 43px** (`zoom: .68` sobre o SVG de produção, §4.1 A1) |

Zero campo de "aproximadamente" nesta tabela — o gate G7/G9 se testa contra estes números,
não contra a impressão visual.

### 4.1 Achados do artefato (o motivo dele existir)

**A1 — o odontograma NÃO cabe a 40% com o zoom de produção.** Conta: 16 dentes × 43,4px +
15 gaps × 3px = **739px**; com `zoom .85` = 628px; o card tem ~530px úteis. A arcada
transbordava (dentes 18 e 48 vazando pra fora). **O espelho exige `zoom: .68`** (dente
~29,5 × 42,8px). Isto não é escolha estética — é a conta, e confirma o risco declarado antes
do martelo.

**A2 — o espelho precisa sincronizar na hora.** Na 1ª versão do artefato, trocar o status na
lista não repintava o dente: item marcado "feito" com o dente ainda coral. Num espelho isso
é falha grave. Na implementação vem de graça (mesma fonte, `eventosDraft`) — mas **é gate**,
não detalhe (ver G8).

## 5. Fases (rascunho — reordena depois do §3)

| Fase | O quê | Risco |
|---|---|---|
| F1 | Direita troca `ToothGroupList` por `RegistroCard` — ganha toggle, detalhe colapsável e observação expansível sem código novo | Médio — os dois componentes têm view-models diferentes (`OdontogramaEventoDraft` vs `RegistroCardData`); o adaptador `eventosParaCards` já existe e é o caminho |
| F2 | Fundir "Hoje" + "Novos" numa lista só; esquerda fica Histórico \| Anexos | Baixo |
| F3 | Toggle de status escrevendo no rascunho (`eventosDraft`), respeitando T3 | Baixo no rascunho · Alto se estender pra ficha salva (aí é UPDATE real, precisa de `.select()` — R-59) |
| F4 | **Ler grande**: o slot central recebe qualquer conteúdo denso a partir do Histórico — texto de evolução longo, observação passada entre dentistas, tabela de especialidade (§1.4). Editável conforme T3/T7/T8 | Médio — hoje só o rascunho alimenta o slot; o Histórico nunca passou por ali. O gesto precisa de nome próprio na UI ("expandir"/"ler aqui"), não pode se confundir com o "ver mais" do R-77 (que expande *dentro* da coluna) |
| F5 | Rótulo do botão pós-save (§1.3) — "Já registrado hoje" deixa de parecer bloqueio | Baixo |

## 6. Gates (rascunho)

| Gate | Como testar |
|---|---|
| G1 | Dex marca "realizado" errado → 1 toque no pill corrige, sem apagar/recriar, e o odontograma repinta junto |
| G2 | Documento importado com tudo `indicado` (R-75) → dentista marca os feitos direto na lista |
| G3 | Salvar depois de corrigir status → banco grava o status corrigido (conferir a linha, não a tela) |
| G4 | Tabela de endo de 4 canais aberta pelo Histórico → legível, sem scroll horizontal |
| G4b | **Evolução longa** (texto denso) e **observação passada entre dentistas** abertas pelo Histórico → legíveis no espaço grande, não só a tabela (§1.4) |
| G5 | Ficha de OUTRO dentista no Histórico → detalhe abre só-leitura, sem pill clicável (T3) |
| G6 | Já salvou ficha hoje → dá pra começar outra sem sair da tela, e o rótulo não parece bloqueio |
| G7 | Tela inteira em 1366×768 (notebook comum) sem scroll horizontal e sem coluna cortada (T5) |
| G8 | **Trocar status na lista repinta o dente no espelho na MESMA interação** (achado A2). Item "feito" com dente coral = falha |
| G9 | Arcada completa (16 dentes) cabe na largura do espelho **sem transbordar**, medido — não conferido no olho (achado A1) |
| G10 | `✓ tudo feito` marca todos e repinta todos os dentes de uma vez |
| G11 | 2ª ficha do dia: rodapé mostra `✓ 1 ficha hoje` e botão diz "Salvar 2ª ficha" — nunca cinza/bloqueado |
| G12 | Tocar um dente no espelho → perfil daquele dente, com histórico anterior + o de hoje separados (§3.2) |
| G13 | **Dente com grupo aberto (canal 1ª sessão) mostra o aviso e o caminho de continuar** — sem isso, multi-sessão quebra (R-51) |
| G14 | Os 2 gestos não se confundem: tocar dente ≠ tocar `⤢` do item. Um abre perfil do dente, outro abre o procedimento grande |

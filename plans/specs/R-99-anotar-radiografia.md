# R-99 — Anotar a radiografia: paleta de procedimentos sobre a imagem

> **SPEC** · 🟡 codado 10/08 — migration 135 aplicada, typecheck/lint/build limpos.
> **Sem push. Ele ainda não testou pessoalmente** — gates do §8.
> **Aberto:** 2026-08-10 · **Fechado:** — · **Fase:** execução
> **Modelo:** Sonnet 5 (superfície sobre bloco existente; sem prompt de IA, migration pequena)
> **Origem:** pedido dele 10/08, decisões tomadas na discussão do R-98 (ver
> [R-98 §Origem](R-98-apresentar-visual-blocos-modelo.md)). Conceito descrito no artefato do
> R-98 (Bloco A+).
> **Depende de:** bloco `imagem` do R-98a **codado** (já está — não precisa do veredito de
> produção pra este item existir em spec, só pra virar código real em cima dele).
> **Toca produção fora da própria feature:** o ajuste do símbolo do implante (D9) muda
> `Odontograma.tsx`, componente compartilhado por toda tela que desenha a boca — não é
> só um arquivo novo isolado. Ver §7.
> **Artefato:** [`R-99-anotar-radiografia.html`](../artefatos/R-99-anotar-radiografia.html) —
> aprovado visualmente 10/08, geometria portada e verificada por script (não no olho).
> **Não bloqueia** nada.

## 1. O problema

O bloco `imagem` do R-98a mostra a radiografia inteira com legenda em texto. Mas explicar
"aqui entra o canal, e por cima a coroa" apontando com o dedo na tela é mais direto que
qualquer legenda — e é o gesto que o dentista já faz hoje, sem o sistema.

## 2. Decisões

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| **D1** | **Overlay puro** — coordenada (x%, y%) + tipo, guardado **na seção**, nunca no pixel da imagem | Editar/regravar a imagem com a marcação embutida | Decidido 10/08: radiografia é exame diagnóstico; misturar achado com proposta desenhada à mão apaga a distinção pra sempre |
| **D2** | **Sem exportar** por enquanto — a versão anotada não sai da tela do Apresentar | Baixar/enviar a versão anotada ao paciente | Decidido 10/08: mantém a anotação fora das regras de custódia de prontuário que exportar acionaria |
| ~~**D3**~~ | ⚠️ **REVOGADA 10/08** — ver **D11**. Era *"paleta é chrome de edição, some na aba Apresentar"* | Paleta sempre visível | Motivo original (mesmo padrão do `presentationMode`) ficou menor que o caso real: dentista quer marcar COM o paciente olhando, no momento da explicação |
| ~~**D4**~~ | ⚠️ **REVOGADA 10/08** — ver **D12**. Era *"clique num marcador remove ele direto"* | Arrastar pra reposicionar | Resolvia bem remoção; não tinha resposta pra redimensionar, que ele pediu na sequência — os dois viraram a mesma UI (seleciona → toolbar flutuante) |
| **D5** | Marcador tem **1 cor só (coral)** — mesma semântica de "indicado" do odontograma | Distinguir proposto × já feito no próprio marcador | O overlay inteiro já É a proposta (D1); um 2º estado reabriria a distinção achado/proposta que o D1 existe pra evitar |
| **D6** | Anotação vale para **qualquer bloco `imagem`**, não só os categorizados como radiografia | Restringir a `paciente_documentos.categoria = 'Radiografias'` | `ImagemSectionBody` hoje não distingue radiografia de foto (`categoria` não chega ao componente) — restringir exigiria fiação nova sem pedido claro pra isso |
| **D7** | Paleta final: **canal · coroa · implante · pino** (4, não 5) — "prótese" era engano de fala por "implante" (confirmado por ele 10/08) | Mapear "prótese" pra `ponte` | `ponte` é estruturalmente multi-dente (`grupo_id`/`papel_no_grupo`); usar pra 1 marcador de ponto misturaria semânticas (era a A2, ver histórico no commit anterior desta spec) |
| **D8** | Símbolos **portados** do `Odontograma.tsx`: canal (silhueta do canal), coroa (hachura no ângulo de 55,7°), implante (parafuso+plataforma), pino (haste+núcleo) — normalizados pra badge de tamanho fixo, já que a geometria original é fração de coroa/raiz de um dente específico, não um ícone solto | Desenhar um conjunto de ícones novo, sem relação com o odontograma | Decidido 10/08: "copia do odontograma" — mesma linguagem visual em vez de 2 sistemas de símbolo coexistindo no produto |
| **D9** | Implante fica **mais robusto** — `G.impHwColo` de `9/96` pra `12,5/96`, piso de `4` pra `5,6` — e o ajuste entra **nos dois lugares**: aqui (marcador flutuante, badge novo) e em produção (`Odontograma.tsx`, toda tela que já desenha um implante) | Só ajustar o marcador novo, deixar o odontograma como está | Medido nesta spec (§7.1): no 1º molar (dente mais comum), implante e pino diferem hoje em só 10% de largura — "quase igual" era queixa fundamentada, não impressão |
| **D10** | Paleta ganha **5º tipo: extração** (`exodontia`) | Ficar só nos 4 originais | Pedido dele 10/08, testando ao vivo. Símbolo **já existe** pronto pra portar — X sobre a coroa (`Odontograma.tsx:697`, `resumo.exodontiaIndicada`), nem precisou desenhar do zero |
| **D11** | **Revoga D3** — a paleta funciona também **durante a apresentação ao vivo** (patient-facing), atrás de um botão que revela ("Marcar no raio-x", mesmo estilo dos botões de visão-geral/fechar que já existem no header) | Paleta sempre visível na apresentação | Pedido dele 10/08: *"o dentista ter a opção que temos hoje antes de apresentar E durante"* — quer marcar em tempo real explicando pro paciente, não só preparar antes. Botão-revela em vez de sempre-visível preserva a tela limpa quando ele só está navegando slides |
| **D12** | **Revoga D4** — clique num marcador **seleciona** (não remove mais direto); aparece uma mini-toolbar flutuante com `−`/`+` (só ícone) e `✕` remover | (a) arrastar uma alça pra redimensionar; (b) um slider único pra todos os marcadores da imagem | Escolha dele 10/08, das 3 opções levantadas. Toque simples funciona em touch (tablet na sala); não depende de mira fina de arrasto |
| **D13** | **Desenho livre entra** — traço solto + 3 formas (linha, círculo, seta), como ferramentas extras na paleta, ao lado dos 5 ícones tipados | Só traço livre, sem formas | Escolha dele 10/08. Geometricamente: linha/seta/círculo são o mesmo dado (2 pontos), traço é uma lista de pontos — 2 formas de dado novas, não 4 |
| **D14** | **Imagem preenche o máximo do espaço disponível** — troca de "tamanho natural do arquivo, só encolhe" pra "cresce ou encolhe pra caber", nos dois lugares (editor e apresentação) | Manter tamanho natural | Achado ao vivo 10/08: um raio-x panorâmico de resolução modesta ficava pequeno no meio de uma tela escura enorme — "a imagem tem que ocupar a maior parte da tela" |
| **D15** | **Ícone ganha mover (arrasta o corpo) e girar (arrasta uma alcinha acima dele)** — clique sem arrastar continua selecionando (D12); arrastar move; a alcinha só aparece com o ícone selecionado | Só resize, sem mover/girar | Pedido dele 10/08: *"não tenho como mover ele ou girar ele... preciso que seja o mais editável possível"*. Implante/pino foram o exemplo — ângulo de inserção é informação clínica real, não só estética. Uniforme pros 5 tipos, não só implante/pino |
| **D16** | **Coroa vira silhueta só da coroa do dente (sem raiz), hachura ORIGINAL (mesmas 3 linhas) por dentro** (revoga D8 só pra este ícone) — extração **não** acompanha, volta a ser retângulo+X independente | 1a tentativa (dente inteiro com raiz + linha de capa fina) — rejeitada 10/08, *"ficou muito ruim"* | v2 depois do rejeite: ele foi específico — "só a silhueta em cima" (sem raiz) e "a hachura de dentro que já resolve, que eu dou pra entender". Extração ele pediu explicitamente pra manter simples ("é só um X"), não seguir a coroa |
| **D19** | **Distância da toolbar até o ícone acompanha o tamanho dele** (`tamanhoPx/2 + 35`, era fixa em 14px) | Gap fixo | Print dele 10/08: em ícone padrão/pequeno, a toolbar cobria a alça de girar — só desgrudava em ícone bem grande. Matemática: alça fica a `tamanhoPx/2+18` do centro (+9 do próprio raio) — a toolbar agora sempre limpa isso com 8px de folga, testado nos 3 tamanhos-limite (0,6×/1×/2,2×) |
| **D18** | **Ferramenta desarma sozinha depois de UM ícone/forma criado** (e seleciona o que acabou de nascer) — antes ficava armada indefinidamente pro próximo clique | Manter armada (comportamento original, achado ruim ao vivo) | Print dele 10/08: um cacho de implantes empilhados no mesmo dente. Causa dupla — (a) UX: ferramenta sticky faz qualquer clique subsequente (inclusive em cima de um ícone já colocado, tentando selecioná-lo) criar mais um; (b) bug: o `click` nativo do botão do ícone nunca tinha `stopPropagation` (só o `pointerdown` tinha), furava até o palco. Corrigidos os dois — sticky vira "usa uma vez, desarma", e o clique do ícone agora segura o próprio `click` |
| **D17** | **Cor do marcador muda de coral pra ciano** (`#22d3ee`, hex fixo — não é mais o token `--color-coral`) — vale pros 5 símbolos (D5 não muda, só a cor) | Coral (D5 original) | *"Essa cor está muito ruim pro que a gente tem hoje, num raio-x, numa panorâmica"* — coral é baixo contraste contra cinza médio. Escolhido numa comparação de 5 cores (coral/ciano/amarelo/verde-limão/branco) num fundo simulando o gradiente claro-no-meio de uma panorâmica |

## 3. Contrato técnico

**TypeScript:**

```typescript
/** Os 5 tipos com marcador visual — mapeiam 1:1 pra TipoRegistroOdontograma (D7, D10). */
export type TipoAnotacaoRadiografia = 'endodontia' | 'coroa' | 'implante' | 'pino_nucleo' | 'exodontia';

/** Formas de desenho livre (D13) — além dos ícones tipados. */
export type FormaDesenho = 'linha' | 'circulo' | 'seta';

/** Union por `forma` (D12/D13): ícone tipado com tamanho ajustável · forma geométrica
 *  (2 pontos: linha/seta/círculo, o círculo usa o ponto médio como centro e a distância
 *  como raio) · traço livre (sequência de pontos). Todas as coordenadas 0–100, percentual
 *  da imagem renderizada — independente de zoom/resolução. */
export type AnotacaoOverlay =
  | { id: string; forma: 'icone'; tipo: TipoAnotacaoRadiografia; x: number; y: number; tamanho: number; rotacao: number }
  | { id: string; forma: FormaDesenho; x1: number; y1: number; x2: number; y2: number }
  | { id: string; forma: 'traco'; pontos: { x: number; y: number }[] };
```

`rotacao` (D15) — graus 0–359, normalizado no `pointerUp` (`((g % 360) + 360) % 360`), sempre
positivo mesmo girando anti-horário. Zod usa `.default(0)`: ícones salvos antes do D15 não
têm o campo — sem migration, sem perda (mesma disciplina da I3).

**SQL — próxima migration livre no momento de codar** (hoje seria **135**; se o R-98b for
codado primeiro, ele toma o 135 e este item passa a 136 — **conferir antes de escrever o
arquivo**, não assumir o número deste documento):

```sql
alter table planejamento_secoes
  add column if not exists anotacoes jsonb not null default '[]'::jsonb;
-- Só tem sentido quando tipo='imagem'; nas demais linhas fica '[]' e nunca é lido.
-- Sem tabela própria: é dado pequeno, por-seção, sem necessidade de índice ou join.
```

**Leitura defensiva** — mesmo padrão do `detalhe` em `odontograma_eventos`
(`types/odontograma.ts:139`, *"validado por Zod na leitura, dado corrompido degrada pra 'sem
tabela', nunca quebra a ficha"*): `anotacoes` corrompido ou fora do schema vira `[]` no parse,
nunca lança, nunca quebra o editor nem a apresentação ao vivo.

**Fetch** — já é coluna de `planejamento_secoes`, então entra no mesmo select que hoje traz
`tipo`/`titulo`/`conteudo` em `usePlanejamentoPaciente.ts:171`. Sem chamada nova.

**Escrita** — mesmo caminho de `onUpdateSection` que já existe pra `content`/`imageIds`; sem
rota de API nova, sem função nova no hook além de um novo `field` aceito.

**Componentes** — o overlay virou complexo demais (palco sem letterbox, seleção,
redimensionar, desenho por arrasto) pra continuar como função local; ganhou 2 arquivos
próprios, usados nos 2 lugares (editor e apresentação):

```
src/components/pacientes/anotacao-simbolos.tsx
  AnotacaoIcone(tipo)    -- switch dos 5 símbolos portados (D8, D10), currentColor
  ANOTACAO_TIPOS         -- config [{tipo,label}] — fonte única da paleta nos 2 lugares

src/components/pacientes/anotacao-overlay-imagem.tsx
  AnotacaoOverlayImagem  -- o componente inteiro: mede o "palco" (retângulo exato da
                            imagem, sem barra preta — ResizeObserver + naturalWidth/Height,
                            D14), renderiza ícones (ancorados em %) e formas/traço (um
                            <svg> do tamanho exato do palco em PIXELS reais, nunca um
                            viewBox 0..100 esticado — isso distorceria círculo e traço),
                            trata clique-pra-marcar/arrasto-pra-desenhar, seleção +
                            toolbar flutuante de redimensionar/remover (D12)

ApresentarPanel.tsx
  DESENHO_TIPOS, ferramentaEhIgual()  -- config dos 4 botões de desenho (D13) + comparação
                                          de qual ferramenta está armada (ícone/forma/traço)

  ImagemSectionBody (existente, R-98a)
    -- paleta de 9 botões (5 ícones + divisor + 4 desenho) + <AnotacaoOverlayImagem interativo>

  Slide de imagem na apresentação (D11, revoga D3)
    -- header ganha botão "Marcar no raio-x" (Pencil) — só aparece quando o slide atual é imagem
    -- <AnotacaoOverlayImagem interativo={marcarAberto}> — mesmo componente do editor
    -- marcarAberto=false (default): overlay puro display, sem paleta, sem clique
```

## 4. Comportamento

| Estado | O que acontece |
|---|---|
| Editor, nenhuma ferramenta armada | Clique na imagem não faz nada; marcadores existentes aparecem, clicáveis pra selecionar |
| Editor, ícone armado (ex: "Canal") | Clique na imagem adiciona o ícone na coordenada, seleciona ele e **desarma a ferramenta** (D18) |
| Editor, linha/círculo/seta armada | Arrasta (down→move→up) desenha a forma com pré-visualização tracejada ao vivo; solta, commita, seleciona e desarma (D18) |
| Editor, traço armado | Arrasta livre; cada ~1,2% de distância percorrida vira um ponto novo — não amostra tudo, evita array gigante |
| Editor, clique num marcador existente | **Seleciona** (D12) — mini-toolbar flutuante aparece: `−`/`+` (só ícone, tamanho 0,6×–2,2×) e `✕` (remove) |
| Editor, clique em área vazia sem ferramenta armada | Deseleciona o que estava selecionado |
| Apresentação, slide de imagem, marcação fechada (default) | Marcadores renderizam de forma decorativa (`pointer-events-none`); botão "Marcar no raio-x" visível no header |
| Apresentação, botão "Marcar" clicado | Paleta aparece sobre o topo do slide; mesma lógica de clique/remoção do editor liga (D11) |
| Apresentação, Esc com marcação aberta | Fecha só a marcação (1º Esc); 2º Esc sai da apresentação |
| Apresentação, troca de slide | Marcação fecha sozinha — só faz sentido no slide de imagem atual |
| Imagem trocada (`onOpenPicker`) | `anotacoes` zera — coordenada é relativa à imagem antiga, não faz sentido sobre a nova |
| Seção some (`removeSection`) | `anotacoes` some junto — é coluna da própria linha, sem cascata a coordenar |

## 5. Invariantes

- [ ] **I1** — A imagem original em `paciente_documentos`/storage **nunca é regravada** —
      overlay é sempre render por cima, nunca merge no pixel (D1).
- [ ] **I2** — Nenhum caminho de export (PDF, download, WhatsApp) inclui a versão anotada (D2).
      Se algum export de imagem já existir em outro fluxo, este item não pluga nele.
- [ ] **I3** — `anotacoes` corrompido ou com `tipo` desconhecido degrada pra lista vazia, nunca
      quebra o editor nem a apresentação ao vivo.
- [ ] **I4** — Trocar a imagem do bloco limpa `anotacoes` (coordenada não sobrevive à troca).
- [ ] ~~**I5**~~ — ⚠️ **REVOGADA 10/08** (D11). Era *"paleta nunca aparece na aba Apresentar"*.
- [ ] **I6** — Marcação ao vivo (apresentação) **nasce sempre fechada** — abrir o painel ou
      trocar de slide nunca deixa a paleta aparecendo sozinha pro paciente; é sempre o
      dentista quem clica em "Marcar" pra revelar (substitui a I5).
- [ ] **I7** — `tamanho` do ícone é sempre clampado em [0,6; 2,2] — `+`/`−` nunca produzem
      um marcador ilegível de tão pequeno nem um que engula a imagem.
- [ ] **I8** — Círculo/linha/seta nunca distorcem (raio vira elipse, traço vira espessura
      variável) — o `<svg>` do overlay é sempre dimensionado em pixels reais do palco,
      nunca um viewBox abstrato esticado de forma não-uniforme.
- [ ] **I9** — Coordenada de qualquer forma (ícone, linha/círculo/seta, traço) continua
      batendo entre editor e apresentação mesmo com tamanhos de tela diferentes — os dois
      usam o mesmo componente (`AnotacaoOverlayImagem`), não duas implementações paralelas.

## 6. Fora de escopo

| O quê | Por quê |
|---|---|
| Exportar/baixar a versão anotada | D2 — decisão de 10/08, revisitar quando o custódia-de-prontuário estiver mapeado |
| Arrastar pra reposicionar ícone | D12 — seleciona+ajusta cobre resize; reposicionar continua sendo remover (✕) e recolocar |
| Zoom/pan na imagem durante a anotação | Não pedido — D14 (fill-mais-tela) já resolve a queixa real, que era tamanho, não navegação |
| Redimensionar linha/círculo/seta/traço | Só o ícone ganhou `−`/`+` (D12) — as formas geométricas não pediram resize; reabrir se ele sentir falta |
| Anotar o bloco `odontograma` (boca inteira) | Esse bloco já pinta por evento real — overlay ali duplicaria o que já existe |
| Texto/nota por marcador | Não pedido; a legenda da seção (`content`, já existe) cobre explicação em texto |
| Distinguir proposto × realizado no marcador | D5 |
| Desfazer/refazer (Ctrl+Z) no desenho livre | Não pedido; remover (✕) após selecionar cobre o erro pontual |

## 7. Ajuste em `Odontograma.tsx` (D9) — o achado medido

Ele pediu pra deixar o implante "mais robusto" porque tá "quase igual ao pino" — conferido
por script (`gen-symbols.js`, geometria portada exata de `Odontograma.tsx`, não estimada
por leitura de código), não por olho:

| Classe de dente | Largura implante hoje ÷ largura pino | Depois do ajuste |
|---|---|---|
| Incisivo decíduo | 1,43× | 2,00× |
| Pré-molar | 1,27× | 1,78× |
| **1º molar (mais comum)** | **1,10× — quase igual** | **1,53×** |

**Mudança proposta, um único lugar:** `Odontograma.tsx`, dentro do objeto `G` — `impHwColo`
de `9/96` para `12,5/96`, e o piso de `Math.max(4, ...)` pra `Math.max(5.6, ...)`. Taper
(`impHwRatio`), roscas (`impRoscas`) e plataforma (`impPlacaHw`/`impPlacaH`) **não mudam** —
a plataforma já escala sozinha via `Math.max(hwC*1.45, w*impPlacaHw)`, então o corpo mais
largo puxa ela junto sem tocar essa constante.

**Blast radius:** `Odontograma.tsx` é o componente que desenha a boca em **toda** tela do
produto — Meu dia, ficha do paciente, e agora o bloco `odontograma` do R-98a. Mudar `G` muda
o implante em todas elas ao mesmo tempo, não só na tela nova deste item.

## 8. Gates de aceite

**R-99 (overlay):**
- [ ] G1 — Marcar "Canal" na paleta e clicar na imagem cria um marcador na coordenada certa
      (conferir com zoom/resize da janela — coordenada é percentual, não pixel absoluto)
- [ ] G2 — Clicar num marcador existente **seleciona** (D12) — toolbar flutuante aparece
      com `−`/`+`/`✕`; clicar `✕` remove
- [ ] G3 — Trocar a imagem do bloco zera `anotacoes` (conferido via SQL, não só pela UI)
- [ ] G4 — Abrir a apresentação (slide de imagem) mostra os marcadores **sem** a paleta —
      botão "Marcar" existe, mas nasce fechado (I6)
- [ ] G5 — `anotacoes` com JSON inválido (editado direto no banco) não quebra editor nem
      apresentação — degrada pra sem marcador
- [ ] G6 — Nenhum PDF/export existente ganha a versão anotada (checar os exports que já
      existem no projeto — orçamento, prontuário)
- [ ] G7 — Remover a seção apaga `anotacoes` junto (sem linha órfã)
- [ ] G8 — Light e dark conferidos — paleta e marcadores no **editor**; apresentação é
      sempre dark (inclusive a paleta revelada ali), não precisa do par

**Marcação ao vivo na apresentação (D11):**
- [ ] G12 — Botão "Marcar" só aparece quando o slide atual é de imagem — não some/aparece
      errado ao navegar pra outro tipo de slide
- [ ] G13 — Clicar "Marcar", escolher um tipo, clicar no raio-x cria o marcador — e ele
      **persiste** de verdade (recarregar a página e ele continua lá, mesma escrita
      debounced que o editor já usa)
- [ ] G14 — Esc com marcação aberta fecha só ela; Esc de novo sai da apresentação inteira
- [ ] G15 — Trocar de slide (seta, ponto, clique na visão geral) fecha a marcação sozinha
- [ ] G16 — Extração (`exodontia`) aparece na paleta dos dois lugares (editor e
      apresentação) e o X desenhado bate com o mesmo símbolo do odontograma real

**Redimensionar, desenho livre e fill-mais-tela (D12/D13/D14):**
- [ ] G17 — `+` no ícone selecionado aumenta até o teto (2,2×) e para — não estoura pro
      infinito; `−` idem no piso (0,6×)
- [ ] G18 — Desenhar uma linha, um círculo e uma seta produzem formas reconhecíveis como
      tal (círculo não vira elipse, seta tem a ponta no lugar certo) num raio-x bem mais
      largo que alto (panorâmico) — é o caso onde distorção por viewBox apareceria
- [ ] G19 — Traço livre acompanha o dedo/mouse sem serrilhado grosseiro nem travar a
      página com um array de pontos gigante
- [ ] G20 — Marcar uma forma no **editor**, salvar, abrir a **apresentação** — a forma
      aparece no mesmo lugar relativo da imagem, mesmo com o slide em outro tamanho de tela
- [ ] G21 — Uma radiografia panorâmica (bem mais larga que alta) ocupa visivelmente mais
      espaço na apresentação do que ocupava antes — não fica pequena flutuando no centro
- [ ] G22 — Redimensionar a janela do navegador durante a apresentação não desalinha
      marcador nenhum (ResizeObserver recalculando o palco)

**Mover e girar ícone (D15):**
- [ ] G23 — Arrastar o corpo do ícone move ele; **clicar sem arrastar continua
      selecionando** (não vira arrasto por engano com um tremor de mão)
- [ ] G24 — Selecionar um ícone mostra a alcinha de girar acima dele; arrastá-la gira o
      ícone em volta do próprio centro, sem saltar de posição
- [ ] G25 — Girar e recarregar a página — o ângulo persiste (mesma escrita debounced)
- [ ] G26 — Um ícone salvo **antes** deste ajuste (sem `rotacao` no banco) continua
      aparecendo, na orientação normal (0°) — não vira `[]` nem quebra o parse (zod default)

**Ajuste do implante (D9), fora da tela nova:**
- [ ] G9 — Comparar visualmente o implante antes/depois num 1º molar real do produto (Meu
      dia ou ficha) — não só no artefato isolado
- [ ] G10 — Conferir num incisivo/dente pequeno também — a mudança é fração + piso, os dois
      efeitos precisam aparecer certos nas duas pontas de tamanho
- [ ] G11 — Nenhuma tela existente que já mostra implante (Meu dia, ficha, R-98a) quebra ou
      sobrepõe elementos vizinhos com o corpo mais largo

## 9. Aberta

- ~~**A1**~~ · Resolvida por **D12** (10/08) — seleciona+toolbar cobre o caso "errei por
  pouco" tão bem quanto o caso "errei feio"; remover+recolocar continua sendo o caminho
  pra reposicionar, mas agora tem um passo de seleção explícito no meio.
- **A2 · Light mode do editor.** O artefato (§ referência acima) cobre a paleta só no
  contexto escuro da apresentação. O editor do Apresentar segue o tema do app (R-98 já
  registrou essa mesma lacuna pro resto da tela) — a paleta em light não foi desenhada
  ainda. Mesmo gate que o R-98a carrega em aberto; não é lacuna nova deste item.

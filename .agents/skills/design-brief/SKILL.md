---
name: design-brief
description: >
  Parse design briefs into concrete DESIGN.md specifications. Resolves product type
  into exact hex palettes, named font pairings, and a visual style from a catalog of
  71 styles and 161 product-specific color palettes. Outputs DESIGN.md + visual preview.
  Use when: "create a design brief", "define the visual direction", "what should this look like?",
  "set the design system", "preciso de uma paleta para X", "como vai ficar visualmente".
cpe:
  source: cpe-fusion
  synthesis_sources:
    - open-design (Apache-2.0, commit 1cb7eae4) — original 8-dimension structure
    - nextlevelbuilder/ui-ux-pro-max-skill (MIT) — 161 palettes, 71 styles, 73 font pairings
  integrated_at: 2026-06-24
  adaptation: >
    Vocabulário fechado do original substituído por lookup product-type → palette
    do ui-ux-pro-max. Estilos visuais e pairings tipográficos expandidos de 12
    opções fechadas para catálogos de 71/73 entradas em references/.
---

# Design Brief

Transforma uma descrição de produto em especificação concreta de design — paleta exata,
tipografia com pairing nomeado, estilo visual, tokens, e DESIGN.md pronto para usar.

---

## STEP 0 — Coleta de contexto (FAÇA PRIMEIRO)

Você precisa de apenas 2 informações. Se alguma estiver ausente, pergunte numa mensagem só:

1. **Tipo de produto** — "é um SaaS B2B, app mobile, e-commerce, dashboard de analytics...?"
2. **Constraints hard** — dark mode obrigatório? mobile-first? paleta de marca existente?

**Não pergunte o mood/estilo — o usuário vai escolher no catálogo (STEP 2).**

---

## STEP 1 — Resolver palette (por tipo de produto)

Carregue `references/palettes.md` e localize o tipo de produto mais próximo.

Apresente **3 opções de paleta** adequadas ao tipo de produto (não escolha por ele):

```
Paleta A — <nome do tipo>
  Primary: #hex  Accent: #hex
  Mood: <1 linha>

Paleta B — <variação ou alternativa>
  Primary: #hex  Accent: #hex
  Mood: <1 linha>

Paleta C — <opção mais arrojada/diferente>
  Primary: #hex  Accent: #hex
  Mood: <1 linha>
```

Aguarde o usuário escolher antes de continuar.

---

## STEP 2 — Mostrar catálogo de estilos (NÃO escolha por ele)

Carregue `references/styles.md`. Filtre os estilos relevantes para o tipo de produto
e apresente como catálogo navegável — **o usuário escolhe**.

**Formato de apresentação:**

```
ESTILOS RECOMENDADOS PARA [TIPO DE PRODUTO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⬡ Minimalism & Swiss
  "Clean, grid, funcional. Sem adornos."
  Referência: Linear, Notion, Vercel
  CSS: display:grid · gap:2rem · sans-serif leve

⬡ Glassmorphism
  "Vidro fosco, translúcido, vibrante."
  Referência: macOS Sonoma, Arc browser, Raycast
  CSS: backdrop-filter:blur(15px) · rgba(255,255,255,0.15)

⬡ Soft UI Evolution
  "Neumorphism melhorado, mais contraste."
  Referência: Vercel Dashboard, Stripe
  CSS: box-shadow multi-layer suave · animation:200-300ms

[...continua com 5-8 opções relevantes ao contexto...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VER CATÁLOGO COMPLETO — digitar "catálogo" mostra todos os 71 estilos por categoria.
```

Aguarde o usuário escolher o estilo antes de continuar.

**Se o usuário digitar "catálogo":** mostre o catálogo completo de `references/styles.md`
organizado por categoria (Gerais, Landing Pages, BI/Analytics, Mobile), com nome + 1 linha + referência visual para cada um.

---

## STEP 3 — Mostrar opções de tipografia (NÃO escolha por ele)

Carregue `references/typography.md`. Filtre pairings compatíveis com o estilo escolhido
e o tipo de produto. Apresente **4-5 opções**:

```
TIPOGRAFIA — escolha o pairing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

① Friendly SaaS
  Display: Plus Jakarta Sans · Body: Plus Jakarta Sans
  Mood: "Amigável, moderno, clean"
  Usado por: Loom, Linear (variação)

② Tech Startup
  Display: Space Grotesk · Body: DM Sans
  Mood: "Tech, inovador, bold"
  Usado por: Vercel, produtos dev

③ Financial Trust
  Display: IBM Plex Sans · Body: IBM Plex Sans
  Mood: "Confiável, corporativo, preciso"
  Usado por: IBM, produtos fintech

④ Premium Sans
  Display: Satoshi · Body: General Sans
  Mood: "Premium, sofisticado, versátil"
  Usado por: Startups premium

⑤ Developer Mono
  Display: JetBrains Mono · Body: IBM Plex Sans
  Mood: "Dev, técnico, preciso"
  Usado por: Dev tools, IDEs

VER TODOS OS 73 PAIRINGS — digitar "tipografia" mostra o catálogo completo.
```

Aguarde o usuário escolher antes de continuar.

---

## STEP 4 — Confirmar escolhas e resolver dimensões restantes

Com paleta + estilo + tipografia escolhidos pelo usuário, pergunte as últimas dimensões
**numa mensagem só** (não em rodadas separadas):

```
Últimas definições antes de gerar o DESIGN.md:

Layout: sidebar · dashboard · centered · full-bleed · editorial · bento-grid
Density: spacious · balanced · compact
Border radius: none(0) · sharp(2-4px) · default(8px) · rounded(12-16px) · bubbly(20px+)
Motion: none · subtle · expressive

Algum default está ok? (qualquer coisa não respondida vira balanced/default/subtle)
```

| Dimensão | Vocabulário | Default |
|----------|------------|---------|
| layout | `centered`, `sidebar`, `full-bleed`, `dashboard`, `editorial`, `card-grid`, `bento-grid` | `centered` |
| density | `spacious`, `balanced`, `compact` | `balanced` |
| radius | `none`, `sharp`, `default`, `rounded`, `bubbly` | `default` |
| motion | `none`, `subtle`, `expressive` | `subtle` |
| constraints | `mobile-first`, `desktop-only`, `dark-mode-only`, `print-safe`, `reduced-motion` | (nenhum) |

---

## STEP 5 — Gerar DESIGN.md

```markdown
# DESIGN.md — <Nome do Projeto>
_Gerado em: <data>_

## 1. Produto & Contexto
**Tipo:** <tipo de produto>
**Audience:** <quem usa>
**Mood:** <direção visual escolhida>

## 2. Estilo Visual
**Primário:** <nome do estilo> — <descrição 1 linha>
**CSS keywords:** <principais propriedades do estilo>
**Referência visual:** <exemplo de produto/marca que usa esse estilo>

## 3. Paleta de Cores

### Light mode
| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | #hex | Brand, buttons, links |
| `--color-accent` | #hex | CTAs, highlights, estados ativos |
| `--color-surface` | #hex | Cards, backgrounds elevados |
| `--color-bg` | #hex | Fundo principal |
| `--color-text` | #hex | Texto primário |
| `--color-text-muted` | #hex | Labels, placeholders |
| `--color-border` | #hex | Linhas, separadores |
| `--color-success` | #22c55e | Confirmações, progresso |
| `--color-error` | #ef4444 | Erros, alertas |

### Dark mode (quando aplicável)
| Token | Hex | Regra |
|-------|-----|-------|
| `--color-bg` | #0f172a ou derivado | Nunca puro #000 exceto OLED |
| `--color-text` | ~#e0e0e0 | Nunca puro #fff — reduz halação |
| `--color-accent` | dessaturado 10-15% | Menor glow no escuro |

**Rationale:** <explicação semântica da escolha cromática>

## 4. Tipografia
**Pairing:** <nome do pairing>
- Display: `<Display Font>` — headings, hero text, labels grandes
- Body: `<Body Font>` — parágrafos, labels, tabelas
- Mono: `JetBrains Mono` — código, valores numéricos, IDs

**Escala tipográfica (Major Third — 1.25):**
xs: 12px · sm: 14px · base: 16px · lg: 18px · xl: 20px
2xl: 24px · 3xl: 30px · 4xl: 36px · 5xl: 48px · 6xl: 60px

**Pesos:** regular(400) · medium(500) · semibold(600) · bold(700)

## 5. Espaçamento & Layout
**Unidade base:** 4px
**Escala:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px
**Layout:** <modo de layout>
**Max content width:** 1200px (centered) | N/A (full-bleed)
**Sidebar width:** 280px | N/A
**Breakpoints:** 640 / 768 / 1024 / 1280 / 1536px

## 6. Componentes
**Border radius:** <valor do vocabulário de radius>
**Sombras:**
- xs: `0 1px 2px rgba(0,0,0,0.05)`
- sm: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- md: `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)`
- lg: `0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)`

**Anti-padrões para este estilo:** <3 coisas a evitar, específicas ao estilo escolhido>

## 7. Motion
**Nível:** <none / subtle / expressive>
**Library:** Motion/Framer Motion para React (skill: `motion-react`)
**Durations:** instant:50ms · fast:150ms · normal:250ms · slow:400ms
**Easing padrão:** cubic-bezier(0.4, 0, 0.2, 1)
**Spring:** stiffness:300 damping:30 (para elementos interativos)

## 8. Do's and Don'ts
**Do:**
- <específico ao estilo + paleta, ex: "Use backdrop-filter em overlays para manter glassmorphism">
- <específico ao produto, ex: "Mostre dados com tipografia tabular-nums">
- <específico ao mood>

**Don't:**
- <anti-padrão de AI-slop mais relevante para este estilo>
- <erro mais comum neste tipo de produto>
- <conflito entre estilo escolhido e uma tentação genérica>

## 9. Dimensões Resolvidas
| Dimensão | Valor | Fonte |
|----------|-------|-------|
| palette | <nome do pairing de paleta> | produto: <tipo> |
| estilo | <nome do estilo> | mood: <mood pedido> |
| tipografia | <nome do pairing> | use case match |
| layout | <valor> | <explícito/default> |
| density | <valor> | <explícito/default> |
| radius | <valor> | <explícito/default> |
| motion | <valor> | <explícito/default> |
| constraints | <valor ou "nenhum"> | <explícito/default> |
```

---

## STEP 6 — Preview visual (brief-preview.html)

Gere um arquivo HTML que renderiza:
- Swatches de cor com hex e nome do token
- Specimen tipográfico: display em todos os tamanhos, body em 16px/1.5
- Régua de espaçamento (4px até 96px)
- Sample: 1 botão primário, 1 card, 1 campo de input — no estilo resolvido

---

## Regras de transparência

Ao final do DESIGN.md, liste todas as dimensões resolvidas por default (sem entrada explícita do usuário), indicando o default aplicado. Nunca invente valores fora do vocabulário — se em dúvida, pergunte.

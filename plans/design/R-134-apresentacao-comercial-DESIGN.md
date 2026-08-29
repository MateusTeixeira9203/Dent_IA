# DESIGN — R-134 Apresentação comercial

_Derivado da identidade em produção em 26/08/2026. Nenhuma direção paralela foi criada._

## Produto e direção

**Tipo:** apresentação comercial presencial de um workspace clínico B2B.
**Estilo:** storytelling minimalista + interactive product demo, em registro dark fixo.
**Referência interna:** landing R-88, Dashboard, Meu Dia, ficha e Campo Mágico.
**Direção memorável:** um fio teal único atravessa o sistema e materializa o fluxo completo.

## Tokens copiados

| Token | Valor | Uso |
|---|---:|---|
| `--teal` | `#2f9c85` | progresso, foco, estados ativos |
| `--teal-lt` | `#5dbeb0` | texto/traço ativo sobre charcoal |
| `--teal-pale` | `#1e3a35` | superfícies tingidas |
| `--paper` | `#0d0d0d` | palco |
| `--surface` | `#111112` | interface principal |
| `--surface-alt` | `#1c1c1e` | controles e blocos elevados |
| `--ink` | `#fafafa` | texto principal |
| `--tx2` | `#a1a1aa` | texto secundário |
| `--tx3` | `#8d948d` | metadado e labels |
| `--coral` | `#ef9a9a` | pendência/saída |
| `--slate` | `#94a3b8` | histórico/pré-existente |
| `--warning` | `#fbbf24` | atenção/orçado |
| `--radius` | `10px` | raio base do produto |

## Tipografia

- Display/heading/wordmark: **DM Serif Display** 400, normal e italic.
- Corpo/controles: **Outfit** 300–700.
- Dados/preços/legendas: **DM Mono** 400–500.
- Fontes ficam locais em `public/assets/presentation/fonts/`.
- Escala: hero `clamp(52px, 7.2vw, 104px)`; h2 `clamp(40px, 5vw, 76px)`; body 16–22px.

## Composição

- Palco full-bleed 16:9, conteúdo com largura máxima de 1180px.
- Densidade spacious; uma ideia central por cena.
- Grid arquitetônico de 150px com opacidade baixa e brilho radial teal localizado.
- Cards só quando representam UI do produto; borda fina em dark, sombra restrita ao palco.
- Linha teal persistente liga problema, fluxo, paciente e gestão.

## Motion

**Peso:** Jakub primário · Emil secundário.
**Curva:** `cubic-bezier(.22,.7,.2,1)`.
**Cena:** 540ms; **beat:** 320ms; **microestado:** 180ms.
Entradas materializam com fade, translate curto e blur; saídas percorrem distância menor. Sem
bounce, zoom grande, parallax ou loops de atenção. Reduced motion resolve estados instantaneamente.

## Do / Don't

**Do:** usar espaço negativo, wordmark grande, traço teal como continuidade e interfaces derivadas
dos componentes reais. **Don't:** gradiente roxo, neon, glass em excesso, grid de cards genérico,
mascote infantil, feature dump, screenshot falso ou texto clínico que pareça diagnóstico autônomo.

## Dimensões resolvidas

| Dimensão | Valor | Fonte |
|---|---|---|
| palette | charcoal + teal canônicos | `globals.css` / landing R-88 |
| estilo | storytelling minimalista | briefing explícito |
| tipografia | DM Serif + Outfit + DM Mono | `src/app/layout.tsx` |
| layout | full-bleed | briefing explícito |
| density | spacious | briefing explícito |
| radius | default (10px) | token existente |
| motion | subtle/storytelling | briefing explícito |
| constraints | desktop, offline, reduced-motion | briefing explícito |

O próprio `public/apresentacao/index.html` é o preview visual executável deste brief.


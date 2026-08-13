---
name: design-shotgun
description: >
  Exploração visual de variantes de UI: gera 4 variantes do mesmo componente ou tela com
  direções visuais radicalmente diferentes, apresenta cada uma com seu conceito e trade-offs,
  e itera com base no feedback. Use quando o usuário quiser explorar direções antes de
  commitar: "me mostra opções", "quero ver variações", "explora direções de design",
  "qual estilo usar?", "como isso ficaria de formas diferentes?", "design shotgun".
cpe:
  source: cpe-fusion
  inspiration: garrytan/gstack — /design-shotgun concept (MIT)
  integrated_at: 2026-06-24
  adaptation: >
    Adaptado do conceito /design-shotgun do gstack: removida dependência de Playwright
    e browser automation. Variantes geradas como código React/HTML + descrição de conceito.
    Taste memory preservado como estado da conversa. Sem dependência de ferramentas externas.
---

# Design Shotgun

"Shoot four styles — pick what fits."

Você é um **Design Explorer**: gera múltiplas direções visuais para o mesmo elemento,
cada uma com identidade distinta e intencional, para que o usuário possa ver opções
reais antes de commitar com uma direção.

---

## STEP 0 — Entender o alvo

Antes de gerar qualquer coisa, confirme:
1. **O que está sendo explorado?** — componente, tela, seção, layout completo
2. **Contexto de produto** — o que esse produto é/faz (pode vir do DESIGN.md se existir)
3. **Constraints hard** — paleta da marca? framework? limite de complexidade?

Se o DESIGN.md existir no projeto, carregue-o. As variantes devem respeitar a paleta
de marca mas explorar livremente tipografia, layout, motion, densidade.

Se não existir DESIGN.md, gere variantes com paletas independentes.

---

## STEP 1 — Selecionar 4 direções visuais

Escolha 4 direções **genuinamente distintas** — não variações sutis da mesma ideia.
Boa shotgun = 4 filosofias diferentes respondendo ao mesmo problema.

**Framework de diversidade — inclua pelo menos:**
- 1 direção **minimal/funcional** (foco em clareza e velocidade)
- 1 direção **expressiva/bold** (foco em personalidade e memória)
- 1 direção **sistêmica/densa** (foco em informação e hierarquia)
- 1 direção **inesperada/criativa** (foco em diferenciação — não a mais óbvia)

Nomeie cada direção com um nome evocativo (não "Option 1") — ex: "Terminal Noir", "Bento Lite", "Bold Editorial", "Clay Studio".

---

## STEP 2 — Gerar as 4 variantes

Para cada variante, entregue:

### [Nome da Variante] — [1 linha de conceito]

**Referência visual:** produto/marca conhecido que usa essa estética
**Quando usar:** cenário onde essa direção vence

```tsx
// [Nome da Variante]
// Stack: React + Tailwind + Motion (ou CSS puro se mais adequado)
[código do componente completo, funcional e renderizável]
```

**Trade-offs:**
- Pontos fortes: [2-3 linhas específicas]
- Limitações: [1-2 linhas específicas]

---

## STEP 3 — Apresentação comparativa

Após gerar as 4, faça um sumário em tabela:

| Variante | Estilo | Melhor para | Trade-off principal |
|----------|--------|-------------|---------------------|
| [Nome 1] | ... | ... | ... |
| [Nome 2] | ... | ... | ... |
| [Nome 3] | ... | ... | ... |
| [Nome 4] | ... | ... | ... |

Termine com: **"Qual direção ressoa mais? Ou há elementos de mais de uma que você quer combinar?"**

---

## STEP 4 — Taste memory e iteração

### Registrar preferências do usuário (taste memory)

Quando o usuário selecionar, reagir ou dar feedback, **mentalmente anote**:

```
TASTE MEMORY (sessão atual):
✓ GOSTA: [o que ressoou — específico: "bordes retos", "tipografia grande", "dark", "cards com sombra sutil"]  
✗ EVITAR: [o que não funcionou — específico: "glassmorphism", "Inter sozinha", "muito colorido"]
→ DIREÇÃO: [síntese da direção preferida]
```

Use esse taste memory em todas as rodadas subsequentes para:
- **Eliminar** direções que contradizem preferências já manifestadas
- **Amplificar** elementos que ressoaram
- **Nunca repetir** exatamente a mesma variante

### Rodadas de iteração

**Se o usuário pedir ajustes em 1 variante:** refine só essa, mantendo as outras como referência.

**Se pedir uma nova shotgun:** gere 4 novas direções, mas agora filtradas pelo taste memory — sem as que já foram descartadas.

**Se misturar elementos:** gere 2-3 hybrids com os elementos combinados explicitamente nomeados.

---

## Princípios desta skill

**Cada variante deve ser opinionated.** Não gere variantes "seguras" ou "neutras" — cada uma deve ter uma identidade clara e defensável.

**O código deve funcionar.** Não entregue wireframes ou pseudo-código. Cada variante é código real, pronto para rodar.

**Nomeie o inimigo.** Cada variante deve ter pelo menos 1 limitação honesta. "Funciona perfeitamente para tudo" não é uma análise real.

**Diversidade > Qualidade média.** É melhor ter 4 direções radicalmente diferentes (mesmo que alguma seja ousada demais) do que 4 variações sutis todas "boas".

---

## Integração com o stack

- **Tipografia:** se houver DESIGN.md, use as fontes definidas. Se não, escolha fontes diferentes para cada variante do catálogo em `design-brief/references/typography.md`.
- **Motion:** variantes que pedem animação usam `motion/react` (ver skill `motion-react`). Variantes minimal podem usar CSS transitions puras.
- **Tokens:** se houver `design-system-tokens` ativo, variantes de produto usam os tokens. Variantes "marca" podem quebrá-los intencionalmente.
- **Depois de escolher:** passe para `frontend-design` (implementação full) ou `design-motion-principles` (se motion for central).

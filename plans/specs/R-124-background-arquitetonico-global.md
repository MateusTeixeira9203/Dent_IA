# R-124 — Background arquitetônico global

> **SPEC** · **R-124** · ✅ no ar e verificado; registro histórico
> **Aberto:** 2026-08-20 · **Fechado:** — · **Fase:** aprovada

## 1. Problema

Landing, produto e portas de entrada usam três fundos diferentes: grade editorial, canvas de
partículas e rede neural aleatória. A identidade fica fragmentada e o produto mantém animação,
mouse tracking e blur onde um fundo calmo seria mais legível e barato.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| O fundo do artefato R-121 vira a linguagem global | Manter partículas como protagonista | O refinamento aprovado vem da geometria contida, não do movimento contínuo |
| Um componente compartilhado com intensidade `marketing` ou `product` | Três implementações independentes | Evita nova divergência entre landing, auth e dashboard |
| Entrada leve e depois fundo estático | Rede animada infinita | Menor distração, CPU/GPU e variabilidade visual |
| Base adaptável ao tema no produto | Forçar o app inteiro para dark | Light e dark continuam sendo modos suportados |

## 3. Objetivo e como funciona

**Objetivo:** landing, portas públicas e produto compartilham o mesmo fundo arquitetônico sem
alterar conteúdo, componentes, navegação ou regras de negócio.

O fundo combina grade estrutural, duas molduras rotacionadas e um brilho radial localizado. A
versão de marketing é mais presente; a versão do produto é mais discreta. Em celular a geometria
é reduzida. `prefers-reduced-motion` remove a entrada.

## 4. Contrato técnico

```ts
export type BrandBackgroundVariant = 'marketing' | 'product';
export type BrandBackgroundTone = 'theme' | 'charcoal';

export interface BrandBackgroundProps {
  variant?: BrandBackgroundVariant;
  tone?: BrandBackgroundTone;
  position?: 'absolute' | 'fixed';
  opacity?: number;
}
```

- `BrandBackground` é estático: sem estado, canvas, `Math.random`, listener ou `requestAnimationFrame`.
- `NeuralBackground` preserva a API atual e delega para `BrandBackground` para não editar sete
  consumidores sem necessidade.
- `DashboardShell` troca `ParticleNetwork`, glow inline e dois blobs por
  `BrandBackground variant="product" position="fixed"`.
- Landing troca somente a camada `.grade` por
  `BrandBackground variant="marketing" tone="charcoal" position="fixed"`.
- Zero schema, API, auth, RLS ou dependência nova.

## 5. Comportamento — o alvo funcional

| Estado | Resultado |
|---|---|
| Dark | Linhas teal e grade aparecem discretamente sobre o fundo escuro |
| Light | Linhas e grade perdem intensidade e preservam contraste dos cards |
| Mobile | Moldura secundária some; grade e brilho ficam mais suaves |
| Movimento reduzido | Fundo nasce estático, sem transição |
| Carregamento/erro/permissão/conflito | N/A — camada puramente apresentacional e determinística |

## 6. Referência visual

- **Artefato aprovado:** `plans/artefatos/R-121-login-convite.html`
- **Rotas alvo:** `/`, portas públicas e todas as rotas sob `/dashboard`
- **Componentes alvo:** `BrandBackground`, `NeuralBackground`, `DashboardShell`, landing

| Token/medida | Valor extraído/contratado |
|---|---|
| Base dark | `#0d0d0d` (`brand-charcoal`) |
| Teal / teal claro | `#2f9c85` / `#5dbeb0` |
| Grade estrutural | passo `150px`, opacidade máxima `4%` |
| Moldura principal | quadrado `520px`, borda `0.8px`, teal claro `18%`, rotação `18deg` |
| Moldura secundária | quadrado `320px`, mesma borda e rotação |
| Glow | radial `520px`, teal `18%` até transparente em `66%` |
| Entrada | `700ms`, somente opacidade e deslocamento pequeno |

No produto, molduras, grade e glow usam aproximadamente 60% da intensidade de marketing.

## 7. Invariantes

- [ ] Nenhum card, input, layout, copy ou fluxo muda neste item.
- [ ] O fundo nunca captura clique nem cria rolagem horizontal.
- [ ] Light e dark usam tokens semânticos; nenhuma página do produto é forçada para dark.
- [ ] Não existe animação contínua nem posição aleatória.
- [ ] A landing preserva integralmente a estrutura aprovada no R-88.

## 8. Gates de aceite

- [ ] `/`, `/login` e uma rota de convite renderizam o mesmo vocabulário de fundo.
- [ ] Dashboard, Meu Dia e ficha do paciente mostram a variante discreta sem reduzir a leitura.
- [ ] 375px, 768px e 1440px não têm overflow horizontal causado pelo fundo.
- [ ] Light e dark mantêm cards, texto e foco legíveis.
- [ ] `prefers-reduced-motion: reduce` elimina a animação de entrada.
- [ ] Busca no runtime não encontra mais `ParticleNetwork` montado nem animações neurais infinitas.
- [ ] TypeScript e lint dos arquivos alterados passam.

## 9. Fora de escopo

- Padronização de cards, botões, inputs, tipografia ou espaçamentos do sistema.
- Redesign de telas além da camada de fundo.
- Implementação completa do R-121 ou do PWA.

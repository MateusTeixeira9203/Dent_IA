# DENT IA — GUIA DE DESIGN OBRIGATÓRIO
# Cole este bloco no início de TODO prompt antes de implementar 
# qualquer funcionalidade nova.

---

## IDENTIDADE DO PROJETO

DentAI é um SaaS odontológico premium para profissionais de saúde.
O design deve transmitir: inovação, confiança, sofisticação e 
clareza. Funciona para dentistas jovens e experientes.

---

## STACK DE DESIGN

- Tailwind CSS v4 com @theme inline
- shadcn/ui para componentes base
- Framer Motion para animações sutis
- Fontes: Outfit (sans) | DM Mono (mono) | DM Serif Display (serif)
- Componentes da marca em: src/components/dentai/index.tsx

---

## TOKENS DE COR — USE SEMPRE ESTES

Tailwind classes:
- Fundo principal:     bg-background
- Surface/cards:       bg-card
- Texto principal:     text-foreground
- Texto secundário:    text-muted-foreground
- Cor da marca:        text-primary / bg-primary / border-primary
- Bordas:              border-border
- Inputs:              bg-input

CSS variables (para inline styles):
- Teal:                hsl(var(--primary))
- Teal 10%:            hsl(var(--primary) / 0.10)
- Fundo:               hsl(var(--background))
- Card:                hsl(var(--card))

NUNCA use cores hardcoded como #3A9E90 ou bg-teal-500.
SEMPRE use as variáveis acima para garantir dark mode correto.

---

## TIPOGRAFIA — REGRAS RÍGIDAS

| Uso                          | Classe                                    |
|------------------------------|-------------------------------------------|
| Títulos de página            | font-serif text-2xl tracking-tight        |
| Subtítulos de seção          | font-sans font-medium text-base           |
| Labels de tabela/seção       | font-mono text-[0.65rem] uppercase        |
|                              | tracking-widest text-muted-foreground     |
| Corpo / parágrafos           | font-sans text-sm text-foreground         |
| Textos secundários           | font-sans text-sm text-muted-foreground   |
| Números / preços / datas     | font-mono text-sm                         |
| CPF / telefone / códigos     | font-mono text-sm text-muted-foreground   |
| Botões                       | font-sans font-medium text-sm             |
| Placeholders                 | placeholder:text-muted-foreground         |

NUNCA use font-bold em textos de interface — use font-medium (500)
ou font-semibold (600) no máximo.

---

## COMPONENTES — HIERARQUIA DE USO

SEMPRE use nesta ordem de preferência:
1. Componentes da marca:  src/components/dentai/index.tsx
   → Button, Badge, Card, Input, StatCard, SectionLabel
2. shadcn/ui apenas para:
   → Dialog, Tabs, Skeleton, Sheet, DropdownMenu, Tooltip
3. HTML nativo apenas para:
   → table, tr, td (dentro de cards)

NUNCA crie botões, inputs ou cards do zero com classes Tailwind
puras — sempre use os componentes acima.

---

## PADRÕES DE LAYOUT

### Páginas do dashboard:
- Padding: p-6 ou px-6 py-8
- Max width do conteúdo: max-w-6xl (nunca full width sem limite)
- Gap entre seções: mb-10 ou mb-12

### Header de página (padrão obrigatório):
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="font-serif text-2xl text-foreground tracking-tight">
      {titulo}
    </h1>
    <p className="font-mono text-sm text-muted-foreground mt-1">
      {subtitulo}
    </p>
  </div>
  {/* Ação principal à direita se houver */}
</div>

NUNCA duplique o título — o header do layout já mostra o nome
da página. O h1 dentro da página é o título PRINCIPAL da seção.

### Cards:
- bg-card border border-border rounded-lg
- Padding interno: p-6
- Hover: hover:border-muted-foreground/50 transition-colors
- SEM sombra — bordas definem os cards

### Tabelas (dentro de cards):
- Container: bg-card border border-border rounded-lg overflow-hidden
- Header TH: font-mono text-[0.65rem] uppercase tracking-widest 
             text-muted-foreground px-4 py-3
- Linhas TR: border-b border-border last:border-b-0
             hover:bg-background/50 transition-colors
- Altura das linhas: py-3 (48px visual)
- Ações: opacity-0 group-hover:opacity-100 transition-opacity

### Inputs e formulários:
- Use sempre o componente Input da marca
- Labels: font-sans text-sm font-medium text-foreground mb-1.5
- Agrupamentos em grid: grid grid-cols-2 gap-4
- Seções do form em Cards separados com SectionLabel no topo
- Botão submit: sempre largura total (w-full) no final do form

---

## ANIMAÇÕES — FRAMER MOTION

Importe sempre:
import { motion } from 'framer-motion'

Constantes padrão (copie exatamente):
const spring = { type: "spring", duration: 0.3, bounce: 0 }

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}

const itemVariant = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 }
}

Quando usar cada um:
- spring → sidebar active indicator (layoutId)
- stagger + itemVariant → listas (atividade recente, tabelas)
- whileHover={{ y: -2 }} → cards de métricas
- animate-fade-in → páginas ao carregar (já no globals.css)
- animate-record-pulse → botão de gravação (já no globals.css)

NUNCA use animações pesadas, bounce exagerado ou duração > 0.4s.
Animações devem ser sentidas, não vistas.

---

## DARK MODE — REGRAS OBRIGATÓRIAS

O dark mode DEVE funcionar perfeitamente em toda tela nova.

Checklist antes de commitar qualquer tela:
✓ Todos os textos usam text-foreground ou text-muted-foreground
✓ Todos os fundos usam bg-background, bg-card ou bg-sidebar
✓ Todas as bordas usam border-border
✓ Todos os inputs usam bg-input
✓ Nenhuma cor hardcoded (#hex ou rgb()) sem variável CSS
✓ Avatares: bg-primary/10 text-primary (funciona em ambos os modos)
✓ Badges: bg-primary/10 text-primary OU variante amber
✓ Overlays: bg-black/50 (funciona em ambos)

Cores proibidas em componentes:
- bg-white → use bg-card ou bg-background
- bg-gray-* → use bg-muted ou bg-card
- text-gray-* → use text-muted-foreground
- text-black → use text-foreground
- border-gray-* → use border-border

---

## BADGES E STATUS

Padrão obrigatório para todos os status do sistema:

| Status        | Classes                                              |
|---------------|------------------------------------------------------|
| aberta        | bg-amber-500/15 text-amber-700                       |
|               | dark: text-amber-400                                 |
| concluída     | bg-primary/10 text-primary                           |
| aprovado      | bg-primary/10 text-primary                           |
| rascunho      | bg-muted text-muted-foreground                       |
| enviado       | bg-blue-500/10 text-blue-600 dark:text-blue-400      |
| recusado      | bg-destructive/10 text-destructive                   |
| pendente      | bg-amber-500/15 text-amber-700                       |
| pago          | bg-primary/10 text-primary                           |

---

## AVATARES COM INICIAIS

Padrão único para todo o sistema:

<div className="w-9 h-9 rounded-full bg-primary/10 
                flex items-center justify-center flex-shrink-0">
  <span className="font-mono text-sm text-primary font-medium">
    {iniciais}
  </span>
</div>

Tamanhos:
- sm: w-7 h-7 text-xs
- md: w-9 h-9 text-sm  ← padrão
- lg: w-11 h-11 text-base

---

## ESTADOS ESPECIAIS

### Loading / Skeleton:
- Use Skeleton do shadcn/ui
- Skeleton deve replicar o layout real da página
- NUNCA deixe tela em branco — sempre use Suspense + Skeleton

### Estado vazio (empty state):
<div className="flex flex-col items-center justify-center 
                py-16 text-center">
  <Icon size={40} className="text-muted-foreground/30 mb-4" />
  <h3 className="font-serif text-lg text-foreground mb-2">
    {titulo}
  </h3>
  <p className="font-sans text-sm text-muted-foreground mb-6 
                max-w-sm">
    {descricao}
  </p>
  <Button variant="outline">{acao}</Button>
</div>

### Erros:
- Toast via sonner — sempre no canto inferior direito
- Nunca use alert() nativo
- Mensagens de erro: font-sans text-sm, sem jargão técnico

---

## O QUE NUNCA FAZER

❌ Gradientes coloridos em cards ou botões
❌ Sombras box-shadow exageradas
❌ border-radius > 8px nos cards principais
❌ Múltiplos níveis de fundo escuro (card dentro de card escuro)
❌ Ícones > 20px na interface (exceto estados vazios: 40px)
❌ Textos em uppercase sem font-mono e tracking-widest
❌ Botões com largura automática em formulários — sempre w-full
❌ Títulos duplicados (header já mostra o título da rota)
❌ Cores hardcoded sem variável CSS
❌ Animações com duration > 0.4s
❌ router.push() para links visíveis — use <Link>
❌ Fetch sequencial — sempre Promise.all

---

## CHECKLIST ANTES DE ENTREGAR QUALQUER TELA

[ ] Dark mode testado e funcionando
[ ] Todas as cores usam variáveis CSS (sem hardcode)
[ ] Tipografia segue a tabela acima
[ ] Animações com Framer Motion aplicadas
[ ] Estados: loading (Skeleton), vazio (EmptyState), erro (Toast)
[ ] Nenhum título duplicado
[ ] Componentes da marca usados (Button, Card, Input, Badge)
[ ] Ações de tabela aparecem só no hover
[ ] Formulários com validação zod + react-hook-form
[ ] revalidatePath após todo INSERT/UPDATE
[ ] Promise.all para queries paralelas
[ ] <Link> para toda navegação interna
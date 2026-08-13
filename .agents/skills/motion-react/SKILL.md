---
name: motion-react
description: >
  API de animação Motion (Framer Motion) para React. Cobre o componente motion, variants,
  AnimatePresence, useMotionValue, useTransform, useSpring, layout animations (layoutId),
  scroll-driven animations, gestures (drag/hover/tap), e stagger. Use quando implementando
  animações em React com Motion/Framer Motion: transições de componente, hover states,
  exit animations, layout transitions, spring physics, scroll animations, drag interactions.
  Este skill é a implementação concreta — para princípios e decisões de motion, use design-motion-principles.
cpe:
  source: cpe-authored
  integrated_at: 2026-06-24
  notes: >
    Escrito a partir da API oficial do Motion 11+ (motion.dev).
    Package: framer-motion (React) ou motion/react (novo alias).
    Complementa design-motion-principles que referencia Motion mas não tem o cookbook de API.
---

# Motion for React — API Reference

Motion (anteriormente Framer Motion) — biblioteca de animação para React.

```bash
npm install framer-motion
# ou (alias mais novo, mesma lib):
npm install motion
```

```tsx
// Import styles (escolha um):
import { motion, AnimatePresence } from "framer-motion"
import { motion, AnimatePresence } from "motion/react"  // alias equivalente
```

---

## motion component — o básico

Qualquer elemento HTML ou SVG pode ser animado prefixando com `motion.`:

```tsx
// Fade in simples
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  Conteúdo
</motion.div>

// Hover + tap
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  Clique
</motion.button>
```

### Props principais do motion component

| Prop | Tipo | O que faz |
|------|------|-----------|
| `initial` | object / string | Estado inicial (antes de montar) |
| `animate` | object / string | Estado alvo |
| `exit` | object / string | Estado ao desmontar (requer AnimatePresence) |
| `transition` | object | Controle de duração, easing, delay |
| `variants` | object | Mapa de estados nomeados |
| `whileHover` | object | Estado durante hover |
| `whileTap` | object | Estado durante tap/click |
| `whileDrag` | object | Estado durante drag |
| `whileInView` | object | Estado quando visível na viewport |
| `whileFocus` | object | Estado durante focus |
| `layout` | boolean / "position" / "size" | Anima mudanças de layout |
| `layoutId` | string | Shared layout animation entre componentes |
| `drag` | boolean / "x" / "y" | Habilita drag |
| `dragConstraints` | object / ref | Limita área de drag |

---

## Transitions — controle de timing

```tsx
// Tween (curva de easing)
transition={{
  duration: 0.3,          // segundos
  delay: 0.1,
  ease: "easeOut",        // ou cubic-bezier array: [0.4, 0, 0.2, 1]
  repeat: Infinity,       // repetição
  repeatType: "reverse",  // "loop" | "reverse" | "mirror"
}}

// Spring (física de mola — preferido para interações)
transition={{
  type: "spring",
  stiffness: 300,   // rigidez (maior = mais rápido/tenso)
  damping: 30,      // amortecimento (menor = mais oscilação)
  mass: 1,          // massa (maior = mais inércia)
}}

// Spring presets úteis
// Snap (rápido, sem oscilação):  stiffness: 500, damping: 40
// Bouncy (suave, com bounce):    stiffness: 200, damping: 15
// Fluid (natural, responsivo):   stiffness: 300, damping: 30

// Inertia (física de momentum — bom pós-drag)
transition={{ type: "inertia", velocity: 50 }}
```

### Easing strings disponíveis

```
"linear" | "easeIn" | "easeOut" | "easeInOut"
"circIn" | "circOut" | "circInOut"
"backIn" | "backOut" | "backInOut"   // overshoot
"anticipate"                          // pull back then forward
```

---

## Variants — estados nomeados e orquestração

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,    // delay entre filhos
      delayChildren: 0.2,      // delay antes do primeiro filho
      when: "beforeChildren",  // "beforeChildren" | "afterChildren"
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

// Uso: variantes se propagam automaticamente para filhos com o mesmo nome
function AnimatedList({ items }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.label}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

---

## AnimatePresence — exit animations

Obrigatório para animar elementos que saem do DOM:

```tsx
import { motion, AnimatePresence } from "framer-motion"

function Modal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-xl p-6"
            initial={{ opacity: 0, scale: 0.95, y: "-48%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-48%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* conteúdo */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### AnimatePresence para listas (key obrigatório)

```tsx
<AnimatePresence mode="popLayout">  // "sync" | "wait" | "popLayout"
  {items.map((item) => (
    <motion.div
      key={item.id}              // CRÍTICO: key estável para detectar remoção
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {item.content}
    </motion.div>
  ))}
</AnimatePresence>
```

| mode | Comportamento |
|------|---------------|
| `"sync"` (default) | Enter e exit ao mesmo tempo |
| `"wait"` | Exit termina antes de enter começar |
| `"popLayout"` | Elemento saindo "flutua" acima do layout |

---

## Layout Animations

```tsx
// layout prop: anima mudanças de posição/tamanho automaticamente
<motion.div layout className="flex flex-col gap-4">
  {items.map(item => (
    <motion.div key={item.id} layout>
      {item.content}
    </motion.div>
  ))}
</motion.div>

// Expand/collapse
function Accordion({ isOpen }) {
  return (
    <motion.div layout>
      <motion.h3 layout>Título</motion.h3>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Conteúdo expandido
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

### layoutId — Shared Element Transitions

```tsx
// Componente A (lista)
<motion.div layoutId={`card-${item.id}`} className="w-32 h-20 rounded-lg bg-blue-500" />

// Componente B (modal/detalhe)
<motion.div layoutId={`card-${item.id}`} className="fixed inset-0 bg-blue-500" />

// Motion interpola automaticamente entre os dois — sem código de animação extra
```

---

## Motion Values — animações reativas e programáticas

```tsx
import { useMotionValue, useTransform, useSpring, motion } from "framer-motion"

function TiltCard() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Mapear valores de motion para outros valores
  const rotateX = useTransform(y, [-100, 100], [15, -15])
  const rotateY = useTransform(x, [-100, 100], [-15, 15])

  // Suavizar com spring (opcional)
  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 20 })
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 20 })

  return (
    <motion.div
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 1000 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left - rect.width / 2)
        y.set(e.clientY - rect.top - rect.height / 2)
      }}
      onMouseLeave={() => { x.set(0); y.set(0) }}
    >
      Card com tilt 3D
    </motion.div>
  )
}
```

### useTransform — mapeamento de valores

```tsx
const scrollY = useMotionValue(0)

// Mapeamento linear
const opacity = useTransform(scrollY, [0, 300], [1, 0])
const scale = useTransform(scrollY, [0, 300], [1, 0.8])

// Clamp automático: valores fora do range são clamped

// Múltiplos inputs
const background = useTransform(
  [scrollY, mouseX],
  ([latestY, latestX]) => `hsl(${latestX / 5}, ${latestY / 10}%, 50%)`
)
```

---

## Scroll Animations

```tsx
import { useScroll, useTransform, motion } from "framer-motion"
import { useRef } from "react"

// Scroll da página toda
function ParallaxHero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])

  return (
    <motion.div style={{ y }} className="absolute inset-0">
      <img src="/hero-bg.jpg" className="w-full h-full object-cover" />
    </motion.div>
  )
}

// Scroll relativo a um elemento específico
function RevealSection() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],  // [quando o target entra, quando sai]
  })
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])
  const y = useTransform(scrollYProgress, [0, 0.3], [40, 0])

  return (
    <motion.section ref={ref} style={{ opacity, y }}>
      Conteúdo que revela no scroll
    </motion.section>
  )
}
```

### whileInView — reveal simples (sem Motion Values)

```tsx
// Mais simples que useScroll para reveals básicos
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}  // once: anima só uma vez
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  Revela quando entra na viewport
</motion.div>
```

---

## Gestures

```tsx
// Drag básico
<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.2}          // resistência nas bordas (0 = rígido, 1 = elástico)
  dragMomentum={true}        // mantém momentum ao soltar
  whileDrag={{ scale: 1.05 }}
/>

// Drag em 1 eixo
<motion.div drag="x" dragConstraints={{ left: 0, right: 300 }} />

// Drag com ref de container
const constraintsRef = useRef(null)
<div ref={constraintsRef} className="relative w-full h-64 overflow-hidden">
  <motion.div drag dragConstraints={constraintsRef} />
</div>

// Callbacks de drag
<motion.div
  drag
  onDragStart={(event, info) => console.log(info.point)}
  onDrag={(event, info) => console.log(info.delta)}
  onDragEnd={(event, info) => {
    if (info.offset.x > 100) handleSwipeRight()
  }}
/>
```

---

## Stagger — animações em cascata

```tsx
// Padrão com variants (recomendado)
const list = {
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  }
}
const item = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

// Custom stagger com index
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05, duration: 0.3 }}
  />
))}
```

---

## useAnimate — controle imperativo

```tsx
import { useAnimate } from "framer-motion"

function SubmitButton() {
  const [scope, animate] = useAnimate()

  async function handleSubmit() {
    // Sequência de animações
    await animate(scope.current, { scale: 0.97 }, { duration: 0.1 })
    await animate(scope.current, { scale: 1 }, { type: "spring" })
    
    // Animar filhos com seletor CSS
    animate("span", { opacity: 0 }, { duration: 0.2 })
    animate(".spinner", { opacity: 1 }, { duration: 0.2 })
  }

  return (
    <motion.button ref={scope} onClick={handleSubmit}>
      <span>Enviar</span>
      <div className="spinner hidden" />
    </motion.button>
  )
}
```

---

## Patterns prontos

### Page transition (Next.js App Router)

```tsx
// app/template.tsx (não layout.tsx — template re-monta em cada navegação)
"use client"
import { motion } from "framer-motion"

export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
```

### Toast / Notification

```tsx
function Toast({ message, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4"
      >
        {message}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Skeleton → Content transition

```tsx
function DataCard({ isLoading, data }) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          exit={{ opacity: 0 }}
          className="animate-pulse bg-gray-200 rounded h-32"
        />
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {data}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Floating action button com menu

```tsx
const menuVariants = {
  closed: { opacity: 0, scale: 0.8, y: 10 },
  open: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30, staggerChildren: 0.05 }
  }
}
const itemVariants = {
  closed: { opacity: 0, x: -10 },
  open: { opacity: 1, x: 0 }
}
```

---

## Acessibilidade — prefers-reduced-motion

```tsx
import { useReducedMotion } from "framer-motion"

function AnimatedCard({ children }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      {children}
    </motion.div>
  )
}
```

---

## Integração com o stack

- **Princípios:** `design-motion-principles` define QUANDO e QUANTO animar (frequência gate, Emil/Jakub/Jhey). Este skill define COMO implementar.
- **Tokens de motion:** `design-system-tokens` define durations e easings padrão — use-os nos `transition` configs.
- **Alternativa:** `gsap-core` para timelines complexas, ScrollTrigger e animações fora do React. Use Motion como default em React.

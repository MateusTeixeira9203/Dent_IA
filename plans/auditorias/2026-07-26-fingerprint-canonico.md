# Fingerprint canônico — Odonto.IA (a régua do design)

> Saída da fase **Calibrar** do audit visual do Fable (2026-07-26). Base: Dashboard + Modo Consulta,
> as telas de referência. É a **régua** contra a qual toda outra tela é medida — reutilizável no
> pipeline de design (regra 4 do CLAUDE.md). Fonte da verdade dos tokens: `src/app/globals.css`.

**Nota de captura:** os 4 arquivos `consulta-demo-*` capturaram na verdade a tela de **login**
(redirect da rota demo pública). O Modo Consulta foi julgado por `consulta-light/dark-desktop.png`
(logado) + código de `src/app/consulta/[agendamentoId]/_components/`.

## 1. Paleta e tokens — "teal contido, cor sempre semântica"

Marca: teal `#2f9c85`, teal-lt `#5dbeb0`, teal-dark/ink `#1e7060`, teal-pale `#e4f4f1` (light) /
`#1e3a35` (dark). Semânticas: coral `#e57373`/`#ef9a9a` (negativo), slate `#64748b`/`#94a3b8`,
warning `#f59e0b`/`#fbbf24`. Neutros light: bg `#f4f4f6`, surface `#fff`, surface-alt `#dadade`,
border `#e2e2e5`, texto `#09090b`/`#4b5563`/`#6b7280`. Neutros dark: bg `#0d0d0d`, surface `#111112`,
surface-alt `#1c1c1e`, border `#27272a`, texto `#fafafa`/`#a1a1aa`/`#8d948d`.

**Lei do sistema:** texto sobre fundo tingido usa sempre o token `-ink` (em dark, ink = cor cheia,
exceto teal→teal-lt); a cor cheia serve para fill, borda, ponto e traço — nunca para texto em light.
Zero hex fora desses; rgba inline é sempre derivado de `47,156,133` / `239,68,68` / `245,158,11`,
alpha 0.04–0.5, nunca cor nova. Fundo não é chapado: light tem lavagem menta com padrão neural
(pontos em grade 32px + constelação, quase subliminar); dark tem aurora teal sobre charcoal.
Estados de tempo escalam teal → amber → red — **a cor significa, nunca decora.**

## 2. Tipografia — três vozes, cada uma com um trabalho

- **DM Serif Display 400** (único peso, itálico disp.) em **todo** heading (h1–h6 global, text-shadow
  `0 1px 2px rgba(0,0,0,0.04)`). Escala: h1 `text-4xl md:text-5xl tracking-tight` → seção
  `text-xl font-semibold` → até `text-sm` no nome do paciente da sidebar. Serif desce de escala sem perder a voz.
- **Outfit** = corpo: labels `text-sm font-semibold`, apoio `text-xs`, pesos medium–bold, nunca light.
- **DM Mono 400/500** em **todo número**: data-eyebrow, hora, contadores, `R$`, chips de dente,
  countdown com `tabular-nums`. Métricas usam `padStart(2,'0')` ("00") em `font-heading text-6xl md:text-7xl`,
  opacidade `/40` quando zeradas — dado ausente rebaixado, nunca escondido.
- **Padrão de assinatura = o eyebrow:** micro-label uppercase, `font-bold/black`, tracking 0.18–0.25em,
  em cor muted/estado, acima do título serif. Repete no header, no hero ("DIA TRANQUILO") e nas seções da consulta.

## 3. Espaçamento, grid e densidade

Ritmo vertical do dashboard: blocos `mb-8 md:mb-10`. Cards de métrica `p-6`, hero `p-8 md:p-12`,
gaps `gap-3 md:gap-4`, grid 2col mobile → 3col desktop. Consulta opera em densidade "cockpit":
sidebar 360px, seções `p-3` — densidade sobe, hierarquia eyebrow/título/apoio idêntica.
**Raio hierárquico, nunca bubbly uniforme:** página `rounded-3xl` (24px) → CTAs/cards grandes `2xl`
→ botões/inputs `xl` → chips `md/lg` → pills `full`. O raio decresce com o tamanho do elemento.

## 4. Padrões de componente

- **Card:** `bg-surface border border-border rounded-3xl`, hover `-translate-y-0.5 hover:shadow-md`.
- **Acento de estado:** barra de 2px no topo em gradiente (`cor 0% → cor/0.35 55% → transparent`),
  3px quando urgente; `border-l-2` colorida nas seções da consulta.
- **Sombra:** sempre tingida, spread negativo — `0 16px 48px -16px rgba(47,156,133,.14–.30)`. Nunca preta pesada.
- **Botão primário:** gradiente teal 135deg `#2f9c85 → #1d7a65`, texto branco bold, glow
  `0 8px 32px rgba(47,156,133,.38)` + inset highlight, pulso `btn-glow` 3s, hover levanta, active `scale-[0.98]`.
- **Secundário:** `border border-border text-text-secondary hover:bg-surface-alt`.
- **Chip/badge (fórmula fixa):** fundo cor/8–10% + borda cor/20–25% + texto ink (light) / cor cheia (dark),
  `text-xs`/`text-[10px] font-semibold`. Chip de dente `w-7 h-6 rounded-md font-mono font-bold`.
- **Action card:** ícone em quadrado `w-12 h-12 rounded-2xl bg-surface-alt`, título + apoio, contador
  mono `text-3xl`, chevron com `group-hover:translate-x-0.5`.
- **Estado vazio:** o mesmo card, ícone teal em quadrado `bg-teal/10 border-teal/20`, título serif
  afirmativo ("Tudo em ordem."), apoio de uma linha — nunca ilustração genérica.
- **Dock:** pill flutuante `bottom-6`, sempre-dark `rgba(12,17,14,.88)` blur(20px), borda `white/.07`,
  labels micro uppercase, Dex-ball gradiente teal + halo ping, avatar com ponto de presença.

## 5. Iconografia

Lucide exclusivo, um peso de traço, tamanhos travados: `w-3/3.5` micro, `w-4` botões/linhas,
`w-5` dentro dos quadrados 12×12, `w-6/7` só destaque. Ícone sempre `text-text-secondary` ou cor de
estado — nunca preto puro, nunca em círculo colorido decorativo. Glifo da marca = dente outline;
Dex = `Bot` em círculo gradiente teal + ping.

## 6. Motion — sentida, não percebida

Entradas `y:20→0, opacity 0→1, 0.4s, ease [0.22,1,0.36,1]`. Expansões `AnimatePresence` height auto.
Micro: hover `-translate-y-0.5`, chevron `translate-x-0.5`, active `scale-[0.98]`. Pulso (`animate-ping`)
**só onde há semântica ao vivo** (gravação, crítico, "HOJE", presença). IA nunca é spinner cru: é o
`DexLoader` ou o ritual da consulta (avatar Dex + ondas + labels progressivos). Nada gira/quica sem motivo.

## 7. O que faz parecer "clínica grande"

(a) serif editorial + mono numérico + sans neutra — combinação que nenhum template tem; (b) teal com
avareza (90% da tela é neutra, cor só onde há ação/estado); (c) dados rebaixados por opacidade, nunca
omitidos; (d) copy direta em PT-BR de gente, zero genérico; (e) dark e light são a mesma tela, não dois temas.

## 8. Régua de medição (checklist pra auditar qualquer tela nova)

1. Todo heading DM Serif? Todo número DM Mono? Eyebrow uppercase tracking ≥0.18em acima dos títulos de bloco?
2. Só tokens do globals.css (ou rgba de teal/red/amber)? Texto sobre fundo tingido em `-ink`?
3. Blocos `mb-8 md:mb-10`, cards `p-6`, raio decrescente 3xl→2xl→xl→md conforme o elemento encolhe?
4. Sombras tingidas com spread negativo? Acentos como barras de 2–3px em gradiente, não fundos chapados?
5. Chips na fórmula fundo/8–10% + borda/20–25% + texto ink? Ícones lucide no tamanho do contexto?
6. Hover levanta 2px, active comprime 2%, ping só em estado vivo, IA carrega com DexLoader/ritual Dex?
7. Estado vazio com título serif afirmativo + ícone teal em quadrado?
8. Proibições: nenhum gradiente fora da família teal, nenhum grid de 3 ícones em círculo, nenhum raio
   uniforme, nenhuma copy genérica, nunca Inter.

Tela que responde "sim" às 8 parece feita pela mesma equipe do Dashboard e do Modo Consulta.

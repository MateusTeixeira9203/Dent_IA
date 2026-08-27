# DESIGN.md — R-116 · Abertura do PWA

## Contexto

PWA clínico instalado, usado diariamente. A abertura deve reforçar identidade sem adiar o acesso
ao dashboard. Usa a identidade existente; não é rebrand e não cria uma tela de onboarding.

## Direção resolvida

| Dimensão | Valor | Fonte |
|---|---|---|
| Produto | SaaS clínico / PWA mobile | projeto existente |
| Paleta | carvão + teal existente | `globals.css` |
| Tipografia | DM Serif Display + Outfit | `src/app/layout.tsx` |
| Layout | full-bleed centralizado | abertura de app |
| Densidade | compacta | janela de até 450 ms |
| Raio | não aplicável | overlay sem card |
| Motion | sutil | decisão do usuário em 2026-08-27 |
| Acessibilidade | `prefers-reduced-motion` | obrigatório |

## Visual

- Fundo `--color-brand-charcoal` (`#0d0d0d`); símbolo em `--color-teal` (`#2f9c85`);
  wordmark em `--color-text-primary`.
- O símbolo começa exatamente no centro. Em 220 ms, desloca 52 px para a esquerda; em paralelo,
  “Odonto.IA” entra 12 px pela direita com opacidade e blur de 2 px para zero.
- Curva: `cubic-bezier(.22, 1, .36, 1)`; sem bounce, escala, giro, loop, gradiente ou brilho.
- A sobreposição cobre somente o PWA em modo standalone e sai em 120 ms após 420 ms totais.

## Não fazer

- Não aplicar em navegações internas, login no navegador ou abertura de modal.
- Não manter a animação enquanto espera dados, nem simular carregamento.
- Com redução de movimento, apresentar o estado final e sair imediatamente.

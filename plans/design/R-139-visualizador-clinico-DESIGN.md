# DESIGN.md — R-139 Visualizador clínico

> Gerado em 2026-08-28 · status: rascunho para aprovação visual

## 1. Produto e contexto

- **Tipo:** SaaS B2B odontológico, superfície clínica de alta atenção.
- **Público:** dentista durante consulta; paciente acompanha somente no palco de Apresentação.
- **Restrição determinante:** não é uma identidade nova. Deve parecer continuação de Dashboard,
  Meu Dia, Ficha e Apresentação existentes, em light e dark.
- **Decisão de direção:** painel instrumental clínico — chrome discreto, imagem como foco e
  controles pequenos, explícitos e sempre alcançáveis. Não é editor fotográfico.

## 2. Paleta e tokens existentes

Não houve escolha de nova paleta porque o projeto já possui identidade aprovada. Valores extraídos
de `src/app/globals.css`; a implementação usará tokens semânticos, não estes hex diretamente.

| Token | Light | Dark | Uso no visualizador |
|---|---:|---:|---|
| `--color-bg` | `#f4f4f6` | `#0d0d0d` | entorno da Ficha |
| `--color-surface` | `#ffffff` | `#111112` | cartões e toolbar de Arquivos |
| `--color-surface-alt` | `#dadade` | `#1c1c1e` | superfícies secundárias |
| `--color-border` | `#c2c2c6` | `#27272a` | divisórias e contornos |
| `--color-text-primary` | `#09090b` | `#fafafa` | nomes e valores |
| `--color-text-secondary` | `#4b5563` | `#a1a1aa` | metadados e labels |
| `--color-teal` | `#2f9c85` | `#2f9c85` | foco, controles ativos e ação positiva |
| `--color-teal-lt` | `#5dbeb0` | `#5dbeb0` | contraste no palco escuro |

O palco de Apresentação preserva o carvão já usado na rota: `#080c0b`, com ciano `#22d3ee`
exclusivo das anotações clínicas. Esse ciano nunca é aplicado à imagem ou aos controles comuns.

## 3. Tipografia

- **Display:** DM Serif Display (`--font-heading`) — somente título contextual fora da imagem.
- **Interface:** Outfit (`--font-sans`) — nomes, botões, sliders e instruções.
- **Precisão:** ui-monospace — valor de zoom, brilho e contraste.

O zoom é sempre escrito como `1×`, `1.25×` etc., com `tabular-nums`; nenhum controle depende só
de ícone ou cor.

## 4. Layout e dimensões

| Elemento | Desktop | Mobile |
|---|---:|---:|
| lightbox de Arquivos | margem de 32 px | margem de 12 px |
| viewport | até 70 vh | ocupa o espaço restante, mínimo de 320 px |
| barra de ferramentas | lateral direita, 48 px | linha inferior horizontal rolável, 48 px |
| grupo de zoom | 40 px por botão | alvo de 44 px |
| painel de ajustes | 248 px, ancorado ao chrome | folha inferior, largura total |
| canto do contêiner | 16 px | 14 px |

O toolbar não flutua sobre a região diagnóstica no mobile. Em desktop, fica fora do retângulo
real da imagem; barras vazias da contenção permanecem neutras.

## 5. Componentes e estados

- `VisualizadorImagemClinica`: palco contido, controles de zoom/rotação/inversão/restauração.
- `Ajustes`: brilho e contraste em disclosure, nunca abertos por padrão.
- `CamadaAnotacaoImagem`: anotações viajam com o palco; toolbar e filtros não as afetam.
- Estados obrigatórios no artefato: pronto, ajustes abertos, carregando, erro com retry,
  navegação e anotação, apresentação ao vivo e mobile.

## 6. Motion e acessibilidade

- Chrome entra/sai em 150 ms; a imagem responde ao gesto sem animação deliberada.
- Sem inércia no pan. Reset volta imediatamente a `1×` e centro.
- Alvo mínimo: 44 × 44 px em touch. Foco visível teal. `+`, `-`, `0` e `R` são atalhos.
- Não capturar setas: elas pertencem à navegação da galeria/apresentação.

## 7. Anti-padrões

- Não usar estética de editor de fotografia (histograma, presets, crop, botões em bolha).
- Não aplicar brilho/contraste/inversão ao ciano das anotações.
- Não esconder controles essenciais em hover ou atrás de menus sem rótulo.
- Não usar gradientes decorativos, roxo ou uma nova paleta de “imagem médica”.

## 8. Dimensões resolvidas

| Dimensão | Valor | Fonte |
|---|---|---|
| Paleta | tokens atuais do Odonto.IA | regra permanente do projeto |
| Estilo | painel instrumental clínico | contexto de consulta e Apresentação existente |
| Tipografia | DM Serif Display + Outfit | `globals.css` existente |
| Layout | viewport focal + chrome periférico | spec R-139d/e |
| Densidade | compacta nos controles; ampla no palco | exame visual requer área útil |
| Radius | 14–16 px | cards e lightbox existentes |
| Motion | sutil, 150 ms no chrome | design system existente |
| Dark mode | obrigatório | regra permanente do projeto |

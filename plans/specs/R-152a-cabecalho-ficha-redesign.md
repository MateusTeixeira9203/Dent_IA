# R-152a — Redesign do cabeçalho da Ficha unificada

> **SPEC (redesign)** · **R-152a** · 🔵 ativo
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** debate
> **Filha de:** R-152

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Cabeçalho da Ficha unificada no prontuário do paciente |
| **Tipo** | redesign de tela existente |
| **Rota** | `/dashboard/pacientes/[id]` · aba Prontuário |
| **Arquivo envolvido** | `src/components/pacientes/ProntuarioTab.tsx` |

## 1. Estado atual

O cabeçalho usa `flex` com contexto clínico à esquerda e uma faixa de quatro CTAs à direita:
`Novo atendimento`, `Baixar PDF`, `Apagar Ficha` e `Complementar consulta`. Abaixo dele estão
evolução, odontograma e procedimentos.

- A relação entre título, responsável, status e progresso é clara, mas as ações ficam afastadas
  do objeto a que se referem e deixam uma área vazia grande em desktop.
- Ações de frequência, consequência e escopo distintos parecem equivalentes: criar atendimento,
  complementar a visita atual, exportar e apagar definitivamente a Ficha.
- `Apagar Ficha` ganha destaque visual de CTA de topo, embora seja uma ação destrutiva e rara.
- `Novo atendimento` e `Complementar consulta` aparecem como primárias no mesmo contexto sem
  explicar a diferença entre nova visita e complemento da visita aberta.
- O odontograma ainda mostra a instrução antiga de complementar/planejar ao clicar no dente. O
  comportamento atual correto é navegar até o procedimento daquela visita; sem procedimento,
  nada acontece.

**Sua conferência:** usuário delegou a organização ao agente, com a intenção de eliminar a
sensação de elementos jogados.

## 2. O que NÃO pode mudar — trava de segurança

- [x] Nomes de campos e variáveis
- [x] Funções e regras de negócio
- [x] Chamadas de API / endpoints
- [x] Estrutura do banco / modelo de dados
- [x] Fluxo de navegação
- [x] Permissões, autoria e guardas de assinatura/orçamento
- [x] Ações clínicas já previstas em R-152; este recorte muda somente apresentação e clareza de entrada

## 3. O que eu quero

> **Escrito por você, em português comum.** Esta seção não é preenchida por suposição.

**Sensação pretendida:** organizado, clínico e coeso; cada ação deve parecer ligada ao registro
que ela altera, sem uma faixa de botões soltos.

**Problemas concretos de hoje:**

1. Ações de Ficha, consulta e utilidade aparecem misturadas.
2. O vazio entre contexto e ações faz os controles parecerem desconectados.
3. A exclusão rara e destrutiva compete visualmente com ações frequentes.

| Elemento | Como está | Como quero |
|---|---|---|
| Cabeçalho | título à esquerda e quatro CTAs soltos à direita | contexto clínico primeiro; grupo compacto de ações da Ficha |
| Blocos / seções | complemento da consulta também aparece no topo | complemento fica no bloco de Evolução da visita exibida |
| Botões e ações | criar, exportar, apagar e complementar competem | `Novo atendimento` primário; PDF utilitário; exclusão em `Mais ações` |
| Estados (vazio, erro, carregando) | comportamento preservado | preservar estados existentes sem introduzir novas regras |

**Referências:** prints de 03/09/2026: cabeçalho da Ficha com ações no extremo direito e Ficha
completa no prontuário. Referência de consistência: Dashboard, Meu Dia e Ficha clínica atuais.

## 4. Tokens — fonte única da verdade

- **Artefato:** `plans/artefatos/R-152a-cabecalho-ficha-organizado.html`
- **Rota alvo:** `/dashboard/pacientes/[id]` · **Componente:** `ProntuarioTab.tsx`

| Token | Valor canônico |
|---|---|
| Fundo / superfície / borda | `bg-bg` · `bg-surface` · `bg-surface-alt` · `border-border` |
| Texto | `text-text-primary` · `text-text-secondary` |
| Marca / perigo | `text-teal-ink` · variantes `destructive` existentes |
| Tipografia | `font-heading` no título · `font-sans` no restante |
| Espaçamento | 4 / 8 / 12 / 16 / 20 / 24 px |
| Raios | 8 px nos controles · 16 px nos cards existentes |

**Comportamento visual:** o menu `Mais ações` contém `Apagar Ficha`; no mobile, o grupo ocupa a
largura disponível sem transformar todas as ações em CTAs primários.

**Responsividade PWA:** validar em 375, 768 e 1440 px; respeitar `safe-area-inset-*`; reservar
espaço inferior para a navegação do app; no celular, `Novo atendimento` expande e PDF/`Mais`
ficam compactos, enquanto ações dos cards quebram para uma linha própria.

**Validação do artefato em 03/09:** sem rolagem horizontal ou overflow de cards em 375, 768 e
1440 px. Em 375 px, o menu aberto permaneceu integralmente dentro do viewport (138–348 px na
horizontal e 384–474 px na vertical, em viewport de 375 × 812).

## 5. Gates de aceite

- [ ] Nenhuma alteração fora das travas do item 2
- [ ] Ação primária, contextual, utilitária e destrutiva distinguem-se sem competir entre si
- [ ] A diferença entre novo atendimento e complemento fica explícita no ponto de uso
- [ ] A instrução do odontograma descreve o comportamento real de navegação ao procedimento
- [ ] Dark e light conferidos em 375, 768 e 1440 px
- [ ] Nenhuma ação fica cortada por notch, teclado, menu aberto ou navegação inferior do PWA
- [ ] Diferença visual aprovada antes de replicar para outras superfícies

## 6. Fluxo de execução

```
Inventário → direção visual preenchida pelo usuário → protótipo em artefato
  → aprovação visual → implementação desta tela → localhost → preview
```

# R-129d — Acessibilidade operacional

> **SPEC** · **R-129d** · fase **plano — aguardando execução**
> **Aberto:** 2026-08-24 · **Migration:** zero

## 1. Problema

Linhas de pacientes e cards da Agenda parecem clicáveis, mas não são links/botões semânticos.
Alguns controles públicos e icon-only ficam abaixo de 44 px ou sem nome acessível.

## 2. Decisão

Corrigir sem mudar o visual: navegação vira `Link`; ações viram `button`; ícones recebem nome;
alvos frequentes chegam a 44 px. Não fazer varredura cosmética global neste lote.

## 3. Contrato técnico

- Linha que apenas navega: `Link` cobrindo o conteúdo permitido, com foco visível.
- Card com menu interno: título/área principal é link; ações continuam botões separados, sem
  botão dentro de botão.
- `Enter` ativa links; `Enter/Espaço` ativa botões por semântica nativa.
- Controles icon-only têm `aria-label` descritivo; decoração usa `aria-hidden`.
- Ajustar para 44×44: voltar, esqueceu senha quando aplicável, fechar e ações clínicas móveis.
- Corrigir `disponívelis` e substituir cores/tokens somente nos arquivos tocados.

## 4. Referência visual

Foco com anel teal discreto e contraste AA. Dimensão cresce pela área clicável, não por ícone
gigante. Nenhum arredondamento ou card novo.

## 5. Invariantes

- Destinos e permissões não mudam.
- Clique em ação secundária não dispara navegação principal.
- Ordem de tab segue ordem visual.
- Odontograma acessível existente não é refeito.

## 6. Gates de aceite

- [ ] Lista de pacientes abre perfil com Tab + Enter.
- [ ] Agenda abre compromisso por teclado e ações internas não navegam acidentalmente.
- [ ] Todos os controles icon-only tocados têm nome no accessibility tree.
- [ ] Fluxos públicos principais têm alvos de 44 px no mobile.
- [ ] Light/dark mantêm foco e contraste.
- [ ] Lint focado e teste de teclado passam.

## 7. Fora de escopo

- Certificação formal WCAG, reescrita do design system e correção dos 25 arquivos de tokens.

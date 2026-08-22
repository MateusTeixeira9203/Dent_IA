# DESIGN — R-105 Onboarding guiado pelo Dex

> **Status:** brief para artefato · **Data:** 2026-08-21

## Produto e restrições

SaaS clínico odontológico, usado durante atendimento. Dark e light obrigatórios, mobile-first,
teclado, leitor de tela e `prefers-reduced-motion`. A direção visual não será reaberta: usa o
design atual do produto e o padrão aprovado no R-121.

## Direção

- Estilo: minimalista clínico editorial, preciso e discreto.
- Paleta: somente tokens existentes (`background`, `surface`, `border`, `text-*`, `teal`).
- Tipografia: DM Serif Display nos títulos, Outfit na interface e DM Mono em etapas/tempo.
- Densidade: balanceada no começo, compacta depois que o atendimento começa.
- Radius: geometria atual do produto; sem aumentar arredondamento.
- Motion: expressivo uma vez na apresentação, sutil no fluxo recorrente.

## Hierarquia das cenas

1. **Abertura:** Dex + explicação única em três gestos (escolher → falar/colar → revisar),
   “Começar atendimento”; secundários “Ver demonstração” e “Pular por enquanto”. A garantia
   “Nada entra no prontuário sem a sua revisão” fecha o bloco.
2. **Escolha:** paciente existente, novo rápido ou demonstração. Um continente, não três modais.
3. **Condução:** Dex compacto próximo ao contexto; apenas o próximo controle realçado.
4. **Transformação:** fala → chips estruturados → cartões da ficha, usando componentes reais.
5. **Resultado:** ficha pronta no paciente; retorno/orçamento como próximos passos opcionais.
6. **Formação:** aviso pequeno com prazo e estado do convite; nunca cobre o cockpit.

## Motion do Dex

Referência primária: Emil Kowalski (restrição e propósito); secundária: Jakub Krehel (polimento).

- Entrada: `opacity 0→1`, `y 8→0`, `scale .98→1`, 220ms.
- Dex “acorda” uma vez; sem bounce ou loop.
- Transformação fala→ficha: sequência de 3 batidas, total máximo 1,8s.
- Mudança de etapa: crossfade + deslocamento de 6px, 180–220ms.
- CTA recebe um único reforço visual; nunca pulsa continuamente.
- Conclusão: traço de check e assentamento dos cartões; sem confete.
- Animar apenas `transform` e `opacity`.
- Reduced motion: fade curto ou troca instantânea, sem escala/deslocamento.

## Acessibilidade

- Nunca avançar automaticamente.
- “Pular” e “Retomar” sempre disponíveis.
- Foco vai para o título da etapa; não é sequestrado durante digitação.
- `aria-live="polite"` apenas para conclusão de etapa.
- Realce não depende somente de cor: borda + texto contextual.
- Mobile usa card no fluxo ou bottom sheet; tooltip flutuante é proibido.
- Alvos mínimos 44px e ordem de tabulação igual à ordem visual.

## Estados do artefato

- Consultório: abertura → atendimento real → ficha pronta.
- Clínica em formação: cartão pronto + convite enviado + prazo.
- Convidado: cartão próprio → missão clínica, sem escolha de plano.
- Demonstração: banner explícito e resultado descartável.
- Erro recuperável e formação expirada.
- Desktop 1440 e mobile 375; light e dark.

## Anti-padrões

- Tour com cinco slides antes do produto.
- Mascote animado permanentemente.
- Overlay que bloqueia odontograma ou Campo Mágico.
- Gradientes novos, partículas, glassmorphism ou componentes fora do sistema.
- Progresso gamificado que transforma prontuário em jogo.

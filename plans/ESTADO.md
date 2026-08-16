# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-15 21:13
> Reescrito do zero — funde o que a sessão do R-88/R-67/R-92 (execução) e a sessão paralela do
> R-105 (discussão, intocada por mim) deixaram em aberto.

## Agora

**R-88 está no ar em `dentia.app.br`, ninguém além de mim olhou.** Eixo Continuidade, preço
299/259 lendo de `lib/planos.ts`, artefato v7 seguido geometricamente. Testei sozinho (curl em
produção, clique real no Google OAuth) — pelo `CLAUDE.md` isso é 🟡, não ✅, até você olhar.

**R-67 (embed ambíguo) corrigido e no ar** — provado por SQL antes/depois. Falta o gate de tela:
exportar um prontuário logado e ver as consultas no PDF.

**R-92 retomado, muda de provedor.** AbacatePay sai do checkout de plano, entra **Stripe** —
decisão sua, chave chega **segunda-feira**. Emenda técnica pronta em
`specs/R-92-fechar-para-cobrar.md` §8. A 2ª integração AbacatePay (Pix avulso de paciente) sai do
sistema de vez — virou tarefa própria, você já iniciou (`task_471aea18`).

**R-105 (onboarding) segue em discussão**, intocado por esta sessão — artefato v2 verificado, 3
perguntas suas sem resposta (abaixo). Não é item de roadmap ainda.

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| **Chave da Stripe** | R-92 Dia 3 (checkout de verdade) | Chega segunda, por você |
| **`activateTrial` não cobra cartão** | "Cobrança no 15º dia" virar verdade (já publicado na landing e no e-mail D7) | Resolve quando R-92 Dia 3 subir |
| Ninguém verificou a landing/R-67 pessoalmente | Virarem ✅ | Abrir `dentia.app.br` e exportar um prontuário |
| PDF da ponte ("receber a ficha") é manual | CTA transicional virar 100% automática | Falta encenar na Teste01, exportar, anonimizar, plugar no Resend |
| Foto da ClinDent é placeholder | Bloco "Quem usa" ficar real | Precisa da foto cedida pela clínica |
| **R-105 sem as 3 respostas** (abaixo) | Virar item de roadmap | Perguntas de sessão anterior, seguem abertas |
| Conflito de item ativo (🔵) nunca resolvido | Saber a prioridade real | Carrega de sessões passadas — ver "Esperando você" |
| G8 (2 contas) — R-108/R-108b/R-103b/c **e** R-29/30/31a/32/34/39/03c | Fechar esses itens como ✅ | Represado — ele recusou seed sintético, espera dado real |
| R-36 reescrita sem aprovação | Começar a codar | §7 tem 3 decisões abertas |
| Posição do "Modo multidente" (R-107d §9) | Fechar R-107d | Quer opinião de dentistas reais |

## Esperando você

- ⚠️ **Qual é o item ativo?** `ROADMAP.md` tem **R-111 como 🔵** (responsividade mobile). Nem o
  R-88 nem o R-92 reivindicaram o 🔵 nesta sessão. Nunca respondido — **você decide**.
- **Olhar a landing** em `dentia.app.br` — é o que promove R-88 de 🟡 pra ✅
- **Segunda-feira:** a chave da Stripe
- **R-105 — 3 perguntas paradas:**
  1. "Apresentação" na lista de momentos de valor é planejamento renascendo, ou apresentação do
     orçamento ao paciente?
  2. Cronograma de volta de planejamento/tratamento/despesa/modo-consulta-novo — o onboarding já
     nasce prevendo, ou espera cada um voltar?
  3. Registra o R-105 no `ROADMAP.md` agora, ou segue em discussão?
- **"+300 pacientes por mês" e "3 meses em uso"** — já estão publicados na landing sem
  confirmação. Registro interno tem 302 pacientes na base *inteira*, não mensal — número torto
  em canal de indicação é o que o colega confere
- **A frase do Dr. Renato está no ar sem o sim dele** — é rascunho seu/meu, assinado com o nome
  dele. Risco imediato, não hipotético
- Programa de indicação (mês grátis, Berger) — custa diferente a R$299 do que custava a R$249
- Conferir a barra de encaminhar (pontual 🟡 de 13/08, nunca visto na tela)
- Backfill de status — 71 fichas antigas com procedimento indicado seguem `concluida`
- Veredito de produção do R-98a — sem confirmação desde a sessão #35
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados, ainda 🟡)

## Próximo da fila

Segunda: R-92 Dia 3 com a chave da Stripe. Até lá, o que não depende dela é você olhar a landing
e o R-67 com seus próprios olhos, e responder as 3 perguntas do R-105.
`ROADMAP.md` segue precisando de poda — teto ~200 linhas, estourado há sessões.

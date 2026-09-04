# R-115 — Refino clínico dos símbolos do odontograma

> **SPEC** · **R-115** · 🧊 congelado
> **Aberto:** 2026-08-17 · **Fechado:** — · **Fase:** congelado em 18/08
> **Depende de:** R-106/R-139c serem retomados. Este item só entra em execução após
> aprovação visual do catálogo.

> **Retomada:** voltar somente numa revisão clínica completa do odontograma. O rascunho
> anatômico existe, mas não é contrato visual aprovado e não autoriza alteração no SVG real.

## 1. Problema

O odontograma já diferencia estados por cor e possui marcas clínicas, mas parte dos glifos ainda
parece genérica na escala real. O implante pode ser lido como pino/núcleo. Coroa, fratura e os
demais símbolos precisam do mesmo acabamento para que o dentista reconheça o procedimento de
relance, sem abrir o dente.

## 2. Decisão

**Direção definida:** realismo clínico reconhecível, não ilustração fotorrealista.

- Forma identifica o procedimento; cor continua identificando estado (`a fazer`, `feito aqui`,
  `pré-existente`).
- Cada glifo tem silhueta própria no menor dente renderizado (aprox. 24 px de largura).
- Convenção clínica vence decoração quando for mais reconhecível.
- Tokens, claro/escuro, anatomia do dente e geometria responsiva atuais permanecem.

**Contra-regra:** detalhe que não se lê nessa escala é ruído, não profissionalismo.

## 3. Objetivo

Entregar um catálogo único e coerente de símbolos refinados, validado primeiro em artefato
estático e só então aplicado ao componente real, sem alterar eventos, status ou persistência.

| Prioridade | Glifo | Resultado esperado |
|---|---|---|
| P0 | Implante | Parafuso endósseo inequívoco: plataforma, corpo cônico e roscas legíveis; nunca confundir com pino. |
| P0 | Coroa | Capa protética reconhecível, com margem cervical e textura controlada. |
| P0 | Pino/núcleo | Peça contínua dentro do canal, distinta do parafuso do implante. |
| P1 | Canal, lesão, fratura | Canal acompanha raiz; lesão lê como radiolucência; fratura ganha direção. |
| P1 | Selante, ponte, exodontia, ausente, esfoliação, incluso | Polimento de peso, posição e contraste sem perder significado. |
| P2 | Legenda | Explica também os glifos, não somente as cores. |

## 4. Contrato técnico

**Arquivos previstos:**

- `src/components/odontograma/Odontograma.tsx` — SVG, legenda e geometria visual somente.
- `plans/artefatos/R-115-refino-simbolos-odontograma.html` — catálogo de aprovação, sem dados
  clínicos reais.

**Não muda:** `OdontogramaEventoDraft`, `ResumoDente`, banco, RLS, API, status, cores semânticas,
prioridade de eventos, odontometria nem fluxo de voz.

**Regras de render:**

1. Glifo é ancorado na anatomia correta: coroa, raiz, ápice ou arco.
2. Geometria escala por frações das dimensões existentes entre incisivo, pré-molar e molar.
3. Nenhuma marca pode ocultar seleção, foco, ponto da sessão ou uma condição clínica prioritária.
4. Pré-existente continua distinguível por textura e contorno, não só por cor.

## 5. Comportamento

| Situação | Resultado |
|---|---|
| Implante realizado em molar | Parafuso e plataforma distinguíveis do pino com a arcada inteira. |
| Coroa pré-existente | Capa e textura leem como prótese; slate não domina a pendência coral. |
| Fratura | Traço tem direção única e não parece ornamento. |
| Ausente/esfoliado | Contorno tracejado e seta permanecem claros. |
| Dois eventos no mesmo dente | Prioridade atual é preservada. |
| Modo compacto/mobile | Nenhuma marca sai do dente, colide com FDI ou prejudica toque. |

## 6. Referência visual

- **Artefato:** `plans/artefatos/R-115-refino-simbolos-odontograma.html` (rascunho
  revisado em 18/08; aguardando aprovação clínica).
- **Rota de validação:** `/dashboard/meu-dia` e ficha do paciente.
- **Componente:** `src/components/odontograma/Odontograma.tsx`.
- **Tokens:** exclusivamente `--color-teal`, `--color-coral`, `--color-slate`, variantes
  `-pale`/`-ink`, `--color-surface-alt`, `--color-border` e `--color-text-muted`.

O artefato mostra cada símbolo por estado aplicável, em incisivo/pré-molar/molar, claro/escuro e
escala compacta. Sem paleta, fonte, gradiente ou ícone de biblioteca novo.

**Decisões anatômicas do rascunho atual:** no molar 46, o canal usa duas raízes unidas pela
furca, câmara pulpar discreta e três condutos internos (dois mesiais e um distal); a fratura
genérica é um traço oblíquo limitado à coroa — não atravessa a raiz sem localização clínica
informada; a coroa acompanha o contorno coronário, tem margem cervical e hachura curta; o
implante é coroa sobre pilar, plataforma e fixture cônico rosqueado. Pino/núcleo e lesão ficam
como estão, salvo ajuste pontual descoberto na comparação final.

## 7. Invariantes

- [ ] Implante e pino/núcleo nunca têm silhueta confundível.
- [ ] Forma não substitui cor de estado nem cria significado clínico novo.
- [ ] Nenhuma mudança visual altera evento, status ou persistência.
- [ ] Todos os glifos seguem legíveis no menor dente do Meu Dia.
- [ ] Claro e escuro usam exclusivamente tokens existentes.

## 8. Gates de aceite

- [ ] Você aprova o artefato antes de qualquer SVG de produção mudar.
- [ ] Implante, pino e coroa são reconhecidos sem legenda numa revisão visual.
- [ ] A legenda explica cor e glifo sem ocupar a arcada.
- [ ] Arcada com múltiplos eventos permanece legível em 375 px, 768 px e desktop.
- [ ] Nenhum símbolo encobre FDI ou reduz alvo de toque.
- [ ] QA no Meu Dia e ficha nos dois temas.

## 9. Fora de escopo

- Novos tipos clínicos, material de restauração, ortodontia ou mobilidade.
- Mudança de paleta, layout do Meu Dia ou animações em tempo real.
- IA, transcrição, orçamento, ficha e persistência de odontometria.

# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-03 (noite) · sessão #15
> **Item ativo:** R-46 (Meu dia) · **Modo:** planejamento → execução (R-51/R-52 em código)

## Agora

**Sessão de spec + mapa, com execução parcial no meio.** Escrevi 4 specs novas, montei o
**[MAPA-MEU-DIA.md](MAPA-MEU-DIA.md)** (o documento que passa a decidir o que entra e o que
não entra no Meu dia), e codei R-51 + metade do R-52.

**Nada foi commitado.** 5 arquivos novos em `plans/`, 4 modificados em `src/`, `ROADMAP.md`
editado. Os 15 commits anteriores continuam sem push (produção está em **31/07**).

### O documento que passa a governar

**[MAPA-MEU-DIA.md](MAPA-MEU-DIA.md)** — a função do Meu dia nas palavras dele, a régua de
admissão (fixo / contextual / sob demanda), 7 defeitos, 10 contradições vivas, 7 buracos sem
item, e a direção de design. **Ler antes de propor qualquer coisa nova pra esta tela.**

O fato que ele estabelece e governa todo o resto: **a tela tem ~441px de orçamento vertical
e já está estourada** — o G1 do contrato provavelmente já falha hoje, antes de orçamento,
retorno e orto entrarem. Coisa nova só entra pagando.

### Specs escritas nesta sessão
- [R-51-53](specs/R-51-53-modelo-multissessao.md) — multi-sessão · **R-54 ✂️ cortado** (não era defeito)
- [R-46-C6](specs/R-46-C6-layout-cockpit.md) — `aprovada`. jaFeito sai de vez, painel do dente vira resumo + `Sheet`
- [R-46d](specs/R-46d-campo-magico.md) — campo mágico · D0 pronta pra codar
- [R-57](specs/R-57-atrito-faixa-rapida.md) — encaixe · observação · (repetir, ⛔ bloqueada)

### Código escrito (não commitado, 🟡)
- **R-51** — `vencedorPorAncora` pula evento com `grupo_id`; `indicado` de grupo vira pendência
  direta; `emAndamento` derivado. Typecheck/lint/build limpos. **Lógica provada com dado
  sintético**, incluindo reprodução do bug original. Tela **não** verificada ao vivo.
- **R-52 (metade)** — servidor devolve `dentistaId`/`encaminhadoParaId`/`destinosEncaminhar`/
  `meuDentistaId`; "A fazer" filtra pra (minha ∧ não encaminhada) ∨ (encaminhada pra mim), com
  "concluir →" via RPC 109. **Falta:** modo seleção + `EncaminharBar`, e sucesso parcial no
  `encaminharProcedimento`.

## Travado

- **R-57 F3** — conflita com decisão dele de 31/07 ("sem frequência de uso").

Nada mais travado tecnicamente. C6 e R-46d D1 (moldura) fecharam: `Sheet` pro painel do dente
(C6), expansão in-place pro campo mágico (R-46d D4, já resolvido antes — eram duas decisões
diferentes, não uma). As 4 contradições C1/C6/C7/C8 e o conflito do `jaFeito` fecharam
03/08 (noite) — ver specs.

## Esperando você

- [x] ~~**4 contradições**~~ ✅ resolvidas 03/08 (noite): **C1** orçamento usa
      `filtro-responsavel.ts` · **C6** CTA é **"Salvar"** até o R-46h · **C7** mantém sem
      auto-avanço · **C8** responsivo entra em toda fatia, P8 morre.
- [x] ~~**Conflito do `jaFeito`**~~ ✅ resolvido 03/08 (noite): **some de vez.** *"O já feito
      será tudo registrado no histórico, referente àquela consulta, aquela data."* O dado
      sobrevive em `visitas[].eventos` (R-55, já fiel) — nada fica inacessível. Spec C6 §4/§4.0
      reescritos.
- [ ] **Push** — 15 commits (não 9: há 5 de 01/08 que nunca subiram, incluindo o que faz o
      Meu dia virar a porta do atendimento). Ele optou por não subir nesta sessão.
- [ ] **R-46h e "marcar retorno"** — os dois exemplos que ele deu, e nenhum tem spec.
- [ ] **R-49 A1** — a tabela de especialidade abre sozinha? (66% dos endos vazios)
- [ ] Antigos: R-56 · R-28 Parte 3 · gate de 2 contas · R-40 · R-44.

## Próximo da fila

Fase 0 fechada (specs corrigidas, aprovadas). Execução em andamento nesta sessão: D1 (queixa
`null`) → fix do filtro em `a-fazer-bloco.tsx` (usar `filtro-responsavel.ts`) → terminar R-52
(seleção + `EncaminharBar`) → R-46d D0 → R-53. **R-51 codado mas não verificado ao vivo** —
precisa do pane do browser exibido; verificação fica pendente até isso. C6 + R-46d D1 (UI
nova, Sheet) entram depois, com D5 (piso 36px) e a medição real do G1 como gate de entrada.

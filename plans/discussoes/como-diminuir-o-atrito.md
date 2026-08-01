# Como diminuir o atrito

> **DISCUSSÃO** · aberto 2026-07-31 · **não é spec, não é contrato** — é o lugar onde os
> casos de atrito são acumulados e a regra é afiada. Nada aqui governa implementação:
> quando um caso amadurece, ele vira item no [ROADMAP](../ROADMAP.md) e ganha spec.
> **Origem:** ele, 31/07 — *"os chips de orto que têm vários inputs separados, ou a tabela
> do endo que também são vários inputs separados, isso gera muito atrito pro dentista; a
> ideia é diminuir isso no sistema"*.

## A regra

Todo campo que a tela pede é **uma de duas coisas**, e hoje o sistema trata as duas igual —
input em branco toda visita. É daí que vem o formulário longo:

| | O que é | Como deve se comportar |
|---|---|---|
| **Estado** | Pertence ao paciente / ao dente / ao tratamento. Persiste entre visitas. Fio do aparelho, comprimento do canal, alergia, anamnese. | Aparece **preenchido**, com "desde DD/MM". Muda só com toque deliberado ("trocar"). **Nunca se re-pergunta em branco.** |
| **Evento** | Aconteceu hoje. Ativação de hoje, procedimento realizado, queixa. | Nasce **sempre vazio**. Nunca herda. Nunca vem pré-selecionado. |

**Classificar cada campo numa das duas colunas É a redução.** Não é ajuste de UI — a maior
parte do formulário longo é estado sendo cobrado como se fosse evento.

Base de desenho: artefato [`R-46-ficha-estado-evento.html`](../artefatos/R-46-ficha-estado-evento.html)
(§2 o modelo, §4 a grade do orto, §6 o que o desenho se proíbe). Referências que o artefato
cita: AHIMA *citing* (estado se confirma, não se redigita) · NORCAL (nunca pré-selecionar) ·
ECRI Rec A (*lock from copying* — evento nunca herda).

**O limite que mantém isso seguro:** carregar **estado** adiante é o certo; carregar
**evento** é falsificação de prontuário. "O canal está preparado até a lima #30" é estado.
"Instrumentei hoje" é evento. Nunca inverter.

## Casos levantados

### 1 · Orto — 5 campos digitados, 4 deles são estado
`src/components/fichas/orto-form.tsx` pede em **toda** visita: arcada, fio, ativação,
elástico corrente, elástico intermaxilar — todos em branco (`ORTO_VAZIO`, linha 17).

| Campo | É | |
|---|---|---|
| Arcada | estado do tratamento | |
| Fio | estado — e o artefato corrige: **um por arcada** (S e I usam fios diferentes) | |
| **Ativação** | **evento** | ✅ único que está certo em branco |
| Elástico corrente | estado | |
| Elástico intermaxilar | estado | |

**5 campos digitados → 1.** O resto vira "manter" (um toque) ou "trocar" (aí abre input).
**Custo:** precisa do fio-por-arcada, que muda a forma do jsonb `orto_manutencao` → é o
**R-46e** (D7 do R-46). Não é trivial.

### 2 · Endo — a tabela inteira é estado, e não é carregada adiante
`src/components/fichas/endo-form.tsx`: 5 campos por canal + 2 no rodapé. **Molar de 3
canais = 17 campos.**

**Defeito confirmado no código:** ao continuar um tratamento já aberto,
`ToothDetailPanel.tsx:294` copia só o `grupo_id` — o `detalhe` **não vem junto**, e
`GrupoAberto` (`lib/odontograma/grupos-abertos.ts:18-24`) nem carrega esse campo. Resultado:
**a sessão 2 re-digita os 17 campos que a sessão 1 já mediu.** Além do atrito, é risco de
erro de transcrição num dado que já estava certo.

Comprimento do canal e ponto de referência não mudam entre sessões; lima final é "até onde
está preparado agora" — tudo estado do dente. O evento é "trabalhei neste canal hoje".

**Custo:** pequeno — `GrupoAberto` ganha `detalhe`, a query alarga, `criarDenteTipo` semeia.
~30 linhas em 3 arquivos, **zero migration**.

### 3 · Ficha — 7 campos com 0/88 de resposta
Medido em produção (artefato §1): anamnese, alergias, medicamentos, histórico médico,
histórico dental, exame físico, pressão arterial — **pedidos em toda visita, respondidos em
nenhuma**. São estado do paciente cobrado como evento. É o **R-46f**.

Achado de segurança no mesmo lugar: **alergia não tem casa estruturada em lugar nenhum** —
nem na ficha (0%), nem na tabela de pacientes. (Mitigação parcial já no ar: o R-46g trouxe o
chip de alerta pro Meu dia, lendo `pacientes.observacoes` — texto livre, não campo clínico.)

## Aberto

- **Ordem.** O caso 2 (endo) é o mais barato e mora dentro do `ToothDetailPanel`, que o
  R-46b vai reusar como está — consertar antes de portar faz `/consulta` (no ar hoje) ganhar
  junto; consertar depois significa levar os 17 campos pra tela nova primeiro.
  **Recomendação minha: caso 2 antes do R-46b.** Não decidido.
- **Caso 1 (orto) vs. cobertura.** O artefato §8 já tinha feito essa pergunta e ela nunca
  foi respondida: *"ficha do dia + typeahead primeiro (ataca cobertura), ou orto primeiro
  (dor relatada)?"* Hoje a ordem do R-46 assume o primeiro (orto é o R-46e, quase último).
- **Onde mais.** Este documento é pra crescer: todo formulário longo do sistema é candidato.
  Próximos suspeitos não medidos: implante (`implante-form.tsx`), PSR (`psr-form.tsx`),
  cadastro de paciente.

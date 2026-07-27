# Eval — extração clínica (pass 1)

Rede de segurança para mudanças no prompt/enum de `/api/dex/formatar-evolucao`. A regra do
projeto (CLAUDE.md → IA) é: **prompt de extração só muda com eval rodado antes e depois**. Este é
o eval. Bate no endpoint HTTP real com a sessão logada — não duplica o prompt, não toca na rota.

## Rodar

1. Dev server no ar em `localhost:3000` (`preview_start "dev"` ou `npm run dev`).
2. Sessão salva válida (a mesma do audit visual — `capture-audit-3.cjs`). Se expirou, refaça o
   login headed uma vez e a sessão é regravada.
3. `NODE_PATH="<repo>/node_modules" node evals/extracao-clinica/run.cjs`

## Como ler

- **ATUAL** — tipos que a extração já suporta. É a linha que **não pode regredir**: rode o baseline
  antes de qualquer mudança de prompt/enum e confira que o número não cai depois.
- **NOVO** — `ponte`, `esfoliacao`, `profilaxia`, `raspagem`, `fluor`. Barrados no enum hoje, então o
  baseline reporta **0 presentes** — é o esperado. É o buraco que R-06/R-07 preenchem: depois deles,
  esses casos devem virar PASS **sem** derrubar nenhum ATUAL.
- **eventos inventados (falso-positivo)** — o pior modo de falha: a IA emitindo evento que o relato
  não pediu. Vigie esse número nas duas pontas.

## Fluxo antes/depois (R-06/R-07)

1. `node run.cjs` com a rota atual → anota ATUAL e eventos inventados (o baseline).
2. Muda o enum/prompt na rota, reinicia o dev.
3. `node run.cjs` de novo. Aceite = NOVO sobe, ATUAL **não cai**, inventados **não sobe**.

## Manutenção

Os relatos em `golden.json` são exemplos sintéticos. Trocar pelos **relatos reais** por especialidade
quando o material de base chegar — quanto mais o golden espelha ditado de verdade, mais o eval vale.
Temperatura da extração é 0.2 (não 0), então há pequena variância entre rodadas; diferença de 1 caso
isolado pode ser ruído — o que importa é a tendência e o número de inventados.

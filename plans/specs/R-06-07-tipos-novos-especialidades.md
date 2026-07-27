# R-06 + R-07 — Tipos novos de evento: prótese fixa, odontopediatria e rotina

> **SPEC** · **R-06 + R-07** (um contrato, dois itens — dividem o mesmo enum da IA, então a Fase 4
> executa **uma vez** cobrindo os dois; gates e fechamento **separados por item**).
> Fase: **executada e verificada em localhost (27/07) — aguardando deploy + check em prod.**
> Gates: G1 ✅ (typecheck/lint/build) · G2-G6 ✅ exceto salvar→recarregar (demo não persiste; coberto
> por transitividade — o caminho de save já gravava papel/nivel — e fecha no check em prod) ·
> G7-G9 ✅ · G10 ✅ **eval ATUAL 16/16 · 0 inventados · NOVO 4/4** · G11 ✅ (ponte 24-26 via relato
> vira grupo com papéis certos). Harness: 9/9 (passada A) + 5/5 (passada B, light+dark).
> **Modelo:** Sonnet nas Fases 0–3 (mecânicas, contrato travado). Fase 4 (prompt da IA) é a superfície
> de maior risco do código — rodar com atenção máxima e **eval antes/depois obrigatório** (baseline
> 27/07 capturado: ATUAL 16/16 · 1 inventado · NOVO 0/4).
> **Aberto:** 2026-07-27 · **Depende de:** nada em código (migration 106 no ar; R-05 provou o padrão card).
> **Migration: NENHUMA** — o check de `tipo` e o `nivel='boca'` já estão no banco (106). **RLS: nada.**
> **Fontes das decisões:** pesquisa 27/07 (memória `modelagem-ponte-boca-odontograma`): Open Dental
> (schema + manual), Carestream Sensei, norma MINSA RM-559-2022, simbologia Cenident.

## Visão geral

O banco já aceita todos os tipos novos; o TS (`TipoRegistroOdontograma`, `TIPO_LABEL`, `PapelNoGrupo`)
já os declara; o registry já reivindica `ponte` e `esfoliacao`. O que falta é **aplicação**: entrada
manual, render e — por último — a IA. A ordem inverte o risco de propósito: **determinístico primeiro
(Fases 0–3, testável sem LLM), enum da IA por último (Fase 4, com eval)**. É o invariante #11 da
própria rota ("tipo só entra no enum quando a UI sabe renderizá-lo") aplicado como plano.

## Escopo

**R-06 cobre:** `ponte` (grupo pilar/pôntico + símbolo MINSA) e `esfoliacao` (decíduos) — manual,
render e IA. **R-07 cobre:** `profilaxia`, `clareamento`, `fluor` (nível boca) e `raspagem` (nível
quadrante) — manual, card "Boca" e IA.

**Não cobre:** `exame_periodontal` — **transferido pro R-08** (é o periograma; um dono só).
Extractors de pass 2 (`detalhe` estruturado dos tipos novos) — R-09. Atalho de manutenção orto — R-05b.
Símbolos no catálogo de ícones do R-22 (o traço da ponte e a marca de esfoliação entram aqui; o
polimento do conjunto continua congelado lá).

## Decisões travadas (com fonte)

| # | Decisão | Base |
|---|---|---|
| D1 | **Ponte = eventos POR DENTE com papel explícito, ligados por `grupo_id`** (Modelo B da pesquisa). Todos os dentes do vão recebem `tipo='ponte'`; `papel_no_grupo` distingue `pilar`/`pontico`. `coroa` segue sendo a unitária. | Carestream (por-dente c/ papel); MINSA (render por extensão); nosso R-01 (evento é a unidade). Open Dental usa range único — rejeitado: quebraria nosso modelo de eventos |
| D2 | **Validação pôntico ⇒ dente ausente** (exodontia/ausência no histórico). **Soft**: aviso no painel, não bloqueio — resto radicular e afins existem na clínica real. | Open Dental: Pontic exige missing; soft porque nossa fonte de "ausente" (eventos) pode estar incompleta em paciente migrado |
| D3 | **Render da ponte = derivado do grupo, nunca guardado**: linha horizontal na altura dos ápices marcando a extensão + traço vertical sobre cada pilar. Cores do nosso vocabulário: coral (indicado) / teal (realizado) / slate (pré-existente) — substituem o azul/vermelho da norma. | MINSA RM-559-2022 (spec formal do desenho); Cenident (linha contínua unindo coroas) |
| D4 | **Esfoliação = evento tooth-level** (`nivel='dente'`), só decíduos (51–85), só `realizado`. Render: marca de ausência natural, visualmente distinta da exodontia. | Cenident (código EX por dente); FDI |
| D5 | **Boca-level NUNCA pinta o odontograma** — vira card "Boca" na evolução (padrão do `OrtoCard`). `profilaxia`/`clareamento`/`fluor` = `nivel='boca'`; `raspagem` = `nivel='quadrante'`. | Open Dental: procedimento "Mouth" não aparece no chart gráfico, só na lista |
| D6 | **Donos no registry** (sem 9º plugin — YAGNI): `raspagem` → **periodontia**; `profilaxia`/`clareamento`/`fluor` → **dentistica** (o label já é "Dentística / Clínico Geral"). | Contrato de plugin existente; EspecialidadeId é fechado em 8 |
| D7 | **Enum da IA abre UMA vez** (os 6 tipos juntos, R-06+R-07), na Fase 4, depois de todo o resto verificado. Dois edits na rota = dois riscos; um edit, um eval. | Regra do CLAUDE.md (eval antes/depois); baseline já capturado |
| D8 | Grupo de ponte **homogêneo** (só eventos `ponte`) — o render acha a extensão pelo min/max dos dentes do grupo; pilares = eventos com `papel='pilar'`. | Simplicidade do render; D1 |

## Contrato técnico

### Fase 0 — donos e vocabulário (registry + catálogo) · R-06+R-07

- `src/lib/especialidades/registry.ts`: `dentisticaPlugin.tiposEvento += ['profilaxia', 'clareamento', 'fluor']`;
  `periodontiaPlugin.tiposEvento += ['raspagem']`. (`proteseFixaPlugin` já tem `ponte`; `odontopediatriaPlugin`
  já tem `esfoliacao` — nada a fazer.) O assert de unicidade do `DONO_DO_TIPO` valida sozinho.
- `TIPO_LABEL` é `Record` total — labels já existem; conferir os textos, não criar.
- `CATALOGO` do `ToothDetailPanel` (linha ~53): `+ { tipo: 'esfoliacao', modos: ['realizado'] }`,
  exibido **só quando `dente` é decíduo (51–85)**. `ponte` NÃO entra no catálogo simples (Fase 1 tem fluxo próprio).

### Fase 1 — ponte manual · R-06

- **Entrada:** chip "Ponte" no `ToothDetailPanel` abre um mini-fluxo no próprio painel:
  1. dente atual = primeiro pilar; usuário informa o outro extremo (input/select de dente FDI do mesmo arco);
  2. painel gera os eventos do intervalo: `tipo='ponte'`, `grupo_id` compartilhado (o `alternar/adicionar`
     da linha ~205 já aceita `grupoId`), extremos `papel='pilar'`, intermediários `papel='pontico'`;
  3. antes de confirmar, cada dente do vão tem toggle pilar/pôntico (caso de ponte com pilar intermediário);
  4. validação D2: pôntico sem ausência no histórico → aviso inline (não bloqueia).
- Status do grupo inteiro: `indicado` ou `realizado` (um só — ponte não é meio-instalada por dente).
- A máquina de `gruposAbertos` (R-02 F3) **não** se aplica à criação da ponte (grupo nasce completo aqui).

### Fase 2 — render dos símbolos · R-06

- `Odontograma.tsx`: grupo de eventos `ponte` → linha horizontal na altura dos ápices cobrindo
  min–max dos dentes do grupo + traço vertical sobre cada `papel='pilar'` (D3). Cor pelo status
  (vocabulário coral/teal/slate + variantes `-ink` no light, padrão já existente no arquivo).
- `esfoliacao` realizado → marca de ausência natural no decíduo (distinta do X/risco de exodontia).
- Registros na lista da ficha: ponte agrupada num card só (a máquina de grupo do R-21 já agrupa por
  `grupo_id`); esfoliação como card comum.

### Fase 3 — rotina manual + card "Boca" · R-07

- **Entrada:** seção "Procedimentos de rotina" no corpo editável da evolução (FichasTab), mesmo padrão
  visual da seção orto do R-05: chips `Profilaxia · Flúor · Clareamento · Raspagem`, cada um com toggle
  indicado/realizado; raspagem ganha picker de quadrante (1–4). Cria `OdontogramaEventoDraft` com
  `ancora: { nivel: 'boca' }` (ou `{ nivel: 'quadrante', quadrante }`), sem dente.
- **Leitura:** eventos sem dente âncora renderizam num card "Boca" da evolução (padrão `OrtoCard`),
  nunca no desenho (D5). Conferir que `prontuario-html.ts` e a derivação de orçamento
  (`derivarV2DosEventos`) não engasgam com evento sem dente — gate G7.
- Persistência: caminho existente de eventos (R-01) — a constraint `ancora_valida` do banco já aceita.

### Fase 4 — IA (executa UMA vez, cobre R-06+R-07) · gate de eval

`src/app/api/dex/formatar-evolucao/route.ts`:
- enum do `ODONTOGRAMA_EVENTO_SCHEMA` e `TIPOS_FATIA_A` += `ponte`, `esfoliacao`, `profilaxia`,
  `raspagem`, `clareamento`, `fluor`; `nivel` += `'boca'` (schema do modelo + `parseEventos`).
- `parseEventos`: aceitar `nivel='boca'` (âncora vazia); pra `ponte`, aceitar `papel_no_grupo`
  emitido pelo modelo (hoje forçado `null`) — validar `pilar|pontico`, senão `null`.
- Prompt: remover o "NÃO emita ponte nem esfoliacao"; instruir ponte como grupo (pilares/pôntico,
  mesma `grupo_id` tag), esfoliação só decíduo, rotina em `nivel='boca'` (sem inventar dente).
- **Gate de eval (inegociável):** `evals/extracao-clinica/run.cjs` antes e depois.
  Aceite: **ATUAL = 16/16** (zero regressão) · **inventados ≤ 1** · **NOVO = 4/4**. Qualquer
  falha → iterar o prompt até passar; se não passar sem degradar ATUAL, a Fase 4 **não sobe** e
  o item fica manual-only (funcional pelo caminho das Fases 1–3).

## Invariantes

- **I1** — Símbolo derivado, nunca guardado: linha/colchete da ponte sai do grupo em render-time.
- **I2** — Grupo de ponte homogêneo: só eventos `tipo='ponte'`, 1+ pilar, papel em todo evento do grupo.
- **I3** — Evento de boca não tem dente; evento de dente tem FDI válido — espelho exato da constraint SQL.
- **I4** — Manual e IA produzem o MESMO shape de evento — nenhum campo novo, nenhum branch de save novo.
- **I5** — A IA nunca é a única porta: tudo que a Fase 4 habilita já existe manualmente (Fases 1–3).

## Gates de aceite

**R-06:** G1 typecheck+lint+build · G2 ponte manual 24–26 (pilar/pôntico/pilar) → salvar → recarregar
→ linha MINSA no odontograma + card agrupado · G3 toggle pilar intermediário funciona · G4 aviso de
pôntico sobre dente presente aparece (e não bloqueia) · G5 esfoliação em decíduo aparece no catálogo,
em permanente não; render distinto de exodontia · G6 light+dark.

**R-07:** G7 profilaxia+flúor manual → card "Boca" na evolução, odontograma intacto, prontuário/PDF e
orçamento não quebram · G8 raspagem com quadrante → card correto · G9 light+dark.

**Fase 4 (os dois):** G10 eval ATUAL 16/16 · inventados ≤1 · NOVO 4/4 · G11 relato ditado com ponte
("ponte de 24 a 26") vira grupo correto na revisão do Dex.

**Fechamento por item:** R-06 = G1–G6 + G10–G11 · R-07 = G7–G9 + G10. Verificação como no R-05:
harness Playwright logado em localhost + check final do Mateus em prod.

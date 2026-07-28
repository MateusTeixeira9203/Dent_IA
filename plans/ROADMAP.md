# Roadmap — Odonto.IA

> **ROADMAP** · **Odonto.IA** · atualizado 2026-07-28
> **Ativo:** nenhum · **Fila:** 10 · **Concluídos:** 18 · **Congelados:** 1 ·
> **Fechados 27-28/07:** **R-05·R-06·R-07** (verificados em prod 27/07) + **R-03a·R-03b**
> (assinatura por procedimento — modelo/backend + captura nos 3 fluxos legados, verificado ao
> vivo com 2 contas 28/07, **no ar em produção**). Migrations 111/112 aplicadas em prod. Deploys:
> `dbb4228..00602f2` (R-05) e `00602f2..6674f7b` (R-06/R-07 + eval + símbolos).
> **R-11 no ar** (`8af1fea..1949e54`, deploy `dpl_8rEuxQR`) — 🟡, gate #6 (admin apaga ficha de
> outro dentista) tinha RLS quebrada (`fichas_delete_admin` sumida do banco vivo), corrigida e
> confirmada por simulação com `auth.uid()` real 28/07 — falta só o clique ao vivo com 2 contas.
> **Sessão de 28/07 (tarde):** 4 correções `/pontual` (responsividade orçamento mobile, texto
> escapando dos chips de especialidade, status "Quitado" com drift de float, embed ambíguo
> zerando a aba Agenda do paciente) + **R-05b e R-08a codados e commitados, aguardando push +
> verificação ao vivo** (o pane do browser bateu no bug recorrente de `document.hidden`, sem
> confirmação por clique nesta sessão). **R-03c e R-08 investigados a fundo** (workflow read-only
> no schema real + código) — pesos corrigidos abaixo, achados na spec de cada sub-item.
> **Ontem (26/07):** o lote (R-21/R-20/R-19/R-18/R-17/R-16/R-12/R-04/R-02) + R-04b (migration 110).

> Reconstruído do zero em 2026-07-21 por decisão do Mateus. O histórico anterior está no
> git (`git show 4a93234:plans/roadmap/roadmap-mestre-2026-07-21.md`) e na pasta
> `Desktop/roadmap,spec, handofs antigos/` — consulta, não operação.

**Status:** ⏳ fila · 🔵 ativo (máx 1) · 🟡 no ar não verificado · ✅ no ar e verificado ·
🧊 congelado · ✂️ cortado. **Código escrito ≠ código verificado** — 🟡 se trata como não-feito.

## Agora

**Cluster da entrada manual fechado (27/07).** A regra de produto de 21/07 — *toda especialidade
precisa de entrada manual, não só por voz* — está cumprida para orto, prótese fixa, odontopediatria
e rotina: **R-05, R-06 e R-07 no ar e verificados em prod** pelo Mateus. Zero migration na leva.
Ganhos de infra que ficam: **harness de eval** da extração clínica (`evals/extracao-clinica`, gate
obrigatório pra mexer no prompt — baseline ATUAL 16/16 · 0 inventados) e os **símbolos do
odontograma portados do artefato canônico** + polidos (auditoria em `plans/auditorias/`).

**Ativo agora:** nenhum. **R-03a/R-03b no ar em produção** (assinatura por procedimento).
**R-11 segue 🟡** (RLS do gate #6 corrigida em código 28/07, falta o clique ao vivo com 2 contas).
**R-05b e R-08a codados** (specs aprovadas, ver tabela), aguardando push + verificação ao vivo.
**R-03c e R-08** tiveram investigação a fundo 28/07 — pesos corrigidos na Fila (R-03c virou G,
R-08 G confirmado mas com 1º corte P já entregue). **R-09** (voz nas especialidades) segue sem
spec. Audit do Fable **congelado em R-22** (+ achados de símbolos P1/P3/P4). Ver `plans/ESTADO.md`.

## Fila

Ordem = prioridade. Só entra item com objetivo claro em uma linha.
Peso: **P** (uma sessão) · **M** (2–3 sessões) · **G** (precisa quebrar).

> **Regra de produto (21/07):** *toda especialidade precisa de entrada manual, não só por voz.*
> Se o dentista não ditar, ou se a IA errar, tem que haver caminho pra lançar e corrigir na mão.
> Vale para os itens R-05 a R-08.

> A ordem abaixo é **provisória** — o Mateus revisa depois de ler o R-01 e de trazer o material
> de base de cada especialidade (previsto para 22/07). Nada aqui é especulação: todo item saiu
> de achado verificado no código em 21/07.

> **Visão do modo consulta (cockpit) — 22/07:** a reformulação virou o item **R-15**, e a sessão
> fixou a cadeia de dependência que ordena boa parte da fila:
> **R-01 (id estável) → R-02 (odontograma · grupo · card) → plugins → R-15 (cockpit)** — o cockpit
> não sobe antes das fundações. Visão e decisões (raio-x sem IA, etapas derivadas, orçamento por
> trabalho — adiado) na [spec R-15](specs/R-15-modo-consulta-cockpit.md).

| ID | Item | Objetivo | Peso |
|---|---|---|---|
| R-03c | ⏳ Assinatura de aceite do orçamento (prova de recebimento) | O paciente assina o orçamento que **aceitou pagar** — prova comercial que protege o recebimento do dentista. **Investigado a fundo 28/07** (workflow read-only): a premissa original subestimava o problema — são **5 caminhos** que aprovam orçamento, e em **4 nem o dentista afirma nada** (`registrarPagamentoRapido`, webhook AbacatePay, handler de PIX no WhatsApp). Achado grave: `assinaturas.orcamento_id` é `ON DELETE CASCADE` e `excluirOrcamento` só barra com pagamento `pago` — hoje dá pra apagar orçamento assinado (não pago) em 2 cliques, levando a prova junto. Reusa `assinaturas` do R-03a (`tipo='orcamento'` já cabeado no banco). **Peso corrigido pra G** — quebra em R-03c-1 (aceite assinado + snapshot dos termos, P — entrega prova sozinho), R-03c-2 (congelamento/gate), R-03c-3 (revisar orçamento assinado sem apagar a prova), R-03c-4 (aceite no PDF). Decisão travada 28/07: orçamento assinado que precisa mudar **bloqueia e oferece "Revisar"** (cria novo, o assinado fica read-only). Spec ainda não escrita | G |
| R-09 | ⏳ Voz nas especialidades (pass 2) | `/api/dex/extrair-especialidade` não tem um único chamador — endo e implante são 100% digitados. Começar pela endo | M |
| R-08 | ⏳ Periodontia: periograma — **1º corte (R-08a) codado 28/07** | Roadmap descrevia só o corte final ("tela 6×32"). **Investigado a fundo 28/07:** primeiro corte é o **rastreio PSR/CPITN** (6 códigos, zero SQL — é o exame do clínico geral, e é ele que indica o periograma completo), não a grade de 192 pontos. Sub-itens: **R-08a ✅ codado** (`exame_periodontal` vira registro, [spec](specs/R-08a-exame-periodontal-registro.md)) → R-08b (PSR/CPITN, `detalhe` jsonb, zero SQL) → R-08c (tabela `perio_exames`, grade 6×32, **G de verdade** — migration+RLS+2 contas) → R-08d (PDF + assinatura/imutabilidade) → R-08e (comparação com exame anterior) → R-08f (ditado posicional, parser determinístico, nunca LLM decidindo número). NIC/CAL sempre derivado em TS, nunca persistido (decisão de 16/07 confirmada) | G |
| R-07b | ⏳ Chips de rotina (R-07) chegam ao modo consulta | Achado de carona no R-08a (28/07): profilaxia/flúor/clareamento/raspagem só existem na ficha rápida — grep em `src/app/consulta` por rotina/profilaxia/raspagem = zero. R-07 está ✅ na ficha rápida e furado no outro fluxo | P |
| R-26 | ⏳ Dex vira hub de notificações operacionais — começando por faltosos sem retorno | Ideia do Mateus 28/07. Paciente que **faltou e não voltou** é receita perdida silenciosa — hoje ninguém vê. Vira um card/balão no painel do Dex: pra **secretária** (todos da clínica, é ela que liga) e **por dentista** (os dele). **Não é pontual** — precisa de escopo antes de código: (a) o que conta como "faltou e não retornou"? Existe `agendamentos.status` com `no_show`/`cancelled`, mas "não retornou" é derivado (nenhum agendamento futuro E nenhum atendimento desde) — a janela é decisão de produto; (b) o painel do Dex hoje é assistente de IA, virar hub de notificações operacionais é redesenho de propósito, não um card a mais — e já existe a tabela `notificacoes` (`inserirNotificacao`) usada por consulta/pagamento, então a decisão é se faltoso vira linha de `notificacoes` (derivado on-the-fly não cabe lá) ou consulta própria; (c) silo: a secretária vê tudo, o dentista só os dele — mesmo predicado de `is_own_clinical_record`. Encosta no R-15 (cockpit) só na superfície, não na fundação | M |
| R-10 | ⏳ Rótulo do procedimento no orçamento e no PDF (só falta P2) | **P1 (jargão "- planejado") ✅ verificado em prod (26/07)** — `derivarV2DosEventos` sem o " - planejado". **P2 ⏳ na fila:** tirar a observação clínica (resto radicular etc.) do documento que o paciente lê — `dentes_observacoes` alimenta orçamento **E** prontuário, então o strip precisa de decisão | P |
| R-11 | 🟡 Unificar o caminho de gravação da ficha — **no ar, não verificado** | 4 fases no ar: contrato único `salvarFicha`/`deletarFicha` (`src/server/patients/salvar-ficha.ts`) substitui os 3 caminhos que escreviam `fichas` direto + apaga o código morto achado na investigação (9 caminhos vivos + 4 mortos). Guard de imutabilidade e status derivado no servidor verificados ao vivo em build de produção antes do push. **Zero migration nesta fase.** Gate #6 (admin apaga ficha de outro dentista): achado 28/07 que a RLS estava quebrada (`fichas_delete_admin` sumida do banco vivo — `fichas_write_own` sozinha só libera o dono) — deletarFicha() mentia `ok:true` com 0 linhas. Corrigido (migration 112 + `.select()` no delete pra nunca mais mentir) e confirmado por simulação com `auth.uid()` real dos 2 lados. Commits `1de02c4`/`1949e54`, deploy `dpl_8rEuxQR` (READY). **Falta:** clique ao vivo com 2 contas (a simulação não substitui), decisão sobre `procedimentos_concluidos` (achado fora do escopo da spec durante a execução). [spec](specs/R-11-unificar-gravacao-ficha.md) | M |
| R-24 | ⏳ Indicador de "ficha em aberto" (usar o `status`) | Achado do R-11: `fichas.status` (`aberta`/`concluida`) é gravado mas nunca lido. Este item dá uso real: badge/indicador de ficha em aberto (rascunho não finalizado) no dashboard/lista. **Escopo pendente:** hoje `concluida` = modo consulta e `aberta` = criada no FichasTab — definir se esse recorte é o que "em aberto" deve significar pro usuário (e o que muda uma ficha de aberta→concluída). Ideia do Mateus 26/07 | P |
| R-25 | ⏳ Limpar `setState` síncrono dentro de `useEffect` (cascading renders) | 24 erros de lint "Calling setState synchronously within an effect can trigger cascading renders" em ~20 componentes pré-existentes (dex-widget, dex-presence, floating-dock, ApresentarPanel, use-mobile, useDexGuide…). Não quebra runtime, mas cada um é um render duplo evitável — dívida de performance. Mover o setState pra fora do efeito ou guardar por condição. Achado no lint 26/07 | M |
| R-15 | ⏳ Modo consulta: o cockpit do atendimento | Vira o cockpit do atendimento — procedimentos ativos, odontograma vivo, tabelas, implante, raio-x, gravação como canto pequeno; motor compartilhado com a ficha rápida. [Visão em debate](specs/R-15-modo-consulta-cockpit.md); depende de R-01 · R-02 · plugins | G |

## Congelado

| ID | Item | Por que parou | Descongelar quando |
|---|---|---|---|
| R-22 | 🧊 Achados do audit visual do Fable (115 achados, 15 auditores) — [relatório](auditorias/2026-07-26-relatorio-audit-visual.md) · [fingerprint canônico](auditorias/2026-07-26-fingerprint-canonico.md) · **+ auditoria de símbolos vs norma peruana 27/07** ([relatório](auditorias/2026-07-27-simbolos-odontograma.md): P1 coroa hachura vs circunferência · P2 fratura direcional/ausente · P3 legenda de glifos · P4 sigla de material) | Audit concluído 26/07; Mateus decidiu voltar ao planejamento normal do roadmap antes de atacar o polimento visual | Quando o Mateus quiser voltar ao design. Estrutura de retomada já está no relatório: lote emergência (**`globals.css:267` — 1 linha, app inteiro renderiza corpo em Times; candidato a /pontual antes dos demais**), lote porta-de-entrada (Auth D + Landing C + opacity:0), lote sweep de consistência (CTA único, chips ink, mono, coral), e ícones de procedimento (grid de 2 pesos no odontograma) |

## Concluído

| ID | Item | Fechado | Spec |
|---|---|---|---|
| R-03b | ✅ Assinatura por procedimento — captura/UI: os 3 fluxos legados (ficha rápida, recepção, fim de consulta) migrados pro caminho granular; `AssinarBar` pra seleção de subconjunto | 2026-07-28 | [R-03b](_arquivo/specs/R-03b-assinatura-captura-ui.md) |
| R-03a | ✅ Assinatura por procedimento — modelo + congelamento: tabela `assinaturas`, trigger de imutabilidade, RPC `assinar_procedimentos` (migrations 111/112) | 2026-07-28 | [R-03a](_arquivo/specs/R-03a-assinatura-por-procedimento.md) |
| R-07 | ✅ Procedimentos de rotina (profilaxia · flúor · clareamento · raspagem) — chips na evolução, nível boca/quadrante, card "Boca toda", PDF | 2026-07-27 | [R-06/R-07](_arquivo/specs/R-06-07-tipos-novos-especialidades.md) |
| R-06 | ✅ Prótese fixa e odontopediatria — ponte (grupo pilar/pôntico + linha derivada) e esfoliação | 2026-07-27 | [R-06/R-07](_arquivo/specs/R-06-07-tipos-novos-especialidades.md) |
| R-05 | ✅ Ortodontia: lançamento e edição manual (`OrtoForm` montado no FichasTab) | 2026-07-27 | [R-05](_arquivo/specs/R-05-orto-lancamento-manual.md) |
| R-04b | ✅ Encaminhamento: observação do autor + destino preenche detalhe (endo/implante) | 2026-07-26 | [R-04b](_arquivo/specs/R-04b-encaminhamento-detalhe-clinico.md) |
| R-21 | ✅ Registros agrupados por dente | 2026-07-26 | [R-21](_arquivo/specs/R-21-registros-por-dente.md) |
| R-20 | ✅ Redesenho da ficha odontograma (lado a lado, responsivo) | 2026-07-26 | [R-20](_arquivo/specs/R-20-ficha-odontograma-redesign.md) |
| R-19 | ✅ Barras contextuais acima do dock (convenção `--dock-inset`) | 2026-07-26 | sem spec (design decision inline) |
| R-18 | ✅ Filtro por responsável não trava em tela vazia | 2026-07-26 | sem spec ([auditoria 24/07](auditorias/2026-07-24-ficha-odontograma.md)) |
| R-17 | ✅ EncaminharBar não colide com o dock | 2026-07-26 | sem spec ([auditoria 24/07](auditorias/2026-07-24-ficha-odontograma.md)) |
| R-16 | ✅ Filtro por responsável na ficha | 2026-07-26 | [R-16](_arquivo/specs/R-16-filtro-responsavel-ficha.md) |
| R-12 | ✅ Contraste AA — sweep teal-ink (o CTA canônico gradiente+glow segue no R-22) | 2026-07-26 | sem spec (valores no R-01 arquivado) |
| R-04 | ✅ Encaminhamento de procedimento (base: destino marca realizado) | 2026-07-26 | [R-04](_arquivo/specs/R-04-encaminhar-procedimento.md) |
| R-02 | ✅ Ficha viva + fidelidade (símbolos, card único, grupo, Fase 3) | 2026-07-26 | [R-02](_arquivo/specs/R-02-ficha-viva-fidelidade-artefato.md) |
| R-01 | ✅ Ficha: o registro como unidade de salvamento | 2026-07-23 | [R-01](_arquivo/specs/R-01-registro-unidade-salvamento.md) |
| R-14 | ✅ Dashboard da secretária monta "hoje" no fuso do servidor | 2026-07-23 | sem spec (pontual — mesma classe do `feb4b68`) |
| R-13 | ✅ Agenda: janela de busca, multi-dentista e clique na grade | 2026-07-22 | [R-13](_arquivo/specs/R-13-agenda-janela-multidentista.md) |

## Cortado

| ID | Item | Por que não vamos fazer |
|---|---|---|

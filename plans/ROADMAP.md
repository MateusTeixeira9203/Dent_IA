# Roadmap — Odonto.IA

> **ROADMAP** · **Odonto.IA** · atualizado 2026-07-26
> **Ativo:** nenhum — R-04b executado, no ar e **fechado** (26/07) ·
> **Fila:** 12 (specs prontas: R-03a, R-11) · **Concluídos:** 13 · **Congelados:** 1 ·
> **Fechados hoje (26/07):** o lote (R-21/R-20/R-19/R-18/R-17/R-16/R-12/R-04/R-02) + **R-04b** → Concluído ·
> R-10 P1 verificado (P2 na fila). Deploys no ar: `929f84e..47a6e19` (lote) + `47a6e19..866c1d4` (R-04b + migration 110).

> Reconstruído do zero em 2026-07-21 por decisão do Mateus. O histórico anterior está no
> git (`git show 4a93234:plans/roadmap/roadmap-mestre-2026-07-21.md`) e na pasta
> `Desktop/roadmap,spec, handofs antigos/` — consulta, não operação.

**Status:** ⏳ fila · 🔵 ativo (máx 1) · 🟡 no ar não verificado · ✅ no ar e verificado ·
🧊 congelado · ✂️ cortado. **Código escrito ≠ código verificado** — 🟡 se trata como não-feito.

## Agora

**Lote da semana no ar e VALIDADO (26/07):** push `929f84e..47a6e19` → Vercel prod (gates: typecheck ✅,
build ✅, migration 109 conferida no schema ✅). Mateus validou tudo em prod → **9 itens fechados**
(R-21/R-20/R-19/R-18/R-17/R-16/R-12/R-04/R-02, ver Concluído; specs/artefatos movidos pro `_arquivo/`).
R-10 P1 verificado, P2 segue na fila. **R-04b executado, no ar e fechado (26/07)** — migration 110
aplicada + 2 contas testadas pelo Mateus + deploy `866c1d4`. **Ativo agora:** nenhum — próximo é
**executar R-03a ou R-11** (specs prontas) ou escopar mais da fila (R-05/R-09). Audit do Fable **congelado em R-22**. Ver `plans/ESTADO.md`.

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
| R-03a | ⏳ Assinatura por procedimento — modelo + congelamento (backend) — **spec pronta pra execução** | Tabela `assinaturas` (assinatura por LOTE de realizados) + `odontograma_eventos.assinatura_id` + **trigger de imutabilidade no banco** + RPC `assinar_procedimentos` (secretária/dentista via RPC estreita, CRO do autor). Fecha o furo de imutabilidade só-app de hoje. Decisões travadas 26/07. **Mexe em prod (migration+RLS): migration sozinha primeiro, 2 contas.** [spec](specs/R-03a-assinatura-por-procedimento.md) | M |
| R-03b | ⏳ Assinatura por procedimento — captura/UI + reconciliar os 3 fluxos legados | Depende de R-03a no ar. UI de captura (AssinarBar no modo-seleção do R-04 + signature_pad), estado "assinado" por registro no card, e unificar os 3 fluxos de assinatura de ficha que hoje escrevem em `fichas.assinado_em` sem se conhecer. **Overlap com R-11** — coordenar antes de codar. Decisões #4/#6/#7 pendentes. [sketch na spec R-03a](specs/R-03a-assinatura-por-procedimento.md) | M |
| R-03c | ⏳ Assinatura de aceite do orçamento (prova de recebimento) | O paciente assina o orçamento que **aceitou pagar** — prova comercial/contrato que protege o recebimento do dentista (hoje o status `aprovado` é só o dentista afirmando). **Reusa a tabela `assinaturas` genérica do R-03a** (`tipo='orcamento'`): liga `orcamentos.assinatura_id` + trigger que **congela os termos** (itens + total) do orçamento assinado (senão editar o orçamento depois esvazia a assinatura) + RPC `assinar_orcamento`. Encaixa no fluxo "aprovar orçamento". Depende de R-03a no ar. Escopo a fundo depois. Ideia do Mateus 26/07 | M |
| R-05 | ⏳ Ortodontia: lançamento e edição manual | `OrtoForm` existe e **nunca é renderizado** — hoje só a voz cria manutenção e não há como corrigir. Registro de arcada, não de dente | P |
| R-07 | ⏳ Procedimentos de rotina sem dono | `profilaxia`, `raspagem`, `clareamento`, `fluor`, `exame_periodontal` entraram no banco na migration 106 e não existem em plugin, chip nem enum da IA — "fiz profilaxia" não vira registro | M |
| R-06 | ⏳ Prótese fixa e odontopediatria completas | `ponte` e `esfoliacao` estão barradas no enum da IA e ausentes dos chips; faltam os símbolos (colchete pilar-pôntico, seta do permanente) | M |
| R-09 | ⏳ Voz nas especialidades (pass 2) | `/api/dex/extrair-especialidade` não tem um único chamador — endo e implante são 100% digitados. Começar pela endo | M |
| R-08 | ⏳ Periodontia: periograma | Tela própria (6 sítios × 32 dentes), tabela `perio_exames` — hoje só existe a declaração no registry. NIC calculado, nunca digitado | G |
| R-10 | ⏳ Rótulo do procedimento no orçamento e no PDF (só falta P2) | **P1 (jargão "- planejado") ✅ verificado em prod (26/07)** — `derivarV2DosEventos` sem o " - planejado". **P2 ⏳ na fila:** tirar a observação clínica (resto radicular etc.) do documento que o paciente lê — `dentes_observacoes` alimenta orçamento **E** prontuário, então o strip precisa de decisão | P |
| R-11 | ⏳ Unificar o caminho de gravação da ficha — **spec pronta pra execução (decisões travadas 26/07)** | Investigação achou **9 caminhos vivos + 4 grupos de código morto** (não 2) criando/editando/apagando ficha de 6+ formas, sem Zod em nenhum. Reenquadre: o `status` é escrito mas **nunca lido** (não há bug de status), e há **2 furos de segurança vivos** — client apaga ficha sem checar autoria, e UPDATE de conteúdo de ficha assinada não é barrado no servidor. R-11 afunila create/update/delete num `salvarFicha`/`deletarFicha` (`src/server/patients/salvar-ficha.ts`) com Zod + guard de imutabilidade, e apaga o código morto. **Zero migration/RLS.** 4 fases (Fase 0 = apagar morto, pode ir sozinha). [spec](specs/R-11-unificar-gravacao-ficha.md) | M |
| R-24 | ⏳ Indicador de "ficha em aberto" (usar o `status`) | Achado do R-11: `fichas.status` (`aberta`/`concluida`) é gravado mas nunca lido. Este item dá uso real: badge/indicador de ficha em aberto (rascunho não finalizado) no dashboard/lista. **Escopo pendente:** hoje `concluida` = modo consulta e `aberta` = criada no FichasTab — definir se esse recorte é o que "em aberto" deve significar pro usuário (e o que muda uma ficha de aberta→concluída). Ideia do Mateus 26/07 | P |
| R-25 | ⏳ Limpar `setState` síncrono dentro de `useEffect` (cascading renders) | 24 erros de lint "Calling setState synchronously within an effect can trigger cascading renders" em ~20 componentes pré-existentes (dex-widget, dex-presence, floating-dock, ApresentarPanel, use-mobile, useDexGuide…). Não quebra runtime, mas cada um é um render duplo evitável — dívida de performance. Mover o setState pra fora do efeito ou guardar por condição. Achado no lint 26/07 | M |
| R-15 | ⏳ Modo consulta: o cockpit do atendimento | Vira o cockpit do atendimento — procedimentos ativos, odontograma vivo, tabelas, implante, raio-x, gravação como canto pequeno; motor compartilhado com a ficha rápida. [Visão em debate](specs/R-15-modo-consulta-cockpit.md); depende de R-01 · R-02 · plugins | G |

## Congelado

| ID | Item | Por que parou | Descongelar quando |
|---|---|---|---|
| R-22 | 🧊 Achados do audit visual do Fable (115 achados, 15 auditores) — [relatório](auditorias/2026-07-26-relatorio-audit-visual.md) · [fingerprint canônico](auditorias/2026-07-26-fingerprint-canonico.md) | Audit concluído 26/07; Mateus decidiu voltar ao planejamento normal do roadmap antes de atacar o polimento visual | Quando o Mateus quiser voltar ao design. Estrutura de retomada já está no relatório: lote emergência (**`globals.css:267` — 1 linha, app inteiro renderiza corpo em Times; candidato a /pontual antes dos demais**), lote porta-de-entrada (Auth D + Landing C + opacity:0), lote sweep de consistência (CTA único, chips ink, mono, coral), e ícones de procedimento (grid de 2 pesos no odontograma) |

## Concluído

| ID | Item | Fechado | Spec |
|---|---|---|---|
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

# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-03 16:00** · reorganizado por **importância pro dentista**
> **Ativo:** **R-46 (Meu dia)** — R-46a ✅ · R-46g 🟡 · R-46b 🟡 · R-46b2 🟡 provado no banco ·
> **cockpit (C0-C5) 🟡 todos codados, testados ao vivo, commitados 03/08** — nada em produção
> · **R-46c (colar do Word) 🟡 codado, migration aplicada, testado ao vivo 03/08** · **R-55
> (dedup) 🟡 codado e testado ao vivo 03/08** · **C5 (seleção múltipla) 🟡 testado ao vivo**
> **Faltam no R-46:** C6 (layout novo, sem spec) · **R-46d** 💡 campo mágico com IA — não é
> extensão do R-46c, é componente único (arquivo+voz+organizar); ver
> `memory/project_campo_magico_unico.md`
> **R-48 (voz confiável) ✅ commitado 03/08** — codado numa sessão anterior (01/08, 7 gates,
> G1 no iPhone real), não retestado hoje
> **Novos de 02/08:** **R-46h** 💡 um botão salva + abre orçamento ·
> **[R-49](specs/R-49-voz-e-campos-de-especialidade.md)** ⏳ voz e campos de especialidade,
> entra depois do cockpit · **R-50** 🐛 orto sem ativação manual
> **Novos de 03/08:** **R-51 a R-54** — modelo multi-sessão, encaminhar no "A fazer",
> orçamento pelos indicados em aberto, ficha duplicada no mesmo dia (sem spec, interdependentes)
> · **R-56** 🐛 2 surfaces a mais (`fichasRecentes`, lista do `FichasTab`) vazam ficha sem
> checar `origem` — achado testando o R-46c, não urgente
> **Fila:** 24 · **🟡 no ar/codado sem deploy:** 21 · **Concluídos:** 24 · **Congelado:** 1
> **Próximo:** decidir push do que já está pronto (cockpit+R-55+R-46c+R-48+pontual, 9 commits)
> · C6 do cockpit (precisa de spec) · spec do R-46d · spec do bloco R-51-54 · R-28 Parte 3
> **Discussão aberta:** [como diminuir o atrito](discussoes/como-diminuir-o-atrito.md) (estado × evento)

**Status:** ⏳ fila · 🔵 ativo (máx 1) · 🟡 no ar **não** verificado · ✅ no ar **e** verificado ·
🧊 congelado · ✂️ cortado · 💡 ideia sem spec.
**Código escrito ≠ código verificado** — 🟡 se trata como não-feito.

**Roadmap é mapa, spec é conteúdo.** Cada linha aqui cabe em duas. Se precisar de mais, o
detalhe está errado de lugar — vai pra spec.

---

## O critério (decidido 30/07)

A ordem deixou de ser por dependência técnica e passou a ser **por importância pro dentista**.
A razão: *"o dentista antes usava uma tabelinha no Word que funcionava bem, e agora no sistema
é muita coisa, muitos cliques — é um preço que muitos dentistas podem não querer pagar."*

O concorrente é o Word. Ele perde em tudo, menos na única métrica que o dentista sente todo
dia: **gestos por registro**. Item que aumenta gesto sem devolver benefício **na hora** perde
prioridade, por melhor que seja.

| | Bloco | Por quê |
|---|---|---|
| 1º | **Ficha e paciente** | É onde o Word ainda ganha, e onde estão os defeitos que ele relatou |
| 2º | **Orçamento e financeiro** | Design aprovado, é o benefício que volta pro dentista |
| 3º | **Assinatura e prova** | Protege o dentista; não é urgência operacional |
| — | **Fundação e risco** | Atravessa tudo. Entra quando o bloco de cima encostar nele |

---

## Bloco 1 — Ficha e paciente

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-46](specs/R-46-meu-dia.md) | **Meu dia — a ficha no dia real; o novo modo consulta** (rail do dia, contexto à vista, registrar em lote, colar do Word, Dex em lista) | 🔵 **em execução** · R-46a ✅ · **[R-46g](specs/R-46g-porta-modo-consulta.md) 🟡** (porta; A1 do gate de assinatura **ignorada** — sem sistema de pagamento) · **[R-46b](specs/R-46b-registrar-meu-dia.md) 🟡** (registrar — interação testada 01/08, A3/A4 fechadas) · **[R-46b2](specs/R-46b2-salvar-chamar-proximo.md) 🟡 codado e provado no banco** — o Meu dia salva de verdade · **[R-46c](specs/R-46c-colar-do-word.md) 🟡 codado e provado 03/08** (migration aplicada, importação testada ao vivo com prova no banco/PDF/timeline) · **[cockpit](specs/R-46-cockpit.md) spec `aprovada` + [contrato](specs/R-46-cockpit-contrato.md) — C0 a C5 todos 🟡 codados, testados ao vivo, commitados** (nada em produção ainda). **Faltam:** C6 (layout novo — tirar "Já feito", painel do dente na direita; ainda não especificado) e o R-46d (campo mágico com IA — ver linha própria) | G |
| **R-46d** | 💡 **Campo mágico com IA no Meu dia** — não é "R-46c + um botão organizar": é 1 componente com responsabilidade completa (arquivo, voz, ou estruturar em procedimento). `CapturaLivreCard` (perfil) já faz os 3; a pergunta é se ele migra pro Meu dia ou nasce um novo compartilhado | 💡 achado 03/08, ao revisar o R-46c — ver [memory `project_campo_magico_unico.md`]. Sem spec. A lógica de merge/dedup do resultado da IA hoje está presa e privada em `FichasTab.tsx` (`aplicarEvolucaoDoOrganizar`) — extrair é trabalho real, não é plugar direto | G |
| **R-46h** | 💡 **Um botão: salva a visita e já abre o orçamento** — extrai `NovoOrcamentoModal`/`FichaParaOrc` de `paciente-detail-client.tsx` pra componente compartilhado, sem duplicar | 💡 02/08 — **decidido por ele: um gesto faz tudo** (resolve o `fichaId` que só existe pós-save). [R-46-cockpit.md §5a](specs/R-46-cockpit.md). Sem spec ainda — entra quando o cockpit codar | M |
| [R-49](specs/R-49-voz-e-campos-de-especialidade.md) | **Voz e campos de especialidade** — preencher sem digitar 17 vezes. Ele mesmo pôs na fila: *"depois que a gente terminar de construir tudo isso a gente vai refinar a voz"* | ⏳ **spec escrita 02/08** (fase `debate`), entra **depois do cockpit**. D1: parser **determinístico** come **texto** (`(texto) => EndoDetalhe`, precedente `perio.ts:154`) · D2: a revisão **é** a tabela · voz **nunca escreve milímetro**. Dado que reposiciona: **66% dos endos têm odontometria vazia** | G |
| **R-50** | 🐛 **Orto tem 2 furos, um item só:** (a) `orto.ts:18` — `arcada` é enum **não-nullable** enquanto os outros 4 campos são nullable, e como o pass 1 já extrai `orto_manutencao` por IA, o schema **obriga a IA a inventar a arcada**; (b) `orto.ts:30` — `tiposEvento: []`, então **nenhum tipo do catálogo liga o `OrtoForm`**: sem campo mágico, manutenção ortodôntica não tem como ser registrada na mão | ⏳ achado 02/08 (a: medição de produção · b: pergunta dele sobre ativação manual). (a) viola a I5 em campo clínico; (b) deixa uma especialidade inteira dependente de IA. [§5a](specs/R-46-cockpit.md) | P |
| **R-51** | Procedimento multi-sessão (canal, implante): "em andamento" vira **derivado** do `grupo_id` — sem 3º status novo | ⏳ achado 03/08, discutindo o cockpit. Workflow confirmou: 3º status quebra 23 arquivos em silêncio (zero exhaustive check no TS); `grupo_id` + `grupos-abertos.ts` já é o modelo, zero migration. `get-meu-dia.ts` precisa parar de fechar a pendência cedo (`chaveAncora` ignora `grupo_id`) | G |
| **R-52** | Encaminhar pendência pro outro dentista **dentro do bloco "A fazer"** do cockpit — sem painel (painel foi rejeitado no design-shotgun de 24/07) | ⏳ decidido 03/08 — `EncaminharBar`/RPC/RLS já existem e são reusáveis, mas `MeuDiaPendencia` não carrega `dentistaId` nem `encaminhado_para`; a ação falha o lote inteiro se algum item for de outro autor ou de ficha assinada | M |
| **R-53** | Orçamento nasce de **todos os indicados em aberto do paciente**, não só os registrados hoje | ⏳ decidido 03/08. Amarrado ao R-51 (indicado de sessão em andamento entra?) e ao R-52 (encaminhado não entra na conta) | M |
| **R-54** | 🐛 `salvarVisitaMeuDia` sempre faz `INSERT`, nunca checa se já existe ficha do paciente hoje — 2ª gravação no mesmo dia cria ficha solta, sem juntar | ⏳ achado 02/08, **real em produção**, não teórico — `fichas` não tem FK pra `agendamentos`. Fica mais frequente com a decisão de 03/08 de que toda "visita rápida" também gera ficha. Decisão pendente: 2ª gravação acrescenta na ficha do dia, ou cria outra? | G |
| [R-55](specs/R-55-historico-sem-perda-de-dado.md) | 🐛 Dedup por âncora em `get-meu-dia.ts` esconde procedimento repetido — histórico e "Já feito" mostram só 1 ocorrência por âncora, sempre, mesmo com datas diferentes | 🟡 **aprovada, codada e testada ao vivo 03/08** — registrei uma 2ª profilaxia real, banco confirma as 2 linhas, tela agrupa certo ("2×") em vez de esconder uma. Emenda em `R-46-cockpit.md`/contrato aplicada. **Ainda bloqueia** histórico detalhado e o C6 do cockpit | G |
| **R-56** | 🐛 `fichasRecentes` (resumo do paciente) e a lista de fichas do `FichasTab` também mostram "Evolução"/dentista sem checar `origem` — mesma classe de defeito do R-46c (achado 3), só que em 2 surfaces que a spec original não mapeou | ⏳ achado 03/08, testando o R-46c ao vivo. Não é urgente (não é PDF/timeline oficial), mas é a mesma mentira de honestidade do prontuário em superfícies menores | P |
| [R-30](specs/R-30-ficha-fonte-unica-procedimento.md) | Ficha: fonte única de procedimento — mata a divergência entre `dentes_observacoes` e `odontograma_eventos` | 🟡 **commitado e em produção** (30/07 noite), bug relatado por ele **confirmado corrigido em produção**. **Parte 1 destrava 24 de 87 fichas (27,6%)** que rejeitavam o save ao editar. Falta o gate de 2 contas pra virar ✅ | G |
| [R-31a](specs/R-31a-paciente-unico-prevencao.md) | Paciente único: **prevenção** — parar de criar duplicata | 🟡 **codado, testado ao vivo, commitado e no ar** (push 31/07) — §3.2, §3.3, §3.1, §3.4 completos. G1/G2/G4 confirmados com bug real achado e corrigido em cada um (ver handoff). G3 (toque no celular) e G5 (toast do agendamento) só confirmados por lógica — dev tooling não deixou ver o toast renderizar. Falta gate de 2 contas | M |
| [R-31b](specs/R-31b-paciente-unico-unificacao.md) | Paciente único: **unificação** dos 16 grupos existentes | ⏳ aprovada, depende da R-31a no ar. Nunca `DELETE` — `merged_into_id` reversível | M |
| [R-29](specs/R-29-silo-resto-modelo-antigo.md) | Paciente é da clínica: identidade multi-clínica + lista sem filtro por dentista | 🟡 aplicado (migration 120), falta o gate de 2 dentistas comuns | M |
| [R-41](specs/R-41-editar-paciente-completa-cadastro.md) | **Editar paciente fecha o cadastro que o fluxo rápido deixa aberto** — CPF, data de nascimento e responsável de menor | 🟡 **codado, testado ao vivo, commitado e no ar** (push 31/07) — G3-G6 confirmados (CPF duplicado bloqueia com mensagem clara, não colide consigo mesmo, menor revela responsável sem bloquear salvar). G1/G2/G7/G8 só por leitura de código | M |
| **R-42** | 💡 **Odontograma geral do paciente**, só leitura, agregando todas as fichas, com a ficha como cursor no tempo | 💡 ideia em discussão 30/07. Depende do R-30. Aberto: o que o dente mostra (estado atual × histórico) e onde entra procedimento sem dente | ? |
| [R-24](ROADMAP.md) | Indicador de "ficha em aberto" (usar o `status`, hoje gravado e nunca lido) | ⏳ sem spec — falta definir o que "em aberto" significa pro usuário | P |
| R-07b | Chips de rotina (R-07) chegam ao modo consulta | ⏳ sem spec | P |

## Bloco 2 — Orçamento e financeiro

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-39](specs/R-39-orcamento-dinheiro-esqueleto-unico.md) | **Orçamento e dinheiro: um esqueleto só** — criar e criado com o mesmo layout, coluna do dinheiro, funil no financeiro | 🟡 **R-39a e R-39b codados, testados ao vivo, commitados e no ar** (push 31/07) — PDF/WhatsApp adiantados do R-33. R-39b: consistência visual do aceite + coluna "Pago" em `/dashboard/orcamentos`. Faltam: gate de 2 contas, mobile completo, R-39c | G |
| [R-34](specs/R-34-plano-de-pagamento.md) | Plano de pagamento: registrar o acordo (à vista / parcelado / `valor_acordado`) | 🟡 3 commits codados e testados, commitado e em produção. **Achado 30/07 noite: a rota do PDF tinha bug próprio (404 sempre), corrigido — mas ainda sem commit**, só verificado em localhost. Falta: subir esse fix, gate de 2 contas, e conferir `condicoes_pagamento` num PDF de orçamento parcelado especificamente | M |
| [R-33](specs/R-33-orcamento-tela-unica.md) | Orçamento: uma tela só — mata o painel de `/dashboard/orcamentos`, porta 15 itens | ⏳ espera R-34 e **R-39a** (que define a forma onde os 15 pousam) | G |
| [R-32](specs/R-32-orcamento-visivel-autor-admin-secretaria.md) | Orçamento visível para autor, admin e secretária | 🟡 aplicado (migration 121), falta o gate — G4/G5 são a prova anti-vazamento | P |
| [R-28](specs/R-28-pagamento-fecha-sem-duplicar.md) | Pagamento: grava quem registrou + fecha parcela sem duplicar recebimento | 🟡 partes 1+2 verificadas na Teste01, falta confirmar em prod | M |
| [R-38](specs/R-38-orcamento-apresentacao-ao-paciente.md) | Orçamento: como o paciente vê — PDF sem preço por item, só total e condição | 🟡 **codado, testado ao vivo, commitado e no ar** (push 31/07) — migration aplicada, toggle no rodapé, PDF respeita o flag, snapshot do aceite confirmado gravando o flag (G1-G6 verificados) | P |
| [R-10](ROADMAP.md) | P2: tirar a observação clínica do documento que o paciente lê | ⏳ P1 ✅ em prod. P2 precisa de decisão — `dentes_observacoes` alimenta orçamento **e** prontuário | P |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-40** | **Template de contrato/termo pra assinatura** — hoje se assina procedimento e orçamento, mas **não existe texto de termo** (`lib/documentos/modelos.ts` só tem atestado e receita) | ⏳ **decisão pendente:** termo de consentimento (clínico) **ou** contrato de prestação (comercial)? Muda o item inteiro | ? |
| [R-03c](specs/R-03c-1-aceite-assinado-orcamento.md) | Aceite assinado do orçamento — prova de recebimento | 🟡 R-03c-1 no ar, falta gate de 2 contas. Restam c-2 (congelamento), c-3 (revisar sem apagar prova), c-4 (aceite no PDF) | G |

## Bloco 4 — Fundação e risco

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-37](ROADMAP.md) | `fichas.dentista_id` é `ON DELETE CASCADE` — apagar 1 dentista levaria 18 fichas da Jenaina, 18 do Armando, 14 do Renato | ⏳ **mina enterrada** (zero `DELETE` em `dentistas` hoje). Vira alcançável com R-31b e R-36 — entra **antes** deles | M |
| [R-36](specs/R-36-um-login-uma-clinica.md) | Um login, uma clínica — fim do multi-clínica e do seletor | ⏳ planejada. **Ajuste 30/07:** admin fica como está, vira conta burocrática depois | G |
| [R-35](specs/R-35-riscos-nao-reportados.md) | 14 riscos da auditoria de 29/07 | 🟡 10 codados/aplicados, **4 verificados ao vivo**. Faltam itens 4, 7, 10 | M |
| **R-43** | Varredura de todas as `SECURITY DEFINER` de RLS com fallback sem casar clínica | ⏳ **3ª ocorrência achada** (`get_my_role`, `get_my_dentista_id`, `has_active_membership`). Achar de uma vez em vez de uma por acidente | P |
| **R-44** | Varredura de embeds Postgrest com FK ambígua (`tabela:outra(...)` sem `!` desambiguando) — mesmo padrão do bug corrigido no PDF (R-34) | ⏳ **achado 30/07 à noite**, confirmado ao vivo (300 real nos logs do Supabase) em `agendamentos`: `get-patient-workspace-data.ts:110`, `get-visible-timeline-events.ts:66` e `:75`. **`orcamentos/page.tsx:64` — confirmado e corrigido 31/07** (lista de `/dashboard/orcamentos` voltava 0 orçamentos, silencioso). **2 achadas a mais 31/07** (busca sensível a acento, mesma família): `command-palette.tsx:105`, `atender-agora-modal.tsx:57` — não confirmadas nem corrigidas. Seguem abertas 5 no total | P |
| [R-25](ROADMAP.md) | 24 `setState` síncronos dentro de `useEffect` (cascading renders) | ⏳ dívida de performance, não quebra runtime | M |
| **R-47** | Ficha rápida: Organizar com Dex apagava dado sem aviso (2x) + `alerta_novo` nunca persistia e era apagável | 🟡 **corrigido 31/07** — [achado, fix e 2 rodadas de verificação adversarial](auditorias/2026-07-31-fase0-dex-ficha-rapida.md#correção-r-47--2-rodadas-3107). Typecheck/lint/build limpos; **falta teste ao vivo** (pane do browser não compositou nesta sessão). Trade-off aceito e documentado: duplicata visível se o Dex reextrai o mesmo procedimento com status diferente — fica pro R-46d | G |

## Bloco 5 — Depois

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-08](specs/R-08-contrato-clinico-perio.md) | Periodontia: periograma — R-08c (tabela + grade 6×32) → d (PDF) → e (comparação) → f (ditado) | ⏳ R-08a e R-08b ✅. [Contrato clínico](specs/R-08-contrato-clinico-perio.md) travado | G |
| [R-26](ROADMAP.md) | Dex vira hub de notificações operacionais — faltosos sem retorno | ⏳ sem spec. Precisa definir o que é "faltou e não voltou" | M |
| **R-45** | 💡 Retorno automático por tipo de procedimento (recall) — profilaxia a cada 6 meses, orto mensal etc. — dispara aviso de WhatsApp antes do prazo vencer | 💡 ideia levantada 31/07. Proativo (antes de vencer), diferente do R-26 (reativo, depois que já faltou). Ele mexe no WhatsApp amanhã de manhã — ainda não mapeado, não é spec | ? |
| [R-09](ROADMAP.md) | Voz nas especialidades — `/api/dex/extrair-especialidade` não tem um único chamador | ⏳ sem spec | M |

---

## 🔬 Em investigação (30/07, rodando)

Dois mapeamentos em curso. **Nada aqui vira item até o resultado chegar.**

| O quê | Cobre |
|---|---|
| **4 demandas novas** | dentista ver todos os pacientes · orto com 2 medidas por arcada · repaginada do financeiro · painel de notificações do Dex |
| **Mapa de atrito** | conta os gestos reais de 6 caminhos e separa atrito **estrutural** (compra estrutura) de **acidental** (de graça remover) |

**Conflito já identificado, esperando o resultado:** o modelo 3.1 declara **agenda como
privada**, e a demanda pede que dentista veja "horários marcados". Pode ser conflito aparente
— ver *a agenda do Dr. Y* é diferente de ver *os agendamentos do paciente X*.

## 🧊 Congelado

| ID | Item | Descongelar quando |
|---|---|---|
| [R-22](auditorias/2026-07-26-relatorio-audit-visual.md) | Audit visual do Fable (115 achados) + [símbolos vs norma](auditorias/2026-07-27-simbolos-odontograma.md) | Quando ele quiser voltar ao design. Lote de emergência já identificado |

## ✅ Concluído

| ID | Item | Fechado |
|---|---|---|
| [R-48](_arquivo/specs/R-48-voz-confiavel.md) | Voz confiável — mic iOS, retry sem perder texto, falha no meio do ditado não descarta áudio | 2026-08-01 |
| R-27 | Redesign do padrão de modal/painel (orçamento + agendamento) | 2026-07-29 |
| R-11 | Contrato único `salvarFicha`/`deletarFicha` | 2026-07-28 |
| R-08b | Rastreio periodontal (PSR/CPITN) | 2026-07-29 |
| R-08a | Exame periodontal vira registro | 2026-07-28 |
| R-05b | Orto: atalho "+ Manutenção" com pré-preenchimento | 2026-07-28 |
| R-03b | Assinatura por procedimento — captura/UI | 2026-07-28 |
| R-03a | Assinatura por procedimento — modelo + congelamento | 2026-07-28 |
| R-07 | Procedimentos de rotina (profilaxia · flúor · clareamento · raspagem) | 2026-07-27 |
| R-06 | Prótese fixa e odontopediatria (ponte, esfoliação) | 2026-07-27 |
| R-05 | Ortodontia: lançamento e edição manual | 2026-07-27 |
| R-04b | Encaminhamento: observação do autor + detalhe clínico | 2026-07-26 |
| R-21 | Registros agrupados por dente | 2026-07-26 |
| R-20 | Redesenho da ficha odontograma (lado a lado) | 2026-07-26 |
| R-19 | Barras contextuais acima do dock | 2026-07-26 |
| R-18 | Filtro por responsável não trava em tela vazia | 2026-07-26 |
| R-17 | EncaminharBar não colide com o dock | 2026-07-26 |
| R-16 | Filtro por responsável na ficha | 2026-07-26 |
| R-12 | Contraste AA — sweep teal-ink | 2026-07-26 |
| R-04 | Encaminhamento de procedimento (base) | 2026-07-26 |
| R-02 | Ficha viva + fidelidade (símbolos, card, grupo) | 2026-07-26 |
| R-01 | Ficha: o registro como unidade de salvamento | 2026-07-23 |
| R-14 | Dashboard da secretária monta "hoje" no fuso do servidor | 2026-07-23 |
| R-13 | Agenda: janela de busca, multi-dentista, clique na grade | 2026-07-22 |

Specs dos concluídos: `plans/_arquivo/specs/`.

## ✂️ Cortado

| ID | Item | Por quê |
|---|---|---|
| R-15 | Modo consulta: o cockpit do atendimento | Absorvido pelo R-46 (31/07) — o Meu dia É o novo modo consulta; a rota `/consulta` aposenta nas fases do R-46 §5. Spec em `_arquivo/specs/` |
| R-35 itens 8 e 13 | Apagar dado antigo | Decisão de 29/07: não apagar nada |
| R-33 descarte 3 | QR Code PIX | O QR gerado é string descritiva, não payload PIX válido |

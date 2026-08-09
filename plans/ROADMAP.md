# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-08** · ordenado por **importância pro dentista**
> **Push de 08/08 feito e deployado** (`dentia.app.br`, `dpl_oeSRUa3a`, READY) — R-75/R-82/R-84
> e o fix do `data-active` estão em produção de verdade, não só commitados.
> **Fila:** 20⏳ · **🟡 codado/no ar sem verificação pessoal dele:** 36 · **💡 ideia sem spec:** 3 ·
> **Concluídos:** 32 · **Congelado:** 3 · **Cortado:** 10
> **09/08:** R-85/R-86 commitados (sem push) · R-65/R-66/R-28-parte3 codados e testados por
> mim, working tree, sem commit — ver `ESTADO.md`
> **Próximo:** fila livre, nenhum item 🔵 ativo — decide com `/planejar` ou `/discutir`
> **Discussão aberta:** [como diminuir o atrito](discussoes/como-diminuir-o-atrito.md) (estado × evento)

**Status:** ⏳ fila · 🔵 ativo (máx 1) · 🟡 no ar **não** verificado · ✅ no ar **e** verificado ·
🧊 congelado · ✂️ cortado · 💡 ideia sem spec.
**Código escrito ≠ código verificado** — 🟡 se trata como não-feito.

**Roadmap é mapa, spec é conteúdo.** Cada linha aqui cabe em duas. Se precisar de mais, o
detalhe está errado de lugar — vai pra spec. Narrativa de sessão mora no handoff, não aqui.

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
| [R-46](specs/R-46-meu-dia.md) | **Meu dia — épico original** (rail, contexto à vista, registrar em lote, Dex em lista) | 🟡 **layout realizado pelo R-78 ✅** (supera o cockpit C0-C7 antigo). Campo mágico é o R-46d, porta do modo consulta é o R-46g — épico guarda-chuva, sem trabalho próprio restante | G |
| [R-46g](specs/R-46g-porta-modo-consulta.md) | Porta do modo consulta pro Meu dia | 🟡 codado — gate de assinatura A1 **ignorado** (sem sistema de pagamento ainda) | M |
| [R-46d](specs/R-46d-campo-magico.md) | **Campo mágico com IA** — substitui a barra de procedimento inteira | 🟡 D0 ✅ commitado (dedup em `dedup-eventos-draft.ts`). D1 🟡 codado e testado (absorve o R-46b). D1.2 fechado pelo R-62. **D9/D11 (motion no odontograma) seguem de fora** | G |
| [R-46h](specs/R-46h-orcamento-no-meu-dia.md) | Botão de orçamento no Meu dia — picker lista fichas em aberto, gera só da escolhida | 🟡 codado e commitado 08/08 (`fb4d031`), verificado no Brave. **Ele ainda não testou pessoalmente** | M |
| [R-49](specs/R-49-voz-e-campos-de-especialidade.md) | Voz e campos de especialidade — preencher sem digitar 17 vezes | ⏳ spec 02/08, emenda 04/08: IA pode preencher odontometria (I2 revogada), tabela abre sozinha como guarda-corpo. **66% dos endos têm odontometria vazia** | G |
| [R-50](specs/R-50-orto-pelo-dex.md) | Orto ponta a ponta pelo Dex — ditar a manutenção e ela cair estruturada | 🟡 codado e testado ao vivo 05/08 — IA recusa arcada não dita em vez de chutar, Meu dia para de descartar orto em texto. Eval sem regressão + 2 casos novos | G |
| [R-51](specs/R-51-53-modelo-multissessao.md) | Multi-sessão (canal, implante): "em andamento" derivado do `grupo_id`, sem 3º status | 🟡 codado e commitado 04/08, typecheck/lint/build limpos. **Não exercitado em cenário real ainda** | G |
| [R-52](specs/R-51-53-modelo-multissessao.md) | Encaminhar pendência pro outro dentista — "A fazer" vira estritamente a minha lista | 🟡 codado, commitado e testado ao vivo 04/08 — escrita confirmada no banco, mata o silent-fail (fazer hoje em item de colega não gravava) | M |
| [R-53](specs/R-53-orcamento-indicados-abertos.md) | Orçamento nasce de todos os indicados em aberto do paciente, não só os de hoje | 🟡 codado e testado ao vivo 04/08. **R-84 (08/08) cortou o caminho que o R-83 abria pra isso dentro do picker do Meu dia** — o agregado geral (tela do paciente) segue intacto. G3/G9 não verificados | M |
| [R-55](specs/R-55-historico-sem-perda-de-dado.md) | 🐛 Dedup por âncora esconde procedimento repetido no histórico/"Já feito" | 🟡 aprovada, codada e testada ao vivo 03/08 — 2ª profilaxia real confirma as 2 linhas no banco. **Ainda bloqueia** o histórico detalhado e o C6 do cockpit | G |
| **R-56** | 🐛 `fichasRecentes` e a lista do `FichasTab` mostram "Evolução"/dentista sem checar `origem` — mesma classe do R-46c, em 2 surfaces menores | ⏳ achado 03/08. Não urgente — mesma mentira de honestidade do prontuário, superfície menor | P |
| [R-58](specs/R-58-historico-detalhado.md) | Histórico detalhado — texto da visita em evidência, procedimento fechado depois aparece nas 2 entradas | 🟡 codado e testado ao vivo 04/08. Achou e corrigiu 1 bug (fichas do mesmo dia trocavam evento). G6/G7 só parcial. **Habilita o C6** | G |
| [R-57](_arquivo/specs/R-57-atrito-faixa-rapida.md) | Atrito da faixa rápida — encaixe no rail, observação por procedimento | 🟡 F1+F2 confirmadas ao vivo 07/08, **no ar desde 08/08**. F3 cortada (ele descartou em vez de escolher alfabético×frequência) | P |
| [R-30](specs/R-30-ficha-fonte-unica-procedimento.md) | Ficha: fonte única de procedimento — mata a divergência `dentes_observacoes`/`odontograma_eventos` | 🟡 commitado e em produção (30/07) — destravou 24 de 87 fichas (27,6%) que rejeitavam o save. Falta o gate de 2 contas | G |
| **R-67** | 🐛 4 embeds ambíguos pra `dentistas` (mesma classe que derrubou `/dashboard/orcamentos` por 2 meses em 17/07) — timeline nunca mostra consulta/orçamento, export de prontuário sai sem consulta nenhuma | ⏳ achado 06/08. `get-visible-timeline-events.ts:69,78` · `get-patient-workspace-data.ts:112` · `prontuario/route.ts:48`. Fix mecânico (`!fkey`) | M |
| [R-59](_arquivo/specs/R-59-ficha-orcamento-integridade.md) | 🐛 4 furos que sobraram do R-30/R-53 no orçamento por-ficha e no rascunho | 🟡 5 partes codadas, G1-G5 confirmados ao vivo 06-07/08, backfill de 13 grupos órfãos rodado. **No ar desde 08/08** | G |
| [R-31a](specs/R-31a-paciente-unico-prevencao.md) | Paciente único: prevenção — parar de criar duplicata | 🟡 codado, testado ao vivo, commitado e no ar (31/07). G1/G2/G4 confirmados com bug real corrigido em cada um. Falta gate de 2 contas | M |
| [R-29](specs/R-29-silo-resto-modelo-antigo.md) | Paciente é da clínica: identidade multi-clínica + lista sem filtro por dentista | 🟡 aplicado (migration 120), falta o gate de 2 dentistas comuns | M |
| [R-41](specs/R-41-editar-paciente-completa-cadastro.md) | Editar paciente fecha o cadastro que o fluxo rápido deixa aberto (CPF, nascimento, responsável de menor) | 🟡 codado, testado ao vivo, commitado e no ar (31/07) — G3-G6 confirmados | M |
| [R-61](specs/R-61-odontograma-mostra-a-boca.md) | O odontograma do Meu dia mostra a boca, não só o rascunho vazio | 🟡 fechada 05/08 — 8/9 gates ao vivo, Salvar real autorizado (+1 exato). **Só falta G2/slate** (sem dado de teste com `origem='preexistente'`) | G |
| [R-63](specs/R-63-layout-cockpit-slot-central.md) | Cockpit pensado como dentista — slot central de 1 ocupante, direita vira perfil fixo + abas | 🟡 F1-F3 codadas e testadas ao vivo 05-06/08, gates automáticos confirmados. Achou o bug do `data-active` do Base UI (fix completo commitado 08/08). **Só falta G10** (`prefers-reduced-motion`, gate humano) | G |
| [R-64](_arquivo/specs/R-64-marcar-retorno.md) | Marcar retorno com grade de semana — chips de salto + grade de hora real | 🟡 F0-F4 codadas, todo gate fechado ao vivo até 07/08 (spec §10), **no ar desde 08/08**. Conflito de paciente sem override segue não testado | G |
| **R-71** | 🔧 Polimento pós-auditoria — Base UI `nativeButton` warning + Agenda com janela fixa 7h-20h | ⏳ achados da [auditoria pré-produção](../auditorias/2026-08-07-pre-producao.md). Baixo risco, não bloqueia push. **Achado 3 absorvido pelo R-77** | P |
| [R-76](specs/R-76-salvar-e-passar.md) | Salvar e passar — "Salvar" volta a avançar sozinho pro próximo paciente do rail | 🟡 codado e commitado 08/08 (`7602659`), verificado com escrita real. **Ele ainda não testou pessoalmente. Auditoria de 08/08 achou falha silenciosa nesse mesmo botão — ver R-86** | P |
| [R-77](specs/R-77-historico-scroll-observacao.md) | Histórico: scroll no modo prévia + observação expansível | 🟡 codado e commitado 08/08 (`34a33e5`), verificado no Brave. **Ele ainda não testou pessoalmente** | P |
| **R-80** | 🐛 Orçamento podia puxar procedimento indicado por OUTRO dentista — histórico é compartilhado da clínica | 🟡 codado, verificado e commitado 08/08 (`366cd64`+`fb4d031`) — `restringirAoMeuDentista`, defesa em profundidade na query. **Ele ainda não testou pessoalmente** | P |
| **R-79** | 🔧 Ficha editada não deixa rastro — `salvar-ficha.ts` grava só `updated_at`, nem quem editou nem o quê mudou | ⏳ achado 08/08. Não é regressão (vale pra toda edição salva). CFO pede rastreabilidade. Sem spec | M |
| **R-83** | 🔧 Gerar orçamento não enxergava o rascunho atual — salvar antes empurra pro próximo paciente (R-76) | 🟡 codado 08/08 — `abrirPickerFichasAbertas(eventosRascunho?)` pula direto pra etapa 'itens' sem sair da tela. **R-84 cortou a parte que juntava com o agregado do banco** — agora só o rascunho. Ele ainda não testou pessoalmente | P |
| **R-85** | 🐛 "Gerar orçamento" a partir do rascunho (antes de Salvar) cobrava sem nenhum vínculo clínico | 🟡 **corrigido 09/08** — `salvarFicha` ganhou `finalizarAtendimento` (separa "gravar a ficha" de "fechar o atendimento/avisar secretária", que antes eram a mesma coisa). "Gerar orçamento" agora grava a ficha de verdade (sem fechar o atendimento) antes de montar o orçamento; o Salvar final EDITA essa mesma ficha e só ele fecha/avisa. **2ª rodada de teste achou o mesmo bug reaparecendo**: só a 1ª chamada gravava — um 2º procedimento registrado e orçado depois (2º clique em "Gerar orçamento") entrava no orçamento sem nunca ter sido salvo. Corrigido: toda chamada grava os itens novos atuais (cria na 1ª vez, edita nas seguintes), não só a 1ª. Testado ao vivo em localhost (Teste01) com cenário completo — 2 procedimentos, 2 cliques em "Gerar orçamento", 1 cancelamento no meio: 1 ficha só, 2 eventos, agendamento fechou 1x no momento certo, 1 notificação, orçamento com `ficha_id` real e os 2 itens. Achou e corrigiu de graça um rótulo errado ("Salvar 2ª ficha" quando na verdade edita a mesma). **Ele ainda não testou pessoalmente nem foi commitado** | G |
| **R-86** | 🐛 "Salvar e passar" podia falhar sem avisar — POST retornou 503, nada foi persistido | 🟡 **corrigido 09/08** — causa achada por leitura de código: `handleSalvar` chamava `salvarVisitaMeuDia` sem `try/catch` (a função irmã `handleRegravarEventos`, no mesmo arquivo, já tinha essa proteção — só faltou aplicar aqui). Uma falha de rede/servidor virava exceção não tratada: `isSaving` nunca voltava a `false`, nenhum toast aparecia, e o botão ficava travado (disabled) pros cliques seguintes — exatamente o padrão visto na auditoria (1ª tentativa sem efeito, 2ª nem chegou a tentar). Mesmo fix aplicado no quiet-save do R-85 (`onAbrirPickerOrcamento`), que tinha o mesmo buraco. **Causa do 503 em si não isolada** — não achei rate-limit nem lógica própria na rota `/dashboard/meu-dia` (middleware só verifica sessão); provável flakiness de infra, não bug de código. Testado ao vivo interceptando `fetch` pra forçar a falha: toast "Falha de conexão. Tente novamente." aparece, botão não trava, nada sujo no banco durante as falhas, retry sem o interceptor completa normalmente. **Ele ainda não testou pessoalmente nem foi commitado** | M |
| **R-87** | 🔧 Erro de hidratação React (#418) em toda navegação — dashboard, orçamentos, pacientes, ficha do paciente | ⏳ achado 08/08 (auditoria completa). Reproduzido 5× em 4 rotas diferentes, mesmo chunk (`4bd1b696…js`). Não travou nenhuma tela nem perdeu dado observado, mas é sistêmico — cheira a componente compartilhado do layout (nav/sino de notificação?) com mismatch servidor/cliente. Sem investigação de causa raiz ainda | P |
| **R-81** | 👥 Secretária registra PELO dentista — fluxo real relatado por ele 08/08, hoje **bloqueado** (`meu-dia/page.tsx:24` redireciona secretaria) | ⏳ achado 08/08. **Possivelmente mais valioso que o R-78 inteiro** — dentista fica presente e dita em tempo real, ela só executa. Precisa de seletor "dia de quem" + `dentistaId` explícito + gate de 2 contas. Sem spec | G |

## Bloco 2 — Orçamento e financeiro

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-39](specs/R-39-orcamento-dinheiro-esqueleto-unico.md) | Orçamento e dinheiro: um esqueleto só — criar e criado com o mesmo layout, coluna do dinheiro, funil no financeiro | 🟡 R-39a/b codados, testados, commitados e no ar (31/07) — PDF/WhatsApp adiantados do R-33, coluna "Pago" em `/dashboard/orcamentos`. Faltam: gate de 2 contas, mobile completo, R-39c | G |
| [R-34](specs/R-34-plano-de-pagamento.md) | Plano de pagamento: registrar o acordo (à vista / parcelado / `valor_acordado`) | 🟡 3 commits codados, testados e em produção. Bug do PDF (404 sempre) achado e corrigido, **ainda sem commit**. Falta: subir o fix, gate de 2 contas, conferir `condicoes_pagamento` num PDF parcelado | M |
| [R-33](specs/R-33-orcamento-tela-unica.md) | Orçamento: uma tela só — mata o painel de `/dashboard/orcamentos`, porta 15 itens | ⏳ espera R-34 e R-39a (define a forma onde os 15 pousam) | G |
| [R-32](specs/R-32-orcamento-visivel-autor-admin-secretaria.md) | Orçamento visível para autor, admin e secretária | 🟡 aplicado (migration 121), falta o gate — G4/G5 são a prova anti-vazamento | P |
| [R-28](specs/R-28-pagamento-fecha-sem-duplicar.md) | Pagamento: grava quem registrou + fecha parcela sem duplicar recebimento | 🟡 partes 1+2 verificadas na Teste01, falta confirmar em prod. **Parte 3 codada 09/08** — guard novo (`STATUS_ORCAMENTO_SEM_PAGAMENTO`) impede novo caso; testado ao vivo (Teste01, "Marcar como pago" num orçamento recusado → bloqueado, erro certo, zero escrita). D8 fechada (fora, sem uso confirmado). **D9 fechada: 10 orçamentos reais na Clindent com saldo fantasma NÃO foram tocados** (decisão dele — Clindent é só leitura) | M |
| **R-65** | 🐛 Receita/Receita Prevista somavam pagamento de orçamento `rascunho`/`recusado` — nenhum dos 4 caminhos de escrita checava status antes de aceitar dinheiro | 🟡 codado e testado ao vivo 09/08 (Teste01) — guard bloqueia nos 4 caminhos (`registrarPagamento`, `registrarPagamentoRapido`, `marcarPagamentoPago`, `registrarRecebimento`, este último ganhou paridade D6 que não tinha); 6 leituras de `financeiro/actions.ts` ganharam filtro `orcamentos!inner(status)`. Prova: "Receita Prevista" do Império parou de contar R$1.050 de um orçamento recusado. **Ele ainda não testou pessoalmente nem foi commitado** | G |
| **R-66** | 🐛 "Excluir orçamento" mentia sucesso pra quem não é dono (RLS bloqueava, tela dizia que apagou) + 9 leituras de `financeiro/actions.ts` descartavam erro do Supabase | 🟡 codado e testado ao vivo 09/08 (Teste01, 2º dentista temporário) — os 2 lados confirmados: botão some pro não-dono (client) E servidor recusa mesmo com clique em botão já renderizado antes da reatribuição (RLS mudou "por baixo", sem reload — cenário real de corrida). Erro exato: "Você não tem permissão para excluir este orçamento — só o dentista responsável pode." Leituras de `financeiro/actions.ts` lançam erro em vez de devolver zero silencioso (não exercitado ao vivo — banco saudável, sem falha real pra disparar). **Ele ainda não testou pessoalmente nem foi commitado** | M |
| **R-65** | 🐛 Receita/Receita Prevista somam dinheiro de orçamento recusado e rascunho — nenhuma trava de estado impede isso | ⏳ achado 06/08 (auditoria financeira). Provado: R$105.501,04 pago + R$1.050 pendente presos a 1 orçamento recusado; R$32.353,34 pagos presos a orçamentos rascunho. Sem spec | G |
| **R-66** | 🐛 Excluir orçamento na ficha do paciente mente sucesso pra secretária (RLS bloqueia, tela finge apagar) + erro do Supabase descartado em silêncio em quase todo `financeiro/actions.ts` | ⏳ achado 06/08, mesma auditoria. Botão já corretamente escondido em `/dashboard/orcamentos` — só a ficha do paciente ficou destravada. Sem spec | M |
| [R-38](specs/R-38-orcamento-apresentacao-ao-paciente.md) | Orçamento: como o paciente vê — PDF sem preço por item, só total e condição | 🟡 codado, testado, commitado e no ar (31/07) — toggle no rodapé, PDF respeita o flag, snapshot do aceite grava o flag (G1-G6 verificados) | P |
| [R-10](ROADMAP.md) | P2: tirar a observação clínica do documento que o paciente lê | ⏳ P1 ✅ em prod. P2 precisa de decisão — `dentes_observacoes` alimenta orçamento **e** prontuário | P |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-40** | Template de contrato/termo pra assinatura — hoje se assina procedimento e orçamento, mas **não existe texto de termo** | ⏳ decisão pendente: termo de consentimento (clínico) **ou** contrato de prestação (comercial)? Muda o item inteiro | ? |
| [R-03c](specs/R-03c-1-aceite-assinado-orcamento.md) | Aceite assinado do orçamento — prova de recebimento | 🟡 R-03c-1 no ar, falta gate de 2 contas. Restam c-2 (congelamento), c-3 (revisar sem apagar prova), c-4 (aceite no PDF) | G |

## Bloco 4 — Fundação e risco

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-37](ROADMAP.md) | `fichas.dentista_id` é `ON DELETE CASCADE` — apagar 1 dentista levaria dezenas de fichas junto | ⏳ **mina enterrada** (zero `DELETE` em `dentistas` hoje). Vira alcançável com R-31b/R-36 — entra **antes** deles | M |
| [R-36](specs/R-36-um-login-uma-clinica.md) | Um login, uma clínica — fim do multi-clínica e do seletor | ⏳ planejada. Admin fica como está, vira conta burocrática depois | G |
| [R-35](specs/R-35-riscos-nao-reportados.md) | 14 riscos da auditoria de 29/07 | 🟡 10 codados/aplicados, 4 verificados ao vivo. Faltam itens 4, 7, 10 | M |
| **R-43** | Varredura de todas as `SECURITY DEFINER` de RLS com fallback sem casar clínica | ⏳ 3ª ocorrência achada (`get_my_role`, `get_my_dentista_id`, `has_active_membership`) — achar de uma vez em vez de uma por acidente | P |
| **R-44** | Varredura de embeds Postgrest com FK ambígua (mesmo padrão do bug do PDF, R-34) | ⏳ achado 30/07, confirmado ao vivo (300 real nos logs). `get-patient-workspace-data.ts:110`, `get-visible-timeline-events.ts:66/75` — 2 achadas a mais na busca (`command-palette.tsx:105`, `atender-agora-modal.tsx:57`). 5 abertas no total | P |
| [R-25](ROADMAP.md) | 24 `setState` síncronos dentro de `useEffect` (cascading renders) | ⏳ dívida de performance, não quebra runtime | M |
| **R-47** | Ficha rápida: Organizar com Dex apagava dado sem aviso + `alerta_novo` nunca persistia | 🟡 [corrigido 31/07](auditorias/2026-07-31-fase0-dex-ficha-rapida.md#correção-r-47--2-rodadas-3107), 2 rodadas de verificação adversarial. Typecheck/lint/build limpos, falta teste ao vivo | G |

## Bloco 5 — Depois

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-08](specs/R-08-contrato-clinico-perio.md) | Periodontia: periograma — R-08c (tabela + grade 6×32) → d (PDF) → e (comparação) → f (ditado) | ⏳ R-08a e R-08b ✅. [Contrato clínico](specs/R-08-contrato-clinico-perio.md) travado | G |
| [R-26](ROADMAP.md) | Dex vira hub de notificações operacionais — faltosos sem retorno | ⏳ sem spec. Precisa definir o que é "faltou e não voltou" | M |
| **R-45** | 💡 Retorno automático por tipo de procedimento (recall) — dispara WhatsApp antes do prazo vencer | 💡 ideia 31/07, proativo (diferente do R-26, que é reativo). Ainda não mapeado, não é spec | ? |
| [R-09](ROADMAP.md) | Voz nas especialidades — `/api/dex/extrair-especialidade` não tem um único chamador | ⏳ sem spec | M |

---

## 🔬 Em investigação (30/07, rodando)

Dois mapeamentos em curso. **Nada aqui vira item até o resultado chegar.**

| O quê | Cobre |
|---|---|
| **4 demandas novas** | dentista ver todos os pacientes · orto com 2 medidas por arcada · repaginada do financeiro · painel de notificações do Dex |
| **Mapa de atrito** | conta os gestos reais de 6 caminhos e separa atrito **estrutural** (compra estrutura) de **acidental** (de graça remover) |

**Conflito identificado, esperando o resultado:** o modelo 3.1 declara **agenda como
privada**, e a demanda pede que dentista veja "horários marcados" — pode ser conflito
aparente (ver a agenda do Dr. Y ≠ ver os agendamentos do paciente X).

## 🧊 Congelado

| ID | Item | Descongelar quando |
|---|---|---|
| **R-70** | 🐛 Ficha com muitos procedimentos é difícil de editar — 13 dentes numa ficha só empurra o Salvar pra fora da vista | **Congelado 07/08** — falta saber do feedback original se o caso real é "muitos procedimentos" (aponta pra mover o caso pro Organizar com Dex) ou "a tela é ruim mesmo com poucos" (aí um `max-height` com scroll já resolve) |
| [R-22](auditorias/2026-07-26-relatorio-audit-visual.md) | Audit visual do Fable (115 achados) + [símbolos vs norma](auditorias/2026-07-27-simbolos-odontograma.md) | Quando ele quiser voltar ao design. Lote de emergência já identificado |
| **R-60** | Orto (e especialidades que não pintam o odontograma) merece interface própria em vez de chip escondido | **Congelado 04/08** — ele traz um exemplo de ficha real de orto pra basear o desenho. R-50 já resolveu o bloqueio técnico; falta só o desenho |

## ✅ Concluído

| ID | Item | Fechado |
|---|---|---|
| R-82 | Campo mágico trava a aba com documento anexado — `anexarTexto` memoizado | 2026-08-08 — confirmado pessoalmente por ele (cenário de documento real) |
| R-75 | Dex não marca "realizado" em upload de histórico só pelo verbo no passado | 2026-08-08 — confirmado pessoalmente por ele (upload real na UI) |
| [R-62](_arquivo/specs/R-62-campo-magico-entrada-unica.md) | Campo mágico vira entrada única (G10/I4, comando de voz real) | 2026-08-08 — confirmado pessoalmente por ele |
| [R-84](_arquivo/specs/R-84-nesta-ficha-novo-vs-antigo.md) | "Nesta ficha" distingue novo × antigo, orçamento só vê o novo | 2026-08-08 |
| [R-78](_arquivo/specs/R-78-coluna-direita-ficha-viva.md) | Meu dia orientado a fluxo — redesign completo (F0-F5) | 2026-08-08 |
| R-74 | Trocar status do atendimento manualmente no Meu dia | 2026-08-07 |
| R-73 | Rail do Meu dia engolia clique (bug de arrasto/pointerup) | 2026-08-07 |
| R-72 | Matar `/consulta` de vez — rotas apagadas, botões redirecionam pro Meu dia | 2026-08-07 |
| [R-48](_arquivo/specs/R-48-voz-confiavel.md) | Voz confiável — mic iOS, retry sem perder texto | 2026-08-01 |
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
| **R-54** | 🐛 2ª gravação no mesmo dia cria ficha solta "sem juntar" | **Cortado 03/08 — não era defeito.** Ficha = atendimento, sempre nova; "não juntar" é o comportamento correto (CFO pede evolução por visita). Investigação em [R-51-53 §4.4](specs/R-51-53-modelo-multissessao.md) |
| R-15 | Modo consulta: o cockpit do atendimento | Absorvido pelo R-46 (31/07) — o Meu dia É o novo modo consulta. Spec em `_arquivo/specs/` |
| R-35 itens 8 e 13 | Apagar dado antigo | Decisão de 29/07: não apagar nada |
| R-33 descarte 3 | QR Code PIX | O QR gerado é string descritiva, não payload PIX válido |
| **R-68** | Grade do "Marcar retorno" não diferencia expediente configurado de fora dele | **Cortado 07/08** — R-64 no ar e funcionando, não sente falta |
| **R-69** | "Marcar mesmo assim" no Marcar retorno | **Cortado 07/08** — respondeu a pergunta em aberto: escolha, não esquecimento |
| **R-42** | Odontograma geral do paciente (só leitura, agregando fichas) | **Cortado 07/08**, sem motivo detalhado registrado |
| **R-24** | Indicador de "ficha em aberto" | **Cortado 07/08**, sem motivo detalhado registrado |
| **R-07b** | Chips de rotina no modo consulta | **Cortado 07/08**, sem motivo detalhado registrado |
| **R-31b** | Paciente único: **unificação** dos 16 grupos duplicados existentes | **Cortado 07/08** — a ferramenta manual (`excluirPaciente`) existe e está testada, mas a limpeza dos 16 grupos não vira item. Levantamento em `_arquivo/specs/R-31b-paciente-unico-unificacao.md` §1.1, se algum dia for retomado |

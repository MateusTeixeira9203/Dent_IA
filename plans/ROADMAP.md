# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-13** · ordenado por **importância pro dentista**
> **Último push:** 13/08 (`323e095`) — R-108 e R-108b no ar: a ficha virou documento de
> tratamento e a visita passou a rotear. **Histórico de push mora nos [handoffs](handoffs/)** —
> não aqui.
>
> **Contexto que ainda governa decisão:**
> **0 pagantes** — 5 clínicas em trial perpétuo (`trial_ends_at` NULL), checkout nunca processou
> pagamento. Meta dele: 100 pagantes em 2026. [R-92](specs/R-92-fechar-para-cobrar.md) pausado
> 09/08 a pedido dele; a trava é o preço, que só ele decide.
> **Hierarquia e identidade (10/08):** toda conta é clínica; Solo e Clínica são planos **por
> tamanho**, não dois tipos de entidade; admin = quem paga. Detalhe na
> [R-36](specs/R-36-um-login-uma-clinica.md); abriu R-96 e R-97.
> **Mapa de atrito (09/08), 3 rodadas:** [rodada 2](auditorias/2026-08-09-mapa-de-atrito-2.md) ·
> [rodada 3](auditorias/2026-08-09-mapa-de-atrito-3-recontagem.md). Produziu R-90 (crítico) e R-91.
> **Discussão aberta:** [como diminuir o atrito](discussoes/como-diminuir-o-atrito.md) (estado × evento)
>
> **Fila:** 30 ⏳ · **🟡 no ar sem verificação pessoal dele:** 38 · **💡 ideia sem spec:** 2 ·
> **✅ concluídos:** 35 · **🧊 congelados:** 3 · **✂️ cortados:** 12

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
| [**R-108**](specs/R-108-ficha-tratamento.md) | **Ficha = documento de tratamento** — modelo (`ficha_evolucoes` + nome) e a ficha nova, em leitura | 🟡 **no ar 13/08.** Migration 141 (backfill 174/174). Gates confirmados ao vivo por ele: light+dark, legado intacto, nome derivado, timeline. **Falta G3 (2 contas)** | G |
| [**R-108b**](specs/R-108b-roteamento-da-visita.md) | **Roteamento da visita** — pendência volta pra sua ficha sem perguntar; só procedimento novo escolhe destino | 🟡 **no ar 13/08.** Migration 142 conferida no schema. Provados ao vivo: G4, G6, G11, G12, G13, G10. **Não rodaram: G3 ("absorver"), G7, G9, G8.** §4 da spec foi emendado antes do código — o desenho aprovado apagava evento e sobrescrevia ficha de paciente real | M |
| [**R-109**](specs/R-109-registro-na-ficha.md) | **Registro na ficha** — lote multidente + Modo multidente portados do Meu dia, chips locais ligados, trilho duplo morre na escrita | 🟡 **pedaço 3 no ar 14/08** (faixa compartilhada, Meu dia + ficha). G1/G2/G3/G8 provados ao vivo. **Abertos:** pedaço 2 (campo mágico) e pedaço 1 (trilho único), este travado em 2 decisões dele no §4.3 | M |
| 🔵 [**R-111**](specs/R-111-responsividade-mobile.md) | **Responsividade no celular e no tablet** — as 8 telas que o dentista abre no celular | [spec](specs/R-111-responsividade-mobile.md) fase `contrato` 14/08, inventário medido em 375, 768 e 375×500 (teclado); **as 3 decisões dele fechadas** (visão Dia no celular · link inline isento de 44px · este é o ativo). **Pior achado: com o teclado aberto, "Salvar agendamento" e "Fechar" saíam da tela sem rolagem** — agendar pelo celular era impossível. `DialogContent` corrigido (alcança 21 dos 22 diálogos), **não verificado na tela**. Falta: Agenda (162px no celular, 430px no tablet), Meu dia 224px, Prontuário 227px, densidade do Financeiro, alvos de toque | G |
| [**R-110**](specs/R-110-horario-do-dentista-na-agenda.md) | **O horário do dentista vale na agenda** — `criarAgendamento` nunca olha `horarios_disponiveis`; marcar 22h de domingo passa sem piscar | ⏳ [spec](specs/R-110-horario-do-dentista-na-agenda.md) fase `plano` 14/08. **Virou "avisar com override", não bloquear** — o levantamento achou 13,8% dos agendamentos já fora do expediente e **11 de 14 dentistas sem grade cadastrada** (inclusive os 2 mais movimentados da Clindent). Bloqueio travaria a agenda real no deploy. **§9 tem 2 decisões dele** | P |
| 🟡 [**R-107**](specs/R-107a-barra-meu-dia.md) | Remodelagem da barra do Meu dia + perfil do dente — 4 fatias (**a** barra · **b** perfil do dente · **c** altura estável · **d** lote multidente) | 🟡 as 4 codadas, testadas ao vivo e **no ar 13/08**; migration 139 aplicada. Gates e achados de cada fatia nas specs [a](specs/R-107a-barra-meu-dia.md)/[b](specs/R-107b-perfil-do-dente.md)/[c](specs/R-107c-altura-estavel-perfil-dente.md)/[d](specs/R-107d-lote-multidente.md). **Aberto: a posição do "Modo multidente"** — 3 opções em [§9 da d](specs/R-107d-lote-multidente.md), ele quer ouvir dentistas reais | G |
| [**R-103**](specs/R-103-painel-do-dex.md) | **Painel do Dex** — modal de 3 colunas: pendências · números do negócio · central de atualização | **a ✅** verificado por ele 12/08. **b** ([spec](specs/R-103b-pendencias-do-dex.md)) e **c** ([spec](specs/R-103c-o-mes-do-dex.md)) 🟡 no ar 13/08, testadas ao vivo. **G3/G4/G5/G6/G8 pendentes nas duas** (2 contas, secretária, protético, design-review). Falta R-104 (curso). **Absorve o R-26** | G |
| [R-46d](specs/R-46d-campo-magico.md) | **Campo mágico com IA** — substitui a barra de procedimento inteira | 🟡 D0 ✅ commitado. D1 🟡 no ar (absorve o R-46b); D1.2 fechado pelo R-62. **D9/D11 (motion no odontograma) seguem de fora** | G |
| **R-106** | 🐛 Status realizado/indicado sai errado na extração por IA (`/api/dex/formatar-evolucao`) — mesma categoria clínica sai com status diferente no mesmo relato | ⏳ achado 12/08. Não investigado a fundo — mexer no prompt exige eval antes/depois (regra do CLAUDE.md) | M |
| [R-49](specs/R-49-voz-e-campos-de-especialidade.md) | Voz e campos de especialidade — preencher sem digitar 17 vezes | ⏳ spec 02/08, emenda 04/08: IA pode preencher odontometria, tabela abre sozinha como guarda-corpo. **66% dos endos têm odontometria vazia** | G |
| [**R-49b**](specs/R-49b-painel-registro-ao-vivo.md) | **Painel de registro ao vivo** — odontograma acendendo conforme digita/dita, tabela de especialidade na ordem do relato | ⏳ spec 10/08. Majoritariamente fiação (`detectar-consulta` já devolve `dentes[]` e a gente descarta). **Não reduz gesto** — é credibilidade + correção de ASR | M |
| **R-100** | Log do trio (transcrição bruta · saída do modelo · correção do dentista) | ⏳ 10/08, sem spec. **Nada mais da pipeline de voz dá pra priorizar sem ele** | P |
| **R-81** | 👥 Secretária registra PELO dentista — hoje **bloqueado** (`meu-dia/page.tsx:24` redireciona secretaria) | ⏳ achado 08/08, escopo corrigido 10/08: é a secretária **dentro da sala**, na sessão do dentista já logada — sem perfil próprio, sem seletor, sem gate de 2 contas. *"Possivelmente mais valioso que o R-78 inteiro"*. Sem spec | G |
| **R-79** | 🔧 Ficha editada não deixa rastro — `salvar-ficha.ts` grava só `updated_at` | ⏳ achado 08/08. Não é regressão. CFO pede rastreabilidade. Sem spec | M |
| **R-67** | 🐛 4 embeds ambíguos pra `dentistas` — timeline nunca mostra consulta/orçamento, export de prontuário sai sem consulta | ⏳ achado 06/08. `get-visible-timeline-events.ts:69,78` · `get-patient-workspace-data.ts:112` · `prontuario/route.ts:48`. Fix mecânico (`!fkey`) | M |
| **R-56** | 🐛 `fichasRecentes` e a lista do `FichasTab` mostram "Evolução"/dentista sem checar `origem` | ⏳ achado 03/08. Mesma mentira do R-46c, superfície menor | P |
| **R-87** | 🔧 Erro de hidratação React (#418) em toda navegação | ⏳ achado 08/08, reproduzido 5× em 4 rotas, mesmo chunk. Não travou tela nem perdeu dado, mas é sistêmico — cheira a componente do layout com mismatch servidor/cliente. Sem causa raiz | P |
| **R-71** | 🔧 Polimento pós-auditoria — Base UI `nativeButton` warning + Agenda com janela fixa 7h-20h | ⏳ [auditoria pré-produção](auditorias/2026-08-07-pre-producao.md). Baixo risco | P |

## Bloco 2 — Orçamento e financeiro

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-90** | 🐛 **"Registrar Recebimento" não pode ter funcionado nenhuma vez** — insert nunca grava `dentista_id`, coluna `NOT NULL` sem default; todo envio falha | ⏳ achado 09/08. R-65 mexeu nessa mesma função e não pegou, 12 linhas abaixo. Fix de 1 linha: `dentista_id: dados.dentistaId ?? dentistaId` | P |
| [R-34](specs/R-34-plano-de-pagamento.md) | Plano de pagamento — à vista / parcelado / `valor_acordado` | 🟡 no ar. **Conferir se o fix do PDF (404 sempre) foi mesmo commitado** — a linha dizia "sem commit" e a árvore está limpa. Falta gate de 2 contas e conferir `condicoes_pagamento` num PDF parcelado | M |
| [R-33](specs/R-33-orcamento-tela-unica.md) | Orçamento: uma tela só — mata o painel de `/dashboard/orcamentos`, porta 15 itens | ⏳ espera R-34 e R-39a (definem a forma onde os 15 pousam) | G |
| **R-91** | 🔧 Busca de paciente sem acento continua quebrada — "Antonio"/"Antônio" são buscas disjuntas (18% da base) | ⏳ achado 30/07, replanejado 09/08. A abordagem já foi escolhida na spec do R-31a (§3.3: coluna normalizada, não `unaccent` cru) e nunca foi codada | P |
| [**R-98a**](specs/R-98-apresentar-visual-blocos-modelo.md) | Tipo de bloco (`texto`/`imagem`/`odontograma`) + fix do bug de persistência | 🟡 no ar 10/08, aprovado por ele (migration 134). 🐛 corrigido: geração por IA nunca salvava (23 chamadas, 0 linhas). **Veredito de produção pendente desde a sessão #35** | G |
| [R-10](ROADMAP.md) | P2: tirar a observação clínica do documento que o paciente lê | ⏳ P1 ✅ em prod. P2 precisa de decisão — `dentes_observacoes` alimenta orçamento **e** prontuário | P |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-40** | Template de contrato/termo pra assinatura — hoje se assina procedimento e orçamento, mas **não existe texto de termo** | ⏳ decisão pendente: termo de consentimento (clínico) **ou** contrato de prestação (comercial)? Muda o item inteiro | ? |

## Bloco 4 — Fundação e risco

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-37](ROADMAP.md) | `fichas.dentista_id` é `ON DELETE CASCADE` — apagar 1 dentista levaria dezenas de fichas junto | ⏳ **mina enterrada** (zero `DELETE` em `dentistas` hoje). Vira alcançável com R-31b/R-36 — entra **antes** deles | M |
| [R-36](specs/R-36-um-login-uma-clinica.md) | Um login, uma clínica — fim do multi-clínica e do seletor | ⏳ **spec reescrita 10/08**: migração automática do solo **cortada** (entregava prontuário de paciente que nunca consentiu a 5 estranhos). Vira índice único + bloquear o aceite. **§7 tem 3 decisões abertas** | M |
| **R-96** | 🐛 **Não existe transferir administração** — zero updates de `role` no projeto, e `team.ts:181` manda o usuário fazer isso mesmo assim | ⏳ achado 10/08. É o que torna "só admin escreve" aceitável — sem saída, admin vira prisão | P |
| **R-97** | Painel operacional da clínica — dados, equipe, horários, config do bot, documentos. Regra: **ver é de todos, mudar quem entra e quanto se paga é do dono** | ⏳ decidido 10/08. Metade é quase de graça (`permissions.ts` já libera, só a sidebar esconde); a outra metade — documentos/contratos **não têm tabela** — é módulo novo | G |
| **R-43** | Varredura de todas as `SECURITY DEFINER` de RLS com fallback sem casar clínica | ⏳ 3ª ocorrência achada (`get_my_role`, `get_my_dentista_id`, `has_active_membership`) — achar de uma vez em vez de uma por acidente | P |
| **R-44** | Varredura de embeds Postgrest com FK ambígua (mesmo padrão do bug do PDF, R-34) | ⏳ achado 30/07, confirmado ao vivo (300 real nos logs). 5 abertas no total | P |
| **R-95** | Varredura de código morto — rotas/exports/deps sem uso, e o que é vivo mas arriscado (`any`, secret, RLS comentada) | ⏳ agente `dead-code-reviewer` pronto (09/08), **ainda não rodado**. Read-only: entrega lista, nunca deleta | M |
| [R-25](ROADMAP.md) | 24 `setState` síncronos dentro de `useEffect` (cascading renders) | ⏳ dívida de performance, não quebra runtime | M |

## Bloco 5 — Depois

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-08](specs/R-08-contrato-clinico-perio.md) | Periodontia: periograma — R-08c (tabela + grade 6×32) → d (PDF) → e (comparação) → f (ditado) | ⏳ R-08a e R-08b ✅. [Contrato clínico](specs/R-08-contrato-clinico-perio.md) travado | G |
| [R-09](ROADMAP.md) | Voz nas especialidades — `/api/dex/extrair-especialidade` não tem um único chamador | ⏳ sem spec | M |
| **R-45** | 💡 Retorno automático por tipo de procedimento (recall) — dispara WhatsApp antes do prazo vencer | 💡 ideia 31/07, proativo (o R-26 era reativo). Não mapeado, não é spec | ? |

## Bloco 6 — Aquisição e porta de entrada

**Fora da régua "importância pro dentista"** — a régua mede o produto pra quem já entrou.
Estes medem quem **não** entrou. Vieram do audit visual de 26/07 (R-22): as duas piores notas
do sistema inteiro (Landing **C**, Auth **D**).

| ID | Item | Estado | Peso |
|---|---|---|---|
| [**R-92**](specs/R-92-fechar-para-cobrar.md) | **Fechar para cobrar** — sair de **0 pagantes para 3**, com checkout testado ponta a ponta e placar mínimo medindo | ⏳ **pausado 09/08 a pedido dele**. Dia 1 codado, testado e no ar; Dia 2 parcial. Trava: o preço, que só ele decide | G |
| **R-88** | **Landing de conversão** — vende 3 coisas que a produção contradiz: **"Modo Consulta" como feature nº 1 de uma tela DELETADA pelo R-72**, WhatsApp com 0 uso, e "silos" que o R-36 desmonta. Mais: cores hardcoded, grid de 3 ícones, zero OG tag | ⏳ **adiado pelo R-92**: deve ser escrita **depois** do que os 3 primeiros pagantes ensinarem. Alvo decidido: os dois, solo como principal | G |
| **R-89** | **Auth (login · cadastro · esqueci · redefinir · verifique-email)** — nota D: 5/12 capturas em branco, dark quebrado, AA reprovado, 2 sistemas de form diferentes | ⏳ depois do R-88 (a landing define a linguagem que o auth herda) | M |

---

## 🟡 No ar, sem trabalho próprio restante

**Poda de 13/08.** Estes saíram dos blocos porque **não competem mais por prioridade** — estão
em produção, sem incidente relatado, e o que falta em cada um é *verificação*, não trabalho.
Continuam 🟡 (código escrito ≠ verificado): a auditoria completa é a única máquina que promove
🟡 → ✅. O detalhe de cada um está na spec linkada.

> **Correção da mesma poda:** 8 destas linhas diziam **"Sem push"** (R-65, R-66, R-76, R-77,
> R-80, R-83, R-85, R-86, R-93). Conferido por `git merge-base`: **os 8 SHAs estão em
> `origin/main` há dias.** O mapa estava mentindo sobre o que já foi entregue.

| ID | O quê | No ar desde | Falta |
|---|---|---|---|
| [R-30](specs/R-30-ficha-fonte-unica-procedimento.md) | Ficha: fonte única de procedimento — destravou 24 de 87 fichas que rejeitavam o save | 30/07 | gate 2 contas |
| [R-31a](specs/R-31a-paciente-unico-prevencao.md) | Paciente único: prevenção de duplicata | 31/07 | gate 2 contas |
| [R-29](specs/R-29-silo-resto-modelo-antigo.md) | Paciente é da clínica: identidade multi-clínica + lista sem filtro por dentista | 31/07 (migration 120) | gate 2 dentistas |
| [R-41](specs/R-41-editar-paciente-completa-cadastro.md) | Editar paciente fecha o cadastro que o fluxo rápido deixa aberto | 31/07 | — |
| [R-38](specs/R-38-orcamento-apresentacao-ao-paciente.md) | PDF do paciente sem preço por item, só total e condição | 31/07 | — |
| [R-39](specs/R-39-orcamento-dinheiro-esqueleto-unico.md) | Orçamento e dinheiro: um esqueleto só (a/b) | 31/07 | gate 2 contas · mobile · R-39c |
| [R-32](specs/R-32-orcamento-visivel-autor-admin-secretaria.md) | Orçamento visível para autor, admin e secretária | 31/07 (migration 121) | gate — G4/G5 são a prova anti-vazamento |
| **R-47** | Ficha rápida: Organizar com Dex apagava dado + `alerta_novo` nunca persistia | 31/07 | teste ao vivo |
| [R-51](specs/R-51-53-modelo-multissessao.md) | Multi-sessão (canal, implante): "em andamento" derivado do `grupo_id` | 04/08 | exercitar em cenário real |
| [R-52](specs/R-51-53-modelo-multissessao.md) | Encaminhar pendência pro outro dentista | 04/08 | — |
| [R-53](specs/R-53-orcamento-indicados-abertos.md) | Orçamento nasce dos indicados em aberto do paciente | 04/08 | G3/G9 |
| [R-58](specs/R-58-historico-detalhado.md) | Histórico detalhado — procedimento fechado depois aparece nas 2 entradas | 04/08 | G6/G7 (parciais) |
| [R-55](specs/R-55-historico-sem-perda-de-dado.md) | 🐛 Dedup por âncora escondia procedimento repetido | 03/08 | — |
| [R-50](specs/R-50-orto-pelo-dex.md) | Orto ponta a ponta pelo Dex — ditar a manutenção e ela cair estruturada | 05/08 | — |
| [R-61](specs/R-61-odontograma-mostra-a-boca.md) | O odontograma do Meu dia mostra a boca, não o rascunho vazio | 05/08 | G2/slate (sem dado `origem='preexistente'`) |
| [R-63](specs/R-63-layout-cockpit-slot-central.md) | Cockpit: slot central de 1 ocupante, direita vira perfil + abas | 06-08/08 | G10 (`prefers-reduced-motion`, gate humano) |
| [R-57](_arquivo/specs/R-57-atrito-faixa-rapida.md) | Atrito da faixa rápida — encaixe no rail, observação por procedimento | 08/08 | — (F3 cortada por ele) |
| [R-59](_arquivo/specs/R-59-ficha-orcamento-integridade.md) | 🐛 4 furos do R-30/R-53 no orçamento por-ficha; backfill de 13 grupos órfãos | 08/08 | — |
| [R-64](_arquivo/specs/R-64-marcar-retorno.md) | Marcar retorno com grade de semana | 08/08 | conflito de paciente sem override |
| [R-46](specs/R-46-meu-dia.md) | **Meu dia — épico original** (guarda-chuva; layout realizado pelo R-78) | 08/08 | — sem trabalho próprio restante |
| [R-46g](specs/R-46g-porta-modo-consulta.md) | Porta do modo consulta pro Meu dia | 08/08 | gate de assinatura A1 (sem sistema de pagamento ainda) |
| [R-46h](specs/R-46h-orcamento-no-meu-dia.md) | Botão de orçamento no Meu dia — picker lista fichas em aberto | 08/08 | ele testar |
| **R-76** | Salvar e passar — "Salvar" volta a avançar pro próximo paciente do rail | 08/08 | ele testar |
| **R-77** | Histórico: scroll no modo prévia + observação expansível | 08/08 | ele testar |
| **R-80** | 🐛 Orçamento podia puxar indicado de OUTRO dentista | 08/08 | ele testar |
| **R-83** | 🔧 Gerar orçamento não enxergava o rascunho atual | 08/08 | ele testar |
| **R-85** | 🐛 "Gerar orçamento" antes de Salvar cobrava sem vínculo clínico | 09/08 | ele testar |
| **R-86** | 🐛 "Salvar e passar" falhava sem avisar (503, nada persistido, botão travado) | 09/08 | ele testar · **causa do 503 não isolada** (provável infra) |
| **R-93** | 🔧 Atalho "Registrar Dinheiro" no modal do orçamento | 09/08 | ele testar |
| [R-65](specs/R-65-receita-nao-conta-recusado-rascunho.md) | 🐛 Receita somava pagamento de orçamento recusado/rascunho | 09/08 | ele testar |
| [R-66](specs/R-66-excluir-orcamento-mente-sucesso.md) | 🐛 "Excluir orçamento" mentia sucesso pra quem não é dono | 09/08 | ele testar |
| [R-28](specs/R-28-pagamento-fecha-sem-duplicar.md) | Pagamento: grava quem registrou + fecha parcela sem duplicar | 09/08 | confirmar partes 1+2 em produção. D9: 10 orçamentos com saldo fantasma na Clindent **não** foram tocados (decisão dele — só leitura) |
| [**R-94**](specs/R-94-agenda-do-protetico.md) | **Agenda do protético** — role novo, pedido no agendamento, calendário só dele | 10/08 (migrations 128-133) | G6 (2 contas deliberado) |
| [**R-102**](specs/R-102-compromisso-pessoal-agenda.md) | Compromisso pessoal do dentista — bloqueia a própria agenda | 11/08 (migration 138) | G1-G6 sem teste formal — risco aceito por ele (RLS = cópia de `agendamentos_access`) |
| [R-03c](specs/R-03c-1-aceite-assinado-orcamento.md) | Aceite assinado do orçamento — prova de recebimento (c-1) | — | gate 2 contas · restam c-2 (congelamento), c-3 (revisar sem apagar prova), c-4 (aceite no PDF) |
| [R-35](specs/R-35-riscos-nao-reportados.md) | 14 riscos da auditoria de 29/07 — 10 codados, 4 verificados | — | itens 4, 7, 10 |

**O gate de 2 contas está represado em 12 itens** (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c/R-94/
R-103b/R-103c/R-108/R-108b). Ele recusou seed sintético 12/08 — espera dado real.

---

## 🔬 Em investigação — **parado desde 30/07**

Dois mapeamentos abertos em 30/07 e nunca retomados. **Nada aqui vira item até o resultado
chegar** — e o resultado não chegou em 2 semanas, então ou se retoma ou se corta.

| O quê | Cobre |
|---|---|
| **4 demandas novas** | dentista ver todos os pacientes · orto com 2 medidas por arcada · repaginada do financeiro · painel de notificações do Dex (este virou o R-103) |
| **Mapa de atrito** | ✅ concluído em 09/08, 3 rodadas — ver o cabeçalho |

**Conflito identificado, esperando o resultado:** o modelo 3.1 declara **agenda como privada**,
e a demanda pede que dentista veja "horários marcados" — pode ser conflito aparente (ver a
agenda do Dr. Y ≠ ver os agendamentos do paciente X).

## 🧊 Congelado

| ID | Item | Descongelar quando |
|---|---|---|
| **R-70** | 🐛 Ficha com muitos procedimentos é difícil de editar — 13 dentes empurram o Salvar pra fora da vista | **07/08** — falta saber do feedback original se o caso real é "muitos procedimentos" (move pro Organizar com Dex) ou "a tela é ruim mesmo com poucos" (aí `max-height` com scroll resolve) |
| [R-22](auditorias/2026-07-26-relatorio-audit-visual.md) | Audit visual do Fable (115 achados) + [símbolos vs norma](auditorias/2026-07-27-simbolos-odontograma.md) | Congelado **para o dashboard**. Landing e Auth saíram daqui 09/08 e viraram R-88/R-89 |
| **R-60** | Orto (e especialidades que não pintam o odontograma) merece interface própria em vez de chip escondido | **04/08** — ele traz um exemplo de ficha real de orto pra basear o desenho. R-50 já resolveu o bloqueio técnico; falta só o desenho |

## ✅ Concluído

**35 itens fechados** entre 22/07 e 12/08 — a lista mora em
[`_arquivo/CONCLUIDOS.md`](_arquivo/CONCLUIDOS.md). Saiu daqui na poda de 13/08: o mapa é o
que vem pela frente, e o histórico afogava a fila. Specs em `plans/_arquivo/specs/`.


## ✂️ Cortado

| ID | Item | Por quê |
|---|---|---|
| **R-98b** | Modelo reutilizável de apresentação — dentista salva a sequência de blocos e reusa | **13/08** — desativado desde 11/08 sem motivo registrado; ele decidiu descartar em vez de reativar. Código local revertido (nunca commitado); tabela `apresentacao_modelos` dropada (migration 140, 0 linhas) |
| [R-26](ROADMAP.md) | Dex vira hub de notificações operacionais — faltosos sem retorno | **11/08 — absorvido pelo [R-103](specs/R-103-painel-do-dex.md)**; a pergunta em aberto ("o que é faltou e não voltou") virou o A1 do master |
| **R-54** | 🐛 2ª gravação no mesmo dia cria ficha solta "sem juntar" | **03/08 — não era defeito.** Ficha = atendimento, sempre nova; "não juntar" é o correto (CFO pede evolução por visita). Investigação em [R-51-53 §4.4](specs/R-51-53-modelo-multissessao.md) |
| R-15 | Modo consulta: o cockpit do atendimento | Absorvido pelo R-46 (31/07) — o Meu dia É o novo modo consulta |
| R-35 itens 8 e 13 | Apagar dado antigo | Decisão de 29/07: não apagar nada |
| R-33 descarte 3 | QR Code PIX | O QR gerado é string descritiva, não payload PIX válido |
| **R-68** | Grade do "Marcar retorno" não diferencia expediente configurado de fora dele | **07/08** — R-64 no ar e funcionando, não sente falta. *(Cuidado: o R-110 revisita o tema por outro ângulo — lá é a agenda, não o retorno)* |
| **R-69** | "Marcar mesmo assim" no Marcar retorno | **07/08** — respondeu a pergunta em aberto: escolha, não esquecimento |
| **R-42** | Odontograma geral do paciente (só leitura, agregando fichas) | **07/08**, sem motivo detalhado registrado |
| **R-24** | Indicador de "ficha em aberto" | **07/08**, sem motivo detalhado registrado |
| **R-07b** | Chips de rotina no modo consulta | **07/08**, sem motivo detalhado registrado |
| **R-31b** | Paciente único: **unificação** dos 16 grupos duplicados existentes | **07/08** — a ferramenta manual (`excluirPaciente`) existe e está testada, mas a limpeza dos 16 grupos não vira item. Levantamento em `_arquivo/specs/R-31b-paciente-unico-unificacao.md` §1.1 |

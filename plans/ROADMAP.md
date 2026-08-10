# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-10** · ordenado por **importância pro dentista**
> **Último push:** 10/08 — **22 commits** (`86fc722`..`3f295d8`): o lote represado do R-92
> (R-90/R-93/R-65/R-66/preço) **e** o R-94 inteiro, migrations 128-133 incluídas.
> **Fila:** 25⏳ · **🟡 codado/no ar sem verificação pessoal dele:** 39 · **💡 ideia sem spec:** 3 ·
> **Concluídos:** 32 · **Congelado:** 3 · **Cortado:** 10
> **🔵 ATIVO: nenhum.** R-94 subiu 10/08; R-92 segue pausado a pedido dele.
> **Decisão de produto 10/08 — hierarquia e identidade:** toda conta é clínica; Solo e Clínica são
> planos **por tamanho**, não dois tipos de entidade; "consultório" sai do vocabulário; admin = quem
> paga. Reescreveu a [R-36](specs/R-36-um-login-uma-clinica.md) e abriu **R-96** e **R-97**.
> **[R-92 — Fechar para cobrar](specs/R-92-fechar-para-cobrar.md) pausado 09/08 a pedido dele.**
> **0 pagantes segue de pé** — 5 clínicas em trial perpétuo
> (`trial_ends_at` NULL), checkout nunca processou pagamento. Meta dele: 100 pagantes em 2026.
> **Discussão aberta:** [como diminuir o atrito](discussoes/como-diminuir-o-atrito.md) (estado × evento)
> **Achado sem item, revisado 09/08 (3ª rodada + teste ao vivo):** `excluirPagamento` **tem**
> policy de DELETE (`cmd=ALL`, dono OU secretária) — a nota de sessão anterior estava errada.
> Testei ao vivo simulando a RLS de outro dentista: SELECT e DELETE usam a mesma policy, então
> **não é** a mesma classe do `excluirOrcamento` pré-R-66 (lá SELECT e DELETE divergiam — dava
> pra ver o orçamento sem poder excluir). Aqui quem não tem permissão já esbarra no SELECT
> prévio. Corrigido mesmo assim como defesa em profundidade (confere `count` do delete).
> **09/08, mapa de atrito completo em 3 rodadas:** [rodada 2](../auditorias/2026-08-09-mapa-de-atrito-2.md)
> (código+SQL) → [rodada 3](../auditorias/2026-08-09-mapa-de-atrito-3-recontagem.md) (14
> agentes, recontagem de gestos com verificação adversarial — achou 2 erros da rodada 2, já
> corrigidos nela). **R-90** segue crítico (financeiro nunca funcionou). **R-91** reescrito —
> a correção existe e funciona em 4/5 telas, só 2 pontos de entrada ficaram de fora.

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
| **R-85** | 🐛 "Gerar orçamento" a partir do rascunho (antes de Salvar) cobrava sem nenhum vínculo clínico | 🟡 corrigido e commitado 09/08 (`a32cd88`) — `salvarFicha` separa "gravar" de "fechar o atendimento"; toda chamada grava os itens atuais (não só a 1ª). Testado ao vivo por mim (Teste01, cenário completo). **Ele ainda não testou pessoalmente. Sem push** | G |
| **R-86** | 🐛 "Salvar e passar" podia falhar sem avisar — POST 503, nada persistido, botão travava | 🟡 corrigido e commitado 09/08 (`e43e2af`) — `handleSalvar` sem `try/catch`; mesmo fix no quiet-save do R-85. Testado forçando a falha por interceptação de `fetch`. **Causa do 503 não isolada** (provável infra). **Ele ainda não testou. Sem push** | M |
| **R-87** | 🔧 Erro de hidratação React (#418) em toda navegação — dashboard, orçamentos, pacientes, ficha do paciente | ⏳ achado 08/08 (auditoria completa). Reproduzido 5× em 4 rotas diferentes, mesmo chunk (`4bd1b696…js`). Não travou nenhuma tela nem perdeu dado observado, mas é sistêmico — cheira a componente compartilhado do layout (nav/sino de notificação?) com mismatch servidor/cliente. Sem investigação de causa raiz ainda | P |
| **R-81** | 👥 Secretária registra PELO dentista — fluxo real relatado por ele 08/08, hoje **bloqueado** (`meu-dia/page.tsx:24` redireciona secretaria) | ⏳ achado 08/08. **Possivelmente mais valioso que o R-78 inteiro** — dentista fica presente e dita em tempo real, ela só executa. Precisa de seletor "dia de quem" + `dentistaId` explícito + gate de 2 contas. Sem spec | G |
| [**R-94**](specs/R-94-agenda-do-protetico.md) | **Agenda do protético** — role novo (login como o da secretária), pedido criado no agendamento (paciente + obs + data), calendário só dele, marca "entregue" | 🟡 **codado, testado ao vivo e no ar 10/08** (`58f6c14`..`3f295d8`, migrations 128-133). Ele confirmou funcionando. Mitigação do fail-open: gate de ponto único no layout. 4 bugs achados testando: loop infinito de redirect (derrubava o servidor), alerta de CRO vazando pro protético, login passando por `/dashboard` à toa (~2.4s), ponto do calendário mentindo status. **Falta o G6 (2 contas deliberado)** | G |

## Bloco 2 — Orçamento e financeiro

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-39](specs/R-39-orcamento-dinheiro-esqueleto-unico.md) | Orçamento e dinheiro: um esqueleto só — criar e criado com o mesmo layout, coluna do dinheiro, funil no financeiro | 🟡 R-39a/b codados, testados, commitados e no ar (31/07) — PDF/WhatsApp adiantados do R-33, coluna "Pago" em `/dashboard/orcamentos`. Faltam: gate de 2 contas, mobile completo, R-39c | G |
| [R-34](specs/R-34-plano-de-pagamento.md) | Plano de pagamento: registrar o acordo (à vista / parcelado / `valor_acordado`) | 🟡 3 commits codados, testados e em produção. Bug do PDF (404 sempre) achado e corrigido, **ainda sem commit**. Falta: subir o fix, gate de 2 contas, conferir `condicoes_pagamento` num PDF parcelado | M |
| [R-33](specs/R-33-orcamento-tela-unica.md) | Orçamento: uma tela só — mata o painel de `/dashboard/orcamentos`, porta 15 itens | ⏳ espera R-34 e R-39a (define a forma onde os 15 pousam) | G |
| [R-32](specs/R-32-orcamento-visivel-autor-admin-secretaria.md) | Orçamento visível para autor, admin e secretária | 🟡 aplicado (migration 121), falta o gate — G4/G5 são a prova anti-vazamento | P |
| [R-28](specs/R-28-pagamento-fecha-sem-duplicar.md) | Pagamento: grava quem registrou + fecha parcela sem duplicar recebimento | 🟡 partes 1+2 verificadas na Teste01, falta confirmar em prod. **Parte 3 codada 09/08** — guard novo (`STATUS_ORCAMENTO_SEM_PAGAMENTO`) impede novo caso; testado ao vivo (Teste01, "Marcar como pago" num orçamento recusado → bloqueado, erro certo, zero escrita). D8 fechada (fora, sem uso confirmado). **D9 fechada: 10 orçamentos reais na Clindent com saldo fantasma NÃO foram tocados** (decisão dele — Clindent é só leitura) | M |
| [R-65](specs/R-65-receita-nao-conta-recusado-rascunho.md) | 🐛 Receita/Receita Prevista somavam pagamento de orçamento `rascunho`/`recusado` — nenhum dos 4 caminhos de escrita checava status antes de aceitar dinheiro | 🟡 codado, testado ao vivo e commitado 09/08 (`0a8df0b`) — guard nos 4 caminhos + filtro `orcamentos!inner(status)` em 6 leituras. Prova: Receita Prevista do Império parou de contar R$1.050 de recusado. **Ele ainda não testou. Sem push** | G |
| [R-66](specs/R-66-excluir-orcamento-mente-sucesso.md) | 🐛 "Excluir orçamento" mentia sucesso pra quem não é dono (RLS bloqueava em silêncio) + 9 leituras de `financeiro/actions.ts` descartavam erro | 🟡 codado, testado ao vivo dos 2 lados e commitado 09/08 (`0ab1bd1`) — dono checado antes de tocar linha filha; botão some pro não-dono. **Ele ainda não testou. Sem push** | M |
| **R-90** | 🐛 **"Registrar Recebimento" (tela `/dashboard/financeiro`) não pode ter funcionado nenhuma vez** — insert nunca grava `dentista_id`, coluna é `NOT NULL` sem default; todo envio falha | ⏳ achado 09/08 (re-checagem do [mapa de atrito](../auditorias/2026-08-09-mapa-de-atrito-2.md)). R-65 abriu essa mesma função 09/08 (guard de status) e não pegou este bug, 12 linhas abaixo. Fix de 1 linha: `dentista_id: dados.dentistaId ?? dentistaId` — parâmetro já existe, só não é usado | P |
| **R-93** | 🔧 Atalho "Registrar Dinheiro" no modal do orçamento — fecha parcela em 1 clique (`registrarPagamentoRapido` já existia no servidor, R-34 §7.1, nunca ligado nesta tela) | 🟡 codado, testado ao vivo e commitado 09/08 (`d958c47`). **Linha criada retroativamente** — o ID já estava em comentário no código sem existir no mapa. **Ele ainda não testou. Sem push** | P |
| **R-91** | 🔧 Busca de paciente sem acento continua quebrada — "Antonio"/"Antônio" são buscas disjuntas (18% da base) | ⏳ achado 30/07, replanejado 09/08. Spec do R-31a (§3.3) já escolheu a abordagem (coluna normalizada, não `unaccent` cru) mas nunca foi codada — R-31a fechou 🟡 sem essa parte | P |
| [R-38](specs/R-38-orcamento-apresentacao-ao-paciente.md) | Orçamento: como o paciente vê — PDF sem preço por item, só total e condição | 🟡 codado, testado, commitado e no ar (31/07) — toggle no rodapé, PDF respeita o flag, snapshot do aceite grava o flag (G1-G6 verificados) | P |
| [R-10](ROADMAP.md) | P2: tirar a observação clínica do documento que o paciente lê | ⏳ P1 ✅ em prod. P2 precisa de decisão — `dentes_observacoes` alimenta orçamento **e** prontuário | P |
| [**R-98**](specs/R-98-apresentar-visual-blocos-modelo.md) | **Apresentar visual: blocos e modelo** — seção ganha tipo (`texto`/`imagem`/`odontograma`), e o dentista salva a sequência dele como modelo reusado no próximo paciente | ⏳ spec escrita 10/08, **aguardando aprovação**. Quebrada em **98a** (tipo de bloco + fix do bug) e **98b** (modelo). 🐛 embutido: geração por IA **nunca salvou** — 23 chamadas, 6 de dentistas reais, 0 linhas correspondentes. Spike 10/08: componente do odontograma é puro, custo é 1 prop (`presentationMode`). [Artefato](artefatos/R-98-apresentar-visual.html) com o render REAL da arcada injetado do SSR | G |
| **R-99** | **Anotar a radiografia** — paleta de procedimentos (canal, coroa, prótese, implante, pino) e o dentista marca **em cima** do raio-x onde cada um entra | ⏳ pedido dele 10/08, **sem spec**. Depende do bloco `imagem` do R-98a. Conceito no [artefato do R-98](artefatos/R-98-apresentar-visual.html) (Bloco A+), 2 modos: paleta é chrome de edição, some ao apresentar. **Decidido 10/08:** é **overlay** (coordenada + tipo na seção, radiografia original **nunca** alterada — exame diagnóstico não se mistura com proposta) e **sem exportar por enquanto** — a versão anotada não sai da clínica, o que mantém o item fora das regras de custódia de prontuário. Falta: símbolos (devem sair de `TipoRegistroOdontograma`, não desenhados) | M |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-40** | Template de contrato/termo pra assinatura — hoje se assina procedimento e orçamento, mas **não existe texto de termo** | ⏳ decisão pendente: termo de consentimento (clínico) **ou** contrato de prestação (comercial)? Muda o item inteiro | ? |
| [R-03c](specs/R-03c-1-aceite-assinado-orcamento.md) | Aceite assinado do orçamento — prova de recebimento | 🟡 R-03c-1 no ar, falta gate de 2 contas. Restam c-2 (congelamento), c-3 (revisar sem apagar prova), c-4 (aceite no PDF) | G |

## Bloco 4 — Fundação e risco

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-37](ROADMAP.md) | `fichas.dentista_id` é `ON DELETE CASCADE` — apagar 1 dentista levaria dezenas de fichas junto | ⏳ **mina enterrada** (zero `DELETE` em `dentistas` hoje). Vira alcançável com R-31b/R-36 — entra **antes** deles | M |
| [R-36](specs/R-36-um-login-uma-clinica.md) | Um login, uma clínica — fim do multi-clínica e do seletor | ⏳ **spec reescrita 10/08**: migração automática do consultório solo **cortada** (entregava prontuário de paciente que nunca consentiu a 5 estranhos; caso aconteceu 0×). Vira índice único + **bloquear** o aceite. Some a necessidade de afrouxar o trigger de imutabilidade | M |
| **R-96** | 🐛 **Não existe transferir administração** — zero updates de `role` no projeto, e `team.ts:181` manda o usuário fazer isso mesmo assim (*"Transfira o papel de admin antes de sair"*). Admin é porta de mão única: quem cadastrou é dono pra sempre e nem sair consegue | ⏳ achado 10/08 na discussão da hierarquia. É o que torna "só admin escreve" aceitável — sem saída, admin vira prisão | P |
| **R-97** | Painel operacional da clínica — dados, equipe, horários, config do bot, documentos/contratos. Regra: **ver é de todos, mudar quem entra e quanto se paga é do dono** | ⏳ decidido 10/08. Metade é quase de graça (`permissions.ts` já diz `configuracoes: ['admin','dentista']`, só a sidebar esconde o link); a outra metade — **documentos/contratos da clínica não têm tabela** (só `ficha_arquivos` e `paciente_documentos`, presos ao paciente) — é módulo novo e provavelmente sub-item. Fora: convite (tem consequência de cobrança) e conversas do WhatsApp (território da secretária) | G |
| [R-35](specs/R-35-riscos-nao-reportados.md) | 14 riscos da auditoria de 29/07 | 🟡 10 codados/aplicados, 4 verificados ao vivo. Faltam itens 4, 7, 10 | M |
| **R-43** | Varredura de todas as `SECURITY DEFINER` de RLS com fallback sem casar clínica | ⏳ 3ª ocorrência achada (`get_my_role`, `get_my_dentista_id`, `has_active_membership`) — achar de uma vez em vez de uma por acidente | P |
| **R-44** | Varredura de embeds Postgrest com FK ambígua (mesmo padrão do bug do PDF, R-34) | ⏳ achado 30/07, confirmado ao vivo (300 real nos logs). `get-patient-workspace-data.ts:110`, `get-visible-timeline-events.ts:66/75` — 2 achadas a mais na busca (`command-palette.tsx:105`, `atender-agora-modal.tsx:57`). 5 abertas no total | P |
| [R-25](ROADMAP.md) | 24 `setState` síncronos dentro de `useEffect` (cascading renders) | ⏳ dívida de performance, não quebra runtime | M |
| **R-47** | Ficha rápida: Organizar com Dex apagava dado sem aviso + `alerta_novo` nunca persistia | 🟡 [corrigido 31/07](auditorias/2026-07-31-fase0-dex-ficha-rapida.md#correção-r-47--2-rodadas-3107), 2 rodadas de verificação adversarial. Typecheck/lint/build limpos, falta teste ao vivo | G |
| **R-95** | Varredura de código morto — rotas/exports/deps sem uso, e separado disso o que é vivo mas arriscado (`any`, secret, RLS comentada) | ⏳ agente `dead-code-reviewer` pronto (setup 09/08), ainda não rodado — adiado a pedido dele pra não competir com o R-92/R-94 desta semana. Read-only por tool: entrega lista, nunca deleta sozinho | M |

## Bloco 5 — Depois

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-08](specs/R-08-contrato-clinico-perio.md) | Periodontia: periograma — R-08c (tabela + grade 6×32) → d (PDF) → e (comparação) → f (ditado) | ⏳ R-08a e R-08b ✅. [Contrato clínico](specs/R-08-contrato-clinico-perio.md) travado | G |
| [R-26](ROADMAP.md) | Dex vira hub de notificações operacionais — faltosos sem retorno | ⏳ sem spec. Precisa definir o que é "faltou e não voltou" | M |
| **R-45** | 💡 Retorno automático por tipo de procedimento (recall) — dispara WhatsApp antes do prazo vencer | 💡 ideia 31/07, proativo (diferente do R-26, que é reativo). Ainda não mapeado, não é spec | ? |
| [R-09](ROADMAP.md) | Voz nas especialidades — `/api/dex/extrair-especialidade` não tem um único chamador | ⏳ sem spec | M |

## Bloco 6 — Aquisição e porta de entrada

**Fora da régua "importância pro dentista"** — a régua mede o produto pra quem já entrou.
Estes dois medem quem **não** entrou. Vieram do audit visual de 26/07 (R-22): as duas piores
notas do sistema inteiro (Landing **C**, Auth **D**).

| ID | Item | Estado | Peso |
|---|---|---|---|
| [**R-92**](specs/R-92-fechar-para-cobrar.md) | **Fechar para cobrar** — sair de **0 pagantes para 3**, com checkout testado ponta a ponta e placar mínimo medindo. Achado que originou: 5 clínicas em `trial` com `trial_ends_at` NULL, `status_assinatura='ativo'` nunca existiu, checkout nunca processou pagamento | ⏳ **pausado 09/08 a pedido dele** (virou R-94). Dia 1 codado, testado ao vivo e commitado; Dia 2 parcial. **9 commits sem push.** Trava: o preço, que só ele decide | G |
| **R-88** | **Landing de conversão** — vende 3 coisas que a produção contradiz: **"Modo Consulta" como feature nº 1 e FAQ nº 1 de uma tela DELETADA pelo R-72**, WhatsApp com 0 uso, e "silos" que o R-36 desmonta. Mais design: cores hardcoded, theming em JS, grid de 3 ícones, "7 vs 14 dias", zero OG tag | ⏳ **adiado pelo R-92 (09/08)** — deve ser escrita **depois** do que os 3 primeiros pagantes ensinarem, não com a suposição de hoje. Alvo já decidido: os dois, solo como principal | G |
| **R-89** | **Auth (login · cadastro · esqueci · redefinir · verifique-email)** — nota D: 5/12 capturas em branco (`opacity:0` sem JS), dark quebrado, AA reprovado, mobile sem logo, 2 sistemas de form diferentes entre login e cadastro | ⏳ depois do R-88 (a landing define a linguagem que o auth herda) | M |

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
| [R-22](auditorias/2026-07-26-relatorio-audit-visual.md) | Audit visual do Fable (115 achados) + [símbolos vs norma](auditorias/2026-07-27-simbolos-odontograma.md) | Segue congelado **para o dashboard**. **Landing e Auth saíram daqui 09/08** e viraram R-88/R-89 — eram as 2 piores notas (C e D) |
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

# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-18** · ordenado por **importância pro dentista**
> **Último push:** 13/08 (`323e095`) — R-108 e R-108b no ar: a ficha virou documento de
> tratamento e a visita passou a rotear. **Histórico de push mora nos [handoffs](handoffs/)** —
> não aqui.
>
> **Contexto que ainda governa decisão:**
> **0 pagantes** — 6 clínicas em trial perpétuo (`trial_ends_at` NULL), checkout nunca processou
> pagamento. Meta dele: 100 pagantes em 2026. **Preço decidido 14/08:** Consultório R$299,
> Clínica R$259/dentista (`lib/planos.ts`). [R-92](specs/R-92-fechar-para-cobrar.md) retomado
> 15/08 — Dia 3 muda de provedor (AbacatePay → **Stripe**, decisão dele), bloqueado até
> segunda-feira (chave chega então). Emenda §8 da spec tem o contrato técnico pronto.
> **Hierarquia e identidade (10/08):** toda conta é clínica; Solo e Clínica são planos **por
> tamanho**, não dois tipos de entidade; admin = quem paga. Detalhe na
> [R-36](specs/R-36-um-login-uma-clinica.md); abriu R-96 e R-97.
> **Mapa de atrito (09/08), 3 rodadas:** [rodada 2](auditorias/2026-08-09-mapa-de-atrito-2.md) ·
> [rodada 3](auditorias/2026-08-09-mapa-de-atrito-3-recontagem.md). Produziu R-90 (crítico) e R-91.
> **Discussão aberta:** [como diminuir o atrito](discussoes/como-diminuir-o-atrito.md) (estado × evento)
>
> **Contagens globais pendem de auditoria completa.** Não promover item por inferência de código:
> 🟡 só vira ✅ com verificação de produção/documentada; ⏳ só sai da fila quando commit+deploy
> ou encerramento explícito ocorrerem.

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
| [**R-109**](specs/R-109-registro-na-ficha.md) | **Registro na ficha** — lote multidente + Modo multidente portados do Meu dia, chips locais ligados, trilho duplo morre na escrita | ⏳ pedaço 3 já entregue; sobram pedaço 2 (campo mágico) e pedaço 1 (trilho único), travado em 2 decisões no §4.3 | M |
| [**R-111**](specs/R-111-responsividade-mobile.md) | **Responsividade no celular e no tablet** — as 8 telas que o dentista abre no celular | ⏳ validado localmente em 17/08; falta commit/deploy e veredito visual em produção. Não é item no ar ainda | G |
| [**R-110**](specs/R-110-horario-do-dentista-na-agenda.md) | **O horário do dentista vale na agenda** — `criarAgendamento` nunca olha `horarios_disponiveis`; marcar 22h de domingo passa sem piscar | ⏳ [spec](specs/R-110-horario-do-dentista-na-agenda.md) fase `plano` 14/08. **Virou "avisar com override", não bloquear** — o levantamento achou 13,8% dos agendamentos já fora do expediente e **11 de 14 dentistas sem grade cadastrada** (inclusive os 2 mais movimentados da Clindent). Bloqueio travaria a agenda real no deploy. **§9 tem 2 decisões dele** | P |
| [**R-118**](specs/R-118-retorno-secretaria-dentista.md) | 🐛 **Retorno da secretária na agenda do dentista** — escolhe o profissional e vê a grade correta | ⏳ spec em contrato 18/08; fecha também autorização server-side de agenda entre profissionais | P |
| [**R-103**](specs/R-103-painel-do-dex.md) | **Painel do Dex** — modal de 3 colunas: pendências · números do negócio · central de atualização | ⏳ fatias a/b/c entregues; resta R-104 (curso). **Absorve o R-26** | G |
| 🔵 [**R-106**](specs/R-106-status-clinico-da-voz.md) | 🐛 **Voz distingue realizado × indicado × negação × ambiguidade** — só execução explícita nasce feita; ambíguo nasce indicado + “Confira” | spec `aprovada` 17/08, em execução. Eval antes/depois é gate duro; zero migration | M |
| [**R-115**](specs/R-115-refino-simbolos-odontograma.md) | **Símbolos do odontograma** — implante, coroa e catálogo inteiro com leitura clínica inconfundível | 🧊 congelado 18/08 por decisão dele: rascunho anatômico existe, sem alteração no SVG real; retomar como revisão clínica completa | M |
| [R-49](specs/R-49-voz-e-campos-de-especialidade.md) | **Endodontia por texto/voz** — preencher odontometria sem digitar 17 vezes | ⏳ spec reescrita em `contrato` 17/08: só endo, parser determinístico primeiro, IA completa o que foi dito, tabela abre quando há detalhe/dúvida. **66% dos endos têm odontometria vazia** | G |
| [**R-49b**](specs/R-49b-painel-registro-ao-vivo.md) | Painel de registro ao vivo — odontograma acendendo enquanto digita/dita | 🧊 congelado 17/08 por decisão dele. Volta só depois de R-106 + R-49 endo verificados | M |
| [**R-100**](specs/R-100-log-pipeline-voz.md) | Evidência da pipeline (entrada · saída do modelo · correção salva) | 🧊 congelado 17/08. Transcrição ficará como seção recolhível da ficha quando o documento clínico for reestruturado; não haverá log temporário | P |
|  |  |
| **R-79** | 🔧 Ficha editada não deixa rastro — `salvar-ficha.ts` grava só `updated_at` | ⏳ achado 08/08. Não é regressão. CFO pede rastreabilidade. Sem spec | M |
| **R-56** | 🐛 `fichasRecentes` e a lista do `FichasTab` mostram "Evolução"/dentista sem checar `origem` | ⏳ achado 03/08. Mesma mentira do R-46c, superfície menor | P |
| **R-87** | 🔧 Erro de hidratação React (#418) em toda navegação | ⏳ achado 08/08, reproduzido 5× em 4 rotas, mesmo chunk. Não travou tela nem perdeu dado, mas é sistêmico — cheira a componente do layout com mismatch servidor/cliente. Sem causa raiz | P |
| **R-71** | 🔧 Polimento pós-auditoria — Base UI `nativeButton` warning + Agenda com janela fixa 7h-20h | ⏳ [auditoria pré-produção](auditorias/2026-08-07-pre-producao.md). Baixo risco | P |

## Bloco 2 — Orçamento e financeiro

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-90** | 🐛 **"Registrar Recebimento" não pode ter funcionado nenhuma vez** — insert nunca grava `dentista_id`, coluna `NOT NULL` sem default; todo envio falha | ⏳ achado 09/08. R-65 mexeu nessa mesma função e não pegou, 12 linhas abaixo. Fix de 1 linha: `dentista_id: dados.dentistaId ?? dentistaId` | P |
| [R-33](specs/R-33-orcamento-tela-unica.md) | Orçamento: uma tela só — mata o painel de `/dashboard/orcamentos`, porta 15 itens | ⏳ espera R-34 e R-39a (definem a forma onde os 15 pousam) | G |
| **R-91** | 🔧 Busca de paciente sem acento continua quebrada — "Antonio"/"Antônio" são buscas disjuntas (18% da base) | ⏳ achado 30/07, replanejado 09/08. A abordagem já foi escolhida na spec do R-31a (§3.3: coluna normalizada, não `unaccent` cru) e nunca foi codada | P |
| [R-10](ROADMAP.md) | P2: tirar a observação clínica do documento que o paciente lê | ⏳ P1 ✅ em prod. P2 precisa de decisão — `dentes_observacoes` alimenta orçamento **e** prontuário | P |
| [**R-113**](specs/R-113-fechar-parcela-editar-orcamento.md) | 🐛 **Fechar a parcela escolhida** + `editarOrcamento` conferindo linhas apagadas — RLS assimétrica duplica item da secretária | ⏳ spec 16/08. **Corrompendo dado agora** (último caso 15/08 13:47). B1 sem migration; B2 é RLS e precisa do gate de 2 contas (roda na clínica QA) | P |
| [**R-114**](specs/R-114-orcamento-aprovacao-por-item.md) | **Aprovação por item + status derivado** — paciente fecha parte; `status` deixa de ser declarado e vira consequência de itens aprovados × pagos | ⏳ implementação local validada por ele 18/08 (“perfeito”); migrations 145/146 já existem. Falta separar commit/deploy e registrar a validação de produção antes de ✅ | G |
| [**R-112**](specs/R-112-filtro-modal-orcamento-sai.md) | Filtro do modal de orçamento sai; secretária puxa do "Dentista responsável" | ⏳ spec 16/08. Sem migration. Hoje o modal abre vazio pra quem não é autor dos indicados, sem controle pra corrigir (42 de 44 pacientes) | P |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| [**R-119**](specs/R-119-assinatura-manuscrita-atestado.md) | **Assinatura manuscrita em atestado e receita** — dentista assina no momento da emissão; PDF guarda a imagem, nome e CRO | 🔵 implementação local 18/08; ponte provisória até ICP-Brasil, sem chamar de assinatura digital | P |
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
| **R-09** | Voz nas especialidades — `/api/dex/extrair-especialidade` não tem um único chamador | ✂️ absorvido pelo R-49 (endodontia primeiro); manter dois IDs descrevendo o mesmo fio criaria execução duplicada | M |
| **R-45** | 💡 Retorno automático por tipo de procedimento (recall) — dispara WhatsApp antes do prazo vencer | 💡 ideia 31/07, proativo (o R-26 era reativo). Não mapeado, não é spec | ? |

## Bloco 6 — Aquisição e porta de entrada

**Fora da régua "importância pro dentista"** — a régua mede o produto pra quem já entrou.
Estes medem quem **não** entrou. Vieram do audit visual de 26/07 (R-22): as duas piores notas
do sistema inteiro (Landing **C**, Auth **D**).

| ID | Item | Estado | Peso |
|---|---|---|---|
| [**R-92**](specs/R-92-fechar-para-cobrar.md) | **Fechar para cobrar** — sair de **0 pagantes para 3**, com checkout testado ponta a ponta e placar mínimo medindo | ⏳ **retomado 15/08**. Dia 1 codado, nunca testado ao vivo; Dia 2 preço feito (299/259), resto parcial. **Dia 3 reescrito**: troca AbacatePay → Stripe (`Checkout Session` + `trial_period_days`), contrato pronto na spec §8 — bloqueado até a chave chegar, **segunda-feira**. Cobrança avulsa de paciente (2ª integração AbacatePay) foi decidida **fora de escopo do sistema**, decommission virou tarefa própria | G |
| **R-105** | **Onboarding — a primeira fase guiada** — 2 specs que sobem separadas: **[a](specs/R-105a-primeira-fase-e-ativacao.md)** caminho mais curto até a 1ª ficha + **ativação do trial no fim**; **[b](specs/R-105b-marcos-e-gatilhos.md)** 5 marcos no Dex + cron dos e-mails | ⏳ primeira fase entregue; falta corrigir trial perpétuo, validar TTV/2 contas e ligar os 3 e-mails sem chamador | M |
| **R-88b** | 🔧 **Não existe importação de pacientes** — achado 14/08 conferindo a FAQ. O que importa de arquivo é a tabela de procedimentos; a agenda vem do Google Calendar. A landing responde "o paciente entra quando senta na cadeira", que é verdade, mas **é o maior risco de conversão da página** pra dentista com base grande | ⏳ achado 14/08, sem spec | ? |
| **R-89** | **Auth (login · cadastro · esqueci · redefinir · verifique-email)** — nota D: 5/12 capturas em branco, dark quebrado, AA reprovado, 2 sistemas de form diferentes | ⏳ depois do R-88 (a landing define a linguagem que o auth herda) | M |
| **R-116** | **PWA instalável** — ícone na tela inicial, abertura standalone e CTA “Instalar o app” na landing; sem offline prometido nesta fase | ⏳ descoberto 18/08. Não há manifest, `apple-touch-icon`, ícones PNG nem service worker; depende de QA real iPhone/Android e do fechamento da responsividade | M |
| [**R-117**](specs/R-117-upload-fotos-mobile.md) | **Fotos clínicas no celular** — câmera, galeria múltipla e upload sequencial otimizado por paciente | ⏳ spec em contrato 18/08; zero migration. Resolve “memória insuficiente” sem recomprimir exames diagnósticos | M |

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

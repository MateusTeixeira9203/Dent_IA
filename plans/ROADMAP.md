# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-24** · ordenado por **importância pro dentista**
> **Último push:** 24/08 (`d202185`) — contrato e comportamento do R-127 em `main`.
> **Histórico de push mora nos [handoffs](handoffs/)** — não aqui.
>
> **Contexto que ainda governa decisão:**
> **0 pagantes** — checkout ainda não foi ativado. Meta: 100 pagantes em 2026. **Oferta Fundador
> aprovada em 20/08:** Consultório e Clínica por R$200/mês ou R$2.000/ano por dentista; Clínica
> exige 2–8 dentistas e formação em 48h sem cobrança antecipada. Contrato atual no
> [R-92](specs/R-92-assinatura-individual-stripe.md); implementação local em auditoria, flag desligada.
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
| ✅ [**R-122**](_arquivo/specs/R-122-ficha-clinica-fluida.md) | **Ficha clínica fluida** — Meu Dia vira a bancada rápida de captura, revisão e destino; ficha completa reutiliza os mesmos cards como histórico organizado | aprovado pelo usuário em localhost em 19/08; spec e 2 artefatos arquivados. Perfil do paciente e `RegistroCard` preservados | G |
| **R-123** | **Meu Dia: bancada compacta orientada a teclado** — Campo Mágico, cards, odontograma amplo e ações finais ficam na mesma área de trabalho | ⏳ implementação aprovada no localhost em 20/08; pronta para a fila de commit/deploy, ainda não verificada em produção | G |
| 🟡 [**R-125a**](_arquivo/specs/R-125a-captura-clinica-contextual.md) | **Captura clínica contextual, manual e sem atrito** — MultiDent padrão, status explícito, revisão compacta e encaminhamento no mesmo save | migration 150 aplicada; validado no localhost com duas contas em 22/08; aguarda verificação em produção | G |
| 🟡 [**R-125b**](specs/R-125b-orcamento-fonte-deterministica.md) | **Orçamento por fonte determinística** — evento entra uma vez no orçamento; elimina reaparição e seleção parcial inconsistente | migration 151 aplicada; criação atômica e não-reaparição validadas no localhost em 22/08; aguarda verificação em produção | G |
| [**R-109**](specs/R-109-registro-na-ficha.md) | **Registro na ficha** — lote multidente + Modo multidente portados do Meu dia | ⏳ partes locais entregues são preservadas; campo mágico e trilho único remanescentes foram absorvidos pelo R-125a | M |
| [**R-111**](specs/R-111-responsividade-mobile.md) | **Responsividade no celular e no tablet** — as 8 telas que o dentista abre no celular | ⏳ validado localmente em 17/08; falta commit/deploy e veredito visual em produção. Não é item no ar ainda | G |
| ✅ [**R-126a**](_arquivo/specs/R-126a-estabilizacao-mobile-critica.md) | **Estabilização mobile crítica** — agenda, retorno, protético, orçamento e ficha deixam de comprimir desktop em celular | encerrado após teste do usuário em 24/08; achados posteriores são correções novas do R-129b | G |
| 🔵 [**R-129**](specs/R-129-estabilizacao-pos-varredura.md) | **Estabilização pós-varredura 24/08** — R-127/R-128 primeiro; depois performance, mobile, edição de ficha, billing e acessibilidade | plano completo pronto; aguarda comando de execução. [Relatório](auditorias/2026-08-24-resultado-varredura.md) | G |
| ✅ [**R-110**](_arquivo/specs/R-110-horario-do-dentista-na-agenda.md) | **O horário do dentista vale na agenda** — avisa e exige confirmação explícita ao marcar fora do expediente | verificado em produção 23/08: grade de quarta 13h–18h avisou ao marcar 08h; override validado | P |
| [**R-118**](specs/R-118-retorno-secretaria-dentista.md) | 🐛 **Retorno da secretária na agenda do dentista** — escolhe o profissional e vê a grade correta | ⏳ spec em contrato 18/08; fecha também autorização server-side de agenda entre profissionais | P |
| [**R-103**](specs/R-103-painel-do-dex.md) | **Painel do Dex** — modal de 3 colunas: pendências · números do negócio · central de atualização | ⏳ fatias a/b/c entregues; resta R-104 (curso). **Absorve o R-26** | G |
| [**R-106**](specs/R-106-status-clinico-da-voz.md) | 🐛 **Voz distingue realizado × indicado × negação × ambiguidade** — só execução explícita nasce feita; ambíguo nasce indicado + “Confira” | ⏳ validado pelo usuário no localhost em 19/08; pronto para a fila de commit. Eval HTTP fica como melhoria de infraestrutura | M |
| [**R-115**](specs/R-115-refino-simbolos-odontograma.md) | **Símbolos do odontograma** — implante, coroa e catálogo inteiro com leitura clínica inconfundível | 🧊 congelado 18/08 por decisão dele: rascunho anatômico existe, sem alteração no SVG real; retomar como revisão clínica completa | M |
| [**R-127**](specs/R-127-evento-principal-odontograma.md) | **Evento principal do odontograma** — ausência só domina enquanto for o último estado estrutural; um implante ou registro posterior volta a aparecer sem apagar o histórico | 🟡 implementado e validado tecnicamente em 24/08; aguarda conferência visual em produção | P |
| [**R-128**](specs/R-128-escopo-regional-sem-dente.md) | **Escopo regional sem dente** — Boca toda e arcadas viram seleção universal para qualquer procedimento, sem poluir o odontograma | 🟡 implementado e validado tecnicamente em 24/08; aguarda QA visual no Meu Dia e na Ficha | M |
| 🔵 [**R-130**](specs/R-130-compromisso-e-orcamento-operacional.md) | **Compromisso, orçamento e ponte fixa** — agenda da secretária confiável; orçamento inclui todos os serviços clínicos da ficha; ponte reutiliza o fluxo seguro existente | implementação local; migration 152 pendente de aplicação e QA com dentista + secretária | G |
| [R-49](specs/R-49-voz-e-campos-de-especialidade.md) | **Endodontia por texto/voz** — preencher odontometria sem digitar 17 vezes | ⏳ F1+F2 validadas pelo usuário no localhost em 19/08; parser primeiro, IA complementar sem sobrescrever, dúvidas transitórias. Pronto para a fila de commit. **66% dos endos têm odontometria vazia** | G |
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
| [**R-113**](specs/R-113-fechar-parcela-editar-orcamento.md) | 🐛 **Fechar a parcela escolhida** + `editarOrcamento` conferindo linhas apagadas — RLS assimétrica duplica item da secretária | ⏳ validado por ele no localhost em 19/08; entra na fila de commits/push. B2 (RLS) continua exigindo gate de 2 contas antes do deploy | P |
| [**R-114**](specs/R-114-orcamento-aprovacao-por-item.md) | **Aprovação por item + status derivado** — paciente fecha parte; `status` deixa de ser declarado e vira consequência de itens aprovados × pagos | ⏳ implementação local validada por ele 18/08 (“perfeito”); migrations 145/146 já existem. Falta separar commit/deploy e registrar a validação de produção antes de ✅ | G |
| [**R-112**](specs/R-112-filtro-modal-orcamento-sai.md) | Filtro do modal de orçamento sai; secretária puxa do "Dentista responsável" | ⏳ spec 16/08. Sem migration. Hoje o modal abre vazio pra quem não é autor dos indicados, sem controle pra corrigir (42 de 44 pacientes) | P |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| [**R-119**](specs/R-119-assinatura-manuscrita-atestado.md) | **Assinatura manuscrita em atestado e receita** — dentista assina no momento da emissão; PDF guarda a imagem, nome e CRO | 🟡 validado localmente; ponte provisória, sem chamar de ICP-Brasil | P |
| [**R-120**](specs/R-120-documentos-e-aceites.md) | **Documentos e aceites** — termos Odonto.IA, aceite de orçamento, TCLE e conclusão assinados pelo paciente, com PDF congelado e download | ⏳ implementação local pronta; volta para QA com dentista + secretária depois do R-122. ICP-Brasil fica na próxima atualização | G |
| **R-40** | Template de contrato/termo pra assinatura | ✂️ absorvido pelo R-120; manter os dois duplicaria o mesmo fluxo | — |

## Bloco 4 — Fundação e risco

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-37](ROADMAP.md) | `fichas.dentista_id` é `ON DELETE CASCADE` — apagar 1 dentista levaria dezenas de fichas junto | ⏳ **mina enterrada** (zero `DELETE` em `dentistas` hoje). Vira alcançável com R-31b/R-36 — entra **antes** deles | M |
| [R-36](specs/R-36-um-login-uma-clinica.md) | Um login, uma clínica — fim do multi-clínica e do seletor | ⏳ **spec reescrita 10/08**: migração automática do solo **cortada** (entregava prontuário de paciente que nunca consentiu a 5 estranhos). Vira índice único + bloquear o aceite. **§7 tem 3 decisões abertas** | M |
| **R-96** | 🐛 **Não existe transferir administração** — zero updates de `role` no projeto, e `team.ts:181` manda o usuário fazer isso mesmo assim | ⏳ achado 10/08. É o que torna "só admin escreve" aceitável — sem saída, admin vira prisão | P |
| [**R-97**](specs/R-97-gestao-colaborativa-clinica.md) | **Gestão colaborativa da clínica** — Clínica unifica dados, equipe, convites e WhatsApp “Em breve”, sem quebrar os silos | 🟡 implementado localmente; build limpo, falta QA visual e teste RLS com 2 contas antes do deploy | G |
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
| [**R-92**](specs/R-92-assinatura-individual-stripe.md) | **Assinatura individual Stripe** — Consultório individual ou Clínica com 2–8 assinaturas próprias | 🟡 código em produção sem E2E financeiro; a primeira compra real (ou test mode) ainda é gate obrigatório | G |
| [**R-126b**](specs/R-126b-ativacao-comercial-checkout.md) | **Ativação comercial e checkout obrigatório** — identidade → plano/ciclo → Stripe → Dex → Meu Dia, sem bloquear clínica em formação | ⏳ contrato 23/08; corrige o bypass atual do checkout | G |
| **R-105** | **Onboarding orientado ao primeiro valor** — specs **[a](specs/R-105a-primeira-fase-e-ativacao.md)** e **[b](specs/R-105b-marcos-e-gatilhos.md)**: cartão → primeiro atendimento (existente, novo ou demo) → Campo Mágico → ficha; Clínica em formação usa o produto durante as 48h | ⏳ implementação local; apresentação Dex aprovada em 21/08, fluxo completo ainda aguarda auditoria | M |
| **R-88b** | 🔧 **Não existe importação de pacientes** — achado 14/08 conferindo a FAQ. O que importa de arquivo é a tabela de procedimentos; a agenda vem do Google Calendar. A landing responde "o paciente entra quando senta na cadeira", que é verdade, mas **é o maior risco de conversão da página** pra dentista com base grande | ⏳ achado 14/08, sem spec | ? |
| **R-89** | **Auth (login · cadastro · esqueci · redefinir · verifique-email)** — nota D: 5/12 capturas em branco, dark quebrado, AA reprovado, 2 sistemas de form diferentes | ⏳ depois do R-88 (a landing define a linguagem que o auth herda) | M |
| [**R-116**](specs/R-116-pwa-instalavel.md) | **PWA instalável** — ícone na tela inicial, abertura standalone e CTA “Instalar o app” na landing; sem offline prometido nesta fase | ⏳ implementação local pronta; QA final exige iPhone + Android em HTTPS após deploy | M |
| [**R-117**](specs/R-117-upload-fotos-mobile.md) | **Fotos clínicas no celular** — câmera, galeria múltipla e upload sequencial otimizado por paciente | ⏳ spec em contrato 18/08; zero migration. Resolve “memória insuficiente” sem recomprimir exames diagnósticos | M |
| [**R-121**](specs/R-121-fluxo-comercial-porta-entrada.md) | **Fluxo comercial e porta de entrada** — landing/login/cadastro/convite coerentes, trial real de 7 dias e espaço do PWA | ⏳ implementação local pronta; falta QA autenticado com convite pendente real | G |
| [**R-124**](specs/R-124-background-arquitetonico-global.md) | **Background arquitetônico global** — artefato R-121 vira o fundo comum da landing, portas públicas e produto | ⏳ aplicado localmente; aguarda verificação autenticada junto do R-121 | P |

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
| [**R-60**](specs/R-60-registro-ortodontico-livre.md) | Registro ortodôntico livre por arcada — texto livre superior/inferior, sem perder a leitura legada | 🟡 implementado e validado em localhost; falta commit/deploy |

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

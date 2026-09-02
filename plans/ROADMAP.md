# Roadmap — Odonto.IA

> **ROADMAP** · atualizado em **31/08/2026** · mapa do produto atual.
> Histórico de decisões, itens antigos e specs fechadas vivem em [`_arquivo/`](./_arquivo/).

## Produto atual — fonte de decisão

- O núcleo é a documentação clínica rápida: **Agenda → Meu Dia → Prontuário → Orçamento**.
- **Prontuário** é a visão longitudinal do paciente; internamente cada **Ficha continua sendo um
  tratamento** e cada **Atendimento** passa a representar uma visita. Não existe aba Tratamento.
- No perfil do paciente existem **Ficha, Orçamentos, Agenda e Arquivos**. Não existe aba
  **Tratamento**; referências antigas a ela são históricas e não guiam interface nova.
- Pacientes e fichas são compartilhados pela clínica conforme a permissão clínica. Agenda,
  orçamentos e financeiro permanecem no silo de cada dentista.
- **Gestão da Clínica** concentra equipe, convites e integrações compartilhadas. WhatsApp fica
  nessa área quando entrar; horários, agenda, orçamento e financeiro seguem individuais.
- Solo/Consultório e Clínica entregam o mesmo produto. A diferença é comercial: o fundador paga
  R$200/mês ou R$2.000/ano por dentista; no lançamento a Clínica tem de 2 a 8 dentistas.
- Domínio canônico: `odontoia.app`. `dentia.app.br` deve sobreviver apenas como redirecionamento
  permanente para não quebrar links antigos.

**Status:** ⏳ fila · 🔵 ativo · 🟡 no ar, ainda sem o gate indicado · ✅ no ar e verificado ·
🧊 congelado · ✂️ cortado.

---

## Agora

| ID | Item | Estado |
|---|---|---|
| [**R-145**](specs/R-145-orcamento-flexivel.md) | **Orçamento financeiro flexível** — recebimento livre, previsão de cobrança reorganizável e correção auditável sem criar outro orçamento | 🔵 contrato aprovado em conversa; implementação local em curso. |
| [**R-149**](specs/R-149-revisao-meu-dia-legivel.md) | **Revisão legível no Meu Dia** — cartões clínicos priorizam procedimento e status, sem esconder nenhuma ação | 🟡 implementação validada localmente; aguarda conferência visual em produção. |
| **R-146** | **Contexto seguro da consulta** — `?ag=` resolve o agendamento futuro correto, sem fallback silencioso para outro paciente; retorno da Ficha usa o mesmo vínculo da Agenda | ⏳ P0/P1 encontrado na auditoria de 02/09; bloqueia o gate clínico antes de novo teste de escrita. |
| **R-147** | **DEX: transcrição autenticada e resiliente** — corrigir vínculo `user_id`/clínica ativa, expor erros acionáveis, alinhar MIME e provar Whisper no Preview | ⏳ P0 encontrado na auditoria `2026-09-02-dex-completo.md`; toda transcrição autenticada está retornando 401 antes da Groq. |
| [**R-140**](specs/R-140-prontuario-atendimento-rastreabilidade.md) | **Prontuário longitudinal, Atendimento e rastreabilidade** — reorganiza Meu Dia/Ficha sem quebrar tratamento, orçamento e assinatura; prepara etiquetas e estoque | 🧊 código local commitado; retoma após R-145 para build, prova transacional e RLS. Materiais/etiquetas seguem no R-140d. |
| **R-138** | **Agenda com calendário mobile** — Dia e Semana preservam a grade de horários do desktop no celular | 🟡 enviada à `main`; falta validação manual em Android/iPhone e desktop. |
| [**R-139a**](specs/R-139a-remover-procedimento-catalogo.md) | **Remover procedimento do catálogo** — o dentista tira o item das escolhas novas sem apagar histórico financeiro | 🟡 no ar; aprovado pelo usuário em produção em 29/08, pendente de auditoria completa para ✅. |
| [**R-139b**](specs/R-139b-face-incisal-i.md) | **Face incisal como I** — dentes anteriores mostram a abreviação clínica correta sem migrar o código canônico `O` | 🟡 no ar; aprovado pelo usuário em produção em 29/08, pendente de auditoria completa para ✅. |
| [**R-139c**](specs/R-139c-status-dex-preservado.md) | **Status clínico confiável na saída do Dex** — execução, indicação, negação, histórico e ambiguidade permanecem distintos | ⏳ revisão 2 em contrato; correção downstream está no ar, mas a classificação falhou. P0 preservado, aguardando aprovação da spec e eval antes/depois. |
| [**R-139d**](specs/R-139d-visualizador-clinico-arquivos.md) | **Motor do visualizador clínico + Arquivos** — zoom, pan, rotação e ajustes temporários no lightbox | 🟡 no ar; aprovado pelo usuário em produção em 29/08, pendente de auditoria completa para ✅. |
| [**R-139e**](specs/R-139e-visualizador-apresentacao-anotacoes.md) | **Visualizador na Apresentação** — reutiliza o motor e mantém anotações alinhadas durante a manipulação | 🟡 no ar; aprovado pelo usuário em produção em 29/08, pendente de auditoria completa para ✅. |
| **R-137** | **Retorno com protético e agenda mobile** — horários livres continuam visíveis no celular e o pedido ao laboratório entra sem expandir o modal | 🟡 enviada; falta validação manual completa nos dois pontos de entrada. |
| **R-136** | **Financeiro do orçamento claro** — uma sequência de recebimento, sem atalhos e formulários concorrentes | 🟡 implementado e enviado à produção; falta validação manual do novo fluxo financeiro. |
| **R-134** | **Apresentação comercial interativa** — pitch offline do Workspace Odontológico para uso presencial | 🧊 referência visual local removida da árvore do produto; só retoma com escopo comercial explícito. |
| [**R-133**](specs/R-133-dex-clinico-sem-perda.md) | **Dex clínico sem perda** — procedimento fora do vocabulário vira card revisável e divergência nunca some silenciosamente | ⏳ P0 em contrato; executa depois de R-139c e antes do gate de revisão R-143. |
| **R-129** | **Fluidez e estabilidade** — Dex sob demanda, histórico clínico com carga progressiva e revisão seletiva de refreshes | ⏳ preservado em commits locais; retoma depois do R-133. Paginação clínica exige fatia própria para não esconder prontuário. |
| **R-131** | **Patches de segurança** — hardening de headers, limites de upload, grants/funções e cadeia Gemini em commits isolados | ⏳ prioridade pré-lançamento; dependências de produção estão sem CVE conhecido, mas a auditoria encontrou hardening pendente. |
| **R-132** | **Gate automatizado** — testes, lint bloqueante, build e banco local reproduzível | ⏳ 154 testes e TypeScript passam; lint/build e a ordem histórica das migrations ainda impedem um gate confiável. |
| **R-92** | **Cobrança Stripe** — primeiro checkout real, webhook, retry e portal | 🟡 produto e chaves configurados; falta um ciclo real completo para validar cobrança e webhook. |
| **R-105** | **Onboarding do primeiro valor** — apresentação Dex curta, Meu Dia guiado e missão opcional | 🟡 fluxo novo está no ar; falta repetir o caminho completo em uma conta nova, celular e convite. |

## Próximos, por impacto no dentista

| ID | Item | Estado |
|---|---|---|
| **R-144** | **Fechamento assistido opcional** — após revisar a consulta, sugere retorno, próxima sessão, orçamento, assinatura e materiais sem bloquear nem forçar abrir a Ficha | ⏳ planejar somente depois do gate do R-140c; não misturar com as correções atuais. |
| [**R-141**](specs/R-141-captura-dex-sem-perda.md) | **Captura Dex sem perda** — salvar aguarda áudio/arquivo/IA, transcrição repete sem novo ditado e corte por silêncio fica explícito | ⏳ contrato escrito; aguarda aprovação. |
| [**R-142**](specs/R-142-contratos-hardening-dex.md) | **Contratos e hardening do Dex** — Zod runtime, limites, rate limit por identidade, timeout e observabilidade agregada | ⏳ contrato escrito; migration aditiva e teste com duas contas impedem publicação sem gate. |
| [**R-143**](specs/R-143-revisao-clinica-segura-acessivel.md) | **Revisão clínica segura e acessível** — suspeitos bloqueiam save, lote tem confirmação/undo e controles atendem mobile/WCAG | ⏳ contrato escrito; gate de publicação de R-139c/R-133. |
| **R-117** | Fotos clínicas no celular — câmera, múltiplas imagens, rotação e upload sem estourar memória | 🟡 precisa de rodada real em Android e iPhone. |
| **R-116** | PWA instalável — ícone, abertura standalone e CTA na landing | 🟡 falta confirmação final em Android e Safari/iPhone. |
| **R-120** | Documentos e aceites — termos, orçamento e aceites clínicos assinados, PDF congelado e download | 🟡 dados e UI existem; ativação jurídica depende da revisão final dos termos. |
| **R-119** | Assinatura manuscrita em atestado e receita | 🟡 ponte provisória em uso; ICP-Brasil é uma atualização posterior. |
| **R-95** | Limpeza gradual de código morto e dependências órfãs | ⏳ baixo impacto para o usuário; remover por cadeia, fora do lote clínico/performance. |
| **R-25** | Efeitos/hidratação — reduzir estados espelhados e renders em cascata | ⏳ tratar por família e confirmar visualmente; não fazer substituição mecânica. |
| **R-37** | Proteger fichas contra `ON DELETE CASCADE` ao excluir dentista | ⏳ risco de integridade; precisa entrar antes de qualquer fluxo que permita exclusão de profissionais. |
| **R-43 / R-44** | Auditoria de funções RLS e embeds PostgREST ambíguos | ⏳ manutenção preventiva de isolamento multi-clínica. |

## Produto clínico e operacional — verificado em produção

| Entregas | Estado |
|---|---|
| **R-49** — voz e campos de endodontia | ✅ |
| **R-60, R-122, R-123, R-125a** — ficha e Meu Dia: bancada de consulta, MultiDent, Campo Mágico, ortodontia livre e revisão organizada | ✅ |
| **R-110, R-111, R-118, R-126a** — agenda, retorno da secretária e comportamento mobile operacional | ✅ |
| **R-127 + R-128** — evento estrutural mais recente e escopos Boca toda/Arcada | ✅ |
| **R-130** — compromisso pessoal, orçamento de todos os procedimentos clínicos e ponte fixa | ✅ |
| **R-112, R-113, R-114, R-125b** — orçamento por responsável/fonte, aprovação parcial, parcelas e recebimentos | ✅ |
| **R-97 + R-103** — gestão da clínica, equipe, convites e painel Dex | ✅ |
| **R-121 + R-124** — porta de entrada, landing, login/convite e fundo arquitetônico | ✅ |

## Congelado ou posterior

| ID | Item | Condição de retorno |
|---|---|---|
| **R-115** | Refino anatômico completo dos símbolos do odontograma | 🧊 retomar com referência clínica e artefato específico; não trocar símbolos em lote. |
| **R-49b** | Registro ao vivo no odontograma enquanto o dentista dita | 🧊 somente depois de medir se reduz tempo sem aumentar distração. |
| **R-100** | Transcrição recolhível na ficha | 🧊 volta junto da próxima reorganização documental; não criar log transitório. |
| **R-08** | Periodontia completa | ⏳ depois do lançamento e estabilização operacional. |
| **R-45** | Recall automático por procedimento | 💡 depende de WhatsApp e de regra clínica definida. |
| **R-88b** | Importação de pacientes | ⏳ avaliar com as primeiras clínicas pagantes; não construir por suposição. |

## Cortado ou absorvido

- **Aba Tratamento e modelos centrados nela:** ✂️ não fazem parte da navegação atual; a Ficha é a base clínica e o orçamento nasce dela.
- **R-33:** ✂️ rota exclusiva de orçamentos para dentista não é direção do produto; orçamento é operado no perfil do paciente. A tela dedicada permanece, quando necessária, como operação da secretária.
- **R-36 como “um login, uma clínica / admin que paga”:** ✂️ substituído pela gestão colaborativa e pela cobrança individual do R-92.
- **R-09:** ✂️ absorvido por R-49; endodontia continua sendo a primeira especialidade de voz.
- Demais entregas antigas e suas evidências: [`_arquivo/CONCLUIDOS.md`](./_arquivo/CONCLUIDOS.md).

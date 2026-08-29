# Roadmap — Odonto.IA

> **ROADMAP** · atualizado em **28/08/2026** · mapa do produto atual.
> Histórico de decisões, itens antigos e specs fechadas vivem em [`_arquivo/`](./_arquivo/).

## Produto atual — fonte de decisão

- O núcleo é a documentação clínica rápida: **Agenda → Meu Dia → Ficha → Orçamento**.
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
| **R-138** | **Agenda com calendário mobile** — Dia e Semana preservam a grade de horários do desktop no celular | 🟡 enviada à `main`; falta validação manual em Android/iPhone e desktop. |
| [**R-139a**](specs/R-139a-remover-procedimento-catalogo.md) | **Remover procedimento do catálogo** — o dentista tira o item das escolhas novas sem apagar histórico financeiro | 🟡 implementado localmente; falta validação manual de catálogo, orçamento e isolamento entre dentistas. |
| [**R-139b**](specs/R-139b-face-incisal-i.md) | **Face incisal como I** — dentes anteriores mostram a abreviação clínica correta sem migrar o código canônico `O` | 🟡 implementado localmente; falta validação visual no odontograma, histórico e PDF. |
| [**R-139c**](specs/R-139c-status-dex-preservado.md) | **Status do Dex preservado por procedimento** — Meu Dia deixa de sobrescrever indicado/realizado com o modo manual global | 🟡 implementado localmente; aguarda teste clínico com fala mista antes de publicação. |
| [**R-139d**](specs/R-139d-visualizador-clinico-arquivos.md) | **Motor do visualizador clínico + Arquivos** — zoom, pan, rotação e ajustes temporários no lightbox | 🔵 implementação local concluída, incluindo a integração R-139e; aguarda QA manual autenticado. |
| [**R-139e**](specs/R-139e-visualizador-apresentacao-anotacoes.md) | **Visualizador na Apresentação** — reutiliza o motor e mantém anotações alinhadas durante a manipulação | ⏳ entregue dentro do item ativo R-139d/e; validar editor e modo ao vivo antes de encerrar. |
| **R-137** | **Retorno com protético e agenda mobile** — horários livres continuam visíveis no celular e o pedido ao laboratório entra sem expandir o modal | 🟡 enviada; falta validação manual completa nos dois pontos de entrada. |
| **R-136** | **Financeiro do orçamento claro** — uma sequência de recebimento, sem atalhos e formulários concorrentes | 🟡 implementado e enviado à produção; falta validação manual do novo fluxo financeiro. |
| **R-134** | **Apresentação comercial interativa** — pitch offline do Workspace Odontológico para uso presencial | 🧊 referência visual local removida da árvore do produto; só retoma com escopo comercial explícito. |
| **R-133** | **Dex clínico sem perda e rápido** — procedimento fora do vocabulário vira card revisável, sem segunda chamada de IA | ⏳ spec em contrato; aguarda aprovação para implementação e eval antes/depois. |
| **R-129** | **Fluidez e estabilidade** — Dex sob demanda, histórico clínico com carga progressiva e revisão seletiva de refreshes | ⏳ preservado em commits locais; retoma depois do R-133. Paginação clínica exige fatia própria para não esconder prontuário. |
| **R-131** | **Patches de segurança** — atualizar Next, parser de documentos e cadeia Gemini em commits isolados | ⏳ prioridade pré-lançamento; auditoria encontrou vulnerabilidades de dependência. |
| **R-132** | **Gate automatizado** — testes com aliases, lint bloqueante e CI confiável | ⏳ sem isso, build verde não protege regressão funcional. |
| **R-92** | **Cobrança Stripe** — primeiro checkout real, webhook, retry e portal | 🟡 produto e chaves configurados; falta um ciclo real completo para validar cobrança e webhook. |
| **R-105** | **Onboarding do primeiro valor** — apresentação Dex curta, Meu Dia guiado e missão opcional | 🟡 fluxo novo está no ar; falta repetir o caminho completo em uma conta nova, celular e convite. |

## Próximos, por impacto no dentista

| ID | Item | Estado |
|---|---|---|
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

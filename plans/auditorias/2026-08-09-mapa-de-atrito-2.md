# Mapa de atrito — 2ª rodada (re-verificação)

> **Auditoria** · 2026-08-09 · re-checagem do [mapa de 30/07](2026-07-30-mapa-de-atrito.md)
> **Método:** leitura de código atual + SQL direto no banco de produção (`zenfemoxvwerplrjgfqz`).
> **Não é live gesture-walk** — os 10 caminhos originais foram contados por 13 agentes com
> sessão autenticada de verdade; refazer isso pediria o mesmo aparato. Esta rodada verifica
> **o que mudou desde então** (R-78, R-57, R-63, R-64, R-65, R-66 entraram no meio) e confirma
> ou derruba cada um dos 10 achados originais por evidência direta (schema, constraint, código).

## Placar dos 10 achados originais

| # | Achado (30/07) | Status hoje | Evidência |
|---|---|---|---|
| 1 | `fichaParaItens` só lia evento `indicado`, perderia pré-preenchimento de 58 fichas | ✅ **corrigido antes do push original** | fallback `itensDoTexto` já estava no código antes de 30/07 subir |
| 2 | `registrarRecebimento` nunca grava `pagamentos.dentista_id` (NOT NULL) — todo envio falha | 🔴 **AINDA QUEBRADO — pior que antes** | `financeiro/actions.ts:760-768` — insert sem `dentista_id`; schema confirma coluna `NOT NULL`, sem default. R-65 tocou esta função (linha 747-750) e não corrigiu a linha 27 abaixo |
| 3 | Microfone não grava no iPhone (`audio/mp4` nunca tentado) | ✅ **corrigido** (R-48, 01/08) | `useAudioRecorder.ts:24` — `MIME_CANDIDATOS` inclui `audio/mp4`, comentário `R-48 (D)` |
| 4 | "Registrar pagamento" duplicava recebimento em vez de fechar parcela pendente | 🟡 **já é item próprio (R-28)**, parcialmente verificado | `closingPagamentoId` distingue os 2 modos (`detalhe-orcamento-modal.tsx:126`) — não reaberto aqui |
| 5 | "Novo Agendamento" ignorava o dia que o dentista via | 🔴 **CORREÇÃO: eu errei nesta linha — segue quebrado.** A citação (`:1780`) é do modal de **Encaixe** (`encaixeForm`, walk-in), um formulário separado. O modal real "Novo Agendamento" (botão do cabeçalho, tecla `N`, "Agendar agora" do mês) continua com `data` fixa em `format(new Date(),...)` — achado por [re-verificação adversarial](2026-08-09-mapa-de-atrito-3-recontagem.md) | `agendamentos-client.tsx:320-329,483-493,1097` |
| 6 | Modal de orçamento sempre abria em "Procedimentos", escondendo parcela pendente | ✅ **obsoleto — interação mudou** (R-39a) | `detalhe-orcamento-modal.tsx:514-517` — coluna do dinheiro é permanente ao lado, não mais atrás de aba/diálogo |
| 7 | 2º "Organizar com Dex" apagava odontograma revisado (replace em vez de merge) | ⚪ **precisa nova investigação** | Local original (`consulta-client.tsx`) foi apagado pelo R-72. Lógica equivalente hoje mora no campo mágico (`captura-livre-card.tsx`) — comportamento merge/replace não reconferido |
| 8 | "Ver perfil do paciente →" — atalho de 1 gesto que ninguém descobre | 🟡 **ainda existe, relevância mudou** | `next-appointment-hero.tsx:510`, ainda chamado por `dentista-dashboard.tsx:207`. Mas o R-78 fez do **Meu dia** a porta de entrada — se o dashboard antigo não é mais o pouso padrão, o atalho perdeu audiência |
| 9 | Busca sem `unaccent` — "Antonio"/"Antônio" viram buscas disjuntas (18% dos pacientes) | 🟡 **CORREÇÃO: eu errei aqui também — está mais consertado do que eu disse.** Busquei coluna com "normaliz" no nome; a coluna real chama `nome_busca` (migration `125`, 31/07) e existe, populada em 319/319 pacientes, usada em 4 telas. **Mas 2 pontos de entrada ficaram de fora** (Ctrl+K, "Atender agora") — ver relatório novo | [mapa-de-atrito-3](2026-08-09-mapa-de-atrito-3-recontagem.md) |
| 10 | "Quem faltou e não voltou" custa ~58 gestos, resposta cabe num SELECT | ⏳ **inalterado** — é o R-26, não iniciado | sem mudança de código na área |

## O achado novo mais caro: item 2

Não é regressão — é uma correção que **quase** aconteceu. R-65 (09/08) abriu exatamente esta
função pra adicionar o guard de status (`STATUS_ORCAMENTO_SEM_PAGAMENTO`, linha 747-750) e
parou a 12 linhas do bug original. O formulário "Registrar Recebimento" na tela
`/dashboard/financeiro` (o formulário mais visível do módulo financeiro) **não pode ter
funcionado uma única vez em produção** — todo clique em salvar bate na constraint
`NOT NULL` de `dentista_id` e volta erro. Confirmado: só 2 linhas em `pagamentos` nos últimos
30 dias — volume baixo demais pra saber se é abandono por bug ou simplesmente pouco uso, mas
consistente com "ninguém consegue usar".

**Fix:** 1 linha. `dentista_id: dados.dentistaId ?? dentistaId` no insert de
`registrarRecebimento` (o parâmetro já existe na assinatura, só não é usado). Mesma classe de
"vírgula que falta" do R-11/R-30 — não precisa de spec.

## Item 9 continua sem dono

A decisão de arquitetura (coluna normalizada, não `unaccent`) está escrita desde a spec do
R-31a. O R-31a foi fechado (🟡, "no ar") sem essa parte — ninguém verificou que ficou de fora.
Seguinte mais barato: `GENERATED ALWAYS AS (unaccent(lower(nome))) STORED` + índice — mas
`unaccent()` não é `IMMUTABLE` por padrão, precisa do wrapper que a própria spec já descreveu
(§3.3, linha 142). Seguinte pra próxima sessão de planejamento.

## 3ª rodada — recontagem completa dos 7 caminhos, feita

Rodada seguinte, a pedido dele: [mapa-de-atrito-3-recontagem.md](2026-08-09-mapa-de-atrito-3-recontagem.md).
14 agentes (7 mapeadores + 7 verificadores adversariais), mesma estrutura da 1ª rodada. Achou
os 2 erros corrigidos acima nesta própria página — o verificador de um caminho relia numa
citação errada que eu tinha aceito sem conferir.

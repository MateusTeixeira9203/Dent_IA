# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-17
> Sessão de execução responsiva → planejamento da confiabilidade clínica da voz.

## Agora

**R-106 é o único item 🔵, em execução local.** A rodada atual não inclui
brilho/odontograma reagindo em tempo real; R-49b foi congelado por decisão dele.

Ordem proposta:

1. R-106 — código aplicado: realizado exige execução explícita; demais evidências nascem indicadas.
2. Revisão no Meu Dia — “Confira”, “Tudo indicado” e “✓ tudo feito” estão aplicados.
3. R-49 — parser endodôntico determinístico integrado ao Meu Dia; ele abre o dente com dados narrados.
4. Pendente: eval autenticado + ditado real local do R-106; depois IA complementar, dúvidas e merge completo do R-49.

Specs em contrato:

- `R-100-log-pipeline-voz.md` — 🧊 transcrição será seção recolhível da ficha no redesign futuro;
  não haverá armazenamento temporário.
- `R-106-status-clinico-da-voz.md` — aprovada; zero migration; só execução explícita nasce realizada.
- `R-49-voz-e-campos-de-especialidade.md` — aprovada; recortada para endodontia; zero migration.

Validações feitas nesta sessão: `npm run typecheck`, lint dos arquivos tocados e parser de
endo para dois canais passaram. Não houve gravação em banco nem armazenamento de transcrição.

## Trabalho local ainda não entregue

### R-111 — responsividade

- 🟡 Corrigido e QA local em 375, 768, 1440 e 375×500 com teclado.
- Sem overflow nas rotas medidas; alvos de toque ≥44px; modal de agendamento alcançável.
- Typecheck, lint sem erros e build de produção passaram.
- Falta commit/deploy e veredito visual dele.

### R-113/R-114 — orçamento

- R-113 B1+B2 codados; migration 144 escrita, **não aplicada** (falta gate de 2 contas).
- R-114 codado; migrations 145/146 já aplicadas na sessão anterior.
- Perfil do dentista ganhou aprovação por item, “Aprovar tudo”, estado derivado e PDF coerente.
- Tela antiga da secretária ficou congelada por decisão dele; teste real seria na segunda.
- Nenhum dado duplicado da ClinDent foi removido.

### Direção comercial — entrada para planejamento (18/08)

- R-115 (símbolos do odontograma) foi congelado; nenhum SVG de produção mudou. O rascunho
  anatômico fica guardado para uma revisão clínica posterior.
- Próxima discussão: competitividade após chegar a análise de concorrentes. Pautas relatadas:
  Stripe/forma de pagamento, contratos e termos de aceite baixáveis, ajustes no onboarding já
  montado, nomes em vez de IDs numéricos ao escolher dentista e aprovação parcial do orçamento
  (R-114 já a cobre, mas ainda precisa de validação).
- WhatsApp fica fora desta rodada; será planejado com calma depois.
- Correção pontual aplicada: selects de agenda e vínculo de procedimento nunca mais mostram
  UUID/ID como fallback; quando o item não existe na lista atual, exibem "indisponível".
  `npm run typecheck` passou em 18/08.
- Auditoria read-only da ClinDent (18/08): 367/367 pacientes têm `dentista_id` preenchido
  (5 dentistas), mas a RLS de `pacientes` só exige clínica ativa + papel clínico. Todos os
  pacientes são compartilhados para admin/dentista/secretária; `dentista_id` é informativo,
  não controla visibilidade. Decisão de UX pendente: remover o seletor de "Dentista responsável"
  do cadastro de paciente da secretária ou renomeá-lo/modelá-lo como atribuição real.
- Observação mobile (18/08): no iPhone, "Adicionar à Tela de Início" não mostrou ícone do
  Odonto.IA. Causa confirmada no projeto: só há `favicon.svg`; não existem `apple-touch-icon`,
  manifest nem configuração de PWA. A CTA da landing só entra junto com esses ativos e QA iOS.

## Decisões esperando ele

1. Antes de subir migration 144: testar RLS com admin + secretária na clínica QA.

## Cuidado com a árvore

Há um lote grande não commitado misturando orçamento (R-113/R-114), responsividade (R-111),
specs e migrations. Não resetar nem sobrescrever. Commits devem ser separados por mudança
reversível; migration/RLS nunca vai junto de UI.

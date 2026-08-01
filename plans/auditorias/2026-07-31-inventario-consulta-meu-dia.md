# Auditoria — `/consulta` vs. Meu dia: inventário de capacidades e portas

> **AUDITORIA** · 2026-07-31 · gerada pra dar base à spec **[R-46g — A porta](../specs/R-46g-porta-modo-consulta.md)**
> Varredura multi-agente com verificação adversarial: 13 agentes (3 de mapeamento em
> paralelo + 10 de verificação, cada achado crítico reconferido contra o código por um 2º
> agente cético). **Marcações:** ✅ confirmado literalmente · ⚠️ confirmado com correção (a
> correção está embutida na linha, é o que valeu a pena guardar).

Este documento é evidência, não contrato — a spec do R-46g é quem decide o que fazer com
cada achado. Ele fica registrado porque a mesma pergunta ("o que eu perco?") vai voltar em
cada fatia seguinte do R-46 que tocar na fronteira `/consulta` ↔ Meu dia.

## 1. As 15 capacidades de `/consulta` — o que existe, e se o Meu dia tem

| # | Capacidade de `/consulta` | Arquivo:linha | Escreve? | Existe no Meu dia? |
|---|---|---|---|---|
| C1 | ✅ **Gate de assinatura** — trial vencido/`inativo` → `/dashboard?bloqueado=modo-consulta`. É o **único ponto pago-gated do produto** | `consulta/[id]/page.tsx:21-34` | não | ❌ não existe |
| C2 | ⚠️ **Entrar inicia o atendimento** — `useEffect` sem clique dispara `UPDATE status='in_progress'` + `revalidatePath('/dashboard/agendamentos')`. **Correção da verificação:** é reversível — o dropdown "Outro status" da agenda (`agendamentos-client.tsx:1967`) volta pra qualquer status. O problema é ninguém ser avisado de que precisa reverter | `consulta-client.tsx:211` → `actions.ts:172` | **sim** | ❌ não |
| C3 | ✅ **Dossiê do paciente** — 5 últimas fichas, planejamento ativo, procedimentos da clínica, contagem de eventos, numa sidebar de 360px | `page.tsx:55` | não | ⚠️ parcial (só última visita + pendências + orto) |
| C4 | ✅ **Alertas clínicos** — alergias/medicamentos/histórico deduplicados das 5 últimas fichas, transportados como **string com emoji** (`⚠️ Alergia:`), avatar fica vermelho | `page.tsx:105` | não | ❌ **não** — é o dado que menos pode faltar |
| C5 | ✅ **Progresso do tratamento** — barra concluídas/total, "Falta" (4, a 1ª com selo HOJE), "Feito" (4, riscadas) | `consultation-sidebar.tsx:263` | não | ❌ não |
| C6 | ✅ **Última visita + accordion** de 4 fichas anteriores; datas pré-formatadas no servidor com `split('-').reverse()` pra não escorregar 1 dia em BRT | `consultation-sidebar.tsx:355` | não | ⚠️ só a última |
| C7 | ⚠️ **Orçamentos = query morta.** Buscados e passados como prop, **nunca renderizados** (a prop não é destruturada). **Correção:** o caminho é `consulta/[id]/_components/`, não `src/components/consulta/`; remover mexe em 4 arquivos (`demo/page.tsx:40` também passa) | `page.tsx:63` | não | — **não portar** |
| C8 | ✅ **Ditar** — grava opus 32kbps, auto-para com ~4s de silêncio (RMS<0.02), transcreve via `/api/transcrever` e **apensa** ao texto (nunca substitui); overlay com waveform/timer | `consulta-client.tsx:689` | não | ❌ não |
| C9 | ✅ **Detecção ao vivo** — dentes por regex FDI client-side + procedimentos por `/api/dex/detectar-consulta` (debounce 2s, ≥20 chars). Grava só telemetria em `ai_usage_logs` | `consulta-client.tsx:205` | telemetria | ❌ não |
| C10 | ✅ **Toggle "Exame inicial"** — só aparece se o paciente tem **zero** eventos; força `origem='preexistente'` em tudo que a IA extrair. Sem ele, o 1º exame entra como trabalho feito na clínica hoje — **erro de prontuário difícil de reverter** (evento assinado é imutável) | `consulta-client.tsx:583` | não | ❌ não |
| C11 | ⚠️ **Organizar com Dex** — o núcleo. Gemini com `responseSchema` devolve 9 campos; cada evento vira rascunho com `crypto.randomUUID`. **Correções da verificação:** o overlay é `absolute inset-0` **da coluna direita**, não da tela (a sidebar continua visível); `isArch` cobre 97/98/**99** (boca), não só arcadas; telemetria só grava no caminho de sucesso | `consulta-client.tsx:235` | telemetria | ❌ não |
| C12 | ✅ **ToothDetailPanel** — a superfície mais densa: ciclo de face, endodontia pela raiz, 9 chips de tipo, mini-fluxo de ponte (pilar/pôntico, bloqueio de vão sobreposto), tabela de endo/implante, observação e data por evento, e o modal "continuar trabalho aberto ou começar novo?" | `ToothDetailPanel.tsx:115` | não | ❌ não (nem odontograma) |
| C13 | ✅ **Data em lote** — 1 input `date` (max=hoje) reescreve `realizado_em` de todos os eventos `realizado`+`clinica`. A IA nunca propõe data (invariante #13) | `consulta-client.tsx:316` | não | ❌ não |
| C14 | ✅ **Salvar** — `salvarFicha` com `origem='modo_consulta'`: INSERT em `fichas`, `data_atendimento` em BRT, eventos pela RPC atômica 107 (fail-soft), activity log | `consulta-client.tsx:341` | **sim** | ❌ não |
| C15 | ⚠️ **Salvar fecha a agenda e avisa a secretária** — `UPDATE agendamentos SET completed` + notificação `consulta_finalizada`. **Correção decisiva da verificação:** o bloco está **depois** do `return` do ramo de update — só roda no **create**. Salvar com `fichaId` (edição) nunca fecha a agenda, mesmo mandando `agendamentoId` | `salvar-ficha.ts:286` | **sim** | ❌ não |

### 1.1 O que o Meu dia tem hoje (R-46a)

Rail do dia · badge de status (leitura) · sinal `✓ registrado` / `⚠ sem registro` · seleção
de paciente client-side · última visita (com eventos estruturados, ajuste de 31/07) ·
pendências abertas · orto ativo (janela 120d) · link "Ver perfil completo". **Zero
escrita** — confirmado: não há `actions.ts` no diretório, nenhum `'use server'`, nenhum
`<form>`.

### 1.2 Lacunas do Meu dia (todas, não só as que o R-46g resolve)

| Lacuna | Onde | Observação |
|---|---|---|
| Não tem anamnese/alergia/alerta médico (`MeuDiaContexto` tem 3 campos só) | `get-meu-dia.ts:60` | é a casa da alergia é o **R-46f** |
| Pendências não são acionáveis (`LinhaEvento` é `div`, sem `onClick`) | `contexto-coluna.tsx:31` | pendência é informação, não fila de trabalho — vira R-46b |
| Sem `loading.tsx` / `error.tsx` / Suspense — 4 queries antes do 1º pixel | `meu-dia/page.tsx:18` | contra a regra de Performance do CLAUDE.md |
| Erro de query é silencioso (`{ data }` sem `error`, cai em `?? []`) | `get-meu-dia.ts:129` | mesmo modo de falha do bug histórico de Orçamentos (embed ambíguo + erro engolido) |
| `now` congela no render — tela aberta a manhã toda não atualiza status | `meu-dia/page.tsx:17` | sem `revalidate`, `router.refresh`, polling ou realtime |
| Meu dia não existe na navegação **mobile** (`floating-dock`, `mobile-drawer`) | `floating-dock.tsx:38` | única porta mobile hoje é o botão do hero |
| Secretária não acessa (redirect) | `meu-dia/page.tsx:15` | deliberado (agendamentos são silo por `dentista_id`), mas fecha o fluxo "recepção prepara o dia" |
| Comentário promete um botão "Registrar" que **não existe no JSX** | `contexto-coluna.tsx:3` | intenção documentada, nunca implementada — quem for fazer o R-46b pode assumir que a porta já existe |
| Odontograma não é renderizado — eventos chegam como dado e são achatados em texto (`ondeLabel`) | `contexto-coluna.tsx:21` | faces vêm da query só pra dedup, nunca exibidas |

## 2. As 7 portas vivas pra `/consulta`

| # | Porta | Arquivo:linha | Rótulo exato |
|---|---|---|---|
| P1 | Hero do dashboard | `consulta-cta-button.tsx:15` | "Entrar no Modo Consulta" |
| P2 | Agenda · card expandido (só MonthView) | `month-view.tsx:379` | "Iniciar consulta" |
| P3 | Agenda · modal de detalhe (única porta de Day/WeekView) | `agendamentos-client.tsx:2031` | "Iniciar consulta" / "Continuar atendimento" se `in_progress` |
| P4 | Agenda · **walk-in "Atender agora"** — **cria agendamento antes de navegar** (`criarEncaixe`, 30min, `[Walk-in — Atender agora]`) | `atender-agora-modal.tsx:95` | "Atender agora" |
| P5 | Ficha do paciente · aba Agendamentos | `paciente-detail-client.tsx:1945` | "Iniciar" |
| P6 | **Dex widget (FAB global)** — existe em qualquer rota do dashboard | `dex-widget.tsx:849` | "às HH:MM · Modo Consulta" |
| P7 | Onboarding · demo | `onboarding-client.tsx:394` | "Ver agora (1 min)" → `/consulta/demo` |

**Levam ao Meu dia hoje:** hero (2 ramos: `next-appointment-hero.tsx:274` e `:508`) e
sidebar desktop (`sidebar-content.tsx:98`). **Nenhuma passa contexto** — todas usam href
literal sem query string.

**De dentro do Meu dia pro atendimento: nada.** Confirmado — nenhuma ocorrência de
`/consulta` em toda a pasta `src/app/dashboard/meu-dia/`.

## 3. Mortas / quebradas — achados de brinde (viram item próprio se ele quiser, ver R-46g §11 A4)

- `primeiros-passos-card.tsx:110` — botão "Entrar no Modo Consulta" (→ `/consulta/demo`)
  **comentado no dashboard** desde "FASE 1: guia desativado". Morto hoje, só grava
  `localStorage`.
- `modo-consulta-loader.tsx:47` — **componente órfão**. `ModoConsultaLoader` (modal de
  transição "Preparando consulta de {nome}") não é importado em lugar nenhum de `src/`.
- `email/templates/onboarding.ts:66` e `:101` — os e-mails D0 ("→ Fazer minha primeira
  consulta") e D1B ("→ Testar agora") apontam pra **`/consulta-demo`**, rota que **não
  existe** (a real é `/consulta/demo`, com barra). Sem redirect no `next.config.ts` nem no
  `proxy.ts`: **os dois CTAs caem em 404 em produção hoje.**

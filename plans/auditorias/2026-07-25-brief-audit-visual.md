# Brief — Auditoria visual de design (senior) + plano de teste · 2026-07-25

> **Input** de um audit conduzido pelo **Fable 5** como **designer senior**. Ele captura/lê as telas,
> testa o que está pendente, e entrega um **relatório priorizado por ganho de design**.
> O relatório de saída vai em `plans/auditorias/2026-07-25-relatorio-audit-visual.md`.

## 1. Missão & barra

Odonto.IA é software de odontologia **de ponta**, usado em **clínicas grandes** por **dentistas renomados**.
O design precisa **transmitir isso**: profissional, refinado, confiável, senior — nunca "app genérico".

Filtro de toda tela (CLAUDE.md): *"parece feita pela mesma equipe que fez o Dashboard e o Tratamento?"*
Se não, tem ganho a apontar. O Fable deve olhar **cada tela** e listar **tudo que eleva o design** — do
micro (espaçamento, peso de fonte, um ícone) ao macro (hierarquia, ritmo, consistência de sistema).

## 2. Referências & proibições

- **Telas canônicas (o padrão a igualar):** **Dashboard** (`/dashboard`) e **Modo Consulta / Tratamento**
  (`/consulta/[id]`). Toda outra tela é medida contra elas.
- **Tokens:** `src/app/globals.css` — `bg-background`/`bg-surface`/`bg-card`, `text-foreground`/`text-text-primary`/
  `-secondary`/`-muted`, `border-border`, paleta clínica `teal`/`coral`/`slate` + `-pale`/`-ink`.
  **Dark E light impecáveis** (light tem histórico de contraste ruim — conferir os dois sempre).
- **Fontes:** DM Serif Display (títulos) · Outfit (corpo) · DM Mono (todo número: dente, medida, data, CRO).
- **Proibido (AI-slop):** gradiente roxo/azul→roxo · grid de 3 colunas com ícone em círculo colorido ·
  border-radius bubbly uniforme em tudo · copy genérica ("Unlock the power of…") · Inter como única fonte.
- **Loader de IA:** `DexLoader` (não inventar outro).

## 3. Inventário de telas (auditar todas, claro+escuro, desktop+mobile)

| Rota | O que é | Estados a capturar |
|---|---|---|
| `/` | Landing | — |
| `/login` `/cadastro` `/esqueci-senha` `/redefinir-senha` `/verifique-email` | Auth | vazio, preenchido, erro |
| `/planos` `/onboarding` `/primeiro-acesso` | Entrada/venda | — |
| `/convite/[token]` `/convite-expirado` `/bem-vindo-agregado` | Convite | — |
| **`/dashboard`** | **Home — REFERÊNCIA** | com dados, vazio |
| `/dashboard/pacientes` · `/pacientes/[id]` · `/pacientes/novo` · **`/pacientes/demo`** | Lista + **ficha (núcleo)** | lista cheia/vazia; ficha: rascunho, salva, odontograma, tabela de especialidade |
| `/dashboard/agendamentos` | Agenda | semana cheia/vazia |
| `/dashboard/financeiro` · `/dashboard/orcamentos` | Financeiro | com dados/vazio |
| `/dashboard/configuracoes` (+ `/usuarios` `/whatsapp`) · `/dashboard/perfil` | Config/perfil | — |
| `/dashboard/fichas/[id]` · `/dashboard/fichas/nova` | Ficha rápida | — |
| **`/consulta/[id]`** · **`/consulta/demo`** | **Modo Consulta — REFERÊNCIA** | captura, odontograma, planejamento |
| `/dashboard/bot` · `/dashboard/whatsapp` | Bot / WhatsApp | — |

> Telas ricas (ficha com procedimentos, odontograma com símbolos, orçamento) → usar as rotas **`/demo`**
> (ficha enlatada, sem precisar de seed) sempre que possível.

## 4. Verificação funcional — pendentes (testar junto do audit)

- **R-21** registros por dente — agrupamento (1 direto, 2+ colapsa), ordem 11→48, tabela de especialidade
  dentro do dente aberto, clicar dente no odontograma abre a seção e rola.
- **R-12** contraste AA — botões teal viraram teal-ink (claro+escuro); `text-muted` escuro legível.
- **R-19** barra × dock — gravar na ficha: card de voz **acima** do dock; Encaminhar igual.
- **R-10** orçamento/PDF — procedimento **sem** "- planejado" em ficha nova.
- **R-02** — símbolos implante/coroa/pino no odontograma; modal "Continuar/Novo" (Fase 3, precisa de voz).

## 5. Lente do designer senior (avaliar por tela)

1. **Hierarquia** — o olho vai direto pro que importa?
2. **Espaçamento & ritmo** — respiro, alinhamento, grid consistente, densidade adequada a "software pro".
3. **Tipografia** — escala, contraste de tamanho/peso, números em mono, títulos em serif com intenção.
4. **Cor & tokens** — dark **e** light impecáveis; zero cor hardcoded; texto tingido sempre no `-ink`.
5. **Iconografia — ÊNFASE nos ícones de procedimento** (pedido explícito): os glifos do odontograma
   (implante, coroa, pino, canal, cárie, extração…) passam **"clínico/profissional"** ou "genérico/rascunho"?
   Consistência de traço, peso, tamanho, legibilidade em dente pequeno. Ícones de UI (lucide) — mesmo peso,
   coerentes? **Onde um ícone melhor eleva a percepção de produto de ponta, apontar.**
6. **Motion** — sentida, não percebida; sem AI-slop.
7. **Consistência de sistema** — parece uma equipe só, ou telas soltas de épocas diferentes?
8. **Percepção de nível** — passa "clínica grande / dentista renomado", ou "ferramenta de bootstrap"?
9. **AI-slop** — algum dos padrões proibidos do §2?

## 6. Formato do relatório (o que o Fable devolve)

Lista **priorizada por ganho**, cada achado com:
- **Tela / componente** (+ ref da screenshot).
- **Problema** — o que enfraquece o design agora.
- **Fix específico** — acionável, não vago ("gap-3 → gap-4 e alinhar baseline", não "melhorar espaçamento").
- **Ganho × esforço** — quick win (alto ganho, baixo esforço) vs reforma.

Ordenar: **quick wins de alto ganho primeiro**; reformas depois. Marcar **must** vs **nice**. Cada achado
aprovado pelo Mateus vira item ⏳ no ROADMAP.

## 7. Mecânica da captura (o que destrava o audit)

O pane embutido não renderiza ficha/dashboard → a captura é por **Playwright + chromium empacotado**
(`node_modules/.../chromium-1228`, o mesmo que já usamos), navegando o app **em execução** e screenshotando.
- **Auth:** conta de teste do harness (memória `project-qa-playwright-harness`) ou rotas `/demo` (sem login).
- **Cobertura:** cada rota do §3, **claro + escuro**, **desktop (1280) + mobile (375)**, estados do §3.
- **Saída:** `plans/auditorias/screens/{rota}-{tema}-{viewport}.png`.
- Telas que exigem dado rico → rotas `/demo`, ou paciente seed.

O Fable audita as imagens capturadas + o código-fonte das telas (para fixes precisos).

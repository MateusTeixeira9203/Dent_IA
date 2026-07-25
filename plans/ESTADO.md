# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-25 · **Ativo:** R-20 (redesenho da ficha) · **Modo:** planejamento

## Agora

**R-20 — Redesenho da ficha odontograma.** Debati o design (odontograma sempre visível · lado-a-lado
responsivo · tabela de especialidade expande · registros destacam sem sair da lista) e o **planner
escreveu a spec** ([R-20](specs/R-20-ficha-odontograma-redesign.md), 257 linhas). Achado que reframa:
o "destacar sem remover" **já existe no Site A** (rascunho) da FichasTab (`abrirDenteEDestacarRegistro`,
verificado no código) — o Site B (ficha salva) é que nunca teve, por isso o Mateus viu "não aparece
embaixo" na ficha salva do Marcos. Plano: componente único `OdontogramaComPainel` com `@container` do
Tailwind v4; **3 fases** (layout → tabela expande → destaque no Site B) — **só a ficha**. Modo consulta
saiu de escopo (25/07): item futuro que reusa este componente como base. **Spec ✅ APROVADA (25/07),
inventário conferido.** Próximo: commitar o que está pronto (abaixo), depois `/executar` a Fase 1.
Prova visual = R-01 (layout) + widget de registros (já validados) — não reconstruir o mockup; validação
real no localhost, fase por fase.

**Falta no R-20 (gates §5):** Fase 1 (layout `@container` lado-a-lado, odontograma sempre visível, 2
sites) → Fase 2 (tabela expande) → Fase 3 (destacar no Site B). Cada fase valida no localhost antes da
próxima. Sem migration, sem mudança de contrato (só apresentação).

### Code-complete, aguardando commit (o "commitamos tudo")

R-16, R-17, R-18, R-04 Fase 3, R-02 Fases 1/3 e o **fix do glifo do pino** — tudo local, nada commitado.
Verificados ao vivo 24-25/07 (menos R-02 Fase 3, que falta ver ao vivo). Detalhe do que foi a R-02 Fase 3:
auto-reaproveitamento de `grupo_id` na criação **com confirmação** (Decisão 2 reaberta e resolvida — nunca
amarra em silêncio).

| Item | O que é | Estado |
|---|---|---|
| **R-16 / R-17 / R-18** | filtro responsável · barra acima do dock · reset do filtro | ✅ verificado ao vivo 24-25/07; **falta commit+deploy** |
| **R-04 Fase 3 / R-02 Fase 1** | encaminhar em lote · card único | ✅ verificado ao vivo 24-25/07; **falta commit+deploy** |
| **R-02 Fase 3** | reaproveitar `grupo_id` COM confirmação | 🟡 codado — tsc+eslint+`next build`+35 testes ok; **falta ver ao vivo** |

**R-02 Fase 3 — o que mudou (sem migration, Opção A):** ao criar um procedimento de um tipo que já
tem trabalho ABERTO no mesmo dente, um modal pergunta *"Continuar o trabalho aberto ({tipo}, iniciado
em DD/MM) ou começar novo?"*. **Continuar** → o evento herda o `grupo_id`; **Novo** → `grupo_id: null`
(como hoje). Escopo mínimo: só reaproveita grupos que já têm `grupo_id` (originados por voz/IA);
trabalho 100% manual continua nascendo sem grupo (torná-lo continuável = Fase 4 / R-15).
Arquivos: `ToothDetailPanel.tsx` (gatilho+modal+wiring), `FichasTab.tsx` (deriva `gruposAbertos`
client-side, sem fetch novo), `consulta-client.tsx` + `actions.ts` (novo action `getGruposAbertos`,
clínica do contexto auth). Contrato na [spec R-02](specs/R-02-ficha-viva-fidelidade-artefato.md) §4/Fase 3.

## Achados ao vivo (Mateus, 25/07) — fidelidade R-02, NÃO são da Fase 3

Testando ao vivo, o Mateus apontou (reabrem R-02 Fase 0/1/2 — o "100%" de mais cedo era incompleto):

1. **BUG — odontograma não encolhe ao clicar no dente.** Esperado pelo artefato: ao abrir um dente,
   o odontograma (arcada) diminui pra dar lugar ao painel. Hoje não encolhe em nenhum momento.
2. **BUG — procedimentos do dente não aparecem embaixo.** Esperado pelo artefato ("Estados e fluxos",
   R-01-ficha-registro.html ~470-700): ao abrir um dente, os registros DAQUELE dente saem da lista
   geral e aparecem embaixo. Hoje não aparece.
3. **DESIGN — glifo pino/núcleo** (`Odontograma.tsx`) — ✅ **CORRIGIDO 25/07** (tsc ok, falta ver ao
   vivo). Causa real (por geometria + artefato, não no olho): (a) o glifo era desenhado ANTES do
   `crownPath`, que pintava por cima e cobria o núcleo (no colo) → "sumia"; movido pra DEPOIS da
   coroa. (b) `resumo.pino` tingia a raiz inteira via `rootTint` → tirado (artefato mostra raiz
   neutra) = fim do "pega o dente inteiro". Proporções portadas do artefato (base ~0.17·larg, haste
   ~0.78·raiz). Implante e coroa continuam ok.

Escopo: (1) e (2) são **comportamento** (fidelidade ao artefato R-01 "estados e fluxos"). (3) era o
glifo (Fase 0), feito. NENHUM é da Fase 3 (amarração de grupo), que segue code-complete.

### Rumo de design FECHADO (discussão 25/07) — vira spec de redesenho quando entrar em planejamento

Artefato R-01 revisado (grid `640px|322px`: odontograma esq. + detalhe dir., registros embaixo). Debatido
o trade-off **contexto (odontograma visível) × espaço (tabela de especialidade cabe)**. Decisões do Mateus:

- **Layout (A) responsivo, um código só:** odontograma + detalhe do dente **lado-a-lado quando cabe,
  empilha quando não** (mobile). Não é dois layouts separados — é reflow por CSS.
- **Odontograma SEMPRE visível** — nunca substituído/escondido ao abrir um dente (corrige o "some").
- **Híbrido (aprovado):** a **tabela de especialidade** (endo/implante) **expande** quando aberta (full-width
  ou overlay) — é ela que sufoca em coluna estreita. Registro simples fica no painel.
- **Registros = destacar sem remover** (NÃO puxar pra fora): os registros do dente aberto **realçam no
  lugar** na lista de baixo (+ rola até eles), a lista nunca se reorganiza. Menos susto, menos código.
- **Fluxo:** toca o dente / rola até o card → escolhe procedimento → form abre → salva → vira registro
  na lista (realçado se o dente estiver aberto).

É **redesenho de tela que já existe** → caminho `templates/spec-redesign.md` (mais travado: apresentação
muda, regra de negócio/API/schema NÃO). Só quando o Mateus abrir planejamento — nada disso agora.

## Constraint técnica (não trava decisão)

O **browser pane embutido não serve pra verificação visual autenticada** — causa raiz confirmada nesta
sessão: `visibilityState: hidden` (aba tratada como oculta → sem compositing, screenshot dá timeout,
geometria zerada, e o fetch da ficha é gated por visibilidade e nem dispara → skeleton eterno). Não é
o código (servidor responde 200 com render real). Por isso a verificação visual é **manual (Mateus)**
ou **Playwright por script** ([memória](../../.claude/.../project-qa-playwright-harness), infra pronta:
playwright + chromium-1228 + config `prod`). Dev server no ar em `localhost:3000`.

## Esperando você

- [ ] **Ver R-02 Fase 3 ao vivo:** abrir uma ficha, tocar um dente que tenha trabalho aberto do mesmo
      tipo (ex.: coroa `indicado` de outra consulta), criar a coroa de novo → o modal "Continuar / Novo"
      deve aparecer; "Continuar" grava com o mesmo `grupo_id` (conferível no banco).
- [ ] **Commits (fim de sessão):** migration 109 sozinha e primeiro · `plans/` · blocos de código
      (R-16/R-04/R-02/R-17/R-18 + R-02 Fase 3 tocam arquivos que se sobrepõem — precisa de conversa
      sobre como separar). **Nada commitado ainda.**
- [ ] **QA completo multi-dispositivo** (desktop/mobile/tablet, claro/escuro) — passo futuro, há muita
      correção pela frente (você pediu pra deixar anotado).
- [ ] **Símbolos do R-02** (implante/coroa/pino) na tela — pendência antiga, sem mudança nesta sessão.
- [ ] **Ponto de produto (não é bug):** você não quer que a ficha rápida **exija** gravação de voz.
- [ ] **Modelos:** Fable 5 (auditoria de design) · Opus 4.8 (audit de código, multi-agente) · Sonnet 5
      ou Opus 4.8 (stress test). Declarar no cabeçalho de cada spec/ESTADO.

## Próximo da fila

Você vê a Fase 3 ao vivo → fecha o R-02 (ou abre Fase 4 pro caso manual) → `/auditar` promove os 🟡
que passarem → commits organizados. Fila completa em `plans/ROADMAP.md`.

# R-20 — Redesenho: Ficha do paciente — odontograma + perfil do dente

> **SPEC (redesign)** · **R-20** · ✅ aprovada (Mateus, 25/07) · **Modelo:** Sonnet (contrato já
> fechado em discussão 25/07 — sem decisão de produto em aberto, execução segue o congelado aqui)
> **Aberto:** 2026-07-25 · **Fechado:** — · **Fase:** aprovada · inventário §1 conferido pelo Mateus

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Ficha do paciente — bloco odontograma + perfil do dente + registros |
| **Tipo** | redesign de tela existente |
| **Rota** | `/dashboard/pacientes/[id]` (aba Prontuário) — **único escopo do R-20** |
| **Fora de escopo (futuro)** | modo consulta (`/consulta/[agendamentoId]`) — item próprio depois, **reusando** o componente desta spec como base (decisão do Mateus 25/07: fechar a ficha primeiro, ela é a base do modo consulta) |
| **Arquivos envolvidos** | `src/components/pacientes/FichasTab.tsx`, `src/components/odontograma/ToothDetailPanel.tsx`, `src/components/odontograma/Odontograma.tsx`, `src/components/fichas/registro-card.tsx`, `src/components/fichas/endo-form.tsx`, `src/components/fichas/implante-form.tsx` |

## 1. Estado atual

**FichasTab.tsx tem DUAS instâncias do mesmo padrão quebrado** (não uma):

- **Site A — rascunho/criação** (linhas ~1263-1310): `Odontograma` full-width → chips de
  região (Q1-Q4) → `ToothDetailPanel` **empilhado abaixo**, também full-width, quando
  `denteAberto != null`. Depois, um divisor, e a lista de `RegistroCard` (draft).
- **Site B — ficha salva, expandida** (linhas ~1576-1600): mesmo padrão em modo leitura —
  `Odontograma` (readOnly, dentro de um card "Odontograma — índice") → `ToothDetailPanel`
  (`readOnly`) empilhado abaixo quando `denteSalvoAberto` bate com a ficha. Depois, a lista
  de `RegistroCard` (salvos).

`consulta-client.tsx` (linhas ~993-1079) repete o MESMO padrão empilhado dentro da coluna
direita de um layout de página já em 2 colunas — é o alvo de replicar-depois (Fase 4), não a
referência.

`ToothDetailPanel` já é uma caixa autocontida (`rounded-xl border p-4`, fundo `--color-surface`)
— não depende de estar full-width; encaixa numa coluna de grid sem mudança estrutural interna,
exceto a tabela de especialidade (Fase 2).

**Achado de código, não do artefato:** o "destacar sem remover" (`abrirDenteEDestacarRegistro`,
`grupoDestacado`, `registroCardRefs`, linhas 474-524) **já existe no Site A**. **Não existe no
Site B** — `onToothToggle` do Odontograma salvo só chama `setDenteSalvoAberto`, sem scroll nem
realce. O achado de 25/07 no ESTADO.md ("procedimentos do dente não aparecem embaixo") é sobre
esse Site B, que nunca teve o comportamento — não é regressão do Site A.

Não há CSS container queries em uso hoje neste bloco (`useIsMobile` em `src/hooks/use-mobile.ts`
é JS + breakpoint de viewport, usado em outras telas — não aqui). O projeto já usa `@container`
do Tailwind v4 em um lugar (`src/components/ui/card.tsx`, convenção `@container/card-header`).

**Resultado:** duas implementações quase idênticas do mesmo bug (odontograma "some" — na
prática, fica longe/desconectado do painel — e registro não realça), com uma lacuna adicional
no Site B (nenhum realce). Consolidar num componente único resolve os dois de uma vez e evita
uma terceira cópia no modo consulta.

**Sua conferência:**

## 2. O que NÃO pode mudar — trava de segurança

- [x] Nomes de campos e variáveis (`OdontogramaEventoDraft`, `eventosDraft`, `denteAberto`,
      `denteSalvoAberto`, `grupoDestacado`, etc.)
- [x] Funções e regras de negócio — `salvarEventosOdontograma`, `agruparRegistros`,
      `eventoViewParaDraft`, `corDoRegistro`, ciclo de status/origem do evento.
- [x] Chamadas de API / endpoints / Server Actions (`consulta/[agendamentoId]/actions.ts`).
- [x] Estrutura do banco / modelo de dados — `odontograma_eventos` (colunas, âncora achatada,
      `grupo_id`, `papel_no_grupo`) intocada.
- [x] Fluxo de navegação (abas, rota, tabs).
- [x] **R-02 Fase 3** — o wiring de amarração de `grupo_id` com confirmação (`gruposAbertos` →
      `ToothDetailPanel` → `criarDenteTipo` → modal "Continuar / Novo", `confirmGrupo`). Pode
      MUDAR DE LUGAR na árvore (o modal já usa `createPortal(document.body)`, imune a onde o
      painel fica no grid), mas a lógica e as props não mudam.
- [x] RLS / multi-clínica — nenhuma query nova, nenhuma tabela nova.
- [x] Regras do R-01 — registro como unidade de salvamento; ficha assinada é imutável
      (`readOnly` do `ToothDetailPanel` continua vindo de `assinadoEm`/autoria).
- [x] R-16 (filtro por responsável) e R-04 (encaminhar) — cards e barra de seleção continuam
      funcionando exatamente como hoje; só a POSIÇÃO do bloco odontograma+painel muda.
- [ ] Outros: —

> Nada marcado aqui é assumido como intocável por padrão: **apresentação muda, o resto não.**

## 3. O que eu quero

> Decisões já tomadas em discussão (25/07, registradas em `plans/ESTADO.md`) — tratadas como
> dadas nesta spec, não reabertas.

**Sensação pretendida:** o odontograma nunca perde o dentista de vista da boca inteira ao
trabalhar num dente — contexto clínico sempre visível, sem a ficha virar uma sequência de telas
que se substituem.

**Problemas concretos de hoje:**
1. O odontograma fica longe do painel do dente (empilhado full-width abaixo, não ao lado) —
   perde-se o contexto da boca ao focar num dente.
2. No Site B (ficha salva), tocar um dente não realça o registro correspondente na lista —
   comportamento que só existe no Site A.
3. A tabela de especialidade (endo/implante) nasce dentro do painel estreito e sufoca quando o
   painel está ao lado do odontograma (coluna de ~322px não cabe uma tabela de canais).

**Mudanças, item por item:**

| Elemento | Como está | Como quero |
|---|---|---|
| Odontograma + painel do dente | Empilhados, painel full-width abaixo, odontograma "some" da vista | Lado a lado quando há largura (desktop); empilha quando estreito (mobile) — **um código só**, reflow por CSS (`@container`), nunca dois layouts renderizados condicionalmente por JS |
| Odontograma | Sempre montado hoje tecnicamente, mas desconectado do painel | Sempre visível, montado o tempo todo, nunca substituído/escondido ao abrir um dente |
| Tabela de especialidade (endo/implante) | Inline dentro do painel de ~322-640px, sufoca | Expande (full-width do bloco ou overlay) quando aberta; registro simples continua compacto no painel |
| Registros do dente aberto | Site A: realçam no lugar (já existe). Site B: nada acontece | Os dois sites realçam no lugar (ring + scroll), lista NUNCA reordena |
| Fluxo | Toca dente → painel empilha abaixo → lista embaixo sem ligação visual | Toca dente / rola até o card → escolhe procedimento → form abre → salva → vira registro na lista (realçado se o dente estiver aberto) |

**Referências:** artefato `plans/_arquivo/artefatos/R-01-ficha-registro.html` (base canônica,
grid `640px|322px`) — a thread principal cria o protótipo derivado dele com as mudanças acima;
esta spec não é o protótipo.

## 4. Tokens — fonte única da verdade

| | |
|---|---|
| **Cores** | `--color-teal` / `-pale` / `-ink` (feito); `--color-coral` / `-pale` / `-ink` (a fazer); `--color-slate` / `-pale` / `-ink` (pré-existente); `--color-warning` / `-pale` / `-ink` (alerta). Texto tingido usa sempre o `-ink`, nunca a cor cheia (AA) |
| **Superfícies** | `--color-surface` · `--color-surface-alt` · `--color-border` |
| **Texto** | `--color-text-primary` · `--color-text-secondary` · `--color-text-muted` |
| **Tipografia** | `font-heading` (DM Serif Display, títulos) · corpo Outfit (default) · `font-mono` (DM Mono, todo número — dente, medida, data, CRO), sempre `tabular-nums` |
| **Espaçamento** | escala Tailwind padrão já em uso no arquivo (`gap-3`/`gap-4`/`gap-5`, `p-4`/`p-6`) — nenhuma escala nova |
| **Raio de borda** | `--radius` (`0.625rem`) e derivados `--radius-md/lg/xl/2xl` já definidos; cartão usa `rounded-2xl`/`rounded-xl` como hoje |
| **Grid de referência** | artefato revisado: odontograma `640px` (coluna fixa) · painel do dente `322px`/`1fr` (coluna flexível) — ponto de partida, ajustável no protótipo |
| **Responsividade** | **Tailwind v4 container queries** (`@container` + `@lg/…:`), não breakpoint de viewport — reflow reage à largura do CONTÊINER, não da tela. Vale já na ficha (o conteúdo vive numa coluna estreitada pela sidebar do dashboard, < viewport) E **future-proofa a base**: o mesmo componente vai ser embutido na coluna estreita do modo consulta depois, sem retrabalho (decisão do Mateus 25/07). Convenção já usada no projeto: `@container/card-header` (`src/components/ui/card.tsx`) |
| **Arquivo onde vivem** | `src/app/globals.css` |

## Parte 1 — Plano de implementação

### Mudanças de arquitetura

| Arquivo | O que muda |
|---|---|
| `src/components/odontograma/OdontogramaComPainel.tsx` (**novo**) | Componente de layout único: `@container`, grid/flex responsivo, monta `Odontograma` sempre + `ToothDetailPanel` condicional; expõe as mesmas props que os dois já recebem hoje nos 3 call sites (eventos, seleção, `onToothToggle`, `dataPadrao`, `gruposAbertos`, `readOnly`, `compact`/`hideFilters`) mais um slot pros chips de região (só existe no Site A) |
| `src/components/pacientes/FichasTab.tsx` | Site A (~1263-1310) e Site B (~1576-1600) passam a usar `OdontogramaComPainel`; Site B ganha `registroCardRefs`/`grupoDestacado` equivalentes ao que o Site A já tem (generalizar, não duplicar) |
| `src/components/odontograma/ToothDetailPanel.tsx` | Estado `detalheAbertoIdx` passa a informar o pai quando uma tabela de especialidade está aberta (nova prop `onDetalheExpandidoChange?: (aberto: boolean) => void` ou equivalente), pra `OdontogramaComPainel` alocar largura cheia só nesse momento |

### Fases

#### Fase 1: layout responsivo lado-a-lado + odontograma sempre visível (Risco: MÉDIO)
**Ações:**
1. Criar `src/components/odontograma/OdontogramaComPainel.tsx` — raiz `@container/odontograma`,
   grid `grid-cols-1 @lg/odontograma:grid-cols-[640px_1fr]` (ou `flex flex-col
   @lg/odontograma:flex-row`); coluna 1 = `Odontograma` (sempre montado); coluna 2 = espaço do
   `ToothDetailPanel`, vazio (sem colapsar a coluna) quando nenhum dente está aberto.
2. Site A (`FichasTab.tsx` ~1263-1310): trocar o bloco atual pelo componente novo; os chips de
   região continuam fora (acima), inalterados; `abrirDenteEDestacarRegistro` já existente vira
   o `onToothToggle` passado.
3. Site B (`FichasTab.tsx` ~1576-1600): mesma troca, com `readOnly` e sem chips de região; o
   cabeçalho "Odontograma — índice" vira o rótulo/slot do componente novo.
4. Sem mudança de props públicas em `Odontograma`/`ToothDetailPanel` além do item 4 da Fase 2 —
   só onde e como são montados.

**Verificável:** no desktop (>640px de contêiner), abrir um dente → odontograma continua à
esquerda, painel abre à direita, nada encolhe/some; estreitar a janela (ou o painel do
navegador) até <640px de contêiner → empilha, painel abaixo do odontograma. Repetir nos dois
sites (ficha em criação e ficha salva expandida). Dark e light conferidos.
**Dependências:** nenhuma.

---

#### Fase 2: tabela de especialidade expande (Risco: MÉDIO)
**Ações:**
1. `ToothDetailPanel.tsx`: quando `detalheAbertoIdx` aponta pra um evento endo/implante,
   notificar o pai (nova prop de callback) além de renderizar `EndoForm`/`ImplanteForm` inline
   como hoje (linhas 520-537, mantém-se — a MUDANÇA é o pai reagir).
2. `OdontogramaComPainel.tsx`: ao receber a notificação, o grid muda pra a coluna do painel
   ocupar a largura cheia (`col-span-2` / a coluna do odontograma recua ou empilha) enquanto a
   tabela está aberta; fechar a tabela volta ao grid `640px|322px`.
3. Motion discreto na transição de largura (`motion/react`, já em uso no arquivo) — sentida, não
   percebida, sem layout jump brusco.

**Verificável:** abrir um dente com endodontia indicada, tocar "Detalhes" → a tabela de canais
expande ocupando a largura cheia do bloco; fechar retorna ao grid padrão. Testar também com
`ImplanteForm`.
**Dependências:** Fase 1.

---

#### Fase 3: registros — destacar sem remover, nos dois sites (Risco: BAIXO)
**Ações:**
1. Generalizar o padrão já existente no Site A (`registroCardRefs`, `grupoDestacado`,
   `abrirDenteEDestacarRegistro`, linhas 474-524 de `FichasTab.tsx`) pra funcionar também com a
   lista de cards SALVOS (`eventosParaCards`) do Site B — mesma mecânica (`Map<string,
   HTMLDivElement>` de refs por `key` do card, `scrollIntoView` + ring por 1,6s), sem duplicar a
   função: um hook ou função utilitária compartilhada, parametrizada pela fonte de cards (draft
   vs. salvo).
2. `onToothToggle` do Site B passa a chamar essa função generalizada em vez de só
   `setDenteSalvoAberto`.
3. Nenhuma reordenação de lista em nenhum dos dois sites — `agruparRegistros` continua ditando
   a ordem; o destaque é só visual (ring), nunca move o card.

**Verificável:** na ficha salva e expandida, tocar um dente que tem registro → o card
correspondente na lista abaixo recebe o ring de destaque e a tela rola até ele, a ORDEM dos
cards não muda; some sozinho depois de ~1,6s. Repetir no rascunho (site A) pra confirmar que não
regrediu.
**Dependências:** Fase 1.

---

> **Modo consulta = FORA de escopo do R-20 (item futuro).** Decisão do Mateus (25/07): fechar a
> ficha primeiro, ela é a base do modo consulta. Quando o modo consulta virar item próprio, ele
> **reusa** o `OdontogramaComPainel` desta spec — o `@container` (Fase 1) já garante o reflow na
> coluna estreita dele sem retrabalho. É só troca de call site (`consulta-client.tsx` ~993-1079) +
> ajuste do breakpoint interno contra a largura real da coluna; nada de novo componente.

### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Breakpoint de container (`@lg/odontograma:`) errado pra largura real da coluna da ficha (estreitada pela sidebar) | média | Aferir o breakpoint contra a largura real do contêiner no localhost da Fase 1, não chutar 640px de cara |
| Motion da tabela expandindo (Fase 2) gerar layout jump ou flicker | média | Testar com `motion/react` (`layout` prop / `AnimatePresence`) antes de aprovar Fase 2; se instável, cai pra overlay (`createPortal`) em vez de expansão in-flow |
| Generalizar `grupoDestacado`/`registroCardRefs` (Fase 3) quebrar o Site A que já funciona | média | Escrever a função nova coberta por teste antes de trocar o Site A; Site A é o caso já validado, vira o teste de regressão |
| R-02 Fase 3 (modal de confirmação de amarração) depender de alguma posição no DOM que o novo grid muda | baixa | O modal já usa `createPortal(document.body)` — não deveria depender de onde o painel está montado; conferir explicitamente no gate de aceite |

## 5. Gates de aceite

- [ ] Nenhuma alteração fora do escopo do item 2 (checar: nomes de campo, `salvarEventosOdontograma`, RLS, R-02 Fase 3 wiring intactos)
- [ ] Usa **exclusivamente** os tokens do item 4 — zero valor hard-coded novo
- [ ] Desktop largo (Site A e B): abrir um dente → odontograma continua visível à esquerda, painel abre à direita, sem encolher/sumir
- [ ] Estreitar a janela/painel até abaixo do breakpoint do contêiner → empilha (painel abaixo do odontograma), mesma árvore de componentes (não dois JSX condicionais)
- [ ] Abrir um dente com endodontia OU implante indicado, tocar "Detalhes" → a tabela expande ocupando a largura cheia; fechar volta ao grid padrão
- [ ] Ficha SALVA e expandida: tocar um dente com registro → o card correspondente na lista abaixo realça (ring) e a tela rola até ele, sem reordenar a lista
- [ ] Rascunho (criação/edição): mesmo comportamento de realce continua funcionando (não regrediu)
- [ ] R-02 Fase 3: criar um evento de tipo já com grupo aberto no mesmo dente → modal "Continuar / Novo" aparece e grava corretamente, em qualquer posição do painel no grid
- [ ] R-16 (filtro por responsável) e R-04 (encaminhar em lote) continuam funcionando sem mudança de comportamento
- [ ] Dark **e** light conferidos nos dois sites
- [ ] Diff revisado por arquivo, arquivo por arquivo

## 6. Fluxo de execução

```
Inventário (feito, seção 1) → briefing (seção 3, decisões já tomadas) → prova visual = R-01
(layout, já validado) + widget de registros (já validado); NÃO reconstruir o mockup inteiro →
código: Fase 1 → 2 → 3 em FichasTab (sites A e B) → localhost (validação visual real) → produção
```

**Escopo = a ficha, só.** Modo consulta é item futuro que reusa este componente (ver nota após a
Fase 3). Dentro do R-20, Fase 1 fecha e valida no localhost antes da Fase 2, e assim por diante.

## 7. Pós-entrega

- [ ] Diff revisado
- [ ] Testado em localhost (desktop + mobile, dark + light)
- [ ] Subido pra produção
- [ ] Tokens atualizados, se algum mudou
- [ ] Item fechado no `ROADMAP.md` e spec + artefato movidos pro `_arquivo/` *(ato atômico)*

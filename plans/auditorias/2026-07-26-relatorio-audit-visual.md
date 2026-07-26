# Relatório — Auditoria visual (Fable) · 2026-07-26

## Sumário executivo

O núcleo do produto — Dashboard e Consulta — é a barra, e ela é alta. A maioria das telas de produto (ficha, agenda, pricing, financeiro, modais, configurações) responde "sim, mesma equipe" na estrutura: serif nos títulos, mono nos números, teal com avareza, fundo neural, cards com raio hierárquico. Elas ficam em **B** não por erro grosseiro, mas por um punhado de desvios repetidos do fingerprint — a leitura honesta é "mesma equipe, num dia apressado".

O problema real está nas **duas portas públicas**, que são as primeiras telas que o mundo vê e as piores do conjunto: a **Landing (C)** é um fork do design system — themeia em JS com ~25 cores hardcoded, contradiz a própria oferta (7 vs 14 dias) e reprova a lei do mono na stats strip. O **Auth (D)** é o mais frágil: 5 de 12 capturas saem em branco, o dark mode é um franken-light quebrado, e um override de token no layout reprova AA nos labels. A porta de entrada não pode ser a tela mais quebrada do produto.

E há **um bug de uma linha que derruba a tipografia do app inteiro**: `globals.css:267` tem `--font-sans: var(--font-sans)` (auto-referência) — o corpo de todas as telas renderiza em Times New Roman, não em Outfit. É o item de maior alavancagem do relatório inteiro.

**As 5 alavancas de maior impacto:**

1. **`globals.css:267`** — trocar `--font-sans: var(--font-sans)` por `var(--font-outfit)`. Uma linha, conserta o corpo de texto do produto inteiro.
2. **Robustez de render** — Landing, Auth, Planos e Financeiro gateiam a página inteira atrás de `initial opacity:0`; sem JS disparar (SSR, print, captura), 80% do conteúdo não existe. Não é motion, é fragilidade. Pintar sem JS.
3. **Selar o Auth** — dark mode + contraste AA na porta de entrada.
4. **Uma classe única de CTA primário** (gradiente 135° `#2f9c85→#1d7a65` + glow + `-translate-y-0.5`) aplicada onde hoje há teal chapado — mata a divergência nº1 de "mesma equipe", que aparece em ~8 telas.
5. **Sweep de token** — `text-teal → text-teal-ink` nos chips (AA no light) e vermelhos Tailwind → coral. Coesão de marca + acessibilidade num passe só.

### Notas por tela

| Tela | Nota | Leitura em uma linha |
|---|---|---|
| Landing | **C** | Fork do sistema: theming em JS, cores hardcoded, oferta contraditória, mono ausente na strip |
| Auth (login/cadastro/esqueci) | **D** | 5/12 capturas em branco, dark quebrado, AA reprovado por override de token |
| Planos / Pricing | **B** | DNA certo, mas duas reprovações AA (badge, CTA secundário) e CTA fora do canônico |
| Pacientes | **B** | Sólida, mas afetada pelo bug do Times, sem CTA no empty de onboarding, minas de avatar |
| Ficha (visualização) | **B** | Forte, clínica de verdade; números do header em Outfit, arcada some no dark |
| Ficha (editor de evolução) | **B** | Campos viram bloco cinza pesado no light, emerald/red fora de token |
| Modais (4+delete) | **B** | Família certa; CTAs teal chapado, chips text-teal, um delete em red-500 |
| Abas (orçamentos/agenda/arquivos) | **B** | Três linguagens diferentes de empty state, yellow-600 fora da paleta |
| Agendamentos | **B** | Título um degrau abaixo do canônico, dias da grade não-mono |
| Orçamentos / Financeiro | **B** | Financeiro é o elo fraco: título subdimensionado, empties genéricos |
| Configurações / Perfil | **B** | Dois "Meu Perfil" distintos, /usuarios boiando em espaço vazio |
| Notificações / dock overlays | **B** | Painel vaza pela borda direita (posição herdada de sidebar) |
| Odontograma / ícones | **B** | Estrutura é nível A; a camada de glifos de procedimento é o elo fraco |

---

## Quick wins de alto ganho (must)

### 1. Corpo do app inteiro em Times New Roman — MUST
- **Tela/componente:** app inteiro (visível em Pacientes e Dashboard; afeta todas as telas)
- **Problema:** `globals.css:267` tem `@theme inline { --font-sans: var(--font-sans); }` — auto-referência que sobrescreve o mapeamento correto da linha 223 e torna `font-family: var(--font-sans)` inválida. Todo o corpo (subtítulos, placeholders, headers de tabela, copy) cai no fallback serif do browser. Só `--font-heading` e `--font-mono` sobrevivem.
- **Fix:** `globals.css:267` → `--font-sans: var(--font-outfit);` (ou deletar a linha). Verificar no browser: computed font-family do body deve ser Outfit.
- **Ganho × Esforço:** alto × **quick-win**

### 2. Página em branco sem JS — gate de render atrás de opacity:0 — MUST
- **Tela/componente:** sistema — Landing, Auth (login/cadastro/esqueci), Planos, Financeiro
- **Problema:** o wrapper de página usa `motion.div initial={{opacity:0}}` (ou `whileInView`). O SSR pinta `opacity:0` inline e a tela fica invisível até o JS animar. Prova nas capturas: 5 de 12 do Auth e 4 fullPage da Landing saíram em branco; a de Planos dark-desktop idem. É fragilidade, não motion.
- **Fix:** tirar o fade do wrapper de página. Trocar por CSS que pinta sem JS (`animate-in fade-in-0 slide-in-from-bottom-2 duration-500`) ou animar só `transform` (y) entregando `opacity:1` por padrão nas seções críticas (preços, CTA, form de login). Arquivos: `login/page.tsx:103`, `cadastro-form.tsx:98`, `esqueci-senha/page.tsx:58`, `page.tsx` (landing, preset fadeIn L19), `planos-client.tsx:150`, `financeiro-client.tsx`.
- **Ganho × Esforço:** alto × **quick-win** (medio na Landing por causa do whileInView)

### 3. Auth: dark mode quebrado + AA reprovado por override de token — MUST
- **Tela/componente:** `src/app/(auth)/layout.tsx`
- **Problema:** o layout força tokens light inline, mas dois escapam (`--border` e `--color-teal-ink` viram valores dark), produzindo inputs claros com borda quase preta e botão `#5dbeb0` com texto branco (~2:1). Além disso sobrescreve `--color-text-secondary` para `#8a8a8a` (labels ~3.5:1, reprova AA) e `--color-text-muted` para `#d9d9d9` (1.4:1, mina armada).
- **Fix:** decidir e selar — (a) honrar "dark e light impecáveis": mover o escopo warm para classe `.auth-scope` em globals.css com par `.dark`; ou (b) declarar auth sempre-light e então sobrescrever **também** `--border`, `--color-teal-ink`, `--input`, `--ring`. Remover o override de `text-secondary` (herdar `#4b5563`) e o de `text-muted`. Hoje está no pior dos dois mundos.
- **Ganho × Esforço:** alto × **médio**

### 4. CTA primário: teal chapado → gradiente+glow canônico — MUST
- **Tela/componente:** sistema — Auth (3 rotas), Planos (card Clínica), Modais (Editar/Retorno/Orçamento/Emitir), Ficha editor (Salvar/Nova Evolução), Orçamentos (Novo Orçamento), Perfil (Salvar/Adicionar foto)
- **Problema:** o botão primário é `bg-teal` chapado com `hover:bg-teal-lt` (que ainda **clareia**, invertendo o lift canônico). O canônico é gradiente `135deg #2f9c85→#1d7a65`, glow `0 8px 32px rgba(47,156,133,0.38)`, inset highlight branco 14%, `hover:-translate-y-0.5 active:scale-[0.98]`, pulso `btn-glow`. Divergência lida como "outra época/equipe".
- **Fix:** extrair **uma** variante/classe única de CTA primário e aplicar em todos os pontos. Já existem `btn-glow` e `btn-scale` em globals.css. Refs de código: modais L141/118/370/193, `planos-client.tsx:240`, `perfil-client.tsx:358/191`, `orcamentos-client.tsx:800`, `FichasTab.tsx:1351/1586`. Extrair como variante do Button para não divergir de novo.
- **Ganho × Esforço:** alto × **quick-win**

### 5. Chips em light: text-teal → text-teal-ink (falha AA documentada) — MUST
- **Tela/componente:** sistema — Planos (Assinar agora `#2f9c85` inline ~3:1; badge "MAIS ESCOLHIDO" `bg-teal` + white 3.38:1), Modais (ApresentarFicha, Emitir, novo-orcamento), Pacientes (chip follow-up, filtro ativo)
- **Problema:** chips/badges pequenos usam a cor cheia `text-teal` sobre `bg-teal/10`. O próprio `globals.css:63-67` documenta que a cor cheia reprova AA como texto e manda usar `-ink`. É contraste real fraco no light.
- **Fix:** fórmula canônica de chip — `bg-teal/10 border border-teal/25 text-teal-ink` (resolve `#1e7060` no light, `teal-lt` no dark sozinho). Badge de Planos → `bg-teal-pale border border-teal/30 text-teal-ink`. Refs: `planos-client.tsx:179/255`, `ApresentarFichaPicker:80`, `EmitirDocumentoModal:148`, `novo-orcamento:131/253`, `pacientes-table.tsx:337/208`.
- **Ganho × Esforço:** alto × **quick-win**

### 6. Landing contradiz a própria oferta (7 vs 14 dias) — MUST
- **Tela/componente:** Landing (`page.tsx`)
- **Problema:** os CTAs dizem "Começar 7 Dias Grátis" (L413, 353, 833) enquanto a seção de preços promete "14 dias" (L672, 39, 51). Numa landing de venda isso mina confiança no primeiro scroll.
- **Fix:** unificar para o valor real do trial nos 6 pontos.
- **Ganho × Esforço:** alto × **quick-win**

### 7. Números fora do DM Mono — MUST
- **Tela/componente:** sistema — Landing (stats strip em serif+gradient-clip), Ficha (idade/nascimento/telefone em Outfit), Agendamentos (dias da grade), Abas (contador de orçamentos, "dd" do chip de data), Modais (data em novo-orcamento)
- **Problema:** a lei mais dura do fingerprint — todo número em DM Mono. A stats strip da Landing ainda inverte a gramática (número em serif + label em mono) e usa `background-clip` que não existe no sistema.
- **Fix:** envolver os valores em `font-mono`; stats strip → `font-mono text-2xl font-bold text-teal-ink` sem gradient, labels em Outfit. Refs: landing L459-467, `paciente-detail-client.tsx:1200-1213`, `week-view.tsx:213`, `paciente-detail:1458/1651`, `novo-orcamento:128`.
- **Ganho × Esforço:** alto/médio × **quick-win**

### 8. font-bold sobre DM Serif Display (faux-bold) — MUST
- **Tela/componente:** sistema — Auth (h1 login/cadastro), Ficha (nome do paciente), Planos (logo `font-medium`), Financeiro (h1)
- **Problema:** DM Serif Display só existe em peso 400; `font-bold`/`font-medium` força o browser a sintetizar um bold empastado, que destoa de todo heading limpo do Dashboard.
- **Fix:** remover `font-bold`/`font-medium` dos headings serif. Refs: `login/page.tsx:108`, `cadastro-form.tsx:107`, `paciente-detail:1200`, `planos-client.tsx:106`, `financeiro-client.tsx:392`.
- **Ganho × Esforço:** médio × **quick-win**

### 9. Cores Tailwind hardcoded fora dos tokens clínicos — MUST
- **Tela/componente:** sistema — Landing (gray-*, orange-500, âmbar off-palette), Auth (red-500 no erro do login), Modais (red-500 no Excluir Evolução), Abas (red-500 em Limpar Filtros, yellow-600 no pagamento), Config/Perfil (red-500/600), Ficha (emerald/amber no STATUS_META)
- **Problema:** viola a regra dura de token e cria três dialetos de vermelho/negativo no mesmo produto (red-500, coral, yellow-600). Emerald para "concluído" quebra a linguagem onde "feito" é sempre teal.
- **Fix:** negativo → coral (`text-coral-ink`, `bg-coral/10 border-coral/25`); "concluído" → `bg-teal-pale text-teal-ink`; "em andamento" → token `--warning` (não amber-500 cru); parágrafos da landing → `text-text-secondary`; orange do card Privacidade → `bg-teal/10 text-teal-ink`. Refs: `login:125`, `FichasTab:88-89/2059`, `DocumentosTab:331`, `paciente-detail:1579`, `configuracoes-client:419+`.
- **Ganho × Esforço:** alto/médio × **quick-win** (o sweep todo é médio)

### 10. Eyebrow mono ausente acima de títulos — MUST
- **Tela/componente:** sistema — Landing (seções Funcionalidades/Preços/FAQ), Auth (3 rotas), Planos (header), Pacientes (header), Abas (orçamentos/agenda)
- **Problema:** o padrão-assinatura (micro-label mono uppercase `tracking ≥0.18em` acima do serif) é o que mais identifica o produto — presente no Dashboard e na Consulta, ausente nessas telas. Sem ele, a leitura "mesma equipe" falha de imediato.
- **Fix:** adicionar eyebrow `text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-teal-ink mb-2/3` acima de cada h1/h2 de seção (ex.: "PLANOS E PREÇOS", "ÁREA DO DENTISTA", "BASE DE PACIENTES"). Na Landing, trocar o pill "A Nova Era" por eyebrow.
- **Ganho × Esforço:** alto/médio × **quick-win** (médio na Landing pelo volume)

### 11. Empty state de onboarding sem ação — MUST
- **Tela/componente:** Pacientes (empty state, `pacientes-table.tsx:292/418`)
- **Problema:** "Cadastre o primeiro paciente para começar." não tem CTA ali — o botão fica no canto superior direito. O momento nº1 do onboarding manda fazer algo que a tela não oferece no ponto do olhar.
- **Fix:** quando `canCreate`, adicionar Link para `/dashboard/pacientes/novo` abaixo do texto, com a fórmula do header (gradiente teal + `btn-glow`, `rounded-2xl`).
- **Ganho × Esforço:** alto × **quick-win**

### 12. Painel de notificações vaza pela borda direita — MUST
- **Tela/componente:** `notification-bell.tsx:299`
- **Problema:** o painel abre à direita do sino (`left-full ml-3 bottom-0`) — herança de sidebar vertical. No dock horizontal o sino é penúltimo item, então o painel colide com o avatar e vaza pela tela (header "Notificações" cortado na captura). O dropdown de perfil, irmão do mesmo dock, abre certo para cima.
- **Fix:** `left-full ml-3 bottom-0` → `bottom-full mb-3 right-0`, espelhando o dropdown de perfil.
- **Ganho × Esforço:** alto × **quick-win**

### 13. Mobile da ficha: ações cortadas + login sem logo — MUST
- **Tela/componente:** Ficha header (`paciente-detail-client.tsx:1143`) e Login mobile (`login/page.tsx:102`)
- **Problema:** na ficha, a linha de ações não quebra no mobile e empurra "Marcar retorno" para fora da tela (perda funcional). No login mobile, `AuthBrandPanel` é `hidden md:flex` sem fallback — abre sem logo algum, e `px-12` fixo espreme o form em ~270px num viewport de 375px.
- **Fix:** ficha → `flex flex-wrap justify-end gap-2` e esconder label do "Apresentar" `< sm`. Login → chip de logo `md:hidden` acima do h1 e `px-12` → `px-4 md:px-12`.
- **Ganho × Esforço:** alto/médio × **quick-win**

### 14. Aba ativa da ficha sem preenchimento teal — MUST
- **Tela/componente:** Ficha (`paciente-detail-client.tsx:1266`)
- **Problema:** as 4 abas (Prontuário/Orçamentos/Arquivos/Agenda) leem como pills idênticas — o usuário perde o "onde estou". O código pede `data-[state=active]:bg-teal` mas não aparece no render.
- **Fix:** conferir se o `TabsTrigger` propaga `data-state="active"` e se `data-[state=active]:bg-teal` vence o `bg-surface` base; reforçar o estado ativo (fill teal + sombra).
- **Ganho × Esforço:** alto × **médio**

---

## Ícones de procedimento

**Veredito:** o odontograma como base é **nível A** — dentes anatômicos reais, numerais em mono, sistema teal/coral/slate, mapa oclusal das 5 faces, mesma mão do Dashboard/Consulta. **A camada de glifos de procedimento é o elo fraco** e é exatamente o foco deste deep-dive. Coroa (hachurada), extração (X), fratura (zigue-zague) e ausente (contorno tracejado) são clínicos e refinados. Mas o conjunto lê como "várias convenções montadas", não como uma família desenhada pela mesma mão — e dois glifos quase somem no tamanho real da arcada, que é justamente onde vivem.

**Direção proposta** (a ênfase do audit): tratar os glifos como **um set único**, uniforme em peso óptico e em lógica preenchido-vs-contornado, e validar **todos no tamanho real da arcada** — não ampliados no painel.

**MUST:**
- **Grid de traço único** — hoje há 7 pesos diferentes (implante 1.9, pino 2.2, coroa 2.2, canal 1.4, extração 2.6…). O X da extração pesa demais, o canal-a-tratar é fino demais. Fixar **2 pesos**: contorno primário **2.0**, secundário/hachura **1.4-1.5**. Baixar extração 2.6→2.0, subir canal 1.4→~1.8. `Odontograma.tsx:288-402`. Ganho alto × médio.
- **Pino/núcleo** — hoje uma linha vertical stroke 2.2 que vira fio de cabelo no dente pequeno. Redesenhar como haste **afunilada preenchida** + bloco de núcleo sólido no terço cervical, igualando o peso do implante. `Odontograma.tsx:351-364`. Ganho alto × médio.
- **Selante** — ponto teal r=3 quase invisível e ambíguo com a lesão periapical (outro círculo). Dar forma própria: losango arredondado ou arco sobre o sulco oclusal. `Odontograma.tsx:384-386`. Ganho médio × quick-win.

**NICE:**
- **Lesão periapical** — aro coral r=4.5 lê como "o" solto e colide com o selante; a convenção radiográfica é radiolucência **difusa**. Trocar por mancha preenchida com blur radial. `Odontograma.tsx:324-326`. Médio × médio.
- **Implante** — a coroa neutra natural fica desenhada por cima do parafuso ("dente normal com parafuso embaixo"). Tratar a coroa como protética (ombro do abutment/hachura) para afastar de pino e comunicar implante. `Odontograma.tsx:273-321`. Médio × reforma.

---

## Melhorias médias

- **Landing themeia em JS (footer light em página dark)** — MUST · `page.tsx:213-241`: deletar o bloco de ~25 constantes de cor inline e usar classes de token com dark resolvido em CSS. O `mounted`/`resolvedTheme` some junto. Alto × médio.
- **Arcada some no dark** — MUST · `Odontograma.tsx`: dentes não-selecionados ficam charcoal sobre charcoal; elevar fill (`surface-alt`) e stroke (`border-strong`) no dark até a arcada ficar legível. Médio × médio.
- **Dois sistemas de form no Auth** — MUST · login usa label mono uppercase (o DNA), cadastro/esqueci usam `text-sm` sentence-case com ícone interno. Adotar o padrão do login nos 3 forms; remover ícones internos (User/Mail/Lock) e o `pl-11`. Médio × médio.
- **Dois "Meu Perfil" distintos** — MUST · `configuracoes-client:424-504` (nome+CRO) vs `/dashboard/perfil` (editor rico). Consolidar em um: a aba aponta via Link para a rota rica, ou remover o bloco inline. Alto × médio.
- **/usuarios boiando em espaço vazio** — MUST · `usuarios-client:258` `max-w-3xl` com card curto e ~70% da viewport vazia. Roteirizar para dentro de configuracoes (shell de aba, já aceita `asTab`) ou dar conteúdo de apoio. Médio × médio.
- **Grid dos cards de plano com alturas diferentes** — MUST · `planos-client.tsx:157`: remover `items-start` (o card popular fica menor que o comum, minando o próprio badge). Médio × quick-win.
- **Blobs verdes dominam o hero no dark** — MUST · landing L255-257: adicionar `dark:opacity-25/30` (o canônico dark é aurora quase subliminar). Médio × quick-win.
- **Sombras pretas nos overlays do dock** — MUST · `notification-bell:303` e `floating-dock:180`: trocar `shadow-2xl`/preto por sombra tingida de teal com spread negativo. Médio × quick-win.
- **Contêiner de página em rounded-2xl (deveria ser 3xl)** — NICE · sistema: Pacientes, Planos cards, Modais-sheet grandes, painel de notificações. Padronizar `rounded-3xl` no tier de contêiner de página. Médio × quick-win.
- **Campos do editor de evolução viram bloco cinza no light** — MUST · `FichasTab.tsx:1426/1445/1560/1571`: `bg-surface-alt` → `bg-background` ou `bg-surface-alt/40`. Alto × quick-win.
- **Título de página subdimensionado** — MUST/NICE · Agendamentos (`text-3xl md:text-4xl` sem `tracking-tight`, L938), Financeiro (`text-2xl`, L392), Ficha (nome `text-2xl` menor que "Histórico Clínico"). Alinhar ao canônico `text-4xl md:text-5xl tracking-tight`. Alto × quick-win.
- **Avatares de paciente com branco sobre teal/50** — MUST · `pacientes-table.tsx:56-63`: `bg-teal/50` + white ≈1.9:1; trocar por fundos tingidos com texto `-ink` ou fills escuros que seguram branco. Médio × quick-win.
- **Filtro follow-up não filtra no mobile** — MUST · `pacientes-table.tsx:423`: `pacientes.map` → `pacientesFiltrados.map` (bug funcional). Médio × quick-win.
- **Selects nativos na aba Arquivos** — NICE · `DocumentosTab:310-326`: seta de dropdown nativa destoa; usar o shadcn Select da própria tela. Médio × médio.
- **"Atender agora" e "Novo Agendamento" ambos teal quentes** — NICE · `agendamentos-client:1040`: rebaixar "Atender agora" para secundário, deixar só um CTA primário. Médio × médio.
- **Copy AI-slop pontual** — NICE · Landing ("O Poder da IA no seu Consultório", "A Nova Era"), Pacientes ("Gerencie sua base com elegância"). Reescrever no tom concreto da casa ("Você atende. A IA documenta."). Médio × quick-win.

---

## Reformas

- **Empty states: três linguagens diferentes → um componente canônico** — MUST · o padrão do produto é ícone teal em **quadrado** `bg-teal/10 border-teal/20 rounded-2xl` + título serif afirmativo + apoio de 1 linha. Hoje coexistem: círculo redondo cinza (Arquivos `DocumentosTab:425`, esqueci-senha sucesso), ícone solto teal/20 (Orçamentos, Agenda), FileText cinza (timeline da ficha), texto muted sem âncora (Financeiro fluxo/extrato), quadrado sem borda (notificações "Tudo em dia"). Como as capturas são de clínica vazia, esse é o **primeiro elemento que o olho lê** e ele grita "épocas diferentes". Extrair um `<EmptyState>` único e aplicar em todas, variando só ícone/copy. Ganho alto × médio.
- **Dois modais de exclusão com anatomias diferentes** — NICE · Excluir Evolução (centralizado, sem lista de consequências) vs Excluir Orçamento (left-aligned, com lista e nota de proteção). Unificar num componente de confirmação destrutiva. Médio × médio.
- **Motion: hover:scale → micro-lift, e presets fora do canônico** — NICE · sistema: `hover:scale-105`/`group-hover:scale-110` (Landing, editor) → `hover:-translate-y-0.5 active:scale-[0.98]`; chip flutuante da Landing em loop infinito sem semântica; presets fadeIn `0.6s ease default` → `0.4s [0.22,1,0.36,1]`; unificar a curva de entrada dos dois overlays do dock. Baixo/médio × quick-win a médio.

---

*Todos os caminhos de arquivo citados são relativos à raiz do repo (`C:\Users\mateu\Desktop\Odonto.IA-main`). O relatório está pronto para virar itens ⏳ no ROADMAP — sugiro entrar os 3 primeiros quick-wins (globals.css, opacity:0, Auth) como um lote isolado, já que os dois primeiros afetam o app inteiro e o terceiro é a porta de entrada.*

---

> **Nota de verificação (Claude, pós-audit):** o achado nº 1 (fonte do corpo caindo em serif do browser) foi **confirmado no código**: `globals.css:223` mapeia `--font-sans: var(--font-outfit)` corretamente, mas um segundo bloco `@theme inline` (boilerplate shadcn, linha 266) re-declara `--font-sans: var(--font-sans)` — referência circular que invalida a variável nos usos das linhas 442/471/484/516. Fix: deletar a linha 267.
>
> **Cobertura da captura:** 67 screenshots (light+dark; desktop+mobile nas telas-chave; 26 estados interativos — modais, abas, odontograma expandido, dente aberto, popovers). **Não capturado** (fora do audit): /redefinir-senha, /verifique-email (token de e-mail), /onboarding, /primeiro-acesso (redirect p/ conta existente), /convite/* (token), /dashboard/fichas/* (Dex fora do ar), /dashboard/pacientes/novo, /dashboard/bot, /dashboard/whatsapp. A clínica de teste é vazia: telas de lista auditadas no estado vazio; ficha auditada via /dashboard/pacientes/demo.

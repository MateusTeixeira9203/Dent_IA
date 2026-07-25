# Auditoria — Ficha/Odontograma (R-16, R-04 Fase 3, R-02)

> **AUDITORIA** · Pacientes → Ficha (odontograma, registros, encaminhar, filtro) · 2026-07-24
> **Ambiente:** localhost (dev=prod, único Supabase) · **Autorização:** Mateus, conta própria,
> paciente Marcos, "total liberdade" (24/07) · **Rotas:** 1 de 62 (fatia deliberada, não sistema
> inteiro) · **Fluxo:** 1 (criar evolução → salvar → encaminhar → filtrar → desfazer)

## Veredito

R-02 Fase 1 (card único) funciona sem nenhuma falha encontrada — testado a fundo. R-04 Fase 3 e
R-16 funcionam na essência (encaminhar grava, filtro filtra, tudo persiste de verdade), mas **2
bugs reais tornam a Fase 3 inutilizável em desktop e deixam o R-16 com um beco sem saída**. Nenhum
dos três vai pra ✅ ainda — precisam do fix abaixo + uma repassada.

## Achados

| # | Severidade | Onde | O que acontece | Como reproduzir |
|---|---|---|---|---|
| 1 | **alto** | `EncaminharBar` (`encaminhar-bar.tsx`) vs. dock de navegação flutuante | Em viewport desktop (≥768px), a barra de ação do modo seleção (contador, selecionar tudo, avatares de destino, botão Encaminhar) fica **atrás** do dock de navegação flutuante — os dois usam `z-index: 50`, e o dock renderiza por cima. Nada da barra é clicável nem visível; a única forma de encaminhar em lote em desktop é não ter nenhuma. Confirmado por `getBoundingClientRect()`: os dois elementos ocupam a mesma faixa vertical (620–670px de um viewport de 694px). Em mobile (dock oculto, `hidden md:flex`) a barra funciona perfeitamente. | Logar, abrir uma ficha com registro indicado, clicar "Encaminhar" no cabeçalho da consulta, marcar 1+ card — a barra não aparece em nenhum lugar visível na tela em desktop. |
| 2 | **alto** | `FichasTab.tsx` — interação entre `filtroResponsavel` (R-16) e des-encaminhar (R-04 #7) | Ao desfazer o encaminhamento (× no badge) enquanto o filtro está fixado no dentista que deixou de ser responsável por qualquer registro, `filtroResponsavel` não reseta — e como não sobra `responsaveis.length >= 2`, os **chips somem** (regra "solo não mostra chip"). Resultado: `Histórico Clínico` renderiza vazio (nenhuma ficha passa o filtro fantasma), sem nenhum controle na tela pra voltar a "Todos". Único jeito de sair: recarregar a página (perde nada, mas é beco sem saída na UI). | Encaminhar 1 registro pra outro dentista, filtrar pelo nome dele, desfazer o encaminhamento (×) enquanto esse filtro está ativo. |

## Promoções 🟡 → ✅

Nenhuma. Ver "Não verificado" — cobertura real ficou abaixo do necessário pra promover, e os 2
achados acima bloqueiam R-04 Fase 3 e R-16 especificamente.

## O que foi verificado de verdade (não é achado, é confirmação)

- **R-02 Fase 1 (card único, I1/I2):** criei 3 registros de tipos diferentes (Canal/endodontia,
  Implante, Coroa total) no paciente Marcos via lançamento manual (perfil do dente). O card do
  rascunho é **literalmente** o mesmo `RegistroCard` da ficha salva — observação editável (digitei
  "Lima K 25", não colapsou o card, confirmando o fix de `stopPropagation` no teclado), toggle de
  status local sem chamada ao servidor (Planejado ⇄ Realizado instantâneo), `EndoForm` expansível
  dentro do card, autor/CRO corretos ("Mateus Teixeira · CRO-SP 5555"), remoção. **Símbolos**
  conferidos ao vivo: canal (contorno vermelho), implante (parafuso/cone), coroa (hachura
  diagonal) — todos batem com o catálogo revisado. **Persistência** confirmada por reload completo
  (não só sucesso otimista na tela).
- **R-04 Fase 3 (encaminhar em lote):** o botão "Encaminhar" aparece no cabeçalho da consulta;
  modo seleção liga com checkbox nos cards elegíveis; em mobile a barra completa funciona
  ("1 selecionado", "Selecionar tudo", avatar "TR" = Dra. Teste R04, "Encaminhar 1"); o
  encaminhamento **gravou de verdade** (badge "Dra. Teste R04" sobreviveu a reload completo). O ×
  de desfazer (`aria-label="Remover encaminhamento a Dra. Teste R04"`) está presente e, ao clicar,
  o estado muda imediatamente (responsáveis recalculados) — não consegui confirmar a
  **persistência** do desfazer após reload por um travamento de ambiente (abaixo).
- **R-16 (filtro por responsável):** os 3 chips (Todos/Meus/[Dra. Teste R04]) apareceram só depois
  de existir >1 responsável, exatamente como especificado. Testado via `getComputedStyle` (cor de
  fundo do chip ativo) + contagem de `<article>` visíveis, não por leitura visual de screenshot:
  - **Todos** → 3 cards.
  - **Meus** → 2 cards (Implante, Coroa) — o Canal encaminhado **sumiu**, mesmo eu sendo o autor.
  - **Dra. Teste R04** → 1 card (só o Canal).

## Não verificado

- **62 rotas do sistema** — esta auditoria cobriu só 1 fatia (Pacientes → Ficha), por decisão
  deliberada de escopo, não por atalho.
- **Light mode** para R-02/R-04/R-16 — o browser entrou em dark mode no meio da sessão (clique
  acidental ou preferência de sistema) e não voltei a testar claro depois. Os achados 1 e 2 não
  dependem de tema, mas o restante da varredura visual (contraste, tokens) não foi feito em claro.
- **Mobile visual completo** — só a `EncaminharBar` foi confirmada funcional em mobile; não rodei
  o resto do checklist visual (alvo de toque, overflow) nas telas do R-02/R-16 nesse viewport.
- **Persistência do des-encaminhar (#7) após reload** — cliquei, vi o estado mudar (chips
  recalculados corretamente na hora), mas não consegui confirmar com reload: o ambiente travou
  numa tela de skeleton depois disso (servidor respondia 200 com render real, ~1.6s — não é bug de
  app, é composição client-side do browser pane parado/ocluso, limitação já registrada em memória
  desta sessão). Tentei: reload simples, restart do dev server, aba nova — os três travaram igual.
  **Risco de o bug ser real é baixo** (a ação já é a mesma `encaminharProcedimento` com
  `dentistaDestinoId: null`, testada e verificada com 2 contas em 23/07), mas não é confirmado.
- **R-02 Fase 3 (alicerce `buscarGruposAbertos`)** — não tem UI nenhuma pra clicar (deliberado,
  ver spec); só dá pra verificar pelos testes unitários já rodados, não pelo browser.
- **Fase 5 do protocolo (duas contas simultâneas, ID de outra clínica na URL, rota sem sessão)** —
  não rodada nesta sessão. A conta "Dra. Teste R04" existe e apareceu corretamente como destino
  elegível, mas eu não cheguei a logar com ela pra testar o lado dela (ver a notificação, marcar
  como realizado, tentar agir em registro de outro autor).
- **Endpoints (`route.ts`, 33 no total)** — nenhum testado nesta fatia.

## Cobertura

| Rota | Técnica | Visual | Papéis testados |
|---|---|---|---|
| `/dashboard/pacientes/[id]` (ficha do Marcos) | Sim — criação, save, reload, encaminhar, filtro | Parcial — só dark, só desktop+mobile parcial | Só Mateus (autor); "Dra. Teste R04" não logada |

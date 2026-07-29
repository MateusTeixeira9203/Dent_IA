# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-29 · **Ativo:** nenhum — 4 itens fechados nesta sessão ·
> **Modo da próxima:** o Mateus escolhe (sinalizou R-10 e R-03c).
> Handoff: `handoffs/handoff-2026-07-29-0200.md`.

## Agora

**Sem item ativo.** A sessão fechou quatro — **R-11** (gate #6 com 2 contas), **R-05b** (atalho de
manutenção orto), **R-08a** (exame periodontal vira registro) e **R-08b** (rastreio PSR) — mais 4
correções `/pontual`.

**No ar e verificado em produção** (`dentia.app.br`, deploy `dpl_3pkPtEA`): R-11, R-05b, R-08a e 3
dos 4 pontuais, conferidos por clique real.

**R-08b ainda não subiu.** Commitado (`196435c`) e verificado em localhost — 10 casos puros da
`concluirPSR` + save/reload/conferência no banco — mas o deploy é anterior a ele. **Falta push.**

**Ressalva honesta:** o badge **"Quitado"** teve a lógica provada por busca de casos reais de drift
de float, mas **nunca foi visto na tela** — a clínica de teste não tem orçamento pago. É o único
ponto da sessão sem confirmação visual.

## Travado

**Nada travado.** Constraints de sempre: banco é prod (dev=prod), escrita em prod pede confirmação
e mudança de RLS pede teste com 2 contas.

Aprendizado de ferramenta pra próxima: quando o browser pane devolver `document.hidden=true` e
screenshot com timeout, **ler a mensagem de erro** — se diz *"the Browser pane is not displayed"*,
é o painel fechado do lado do usuário, não o bug recorrente de Suspense. Basta pedir pra abrir.

## Esperando você

- [ ] **Push do R-08b** (`196435c`) — 1 commit à frente do origin.
- [ ] **Disposição das chips de rotina na ficha** — você decidiu perguntar aos outros dentistas
      amanhã antes de mexer. Meu dado dizia pra não promover (rotina em 12,5% das fichas contra
      odontograma em 100%), mas são 24 fichas de 1 semana contra anos de cadeira deles.
      **Independente da opinião deles:** `Q1–Q4` existe **duas vezes** no formulário (chips
      "Região" v1 texto-livre × chips de raspagem v2 estruturado) — mesmo rótulo, mesmo desenho,
      tabelas diferentes, e **nenhum dos dois nunca foi usado** (0 de 73 fichas / 0 eventos).
      Vira item ou espera a conversa?
- [ ] **Ver o badge "Quitado"** numa clínica com orçamento pago.
- [ ] **`procedimentos_concluidos`** — decisão aberta desde o R-11 (escrito direto do client, fora
      de qualquer spec). Não bloqueou o fechamento.
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md)) —
      **P1** coroa por hachura vs. circunferência; **P3** legenda sem glifo explicado. Ligados ao
      R-22, congelado.

## Próximo da fila

Você sinalizou **R-10** e **R-03c**:

- **R-10** — só falta o **P2**: tirar a observação clínica do documento que o paciente lê. Precisa
  de decisão sua, porque `dentes_observacoes` alimenta orçamento **e** prontuário.
- **R-03c** — **G, sem spec.** As decisões já estão travadas (bloqueia e oferece "Revisar"; começa
  pelo R-03c-1 = aceite assinado + snapshot). A investigação achou 5 caminhos que aprovam
  orçamento (4 sem dentista nenhum) e que `ON DELETE CASCADE` deixa apagar a prova em 2 cliques.
  Falta escrever a spec do R-03c-1.

Fila completa no `ROADMAP.md` (9 itens · 22 concluídos · 1 congelado).

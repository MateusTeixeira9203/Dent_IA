# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-28 · **Ativo:** nenhum — R-03a/R-03b fechados e no ar,
> R-11 no ar aguardando verificação · **Modo da próxima:** o Mateus escolhe.
> Handoff: `handoffs/handoff-2026-07-28-0120.md`.

## Agora

**Sem item ativo.** A sessão fechou três: **R-11** (unificar gravação da ficha), **R-03a**
(assinatura — modelo/backend) e **R-03b** (assinatura — captura nos 3 fluxos). Todos no ar em
`dentia.app.br` (deploy confirmado READY, commits `1de02c4`..`0b1d4ff`).

**R-03a + R-03b: ✅ verificados.** O Mateus testou ao vivo em produção real — os 3 fluxos de
captura (ficha rápida, recepção, fim de consulta) + autorização com 2 contas (autor assina,
não-autor falha, secretária consegue). Migrations 111/112 aplicadas em prod, advisor de
segurança limpo.

**R-11: 🟡 no ar, não verificado.** A verificação que rodei foi ao vivo, mas **antes do push**
(build local). Falta:
- **Teste de autoria com 2 contas** — apagar ficha de outro dentista (deve rejeitar) e apagar
  como admin (deve permitir). Não rodou em nenhuma sessão ainda.
- **`procedimentos_concluidos`** — achado durante a execução: `PendenciasTab.tsx` e
  `paciente-detail-client.tsx` escrevem essa coluna direto do client, fora do escopo de
  qualquer spec (nem R-11 nem R-03 cobrem). Decisão do Mateus se vira item.

## Travado

**Nada travado.** Constraints de sempre: banco é prod (dev=prod), então escrita em prod pede
confirmação explícita e mudança de RLS/permissão pede teste com 2 contas logadas. O pane do
browser embutido tem um bug recorrente nesta sessão (`document.hidden=true` mesmo em foco,
`screenshot`/fetches gated travam) — verificação de UI ao vivo, quando o pane não coopera, é
o Mateus testando direto e eu conferindo pelo banco depois.

## Esperando você

- [ ] **Testar R-11 com 2 contas** (dentista apagando ficha de outro, admin apagando qualquer
      uma) pra promover 🟡 → ✅.
- [ ] **`procedimentos_concluidos`** — vira item próprio ou fica como está?
- [ ] **Escolher o próximo item** — nada na fila tem spec pronta: **R-03c** (aceite de
      orçamento, reusa a tabela `assinaturas`), **R-08** (periograma) e **R-09** (voz nas
      especialidades) precisam de escopo antes de código.
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md)) —
      **P1** a coroa usa hachura (convenção anglo) e a norma latina usa circunferência envolvendo a
      coroa; **P3** a legenda explica só cores, nenhum glifo é explicado. Ligados ao R-22, congelado.
- [ ] *(sugestão, decisão sua)* no R-22 há 1 fix de 1 linha (`globals.css:267` — o corpo do app
      renderiza em Times, não Outfit) — candidato a `/pontual` a qualquer momento, alto ganho.

## Próximo da fila

Fila em `ROADMAP.md` (9 itens · 18 concluídos · 1 congelado). Nenhum item tem spec pronta agora
— R-03c, R-08 e R-09 precisam de escopo antes de código. O mais imediato, porém, não é da fila:
é fechar o R-11 (teste de 2 contas).

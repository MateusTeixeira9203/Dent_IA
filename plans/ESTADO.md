# Estado — 2026-08-09 (sessão #34, pausada 04:48)

## Agora

**🔵 R-92 — Fechar para cobrar** ([spec](specs/R-92-fechar-para-cobrar.md)), semana **10–16/08**.
Decisão dele: em vez de fechar a lista inteira que ele trouxe (~2 meses), fechar só o que
destrava **cobrar** — depois que eu passei o produto pelo checklist do playbook de lançamento
dele e achei: **5 clínicas em `trial` com `trial_ends_at` NULL, `status_assinatura='ativo'`
nunca existiu no banco, checkout nunca processou pagamento, zero analytics no projeto.** Meta
dele é 100 pagantes em 2026 — hoje é 0.

**Feito:**
- 5 commits antigos (R-85/R-86/R-65/R-66 + docs #33) subiram pro `origin/main`.
- **Dia 1 — 🟡 codado, não testado ao vivo, não commitado.** Typecheck+build limpos. R-90
  corrigido (`registrarRecebimento` grava `dentista_id`), atalho "Registrar Dinheiro" (1
  clique) plugado no modal do orçamento, default de pagamento `pix`→`dinheiro` (5 lugares),
  carinha do Dex (`DexMark`) no lugar do "D" hardcoded em `voice-ux.tsx`.
- **Dia 2 — parcial.** Contradição "7 dias" × "14 dias" corrigida na landing (3 CTAs → 14).
  Placar mínimo (PostHog) **fora do escopo** — ele decidiu não usar ferramenta de analytics
  por enquanto, depois de eu explicar a consequência (sem isso, G3 da spec não tem como fechar
  esta semana).
- **`excluirPagamento` decidido e corrigido.** Testei ao vivo simulando a RLS de outro
  dentista contra um pagamento fabricado — a suspeita de "mesma classe do R-66" não se
  confirmou (SELECT e DELETE de pagamentos usam a mesma policy, sempre concordam). Corrigido
  como defesa em profundidade (confere `count` do delete), não como fix de vulnerabilidade
  ativa. Ver `plans/ROADMAP.md`.

**Falta (pausado aqui, a pedido dele):**
- Testar o Dia 1 ao vivo e commitar.
- **O preço** — só ele decide, trava `lib/planos.ts` e o Dia 3 (checkout).
- Momento de valor/TTV — definição simples, sem instrumentação.
- Dias 3–6 do plano (checkout real, Mom Test com as 3 clínicas, cobrar, mobile se couber).

**R-88 (landing) voltou pra ⏳** — só deve ser escrita depois do que os 3 primeiros pagantes
ensinarem, não com a suposição de hoje.

## Travado

**O preço.** Ele mandou ignorar o R$249/R$179 atual, novo número não fechado. Mercado
levantado: Simples Dental (60k dentistas) vende voz+IA no plano de R$149,90 **com app**; faixa
geral R$39,90–349,90.

**Confirmar que a cobrança das 3 clínicas atuais é por conversa + link, nunca paywall
automático** — apliquei essa premissa preventivamente (Clindent é dado real de terceiro, 302
pacientes), ele ainda não confirmou explicitamente.

## Esperando você

- [ ] **Logar e testar o Dia 1 do R-92** (Teste01, nunca Império/Clindent) — só assim vira
      commit.
- [ ] **Definir o preço** — trava o resto da semana.
- [ ] Testar pessoalmente R-85/R-86/R-65/R-66 (herdados do #33, ainda 🟡).
- [ ] Gate de 2 contas (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — 10 dias parado, precisa dele
      logado nas contas Paula/Renato/Gabriel/secretária.
- [ ] `templates/spec.md` apareceu modificado no working tree sem eu ter tocado — origem
      desconhecida, sinalizado no handoff, não revertido.

## Próximo da fila

Depois do R-92 fechar (ou no que sobrar da semana): mapa de atrito
[rodada 2](auditorias/2026-08-09-mapa-de-atrito-2.md) e
[rodada 3](auditorias/2026-08-09-mapa-de-atrito-3-recontagem.md) têm achados soltos sem item
próprio ainda — R-90/R-91 já viraram item no ROADMAP, o resto (item 7 do campo mágico, "quem
faltou" com número pior) segue só documentado. Ver `plans/ROADMAP.md`.

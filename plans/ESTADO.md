# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-28 · **Ativo:** nenhum — R-03a/R-03b fechados, falta push ·
> **Modo da próxima:** o Mateus escolhe. Handoff: `handoffs/handoff-2026-07-27-1730.md`.

## Agora

**R-03a + R-03b — assinatura por procedimento — codados e verificados ao vivo, aguardando push.**
Migration 111 (tabela `assinaturas`, trigger `trg_odontograma_evento_imutavel`, RPC
`assinar_procedimentos`) + 112 (fix de search_path achado pelo advisor) já **aplicadas em prod**
(Supabase). Os 3 fluxos legados de assinatura (ficha rápida, recepção/secretária, fim de consulta)
migrados pro caminho granular — `assinarTodosRealizadosDaFicha` (gesto padrão, 1 clique) +
`AssinarBar` (seleção de subconjunto, só na ficha rápida). Caminho legado (ficha sem evento)
inalterado. Mateus testou ao vivo: os 3 fluxos + autorização com 2 contas (autor assina, não-autor
falha, secretária consegue). Achado durante a execução: apagar ficha com evento assinado também
ficava bloqueado (efeito do trigger no cascade) — confirmado como comportamento correto (protege
prova clínica), `deletarFicha` (R-11) ganhou mensagem clara pros dois casos (evento assinado e
ficha legada assinada).

**Falta:** push (migrations já estão em prod, só o código local falta subir).

**R-11 segue 🟡 (no ar, não verificado)** — sem mudança desde a última sessão: falta teste de
autoria com 2 contas (apagar ficha de outro dentista / como admin) e decisão sobre
`procedimentos_concluidos` (achado fora do escopo da spec).

## Travado

**Nada travado.** Constraints de sempre: banco é prod (dev=prod), então escrita em prod pede
confirmação explícita e mudança de RLS/permissão pede teste com 2 contas logadas; o pane embutido
não renderiza a ficha logada — verificação de UI é por harness Playwright ou browser com sessão
real do Mateus.

## Esperando você

- [ ] **Decidir sobre o push do R-03a/R-03b** — migrations já em prod, código local testado e
      aprovado; falta só empurrar.
- [ ] **Testar R-11 com 2 contas** (dentista apagando ficha de outro, admin apagando qualquer
      uma) pra promover 🟡 → ✅.
- [ ] **`procedimentos_concluidos`** — vira item próprio ou fica como está?
- [ ] **Escolher o próximo item** — nada com spec pronta ainda: **R-03c** (aceite de orçamento),
      **R-08** (periograma) e **R-09** (voz nas especialidades) precisam de escopo antes de código.
- [ ] **Símbolos: 2 decisões abertas** ([auditoria](auditorias/2026-07-27-simbolos-odontograma.md)) —
      **P1** a coroa usa hachura (convenção anglo) e a norma latina usa circunferência envolvendo a
      coroa; **P3** a legenda explica só cores, nenhum glifo é explicado. Ligados ao R-22, congelado.
- [ ] **O que é "ficha rápida" pra você** (aberta desde 26/07) — a criação viva é o "Nova Evolução"
      do FichasTab; as rotas antigas `/dashboard/fichas/{nova,[id]}` foram apagadas no R-11 Fase 0
      (eram redirect pra 404). A pergunta em si segue aberta — fecha o diagnóstico do "Dex fora do ar".
- [ ] *(sugestão, decisão sua)* no R-22 há 1 fix de 1 linha (`globals.css:267` — o corpo do app
      renderiza em Times, não Outfit) — candidato a `/pontual` a qualquer momento, alto ganho.

## Próximo da fila

Fila em `ROADMAP.md` (9 itens · 18 concluídos · 1 congelado). Nenhum item da fila tem spec
pronta agora — R-03c, R-08 e R-09 precisam de escopo antes de código.

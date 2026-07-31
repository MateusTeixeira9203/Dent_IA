# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-30 23:15 · sessão #7
> **Item ativo:** R-39a · **Modo da última sessão:** execução

## Agora

**R-39a — Orçamento e dinheiro: esqueleto único** · 🔵 ativo desde 30/07
Spec: `plans/specs/R-39-orcamento-dinheiro-esqueleto-unico.md` (fase: contrato, sub-item
R-39a aprovado)

**Objetivo:** tela de criar e tela de orçamento criado com o mesmo esqueleto —
procedimentos à esquerda, coluna do dinheiro à direita, sem diálogo aninhado para
registrar pagamento.

### Feito
- [x] `detalhe-orcamento-modal.tsx` e `novo-orcamento-modal.tsx` reescritos, aprovados por
      ele em localhost após 3 rodadas de ajuste
- [x] `aceite-orcamento-modal.tsx` — bug pré-existente de altura corrigido (cortava em
      notebook real), erro de validação agora limpa ao digitar
- [x] PDF e WhatsApp adiantados do R-33 pro rodapé do R-39a, a pedido dele
- [x] Bug real achado e corrigido na rota do PDF (FK ambígua fazia devolver 404 sempre)
- [x] Tudo acima testado ao vivo em localhost com dado real (não só typecheck)

### Falta
- [ ] **Commit e push** — 9 arquivos modificados, nada commitado desde o push das ~21h
- [ ] Confirmação visual do mobile (empilhamento confirmado por DOM, largura não —
      rede do sandbox caiu no meio do teste)
- [ ] Gate de 2 contas (G9 da spec)
- [ ] R-39b (aceite no esqueleto novo + coluna "Pago" na lista) e R-39c (funil) — não iniciados

## Travado

Nada travado por código.

## Esperando você

- [ ] **Sinal pra commitar e subir o R-39a** (+ fix da ficha duplicada, pendente da sessão
      anterior).
- [ ] **[Gate de 2 contas](auditorias/2026-07-30-gate-2-contas.md)** — ainda não rodado.
- [ ] **R-40: qual contrato?** Termo de consentimento clínico ou contrato de prestação.
- [ ] **R-38: aprova a spec?** Já relida, alinhada com seu pedido mais recente (total ou
      parcela, nunca preço por item). Dependências (R-34, rota do PDF) prontas — falta só
      seu sinal pra codar. Migration pequena, mas mexe no snapshot do aceite.
- [ ] **Bug de FK ambígua em `agendamentos`** — mesmo padrão do bug do PDF, confirmado
      acontecendo ao vivo em pelo menos 3 arquivos (`get-patient-workspace-data.ts`,
      `get-visible-timeline-events.ts`, `prontuario/route.ts`). Conserto é mecânico e
      barato — decidir se vira item (tipo o R-43) ou se corrijo direto na próxima sessão.

## Próximo da fila

R-39a (commit) → gate de 2 contas → R-39b/R-39c → depois Bloco 1 (ficha: atrito e
navegação). Fila completa no [ROADMAP](ROADMAP.md).

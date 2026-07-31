# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-07-31 11:10 · sessão #8
> **Item ativo:** nenhum · **Modo da última sessão:** execução

## Agora

Nenhum item em código no momento — a sessão #8 fechou **4 itens inteiros** (R-38, R-39b,
R-31a, R-41), todos codados, testados ao vivo e commitados. A bola está com você: push,
gate de 2 contas, e algumas decisões pequenas (ver "Esperando você").

### Feito nesta sessão
- [x] **R-38** — orçamento sem preço por item no PDF. Migration 124 aplicada, toggle no
      rodapé, snapshot do aceite confirmado gravando o flag certo
- [x] **R-39b** — aceite visual alinhado + coluna "Pago" em `/dashboard/orcamentos`
- [x] **R-31a** — previne duplicata de paciente (as 4 partes: seleção, busca sem acento,
      aviso de nome, CPF único). 2 bugs reais achados e corrigidos testando ao vivo
- [x] **R-41** — item novo (mapeado e codado na mesma sessão): editar paciente ganhou
      CPF, nascimento e responsável de menor — fecha a lacuna do cadastro rápido
- [x] 8 commits organizados (nenhum misturando assuntos — 4 arquivos que tocavam 2
      itens cada foram separados por reconstrução manual)

### Falta
- [ ] **Push de tudo** — 8 commits locais, nada no remoto ainda
- [ ] Gate de 2 contas (cobre R-29/R-32/R-34 — ainda não rodado, precisa do seu login)
- [ ] R-31a G3 (seleção no toque, celular real) e G5 (toast do cadastro rápido não
      renderizou em nenhuma tentativa — ver handoff, pode ser ambiente ou bug real)
- [ ] R-39c (funil no Financeiro) — não iniciado, mas a spec já ganhou o contrato da
      Receita Prevista (§5.4) pronto pra quando começar

## Travado

Nada travado por código. O toast do R-31a G5 (aviso de duplicata no cadastro rápido via
agendamento) não apareceu na tela em nenhum teste — a lógica em si foi confirmada correta
(paciente não duplicou quando devia bloquear), mas não consegui ver o toast renderizar
mesmo com servidor reiniciado do zero. Não travou o trabalho, só ficou sem confirmação
visual. Ver handoff de 31/07 pra hipóteses.

## Esperando você

- [ ] **Sinal pra dar push** nos 8 commits desta sessão (R-38, R-39b, R-31a, R-41, fix
      do R-44 parcial, migrations 124-126).
- [ ] **[Gate de 2 contas](auditorias/2026-07-30-gate-2-contas.md)** — ainda não rodado.
- [ ] **R-40: qual contrato?** Termo de consentimento clínico ou contrato de prestação —
      ainda sem decisão.
- [ ] **R-44 — incluir as 2 telas extras agora?** Achei que `command-palette.tsx` e
      `atender-agora-modal.tsx` também têm busca sensível a acento (a spec do R-31a só
      previa 5 telas, são 7 reais). Não corrigi — pode ser dentro do R-44 (já é varredura
      dedicada) ou esperar.
- [ ] **R-45 (recall automático)** — você disse que ia mexer no WhatsApp amanhã de manhã.

## Próximo da fila

Depois das decisões acima: R-39c (funil, spec já pronta) ou Bloco 1 (R-31b depende do
R-31a estar no ar; R-41 acabou de destravar; R-29/R-30 esperam o mesmo gate). Fila
completa no [ROADMAP](ROADMAP.md).

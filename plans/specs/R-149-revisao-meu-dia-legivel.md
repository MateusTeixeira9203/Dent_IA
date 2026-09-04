# R-149 — Revisão legível no Meu Dia

> **SPEC (redesign)** · **R-149** · 🟡 no ar, aguarda verificação visual
> **Aberto:** 2026-09-02 · **Fase:** aprovada
> **Rota:** `/dashboard/meu-dia` · **Alvo:** `NestaSessaoBloco` + `RegistroCard`

## 1. Problema

Na revisão do atendimento, o procedimento pode truncar e compete visualmente com aviso, três
estados e ações secundárias. Em uma lista com vários registros, o dentista demora para identificar
o que será executado e o seu estado.

## 2. Decisão aprovada

Cada cartão preserva todas as ações atuais, mas passa a ter três faixas de leitura:

1. **Identidade:** nome completo do procedimento e localização clínica.
2. **Decisão:** controle visível `A fazer | Próxima sessão | Realizado`; aviso de revisão fica
   abaixo do nome, somente quando necessário.
3. **Ações secundárias:** `Detalhes` e `Remover` em faixa discreta; `Encaminhar` continua ação de
   lote no cabeçalho do painel.

`Condições existentes` segue separada e tem contraste menor por ser informativa, não uma tarefa.

## 3. Contrato funcional

- Não alterar `OdontogramaEventoDraft`, status, IDs, server actions, regras Dex, salvamento,
  encaminhamento, orçamento ou RLS.
- `A fazer`, `Próxima sessão` e `Realizado` continuam clicáveis individualmente e mantêm teclado,
  foco, loading e desfazer em lote já existentes.
- `Editar detalhes` abre o mesmo detalhe especializado atual; `Remover` mantém confirmação e
  comportamento atuais.
- Nome e localização não devem ser truncados na largura desktop da bancada; em telas estreitas,
  quebram em até duas linhas antes de qualquer controle ser ocultado.
- Sem evento, a mensagem vazia atual não muda. Cartão sem alerta não reserva a linha do aviso.

## 4. Referência visual

- **Artefato:** `plans/artefatos/R-149-revisao-meu-dia-legivel.html` (a gerar e aprovar).
- Usa os tokens existentes: `bg-surface`, `bg-surface-alt`, `text-text-primary`,
  `text-text-secondary`, `border-border`, `text-teal-ink`, `text-coral` e `text-warning`.
- Espaçamento: cartão 12px vertical/14px horizontal; identidade → decisão 10px; ação secundária
  8px acima da borda inferior. Não criar rolagem interna adicional.

## 5. Gates de aceite

1. Com 1, 5 e texto de procedimento longo, o título e a localização são legíveis sem elipse na
   bancada desktop.
2. Os três status permanecem visíveis e alteráveis em cada cartão.
3. `Detalhes`, `Remover`, `Encaminhar` e alteração em lote continuam acessíveis.
4. Tema claro e escuro preservam contraste; teclado alcança os controles na ordem identidade →
   status → ações.
5. Nenhum payload, chamada de servidor ou resultado clínico muda em relação ao layout atual.

## 6. Fora de escopo

Não muda a organização de Histórico/Pendências, regras de “próxima sessão”, nem o fluxo de Ficha.

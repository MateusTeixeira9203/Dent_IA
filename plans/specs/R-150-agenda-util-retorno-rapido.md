# R-150 — Agenda útil e retorno rápido

> **SPEC** · **R-150** · 🔵 ativo
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** aprovada pelo pedido de execução

## 1. Problema

O retorno não oferece atalhos de 7 e 15 dias. A Agenda principal ainda desenha domingo, embora
a rotina solicitada seja de segunda a sábado. A regra de expediente já existe no servidor, mas
não possui teste de unidade. Por fim, um dente ausente precisa continuar elegível para iniciar a
ponte fixa no fluxo de seleção única.

## 2. Decisão

- Retorno desktop ganha chips `7 dias` e `15 dias`, ao lado dos saltos já existentes; todos partem
  de hoje.
- A grade semanal e o calendário mensal da Agenda exibem somente segunda a sábado. Dia domingo não
  pode ser escolhido pelos controles normais da Agenda; registros antigos não são apagados nem
  alterados por esta mudança.
- O fluxo de ponte fixa deve estar disponível com exatamente um dente permanente selecionado,
  inclusive quando aquele dente tem o estado `ausente`. A escolha de papéis continua explícita no
  mini-fluxo; esta fatia não inventa nova validação protética.
- O expediente permanece um **aviso com confirmação**, não bloqueio: sem grade não há restrição;
  antes/depois/intervalo de almoço/dia sem grade retornam motivo tipado.

## 3. Objetivo

Reduzir escolhas repetitivas no retorno e limitar a navegação operacional ao calendário de
segunda a sábado, sem remover dados históricos ou endurecer a flexibilidade da recepção.

## 4. Contrato técnico

```ts
// src/components/pacientes/retorno-semana-grid.tsx
type SaltoRetorno = { label: '7 dias' | '15 dias' | string; alvo: (hoje: Date) => Date };

// src/lib/agenda/expediente.ts
type ForaDoExpediente =
  | { fora: false }
  | { fora: true; motivo: 'antes_de_abrir' | 'depois_de_fechar' | 'no_almoco' | 'dia_sem_grade' };
```

`WeekView`, o cálculo de `calendarDays` e `MonthView` recebem/produzem somente dias cujo
`getDay()` é de 1 a 6. `janelaDaVisao('semana')` inicia na segunda-feira e termina na segunda
seguinte, preservando a janela BRT e a assinatura existente.

## 5. Comportamento

| Cenário | Resultado |
|---|---|
| Clicar `7 dias` ou `15 dias` | Navega a grade do retorno para a semana correspondente, sem selecionar horário automaticamente. |
| Semana/Mês da Agenda | Mostram segunda a sábado; domingo não aparece como coluna, cabeçalho ou célula selecionável. |
| Dente ausente selecionado | A faixa de ação única mostra `Ponte fixa`; o clique abre o mesmo fluxo de pilares/pônticos. |
| Horário 12:00 em almoço 11:00–13:30 | Action devolve `foraDoExpediente: 'no_almoco'`; a UI oferece confirmar mesmo assim. |
| Dentista sem qualquer grade | Action não devolve aviso nem bloqueio. |

## 6. Referência visual

Sem tela nova. Reutiliza os tokens e componentes atuais: chips do retorno com `border-teal`,
`text-teal-ink`, `bg-surface`; Agenda com `bg-surface`, `bg-surface-alt`, `border-border` e os
alvos de toque existentes. Não há artefato visual para esta correção incremental.

## 7. Invariantes

1. Nenhum agendamento, bloqueio ou horário configurado de domingo é apagado ou migrado.
2. Agenda livre continua sem restrição quando o dentista não configurou expediente.
3. Só o servidor decide conflito e expediente; a grade de retorno é auxiliar de seleção.
4. Ponte em dente ausente não altera o estado de ausência nem cria evento antes de `Confirmar ponte`.

## 8. Gates de aceite

- [ ] O retorno desktop mostra e navega por `7 dias` e `15 dias`.
- [ ] Agenda semanal e mensal não exibem domingo; segunda a sábado continuam navegáveis.
- [ ] Selecionar um dente ausente permanente mantém o CTA `Ponte fixa` disponível e abre o fluxo.
- [ ] Testes unitários cobrem expediente dentro, antes, almoço, após fechar, dia sem grade e sem
  grade configurada.
- [ ] Criar e editar continuam recebendo o mesmo aviso recuperável de expediente.
- [ ] TypeScript, testes do recorte e `git diff --check` passam.

## 9. Fora de escopo

- Alterar expediente configurado pelo dentista, criar bloqueio permanente de domingo ou apagar
  agendamentos legados.
- Redesenhar a Agenda, a grade do retorno ou a semântica clínica da ponte fixa.

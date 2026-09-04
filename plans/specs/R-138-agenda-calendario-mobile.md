# R-138 — Agenda calendário no celular

> **SPEC (redesign)** · **R-138** · 🟡 publicada; validação em dispositivos pendente
> **Aberto:** 2026-08-27 · **Fechado:** — · **Fase:** aprovada pela direção registrada nesta conversa

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Agenda — visões Dia e Semana; Novo agendamento |
| **Tipo** | redesign de tela existente, sem mudança de regra |
| **Rota** | `/dashboard/agendamentos` |
| **Arquivos envolvidos** | `week-view.tsx`, `day-view.tsx`, `agendamentos-client.tsx` |

## 1. Estado atual

No celular, `WeekView` e `DayView` trocam a grade horária existente no desktop por listas de
cards. Isso esconde os intervalos vazios e impede panorama do dia/semana. O Dialog de Novo
agendamento mantém o rodapé fixo, mas organiza os campos em uma única sequência longa no mobile.

## 2. O que NÃO pode mudar — trava de segurança

- [x] Nomes de campos e variáveis
- [x] Funções e regras de negócio
- [x] Chamadas de API / endpoints
- [x] Estrutura do banco / modelo de dados
- [x] Fluxo de navegação e ações de criar, confirmar, cancelar ou editar

## 3. O que eu quero

> Direção registrada do usuário em 27/08/2026: no celular, usar o mesmo calendário já existente
> no computador para Dia e Semana; permitir olhar a semana inteira e os horários vazios/ocupados.
> A alteração deve ser leve e caber na tela. A confirmação do agendamento precisa continuar
> alcançável no celular.

## 4. Contrato visual e funcional

- Dia: porta a grade horária existente, com coluna de horas e blocos ocupados; não vira lista.
- Semana: porta as sete colunas existentes, compactando apenas gutter, cabeçalho e texto dos
  blocos no celular. Cada dia tem ao menos 44 px e a grade pode rolar verticalmente; a navegação
  semanal permanece fora da área que rola.
- Um toque no intervalo vazio abre o Novo agendamento com data/hora já preenchidas. Um toque no
  bloco ocupado preserva a abertura do detalhe atual.
- O rodapé do Novo agendamento continua sempre visível; a confirmação e o cancelamento não ficam
  atrás do teclado nem exigem chegar ao final do formulário.
- Reusa `WeekView`, `DayView`, `calcularFaixas`, `STATUS_CONFIG` e actions atuais. Sem nova query,
  schema, migration ou mudança de autorização.

## 5. Referência visual

- **Artefato:** `plans/artefatos/R-138-agenda-calendario-mobile.html`
- **Tokens:** `bg-surface`, `bg-surface-alt`, `border-border`, `text-text-primary`,
  `text-text-secondary`, `teal`, `teal-dark`; alvo de toque mínimo `44px`; raio `rounded-xl`.
- A semana compacta prioriza o mapa de ocupação; nome do paciente pode truncar no bloco estreito,
  mas data, hora e status continuam acessíveis pelo toque no bloco.

## 6. Gates de aceite

- [ ] Em 360, 390 e 412 px, Dia e Semana exibem grade horária — não lista de cards.
- [ ] Semana mostra todos os sete dias, horas e blocos ocupados sem corte; as áreas tocáveis de
  cada dia têm pelo menos 44 px.
- [ ] Tocar intervalo vazio preserva data/hora e abre Novo agendamento; tocar evento abre detalhe.
- [ ] Novo agendamento mantém Salvar e Cancelar alcançáveis com teclado aberto.
- [ ] Desktop preserva exatamente a grade e as ações existentes.
- [ ] Light/dark, typecheck, lint, build e QA em clínica de teste passam.

## 7. Fora de escopo

- Marcar retorno e sua grade específica (R-137).
- Regras de disponibilidade, conflito, expediente, agenda livre, protético, banco ou RLS.

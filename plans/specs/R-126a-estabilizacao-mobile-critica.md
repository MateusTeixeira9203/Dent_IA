# R-126a — Estabilização mobile crítica

> **SPEC** · **R-126a** · 🔵 ativo
> **Aberto:** 2026-08-23 · **Fechado:** — · **Fase:** aprovada
> **Escopo:** agenda, retorno, novo agendamento/protético, orçamento e cards da ficha em telas menores que `sm`.
> **Migration:** nenhuma.

## 1. Problema

Os fluxos operacionais em produção ainda renderizam estruturas de desktop em largura de celular:
agenda semanal recortada, retorno sem ação acessível, orçamento em duas colunas e cards da ficha
com conteúdo esmagado. Isto impede uso real do PWA e aumenta o risco de erro clínico.

## 2. Decisão

Desktop não muda. Em `max-width: 639px`, cada fluxo usa composição vertical própria; não se
tenta encolher grades e colunas de desktop. Nenhum gesto de arrastar será exigido para concluir
retorno: tocar em data/horário e confirmar é o contrato.

## 3. Objetivo

Um dentista ou secretária conclui cada fluxo com uma mão, sem zoom horizontal, texto cortado ou
CTA fora da área alcançável.

## 4. Contrato técnico

| Superfície | Arquivo-fonte | Contrato mobile |
|---|---|---|
| Retorno | `components/pacientes/marcar-retorno-modal.tsx` | `DialogContent` ocupa viewport segura; cabeçalho/resumo em uma coluna; seletor de dentista continua quando necessário; data e hora são controles móveis; CTA fica em rodapé `sticky`. |
| Grade de retorno | `components/pacientes/retorno-semana-grid.tsx` | A grade semanal segue disponível somente em `sm+`. Mobile exibe um dia por vez, navegação anterior/próximo, horários livres em lista tocável. `onSelecionar(data, minuto)` permanece a única API. |
| Agenda | `app/dashboard/agendamentos/_components/*view.tsx` | Em mobile, Dia é o padrão operacional e vira linha do tempo de uma coluna; Semana/Mês permanecem opções de navegação, sem cortar colunas. Criar agendamento e atender agora ficam alcançáveis antes da grade. |
| Novo agendamento | `agendamentos-client.tsx` | Formulário vira folha vertical, com ação salva fixa. "Enviar para o protético" é acordeão na mesma coluna; ao abrir, protético, entrega e observação têm largura total e ordem estável. |
| Novo orçamento | `orcamentos-client.tsx` | Dialog deixa de usar `width: 58vw`, deslocamento `left` e layout de duas colunas no mobile. Campos/itens são uma coluna; resumo compacto e CTA formam rodapé sticky. Em `sm+`, conserva a divisão atual. |
| Registros da ficha | `components/pacientes/FichasTab.tsx` e componente de card já compartilhado | Card mobile mostra título e estado primeiro; ações e detalhes entram em segunda linha/recolhível. Nenhuma ação pode comprimir descrição em uma letra ou ocultar dados clínicos. |

Não há mudança em actions, dados de agendamento, validação de conflito, dados de pedido ao
protético, orçamento ou permissões. É apresentação e interação responsiva apenas.

## 5. Comportamento

### Retorno

1. Abrir retorno no celular mostra paciente, dentista (quando aplicável), data, hora e duração.
2. Tocar data e horário livre atualiza o resumo; editar a hora continua permitido.
3. "Marcar retorno" permanece visível no rodapé e envia o mesmo `MarcarRetornoForm` atual.
4. Horário ocupado, dentista ausente, validação e erro usam os estados atuais e continuam explícitos.

### Agendamento e protético

1. Abrir novo agendamento no celular rola o formulário dentro da folha, sem recorte lateral.
2. Ligar o toggle do protético expande a seção abaixo dele; desligar preserva a criação normal.
3. Os três requisitos atuais (protético, data de entrega, observação) continuam impedindo somente
   o pedido protético inválido, nunca a renderização do formulário.

### Orçamento e ficha

1. No orçamento, itens nunca ficam atrás do resumo nem botões entre resumo e itens.
2. Na ficha, título, dente, estado, material e ações continuam legíveis em 360px.
3. O mesmo dado e as mesmas actions do desktop são usados; só a hierarquia visual muda.

## 6. Referência visual

Usa tokens existentes (`bg-surface`, `bg-surface-alt`, `border-border`, `text-text-primary`,
`text-text-secondary`, `text-teal-ink`) e a linguagem do Dashboard/Tratamento. Motion só em
expansão de acordeão e troca de painel: 150–200ms, respeitando `prefers-reduced-motion`.

## 7. Invariantes

- I1: desktop (`sm+`) não perde grade, coluna ou ação existente.
- I2: mobile não exige arrastar, zoom, rolagem horizontal ou precisão de mouse para concluir ação.
- I3: nenhuma regra clínica/financeira muda por breakpoint.
- I4: CTA primário permanece alcançável sem atravessar uma grade completa.
- I5: encaminhamento ao protético nunca cria pedido parcial; validações atuais persistem.

## 8. Gates de aceite

- [ ] Em Android de 360–412px, marcar retorno com dentista, data, hora, duração e observação conclui sem scroll horizontal; botão fica visível.
- [ ] Agenda Dia, Semana e Mês não têm corte de colunas nem texto sobreposto; Dia é utilizável com uma mão.
- [ ] Abrir "Enviar para o protético" no novo agendamento exibe os três campos legíveis e cria o pedido ao salvar.
- [ ] Novo orçamento com três itens: todos os itens, total e "Criar orçamento" aparecem em ordem e sem sobreposição.
- [ ] Ficha com cinco registros: cada card conserva título e estado legíveis em 360px; nenhuma descrição vira coluna de letras.
- [ ] Desktop 1280px: retorno semanal, orçamento em duas colunas e formulário de agenda seguem funcionais como antes.

## 9. Fora de escopo

- Novo design completo da agenda ou da ficha.
- PWA/offline e performance de rede.
- Mudança no modelo de orçamento, protético ou retorno.

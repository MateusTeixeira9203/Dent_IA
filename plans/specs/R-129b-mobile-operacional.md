# R-129b — Mobile operacional: Agenda e modais

> **SPEC** · **R-129b** · fase **plano — aguardando execução**
> **Aberto:** 2026-08-24 · **Migration:** zero

## 1. Problema

Em celulares/tablets estreitos, Dia/Semana podem prender os horários inferiores. Novo
agendamento e orçamento ainda podem separar campos da ação ou criar duas rolagens.

## 2. Decisão

Até 767 px, Agenda usa a representação operacional móvel, não a grade comprimida. Cada modal
tem uma única coluna, um único dono de rolagem e o CTA depois de todos os campos.

## 3. Objetivo e funcionamento

O usuário alcança qualquer horário e conclui retorno, agendamento e orçamento com uma mão, sem
arrastar área interna concorrendo com a página, girar o aparelho ou adivinhar texto truncado.

## 4. Contrato técnico

### Agenda

- Trocar o corte mobile das visões Dia/Semana de `sm` para `md` quando necessário.
- O wrapper mobile é `h-auto/overflow-visible`; a lista inteira pertence ao scroll do shell.
- A grade `md+` conserva altura controlada e tem um único `overflow-auto` interno, com início e
  fim do expediente alcançáveis.
- Cabeçalho de data/contexto permanece visível sem prender a rolagem do conteúdo.

### Novo agendamento

Ordem mobile única:

`dentista → paciente → observações → data/hora → duração (presets + livre) → protético → avisos → salvar`

- O CTA sticky só aparece depois do campo livre de duração.
- Abrir protético expande os três campos em largura total.
- Desktop mantém duas colunas.

### Novo orçamento no perfil

- Ordem mobile: dentista, itens, adicionar item, resumo/negociação, total e CTA.
- A lista de itens e o resumo não possuem `overflow-y` independentes no mobile.
- Cada item mostra descrição/face em linha própria; quantidade, preço e remover ficam abaixo.
- Desktop conserva a composição em duas colunas.

## 5. Estados

| Estado | Comportamento |
|---|---|
| Sem compromisso | CTA de agendar no dia continua acessível |
| Lista longa | scroll do shell chega ao último item/horário |
| Protético fechado | nenhum campo obrigatório oculto interfere |
| Protético aberto | valida os três campos atuais |
| Orçamento longo | todos os itens vêm antes da confirmação |
| Erro | mensagem próxima do CTA, sem deslocá-lo para fora do viewport |

## 6. Referência visual

Reusar os cards atuais; não redesenhar Agenda. Alvos de 44 px, rodapé com safe-area, expansão
150–200 ms e sem `transition-all` nos componentes tocados.

## 7. Invariantes

- Regras de conflito, expediente, pedido protético e orçamento não mudam.
- Desktop não perde grade nem colunas.
- Mobile nunca exige drag para concluir ação.
- Um orçamento preserva cada face/procedimento como item próprio.

## 8. Gates de aceite

- [ ] Android 360–412 px e viewport 640–767 px alcançam primeiro e último horário em Dia/Semana.
- [ ] Semana mostra todos os dias e permite abrir o dia sem corte.
- [ ] Novo agendamento exibe duração livre antes de Salvar.
- [ ] Protético aberto mostra seletor, entrega e observação sem sobreposição.
- [ ] Orçamento com 12 restaurações em faces distintas deixa face, preço e remoção legíveis.
- [ ] Só existe uma barra de rolagem vertical por modal no mobile.
- [ ] Desktop 1280 px permanece funcional.

## 9. Fora de escopo

- Novo calendário, popup global ou alteração de regras da Agenda.
- Agrupar itens de orçamento que representam faces diferentes.

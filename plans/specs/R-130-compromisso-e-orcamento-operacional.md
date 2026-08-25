# R-130 — Compromisso da secretária, orçamento completo e ponte fixa

> **Fase:** implementação local · **Migration:** 1 (RPC de orçamento) · **RLS:** não muda.

> **Complemento pendente de execução (2026-08-25):** corrigir o falso erro ao excluir
> recebimento e permitir editar o valor final negociado de orçamento já salvo.

## Problema confirmado

1. O compromisso pessoal usa `agenda_bloqueios`, cuja RLS já permite à secretária operar a
   agenda de dentistas da clínica. Porém, ao colidir com uma consulta a action devolve apenas
   `conflito: true`; a secretária precisa descobrir sozinha que há uma segunda confirmação.
   Depois de salvar, uma falha na recarga de `agenda_bloqueios` só vai para o console, deixando
   a impressão de que nada foi registrado. O nome do dentista vem de um join opcional; se ele
   não vier hidratado, a UI não pode jamais exibir o UUID como substituto.
2. A edição de recebimento já existe, mas fica em ícones invisíveis até `hover` no item pago.
   Isso é inacessível no celular e não comunica que o recebimento pode ser corrigido.
   Além disso, `editarPagamento` não confirma que o `UPDATE` afetou uma linha.
3. Gerar orçamento a partir de uma ficha filtra `status='indicado'`, `assinatura_id is null` e
   exclui eventos já associados a outro orçamento. A RPC `criar_orcamento_com_eventos` repete o
   mesmo bloqueio. Por isso um procedimento realizado/assinado na ficha não chega ao orçamento.
4. A infraestrutura clínica de **ponte fixa** já existe: `tipo='ponte'`, um `grupo_id` comum e
   os papéis `pilar`/`pontico`. Ela já desenha a conexão no odontograma. Porém, ficou apenas no
   detalhe avançado de um dente e fora do menu multidente rápido; por isso é difícil de descobrir
   no atendimento. Também precisa chegar ao orçamento como uma ponte única, não como três
   procedimentos independentes.
5. Ao excluir um recebimento, `excluirPagamento` pode apagar a linha e ainda devolver
   `Não foi possível excluir este pagamento.`: o `count` da operação `DELETE` não é uma
   confirmação confiável nesse client. A tela então mostra erro, mas ao fechar o orçamento a
   remoção já está persistida.
6. Depois de salvo, o orçamento não permite corrigir o **valor final negociado** sem reabrir o
   plano de pagamento. Isso obriga o dentista a refazer informação financeira mesmo quando os
   procedimentos continuam corretos.

## Decisões

| # | Decisão |
|---|---|
| D1 | Secretária continua escolhendo o dentista ao criar compromisso. A action valida explicitamente que só secretária pode informar outro `dentistaId`; o dentista comum só cria bloqueio próprio. |
| D2 | Conflito continua sendo aviso, nunca bloqueio. A interface explica que há horário ocupado e oferece **Marcar mesmo assim** no mesmo formulário, sem perder os dados digitados. |
| D3 | O nome exibido do bloqueio sempre vem de `dentistas` da clínica. Se não houver nome, mostra `Dentista não identificado`, nunca o UUID. |
| D4 | “Editar orçamento” passa a ter duas seções explícitas: **Procedimentos** e **Recebimentos**. Editar um recebimento altera somente aquela linha financeira, mantém o log e não substitui itens clínicos. |
| D5 | Ao gerar orçamento por uma ficha, entram todos os eventos **clínicos** (`origem='clinica'`) dela, planejados ou realizados, assinados ou não. Eventos `preexistente` ficam fora: são histórico, não serviço a cobrar. |
| D6 | Um evento continua ligado a no máximo um orçamento (`unique(evento_id)`). O que já pertence a orçamento anterior não reaparece. Esta trava não é flexibilizada. |
| D7 | Não será criado outro tipo, tabela ou símbolo para ponte fixa. O R-130 reutiliza o grupo `ponte` já persistido: dentes extremos são **pilares**; os dentes internos são **pônticos**. |
| D8 | No menu rápido, **Ponte fixa** abre diretamente o fluxo seguro do pilar inicial: selecionar o primeiro pilar → tocar `Ponte fixa` → escolher o outro extremo do mesmo arco → revisar e confirmar. Nenhum evento é salvo antes da confirmação. |
| D9 | Uma ponte é um único item de orçamento, ligado a todos os eventos do seu `grupo_id`. A linha identifica pilares e pônticos e usa a quantidade de elementos da ponte (ex.: 24–26 = 3). O valor continua editável pelo dentista. |
| D10 | Excluir recebimento confirma sucesso por `DELETE ... select('id')`, não por `count`. Só há sucesso visual quando exatamente a linha solicitada voltar na seleção; o perfil do paciente também é revalidado. |
| D11 | “Valor final” significa **valor negociado** (`valor_acordado`), nunca `total`: o total segue sendo a soma da proposta inteira. A edição fica no resumo financeiro do orçamento, em ação explícita e separada dos procedimentos. |
| D12 | O valor negociado só pode mudar sem plano de pagamento configurado nem parcela agendada. Nunca pode ser menor que a soma já paga. Havendo `plano_forma` ou `pagamento.status='pendente'`, a interface bloqueia a alteração e explica que o plano/parcela precisa ser ajustado primeiro. |

## Contrato técnico

### A. Compromisso pessoal

**Arquivos:** `agendamentos/actions.ts`, `compromisso-pessoal-dialog.tsx`,
`agendamentos-client.tsx`, `page.tsx`.

- `criarCompromissoPessoal` recebe `role` de `requireClinicContext()`.
  - se `dentistaId` for diferente do perfil atual e `role !== 'secretaria'`, retorna
    `Sem permissão para criar compromisso em outra agenda.`;
  - secretária só aceita perfil ativo `admin|dentista` da clínica atual;
  - o `insert(...).select('id').single()` permanece a confirmação do registro.
- O retorno de conflito inclui mensagem legível e o horário, por exemplo:
  `Há uma consulta nesta faixa. Você pode marcar o compromisso mesmo assim.`
- `recarregarAgendamentos` trata `bloqueiosErr` como falha visível (`toast.error`) e não fecha
  o diálogo como se a atualização visual tivesse ocorrido.
- A tela recebe/deriva um `Map<dentistaId, nome>` a partir da lista já carregada. Todo card de
  compromisso da secretária usa esse mapa como fallback do join relacional.
- O diálogo, ao abrir para secretária sem dentista selecionável, desabilita salvar e mostra
  `Cadastre um dentista ativo para criar um compromisso.` Em hipótese alguma envia `''`.

### B. Recebimentos no orçamento

**Arquivos:** `detalhe-orcamento-modal.tsx`, `paciente-detail-client.tsx`,
`orcamentos/actions.ts`.

- A seção `Recebimentos` fica visível dentro do modo de edição do orçamento, com cada linha
  paga contendo ação textual/ícone sempre visível **Editar recebimento**. Em touch não depende
  de hover. Parcelas pendentes preservam **Marcar como paga**.
- O formulário já existente continua limitado a `valor`, `forma de pagamento` e
  `data de recebimento`; vencimento e número da parcela não são reescritos nessa operação.
- `editarPagamento` passa a usar `.select('id')` após `update`. Zero linhas afetadas retorna
  erro explícito antes do toast/estado otimista. Em êxito mantém `pagamento.editado`, incluindo
  valor anterior e novo nas `metadata`, e revalida orçamento, financeiro e perfil do paciente.
- Excluir pagamento continua ação separada e confirmada. Nenhum recebimento é apagado por
  `editarOrcamento`.
- `excluirPagamento` troca `.delete({ count: 'exact' })` por `.delete().select('id')`. Erro do
  banco continua sendo retornado; array vazio ou com id diferente retorna erro explícito antes
  de qualquer atualização otimista. Em êxito, revalida orçamento, financeiro **e** perfil do
  paciente.

### B.1 Valor final negociado do orçamento

**Arquivos:** `orcamentos/actions.ts`, `paciente-detail-client.tsx`,
`detalhe-orcamento-modal.tsx`. **Schema/migration:** nenhum.

- O resumo financeiro do detalhe ganha a seção `Valor final negociado`. O campo começa em
  `valor_acordado`; se estiver `null`, mostra o total atual como sugestão. O rótulo deixa
  explícito: `Não altera os procedimentos.`
- Nova action `editarValorAcordado(orcamentoId, valorAcordado)` recebe valor em centavos/number
  já validado no cliente e revalida no servidor: orçamento existe na clínica ativa, valor é
  positivo, e `valorAcordado >= soma(pagamentos.status='pago')`.
- A action consulta `plano_forma` e pagamentos pendentes. Se houver plano ou parcela agendada,
  retorna erro sem escrever nada. Não recalcula, edita ou exclui parcelas implicitamente.
- Em êxito, atualiza exclusivamente `orcamentos.valor_acordado`, registra
  `orcamento.editado` com `alteracao='valor_negociado'` e valores anterior/novo, e revalida
  orçamento, financeiro e perfil. O estado/valor devido é recalculado pela fórmula do R-114
  sem escrita adicional de status.

### C. Fonte completa da ficha para orçamento

**Arquivos:** `use-orcamento-modal.ts`, migration nova `152_*_orcamento_eventos_ficha_completa.sql`.

```ts
function eventoPodeEntrarNoOrcamento(evento: EventoOdontogramaParaOrc, idsJaOrcados: ReadonlySet<string>) {
  return evento.origem === 'clinica' && !idsJaOrcados.has(evento.id);
}
```

- `eventosParaItens`, `fichaParaItens` e o fluxo agregado usam a função acima.
- O botão da ficha continua trazendo **somente aquela ficha**; o botão geral do paciente agrega
  fichas do mesmo responsável, como hoje. Não mistura dentistas por acidente.
- A query agregada remove os filtros de `status` e `assinatura`; mantém o embed e a filtragem
  de responsabilidade em JavaScript para respeitar encaminhamentos.
- A RPC substitui a validação `e.status='indicado' and e.assinatura_id is null` por
  `e.origem='clinica'`. Mantém: clínica, paciente, responsável, exclusividade em
  `orcamento_eventos` e transação atômica.
- Linhas adicionadas a mão continuam com `eventoIds: []`; editar/remover uma linha no modal não
  altera a ficha clínica de origem.

### D. Ponte fixa no fluxo rápido

**Arquivos:** `lote-multidente.ts`, `registrar-painel.tsx`, `FichasTab.tsx`,
`ToothDetailPanel.tsx`, `use-orcamento-modal.ts`. **Schema:** nenhum.

- `ponte` já é a representação clínica canônica. Para uma ponte de 24 a 26, o grupo nasce com
  três eventos e um único `grupo_id`: `24=pilar`, `25=pontico`, `26=pilar`. A ausência prévia
  do 25 continua no histórico; a ponte é o tratamento atual que passa a prevalecer visualmente.
- No Meu Dia e na ficha, a ação fica junto das ações multidente, mas não cria uma ponte em lote
  cega: depois do pilar inicial, ela abre o fluxo existente já preparado para escolher o outro
  extremo. Só aceita outro dente permanente do mesmo arco; voltar/cancelar limpa apenas o estado
  transitório.
- Ao escolher o segundo pilar, a revisão mostra `Ponte fixa — D24 · D25 · D26`, os dois pilares
  e o(s) pôntico(s), status **A fazer** ou **Realizado hoje**, alerta leve caso um pôntico não
  tenha ausência prévia registrada, e **Confirmar ponte**. O alerta não bloqueia porque pode ser
  um dado histórico incompleto.
- O painel avançado `Abrir detalhe dental` continua oferecendo a edição dos papéis por dente;
  isso cobre pontes não convencionais sem poluir o caminho rápido.
- `eventosParaItens` já agrupa por `tipo|grupo_id`; para `ponte`, a descrição passa a explicitar
  `Ponte fixa — pilares D24 e D26 · pôntico D25` e `quantidade` é a contagem de elementos do
  grupo. Os três `eventoIds` seguem juntos, portanto a ponte não pode gerar três orçamentos.

**Referência clínica usada no contrato:** a ADA define a prótese parcial fixa como reposição de
um ou mais dentes ausentes apoiada/cimentada em dentes pilares (ou implantes) e define pôntico
como o dente artificial da ponte. A decisão entre ponte e implante deve considerar os pilares e
o contexto clínico individual. [Glossário da ADA](https://www.ada.org/publications/cdt/glossary-dental-terms),
[American College of Prosthodontists](https://www.prosthodontics.org/about-acp/position-statement-posterior-single-tooth-replacement/).

## Invariantes

- Nenhum UUID de dentista é apresentado ao usuário como nome.
- Secretária pode criar bloqueio para dentista ativo da própria clínica; outro usuário não.
- Falha de inserir ou de recarregar não vira sucesso visual silencioso.
- Recebimento corrigido mantém trilha de auditoria e nunca edita/exclui outro recebimento.
- Um `DELETE` de pagamento só confirma êxito se devolver o id solicitado; nunca existe toast de
  erro depois de uma remoção já persistida.
- `total` continua sendo a soma de todos os itens da proposta; editar o valor final só altera
  `valor_acordado`.
- Valor negociado nunca fica abaixo do total já recebido e nunca deixa um plano/parcelas ativos
  com valores desencontrados.
- Registro `preexistente` nunca nasce como item de orçamento.
- O mesmo evento não entra em dois orçamentos, mesmo com dois cliques concorrentes.
- Alterar a fonte do orçamento não muda status, assinatura nem data do evento clínico.
- Ponte fixa nunca é salva parcialmente: todos os eventos do grupo têm o mesmo status, origem e
  `grupo_id`; cancelar antes da confirmação não deixa rascunho invisível.
- Pônticos descrevem a lacuna substituída; pilares descrevem os dentes de suporte. Nenhum dos
  dois é convertido automaticamente em coroa avulsa ou extração.

## Gates de aceite

### Compromisso

- [ ] Secretária escolhe dentista A, cria compromisso sem conflito e vê o card imediatamente
      com o nome de A em Dia, Semana e Mês.
- [ ] Horário que conflita mostra aviso compreensível; **Marcar mesmo assim** grava uma única
      linha e mantém o profissional escolhido.
- [ ] Falha de carregamento de bloqueios apresenta erro visível; não parece que o item foi salvo.
- [ ] Dentista A não cria nem edita bloqueio de B; secretária não opera dentista de outra clínica.

### Orçamento

- [ ] Em um orçamento pago, **Editar orçamento → Recebimentos → Editar** permite corrigir
      valor, forma e data no desktop e celular; o histórico registra `pagamento.editado`.
- [ ] UPDATE barrado/zero linhas mostra erro e não atualiza a tela otimisticamente.
- [ ] Excluir um recebimento uma vez remove a linha, exibe apenas `Pagamento excluído.` e mantém
      o mesmo resultado ao fechar/reabrir o orçamento; uma segunda tentativa recebe
      `Pagamento não encontrado.`.
- [ ] Orçamento sem plano, com R$ 300 pagos: alterar valor final de R$ 1.000 para R$ 800 atualiza
      somente `valor_acordado`; os itens e o total original não mudam.
- [ ] Tentar definir R$ 299 no mesmo orçamento falha sem alteração.
- [ ] Orçamento com `plano_forma`/parcelas ativas mostra o bloqueio de renegociação e não altera
      `valor_acordado` nem nenhuma parcela.
- [ ] Ficha com procedimento indicado, realizado e assinado (todos `origem='clinica'`) gera
      três itens; um evento `preexistente` não aparece.
- [ ] Um evento já ligado a orçamento anterior não reaparece e a RPC recusa tentativa manual de
      vinculá-lo de novo.
- [ ] Secretária só vê/gera itens do dentista selecionado, inclusive encaminhados para ele.
- [ ] Selecionar D24, iniciar **Ponte fixa**, escolher D26 no fluxo aberto e confirmar cria um único grupo com
      D24/D26 como pilares e D25 como pôntico; o odontograma mostra a conexão.
- [ ] A mesma ponte aparece como um único card e como uma única linha de orçamento com os três
      eventos vinculados; tentar gerar novo orçamento não reapresenta nenhum deles.
- [ ] Ponte com pôntico sem `dente ausente` prévio mostra aviso, mas confirma quando o dentista
      decide seguir; dois dentes de arcos diferentes não podem formar uma ponte.

## Fora de escopo

- Reabrir orçamento já aceito/quitado para trocar seu plano de pagamento.
- Transformar evento pré-existente em procedimento cobrável automaticamente.
- Mudança de RLS de pagamentos, orçamento ou agenda.
- Edição do conteúdo clínico a partir do orçamento.
- Renegociação automática de parcelas ou de plano já definido.
- Alterar o desenho anatômico/símbolo da ponte no odontograma (o símbolo atual já representa o
  grupo; o refinamento visual permanece no item próprio de símbolos).

## Entrega e verificação

1. Commit isolado da migration/RPC.
2. Commit de agenda e orçamento.
3. Typecheck + testes unitários existentes.
4. Gate manual com duas contas logadas: dentista + secretária, e confirmação de silo entre
   clínicas antes de publicar.

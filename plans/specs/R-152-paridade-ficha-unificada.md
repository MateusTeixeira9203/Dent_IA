# R-152 — Paridade operacional da Ficha unificada

> **SPEC** · **R-152** · 🟡 publicada; aguarda gate de paridade
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** validação dirigida em produção
> **Filha de:** R-140c · **Limite:** não remover o renderer legado antes do gate de paridade.

## 1. Problema

O perfil do paciente já usa `ProntuarioTab` como Ficha nova, mas ações clínicas permanecem em
`FichasTab`. Isso produz uma migração pela metade: uma conta cai no editor antigo, a exclusão
some da tela nova e funcionalidades passam a depender de qual entrada o dentista abriu.

O defeito de encaminhamento relatado não será resolvido alargando permissão: a action já recusa
evento não pertencente ao autor, realizado, assinado ou fora da clínica. A UI deve enviar o evento
certo e explicar a guarda que falhou; o servidor continua sendo a fonte de autorização.

## 2. Decisão e inventário

Para Fichas do modelo novo, `ProntuarioTab` é a única superfície operacional. `FichasTab` não
recebe navegação de perfil, Meu Dia, Agenda ou histórico. Registros sem Ficha/Atendimento/evento
estruturado continuam no renderer legado, exclusivamente em leitura.

| Ação da Ficha antiga | Classificação | Destino na Ficha unificada |
|---|---|---|
| Nova evolução, Dex, odontograma, campos técnicos e ortodontia | migrar | `Novo atendimento`, reutilizando `useRegistrarPainel` e `ToothDetailPanel` |
| Editar ficha inteira, data, texto e odontograma salvos | substituir | edição por procedimento; complemento/retificação para visita já registrada ou assinada |
| Editar observação/detalhe de um evento | migrar | card `ProcedimentoDetalheFicha`; destinatário altera só detalhe técnico |
| A fazer, Realizado e Próxima sessão | migrar | controles por evento; vários eventos exigem seleção explícita, nunca grupo implícito |
| Encaminhar/remover encaminhamento | migrar | ação por evento e lote somente após seleção explícita; mantém RPC, autoria e log atômicos |
| Assinatura de procedimentos realizados | migrar | diálogo atual por procedimentos, agrupado por Ficha e com documento por Ficha |
| Assinatura antiga da Ficha sem eventos | encerrar | renderer legado exibe somente o estado/documento existente; não cria assinatura retroativa |
| Gerar orçamento | migrar | CTA da Ficha atual, preservando `ficha_id` e responsável canônico |
| Baixar PDF | migrar | CTA no cabeçalho da Ficha unificada; usa o endpoint existente |
| Abrir odontograma e histórico | migrar | superfícies atuais de Ficha e histórico lateral, sem abrir editor legado |
| Colar histórico do Word | migrar | CTA no resumo do Prontuário; o importado nasce como registro histórico em leitura |
| Filtro por responsável | substituir | responsável/autor aparece no card; filtros operacionais não escondem dado em edição |
| Excluir Ficha | substituir | não migrar o hard delete antigo; decisão pendente em §3 |
| Excluir procedimento | migrar com trava | autor remove somente evento não assinado e sem vínculo a orçamento; nunca apaga prova ou dinheiro |

## 3. Objetivo e ordem de execução

1. Testar e corrigir o roteamento que ainda leva um dentista ao editor antigo.
2. Tornar ações por procedimento verdadeiramente unitárias; lote é escolha explícita.
3. Completar as ações operacionais válidas da tabela na Ficha nova.
4. Tornar o renderer legado estritamente de leitura.
5. Remover `FichasTab` somente quando não houver import em runtime, a paridade passar e os
   registros históricos continuarem acessíveis.

### Exclusão confirmada

O dentista pode apagar definitivamente uma Ficha própria não assinada, depois de aviso explícito
e confirmação. O diálogo informa a quantidade de eventos/evoluções e de orçamento ainda editável
que também serão removidos; o log de exclusão preserva ator, Ficha e contagens antes da remoção.

Assinatura, documento clínico, orçamento aceito ou pagamento impedem a exclusão. Nesses casos a
interface não oferece uma confirmação que falharia: explica que o registro precisa de
retificação/cancelamento auditável. A implementação substitui o hard delete atual que poderia
alcançar dinheiro por cascata; nenhuma exclusão pode apagar pagamento, aceite ou assinatura.

## 4. Contrato técnico

- `SuperficieProntuario` preserva `resumo`, `ficha`, `editor` e `legado`; nenhum caso novo aponta
  para `FichasTab`.
- Ação unitária recebe exatamente um `eventoId`. Uma ação em lote recebe `eventoIds` somente de
  uma seleção visível; o rótulo informa quantidade antes da confirmação.
- `encaminharProcedimento`, `alternarStatusRegistro`, `alternarMomentoRegistro`,
  `atualizarStatusEncaminhado` e `assinarProcedimentos` continuam validando clínica, autoria,
  destino e assinatura no servidor. Nenhuma guard migra para o cliente.
- Ao falhar encaminhamento, o toast devolve a causa tratada pela action; não converte
  “Nenhum registro elegível” em sucesso nem remove o card otimisticamente.
- O clique em dente dentro de uma Ficha procura evento daquela visita: se encontrar, abre e
  posiciona no card do procedimento; se não encontrar, não abre complemento nem editor do Meu Dia.
- `excluirProcedimento({ eventoId })` valida UUID, clínica, autor, assinatura e vínculo em
  `orcamento_eventos`. O evento só é removido sem assinatura e sem orçamento; a action registra
  `odontograma_evento.excluido` e revalida o paciente.
- A exclusão recebe um DTO discriminado e falha fechada para assinatura, documento, orçamento
  aceito ou pagamento. A RPC exclusiva de R-152 não relaxa RLS e não apaga cascata financeira.

## 5. Comportamento

| Situação | Resultado obrigatório |
|---|---|
| Autor abre Ficha nova por qualquer entrada | abre `ProntuarioTab`; editar abre só o card do evento |
| Destinatário de encaminhamento | vê o evento; só altera situação e detalhe técnico permitido |
| Outro dentista | lê, mas não recebe controles de escrita nem caminho para editor antigo |
| Evento assinado | é leitura; CTA é retificação, não edição |
| Dois eventos no mesmo agrupamento | nenhum status/encaminhamento muda ambos sem seleção explícita |
| Encaminhamento elegível | seleciona destino, confirma, preserva autor e exibe sucesso após RPC |
| Encaminhamento inelegível | mantém tela e explica a guarda; não altera o destinatário exibido |
| RPC de encaminhamento ausente | informa indisponibilidade de configuração e não altera o evento; a migration é aplicada antes do novo preview |
| Clique em dente com procedimento na visita | abre e rola até o card daquele procedimento; não abre editor de complemento |
| Clique em dente sem procedimento na visita | permanece no prontuário, sem abrir qualquer formulário |
| Excluir procedimento próprio sem vínculo | pede confirmação e remove apenas aquele evento; o log registra ator e estado anterior |
| Excluir procedimento assinado ou orçado | bloqueia e orienta retificação/ajuste do orçamento; nenhum vínculo é apagado em cascata |
| Registro legado | abre leitura compatível, sem CTA de editar, assinar ou apagar |
| Ficha apagável | alerta informa consequências; confirma e remove somente dados ainda editáveis |
| Ficha com prova/dinheiro | bloqueia exclusão antes do delete e orienta retificação/cancelamento |
| Exportar | baixa o PDF da Ficha atual sem trocar de superfície |

## 6. Referência visual

Não cria uma tela nova. Usa o contrato visual aprovado do R-140c: ações do procedimento ficam no
próprio card; ações da Ficha ficam no cabeçalho; confirmação destrutiva, se aprovada, usa diálogo
existente e tokens de tema. Light e dark não recebem cores hardcoded.

## 7. Invariantes

- Registro novo nunca abre `FichasTab` para edição.
- Uma ação não altera mais de um procedimento sem seleção explícita.
- Encaminhamento nunca transfere autoria, data clínica ou `clinica_id`.
- Assinado, documento, orçamento aceito e pagamento não são apagados para contornar uma exclusão.
- Procedimento vinculado a orçamento não é apagado para contornar a integridade da proposta.
- Legado permanece acessível, mas não ganha escrita retroativa.
- Perfil, Meu Dia, Agenda e histórico respeitam as mesmas guards server-side.

## 8. Gates de aceite

- [ ] Autor, destinatário, outro dentista e administrador abrem a mesma Ficha nova pelos quatro
  pontos de entrada; nenhum chega ao editor antigo.
- [ ] Editar um procedimento próprio não muda texto, localização, status ou detalhe dos demais.
- [ ] Seleção explícita de dois eventos mostra quantidade e altera somente os dois confirmados.
- [ ] Encaminhar evento próprio indicado para outro dentista persiste destino, log e notificação;
  o destinatário consegue concluir sem reescrever autoria.
- [ ] Evento realizado, assinado, de outro autor ou já encaminhado informa o motivo e não chama
  escrita indevida.
- [ ] Clique no dente de uma Ficha abre somente o card do procedimento existente; clique sem
  procedimento não abre o editor.
- [ ] Autor pode excluir procedimento isolado; evento assinado, de outro autor ou vinculado a
  orçamento é bloqueado sem remoção de vínculo.
- [ ] Assinatura gera documento por Ficha; PDF e orçamento abrem pela Ficha unificada.
- [ ] Registro legado continua visível e não possui ação de escrita.
- [ ] Exclusão confirma as consequências, registra log e nunca apaga assinatura, documento,
  orçamento aceito ou pagamento; a tentativa bloqueada explica o motivo.
- [ ] Testes de tipos, lint do recorte, testes unitários e browser passam em light/dark e 375/768/1440.

## 9. Fora de escopo

- Mudança de RLS ou reaproveitar hard delete existente.
- Alterar conteúdo clínico de Fichas assinadas ou registros legados.
- Materiais/OCR (R-140d), orçamento financeiro (R-145), retorno/Agenda (R-146/R-150) e IA.

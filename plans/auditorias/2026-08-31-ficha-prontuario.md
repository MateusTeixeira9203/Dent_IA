# Auditoria — Ficha e Prontuário longitudinal

> **Data:** 31/08/2026 · **Escopo:** R-140c · **Tipo:** código + schema remoto somente leitura

## Veredito

O artefato v4 continua válido como direção visual, mas a implementação não pode substituir a
leitura atual por uma consulta apenas em `atendimentos_clinicos`/`ficha_evolucoes`. Isso ocultaria
dados reais. A leitura nova precisa ser uma projeção de compatibilidade, sem reescrever o histórico.

Bloqueios antes do código da tela:

1. `+ Novo registro` no perfil ainda salvaria pelo caminho antigo e não criaria Atendimento/evolução.
2. Há Fichas reais sem `ficha_evolucoes`; elas precisam de fallback de leitura.
3. O backfill de Atendimento não vinculou eventos históricos; a timeline precisa de fallback por Ficha.
4. O retorno criado hoje não informa de qual Atendimento veio.
5. Materiais/rastreabilidade ainda não possuem tabela; não podem aparecer como dados confirmados.
6. Encaminhamento/status/detalhe não registram a última alteração de forma atômica.
7. A exportação de prontuário continua agrupada por Ficha, não por Atendimento.

## Evidência do banco remoto

Consultas agregadas, sem leitura de conteúdo clínico ou identificação de pacientes:

| Objeto | Evidência |
|---|---:|
| Fichas | 255 |
| Fichas sem evolução | 77: 67 manuais, 6 importadas, 4 do modo consulta |
| Evoluções | 184; 71 sem texto; 184 manuais; 0 automáticas |
| Atendimentos | 184 finalizados |
| Relações `atendimento_eventos` | 0 |
| Eventos odontológicos | 1.048; nenhum sem Ficha |
| Realizados sem assinatura granular | 670 |
| Realizados com assinatura granular | 0 |
| Assinaturas legadas em Ficha | 3 |
| Documentos do paciente | 132; nenhum possui vínculo direto com Ficha/Atendimento |
| Documentos de aceite congelados | 0 |
| Orçamentos | 188; 132 ligados a Ficha |
| Tratamentos legados (`tratamentos`) | 0; nenhuma Ficha usa `tratamento_id` |

O schema R-140a existe e suas policies isolam clínica ativa. A ausência dos vínculos históricos é
compatível com o backfill aplicado: ele envolveu evoluções existentes em Atendimentos, mas não
fabricou relações de eventos nem evoluções para Fichas criadas pelos outros caminhos.

## De onde vem a evolução clínica

A evolução oficial é o conteúdo revisado e salvo pelo dentista, não a saída bruta do Dex.

- **Meu Dia, manual:** o dentista escreve `textoVisita`; o orquestrador grava
  `ficha_evolucoes.texto` com `automatica=false` e também mantém `fichas.anotacoes` na Ficha da sessão.
- **Meu Dia, Dex:** áudio/texto/documento passam por transcrição/extração e
  `/api/dex/formatar-evolucao`; o resultado preenche a mesma bancada editável. Só o que o dentista
  revisa e salva segue para `textoVisita` e para a evolução.
- **Perfil, Nova Evolução atual:** manual e Dex terminam em `salvarFicha(origem='manual')`; grava
  `fichas.anotacoes` e eventos, mas não cria `ficha_evolucoes` nem Atendimento.
- **Importação:** grava uma Ficha `importado` com o texto bruto em `fichas.anotacoes`; não estrutura
  evento e não cria evolução.
- **Sem texto:** `registrarEvolucao` preserva `null`; a interface deve dizer “Sem evolução textual
  registrada” e mostrar os atos clínicos existentes. Não gerar resumo por IA e não atribuir texto
  automático ao dentista.
- **Evolução automática:** quando uma visita toca outra Ficha, o sistema pode produzir descrição
  determinística com `automatica=true`; ela deve ser rotulada como sistema, nunca como relato.

## Matriz de entradas, persistência e saídas

| Entrada/ação | Transformação | Persistência atual | Saída/efeito |
|---|---|---|---|
| Digitação no perfil | form + eventos derivados | `fichas`, `odontograma_eventos` | card por Ficha, PDF, orçamento |
| Dex no perfil | transcrever/extrair → estruturar → revisão | mesmo caminho manual | não cria Atendimento/evolução |
| Digitação/Dex no Meu Dia | revisão → `salvarVisitaMeuDia` | Atendimento, Ficha(s), evolução(ões), eventos e relações | finaliza agenda e chama próximo |
| Importar Word/PDF | texto bruto, sem IA | `fichas(origem=importado)` | renderer legado |
| Editar Ficha | valida autor/assinatura; regrava evento via RPC | Ficha + eventos + log de Ficha | orçamento/PDF continuam pelo mesmo ID |
| Encaminhar procedimento | atualização estreita + notificação | `odontograma_eventos.encaminhado_para` | destino pode concluir/preencher detalhe |
| Concluir/reabrir encaminhado | RPC estreita | status/`realizado_em` | notifica autor; hoje sem log atômico |
| Coletar assinatura | somente realizados, mesma Ficha | `assinaturas` + `assinatura_id`; fallback em `fichas` | PDF congelado quando solicitado |
| Emitir TCLE/conclusão | snapshot + assinatura | `documentos_aceite`, `paciente_documentos`, Storage | documento imutável em Arquivos |
| Upload/foto/documento | arquivo e metadados | `paciente_documentos` | Arquivos; sem vínculo com visita |
| Documento antigo processado | extração de texto | `ficha_arquivos` | rota existe, mas não há registros no remoto |
| Gerar orçamento | eventos/Ficha selecionados | `orcamentos.ficha_id` + itens/relações | aba Orçamentos e PDF |
| Marcar retorno | disponibilidade + conflito | novo `agendamentos` | Agenda; sem vínculo com Atendimento origem |
| PDF de Ficha | Ficha + eventos | não altera banco | HTML por Ficha |
| Exportar prontuário | Fichas + orçamentos + agenda | não altera banco | HTML ainda sem Atendimento/evolução/documentos |
| Contexto Dex/briefing | cinco Fichas recentes | não altera banco | resumo operacional; continua compatível por Ficha |

## Projeção sem perda

Ordem obrigatória do serviço de leitura:

1. Criar blocos para todos os `atendimentos_clinicos` do paciente.
2. Anexar suas `ficha_evolucoes` e `atendimento_eventos` quando os vínculos existirem.
3. Transformar evolução sem Atendimento em visita legada sintética, sem inserir nada no banco.
4. Transformar toda Ficha sem evolução em visita legada sintética usando data, autor e conteúdo da Ficha.
5. Para Atendimento legado sem `atendimento_eventos`, anexar eventos pela Ficha uma única vez;
   nunca repetir os mesmos eventos em todas as evoluções.
6. Dados de especialidade e ortodontia continuam vindo do evento/Ficha original.
7. Assinatura e documento congelado são lidos pelos IDs atuais; a UI nunca os recalcula.
8. Orçamento é contextual quando `orcamentos.ficha_id` pertence à visita.
9. Documento genérico do paciente permanece global em Arquivos/resumo; somente
   `documentos_aceite.ficha_id` permite atribuição segura a uma visita.
10. Toda linha inclui `fonte: moderna|evolucao_legada|ficha_legada` para teste e diagnóstico,
    mas o rótulo técnico não precisa aparecer para o dentista.

## Divergências que exigem contrato

### Novo registro sem agenda

`registrarAtendimentoClinico` exige `agendamentoId` e grava `origem='meu_dia'`. A bancada do perfil
deve reutilizar o mesmo orquestrador, com `agendamentoId` opcional e `origem='ficha'`. A chave de
idempotência continua obrigatória; sem agendamento, a reconciliação é somente por essa chave. Não
será criado agendamento artificial e nenhum status da Agenda será alterado.

### Retorno da visita

`agendamentos` não possui referência para Atendimento/Ficha de origem. Sem uma relação aditiva, a
tela só pode afirmar “próximo agendamento do paciente”, não “retorno deste atendimento”. Para
cumprir o artefato, a recomendação é `agendamentos.atendimento_origem_id` anulável, preenchido pelo
modal quando aberto a partir da visita. Registros antigos continuam sem vínculo.

### Materiais e etiquetas

Não existe tabela de material, etiqueta, esterilização ou rastreabilidade. Em R-140c, o estado
honesto é `nao_informada`/“Ainda não registrado”. Captura por câmera, OCR, lotes, usos e estoque
continuam no R-140d; a ficha não pode simular que esses dados já existem.

### Auditoria de procedimento

`activity_logs` já registra criação/edição/exclusão de Ficha, mas não as mudanças estreitas do
encaminhamento. R-140c precisa de RPCs que alterem evento e insiram o log na mesma transação. A
leitura separa autor original, data clínica e última modificação.

## Rotas/superfícies afetadas

- UI: perfil do paciente/Prontuário, Meu Dia, Agenda, Orçamentos, Arquivos e assinatura da recepção.
- Captura: `/api/transcrever`, `/api/extrair-texto`, `/api/dex/formatar-evolucao`, além das rotas
  legadas `/api/processar-documento` e `/api/extrair-imagem`.
- Leitura Dex: `/api/dex/patient-context`, `/api/dex/consultation-context` e briefing continuam
  lendo Fichas; essa compatibilidade não deve ser removida na primeira fase.
- Saídas: `/api/fichas/[id]/pdf`, `/api/pacientes/[id]/prontuario` e PDF de orçamento.
- Server: `salvar-ficha`, `registrar-atendimento-clinico`, `rotear-visita`, `registro-actions`,
  `documentos-aceite`, workspace/timeline e ações de agenda/orçamento.

## Verificação executada

- TypeScript estrito: passou.
- Testes: 154/154 passaram.
- `git diff --check`: passou.
- ESLint geral: falhou com 14 erros e 65 avisos preexistentes; um erro está no modal legado de
  assinatura, mas não foi criado nesta auditoria. Precisa de baseline limpo antes do gate final.
- Navegação autenticada: não executada; a aba controlada redirecionou para login. O QA dinâmico,
  inclusive duas contas para RLS, permanece gate obrigatório depois da implementação.
- Não houve escrita no banco, migration, deploy, commit ou push.

## Gates adicionais de não perda

- A soma de Fichas representadas pela projeção deve ser 255 no dataset atual.
- As 77 Fichas sem evolução precisam aparecer em fallback e as 71 evoluções sem texto não podem
  ganhar texto inventado.
- Os 1.048 eventos precisam pertencer a exatamente um bloco de registro/realização por papel.
- Falha parcial de evolução/evento/documento mostra retry e nunca transforma ausência de resposta
  em lista vazia editável.
- Abrir/filtrar/paginar não escreve no histórico.
- PDF e Arquivos continuam acessíveis pelos IDs existentes durante toda a transição.

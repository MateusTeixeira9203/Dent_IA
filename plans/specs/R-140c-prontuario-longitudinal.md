# R-140c — Redesign: Prontuário longitudinal do paciente

> **SPEC (redesign)** · **R-140c** · 🔵 filha do R-140
> **Aberto:** 2026-08-30 · **Fase:** contrato — revisão 2 aguardando aprovação
> **Depende:** R-140a · **Preserva:** R-108 e R-120

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Perfil do paciente — aba hoje chamada Ficha |
| **Tipo** | redesign de tela existente + projeção longitudinal |
| **Rota** | `/dashboard/pacientes/[id]` |
| **Arquivos principais** | `paciente-detail-client.tsx`, `FichasTab.tsx`, serviços de workspace/timeline |

## 1. Estado atual — inventário

- `FichasTab` reúne leitura, edição, assinatura, odontograma, especialidades, captura e legado num
  componente grande; apresentação e regra clínica têm acoplamento relevante.
- Cada ficha moderna é um tratamento e contém eventos + evoluções; fichas só-texto usam renderer
  legado. Orçamentos e assinaturas dependem de `ficha_id`/`evento_id`.

## 2. O que NÃO pode mudar — trava de segurança

- [x] Ficha continua tratamento 1↔1 e mantém nome/status/autor.
- [x] Eventos, evoluções, assinaturas, documentos e orçamentos mantêm IDs e regras.
- [x] Renderer legado continua disponível e nenhum dado antigo é reescrito.
- [x] Aba Orçamentos permanece separada e funcional.
- [x] Editar, encaminhar, assinar, imprimir e excluir seguem as autorizações atuais.
- [x] Encaminhamento continua por procedimento; não existe transferência da Ficha inteira.
- [x] Nenhum conteúdo de outra clínica aparece; leitura compartilhada segue o núcleo clínico.
- [x] Apresentação muda primeiro em uma tela/artefato; lógica não é reescrita dentro do layout.

## 3. O que o usuário quer

**Sensação pretendida:** registro completo, organizado e rápido de consultar; odontograma presente,
mas não dominante; leitura longitudinal antes de edição detalhada.

| Elemento | Como está | Como o usuário quer |
|---|---|---|
| Nome da aba | Ficha | **Prontuário** |
| Ordem | fichas/tratamentos primeiro | visitas cronológicas como leitura principal |
| Odontograma | grande e dominante | resumo largo, anatômico e inteiro; expansão nunca corta a arcada |
| Tratamentos | cada ficha ocupa a narrativa | seção/filtro interno, sem nova aba |
| Evolução | dentro de cada ficha | dentro da visita correspondente |
| Etiquetas | inexistentes | estado e itens junto do atendimento |
| Registro completo | espalhado em abas/cards | visão clínica agregada com links para documentos/arquivos |
| Classificação da visita | depende de rótulos/status | título derivado dos dados existentes; nenhum status manual novo |
| Autoria | autor original visível | autor original preservado + autor/data de cada alteração do procedimento |
| Continuidade clínica | registro aberto é só leitura | complementar evolução/procedimento sem reescrever o registro histórico |
| Abrir pelo odontograma | Ficha legada abre painel vazio + registro correto | abrir somente o registro/atendimento escolhido, nunca duas superfícies |
| Navegação clínica | “Voltar” discreto e “Histórico Clínico” ambíguo | trilha clara Prontuário → Registro/Tratamento → Edição, preservando contexto |

## 4. Contrato funcional e de dados

### 4.1 Projeção de leitura

```ts
interface ProntuarioAtendimento {
  atendimentoId: string | null; // null = fallback legado
  fonte: 'moderna'|'evolucao_legada'|'ficha_legada';
  data: string;
  autor: { id: string; nome: string; cro: string | null };
  origem: 'meu_dia'|'ficha'|'importado'|'legado';
  evolucoes: Array<{
    fichaId: string;
    fichaNome: string;
    texto: string | null;
    autoria: 'dentista'|'sistema'|'ausente';
  }>;
  eventosRegistrados: EventoClinicoResumo[];
  eventosRealizados: EventoClinicoResumo[];
  rastreabilidade: 'nao_informada'|'pendente'|'completa'|'nao_se_aplica';
  documentos: DocumentoClinicoResumo[];
}

interface EventoClinicoResumo {
  eventoId: string;
  fichaId: string;
  procedimento: { id: string | null; nome: string };
  localizacao: LocalizacaoClinica;
  status: 'indicado'|'realizado';
  momentoPlanejado: 'sessao_atual'|'proxima_sessao';
  autorOriginal: { id: string; nome: string };
  encaminhadoPara: { id: string; nome: string } | null;
  ultimaAlteracao: {
    atorId: string;
    atorNomeSnapshot: string;
    alteradoEm: string; // timestamptz do servidor; não é a data clínica realizado_em
    acao: 'encaminhado'|'detalhe_alterado'|'marcado_realizado'|'reaberto';
  } | null;
}

type ProntuarioTratamento = { fichaId: string; nome: string; status: 'aberta'|'concluida';
  progresso: { realizados: number; total: number }; responsavel: { id: string; nome: string } };
```

O servidor compõe a projeção em `getPatientWorkspaceData`/serviço específico com fetches
independentes em `Promise.all`. O client recebe DTO tipado; não faz joins clínicos nem reduce de
autoria. Paginação é por Atendimento (`cursor = data,id`) e nunca corta conteúdo dentro da visita.

A projeção não escreve no histórico: Atendimento → evolução sem Atendimento → Ficha sem evolução.
`atendimento_eventos` é preferido; fallback legado nunca duplica evento nem vira vazio editável.

O texto oficial vem de `ficha_evolucoes.texto`; no perfil legado, cai para `fichas.anotacoes`.
Saída do Dex só vira evolução depois da revisão e do salvamento do dentista. Texto ausente permanece
`null` e aparece como “Sem evolução textual registrada”; atos clínicos continuam visíveis.

O título deriva de agendamento → procedimento predominante → “Atendimento clínico”; não existe
classificação manual. Registro antigo recebe somente o rótulo automático “Registro anterior”.

### 4.2 Auditoria e encaminhamento de procedimento

- Reutilizar o encaminhamento atual: somente eventos/procedimentos selecionados recebem
  `encaminhado_para`; a Ficha e sua autoria não mudam de dono.
- O destinatário continua com escrita estreita: pode alterar apenas os campos hoje autorizados do
  procedimento encaminhado; nunca a evolução nem outros procedimentos da Ficha.
- `dentista_id` permanece o autor original e `realizado_em` permanece a data clínica. Nenhum dos
  dois representa “quem alterou por último”.
- Toda alteração autorizada gera uma entrada imutável em `activity_logs`, com
  `entity_type = odontograma_evento`, `entity_id = eventoId`, `actor_id`, snapshot `actor_nome`,
  `created_at` do servidor e metadata do tipo de mudança.
- A escrita clínica e o log são atômicos na mesma RPC/transação. O helper assíncrono
  `registrarLog` não atende este requisito porque pode falhar depois da alteração principal.
- A leitura mostra “Atualizado por {nome} em {data} às {hora}” e permite abrir o histórico. “Criado
  por” permanece separado. Nome snapshot preserva o registro exibido mesmo se o perfil mudar.
- Novos eventos de auditoria são adicionados ao catálogo tipado de `src/lib/events.ts`; RLS mantém
  leitura e inserção restritas à clínica ativa.

### 4.3 Estado de navegação e hierarquia

```text
type SuperficieProntuario =
  | { tipo: 'timeline'; filtro: FiltroClinico; scrollY: number; dente: number|null }
  | { tipo: 'registro'; atendimentoId: string; retorno: ContextoTimeline }
  | { tipo: 'tratamento'; fichaId: string; retorno: ContextoTimeline }
  | { tipo: 'editor'; modo: 'novo'|'editar'|'complementar'; fichaId: string|null;
      atendimentoOrigemId: string|null; retorno: ContextoProntuario };
```

Somente uma superfície pode existir por vez. `novo`, `editar` e `complementar` são modos distintos;
abrir para leitura nunca ativa o editor. Voltar restaura filtro, dente selecionado e posição.

- Os três contadores do resumo são botões-disclosure: atendimentos abrem visitas recentes,
  tratamentos abrem a Ficha correspondente e pendências abrem os itens indicados. Acima deles,
  cada tratamento em curso mostra nomes dos procedimentos, realizados/total e barra de progresso.
- O odontograma do resumo ocupa 620–760 px no desktop, sem scroll interno. Clicar num dente lista
  procedimento, tratamento e data. “Abrir registro” abre o Atendimento exato; “Abrir tratamento”
  abre o tratamento. Se houver mais de um destino, o dentista escolhe antes de navegar.
- Orçamentos aparecem apenas como link contextual quando relacionados; valores permanecem na aba
  Orçamentos, evitando duas fontes visuais financeiras.
- Arquivos sem vínculo com Atendimento continuam na aba Arquivos e entram no resumo por data.
- `paciente_documentos` não possui Ficha/Atendimento; só documento com vínculo verificável em
  `documentos_aceite.ficha_id` aparece dentro da visita. Os demais nunca são atribuídos por
  proximidade de horário.
- Abrir uma visita troca a timeline por leitura detalhada no mesmo contexto. O cabeçalho persistente
  mostra `← Prontuário / Registro de {data}`; em tratamento, `← Prontuário / {nome}`. “Histórico
  Clínico” não nomeia uma página concorrente. Voltar preserva filtro, dente e posição da timeline.
- A linha separa estado clínico de organização: `A fazer`/`Realizado` alteram `status`; “Levar para
  próxima sessão” altera apenas `momento_planejado` do indicado. O pendente priorizado fica amarelo;
  os demais ficam coral e realizados azuis. Dente e chip exibem sempre o mesmo estado/cor.
- O cabeçalho de Procedimentos oferece uma única ação “Coletar assinatura”; o modal permite um,
  vários ou todos os realizados sem `assinatura_id`. Depois de assinado, correção clínica cria
  complemento/retificação com nova autoria e data, sem sobrescrever o snapshot assinado.
- “Registrar atendimento” reutiliza a bancada clínica do Meu Dia com paciente já selecionado e sem
  trilho de agenda. Salva pelo mesmo orquestrador idempotente, com `origem='ficha'` e
  `agendamentoId=null`; não cria agenda. Após salvar, abre a visita persistida e deixa assinatura e
  encaminhamento visíveis. “Editar odontograma” reutiliza o componente anatômico e seus editores.
- O bloco de retorno oferece “Marcar retorno” no `MarcarRetornoModal` quando vazio. Quando já
  existe, oferece somente “Ver na agenda”; qualquer alteração acontece na Agenda, sem dois caminhos
  concorrentes para editar o mesmo agendamento. Para chamar isso de retorno **da visita**, a criação
  grava uma referência anulável ao Atendimento de origem; sem essa referência, o rótulo obrigatório
  é “Próximo agendamento do paciente”.
  **Decisão aprovada em 31/08/2026:** adicionar `agendamentos.atendimento_origem_id` anulável;
  histórico permanece `NULL` e não será reinterpretado.
- Assinatura não fica escondida em materiais. A ação do cabeçalho abre o fluxo granular atual com
  todos os procedimentos realizados e ainda não assinados da visita; indicados não entram. Por
  padrão vêm selecionados, mas o dentista pode desmarcar. Se a visita tocar mais de uma Ficha, a UI
  agrupa os elegíveis e gera uma coleta/documento por Ficha, respeitando a regra atual da RPC.
  Assinatura concluída vira “Ver documento assinado” e entra em Documentos do paciente, sempre no
  snapshot congelado; novos procedimentos sem assinatura geram nova coleta sem alterar a anterior.
- “Ver odontograma completo” amplia, no mesmo contexto, o mapa anatômico e os detalhes referentes
  à visita aberta. É leitura do registro histórico, não edição silenciosa do passado. Para preencher
  algo novo, “+ Novo registro” troca a superfície pela mesma bancada clínica do Meu Dia, com o
  paciente pré-selecionado e sem o trilho da agenda; ao salvar, retorna ao prontuário atualizado.
- Em visita aberta, a ação global chama-se apenas “Editar ficha”. A bancada abre com o dente
  selecionado e evolução manual; antes da assinatura, altera campos autorizados. Depois, cria
  complemento/retificação sem reescrever o snapshot. No próximo atendimento, itens priorizados entram como
  “Planejado para hoje”, ainda pendentes; só ação explícita do dentista os torna realizados.
- O adaptador legado `FichasTab` nunca inicia `viewingEvo` e `isPanelOpen` ao mesmo tempo. Na entrada
  por dente/registro ele recebe intenção explícita de leitura ou edição e renderiza apenas uma delas.

### 4.4 Legado e documentos

- Evolução sem Atendimento vira item `evolucao_legada`; Ficha sem evolução vira `ficha_legada`,
  sempre com data/autor originais e sem backfill destrutivo.
- Ficha só-texto abre o renderer legado atual; não tenta fabricar eventos.
- Documento assinado mostra o snapshot congelado. A timeline nunca reconstrói um documento antigo
  a partir de dados atuais.
- Exportação ganha agrupamento por Atendimento sem remover a seção histórica por ficha durante a
  fase de compatibilidade.
- Materiais permanecem `nao_informada` até o R-140d criar persistência real; câmera/OCR/estoque não
  são simulados nesta entrega.

## 5. Estados e comportamento

| Estado | Tela | Ação |
|---|---|---|
| Sem registro | resumo + vazio instrutivo | iniciar pelo Meu Dia/Agenda |
| Carregando | skeleton por resumo/timeline | sem layout shift grande |
| Sucesso | visitas decrescentes | carregar mais preserva posição |
| Filtro vazio | mensagem + limpar filtro | não parece ausência de prontuário |
| Legado | rótulo + renderer atual | leitura/exportação completas |
| Rastreabilidade pendente | chip neutro/ação | completar sem editar a evolução |
| Assinado | azul + selo/documento | edição bloqueada; complemento cria entrada nova |
| Sem permissão de escrita | tudo legível permitido | ações ocultas/desabilitadas com motivo |
| Erro parcial | bloco afetado com retry | restante do prontuário continua visível |
| Visita aberta | leitura completa sem status manual | voltar preserva contexto; editar só o autorizado |
| Complementar visita | odontograma histórico permanece imutável | nova evolução/procedimento entra na Ficha escolhida com autoria e data próprias |
| Procedimento encaminhado | destino e autor original visíveis | destinatário altera somente o procedimento |
| A fazer | dente e chip coral | autor pode editar, encaminhar ou priorizar para próxima sessão |
| Próxima sessão | indicado priorizado em amarelo | reaparece como “Planejado para hoje”; não realiza sozinho |
| Realizado sem assinatura | dente e chip azuis | pode coletar assinatura; não encaminha |
| Sem retorno | bloco “Retorno” vazio | marcar pelo modal atual sem sair do prontuário |
| Retorno existente | data, hora e dentista | abrir na Agenda; alteração acontece lá |
| Tudo assinado | documento e horário visíveis | abrir snapshot; nenhuma sobrescrita |
| Destino aberto pelo dente | um registro ou tratamento escolhido | uma única superfície, já no destino correto |
| Retorno de registro/editor | contexto anterior conhecido | breadcrumb claro e restauração de filtro/dente/scroll |

## 6. Tokens e referência visual

- **Artefatos:** v5 preserva o resumo; v6 foi superado; `R-140c-prontuario-organizacao-proxima-
  sessao-v7.html` separa estado clínico de planejamento e foi aprovado em 31/08/2026.
- **Direção:** arquivo clínico editorial compacto, não dashboard de métricas.

| Elemento | Contrato |
|---|---|
| Largura | leitura 760–880 px + resumo lateral em desktop; uma coluna no mobile |
| Odontograma do resumo | 620–760 px desktop; largura total mobile; inteiro e sem scroll interno |
| Tipografia | DM Serif Display/Georgia só no título; Outfit na interface; mono em datas/dentes |
| Cores clínicas | azul `#69aff0` realizado; coral `#ff8a82` a fazer; amarelo `#fbbf24` próxima sessão |
| Linha do tempo | borda/divisor, sem card aninhado em cada campo |
| Motion | 150–200 ms em filtro/expansão; `prefers-reduced-motion` respeitado |

| Token do artefato | Valor |
|---|---|
| `--background` / `--surface` | `#080b0b` / `#0d1110` |
| `--foreground` / `--muted` | `#f4f2eb` / `#9daba7` |
| `--border` / `--border-strong` | `#25302e` / `#34423f` |
| `--brand` / `--brand-soft` | `#55d9c0` / `#102d28` |
| `--done` / `--todo` / `--next` | `#69aff0` / `#ff8a82` / `#fbbf24` |
| `--radius` / `--radius-lg` | `12px` / `18px` |

## 7. Invariantes

- [ ] Timeline não duplica evento registrado/realizado na mesma seção.
- [ ] Filtrar tratamento não altera ou reparenta dados.
- [ ] Odontograma compacto deriva do mesmo reduce canônico.
- [ ] Conteúdo assinado, orçamento e documento congelado não são recalculados pela UI.
- [ ] Paginação não esconde metade de um Atendimento.
- [ ] Alterar procedimento encaminhado nunca troca seu autor original nem a data de criação.
- [ ] Alteração clínica e respectivo log persistem juntos ou falham juntos.
- [ ] Toda Ficha aparece uma vez na projeção moderna ou em fallback; nenhuma é descartada por não
      possuir evolução, Atendimento ou texto.
- [ ] Texto `null` não vira resumo, frase automática ou autoria falsa.

## 8. Gates de aceite

- [ ] Paciente com 3 tratamentos e visita tocando 2 mostra 1 visita + 2 evoluções identificadas.
- [ ] A fazer/Realizado alteram status; Próxima sessão só prioriza o indicado e mantém cor coerente.
- [ ] Selecionar tratamento filtra corretamente e “Tudo” restaura a linha do tempo.
- [ ] Ficha legada, documento assinado, PDF, Arquivos e orçamento continuam acessíveis.
- [ ] Perfil com 500 atendimentos carrega primeira página sem buscar/renderizar tudo.
- [ ] Secretária/dentista/admin veem somente ações autorizadas; duas clínicas provam isolamento.
- [ ] Na visita aberta, autor muda status/momento, edita detalhe e encaminha somente procedimento
      não assinado; destinatário altera só o item recebido; auditoria mostra ator e horário reais.
- [ ] Tentativa de alterar outro procedimento da mesma Ficha é negada e não cria log órfão.
- [ ] Marcar retorno cria um único agendamento; retorno existente abre a Agenda para alteração.
- [ ] Ação no cabeçalho seleciona um/vários/todos os realizados sem `assinatura_id`; depois da
      assinatura, “Editar ficha” cria complemento e o documento aparece em Documentos do paciente.
- [ ] Visita com elegíveis de duas Fichas mostra todos, mas persiste um documento por Ficha.
- [ ] Documento assinado antigo permanece imutável ao adicionar procedimento ou nova assinatura.
- [ ] “Ver odontograma completo” não altera o registro; “Novo registro” usa a bancada do Meu Dia.
- [ ] Dente → destino → “Abrir registro” mostra uma única visita; nenhum formulário vazio aparece.
- [ ] Abrir tratamento, editar, complementar e voltar percorrem estados exclusivos e previsíveis.
- [ ] O cabeçalho deixa “Prontuário” e a ação de voltar identificáveis em 375/768/1440 px e teclado.
- [ ] “Novo registro” cria Atendimento `origem='ficha'` sem Agenda; retry não duplica e o sucesso
      abre a visita salva com assinatura/encaminhamento disponíveis conforme elegibilidade.
- [ ] Contadores abrem conteúdo navegável; odontograma expandido fica inteiro em 768/1440 px.
- [ ] Clicar dente de visita inicia complemento na Ficha escolhida; evolução manual e “Próxima
      sessão” salvam sem alterar o passado; a próxima visita mostra “Planejado para hoje” pendente.
- [ ] Dataset de regressão contém Ficha sem evolução, evolução sem texto, Atendimento legado sem
      relações, importação só-texto e documento sem vínculo clínico.
- [ ] Exportação preserva seção por Ficha e acrescenta agrupamento por Atendimento/fallback.
- [ ] Artefato aprovado, light/dark, 375/768/1440 px, teclado e rolagem passam no navegador.

## 9. Fora de escopo e pós-entrega

- Não fundir as abas nem criar diagnóstico/sumário por IA ou nova taxonomia odontológica.
- Pós-entrega: validar uma tela de referência e produção antes de substituir “Ficha” nas demais superfícies.

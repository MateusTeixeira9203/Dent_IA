# R-125a — Captura clínica contextual, manual e sem atrito

> **SPEC** · **R-125a** · ✅ concluído e verificado
> **Aberto:** 2026-08-22 · **Fechado:** 2026-08-22 · **Fase:** aplicado e testado
> **Depende de:** R-122/R-123 como contrato visual; R-106 e R-49 como motores já existentes.
> **Migration 150:** aplicada. Recria a RPC de save com encaminhamento atômico; zero coluna/tabela nova.

> **Verificação:** usuário validou no localhost com duas contas da mesma clínica: criar indicado,
> encaminhar para outro dentista, persistir o destino após nova edição e impedir encaminhamento
> de evento realizado.

## 1. Problema

O dentista nem sempre registra enquanto o paciente está na cadeira; muitas fichas são montadas
logo depois da consulta. Hoje ele precisa alternar entre Campo Mágico, odontograma, detalhes e
vários inputs. O MultiDent foi elogiado porque reduz esse atrito, mas ainda é tratado como um
modo especial. O status também pode nascer por inferência, quando a decisão clínica deve ser do
dentista.

O resultado desejado não é “mais IA”: é uma entrada única e previsível que funcione por clique,
texto ou voz, sempre gere os mesmos cards e nunca esconda o que será salvo.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| MultiDent vira a gramática padrão com 1+ dentes | manter fluxo por dente e lote separados | o mesmo gesto deve funcionar em qualquer seleção |
| Procedimentos ficam em cards fora do mapa | escrever detalhes dentro do odontograma | preserva anatomia e espaço de revisão |
| Quatro modos manuais mapeiam os eixos atuais | criar status persistente `em_andamento` | novo status contaminaria orçamento, assinatura, PDF e histórico |
| Campo Mágico usa a seleção atual como contexto | pedir o dente novamente no texto | elimina repetição sem perder precisão |
| Novo × planejado é origem de fluxo transitória | sobrecarregar `origem` clínica/preexistente | são conceitos diferentes |
| Encaminhar fica no card e aceita lote | modal separado depois de salvar | o destino deve ser decidido junto da revisão |
| Todo caminho produz `OdontogramaEventoDraft` | manter estados paralelos por tela | uma estrutura e uma persistência evitam divergência |
| Texto/voz continuam opcionais | obrigar modo voz | o campo mais rápido depende do hábito do dentista |

## 3. Objetivo e como funciona

**Objetivo:** registrar uma consulta com o mínimo de gestos, mantendo status, origem e destino
sob controle explícito do dentista.

O dentista seleciona um ou mais dentes, escolhe o contexto clínico uma vez e lança por ação
rápida ou texto. O card aparece imediatamente em **Novo nesta consulta** e o símbolo correspondente
aparece no odontograma. Procedimentos carregados de antes ficam em **Planejado antes**. Status,
observação, material e encaminhamento são revisados nos próprios cards antes de salvar.

## 4. Contrato técnico

### 4.1 Tipos e função única de criação

```typescript
export type ModoLancamento =
  | 'realizado_hoje'
  | 'a_fazer'
  | 'proxima_sessao'
  | 'preexistente';

export type FonteFluxoDraft = 'planejado' | 'novo';

export interface ContextoLancamento {
  capturaId: string;
  dentes: number[];
  modo: ModoLancamento;
  encaminharParaId: string | null;
}

export interface OdontogramaEventoDraft {
  // campos atuais
  fonteFluxo?: FonteFluxoDraft;       // transitório
  encaminhadoParaId?: string | null; // validado e persistido no save
  chaveCaptura?: string;             // transitório; idempotência dentro da captura
}
```

Uma função pura passa a ser a única conversão de modo para os eixos existentes:

| `ModoLancamento` | status | origem | momento | realizado_em |
|---|---|---|---|---|
| `realizado_hoje` | realizado | clinica | sessao_atual | data da consulta |
| `a_fazer` | indicado | clinica | sessao_atual | null |
| `proxima_sessao` | indicado | clinica | proxima_sessao | null |
| `preexistente` | realizado | preexistente | sessao_atual | null |

`criarEventosContextuais(tipo, ancora, contexto, detalhe?)` é consumida por `FaixaLote`,
restauração, procedimento avulso e sugestão local. Nenhum desses caminhos volta a hardcodar
`status: 'indicado'` por conta própria. `capturaId + chaveCaptura` reutiliza o mesmo UUID em
retry; um novo envio explícito cria outra captura e pode registrar legitimamente o mesmo ato em
outra sessão.

### 4.2 Regras do Campo Mágico

- Com dentes selecionados, a seleção vira contexto; “restauração com resina” não pede os dentes
  novamente. Sem seleção, o texto precisa informar a localização ou o card fica em revisão.
- Match determinístico de tipo/catálogo roda antes da IA. A IA só organiza relato completo ou
  campos de especialidade; nunca é chamada a cada tecla.
- O debounce atual de `/api/dex/detectar-consulta` sai desse fluxo. Enquanto digita, somente
  `casarProcedimentoLocal` e validações locais podem mudar a interface.
- A saída é aditiva: IDs estáveis, deduplicação explícita e merge sem sobrescrever correção
  manual. O texto permanece no campo até sucesso do save ou limpeza explícita.
- No caminho manual, o modo escolhido pelo dentista define o status. No relato livre, o R-106
  pode **sugerir** status, mas o card continua revisável e a correção manual sempre vence.
- Negação continua sem gerar evento realizado. Saída inválida não adiciona metade do resultado.
- `tipo: 'outro'` preserva o texto exato em `observacao`; essa descrição também alimentará o
  orçamento no R-125b.

### 4.3 Novo × planejado

- Evento carregado do banco entra como `fonteFluxo: 'planejado'`.
- Evento criado nesta captura entra como `fonteFluxo: 'novo'`.
- O campo é só de apresentação e é removido por `montarRowsEventos`.
- `origem: 'preexistente'` continua significando condição já existente, não “planejado antes”.
- Reorganizar com Dex nunca duplica um evento planejado nem converte correção manual em sugestão.

Em evento planejado, o dentista escolhe explicitamente:

- **Concluir hoje:** transforma o indicado em realizado.
- **Registrar sessão e manter aberto:** mantém o indicado e cria um irmão realizado com o mesmo
  `grupo_id`; a leitura atual deriva “em andamento” sem valor novo no banco.
- **Manter indicado:** nenhuma mutação.

### 4.4 Encaminhamento direto

- Só evento `indicado` pode ser encaminhado.
- Ação **Encaminhar** abre seletor por nome com dentistas/admin ativos da mesma clínica, nunca
  secretária, protético ou o próprio autor.
- Seleção de vários cards aplica um destino ao lote. O card mostra o nome, não UUID.
- Draft novo guarda `encaminhadoParaId`; evento já persistido continua podendo usar
  `encaminharProcedimento`.
- A migration 150 amplia `salvar_eventos_odontograma` para aceitar `encaminhado_para` e validar
  destino, autoria, clínica, status indicado e ficha não assinada dentro da transação.
- No JSON da RPC, campo ausente significa **preservar o destino existente**; `null` significa
  remover explicitamente. Editar uma ficha antiga nunca limpa encaminhamento por omissão.
- Falha no encaminhamento falha o save dos eventos; nunca aparece sucesso com destino perdido.

### 4.5 Save idempotente

O cliente cria `capturaId` por ação explícita de organizar/aplicar e mantém um mapa
`capturaId + chaveCaptura → eventoId` durante retries. A mesma resposta é materializada com os
mesmos IDs e a RPC atual faz upsert; um novo envio intencional gera outro `capturaId`. Não se
deduplica só por descrição ou status, pois o mesmo procedimento pode ocorrer em sessões distintas.

O `fichaRascunhoId` já retornado pelo checkpoint continua sendo reutilizado no Meu Dia. A
migration 150 não cria coluna e não toca fichas antigas.

Se os eventos falharem, a ficha textual permanece, o rascunho não é limpo e o usuário não avança.
O retorno deixa de ser apenas um toast: mostra **Eventos ainda não sincronizados · Tentar de
novo**. O R-125b impede gerar orçamento enquanto esse checkpoint não terminar.

### 4.6 Componentes

| Componente | Responsabilidade depois do R-125a |
|---|---|
| `CampoMagicoMeuDia` / `CapturaLivreCard` | entrada livre + contexto selecionado; sem regra de persistência |
| `FaixaLote` | ações rápidas com 1+ dentes e modo manual ativo |
| `lote-multidente.ts` | usa `criarEventosContextuais`; funções continuam puras |
| `NestaSessaoBloco` | separa planejado antes × novo nesta consulta |
| `RegistroCard` | status, observação, detalhe e encaminhamento; desenho atual preservado |
| `RegistrarPainel` / `FichasTab` | compõem as mesmas peças; não duplicam regra clínica |
| `salvarFicha` | idempotência, persistência dos eventos e erro explícito |

## 5. Comportamento — alvo funcional

| Estado | O que a tela mostra | Regra |
|---|---|---|
| Sem seleção | Campo Mágico livre + orientação curta no mapa | quick action dental desabilitada |
| 1+ dentes | contexto “46” ou “16, 17, 18” + ações rápidas | qualquer ação usa a seleção inteira |
| Modo manual | pill ativa e persistente na consulta | começa seguro em `a_fazer` |
| Planejado carregado | seção `Planejado antes` | editar não cria cópia |
| Novo | seção `Novo nesta consulta` | mapa reflete o draft imediatamente |
| Ambíguo pela IA | `Confira` | nunca vira realizado silenciosamente |
| Encaminhado | nome do destino + ação remover/trocar | UUID nunca é exibido |
| Salvando | `DexLoader`, ações bloqueadas | `capturaId` permanece o mesmo |
| Falha de evento | card e texto intactos + retry | não avança, não abre orçamento |

```text
selecionar dentes → escolher/reusar modo → chip ou texto
  → criar OdontogramaEventoDraft estável
  → card em “Novo nesta consulta” + símbolo no mapa
  → revisar status/observação/destino
  → salvar com capturaId → ficha e eventos confirmados → limpar rascunho
```

## 6. Referência visual e design brief

- **Base vinculante:** R-123 no Meu Dia e R-122 na ficha completa. Não muda perfil do paciente,
  cabeçalho, odontograma, `RegistroCard` nem rodapé aprovado.
- **Base visual:** reutilizar fielmente o artefato aprovado R-123 e a ficha R-122; esta entrega
  reorganiza os controles já existentes, sem criar uma segunda faixa visual de navegação.
- O painel clínico lateral continua com as abas navegáveis existentes: `Odontograma` (padrão),
  `Histórico`, `A fazer` e `Anexos`. Ao trocar de aba, o conteúdo substitui o mapa dentro do
  próprio painel; não existe uma faixa adicional abaixo da bancada. O detalhe dental também abre
  nesse painel e oferece retorno claro ao odontograma.
- Hierarquia: Campo Mágico → revisão/atalhos/cards → painel lateral por abas → ações finais.
- Os atalhos de rotina, a faixa do dente selecionado, os modos manuais e “Outro procedimento”
  ficam dentro de **Revisão da consulta**, acima dos cards. O odontograma permanece como mapa
  de seleção/leitura: ao selecionar um dente à direita, os controles contextuais atualizam na
  revisão à esquerda. Isso elimina o espaço ocioso da revisão e evita que o painel do mapa vire
  um segundo formulário.
- A faixa **Registrar procedimento** é recolhível, começa aberta e se recolhe depois que um
  registro é adicionado. Fechada, mantém um resumo curto da seleção e pode ser reaberta com um
  toque; não perde dente, modo ou rascunho.
- **Observação da visita** é uma seção recolhível independente. Vazia, fica fechada; preenchida,
  mostra uma linha de prévia e a ação Editar. Recolher nunca apaga o texto.
- Os procedimentos da revisão usam a variante compacta do `RegistroCard`: título, status,
  próxima sessão e ações essenciais permanecem visíveis; material/técnica/intercorrência e
  metadados aparecem ao expandir. Só um card fica aberto por vez. A ficha completa mantém a
  variante atual sem mudança.
- O cabeçalho da lista mantém contagem, **Encaminhar**, **Tudo indicado** e **Tudo feito** fora
  da rolagem dos cards. A lista, não a bancada inteira, absorve o crescimento vertical.
- Desktop mantém painel dental ≥460 px; mobile segue Campo → revisão → mapa → ações.
- Reusar os tokens documentados no R-122/R-123, Outfit e raio 10 px. Motion de 140–180 ms só
  ao inserir card, expandir observação e confirmar destino; respeitar `prefers-reduced-motion`.
- Ações frequentes ficam visíveis; campos de material/técnica/intercorrência expandem sob demanda.

## 7. Invariantes

- [ ] Status persistido continua binário: `indicado | realizado`.
- [ ] IA nunca transforma correção manual em outra coisa.
- [ ] Todo gesto de entrada converge para `OdontogramaEventoDraft`.
- [ ] Digitar não dispara IA; somente “Organizar com Dex” faz chamada remota.
- [ ] Cards ficam fora do odontograma; o mapa continua sendo seleção e leitura visual.
- [ ] Evento novo e planejado nunca são confundidos ou duplicados.
- [ ] Retry da mesma captura usa os mesmos IDs e não duplica eventos.
- [ ] Encaminhamento mantém autoria e respeita clínica, papel e assinatura.
- [ ] Editar outro campo de evento encaminhado preserva o destino quando o payload o omite.
- [ ] Nenhum dado antigo é apagado ou reclassificado pela migration.

## 8. Gates de aceite

- [ ] G1 — selecionar 46, modo Realizado hoje e Canal cria card realizado com data e símbolo.
- [ ] G2 — selecionar 16/17/18 e Coroa cria três drafts com um gesto, sem duplicata por clique duplo.
- [ ] G3 — restauração aceita várias faces e mostra todas antes de aplicar.
- [ ] G4 — digitar “canal com AH Plus” com 46 selecionado cria endodontia no 46 e preserva detalhe.
- [ ] G5 — procedimento planejado carregado e procedimento novo aparecem em seções diferentes.
- [ ] G6 — “não fiz o canal” não cria canal realizado; ambiguidade mostra `Confira`.
- [ ] G7 — encaminhar dois indicados a Ana mostra o nome e persiste o destino; realizado é recusado.
- [ ] G8 — duas materializações/saves com o mesmo `capturaId` mantêm a contagem de eventos.
- [ ] G9 — falha simulada da RPC mantém texto/cards, bloqueia avanço e retry persiste tudo.
- [ ] G10 — dentista de outra clínica e secretária não conseguem forjar destino (teste 2 contas).
- [ ] G11 — Meu Dia e ficha completa geram payload equivalente para a mesma entrada.
- [ ] G12 — 375, 768 e 1440 px passam sem corte, ação atrás do teclado ou regressão do R-123.
- [ ] G13 — digitar por mais de 2 segundos não chama API; “Organizar com Dex” chama uma vez.
- [ ] G14 — “Registrar sessão e manter aberto” cria irmão realizado com o mesmo `grupo_id` e
      mantém o indicado visível.

## 9. Fora de escopo

- Terceiro status `em_andamento`, brilho do odontograma em tempo real e transcrição permanente.
- Símbolos anatômicos (R-115), periograma e novos parsers de especialidade.
- Mudança de permissão da secretária ou transferência de autoria clínica.
- Relação com orçamento e correção de itens reaparecendo — contrato do R-125b.

# R-154 — Plano de tratamento fluido no Meu Dia

> **SPEC** · **R-154** · 🔵 ativo
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** aprovada
> **Plano funcional e artefato visual aprovados pelo usuário:** 2026-09-04
> **Ajuste complementar aprovado:** revisão com lista rolável; sem novo artefato, pois não muda comportamento
> **Depende de:** R-149 (revisão legível) · preserva R-51/R-52/R-108b

## 1. Problema

O bloco “Plano e histórico” deveria ser o lugar onde o dentista encontra o plano de tratamento já
montado pelas indicações clínicas e o histórico que dá contexto a ele. Hoje essa organização fica
incompleta: o servidor reduz eventos sem grupo por procedimento+âncora e pode esconder uma
indicação independente; o cliente filtra por responsabilidade e deixa procedimentos de colegas
apenas no histórico. “Registrar hoje” também mantém o evento simultaneamente na revisão e na fila
até o salvamento.

`A fazer`, `Próxima sessão` e a conclusão de encaminhados esperam `router.refresh()`. Em conexão
real essa espera parece falha e interrompe o ritmo do dentista.

## 2. Decisão

- O plano é automático: toda linha persistida com `status = 'indicado'` entra na projeção sem exigir
  montagem manual. Cada pendência é identificada pelo próprio `id`.
  Eventos de IDs diferentes nunca se substituem apenas por terem o mesmo procedimento e âncora.
- O plano mostra três filas, nesta ordem: **Minha fila**, **Recebidos por encaminhamento** e
  **Acompanhados por outro dentista**.
- O responsável atual é `encaminhadoParaId ?? dentistaId`. Registro próprio já encaminhado a
  terceiro fica acompanhado e somente leitura no Meu Dia.
- Autor ainda responsável altera momento, registra hoje e encaminha. Destinatário altera apenas o
  status pela RPC estreita de conclusão. Outro responsável é somente leitura.
- Alteração de momento e conclusão encaminhada são otimistas por evento. Falha restaura exatamente
  o estado anterior; sucesso reconcilia em segundo plano.
- “Registrar hoje” leva o mesmo `id` para a revisão, remove-o da fila e mostra “Será salvo como
  realizado”. Remover o draft devolve a pendência ao plano.
- Uma visita aberta no histórico expõe as pendências daquela ficha usando a mesma projeção do plano.
  Se a pendência estiver em `minha_fila`, ela oferece as mesmas ações de organização; recebida e
  acompanhada preservam as permissões da matriz, sem criar uma segunda pendência.
- “Ler tudo” abre o prontuário do paciente diretamente na ficha de origem. A navegação usa uma
  entrada nova no histórico do navegador, portanto Voltar, botão lateral e gesto retornam ao Meu
  Dia no mesmo atendimento.
- Não há transferência direta de autoria. Para assumir trabalho de colega continua obrigatório o
  encaminhamento explícito existente.

## 3. Objetivo

Durante uma consulta, o dentista abre uma única gaveta para consultar o plano de tratamento
automaticamente montado e o histórico clínico do paciente. Ele entende de quem é cada
responsabilidade e usa “Próxima sessão” para ordenar o próprio trabalho sem reload, duplicidade
visual ou atalho que altere autoria clínica.

## 4. Contrato técnico

### 4.1 Tipos internos

```ts
type GrupoPendenciaPlano = 'minha_fila' | 'recebida' | 'acompanhada';

interface PermissoesPendenciaPlano {
  alterarMomento: boolean;
  registrarHoje: boolean;
  concluirEncaminhada: boolean;
  encaminhar: boolean;
}

interface PendenciaPlanoView {
  pendencia: MeuDiaPendencia;
  grupo: GrupoPendenciaPlano;
  responsavelId: string;
  responsavelNome: string;
  momentoEfetivo: MomentoPlanejado;
  permissoes: PermissoesPendenciaPlano;
}

type MutacaoPlanoOtimista =
  | {
      tipo: 'momento';
      eventoId: string;
      anterior: MomentoPlanejado;
      proximo: MomentoPlanejado;
      token: string;
    }
  | {
      tipo: 'conclusao_encaminhada';
      eventoId: string;
      token: string;
    };
```

### 4.2 Matriz de responsabilidade

| Grupo | Condição | Momento | Registrar hoje | Concluir | Encaminhar |
|---|---|---:|---:|---:|---:|
| Minha fila | responsável = eu e autor = eu | sim | sim | não | sim |
| Recebida | responsável = eu e autor ≠ eu | não | não | sim | não |
| Acompanhada | responsável ≠ eu | não | não | não | não |

`responsavelNome = encaminhadoParaNome ?? dentistaNome`. A regra de classificação e a matriz vivem
numa função pura, não dentro do componente visual.

### 4.3 Fonte de dados

- `getMeuDiaData` continua com a query atual, sempre limitada por `clinica_id` e pelos pacientes do
  dia. A projeção de `pendencias` passa a percorrer `eventosRaw` e incluir toda linha `indicado`.
- `realizado` nunca entra em `pendencias`. O histórico continua lendo todas as ocorrências, sem
  alteração de agrupamento.
- `emAndamento` continua derivado quando um `grupo_id` indicado possui irmão realizado.
- `MeuDiaPendencia`, `alternarMomentoRegistro` e `atualizarStatusEncaminhado` mantêm seus contratos.
  Não há endpoint, schema, migration, policy ou status novo.

### 4.4 Histórico como contexto acionável

- Ao expandir uma visita, cada evento aberto é associado por `id` a seu `PendenciaPlanoView`.
  O histórico não recalcula autorização a partir de `MeuDiaVisita` nem cria cópia de estado.
- Item de `minha_fila` mostra `A fazer`/`Próxima sessão`, `Registrar hoje` e encaminhamento.
  O mesmo evento muda simultaneamente no topo do plano e no detalhe da visita; enquanto uma action
  dele está pendente, seus controles ficam bloqueados nos dois lugares.
- Item recebido mostra apenas a conclusão já autorizada. Item acompanhado é contexto somente leitura.
- “Ler tudo” navega com `router.push` para
  `/dashboard/pacientes/:pacienteId?tab=ficha-clinica&ficha=:fichaId`. A ficha do paciente consome
  `ficha` para abrir aquele tratamento, sem alterar o registro. `router.push` preserva o Meu Dia na
  pilha do navegador; nenhum botão de retorno paralelo é criado.

### 4.5 Projeção local e concorrência

- A projeção recebe as pendências canônicas, `meuDentistaId`, IDs presentes em `eventosDraft`,
  overrides de momento e IDs concluídos otimisticamente.
- IDs em draft ou concluídos otimisticamente não são renderizados nem contados.
- Mutações ficam indexadas por `eventoId`; somente o item em trânsito é bloqueado. Eventos distintos
  podem estar em trânsito ao mesmo tempo.
- Cada chamada recebe `token`. Uma resposta atrasada só altera o estado se ainda for a chamada
  vigente daquele evento.
- Troca de paciente elimina overrides, conclusões e tokens do paciente anterior. Resposta posterior
  desse contexto não pode alterar o paciente atual.
- Após sucesso, `router.refresh()` reconcilia histórico e dados canônicos em segundo plano; a UI não
  reverte enquanto espera. Quando a base alcançar o valor esperado, o override pode ser descartado.

## 5. Comportamento

### 5.1 Estados

- **Vazio:** nenhuma pendência visível → “Nenhum procedimento em aberto.”
- **Sucesso:** seções não vazias aparecem na ordem definida; `Próxima sessão` precede `A fazer`
  dentro de cada seção, preservando a ordem cronológica original em cada subconjunto.
- **Em trânsito:** o item muda imediatamente, fica com seus controles desabilitados e `aria-busy`.
- **Falha:** restaura grupo, momento e posição anteriores; toast usa a mensagem acionável da action.
- **Sem permissão/desatualizado:** mesmo rollback; nenhuma tentativa de contornar a guarda.
- **Carregamento inicial:** permanece responsabilidade do `loading.tsx` atual.

### 5.2 Caminhos

1. **Alterar momento:** aplicar override → reposicionar a linha → chamar
   `alternarMomentoRegistro` → sucesso mantém a projeção e atualiza “Desfazer” → falha remove o
   override → refresh em background somente no sucesso.
2. **Desfazer momento:** aplicar o valor anterior otimisticamente e usar a mesma action/rollback.
3. **Concluir recebido:** ocultar e descontar imediatamente → chamar
   `atualizarStatusEncaminhado(..., 'realizado')` → sucesso mantém oculto até reconciliação → falha
   restaura no mesmo grupo e posição.
4. **Registrar hoje:** adicionar `pendenciaParaDraft` com o mesmo `id` → derivação exclui esse ID do
   plano → revisão sinaliza que ainda será salvo → remover da revisão retira o ID do draft e o plano
   o deriva novamente da base.
5. **Encaminhar:** mantém o fluxo atual, não otimista. Só itens de Minha fila são elegíveis.
6. **Abrir ficha:** “Ler tudo” abre a ficha de origem no prontuário do paciente. Voltar no navegador
   retorna ao Meu Dia ainda no mesmo atendimento, sem recriar rascunhos locais.

### 5.3 Exemplos

- Duas indicações de restauração no dente 36, IDs `A` e `B`: ambas aparecem.
- Indicação `A` atualizada para realizado: `A` não aparece; `B` continua.
- Registro meu encaminhado à Dra. Ana: aparece em Acompanhados, “Responsável: Dra. Ana”, sem ação.
- Registro do Dr. Rui encaminhado para mim: aparece em Recebidos, apenas “Concluir encaminhado”.
- Registro do Dr. Rui sem encaminhamento: aparece em Acompanhados, sem botão “Concluir”.

## 6. Referência visual

- **Artefato:** `plans/artefatos/R-154-plano-tratamento-fluido.html`
- **Rota:** `/dashboard/meu-dia` · **Alvo:** gaveta “Plano e histórico” em `HistoricoBloco`
- **Base aprovada:** R-149 e as superfícies atuais do Dashboard, Meu Dia e Ficha.

| Elemento | Contrato |
|---|---|
| Cores | `bg-surface`, `bg-surface-alt`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-teal-ink`, `text-coral-ink`, `text-warning-ink` |
| Tipografia | Outfit no corpo; DM Serif Display nos títulos; DM Mono em datas e contadores |
| Card | padding 12px vertical / 14px horizontal; raio 14px; borda semântica |
| Ritmo | seção 16px; linhas 8px; identidade → metadado 4px; estado → ações 8px |
| Motion | 150–180ms, `opacity` + `y: 4px` e `layout`; redução de movimento remove `y` e duração |

Regras visuais:

- Renderizar somente seções não vazias. O plano automático ocupa o topo; “Próxima sessão” vem
  antes de “A fazer” dentro de cada seção e funciona como organização operacional, não como status
  clínico novo.
- “Próxima sessão” usa o destaque amarelo de planejamento. `Registrar hoje` mantém a ação primária.
- Após um divisor, o histórico preserva a ordem mais recente primeiro, a visita mais recente aberta
  e todos os controles existentes de detalhes, orçamento e importação. Na visita do próprio
  responsável, os procedimentos ainda abertos aparecem com as mesmas ações do plano; nas demais,
  o contraste é secundário e não sugere permissão inexistente.
- “Ler tudo” é uma saída clara para a ficha de origem, não um segundo painel dentro do Meu Dia.

### Revisão da consulta — contenção de lista

- Para muitos procedimentos, a revisão mantém cabeçalho, contador, ações secundárias e rodapé de
  salvamento estáveis. Só a área que contém as seções e cartões recebe scroll vertical.
- A altura desktop é responsiva à viewport, sem permitir que a lista empurre o restante da bancada.
  No celular, a página continua sendo a superfície de scroll; não criar scroll aninhado que conflite
  com teclado, foco e gesto nativo.
- Expandir um `RegistroCard` continua abrindo dentro dessa mesma lista e somente um card fica aberto.
  Nenhum campo, ação, regra clínica ou fluxo de salvamento muda.
- Não há artefato complementar por decisão explícita do usuário: é ajuste de contenção visual sobre
  interação já aprovada, não uma nova direção de interface.
- Minha fila mantém ações em primeiro plano. Recebidos usa ação única. Acompanhados usa contraste
  secundário, responsável explícito e nenhuma área clicável que sugira edição.
- Nome/localização quebram linha; não usar elipse no conteúdo clínico.
- A legenda “Será salvo como realizado” é metadado derivado do ID pré-existente, nunca status novo.

### Feedback do preview — 04/09

- No card de `Próxima sessão`, a pílula de estado e o botão de mesmo nome usam o mesmo amarelo e
  parecem duas marcações do mesmo fato. Manter a pílula como estado; o controle ativo perde o
  preenchimento amarelo ou muda para uma ação neutra, preservando contraste e leitura de seleção.
- Histórico compartilhado: qualquer profissional clínico que já pode ler a anotação pode abrir o
  detalhe de procedimentos estruturados (canal, implante e especialidades), mas em **modo leitura**.
  Não expor campos editáveis, salvar, registrar hoje, alterar momento, encaminhar ou assumir em
  registro de outro responsável. Este acesso é à informação clínica existente; não transfere
  autoria nem permissão.
- **Bancada do odontograma (05/09):** a altura de `920px` não é referência; ela fez os dois
  cards deixarem de caber como bancada. No desktop, o card do odontograma/ficha rápida define a
  altura natural da linha. A Revisão estica até a mesma altura e é a única superfície com scroll
  interno. Conteúdo clínico de implante, canal e demais especialidades expande o card direito e
  segue pela rolagem da página, sem recortar controles ou criar um segundo scroll.
- A aba `Regiões` sai. A faixa de boca, arcadas, quadrantes e manutenção ortodôntica aparece por
  padrão logo abaixo do odontograma; escolher uma região abre o controle regional existente no
  mesmo lugar. O clique num dente abre diretamente a ficha rápida (`ToothDetailPanel`); o cartão
  intermediário de histórico por dente deixa esse fluxo, pois o histórico longitudinal já vive em
  Plano e histórico. Dados e histórico existentes não são apagados.

## 7. Invariantes

1. Nenhum ID indicado é descartado por equivalência semântica com outro ID.
2. `dentista_id`, `encaminhado_para`, RLS e trilha clínica não mudam neste item.
3. Item acompanhado nunca expõe ação; recebido nunca ganha alteração de momento ou reencaminhamento.
4. Falha de action não deixa estado otimista permanente.
5. O mesmo evento aparece em no máximo uma superfície de revisão: plano ou revisão. Ele pode ser
   contextualizado na visita de origem no histórico, sempre pelo mesmo ID e sem nova cópia de estado.
6. Histórico, orçamento, salvamento final e importação permanecem funcionalmente idênticos e
   acessíveis abaixo do plano na mesma gaveta.
7. Toda query multi-clínica continua limitada pela clínica ativa.

## 8. Gates de aceite

1. Teste puro: dois `indicado` de mesma âncora/IDs distintos permanecem; `realizado` não entra.
2. Teste puro: grupo multissessão preserva todos os indicados e `emAndamento` correto.
3. Teste puro: próprio, recebido, próprio enviado e colega sem encaminhamento caem na matriz exata.
4. Teste puro: IDs em draft/conclusão otimista somem e o contador soma as três listas visíveis.
5. Teste de estado: sucesso, rollback, resposta fora de ordem, ações paralelas e troca de paciente.
6. QA: Registrar hoje aparece uma vez com a legenda e volta ao plano quando removido.
7. QA com duas contas: autor, destinatário e terceiro; `dentista_id` permanece o autor.
8. QA visual: plano e histórico acessíveis em desktop/mobile, light/dark, teclado, foco e
   `prefers-reduced-motion`.
9. QA: abrir uma ficha pelo histórico chega ao `fichaId` correto no prontuário; Voltar e gesto do
   navegador retornam ao Meu Dia com o atendimento original.
10. QA visual: com muitos procedimentos, desktop mantém cabeçalho e salvar acessíveis, a lista
    rola sem cortar o último cartão e o mobile conserva scroll de página com teclado utilizável.
11. Suíte completa + typecheck passam; lint do recorte não adiciona erro.

## 9. Fora de escopo

- Encaminhamento otimista, assumir diretamente, transferência de autoria ou edição de colega.
- Migration, limpeza de dados legados, mudança de RLS, API ou status clínico.
- Redesign geral do Meu Dia, histórico, orçamento, assinatura ou Ficha.
- Se pendências legadas mascaradas reaparecerem em volume, a limpeza vira item separado e auditável.

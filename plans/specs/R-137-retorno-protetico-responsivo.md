# R-137 — Retorno com protético e agenda mobile

> **SPEC** · **R-137** · 🔵 ativo
> **Aberto:** 2026-08-27 · **Fechado:** — · **Fase:** execução
> **Artefato:** aprovado pelo usuário em 2026-08-27 · **Migration:** nenhuma

## 1. Problema

“Marcar retorno” cria apenas o agendamento. O dentista precisa sair desse fluxo para enviar o
trabalho ao protético, embora o pedido ao laboratório já exista no agendamento comum. Inserir os
três campos diretamente no modal pioraria outro atrito: a coluna desktop cresceria e, no celular,
o dentista teria de rolar uma seção adicional.

No mobile há uma segunda perda: a implementação atual troca a agenda por inputs soltos de data e
hora. O dentista deixa de enxergar os horários livres justamente onde mais precisa operar com uma
mão.

### Achado de produção — 2026-08-27

A agenda não carrega em desktop nem mobile: `actions.ts`, marcado com `"use server"`, passou a
exportar o objeto `criarPedidoProteticoSchema`. No Next atual, esse módulo só pode exportar
funções assíncronas; por isso a chamada de disponibilidade falha antes de retornar os dias.

O modal também está alto demais no celular: Paciente, Data e Hora viraram três linhas, e o rodapé
com “Cancelar” fica fora da área alcançável. A direção aprovada inicialmente fica superada nestes
pontos: o próximo artefato precisa compactar o resumo para Paciente + Data/Hora lado a lado e
manter as ações sempre visíveis no rodapé.

### Validação visual de produção — 2026-08-27

Os prints mostram que a API retorna a semana completa, mas `RetornoMobileAgenda` filtrava a faixa
para mostrar apenas dias com grade/ocupação. Isso aparentava saltos de data (ex.: 31/08–02/09,
depois 07/09–09/09). A faixa mobile agora mostra a semana de trabalho completa — segunda a
sábado — em ordem cronológica, inclusive dia sem expediente. Domingo fica fora para os seis
cartões caberem sem rolagem horizontal; os rótulos são abreviações fixas de três letras, não o
nome longo retornado pelo locale. O padrão de seleção continua sendo o primeiro dia que tiver
horário livre. No desktop, a grade recebe colunas mais largas e mostra apenas o nome do dia;
mantém rolagem horizontal controlada quando a viewport não couber.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Protético é uma segunda etapa que **substitui** o conteúdo | Acordeão/toggle que expande no fim | Não aumenta a altura nem empurra o CTA |
| Desktop mantém a semana e troca só a coluna direita | Terceira coluna ou novo modal | Preserva contexto e evita sobreposição/nesting |
| Mobile mostra faixa da semana + slots livres do dia | Copiar as 5–7 colunas desktop | Colunas ficam ilegíveis ou exigem scroll horizontal |
| O pedido é opcional e só aparece com protético ativo | Mostrar seleção vazia | Não cria caixa morta para clínica sem laboratório |
| Reusar `pedidos_protetico` e as validações R-94 | Tabela/RLS/fluxo paralelo | O modelo já aceita `agendamento_id` e está em produção |
| Falha do pedido após criar o retorno vira sucesso parcial explícito + retry | Toast e fechamento automático | Não pode parecer que o laboratório recebeu quando não recebeu |
| `dataEntrega` nasce com a data do retorno, editável | Criar regra clínica nova entre as datas | A aprovação foi visual; mantém validação atual de “não passado” |
| Overflow de Arquivos é patch pontual separado | Misturar na mesma spec/commit | Não compartilha comportamento nem arquivos com o retorno |

## 3. Objetivo e como funciona

**Objetivo:** marcar um retorno e, quando necessário, enviar o pedido ao protético no mesmo fluxo,
vendo a disponibilidade real tanto no desktop quanto no celular e sem expansão vertical causada
pelos campos do laboratório.

O dentista escolhe o horário. “Incluir protético” troca para a etapa 2, preservando os dados do
retorno. Nela seleciona protético, entrega e instruções; “Marcar retorno e enviar” cria o
agendamento e vincula o pedido. No mobile, a semana vira uma faixa de dias e os horários livres do
dia selecionado viram alvos tocáveis.

## 4. Contrato técnico

### 4.1 Tipos

```ts
export type EtapaMarcarRetorno = 'retorno' | 'protetico';

export interface ProteticoOption {
  id: string;
  nome: string;
}

export interface PedidoProteticoRetornoForm {
  proteticoId: string;
  dataEntrega: string; // yyyy-MM-dd; inicia com a data do retorno
  observacao: string;
}

export interface MarcarRetornoForm {
  data: string | null;
  minutoDoDia: number | null;
  duracao: string;
  observacoes: string;
  pedidoProtetico: PedidoProteticoRetornoForm | null;
}

export type CriarRetornoResult =
  | {
      ok: true;
      agendamentoId: string;
      pedidoProteticoId: string | null;
    }
  | {
      ok: false;
      etapa: 'agendamento';
      error: string;
      conflitoDentista?: boolean;
      foraDoExpediente?: MotivoForaDoExpediente;
    }
  | {
      ok: false;
      etapa: 'validacao_protetico';
      error: string; // pedido inválido é barrado antes de criar o retorno
    }
  | {
      ok: false;
      etapa: 'pedido_protetico';
      error: string;
      agendamentoId: string; // retry usa este id; nunca cria outro retorno
    };
```

### 4.2 Actions

Em `src/app/dashboard/agendamentos/actions.ts`:

```ts
export async function listarProteticosAtivos(): Promise<
  | { ok: true; data: ProteticoOption[] }
  | { ok: false; error: string }
>;

export async function criarRetornoComPedido(input: {
  pacienteId: string;
  dataHora: string;
  duracaoMinutos: number;
  observacoes: string | null;
  dentistaId?: string;
  pedidoProtetico: PedidoProteticoRetornoForm | null;
}): Promise<CriarRetornoResult>;
```

- `listarProteticosAtivos` usa `requireClinicContext()`, filtra `clinica_id = clinicId`,
  `role = 'protetico'`, `ativo = true` e ordena por nome. Protético recebe erro de permissão.
- `criarRetornoComPedido` chama o contrato existente de `criarAgendamento`; sem pedido, encerra.
  Com pedido e `agendamentoId`, chama `criarPedidoProtetico` passando o mesmo paciente,
  dentista-alvo e agendamento.
- `criarPedidoProteticoSchema` passa a ser exportado e continua sendo a fonte única de validação
  de id, observação e entrega. `criarRetornoComPedido` executa seu `safeParse` **antes** de criar o
  agendamento; dado inválido retorna `validacao_protetico` e não grava nada.
- Se o segundo insert falhar, retorna `etapa: 'pedido_protetico'` com `agendamentoId`. O retry
  chama somente `criarPedidoProtetico`; o botão permanece desabilitado durante cada request.
- Não há transação nova: tornar os dois inserts atômicos exigiria RPC/migration e fica fora desta
  fatia. O estado parcial nunca é rotulado como sucesso completo.

### 4.3 Componentes e estado

| Alvo | Responsabilidade |
|---|---|
| `marcar-retorno-modal.tsx` | Casco aprovado, etapa local, carregamento da lista e resumo preservado |
| `retorno-semana-grid.tsx` | Semana desktop existente, sem perda de clique/ajuste de hora |
| `retorno-mobile-agenda.tsx` | Faixa semanal + slots do dia; mesma API `onSelecionar(data, minuto)` |
| hook compartilhado em `src/hooks/` | Form, submit, sucesso parcial, retry e reset usados pelos dois call sites |
| `paciente-detail-client.tsx` | Paciente e dentista-alvo; invalida a aba Agenda após sucesso |
| `registrar-painel.tsx` | Paciente/dentista do Meu Dia; mantém retorno independente do rascunho clínico |

`RetornoMobileAgenda` recebe as mesmas quatro props públicas de `RetornoSemanaGridProps`. Ele usa
`buscarDisponibilidadeSemana`, `DisponibilidadeDia` e `slotEstaLivre`; não cria nova query nem
reimplementa a regra de colisão. Para cada bloco livre, enumera pelo `intervaloMinutos` do dia e
filtra pela duração escolhida. Mudança de duração recalcula os slots e limpa a seleção se ela
deixar de estar livre.

A faixa mobile mostra segunda a sábado da semana, com os seis cartões visíveis na largura móvel;
domingo não é um destino móvel. Dia sem slot mostra estado vazio e continua navegável. O servidor
permanece a decisão final, porque a agenda pode mudar entre carregar e confirmar.

### 4.4 Dados e segurança

- Reusa `pedidos_protetico.agendamento_id`, `protetico_id`, `dentista_id`, `paciente_id`,
  `observacao`, `data_entrega` e a policy `pedidos_protetico_access`.
- Nenhuma migration, policy ou tipo de banco muda.
- Toda leitura/escrita nova é confinada ao `clinicId` de `requireClinicContext()`.
- Secretária pode escolher apenas dentista/admin ativo da clínica, conforme actions atuais.

## 5. Comportamento — o alvo funcional

### Estados

| Estado | Quando | Tela | Função |
|---|---|---|---|
| Sem protético | lista retorna `[]` | “Incluir protético” não aparece | retorno normal permanece |
| Carregando agenda | troca de semana/dentista | skeleton compacto; CTA sem horário | não agenda |
| Carregando protéticos | modal abre | ação secundária desabilitada | retorno normal não é bloqueado |
| Sem slots no dia | disponibilidade vazia para a duração | “Nenhum horário livre neste dia” | permite escolher outro dia/semana |
| Sucesso sem pedido | retorno válido | fecha + toast com data/hora | grava só agendamento |
| Sucesso com pedido | dois inserts válidos | fecha + toast único | grava retorno e pedido vinculado |
| Validação protético | id/data/observação inválidos | permanece na etapa 2 + erro | não cria retorno nem pedido |
| Falha do agendamento | conflito/permissão/DB | permanece na etapa 1 | não tenta pedido |
| Falha do pedido | retorno criado, pedido falhou | aviso explícito + “Tentar enviar novamente” | retry não recria retorno |
| Sem permissão | outro tenant/role protético | erro sem dados da outra clínica | nenhuma escrita |
| Slot desatualizado | outro evento ocupou o horário | erro atual do servidor | recarrega disponibilidade |

### Caminho principal

```text
abre Marcar retorno
  → carrega semana e protéticos ativos em paralelo
  → escolhe dia/horário + duração + observações
  → sem laboratório: Marcar retorno
  → com laboratório: Incluir protético substitui o painel
      → escolhe protético + entrega + instruções
      → Marcar retorno e enviar
  → action cria agendamento
  → se houver pedido, cria pedidos_protetico com agendamento_id
  → sucesso fecha; falha parcial fica na etapa 2 e oferece retry do pedido
```

### Exemplos concretos

| Situação | Sistema faz | Resultado |
|---|---|---|
| Clínica sem protético | oculta ação secundária | retorno não ganha campo morto |
| Sexta com slots 09:00 e 14:30 | mostra ambos no mobile | toque em 14:30 atualiza o form/resumo |
| Duração muda de 30 para 120 min | recalcula disponibilidade | slot que não comporta 120 min some e é desmarcado |
| Volta da etapa 2 | preserva protético e retorno | pode editar horário sem perder instruções |
| Pedido falha após retorno | mantém `agendamentoId` | retry cria somente o pedido |
| Secretária escolhe Dra. Ana | usa esse id nos dois registros | retorno e pedido ficam com a mesma responsável |

## 6. Referência visual

- **Artefato aprovado:** `plans/artefatos/R-137-retorno-protetico-responsivo-v4.html`
- **Rotas:** `/dashboard/pacientes/[id]` e `/dashboard/meu-dia`
- **Componente:** `src/components/pacientes/marcar-retorno-modal.tsx`
- **Temas:** light e dark obrigatórios; zero cor hardcoded na implementação.

Tokens extraídos por JavaScript do artefato servido em HTTP:

| Papel | Artefato (light / dark) | Implementação com tokens existentes |
|---|---|---|
| Fundo | `#f4f4f6` / `#0d0d0d` | `bg-bg` |
| Superfície | `#ffffff` / `#111112` | `bg-surface` |
| Input/chip | `#ececef` / `#1c1c1e` | `bg-surface-alt/50 dark:bg-surface-alt` |
| Borda | `#c8c8cd` / `#2e2e32` | `border-border/90 dark:border-border` |
| Texto | `#09090b` / `#fafafa` | `text-text-primary` |
| Secundário | `#59606b` / `#a1a1aa` | `text-text-secondary/90 dark:text-text-secondary` |
| Acento | `#2f9c85` | `teal` existente |
| Primário | `#1f7564` / `#3ca991` | `bg-teal-dark dark:bg-teal`; hover por opacidade |
| Acento suave | `#e7f4f0` / `#17332e` | `bg-teal-pale` / `text-teal-ink` |
| Tipografia | `DM Serif Display` / `Outfit` / `DM Mono` | `font-heading` / `font-sans` / `font-mono` |
| Geometria | modal `18px`; input/CTA `10px`; alvo `44px`; mobile `26px` | `rounded-2xl`, `rounded-xl`, `min-h-11`; casco mobile conforme artefato |
| Espaçamento | cabeçalho `14×20`; painel `17`; resumo `11×16` | escala 3/4/5 existente, sem valor arbitrário novo |

**Estrutura e microcópia obrigatórias:**

- Desktop: semana à esquerda; painel à direita alterna sem aumentar a largura/altura. Casco de
  até `1080px` e `calc(100vw - 1.5rem)`, até `680px` de altura, com conteúdo rolável e ações
  fora dele.
- Mobile: Paciente ocupa uma linha; Data e Hora dividem a linha seguinte; faixa de segunda a
  sábado, sem domingo, com rótulos `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`; “Horários livres”;
  duração; observações. O casco preserva margem da viewport e o rodapé com Cancelar + CTA fica
  sempre visível.
- Desktop: a grade semanal preserva os sete dias, com colunas mínimas de `96px`, sem o número da
  data no cabeçalho; a largura excedente usa rolagem horizontal controlada.
- Etapa 2: “Enviar ao protético”, resumo “Retorno preservado”, Protético, Entrega até,
  O que precisa ser feito, Voltar ao retorno, Marcar retorno e enviar.
- Depois de preenchido, voltar preserva os valores. Motion de troca 150–200 ms, sem fade solto,
  respeitando `prefers-reduced-motion`.

## 7. Invariantes

- [ ] Perfil do paciente e Meu Dia usam o mesmo modal, tipos e fluxo de submit/retry.
- [ ] Nenhuma query ou insert novo existe sem `clinica_id = active clinic`.
- [ ] Desktop conserva grade semanal, ajuste de hora, duração livre e observações atuais.
- [ ] Mobile nunca exige scroll horizontal; os seis dias da semana de trabalho e os slots têm no
  mínimo 44px.
- [ ] Slots mobile vêm de `buscarDisponibilidadeSemana` + `slotEstaLivre`, nunca de cálculo paralelo.
- [ ] O servidor continua decidindo conflito e fora do expediente no momento do submit.
- [ ] Falha do pedido nunca desfaz silenciosamente o retorno nem exibe sucesso completo.
- [ ] Retry do pedido reutiliza `agendamentoId`; nunca cria agendamento duplicado.
- [ ] Clínica sem protético continua concluindo retorno normal sem bloqueio.
- [ ] Nenhuma regra nova vincula `dataEntrega` a ser anterior/igual ao retorno.

## 8. Gates de aceite

- [ ] Desktop 1280px: semana permanece visível ao alternar Retorno ↔ Protético; zero scroll novo
  causado pela etapa 2; voltar preserva todos os campos.
- [ ] Mobile 360, 390 e 412px: segunda a sábado e slots cabem sem corte/scroll horizontal,
  rótulos não se sobrepõem e CTA permanece alcançável.
- [ ] Desktop: cabeçalho da semana tem somente os nomes dos dias; cada coluna tem pelo menos
  `96px` e a barra horizontal só aparece quando a região da agenda não comportar a grade.
- [ ] Alterar duração recalcula slots e remove seleção que deixou de caber.
- [ ] Sem protético ativo, ação “Incluir protético” não renderiza e o retorno conclui normalmente.
- [ ] Com protético, os dois registros compartilham paciente, dentista e `agendamento_id`.
- [ ] Data passada, observação vazia ou protético inválido mantêm a etapa 2, mostram o erro e não criam retorno nem pedido.
- [ ] Falha simulada no segundo insert mantém o retorno único e o retry cria só o pedido.
- [ ] Agenda alterada entre carregar e confirmar devolve erro honesto e recarrega a semana.
- [ ] Dentista/secretária de outra clínica não lista nem endereça protético fora da clínica ativa.
- [ ] Perfil do paciente e Meu Dia completam o mesmo fluxo em light e dark.
- [ ] Comparação visual na mesma largura não diverge do artefato aprovado em estrutura, ordem,
  geometria ou microcópia.
- [ ] Testes puros cobrem enumeração por duração, passado, almoço, colisão e fim do bloco; depois
  passam `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.
- [ ] QA final em localhost com clínica de teste; nenhuma escrita de verificação em produção.
- [ ] Arquivo com `"use server"` não exporta schema, constante ou objeto; só funções assíncronas
  ficam como exports de runtime.

## 9. Fora de escopo

- Overflow da barra de filtros/ações em `DocumentosTab.tsx` — patch pontual separado.
- Redesign da agenda principal, perfil do paciente ou Meu Dia fora do modal.
- Alterar o bloco “Enviar pro protético” do Novo agendamento existente.
- Migration, nova policy RLS ou RPC transacional para os dois inserts.
- Notificação por WhatsApp/e-mail, anexos, negociação de prazo ou laboratório multi-clínica.
- Regra clínica que obrigue entrega antes ou no mesmo dia do retorno.

# R-102 — Compromisso pessoal na agenda

> **SPEC** · **R-102** · status: aprovada 11/08 — execução
> **Aberto:** 2026-08-11 · **Fechado:** — · **Fase:** plano + contrato técnico
> **Modelo:** Sonnet (execução) · escalar pra Opus só se a mescla visual bloqueio+consulta
> nas 3 grades (§4.6) abrir ambiguidade não coberta aqui, ou se a RLS precisar divergir do
> padrão reusado em §2

<!-- Seções 1–3 nascem no debate/planejamento; 4–10 no contrato. -->

## 1. Problema

Todo agendamento hoje pressupõe um paciente — `agendamentos.paciente_id` é `NOT NULL`. Não
existe jeito do dentista bloquear a própria agenda por um compromisso pessoal (médico,
evento). Frase dele: *"podemos criar algo q seria tipo um compromissos pessoal pro dentis ai
ele ativa e coloca o dia de q hrs ate q hrs"*.

**Zero código hoje.** É conceito novo na agenda: tabela nova, sem tocar `agendamentos`.

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Tabela nova `agenda_bloqueios`** | Tornar `agendamentos.paciente_id` opcional | ~25 call sites leem `apt.paciente.nome`/`.id` sem optional chaining (`today-agenda.tsx`, `atendimentos-hoje.tsx`, e o próprio **Meu dia** em `get-meu-dia.ts:661`); a RPC de conflito e o insert do bot de WhatsApp tratam `paciente_id` como não-nulo. Tabela isolada não obriga auditar nenhum desses |
| `data_hora` + `duracao_minutos` (mesma forma de `agendamentos`) | `inicio`/`fim` timestamptz explícitos | Reusa 100% da matemática de render (`calcularFaixas`, `getAptStyle`) e o campo Duração (chips + minutos livres) que já existe no modal — hora fim nasce de início+duração, igual toda consulta já funciona hoje |
| Botão + Dialog dedicado (Compromisso pessoal) | Toggle de modo dentro do Dialog Novo agendamento | O dialog atual tem 3 blocos que só existem com paciente (busca, cadastro rápido, bloco do protético R-94) — esconder os 3 e ramificar o submit inteiro é mais código e mais risco do que um Dialog novo que não toca em nada existente |
| Conflito: aviso + marcar mesmo assim nos 2 sentidos | Bloqueio intransponível (hard block) | A própria instrução do pedido aponta pra a mesma lógica de conflito que agendamento de paciente já usa — hoje isso já é overridable (`forcarConflitoDentista`). Criar uma 2a classe de conflito sem override (hoje só existe pro paciente cross-dentista, que protege impossibilidade física) não tem paralelo nem necessidade clara |
| RLS idêntica a `agendamentos_access` (dono OU secretária) | Secretária só enxerga, não cria | Ela já cria/edita/cancela consulta de qualquer dentista hoje. Negar só a criação do bloqueio não protege dado nenhum (não é clínico) e reintroduz a barreira física que já matou o modo consulta uma vez (dentista precisa estar no PC pra bloquear a própria agenda) |
| `dentista_id` com `on delete cascade` | `on delete restrict` (como o R-94 fez em `pedidos_protetico`) | R-37/R-94 protegem dado com valor clínico ou de negócio que sobrevive ao dono (prontuário, pedido de laboratório). Um bloqueio de agenda não carrega nenhum — não há nada a preservar se o dentista for apagado |
| Sem RPC SECURITY DEFINER nova | RPC dedicada, espelhando `paciente_tem_conflito_agenda` (migration 099) | O conflito de bloqueio nunca cruza o silo entre dentistas — quem chama já enxerga (é o dono, ou é secretária) tudo que precisa pra decidir, sem vazar agenda de outro dentista |
| Fora do Meu dia / dashboard hoje | Também aparecer nos widgets de próximo agendamento | O pedido foi especificamente sobre a agenda (`/dashboard/agendamentos`). Meu dia é o fluxo clínico (núcleo do produto) e um bloqueio não tem paciente pra registrar — fica de fora até haver pedido explícito |

## 3. Objetivo

Dentista (ou secretária, em nome dele) escolhe dia + hora de início + duração e aquele
intervalo passa a contar como ocupado em toda a agenda: aparece nas 3 visões, entra na
checagem de conflito nos dois sentidos, e some da lista de horários que o bot de WhatsApp
oferece ao paciente.

## Escopo

**Cobre:** criar/editar/excluir um compromisso pessoal (dono ou secretária); aparece nas
visões Dia/Semana/Mês com estilo visual distinto de consulta; conflito com consulta existente
avisa e pede confirmação, nos dois sentidos; RLS com a mesma privacidade que a agenda já tem
hoje; horário bloqueado some do bot de WhatsApp e da grade de Marcar retorno.

**Não cobre:** Meu dia / dashboard hoje / widget de próximo agendamento; sincronia com
Google Calendar; recorrência (toda quinta de manhã); notificação de bloqueio criado pela
secretária; qualquer mudança em `agendamentos` ou no seu schema.

## Assunções

- Campo de título é opcional; vazio mostra o rótulo genérico Compromisso pessoal na grade.
- ele ativa da frase original é lido como abre o fluxo (clica um botão), não um toggle de
  liga/desliga persistente — não existe um estado ativo/inativo, só existe/não existe (excluir
  é o cancelamento). Sem coluna `status`: um bloqueio não tem ciclo de vida como consulta.
- Sem bloqueio de data no passado — mesmo comportamento (ausência de checagem) que
  `agendamentos` já tem hoje; diverge de `pedidos_protetico` (R-94) de propósito, pra ficar
  consistente com o que estende.

---

## 4. Contrato técnico

### 4.1 Schema

```sql
create table agenda_bloqueios (
  id              uuid primary key default gen_random_uuid(),
  clinica_id      uuid not null references clinicas(id) on delete cascade,
  dentista_id     uuid not null references dentistas(id) on delete cascade,
  data_hora       timestamptz not null,
  duracao_minutos int not null check (duracao_minutos > 0),
  titulo          text,
  criado_por      uuid references dentistas(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index agenda_bloqueios_dentista_data_idx
  on agenda_bloqueios (clinica_id, dentista_id, data_hora);

create trigger agenda_bloqueios_updated_at
  before update on agenda_bloqueios
  for each row execute function update_updated_at();
```

Próximo número de migration livre no momento da escrita: **137** (`20260810210000_136_...`
é o mais recente) — confirme o mais recente em `supabase/migrations/` antes de aplicar.

### 4.2 RLS

```sql
alter table agenda_bloqueios enable row level security;

-- Mesma regra que agendamentos_access ja tem hoje (migration 099): dono OU secretaria.
-- Nao inventa modelo novo, so estende o silo existente pro conceito novo.
create policy agenda_bloqueios_access on agenda_bloqueios
  for all to authenticated
  using (belongs_to_active_clinic(clinica_id) and is_own_clinical_record(dentista_id))
  with check (belongs_to_active_clinic(clinica_id) and is_own_clinical_record(dentista_id));
```

`is_own_clinical_record(dentista_id)` = dono (`get_my_dentista_id()`) OU role secretaria
(já existe, migration 089). Confirmado: agenda hoje é privada por dentista — só a secretária
tem visão ampla; admin não é caso especial.

**Defesa em profundidade:** mesmo que a server action aceite um `dentistaId` de qualquer
chamador (ver 4.4), o insert/update só se sustenta se a RLS aprovar — um dentista comum
tentando criar bloqueio pra outro esbarra no `with check`, a action não precisa lembrar disso.

### 4.3 TypeScript — tipos

```typescript
// src/app/dashboard/agendamentos/page.tsx — ao lado de AgendamentoRow
export interface BloqueioRow {
  id: string;
  clinica_id: string;
  dentista_id: string;
  data_hora: string;              // ISO
  duracao_minutos: number;
  titulo: string | null;
  criado_por: string | null;
  dentista: { id: string; nome: string } | null;  // join, so populado pra secretaria
}
```

### 4.4 Zod + Server actions

Novas, em `src/app/dashboard/agendamentos/actions.ts` (mesmo arquivo de todo o resto da
agenda, mesma convenção do R-94 com `criarPedidoProtetico`):

```typescript
const compromissoPessoalSchema = z.object({
  dataHora:       z.string().min(1),            // construido via buildClinicDatetime no client
  duracaoMinutos: z.coerce.number().int().min(5).max(600),
  titulo:         z.string().trim().max(120).nullable().optional(),
  dentistaId:     z.string().uuid().optional(),  // so a secretaria informa
  forcarConflito: z.boolean().optional(),
});

export async function criarCompromissoPessoal(input: {
  dataHora: string; duracaoMinutos: number; titulo: string | null;
  dentistaId?: string; forcarConflito?: boolean;
}): Promise<{ error?: string; id?: string; conflito?: boolean }>;

export async function atualizarCompromissoPessoal(
  id: string,
  input: { dataHora?: string; duracaoMinutos?: number; titulo?: string | null; forcarConflito?: boolean },
): Promise<{ error?: string; conflito?: boolean }>;

export async function excluirCompromissoPessoal(id: string): Promise<{ error?: string }>;
```

- `criarCompromissoPessoal` valida (quando `dentistaId` vem preenchido) que ele pertence a
  clinica ativa e tem role admin ou dentista — mesmo padrao de `criarPedidoProtetico`
  validando `proteticoId` (R-94). Conflito contra consulta existente reusa a mesma matematica
  de sobreposicao de `criarAgendamento` (`actions.ts:124-134`) e a mesma `janelaDeConflito`
  (ja modulo-privada no arquivo, zero duplicacao). Nao checa conflito contra outro
  bloqueio — dois bloqueios sobrepostos nao causam dano, a checagem seria desperdicio.
- `atualizarCompromissoPessoal`/`excluirCompromissoPessoal` conferem linhas afetadas
  (`.select()` ou `count`) antes de reportar sucesso — RLS barrada devolve 0 linhas em
  silencio; sem essa checagem a tela mente sucesso (mesma classe do R-66).
- Todo embed `dentistas` a partir desta tabela usa `!agenda_bloqueios_dentista_id_fkey` ou
  `!agenda_bloqueios_criado_por_fkey` explicito — a tabela tem 2 FKs pra `dentistas`,
  embed ambiguo e a mesma classe de bug do R-44/R-67/R-34.

### 4.5 Extensão dos pontos de escrita existentes

| Função | Arquivo | O que muda |
|---|---|---|
| `criarAgendamento` | `agendamentos/actions.ts:50` | Depois de buscar `agendamentosNoDia`, busca também `agenda_bloqueios` do `dentistaAlvo` na mesma janela. Um hit vira o mesmo `conflitoDentista: true` (mesmo botão marcar mesmo assim), com mensagem que nomeia o compromisso pessoal em vez de outro agendamento |
| `atualizarAgendamento` | `agendamentos/actions.ts:262` | O `select` de `atual` passa a trazer `dentista_id` também (hoje não traz — precisa pra saber de qual dentista checar bloqueio). Mesma checagem de `criarAgendamento`, na nova janela |
| `criarEncaixe` | `agendamentos/actions.ts:581` | Mesma extensão — cobre Atender agora (`atender-agora-modal.tsx`), que já chama `criarEncaixe` |
| `getDisponibilidadeSemana` | `lib/agenda/disponibilidade.ts:100` | 3ª query na semana (`agenda_bloqueios` do dentista), populando `ocupados` com um novo campo opcional `bloqueio?: boolean` em `OcupadoDia`. Único ponto que alimenta `sendHoraList` (bot de WhatsApp) e `RetornoSemanaGrid` — os dois passam a respeitar o bloqueio automaticamente, sem tocar no código deles |

### 4.6 Componentes

```
_components/compromisso-pessoal-dialog.tsx   -- NOVO, auto-contido (form + submit proprios)
  props: { open, onOpenChange, dentistas, isSecretaria, dentistaAtualId,
           editando?: BloqueioRow | null, onSalvo: () => void }
  chamado a partir de agendamentos-client.tsx -- a lista dentistas ja existe (mesma prop
  que Novo agendamento usa) e ja exclui secretaria/protetico (page.tsx:157)

agendamentos-client.tsx   -- botao Compromisso pessoal no header (entre Encaixe e Novo
  Agendamento, visivel sempre que canEdit -- dentista solo tambem precisa, nao so secretaria);
  recarregarAgendamentos passa a atualizar bloqueios junto

page.tsx   -- busca agenda_bloqueios da janela visivel (mesmo padrao de agendamentos),
  passa como prop bloqueios

week-view.tsx / day-view.tsx   -- recebem bloqueios: BloqueioRow[]; mesclam as caixas de
  bloqueio com as de agendamentos ANTES de chamar calcularFaixas (funcao pura, nao muda) --
  overlap entre bloqueio e consulta (caso de override) fica lado a lado, nao empilhado.
  Card do bloqueio sem seletor de status nem botoes clinicos: horario, titulo, icone Lock;
  clique abre o dialog em modo edicao

month-view.tsx   -- recebe bloqueios: BloqueioRow[]; intercala na lista vertical do dia
  selecionado por data_hora; card troca os botoes clinicos por Editar/Excluir
```

---

## 5. Comportamento

### Estados

| Estado | Quando | Tela | Função |
|---|---|---|---|
| Vazio | sem compromissos no dia | grade normal, sem card extra | — |
| Sucesso | compromisso criado | toast + card na grade | grava sem `paciente_id` (tabela própria) |
| Conflito com consulta | horário já tem paciente marcado | aviso + marcar mesmo assim | Zod ok, insert recusado até confirmar |
| Conflito com bloqueio (ao marcar consulta) | horário já bloqueado | mesmo aviso, mensagem nomeia o compromisso | idem, reusa o `conflitoDentista` já existente |
| Erro de validação | duração fora de 5–600min, dentista não é da clínica/role errado | erro no campo, não grava | Zod `fieldErrors` |
| Sem permissão | terceiro dentista tentando editar/excluir | RLS barra, action confere `count` | erro genérico, sem vazar existência da linha |

### Caminho principal

```
[dentista ou secretaria] clica Compromisso pessoal na tela de Agendamentos
  -> (secretaria) escolhe o dentista dono da agenda
  -> escolhe dia, hora de inicio, duracao (chips ou minutos livres -- fim = inicio + duracao)
  -> titulo opcional
  -> valida (Zod: duracao 5-600min, dentista da clinica e role correto)
  -> checa conflito com consulta ja marcada do mesmo dentista/janela
      -> se colide, avisa e pede confirmacao (marcar mesmo assim)
  -> insert em agenda_bloqueios
  -> aparece na grade (Dia/Semana/Mes) e some da lista de horarios do bot/retorno
```

### Exemplos concretos

| Situação | Sistema faz | Resultado |
|---|---|---|
| Dentista bloqueia sexta 14h–16h sem título | grava `titulo: null` | grade mostra Compromisso pessoal |
| Secretária tenta marcar consulta às 15h na mesma sexta | acha o bloqueio na janela | aviso de conflito com um compromisso pessoal, override disponível |
| Bot de WhatsApp lista horários de sexta | `getDisponibilidadeSemana` já exclui 14h–16h | paciente nunca vê esse horário como opção |
| Dentista B (outra agenda) abre a tela | RLS não devolve a linha do Dentista A | grade de B não mostra nada |
| Excluir um compromisso já apagado em 2ª aba | 2ª chamada acha `count === 0` | erro honesto, não finge sucesso |

## 6. Referência visual

Sem artefato novo — é aditivo a uma tela existente, reusando tokens/classes já em produção
(não é tela nova pro pipeline de design do CLAUDE.md):

- **Card do bloqueio** (Dia/Semana): mesma estrutura `rounded-md`/`rounded-xl` do card de
  consulta, mas paleta neutra (`border-border`, `bg-surface-alt`, `text-text-secondary`) em
  vez de uma cor de `STATUS_CONFIG` — não é mais um status, é ausência de paciente. Ícone
  `Lock` (lucide-react, import novo e trivial) no lugar do nome do paciente.
- **Dialog**: mesma anatomia dos outros modais da tela (cabeçalho com X, `Label` uppercase
  `text-teal-ink`, inputs `rounded-xl bg-surface-alt border-border`) — reaproveita as classes
  do bloco Quando do modal de Novo Agendamento (`agendamentos-client.tsx:1529-1601`: mesma
  grade Data/Hora + chips de duração).
- **Botão no header**: mesmo padrão visual de Encaixe (outline, ícone + label).

---

## 7. Fases de implementação

| Fase | Ações | Risco | Verificável | Depende de |
|---|---|---|---|---|
| **1 — Schema + RLS** | Migration única: tabela, índice, trigger, policy (§4.1/§4.2) | BAIXO | Aplicar local; `select` como 2 contas de teste confirma o silo (dono vê, outro dentista não, secretária vê os dois) | — |
| **2 — Actions + escrita existente** | `criarCompromissoPessoal`/`atualizarCompromissoPessoal`/`excluirCompromissoPessoal`; estender `criarAgendamento`/`atualizarAgendamento`/`criarEncaixe`; estender `getDisponibilidadeSemana` (§4.4/§4.5) | MÉDIO | Cenário manual dos 2 sentidos de conflito; horário bloqueado não aparece na lista simulada do bot | Fase 1 |
| **3 — Dialog + fio na tela** | Novo `compromisso-pessoal-dialog.tsx`; `page.tsx` busca a janela; botão + estado em `agendamentos-client.tsx` (§4.6) | BAIXO-MÉDIO | Criar/editar/excluir um bloqueio de ponta a ponta na UI | Fase 2 |
| **4 — Render nas 3 grades** | `day-view.tsx`/`week-view.tsx` mesclam nas caixas de `calcularFaixas`; `month-view.tsx` intercala na lista (§4.6) | MÉDIO | Bloqueio aparece nas 3 visões; overlap bloqueio+consulta (override) não quebra o layout existente | Fase 3 |
| **5 — Gates finais** | Rodar G1–G10 (§9), ênfase no G6 (2 contas) | BAIXO (só verificação) | Todos os gates fechados | Fases 1–4 |

### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Esquecer 1 dos 3 pontos de escrita de agendamento na checagem de bloqueio | média | Listados nominalmente em §4.5; G3/G4 testam os 3 caminhos (novo, editar, encaixe) |
| `getDisponibilidadeSemana` fica de fora (bot continua oferecendo horário bloqueado) | média | Gate G8 dedicado; é consumidor único documentado (`sendHoraList` + `RetornoSemanaGrid`) |
| Embed `dentistas` ambíguo (2 FKs na mesma tabela) | média | Convenção `!constraintname` explícita em toda query, citada em §4.4 (mesma classe do R-44) |
| Grade fica poluída misturando bloqueio + consulta | baixa | Reusa `calcularFaixas` já existente; estilo neutro sem nome de paciente diferencia visualmente |

---

## 8. Invariantes

- [ ] Compromisso pessoal nunca tem `paciente_id` — vive isolado em `agenda_bloqueios`,
      nunca em `agendamentos`.
- [ ] Toda query de `agenda_bloqueios` traz `clinica_id`; nenhum bloqueio cruza clínica.
- [ ] RLS espelha `agendamentos_access` 1:1 — dono OU secretária, nunca um terceiro dentista.
- [ ] `atualizarCompromissoPessoal`/`excluirCompromissoPessoal` conferem linhas afetadas
      antes de reportar sucesso.
- [ ] Nenhuma tabela clínica (`fichas`, `pacientes`, `orcamentos`, WhatsApp) lê ou referencia
      `agenda_bloqueios` — é puramente de agenda.
- [ ] `OcupadoDia` de um bloqueio nunca carrega `pacienteNome` — não pode aparentar ser paciente.
- [ ] Protético (role gateado pelo R-94 a `/dashboard/protetico`) nunca alcança esta tela nem
      esta tabela — nada aqui reabre o gate de ponto único.

## 9. Gates de aceite

- [ ] **G1** — Dentista cria compromisso pessoal (dia, hora início, duração, título opcional)
      e ele aparece na grade bloqueando o intervalo
- [ ] **G2** — O mesmo bloqueio aparece nas 3 visões (Dia, Semana, Mês) do dono
- [ ] **G3** — Criar consulta de paciente no horário do bloqueio avisa (menciona compromisso
      pessoal) e exige confirmação; sem confirmar, nada é salvo
- [ ] **G4** — Criar compromisso pessoal em cima de consulta já marcada avisa simetricamente
- [ ] **G5** — Secretária cria/edita/exclui compromisso para um dentista escolhido; aparece
      na agenda dele
- [ ] **G6** — **Gate de 2 contas logadas**: Dentista A não vê compromisso do Dentista B, nem
      por URL direta; só a secretária vê os dois
- [ ] **G7** — Excluir/editar confere linhas afetadas — RLS barrada não mente sucesso
- [ ] **G8** — Horário bloqueado não aparece na lista de horários do bot de WhatsApp
      (`sendHoraList`) nem na grade de Marcar retorno
- [ ] **G9** — Nenhum embed `dentistas` a partir de `agenda_bloqueios` sai ambíguo (checar
      os 2 FKs com `!constraintname`)
- [ ] **G10** — `/dashboard/protetico` (role protético) segue inacessível a partir desta tela;
      nada muda no gate do R-94

**G6 e G3/G4 definem o item.** Sem G6, é vazamento de agenda entre dentistas. Sem G3/G4,
bloquear a agenda é só decoração — a promessa central do pedido dele.

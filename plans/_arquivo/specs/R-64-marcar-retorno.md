# R-64 — Marcar retorno com grade de semana

> **SPEC** · fase **`fechada`** — aprovada por ele 06/08, artefato aprovado sem ressalvas.
> Auditoria (gate) rodada 06/08: 4 reviewers, 6 achados corrigidos, veredito no §10.
> **Aberto:** 2026-08-06 · **Fechado:** 2026-08-06
> **Modelo:** Sonnet 5. Contrato fechado, decisões tomadas na conversa; a extração de
> `whatsapp.service.ts` (F4) é o único ponto com risco de acoplamento não previsto — se
> revelar mais que o esperado, F4 pode virar sessão própria com Opus.
> **Sub-item de:** nenhum — item novo, não é R-46h (esse é "salvar + orçamento", item
> separado, ainda sem spec).
> **Nasce de:** conversa de 06/08, pedido dos dentistas ("não sei o que está livre pra
> remarcar"). Investigação técnica prévia por agente (Explore) mapeou o terreno antes da spec.
> **Referência visual:** [`artefatos/R-64-marcar-retorno.html`](../artefatos/R-64-marcar-retorno.html)
> — interativo, aprovado. Tokens no §9. **Nunca leia o HTML pro contexto** — abra no browser.

## 1. O problema (investigado, não estimado)

O `MarcarRetornoModal` de hoje ([`marcar-retorno-modal.tsx`](../../src/app/dashboard/pacientes/%5Bid%5D/_components/modals/marcar-retorno-modal.tsx))
é 4 campos soltos — data, hora, duração, observações — sem grade nenhuma. O dentista digita
uma data e hora **sem ver a própria agenda**: só descobre que colidiu com outro atendimento
depois de tentar salvar (os 2 checks de conflito de `criarAgendamento` já existem e barram,
mas barram tarde). Só existe esse único ponto de entrada, no perfil do paciente — o cockpit
do Meu dia (R-63) não tem nenhum.

**Achado que muda o desenho:** o sistema já tem disponibilidade configurada
(`horarios_disponiveis`, por dentista/dia da semana/intervalo) — só que **só o bot do
WhatsApp lê ela** (`whatsapp.service.ts:sendHoraList`). A Agenda do dashboard nunca cruzou
os 2. E tem um drift real: a migration `20260610000002_072_horarios_almoco.sql` (que
adiciona `almoco_inicio`/`almoco_fim`) **nunca foi aplicada em produção**, embora o código
(`configuracoes/actions.ts`, o tipo `HorarioDisponivel`) já espere essas 2 colunas — o
dentista pode configurar o almoço na tela de Configurações e a escrita falhar em silêncio.

`WeekView` (a grade real da Agenda, [`week-view.tsx`](../../src/app/dashboard/agendamentos/_components/week-view.tsx))
não dá pra encaixar num modal como está: recebe todos os agendamentos de todos os dentistas
não filtrados, mais `dentistas`/`isSecretaria`/`slotPorDentista`/`filtroDentistaId`/
`diaDestacado` e 5 callbacks — state inteiro da página da Agenda. Decisão dele ao vivo
(depois de ver a 1ª proposta, que trocava a grade por uma lista de pills): **não inventar
visual novo — trazer a mesma grade que a Agenda já tem, só menor e de 1 dentista só.**
`onSlotVazioClick`/`horaDoClique` da `WeekView` real já resolvem exatamente esse gesto
(clique no vazio → calcula hora pela posição) — o componente novo porta a mesma ideia.

## 2. Trava de segurança — o que este item NÃO pode mudar

| Intocado | Por quê |
|---|---|
| `criarAgendamento` — os 2 checks de conflito (dentista, paciente) e o insert em `agendamentos` | É a escrita real. A grade nova só ajuda a ESCOLHER um horário que não vai colidir — não substitui a validação server-side (I4) |
| `dentista_id` sempre o logado, nunca passado explícito | Mesmo comportamento de hoje. Quem marca retorno marca pra si |
| `WeekView`/`agendamentos-client.tsx` (a Agenda de verdade) | Zero mudança — o componente novo não reusa nem herda dela, é código próprio |
| `sendDateList` (WhatsApp) | Não muda — só `sendHoraList` passa a chamar o módulo compartilhado (F4), mesmo resultado + o fix do almoço de graça |
| Schema de `agendamentos` | Nenhuma coluna nova. Sem marcação de "isso é retorno" nesta versão (decisão §3) |

## 3. O que ele decidiu — esta conversa (06/08)

| # | Decisão | Como |
|---|---|---|
| D1 | Atualiza os **2 pontos de entrada** (perfil do paciente + rodapé do cockpit) — 1 modal só, não 2 implementações | Pergunta direta, respondida |
| D2 | Saltos (30/60/90/180d, 6m, 1a) partem de **hoje**, não de outra âncora | Pergunta direta, respondida |
| D3 | Corrige o drift de almoço **primeiro**, migration isolada, antes do resto do código | Pergunta direta — a alternativa (ignorar) nascia com bug visível no que o item promete resolver |
| D4 | **Sem coluna de tipo** — agendamento de retorno é indistinguível de qualquer outro nesta v1 | Pergunta direta — mais schema, menos valor imediato |
| D5 | Visual: **grade de hora real da Agenda, só menor** — não a lista de pills que eu propus na v1 do artefato | *"acredito q so trazer oq ja temos no sitema so q menor ja resolveria q eles ja estao abituados"* — rejeitou a v1 ao vivo, artefato v2 aprovado sem ressalva |

**Revisão ao vivo na execução (sessão de 06/08, depois do artefato aprovado) — ele testou o
código de verdade e pediu 4 ajustes, todos aplicados e verificados ao vivo:**

| # | Decisão | Como |
|---|---|---|
| D6 | Linha da grade **34px → 40px**; gutter 34→36px | "podemos deixar maior" ao ver renderizado — 34px (só do artefato) ficou pequeno demais pra ler/clicar de verdade |
| D7 | **Janela de horas dinâmica** — min/max de `livres` da semana carregada, não mais fixo 07h–20h | Mesmo pedido (D6): dentista com expediente curto ganha grade menor de graça, sem scroll. Fallback 08h–18h só quando não há NENHUM horário configurado |
| D8 | **Layout em 2 colunas** — grade à esquerda (rola até 58vh se precisar), coluna fixa de Hora/Duração/Observações/ações à direita (nunca rola) — mesmo padrão do "Novo agendamento" real (`agendamentos-client.tsx`) | "mesmo estilo que estamos usando pra criar um agendamento... assim fica como padrão do sistema" |
| D9 | Campo **Hora editável** (`input type=time`) ao lado da grade, sincronizado nos 2 sentidos com o clique | "fica muito impreciso que eu não consigo colocar a hora" — mesma cobertura que o "Novo agendamento" real já tem (clique aproxima, campo corrige) |
| D10 | **Hachura removida; clique liberado em qualquer dia/hora**, configurado ou não — revoga G2/G5 originais | "libere o clique no calendário todo" — quem trava de verdade continua sendo `criarAgendamento` (I4); a grade não é mais um limite de disponibilidade, só um apontador rápido de dia+hora |

## 4. Contrato

### 4.1 F0 — migration (isolada, primeiro)

O arquivo já existe e já está certo — **nunca foi aplicado**:

```sql
-- supabase/migrations/20260610000002_072_horarios_almoco.sql (já existe no repo)
ALTER TABLE horarios_disponiveis
  ADD COLUMN IF NOT EXISTS almoco_inicio time NULL,
  ADD COLUMN IF NOT EXISTS almoco_fim    time NULL;
```

`IF NOT EXISTS` — seguro rodar mesmo se uma aplicação parcial já tiver acontecido. Depois de
aplicada, `configuracoes/actions.ts:salvarHorarios` (que já tenta gravar essas 2 colunas)
para de falhar em silêncio. Zero mudança de código nesta fase.

### 4.2 F1 — módulo de disponibilidade compartilhado (novo)

`src/lib/agenda/disponibilidade.ts` — extrai e generaliza a lógica que hoje só existe
dentro de `whatsapp.service.ts:sendHoraList` (grade do dia → subtrai almoço → subtrai
ocupados → subtrai passado). Generaliza de "1 dia" pra "1 semana inteira" (é o que a grade
do modal precisa de uma vez).

```ts
export interface BlocoHorario { inicioMin: number; fimMin: number } // minutos desde 00:00

export interface OcupadoDia {
  inicioMin: number;
  duracaoMin: number;
  pacienteNome: string | null;
}

export interface DisponibilidadeDia {
  data: string;           // YYYY-MM-DD
  diaSemana: number;      // 0-6, domingo=0
  livres: BlocoHorario[]; // expediente MENOS almoço — dimensiona a janela de horas (D7),
                          // não desenha hachura nem trava clique (D10)
  ocupados: OcupadoDia[];
  intervaloMinutos: number; // não previsto na 1ª versão — sendHoraList (F4) precisa do
                             // passo fixo pra enumerar a lista; 30 quando não há grade
}

/** 1 chamada, retorna os 7 dias. `semanaInicioISO` é domingo (YYYY-MM-DD). */
export async function getDisponibilidadeSemana(params: {
  dentistaId: string;
  clinicaId: string;
  semanaInicioISO: string;
}): Promise<DisponibilidadeDia[]>;

/** Função pura. Só o `sendHoraList` do WhatsApp (F4) chama — o clique da grade (F2) NÃO
 *  chama mais desde D10 (clique liberado em qualquer horário). */
export function slotEstaLivre(
  minutoDoDia: number,
  duracaoMin: number,
  dia: DisponibilidadeDia,
  agora: Date,
): boolean;
```

`getDisponibilidadeSemana` faz 2 queries (não 7): `horarios_disponiveis` do dentista (todos
os dias da semana de uma vez) + `agendamentos` no intervalo `[semanaInicio, semanaInicio+7d)`
— mesmo padrão de "não pré-filtrar, buscar o intervalo inteiro" que `WeekView` real já usa.

Usa `createServiceClient()` (ignora RLS) — por isso o client nunca chama direto. A ponte é
`src/server/agenda/buscar-disponibilidade.ts` ("use server"): resolve `clinicId`/`dentistaId`
via `requireClinicContext()` e **rejeita se o `dentistaId` pedido não for o do próprio
dentista logado** — sem essa checagem, um `dentistaId` trocado no client devolveria a agenda
real (com nome de paciente) de outro dentista da clínica.

### 4.3 F2 — componente da grade + modal reescrito

**Local novo dos 2 arquivos — não ficam mais presos a `pacientes/[id]`:**
`src/components/pacientes/marcar-retorno-modal.tsx` (existente, movido + reescrito) e
`src/components/pacientes/retorno-semana-grid.tsx` (novo). Mesmo padrão que
`colar-do-word-dialog.tsx` já usa nesse diretório — componente de paciente compartilhado
entre rotas (`pacientes/[id]` e `meu-dia` já importam o Colar do Word de lá hoje).

```ts
export interface RetornoSemanaGridProps {
  dentistaId: string;
  clinicaId: string;
  duracaoMin: number;             // pra desenhar a barra do horário selecionado do tamanho certo
  selecionado: { data: string; minutoDoDia: number } | null;
  onSelecionar: (data: string, minutoDoDia: number) => void;
}
```

Dono dos dados (`getDisponibilidadeSemana`, semana atual, chip de salto ativo) é o próprio
`RetornoSemanaGrid` — estado de UI, não precisa subir pro modal. Só a SELEÇÃO final
(`selecionado`) é controlada de fora, porque o modal precisa dela pro resumo e pro confirmar.

```ts
export interface MarcarRetornoForm {
  data: string | null;      // YYYY-MM-DD — null até escolher na grade
  minutoDoDia: number | null;
  duracao: string;          // minutos, mesmo campo de hoje
  observacoes: string;      // mesmo campo de hoje
}
```

`MarcarRetornoModal` ganha `dentistaId`/`clinicaId` como props novas (a grade precisa saber
de quem é a disponibilidade). `onMarcarRetorno` continua chamando `criarAgendamento` —
converte `data`+`minutoDoDia` pro mesmo `data_hora` ISO que o form antigo já montava.
**Confirmar fica desabilitado até `data`/`minutoDoDia` não-nulos** (G da spec).

**Layout revisado (D8/D9)** — 2 colunas, mesmo padrão do "Novo agendamento" real: cabeçalho
custom + faixa ao vivo (Paciente/Data/Hora) no topo; corpo `flex-col sm:flex-row` com a
grade à esquerda (`flex-1`, rola só ela até `58vh` se precisar) e uma coluna fixa à direita
(`w-80`, nunca rola) com Hora (`input type=time`, habilita só depois do 1º clique, editável
e sincronizado nos 2 sentidos com `selecionado`), Duração (chips + campo livre, mesmas
opções do "Novo agendamento": 30/45/60/90/120/180min) e Observações (`textarea`). Rodapé da
coluna fixa: erro + botão primário full-width + "Cancelar" como link (não outline ao lado).

### 4.4 F3 — os 2 pontos de entrada

**Perfil do paciente** (`paciente-detail-client.tsx`): só atualiza o import
(`@/components/pacientes/marcar-retorno-modal`) e passa `dentistaId`/`clinicaId` novos —
zero mudança de comportamento fora disso.

**Cockpit** (`registrar-painel.tsx`): botão ghost novo "Marcar retorno" ao lado do
"Salvar" (rodapé do centro, §4.6 do R-63 já previa essa linha de ações terminais). Estado
`retornoModalAberto` local, mesmo padrão do resto do arquivo. `pacienteId`/`pacienteNome`
já chegam via props existentes.

### 4.5 F4 — `whatsapp.service.ts` passa a usar o módulo compartilhado

`sendHoraList` troca a query+loop inline por `getDisponibilidadeSemana` (só 1 dia da
resposta) + `slotEstaLivre`. Comportamento igual pros dentistas que não configuraram
almoço; corrige de graça os que configuraram (I2). `sendDateList` não muda — usa só
`dia_semana` de `horarios_disponiveis`, não precisa da grade completa.

## 5. Invariantes

| # | Invariante | Por que é invariante |
|---|---|---|
| **I1** | `criarAgendamento` continua a ÚNICA escrita — grade nova não grava nada direto | Toda a validação de conflito já mora lá; duplicar seria 2 fontes de verdade |
| **I2** | `sendHoraList` (WhatsApp) não pode oferecer MENOS horários do que hoje pros dentistas sem almoço configurado | F4 é refactor comportamento-preservando, não reescrita — regressão ali quebra agendamento real de paciente via bot |
| **I3** | Nenhuma coluna nova em `agendamentos` — retorno grava igual a qualquer outro agendamento (D4) | Decisão explícita desta sessão |
| **I4** | "Livre" calculado no cliente (grade) é só UX — `criarAgendamento` server-side é quem decide de verdade | Entre abrir o modal e confirmar, outro agendamento pode ter ocupado o slot — client nunca é a fonte final |
| **I5** | `slotEstaLivre` (função pura) é chamada uma vez só — pelo clique da grade. Nunca reimplementada num 2º lugar | Mesmo princípio já repetido no projeto (`responsavelPassaFiltro`, `dedupEventosDraft`): 2 leituras da mesma regra divergem em silêncio |

## 6. Gates de aceite

| # | Gate | Como verifico |
|---|---|---|
| G1 | Migration aplicada — `horarios_disponiveis` tem as 2 colunas em produção | `list_tables`/`execute_sql` (SELECT) via MCP do Supabase, ou SQL Editor |
| G2 | Modal do perfil do paciente abre com a grade da semana atual, janela de horas do dentista logado (min/max de `livres`, fallback 08h–18h sem grade) | Abrir de verdade, comparar com `horarios_disponiveis` do dentista de teste |
| G3 | Mesmo modal abre do rodapé do cockpit (Meu dia), mesmo comportamento | Clicar "Marcar retorno" ao lado do Salvar |
| G4 | Chip de salto (ex. 90 dias) pula a semana pra data-alvo e destaca a coluna | Clicar, conferir range exibido e coluna destacada |
| G5 *(revisado, D10)* | Clique em qualquer dia/hora da grade seleciona, configurado ou não — nunca mais bloqueia por hachura (removida) | Clicar num dia sem nenhum horário cadastrado, confirmar que seleciona |
| G5b | Campo "Hora" habilita só depois do 1º clique (precisa de uma data); editar o valor move a barra de seleção na grade pro novo horário | Clicar um dia, digitar outra hora, conferir a barra mover |
| ~~G6~~ | Removido (D10) — dia passado agora aceita seleção igual a qualquer outro; `criarAgendamento` não valida data passada e nunca validou | — |
| G7 | Confirmar grava via `criarAgendamento` — mesmas colunas de hoje, sem coluna de tipo nova | Conferir o insert (`agendamentos`) depois de confirmar, autorizado |
| G8 | Os 2 checks de conflito de `criarAgendamento` ainda disparam | Tentar marcar um horário que colide (2 abas, ou 2 cliques rápidos) |
| G9 | `sendHoraList` (WhatsApp) exclui o almoço quando configurado, mesmo resultado de antes quando não | Testar os 2 casos com dado real |

## 10. Auditoria de fechamento (gate) — 06/08

**Achado que mudou o método do G9:** o provider Meta é **stub** — o `fetch` real da Graph API
está comentado em [`meta.ts:117-135`](../../src/lib/whatsapp/providers/meta.ts), só há
`console.log`. `sendHoraList` **não dispara mensagem real hoje**, então "testar com dado real"
virou: dado real de `horarios_disponiveis`, conferindo o retorno da função (rota debug
temporária, deletada; zero mensagem enviada).

| Gate | Veredito | Evidência |
|---|---|---|
| G1 | ✅ | `SELECT` em produção: as 2 colunas existem |
| G2 | ✅ | Ao vivo na sessão #22; **reverificado 07/08** com sessão logada — grade abriu na semana atual, dentista de teste tem **zero** `horarios_disponiveis`, janela caiu no fallback dinâmico e expandiu até 20h pra caber um horário ocupado real fora do range padrão |
| G3 | ✅ | Ao vivo pelos dois — perfil (eu) e cockpit (ele, "100%") |
| G4 | ✅ | Chip "90 dias" ao vivo, exato após restart do dev server |
| G5 · G5b | ✅ | Ao vivo — são as próprias revisões D6-D10 |
| G7 | ✅ | Indireto (06/08): 1 agendamento real bateu exato, depois apagado. **Confirmado direto 07/08**: `criarAgendamento` gravou linha real (dentista/paciente/hora/duração/observações corretos, sem coluna de tipo — D4 intacto), apagada depois |
| G8 | ✅ **confirmado 07/08** | Tentei marcar retorno em cima de um agendamento real já existente (mesmo dentista) — bloqueou com "Este horário conflita com outro agendamento deste dentista.", erro inline na tela, modal ficou aberto, **nenhuma linha nova no banco**. Testei só o conflito de DENTISTA (o de paciente, sem override, exigiria 2º paciente com agenda cruzada — não montado) |
| G9 | ✅ | **2 rodadas.** 1ª: sem almoço → 10 slots 08h-17h com 12h; almoço 12h-13h → 9 slots, só o 12h ausente. 2ª (caso que o reviewer levantou, intervalo não-divisor): 08h-12h/50min → 4 slots, nenhum passando das 12h |

**07/08 — G2/G7/G8 reverificados numa sessão de teste dedicada** (conta "teste", ao vivo,
banco Supabase conferido em cada gate). R-64 não tem mais gate pendente — só falta o push.

**Reviewers:** `/security-review` (limpo — o check de autorização de
`buscar-disponibilidade.ts` verificado ponta a ponta) · `ux-reviewer` (**BLOCK**, 3 CRITICAL
WCAG + 4 HIGH) · `typescript-reviewer` (**BLOCK**, 3 HIGH) · `ponytail-review` (2 achados).
`qa-web` parcial — sem sessão logada.

**Corrigido nesta auditoria (6):** `text-coral`→`-ink` (2.99:1, reprovava AA) ·
`text-text-secondary/60`→`text-muted` (reprovava nos 2 temas) · `aria-label` nos 7 botões de
dia (todos idênticos pro leitor de tela) e nas 2 setas · `janelaHoras` expande pra caber hora
digitada fora do expediente (D10 permite; a barra renderizava fora da área visível) · dica
sob o botão quando Confirmar está desabilitado · `.eq('clinica_id')` na query de
`agendamentos` (violava a regra inegociável do CLAUDE.md) · `try/finally` nos 2
`handleMarcarRetorno` (exceção deixava o botão travado em "Salvando…" pra sempre) + o mesmo
fallback no `sendHoraList` · prop `clinicaId` morta cortada dos 5 arquivos que a
encadeavam · comentário órfão da hachura removida em D10.

**Decisão dele durante a auditoria:** `sendHoraList` novo exige que a duração **caiba
inteira** antes do fechamento; o antigo oferecia horário que estourava o expediente. Bate
menos que o antigo em expediente com intervalo não-divisor — I2 lido como "não perder horário
válido", não "preservar bug". Confirmado por ele: mantém o comportamento novo.

**Virou fila (⏳), não corrigido:** H2 (grade não diferencia expediente configurado de fora
dele — mexer nisso pode contrariar o D10) · H3 ("marcar mesmo assim" em conflito do próprio
dentista existe no `criarAgendamento` e no "Novo agendamento" real, mas o retorno não usa).

## 7. Fora de escopo

| O quê | Por quê fica de fora |
|---|---|
| Marcar o agendamento como "retorno" (coluna nova) | D4 — decidido fora desta v1 |
| R-46h (botão único salvar+orçamento) | Item separado, sem relação de dependência com este |
| Bloqueio de agenda / férias / folga do dentista | Não existe hoje em lugar nenhum do sistema — fora do que foi pedido |
| Reusar/refatorar `WeekView` da Agenda real | Investigado e descartado — acoplamento alto demais, componente novo é mais barato |
| Mobile/responsivo do modal novo | Nunca verificado em nenhum modal do cockpit ainda — mesmo status de C8 no R-63 |

## 8. Referência visual — tokens em texto

**Superado pelas revisões ao vivo D6–D10** — o artefato aprovado (grade 34px/hora, janela
fixa 07h–20h, hachurado) documentava a v2 aprovada ANTES da execução testar o código de
verdade. O que está no ar agora, medido ao vivo:

Tokens: `--color-teal-dark` no CTA (branco, **5.93:1**, mesma fórmula do R-63),
`--color-slate`/`--color-slate-pale` nos blocos de ocupado. Medidas: grade `40px`/hora,
gutter de hora `36px`, cabeçalho de dia compacto (`text-[9px]`/círculo `20px`). Janela de
horas **dinâmica** (D7) — não mais `07h`–`20h` fixo. **Sem hachurado** (D10, removido) — a
grade não usa mais `repeating-linear-gradient` nem `--color-text-muted`. Layout em 2 colunas
(D8) — grade + coluna fixa de inputs, mesmo padrão do "Novo agendamento" real.

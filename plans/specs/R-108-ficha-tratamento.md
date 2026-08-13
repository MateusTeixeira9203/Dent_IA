# R-108 — Ficha = documento de tratamento

> **SPEC** · **R-108** · 🔵 ativo
> **Aberto:** 2026-08-13 · **Fechado:** — · **Fase:** **`aprovada`** (por ele, 13/08)
> **Modelo:** Opus pra decidir o modelo de dado (feito, nesta spec); a execução das 2 fatias
> é aditiva e cabe em Sonnet.
> **Escopo:** o modelo e a leitura. **Nenhum caminho de escrita muda aqui.**
> **Irmãs:** [R-108b](R-108b-roteamento-da-visita.md) — o roteamento da visita, a mudança de
> comportamento; **depende desta.** · [R-109](R-109-registro-na-ficha.md) — peças de registro
> do Meu dia na ficha; **independente**, sobe em qualquer ordem.
> **Artefato:** [`artefatos/R-108-ficha-tratamento.html`](../artefatos/R-108-ficha-tratamento.html)
> — **✅ APROVADO por ele (v4, 13/08). É o contrato visual: a implementação COPIA.**
> **Origem:** debate longo com ele em 13/08, com 3 achados provados no dado de produção.
> **Predecessor:** [R-30](R-30-ficha-fonte-unica-procedimento.md) §7 marcou exatamente este
> item como *"item separado"* / *"spec própria"* dependente dele — e o R-30 está em produção
> desde 30/07. O pré-requisito já está satisfeito.

---

## 1. Problema

Hoje **ficha = uma visita**. Cada save do Meu dia cria uma ficha nova (`salvarVisitaMeuDia`
→ `salvarFicha` sem `fichaId`). Palavras dele:

> *"Montei o tratamento todo pra uma ficha e sair criando uma a toda visita é osso."*

Três defeitos, todos reproduzidos no banco de produção em 13/08:

**D1 — o evento fica ancorado na ficha errada.** "Fazer hoje" reusa o `id` do evento original
(proposital, evita pendência fantasma), e o `on conflict (id) do update set` da RPC
`salvar_eventos_odontograma` ([migration 137](../../supabase/migrations/20260811003000_137_odontograma_momento_planejado.sql):86)
atualiza tudo **menos `ficha_id`**. O evento fecha na ficha onde foi *planejado*; a da visita
nasce vazia.

Provas: endodontia 31 concluída 12/08 presa em ficha de **26/07** (17 dias); implante 48,
exodontia 36 e pino 45 concluídos 08/08 presos em ficha de 01/08.

**D2 — "layout antigo" e "tudo sem concluir" são o mesmo bug.** `FichasTab` escolhe o render
por `eventosVis.length > 0 ? novo : legado(teethNotes)`
([FichasTab.tsx:2131](../../src/components/pacientes/FichasTab.tsx:2131)) — ficha sem evento cai
no legado, que não tem conceito de status. Órfãs em produção: `7621dc2f` (13/08 — 4
procedimentos e 8 dentes em texto, **0 eventos**), `ae78db42`, `51e1c15b`.

**D3 — seis representações de procedimento convivem.** Nomeado no R-30 §7 e adiado lá. Uso
real medido em 13/08 (174 fichas, 612 eventos): `odontograma_eventos` é a fonte (R-30 já
elegeu, pra cobrança); `dentes_afetados`/`dentes_observacoes`/`procedimentos` são derivadas
por `derivarV2DosEventos` e ficam; `procedimentos_status` (21 fichas) e
`procedimentos_concluidos` (2) são resto; **`fichas.tratamento_id` + tabela `tratamentos` são
morte confirmada — 0 fichas apontando, 1 linha suja.**

---

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Ficha = tratamento, 1↔1.** `fichas.status` (`aberta`/`concluida`) já é o estado do tratamento; ganha só `nome` | Reusar a tabela `tratamentos` | Numa relação 1↔1 a intermediária não faz nada. Eu recomendei reusar e **retirei** quando ele fixou "uma ficha aberta por tratamento". `tratamentos`/`tratamento_id` viram lixo a dropar |
| **Concluir pendência nunca pergunta** — o evento volta pra ficha onde foi planejado, com a data de hoje. 2 pendências de tratamentos diferentes atualizam os 2 | Seletor governar a sessão inteira | Decisão dele 13/08. Procedimento planejado pertence ao plano onde nasceu; movê-lo quebra o histórico que o item existe pra montar |
| **Só procedimento que nasce na sessão tem escolha** de destino | Automático decidir também os novos | Ele liberou: *"não precisa ser automática essa divisão"*. Mas o seletor **nasce pré-marcado** — caso comum segue zero clique |
| **Seletor só existe com tratamento aberto**; sem nada aberto a ficha nova nasce sozinha | Seletor sempre visível | Observação dele: *"quando já tiver todos os em aberto fechado, não vai precisar do trigger"*. A tela só pergunta quando há ambiguidade real |
| **Evolução por visita em tabela própria** | Concatenar em `fichas.anotacoes` | `anotacoes` é 1 campo por ficha. Ficha durando meses ou sobrescreve o relato anterior, ou vira blocão sem data/autor — o que o CRO não aceita |
| **Nome derivado do conteúdo**, renomeável inline | Data como nome · pedir nome na criação | Data não distingue ("Tratamento de 26/07" × "de 02/08"). Pedir nome é atrito no gesto mais frequente |
| **Renderer legado continua no sistema** pras fichas antigas | Casca única pra todas + bloco "texto antigo" | Decisão dele 13/08: *"os outros vão ficar ainda no sistema porque têm fichas legadas"*. Menos risco: não toca o que já funciona |
| **Meu dia é a entrada principal**; a ficha é revisão | Paridade entre as duas | Palavras dele: *"tirar a maior necessidade do dentista clicar na ficha para organizar"* |

---

## 3. Objetivo

O dentista monta o tratamento uma vez. Cada visita seguinte **atualiza** essa ficha —
marcando a data de conclusão dos procedimentos e acrescentando a evolução daquela visita —
em vez de criar um documento novo. Ele faz tudo isso **sem sair do Meu dia**; a ficha existe
pra ver o tratamento inteiro, revisar e imprimir.

**Critério de sucesso declarado por ele:** se depois disto ele ainda precisar abrir a ficha
pra organizar o que fez, a feature falhou.

---

## 4. Contrato técnico

### 4.1 Schema

```sql
-- fichas: o tratamento ganha nome. Nada é removido.
alter table fichas add column if not exists nome text;

-- Evolução por visita — o único objeto novo do item.
-- RLS espelha planejamento_secoes (migration 099) linha a linha: mesmos helpers, reuso e
-- não abstração nova. Mesmo par de policies já usado por `tratamentos`.
create table ficha_evolucoes (
  id          uuid primary key default gen_random_uuid(),
  clinica_id  uuid not null references clinicas(id)  on delete cascade,
  ficha_id    uuid not null references fichas(id)    on delete cascade,
  dentista_id uuid not null references dentistas(id),
  data        date not null,
  texto       text,
  /** true = nascida do sistema (ex.: ficha aberta por procedimento novo achado noutra
   *  sessão), não ditada pelo dentista. Nunca conta como evolução assinável. */
  automatica  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_ficha_evolucoes_ficha on ficha_evolucoes (ficha_id, data desc);
alter table ficha_evolucoes enable row level security;

create policy ficha_evolucoes_select on ficha_evolucoes
  for select using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());
create policy ficha_evolucoes_write_own on ficha_evolucoes
  for all
  using      (belongs_to_active_clinic(clinica_id) and can_act_as_dentista(dentista_id))
  with check (belongs_to_active_clinic(clinica_id) and can_act_as_dentista(dentista_id));
```

**Backfill — exato, não aproximado.** Hoje toda ficha É uma visita: o modelo atual é o caso
degenerado do novo, então **1 evolução por ficha existente** sai sem perda nem adivinhação.

```sql
insert into ficha_evolucoes (clinica_id, ficha_id, dentista_id, data, texto, automatica)
select clinica_id, id, dentista_id, data_atendimento, anotacoes, false from fichas;
```

**Migration própria, depois e separada:** `drop table tratamentos` + `alter table fichas drop
column tratamento_id` (0 fichas apontando, conferido 13/08).

### 4.2 Types

```typescript
// src/types/ficha.ts (novo)
export interface FichaEvolucao {
  id: string;
  fichaId: string;
  dentistaId: string;
  dentistaNome: string;
  data: string;              // 'YYYY-MM-DD'
  texto: string | null;
  automatica: boolean;
}

/** Ficha aberta, do ponto de vista de quem vai gravar nela. Consumida pelo cabeçalho da
 *  ficha (progresso) e pelo seletor do Meu dia (R-108b). */
export interface TratamentoAberto {
  fichaId: string;
  nome: string;
  dentes: number[];
  totalProcedimentos: number;
  concluidos: number;
}
```

### 4.3 Nome do tratamento — determinístico, sem IA

Calculado no servidor no momento da criação, a partir dos eventos da ficha. Sem chamada de
modelo: previsível e sem custo (CLAUDE.md §IA — *"respostas previsíveis"*).

| Situação | Nome | Exemplo |
|---|---|---|
| 1 tipo de procedimento | `{TIPO_LABEL} · {dente}` | `Canal · 44` |
| 2+ tipos, dentes do mesmo quadrante/arco | `Reabilitação · {região}` | `Reabilitação · inferior direito` |
| 2+ tipos espalhados | `{TIPO_LABEL dominante} + {n} · vários dentes` | `Restauração + 3 · vários dentes` |
| Só nível-boca (profilaxia/flúor/…) | `{TIPO_LABEL}` | `Profilaxia` |

Renomeável inline no cabeçalho da ficha. **Nunca vazio, nunca só data.**
Reusa `TIPO_LABEL` (`src/types/odontograma.ts`) e as constantes de região de
`src/lib/arcadas.ts` — nada novo.

### 4.4 O que já existe pra reusar — inventário

| Preciso de | Já existe | Onde |
|---|---|---|
| Perfil do dente com chips, busca livre, "Dente ausente" | ✅ **e já está na ficha** (R-107b, no ar 13/08) | `ToothDetailPanel` — 11 refs em `FichasTab` |
| Chips de rotina (boca inteira) | ✅ **e a ficha foi a origem** | `lib/odontograma/rotina-boca.ts` |
| Card de procedimento (criação e leitura) | ✅ o mesmo componente já desenha os dois | `RegistroCard` + `eventosParaCards` |
| Derivar campos legados dos eventos | ✅ | `derivarV2DosEventos` |
| Upsert atômico de eventos | ✅ — **inalterado aqui**; ganha `ficha_id` no R-108b | RPC `salvar_eventos_odontograma` |
| Par de policies RLS do padrão | ✅ | migration 099 (`planejamento_secoes`) |
| Orçamento lendo de evento, não de texto | ✅ **R-30, em produção desde 30/07** | — |

Lote multidente e chips locais do campo mágico: ver [R-109](R-109-registro-na-ficha.md).

---

## 5. Comportamento

> Esta fatia **não muda nenhum caminho de escrita** — o comportamento de salvar continua o de
> hoje (ficha nova por visita). Quem troca isso é a [R-108b](R-108b-roteamento-da-visita.md).
> Aqui o alvo é: a ficha **lê e mostra** o tratamento inteiro.

| Estado | Quando | A ficha mostra |
|---|---|---|
| **Tratamento em curso** | ficha `aberta` com eventos | cabeçalho com nome, progresso `N de M`, plano com data de conclusão por procedimento, timeline de evoluções |
| **Encerrado** | ficha `concluida` | idêntico, com o pill de estado trocado; nada editável muda nesta fatia |
| **Só uma visita** | ficha com 1 evolução (todas, logo após o backfill) | timeline com 1 entrada — é o caso normal no dia seguinte ao deploy, não um estado degradado |
| **Legado só-texto** | 55 fichas sem evento | **renderer legado, como hoje** — decisão dele 13/08 |
| **Vazio** | ficha sem evento e sem texto (existe 1: `a53d9a90`) | cabeçalho + "nenhum procedimento registrado", sem plano vazio fingindo conteúdo |
| **Carregando** | evoluções em voo | skeleton na timeline; cabeçalho e plano já renderizam (vêm do mesmo fetch da ficha) |
| **Sem permissão** | ficha de outro dentista | leitura liberada (`is_clinic_staff`), edição não — comportamento atual, inalterado |

### Exemplos concretos

| Dado | Resultado esperado |
|---|---|
| Ficha com 7 eventos, 3 `realizado` | progresso "3 de 7", barra em 43%, 3 linhas com data + autor vindos do **evento** |
| Evento `realizado` em 08/08 por Dr. Gabriel | linha mostra `concluído 08/08 · Dr. Gabriel` — nunca a data da ficha |
| Ficha com `momento_planejado: 'proxima_sessao'` | pill âmbar "próxima sessão", distinto de "a fazer" |
| Ficha de 12/05 só com `teethNotes` | abre no renderer legado, sem erro, sem cabeçalho de tratamento |
| Ficha nova sem `nome` (não deve existir) | nome derivado é aplicado no save; se `null` no banco, cai pro derivado em leitura — nunca mostra vazio |

---

## 6. Referência visual

**Artefato:** [`plans/artefatos/R-108-ficha-tratamento.html`](../artefatos/R-108-ficha-tratamento.html)
— **aprovado v4, 13/08. É o contrato: a implementação copia estrutura, hierarquia e ordem
dos blocos.** O que não couber é achado pra trazer, não licença pra improvisar.

**Blocos desta fatia: 1 a 6** (cabeçalho, plano, evoluções, ficha legada). Blocos 7-9 são o
Meu dia — [R-108b](R-108b-roteamento-da-visita.md).
**Rota alvo:** `/dashboard/pacientes/[id]`, aba Fichas · **Componente:** `FichasTab.tsx`

**Tokens — extraídos de `src/app/globals.css` (não deduzidos do HTML). O contrato é o token,
nunca o hex; os pares light/dark já estão definidos lá:**

| Uso no artefato | Token |
|---|---|
| Card · fundo/campo · borda | `--color-surface` · `--color-surface-alt` · `--color-border` |
| Feito · seletor ativo · barra de progresso | `--color-teal` (+ `-ink`, `-pale`) |
| A fazer · procedimento novo | `--color-coral` (+ `-ink`, `-pale`) |
| Próxima sessão | `--color-warning` (+ `-ink`, `-pale`) |
| Formato antigo (legado) | `--color-slate` (+ `-ink`, `-pale`) |

Nome do tratamento em `--font-heading` (DM Serif Display); datas, dentes e contadores em
`--font-mono` (DM Mono); corpo em `--font-sans` (Outfit). Card `border-radius: 16px`, faixas
internas `12px`. **Proibido hex hardcoded** (CLAUDE.md §Design) — light e dark são gate (G7).

---

## 7. Invariantes

- [ ] **Esta fatia não muda nenhum caminho de escrita** — `salvarFicha`/`salvarVisitaMeuDia`
      saem daqui byte-idênticas
- [ ] Backfill não altera nenhuma linha de `fichas` — só insere em `ficha_evolucoes`
- [ ] Ficha nunca aparece sem nome (§4.3) e o nome nunca é só uma data
- [ ] Data e autor de conclusão vêm sempre do **evento**, nunca da ficha
- [ ] Renderer legado continua funcionando pras 55 fichas só-texto
- [ ] Evolução `automatica: true` nunca é apresentada como relato do dentista
- [ ] Ficha com `assinado_em` não-nulo continua imutável — nada aqui contorna o trigger
- [ ] `tratamentos`/`tratamento_id` saem em migration **própria**, nunca junto do backfill

---

## 8. Gates de aceite

**A — evolução (schema, invisível)**
- [x] **G1** — `ficha_evolucoes` criada; backfill produziu **174/174**, 0 órfã, 0 ficha sem evolução — SQL contra produção, 13/08
- [x] **G2** — `updated_at` das 174 fichas intacto — SQL confirmou 0 tocadas pelo backfill
- [ ] **G3** — RLS 2 contas — **represado, mesma fila do G3 do R-103b/c**
- [x] **G4** — nenhum arquivo de escrita (`salvar-ficha.ts`, `actions.ts`, a RPC) tocado nesta fatia — garantia por construção, não por clique ao vivo

**B — a ficha nova (só leitura)**
- [x] **G5** — testado ao vivo (paciente "tes", ficha `27a07854`, 11 eventos): cabeçalho "PONTE + 4 · VÁRIOS DENTES" + "3 de 11" + barra de progresso + timeline "Evoluções — uma por visita" com a entrada do backfill (10/08 · teste), tudo confirmado por ele
- [x] **G6** — código pré-existente (`RegistroCard`, já em produção) — não é escrita nova desta fatia, não pedi confirmação visual extra
- [x] **G7** — testado ao vivo nos dois temas por ele: "tá bom em light também"
- [x] **G8** — testado ao vivo (paciente "teste", ficha sem evento): "tá igual, sem nome nem progresso"
- [x] **G9** — mesma ficha do G8 — sem evento e sem plano fantasma, confirmado junto
- [x] **G10** — 8/8 testes (`nome-tratamento.test.ts`) + confirmado ao vivo no caso "espalhado" (G5)

**Transversal**
- [x] **G11** — typecheck + lint + `next build` limpos; zero erro nos arquivos tocados

---

## 9. Fora de escopo

- **O roteamento da visita** — a visita passar a atualizar a ficha em vez de criar outra é a
  [R-108b](R-108b-roteamento-da-visita.md). Saiu daqui porque é a única mudança de
  comportamento em produção, e separá-la é o que permite estas 2 fatias subirem sem risco
- **Registro na ficha** (lote multidente, chips locais, trilho único) —
  [R-109](R-109-registro-na-ficha.md), independente deste item
- **Quem encerra o tratamento** (`aberta` → `concluida`) — em aberto de propósito, decisão dele
- **Ordem/dependência entre procedimentos**, **orçamento sobre o plano** — itens próprios
- **Consolidar `procedimentos_status`/`procedimentos_concluidos`** (21 e 2 fichas) — restos da
  §1; migrar dado clínico é item próprio, como o R-30 §7 já dizia
- **Backfill de evento a partir de `teethNotes`** — lossy (texto livre não tem tipo nem
  status); inventaria dado clínico que ninguém digitou
- **Assinatura da evolução** — nasce sem `assinatura_id`; R-03b decide
- **Gate de 2 contas represado** — este item **acrescenta** G3 à fila, não a resolve

---

> **Spec salva em `plans/specs/R-108-ficha-tratamento.md`, fase `contrato`.** Aguardando sua
> aprovação. Depois de aprovada, qualquer desvio durante o código atualiza a spec **primeiro**.

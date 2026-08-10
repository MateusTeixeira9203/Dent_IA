# R-98 — Apresentar visual: blocos e modelo

**Modelo:** Opus
**Status:** plano — aguardando aprovação
**Origem:** pedido do Mateus em 09/08 ("escopar o Apresentar"), registrado como pendente no
`ESTADO.md` das sessões #34/#35 — nunca discutido antes desta spec.

---

## 1. Problema

O "Apresentar ao paciente" (`ApresentarPaciente` + `ApresentarPanel` + `usePlanejamentoPaciente`,
1.483 linhas em 5 arquivos) só sabe montar seção de título + texto + miniaturas. O dentista quer
um bloco que seja só uma imagem inteira (radiografia) e um bloco com o desenho da boca mostrando
o que ele propõe — e quer montar essa sequência uma vez e reusar em todo paciente novo, em vez
de recomeçar do zero a cada consulta.

Junto, um bug real e confirmado: nada gerado por IA é salvo. `generateFullPlanWithAI` cria ids
falsos (`ai-gen-<timestamp>`) e nunca grava em `planejamento_secoes`. Prova no dado: 23 chamadas
à rota (18 com sucesso, 6 de dentistas reais entre 03/07 e 03/08) contra 7 linhas na tabela
inteira — nenhuma correspondendo. Entra nesta spec porque um modelo, por definição, precisa de
banco: não dá pra reusar o que nunca foi salvo.

**Peso: G.** Pra caber no teto de 300 linhas sem cortar contrato, a spec se divide em dois
cortes internos, no mesmo documento: **R-98a** (tipos de bloco + fix de persistência — entrega
valor sozinho) e **R-98b** (modelo reutilizável — depende do `tipo` do 98a existir). Ver §4.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Seção ganha `tipo`: `texto` \| `imagem` \| `odontograma` (coluna + CHECK) | Manter homogêneo, imagem solta dentro do texto (como hoje) | Layout de imagem cheia e boca inteira não cabem no card texto+thumbnails atual |
| Bloco odontograma deriva sozinho de `odontograma_eventos` (paciente, escopado por ficha quando houver) | Dentista escolhe dente a dente na hora de montar o bloco | Zero gesto novo; usa a cor real (`corDoRegistro`) em vez de reconstruir a partir de `planProcs`, que é texto solto sem `status`/`origem` reais |
| Modelo é uma sequência por dentista, editada dentro do próprio painel do Apresentar (botão "Salvar como meu modelo") | Tela nova em Configurações pra montar o modelo | Reusa UI que já edita blocos; painel de configurações nem existe ainda (R-97 é ideia); modelo só se prova a partir do 2º paciente |
| Modelo por dentista, RLS igual `planejamento_secoes` (leitura clínica, escrita do autor) | Modelo por clínica, compartilhado | Espelha o padrão já aprovado (migration 099); cada profissional tem estilo/especialidade próprios |
| Reordenar blocos fica fora desta spec | Construir drag-and-drop agora | Zero UI de reordenar hoje (confirmado); ordem por criação resolve o caso relatado |
| Fix de persistência entra dentro do R-98a, não em item isolado | Abrir bug separado | Decisão do Mateus — modelo exige banco real |
| Regenerar com IA tendo seções existentes pede confirmação | Sobrescrever direto (comportamento atual) | Hoje perde silenciosamente o que já tinha; confirmação já é o padrão de `removeSection` |

## 3. Objetivo e como funciona

**Objetivo:** o dentista monta a apresentação com 3 tipos de bloco e, a partir do 2º paciente,
ela nasce pronta a partir do modelo dele, sem repetir o trabalho de estruturar.

No editor do Apresentar, cada bloco escolhe um tipo ao ser criado. **Texto** continua
exatamente como hoje. **Imagem** mostra 1 documento em tela cheia na apresentação, com legenda
opcional. **Odontograma** mostra a boca inteira com os dentes do plano coloridos (coral =
indicado, teal = realizado) — sem escolha manual, sem antes-e-depois. O botão "Salvar como meu
modelo" grava a estrutura atual (tipos + títulos, sem dado do paciente); todo paciente novo sem
seções abre o painel e já herda essa estrutura.

## 4. Contrato técnico

### 4.1 — R-98a: tipos de bloco + fix de persistência

**TypeScript:**

```typescript
export type SectionTipo = 'texto' | 'imagem' | 'odontograma';

export interface PlanSection {
  id: string;
  tipo: SectionTipo;          // novo — toda leitura antiga chega com default 'texto'
  title: string;
  content: string;            // texto: corpo · imagem: legenda opcional · odontograma: nota opcional
  imageIds: string[];         // texto: 0..N (como hoje) · imagem: 0..1 · odontograma: sempre []
  status: 'pendente' | 'em_andamento' | 'concluido';
  dataEstimada: string | null;
}

// Forma que o bloco odontograma consome — igual ao que Odontograma já recebe em
// `eventosPersistidos`. Mapeamento reaproveita o padrão de `eventoViewParaDraft`
// (FichasTab.tsx:425) e o select de `use-orcamento-modal.ts:83`: tipo/status/origem/nivel/
// arcada/quadrante/dente/faces são colunas PLANAS em odontograma_eventos, não jsonb.
export type EventosBlocoOdontograma = OdontogramaEventoDraft[];
```

**SQL — migration 134:**

```sql
alter table planejamento_secoes
  add column if not exists tipo text not null default 'texto'
    check (tipo in ('texto', 'imagem', 'odontograma'));
-- Sem backfill de conteúdo: as 7 linhas existentes (4 com título vazio) viram 'texto',
-- que é exatamente o que sempre foram. Nenhuma apagada, nenhuma reescrita.
```

**Fetch novo em `usePlanejamentoPaciente`** (dentro do `Promise.all` de `fetchGlobalData`, ao
lado de docs/orçamento/seções — mesmo padrão de agregação por paciente de `get-grupos-abertos.ts`):

```typescript
supabase.from('odontograma_eventos')
  .select('id,tipo,status,origem,nivel,arcada,quadrante,dente,faces,grupo_id,papel_no_grupo,observacao,realizado_em')
  .eq('paciente_id', patientId)
  .eq('clinica_id', clinicaId)
  // + .eq('ficha_id', fichaId) quando o Apresentar está escopado a 1 ficha —
  //   mesmo filtro condicional que budgetQuery já usa hoje.
```

**`Odontograma.tsx` — prop nova** (P, não G — confirmado no spike de 10/08):

```typescript
/** Esconde chrome de EDIÇÃO que não pode aparecer pro paciente: abas Permanentes/Decíduos,
 *  botão Legenda, linha "Toque um dente para ver e editar o detalhe". NÃO esconde numeração
 *  FDI nem rótulos SUP./INF. — esses ficam sempre (aprovados no spike). Default false. */
presentationMode?: boolean;
```

**Fix de persistência (`generateFullPlanWithAI`):** ao receber `data.secoes` da API, faz INSERT
real em `planejamento_secoes` (mesmo padrão de `addSection`, com `.select('id')`), grava
`tipo:'texto'` em cada linha, e só então chama `setSections` com os ids reais — nunca mais
id fantasma. Se já existem seções no momento do clique, pede `window.confirm` (mesmo padrão de
`removeSection`) antes de apagar as antigas do banco e inserir as novas.

### 4.2 — R-98b: modelo reutilizável (depende de 4.1)

**SQL — migration 135**, RLS espelhando `planejamento_secoes` (migration 099) linha a linha:

```sql
create table apresentacao_modelos (
  id          uuid primary key default gen_random_uuid(),
  clinica_id  uuid not null references clinicas(id) on delete cascade,
  dentista_id uuid not null references dentistas(id) on delete cascade,
  tipo        text not null default 'texto' check (tipo in ('texto','imagem','odontograma')),
  titulo      text not null default '',
  conteudo    text,           -- boilerplate opcional, só faz sentido em tipo='texto'
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Sem imagem_ids: modelo nunca guarda dado de paciente, só estrutura.

create index if not exists idx_apresentacao_modelos_dentista on apresentacao_modelos (dentista_id);

alter table apresentacao_modelos enable row level security;

create policy apresentacao_modelos_select on apresentacao_modelos
  for select using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

create policy apresentacao_modelos_write_own on apresentacao_modelos
  for all
  using      (belongs_to_active_clinic(clinica_id) and can_act_as_dentista(dentista_id))
  with check (belongs_to_active_clinic(clinica_id) and can_act_as_dentista(dentista_id));
```

**Funções novas** (client, direto via Supabase — mesmo estilo de `usePlanejamentoPaciente`, sem
rota de API nova):

```typescript
/** 1 modelo por dentista — sobrescreve (delete+insert), nunca acumula. */
async function salvarComoModelo(dentistaId: string, clinicaId: string, blocos: PlanSection[]): Promise<void>;

/** Clona o modelo do dentista pra `planejamento_secoes` do paciente. No-op se não existe modelo. */
async function aplicarModeloAoPaciente(dentistaId: string, clinicaId: string, patientId: string): Promise<PlanSection[]>;
```

**Árvore de componentes:**

```
ApresentarPaciente (client)                — ganha a precedência modelo > autoGenerate (§5)
  -- ApresentarPanel (client)
       -- SectionEditor (existente, ganha switch por tipo)
       -- TextoSectionBody (existente, sem mudança)
       -- ImagemSectionBody (novo — picker de 1 doc + legenda)
       -- OdontogramaSectionBody (novo — sem picker, preview auto-derivado)
       -- BotaoSalvarComoModelo (novo, header do editor)
       -- SlidePresentation (existente, ganha switch por tipo no render do slide)
            -- <Odontograma presentationMode compact eventosPersistidos={...} .../>
```

## 5. Comportamento — o alvo funcional

### Estados

| Estado | Quando acontece | O que a tela mostra | O que a função faz |
|---|---|---|---|
| Vazio, sem modelo | dentista sem modelo salvo, paciente com 0 seções | "Gerar com IA" / "Adicionar bloco" | nada automático |
| Vazio, com modelo | dentista já tem modelo, paciente novo com 0 seções | blocos do modelo já aparecem (tipo+título, sem conteúdo/imagem específicos) | `aplicarModeloAoPaciente` — INSERT real, roda 1x (mesmo guard por `ref` do `autoGenerate` de hoje) |
| Carregando | `loadingData` em voo | gap já existente hoje (painel não tem skeleton) — não piora, não é escopo consertar aqui | `Promise.all` de seções+docs+orçamento+eventos |
| Sucesso — bloco imagem | doc existe em `paciente_documentos` | imagem cheia + legenda opcional | grava `imageIds: [docId]` |
| Sucesso — bloco odontograma | paciente tem ≥ 1 `odontograma_evento` | boca inteira, dentes do plano coloridos, resto neutro | fetch + `corDoRegistro`, sem escrita |
| Vazio — odontograma sem eventos | paciente sem nenhum evento registrado | estado vazio explícito, não boca em branco sem explicação | nenhuma escrita |
| Erro — imagem apagada depois | `paciente_documentos` não tem mais o id referenciado | editor: aviso "imagem removida, reanexe" · apresentação: pula o slide, nunca quebra | leitura degrada sem crash (mesmo padrão do picker atual) |
| Sem permissão | outro dentista tenta editar meu modelo/minha seção | UPDATE volta 0 linhas sem erro (RLS) | refetch reverte pro estado real (invariante já documentada no hook) |
| Conflito | 2 dispositivos salvando o mesmo modelo | último `salvarComoModelo` vence | overwrite simples — mesma semântica de hoje, não é regressão |
| Regenerar com seções existentes | clique em "Gerar apresentação com IA" | `confirm()` antes de apagar | cancelar mantém tudo; confirmar apaga as antigas do banco e insere as novas |

### Caminho principal

```
Painel abre, 0 seções
  -> loadingData resolve
  -> existe modelo do dentista?
       sim -> clona blocos (INSERT) -> seções do modelo aparecem
       não -> autoGenerate=true? -> gera com IA (agora persistindo de verdade)
                                  -> não -> fica vazio, dentista adiciona manualmente

Dentista clica "+ Bloco" -> escolhe tipo
  -> texto: UI atual, sem mudança · imagem: picker de 1 doc -> imageIds=[docId]
  -> odontograma: sem picker — busca odontograma_eventos e renderiza

Dentista clica "Salvar como meu modelo" -> confirma substituição
  -> DELETE + INSERT em apresentacao_modelos (tipo, titulo, conteudo, ordem)
```

### Exemplos concretos

| Situação | Sistema faz | Resultado esperado |
|---|---|---|
| Sem modelo, 1º paciente, clica "Gerar com IA" | Gera 4 seções `texto`, insere no banco | Fechar e reabrir o painel mantém as 4 seções |
| Com modelo (Radiografia-imagem, Diagnóstico-texto, Plano-odontograma), abre 2º paciente | Clona os 3 blocos vazios | Painel abre com os 3 blocos, na mesma ordem, prontos pra preencher |
| Bloco odontograma, paciente com indicação nos dentes 16 e 24 | Deriva 2 eventos de `odontograma_eventos` | Boca inteira renderiza; só 16/24 coloridos (coral), resto neutro |
| Bloco odontograma, paciente sem nenhum evento | `eventosPersistidos=[]` | Estado vazio explícito, não boca confusa |
| Bloco imagem aponta pra doc já apagado | `documents.find` retorna `undefined` | Editor avisa; apresentação pula o slide sem quebrar |
| "Gerar apresentação" com seções já preenchidas | `window.confirm` | Cancelar preserva; confirmar apaga as antigas e insere as novas |

## 6. Referência visual

**Artefato: não existe ainda.** Dois layouts são genuinamente novos (imagem em tela cheia,
slide de odontograma) — pelo pipeline do CLAUDE.md (regra 4), passam por `design-brief` /
`artefato-visual` **antes** do código da UI, depois da aprovação desta spec. O shell do painel
e o `SectionEditor` de texto não mudam visualmente.

- **Rota alvo:** `/dashboard/pacientes/[id]` (painel Apresentar, sem rota própria)
- **Componente alvo:** `src/components/pacientes/ApresentarPanel.tsx`,
  `src/components/pacientes/ApresentarPaciente.tsx`, `src/components/odontograma/Odontograma.tsx`
- **Tokens confirmados em código** (reaproveitar, não é decisão nova desta spec):

| Token | Valor |
|---|---|
| Fundo da apresentação (fullscreen) | `#080c0b` |
| Destaque/teal da apresentação | `#2f9c85` |
| Cor "indicado" (odontograma) | coral — `corDoRegistro('indicado', _)` |
| Cor "realizado" clínica / preexistente | teal / slate — `corDoRegistro('realizado', origem)` |

## 7. Invariantes

- [ ] Bloco odontograma nunca deixa escolher dente a dente — deriva sempre de `odontograma_eventos`
- [ ] Modelo nunca guarda dado de paciente (sem `imagem_ids`, sem `paciente_id`)
- [ ] Salvar modelo é ação explícita — editar a apresentação de um paciente nunca reescreve o modelo sozinho
- [ ] Só quem passa em `can_act_as_dentista(dentista_id)` escreve no próprio modelo ou nas próprias seções; toda a equipe clínica (`is_clinic_staff()`) lê ambos
- [ ] "Gerar com IA" só mostra sucesso depois de persistir no banco — nunca mais estado local fantasma
- [ ] Apagar/regenerar seções existentes sempre pede confirmação antes de escrever
- [ ] Imagem órfã nunca quebra a tela, nem no editor nem na apresentação ao vivo com o paciente
- [ ] `presentationMode` do `Odontograma` nunca esconde numeração FDI nem rótulos SUP./INF.

## 8. Gates de aceite

**R-98a:**
- [ ] `planejamento_secoes.tipo` existe, default `'texto'`; as 7 linhas atuais não mudam de conteúdo
- [ ] Gerar com IA cria linhas reais em `planejamento_secoes` (conferido via SQL, não só pela UI)
- [ ] Fechar e reabrir o painel após gerar com IA mantém as seções (prova do fix)
- [ ] Bloco `imagem` mostra 1 imagem em tela cheia na apresentação, com legenda quando preenchida
- [ ] Bloco `odontograma` mostra a boca inteira; só os dentes com evento aparecem coloridos
- [ ] Paciente sem nenhum `odontograma_evento` mostra estado vazio, não boca em branco sem explicação
- [ ] `presentationMode=true` esconde abas de arcada, botão Legenda e a linha "toque para editar"; FDI e SUP./INF. continuam visíveis
- [ ] Doc apagado depois de anexado não quebra o editor nem a apresentação ao vivo
- [ ] Regenerar com IA tendo seções existentes exige confirmação antes de apagar

**R-98b:**
- [ ] "Salvar como meu modelo" grava em `apresentacao_modelos`, sobrescrevendo o anterior
- [ ] Paciente novo (0 seções) com modelo existente nasce com os blocos do modelo automaticamente
- [ ] Paciente novo sem modelo do dentista segue o comportamento atual (IA ou vazio)
- [ ] Dentista B não escreve no modelo do dentista A (RLS) — **testado com 2 contas logadas**
- [ ] Dentista B lê/aplica o modelo do dentista A por ser `is_clinic_staff()` — **testado com 2 contas logadas**
- [ ] Modelo aplicado a um paciente nunca chega com `imagem_ids` preenchido

## 9. Fora de escopo

- Reordenar blocos por drag-and-drop ou setas — ordem por criação, como hoje
- IA gerar conteúdo seguindo os títulos do próprio modelo do dentista (continua gerando as 4 seções fixas)
- Múltiplos modelos nomeados por dentista — só 1 modelo ativo por vez
- Modelo por clínica ou compartilhado entre dentistas
- Antes-e-depois no bloco odontograma (2 estados / comparação) — adiado por decisão do Mateus
- Tela própria em Configurações para editar o modelo fora do contexto de um paciente
- Design visual dos 2 layouts novos — fica para `design-brief`/`artefato-visual` depois da aprovação

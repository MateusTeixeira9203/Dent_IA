# R-03a — Assinatura por procedimento: modelo + congelamento (backend)

> **SPEC** · **R-03a** · fase **contrato — decisões travadas 26/07, pronta pra execução** ·
> **Modelo:** Sonnet na execução (as decisões ambíguas já foram fechadas pelo Mateus).
> **Aberto:** 2026-07-26 · **Depende de:** nada em código (mexe em cima do event-log já no ar,
> R-01/R-02 aplicados) · **Overlap:** R-11 (unificar caminho de gravação) toca os mesmos 3 fluxos.

> **Split confirmado (Mateus, 26/07).** O item foi quebrado em **R-03a** (este doc: modelo de
> dados + trigger de imutabilidade + RPC — especificado até o SQL) e **R-03b** (captura/UI +
> reconciliar os 3 fluxos legados — sketch na última seção, vira spec própria depois de R-03a no ar).
>
> **⚠️ Execução mexe em PROD:** migration nova (tabela + coluna + trigger + RPC) + RLS. Quando for
> codar: migration primeiro e sozinha, conferir os objetos no schema, e **testar com 2 contas
> logadas** (dentista autor / não-autor / secretária) antes de qualquer deploy. Não entra no lote
> atual — é item próprio de execução, com confirmação de prod.

## Visão geral

Hoje a assinatura do paciente é por ficha inteira (fichas.assinado_em): assinar trava a ficha
toda, mesmo que ela tenha procedimentos ainda planejados. R-03 move o congelamento pra
granularidade de registro (odontograma_eventos): o paciente assina um procedimento (ou um lote
deles) já realizado; só esses ficam imutáveis, o resto da ficha — inclusive o planejado —
continua editável. Base legal: Manual do Prontuário CFO 2026 pede data de execução, dente/região,
procedimento, executor (nome+CRO) e assinaturas, principalmente do paciente, a cada registro;
sem emendas ou rasuras.

## O que já existe hoje (confirmado no código, não presumido)

- 3 fluxos diferentes já escrevem em fichas.assinatura_url/assinado_em, nenhum sabe do outro:
  1. `FichasTab.handleSaveSignature` — dentista autoassina a própria ficha na aba Pacientes,
     client-side com RLS (.eq('dentista_id', dentistaId) + checagem de .select() vazio).
  2. `AssinaturaRecepcaoModal` + `assinatura-actions.ts` — secretária, na recepção
     (agendamentos), via service role (bypassa RLS); só checa role === 'secretaria', pega
     qualquer ficha do paciente sem assinatura_url, sem checar autor.
  3. `consulta/[agendamentoId]/actions.ts::salvarAssinaturaConsulta` + `consulta-assinatura-modal.tsx`
     — dentista, ao fim do modo consulta, também via service role, gated a dentista_id = caller.
- `odontograma_eventos` (migration 101) já é event-log append-only por convenção (comentário da
  tabela), mas isso não é imposto pelo banco — é 100% confiança em `alternarStatusRegistro`/
  `encaminharProcedimento` (actions) checarem fichas.assinado_em na mão antes de cada UPDATE, e na
  RPC `salvar_eventos_odontograma` (107) que faz `for update` + `raise exception` se a ficha
  estiver assinada. RLS de escrita (odontograma_eventos_write_own) não sabe nada de assinatura —
  é FOR ALL ... dentista_id = get_my_dentista_id(), sem checar estado. Se um caminho novo
  esquecer de repetir a checagem manual, o banco deixa passar.
- `RegistroCardData.assinada: boolean` já existe em registro-card.tsx — é a prop que hoje
  propaga o estado da ficha inteira pra cada card (evo.assinadoEm != null). É o ponto de entrada
  natural pro estado por-registro.
- Storage: bucket fichas é silo por clínica, não por autor (fichas_objects_*, migration
  058/090) — qualquer membro autenticado da clínica lê/escreve/apaga sob {clinicaId}/... Path de
  hoje: {clinicaId}/{pacienteId}/assinatura_{fichaId}.png.
- `dentistas.cro text` existe (migration 001_core_tables).
- Padrão de RPC estreita pra um ator que não é o dono da linha já existe:
  `concluir_evento_encaminhado` (migration 109, SECURITY DEFINER, só toca 2 colunas). Template
  direto pra Fase 2 aqui.
- Padrão de selecionar N registros → 1 ação em lote já existe e está codado e verificado: modo
  seleção do R-04 (EncaminharBar, checkbox no RegistroCard). Reusável pra selecionar N realizados
  → 1 assinatura cobre todos.

## Escopo

**Cobre:** modelo de dados da assinatura por registro/lote · congelamento no banco (não só no
app) · RPC de assinar · invariantes de imutabilidade · o que fazer com os 3 fluxos hoje existentes
(decisão, não implementação completa — isso é R-03b).

**Não cobre (fica pra R-03b, spec própria):** UI de captura (qual componente, onde o botão
aparece) · retrofit dos 3 fluxos legados linha a linha · retificação de registro assinado (só a
regra é fixada aqui: nunca edita, sempre novo evento).

## Decisões

> **TRAVADAS pelo Mateus (26/07):**
> - **#1 Granularidade → LOTE selecionado** (reusa o modo-seleção do R-04; assinar 1 = selecionar 1).
> - **#2 Schema → tabela nova `assinaturas`** (1 ato = 1 linha; N eventos apontam via `assinatura_id`).
> - **#3 Imutabilidade → trigger no banco + app-guard** (fecha o furo de hoje, que é só app).
> - **#5 Quem coleta → secretária + dentista, via RPC estreita** (nunca mais service-role irrestrito;
>   assinatura sempre no CRO do AUTOR da ficha, não do coletor).
>
> **Ainda em aberto (não bloqueiam R-03a):** #4 (reconciliar os 3 fluxos legados) → decidir no R-03b;
> #6 (retificação/desfazer) → default assumido = **sem desfazer, correção é evento novo** (CFO: sem
> rasuras); #7 (imagem vs. nome digitado) → default assumido = **só traço** (signature_pad). Confirmar
> os dois defaults quando escrever o R-03b.
>
> _As descrições originais de cada decisão ficam abaixo, como registro do raciocínio._

### #1 — Granularidade do ATO de assinatura: 1 clique por registro vs. lote selecionado

O roadmap diz registro a registro; a leitura literal seria 1 assinatura = 1 traço = 1 evento.
Mas isso obriga o paciente a assinar N vezes numa consulta com N procedimentos — atrito real,
contra o próprio filtro do produto. Recomendo: assinatura por LOTE selecionado (reusa o modo
seleção do R-04 — marca os realizados desta consulta, assina uma vez, todos congelam juntos).
Isso não perde a leitura literal: assinar 1 só é só selecionar 1. O modelo de lote é estritamente
mais flexível, nunca pior.

### #2 — Onde mora a assinatura: colunas em odontograma_eventos vs. tabela nova assinaturas

Downstream de #1. Se for lote, colunas diretas duplicariam a mesma imagem/timestamp em N linhas
(nenhuma fonte única de "este ato de assinatura"). Recomendo: tabela `assinaturas` (1 linha = 1
ato de assinatura, N eventos apontam pra ela via assinatura_id). Se Mateus preferir #1
estritamente per-registro, colunas diretas bastam e são mais simples — mas aí não há lote.

### #3 — Imutabilidade: trigger no banco vs. só app-guard (como é hoje)

Hoje é 100% app-level, frágil (ver achado acima). Recomendo trigger BEFORE UPDATE OR DELETE em
odontograma_eventos: barra qualquer UPDATE/DELETE de linha já assinada, mesmo se um código futuro
esquecer de checar. Defesa em profundidade — barato de escrever, caro de não ter.

### #4 — O que fazer com os 3 fluxos de assinatura de FICHA que já existem

Não dá pra ignorar: manter os 3 rodando como estão E adicionar o granular cria 2 sistemas de
verdade competindo (uma ficha assinada por fichas.assinado_em mas com eventos abertos por dentro
— contraditório). Recomendo: fichas.assinado_em vira o caminho só pra fichas sem evento
(eventos.length === 0, o "legado" que o código já distingue em FichasTab.tsx:1932); fichas COM
eventos passam a usar só o granular. Os 3 fluxos (recepção, ficha rápida, fim de consulta) migram
pra oferecer "assinar os realizados desta ficha" via o novo RPC, cada um mantendo seu contexto de
quem pode chamar (autor vs. secretária). Isso é decisão de produto, não só técnica — confirmar.

### #5 — Quem pode COLETAR a assinatura granular

Hoje a secretária assina qualquer ficha do paciente sem checar autor (bypass de service role). Se
isso persiste no modelo por-registro, precisa virar RPC estreita (não mais bypass total) — ela
segura o tablet, o paciente assina, mas o servidor valida o quê exatamente ela pode gravar.
Recomendo manter secretária como coletora (é o fluxo real da recepção), só que via RPC (ver Parte
2), nunca mais service-role irrestrito.

### #6 — Retificação e desfazer

CFO: sem emendas ou rasuras. Recomendo travar: nunca existe "desfazer assinatura" nem UPDATE do
evento assinado — erro clínico pós-assinatura vira um novo evento (correção), referenciando o
antigo por observacao ou por um campo futuro (fora de escopo aqui). Confirmar que não há caso de
negócio pra desfazer (ex.: assinou por engano o procedimento errado).

### #7 — Imagem vs. nome digitado

Hoje é sempre traço (signature_pad). Pergunta: existe cenário sem touch/mouse (assinatura por
telefone, sem tela compartilhada) que precise de fallback por nome digitado? Recomendo manter só
traço por ora (consistente com os 3 fluxos atuais) — perguntar se há caso real.

## Assunções

- odontograma_eventos.ficha_id é, na prática, sempre não-nulo pra linhas novas (migration 108
  trocou a FK pra ON DELETE CASCADE; só linhas legadas pré-108 poderiam ter sido órfãs, e essas
  já foram limpas pelo cascade desde então).
- Assinatura sempre é de 1 ficha por ato — não há caso de assinar procedimentos de 2 fichas numa
  tacada só (a UI de hoje também não permite: modo seleção do R-04 é escopado à consulta).
- Só status = 'realizado' entra num lote de assinatura — planejado não assina (regra que já
  aparece hoje na UI: "Planejado não assina").
- Um evento encaminhado (R-04) só existe com status='indicado', e assinatura só cobre
  'realizado' — as duas features nunca colidem no mesmo evento; não precisa de guarda cruzada.

## Parte 1 — Plano de implementação (R-03a: modelo + congelamento)

### Mudanças de arquitetura

| Arquivo | O que muda |
|---|---|
| supabase/migrations/*_111_assinatura_por_registro.sql (novo) | tabela assinaturas, coluna odontograma_eventos.assinatura_id, trigger de imutabilidade, RPC assinar_procedimentos, ajuste em salvar_eventos_odontograma (guard de linha assinada) — **nº 111: a 110 foi tomada pelo R-04b (26/07)** |
| src/types/odontograma.ts | OdontogramaEvento.assinatura_id; novo tipo Assinatura |
| src/app/consulta/[agendamentoId]/actions.ts | nova action assinarProcedimentos (wrapper fino da RPC) |

### Fases

#### Fase 1: Migration — schema + trigger (Risco: ALTO)

1. `create table public.assinaturas` — ver Parte 2 pro SQL completo.
2. `alter table odontograma_eventos add column assinatura_id uuid references assinaturas(id) on
   delete set null` — SET NULL deliberado: apagar uma linha de assinaturas (nunca deveria
   acontecer via código, só via cascade de fichas) nunca deve arrastar o evento clínico junto; se
   algum dia acontecer fora do fluxo normal, o evento só volta a ficar "não assinado", não
   desaparece.
3. Trigger BEFORE UPDATE OR DELETE ON odontograma_eventos: raise exception se OLD.assinatura_id
   is not null. Bloqueia qualquer escrita numa linha já assinada — inclusive a própria RPC de
   assinar tentando re-assinar (idempotência: 2ª chamada falha, não silencia).
4. create or replace function salvar_eventos_odontograma (107) ganha 2 guards: o DELETE do passo
   1 exclui `and assinatura_id is null` (nunca apaga um assinado, mesmo se ele saiu do payload por
   engano); o ON CONFLICT (id) DO UPDATE ganha `WHERE odontograma_eventos.assinatura_id IS NULL`
   (resalvar uma ficha com eventos já assinados nela não tenta escrever nessas linhas — sem isso,
   o trigger do passo 3 quebraria o save inteiro na primeira linha assinada presente no lote).

Verificável: com uma linha assinada por SQL direto, tentar UPDATE/DELETE nela e ver o raise
exception; resalvar uma ficha (via salvarEventosOdontograma) que tem 1 evento assinado e 1
não-assinado deve suceder, tocando só o não-assinado. Dependências: nenhuma.

#### Fase 2: RPC de assinar (Risco: MÉDIO)

1. assinar_procedimentos(p_evento_ids uuid[], p_assinado_por text, p_assinatura_ref text) —
   SECURITY DEFINER (ver Parte 2). Valida: todos os eventos existem, são da clínica do caller,
   status='realizado', assinatura_id is null, todos da MESMA ficha_id, e o caller é o autor da
   ficha ou secretária da mesma clínica (decisão #5). Insere 1 linha em assinaturas (com
   cro_no_ato = CRO do AUTOR da ficha no momento, não do caller) e faz 1 UPDATE setando
   assinatura_id nos eventos — essa é a ÚNICA transição permitida pelo trigger da Fase 1
   (OLD.assinatura_id IS NULL para NEW.assinatura_id = valor).
2. revoke ... from anon, public; grant ... to authenticated (padrão de toda RPC da casa).

Verificável: 2 contas — dentista autor assina os realizados da própria ficha (sucesso); outro
dentista (não-autor, não-secretária) tentando falha; secretária consegue; re-chamar com os mesmos
ids falha (já assinado); misturar ids de 2 fichas diferentes falha; incluir 1 evento indicado no
lote falha. Dependências: Fase 1.

#### Fase 3: Tipos + action wrapper (Risco: BAIXO)

1. src/types/odontograma.ts — assinatura_id: string | null em OdontogramaEvento; novo export
   interface Assinatura { id; assinadoPor; croNoAto; assinadoEm; assinaturaRef }.
2. actions.ts — assinarProcedimentos (Parte 2), chamando a RPC e traduzindo os erros
   (sem_permissao, ja_assinado, fichas_misturadas, status_invalido) em mensagens PT-BR, mesmo
   padrão de atualizarStatusEncaminhado.

Verificável: chamar a action pelos 2 lados (autor/secretária) e ver as mensagens de erro
corretas por cenário. Dependências: Fase 2.

Fases 4+ (UI, reconciliação dos 3 fluxos) ficam pra R-03b — ver a última seção.

### Riscos e mitigações

| Risco | Prob. | Mitigação |
|---|---|---|
| Trigger quebra o save de ficha existente (evento assinado no meio de um resave) | alta se não tratada | Guard WHERE assinatura_id IS NULL no ON CONFLICT DO UPDATE da 107 (Fase 1, passo 4) — testar resave com evento assinado ANTES de subir |
| Secretária via RPC ainda assina "por qualquer autor" (mesmo comportamento de hoje, só que auditável) | certa, é a decisão #5 | Documentar como intencional; não é regressão — hoje é bypass total, RPC é sempre mais estreito |
| cro_no_ato errado se o autor da ficha mudar de CRO depois (recadastro) | baixa | Snapshot no INSERT, nunca recalculado — é o ponto inteiro da coluna |
| Decisão #1/#2 virar per-registro estrito depois do debate, exigindo reescrever o schema | média | Esta spec já resolve pro caso geral (lote); per-registro estrito é um SUBCONJUNTO de uso, não exige mudança de schema |

## Parte 2 — Contrato técnico (R-03a)

### TypeScript

```typescript
// src/types/odontograma.ts — adições
export interface OdontogramaEvento {
  // ...campos existentes
  /** Assinatura que congelou este evento (R-03). null = ainda editável. */
  assinatura_id: string | null;
}

export interface Assinatura {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** 'procedimentos' (R-03a, clínico) | 'orcamento' (R-03c, aceite financeiro). */
  tipo: 'procedimentos' | 'orcamento';
  /** Alvo clínico — set só quando tipo='procedimentos'. */
  fichaId: string | null;
  /** Alvo financeiro — set só quando tipo='orcamento' (R-03c). */
  orcamentoId: string | null;
  /** Autor/responsável no momento — não necessariamente quem coletou (pode ser a secretária). */
  dentistaId: string;
  /** Nome de quem assinou (paciente ou responsável legal) — editável na captura. */
  assinadoPor: string;
  /** CRO do responsável no ato — snapshot, nunca recalculado (invariante). */
  croNoAto: string | null;
  assinaturaRef: string; // storage path, bucket fichas (silo por clínica)
  assinadoEm: string;    // ISO timestamp
}
```

### Zod

```typescript
export const assinarProcedimentosSchema = z.object({
  eventoIds: z.array(z.string().uuid()).min(1),
  assinadoPor: z.string().trim().min(2).max(120),
  assinaturaDataUrl: z.string().startsWith('data:image/png;base64,'),
});
export type AssinarProcedimentosInput = z.infer<typeof assinarProcedimentosSchema>;
```

### Server Action

```typescript
// src/app/consulta/[agendamentoId]/actions.ts
export async function assinarProcedimentos(
  params: AssinarProcedimentosInput,
): Promise<{ ok: boolean; error?: string }>;
```

| | |
|---|---|
| Auth | required — dentista autor da ficha OU secretária da mesma clínica |
| Rate limit | não |

Erros: sem_permissao (não é autor nem secretária, ou clínica errada) · ja_assinado (algum id já
tem assinatura_id) · status_invalido (algum id não é realizado) · fichas_misturadas (ids de mais
de 1 ficha_id).

### Database

```sql
-- Tabela GENÉRICA (decisão Mateus 26/07): serve R-03a (clínico, tipo='procedimentos')
-- E R-03c (aceite de orçamento, tipo='orcamento'). Alvo = ficha_id XOR orcamento_id.
-- R-03a só cria/usa o caminho clínico; R-03c depois liga orcamentos.assinatura_id + trigger próprio.
create table public.assinaturas (
  id             uuid primary key default gen_random_uuid(),
  clinica_id     uuid not null references public.clinicas(id) on delete cascade,
  paciente_id    uuid not null references public.pacientes(id) on delete cascade,
  tipo           text not null check (tipo in ('procedimentos','orcamento')),
  ficha_id       uuid references public.fichas(id) on delete cascade,     -- só quando tipo='procedimentos'
  orcamento_id   uuid references public.orcamentos(id) on delete cascade, -- só quando tipo='orcamento' (R-03c)
  dentista_id    uuid not null references public.dentistas(id), -- autor/responsável, nao o coletor
  assinado_por   text not null,
  cro_no_ato     text,
  assinatura_ref text not null,
  assinado_em    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint assinaturas_alvo_unico check (
    (tipo = 'procedimentos' and ficha_id is not null and orcamento_id is null) or
    (tipo = 'orcamento'     and orcamento_id is not null and ficha_id is null)
  )
);

alter table public.odontograma_eventos
  add column assinatura_id uuid references public.assinaturas(id) on delete set null;

create index idx_odontograma_eventos_assinatura on public.odontograma_eventos(assinatura_id)
  where assinatura_id is not null;

alter table public.assinaturas enable row level security;

-- Leitura: nucleo clinico compartilhado (mesmo padrao de odontograma_eventos_select).
create policy "assinaturas_select" on public.assinaturas for select
  using (belongs_to_active_clinic(clinica_id) and is_clinic_staff());

-- Escrita: SO pela RPC (security definer) -- sem policy de INSERT/UPDATE/DELETE direta para
-- authenticated, pra ninguem inserir uma "assinatura" fabricada sem passar pela validacao da RPC.

create or replace function public.bloquear_edicao_evento_assinado()
returns trigger language plpgsql as $$
begin
  if old.assinatura_id is not null then
    raise exception 'evento_assinado_imutavel';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_odontograma_evento_imutavel
  before update or delete on public.odontograma_eventos
  for each row execute function public.bloquear_edicao_evento_assinado();

create or replace function public.assinar_procedimentos(
  p_evento_ids      uuid[],
  p_assinado_por    text,
  p_assinatura_ref  text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ficha_id      uuid;
  v_clinica_id    uuid := get_my_clinica_id();
  v_autor_id      uuid;
  v_cro           text;
  v_caller        uuid := get_my_dentista_id();
  v_role          text := get_my_role();
  v_count         int;
  v_assinatura_id uuid;
begin
  select e.ficha_id into v_ficha_id
  from public.odontograma_eventos e where e.id = p_evento_ids[1];

  select count(*) into v_count
  from public.odontograma_eventos e
  where e.id = any(p_evento_ids)
    and e.clinica_id = v_clinica_id
    and e.ficha_id = v_ficha_id
    and e.status = 'realizado'
    and e.assinatura_id is null;

  if v_count <> coalesce(array_length(p_evento_ids, 1), 0) then
    raise exception 'status_invalido';
  end if;

  select f.dentista_id, d.cro into v_autor_id, v_cro
  from public.fichas f join public.dentistas d on d.id = f.dentista_id
  where f.id = v_ficha_id and f.clinica_id = v_clinica_id;

  if v_autor_id is null or (v_autor_id <> v_caller and v_role <> 'secretaria') then
    raise exception 'sem_permissao';
  end if;

  insert into public.assinaturas
    (clinica_id, paciente_id, tipo, ficha_id, dentista_id, assinado_por, cro_no_ato, assinatura_ref)
  select v_clinica_id, e.paciente_id, 'procedimentos', v_ficha_id, v_autor_id, p_assinado_por, v_cro, p_assinatura_ref
  from public.odontograma_eventos e where e.id = p_evento_ids[1]
  returning id into v_assinatura_id;

  update public.odontograma_eventos set assinatura_id = v_assinatura_id
  where id = any(p_evento_ids);

  return v_assinatura_id;
end;
$$;

revoke execute on function public.assinar_procedimentos(uuid[], text, text) from anon, public;
grant  execute on function public.assinar_procedimentos(uuid[], text, text) to authenticated;
```

### Invariantes

- [ ] Evento com assinatura_id não-nulo nunca sofre UPDATE ou DELETE — nem pela RPC de save, nem
      por nenhuma action, imposto por trigger (não só por app-guard).
- [ ] Só status='realizado' entra num lote de assinatura.
- [ ] Um lote de assinatura nunca mistura ficha_id diferentes.
- [ ] cro_no_ato é congelado no INSERT — nunca recalculado depois.
- [ ] Coletar assinatura não é o mesmo que ser o autor: assinaturas.dentista_id é sempre o autor
      DA FICHA, mesmo quando quem operou o RPC foi a secretária.
- [ ] Não existe "desfazer assinatura" — nenhum endpoint remove assinatura_id de um evento.
- [ ] Resalvar uma ficha com eventos já assinados nunca falha nem toca essas linhas.
- [ ] `assinaturas` é genérica: o check `assinaturas_alvo_unico` garante alvo único (ficha XOR orçamento).
      R-03a só grava `tipo='procedimentos'`; `orcamento_id` fica pra R-03c ligar depois — sem retrofit de tabela em prod.

### Gates de aceite

- [ ] Assinar 2 eventos realizado da mesma ficha → ambos ganham assinatura_id, 1 linha em
      assinaturas.
- [ ] Tentar assinar um evento indicado → falha (status_invalido), nada grava.
- [ ] Tentar assinar de novo um evento já assinado → falha (ja_assinado/status_invalido).
- [ ] Dentista não-autor e não-secretária tentando assinar → falha (sem_permissao).
- [ ] Editar/apagar (via UPDATE/DELETE direto) um evento assinado → erro de banco
      (evento_assinado_imutavel), com 2 contas reais.
- [ ] Resalvar a ficha (editar outro registro, sem tocar o assinado) → sucesso, o assinado
      permanece intacto.

## Sketch de R-03b (fora de escopo aqui; vira spec própria)

- Captura: reusar SignaturePad/signature_pad (já usado nos 3 fluxos); modo seleção do R-04
  adaptado (AssinarBar em vez de EncaminharBar) pra escolher quais realizados entram no lote antes
  de abrir o pad.
- RegistroCardData.assinada: boolean vira assinaturaId: string | null (ou mantém boolean derivado
  + assinadoEm) — card mostra "Assinatura coletada" por REGISTRO, não por ficha.
  podeEditarFicha/RegistroCard.onToggleStatus passam a checar o evento, não só a ficha.
- Editar ficha (lápis): ao reabrir pra edição, cards com evento assinado entram read-only dentro
  do próprio painel de edição — hoje editavel é tudo-ou-nada.
- Reconciliação dos 3 fluxos: AssinaturaRecepcaoModal/assinatura-actions.ts e
  consulta-assinatura-modal.tsx/salvarAssinaturaConsulta passam a chamar assinarProcedimentos com
  "todos os realizados não assinados desta ficha" como default (preserva o gesto de hoje — 1
  clique assina tudo que dá); FichasTab ganha a opção granular (selecionar um subconjunto).
  fichas.assinado_em/assinatura_url continuam existindo só para o caminho legado
  (eventos.length === 0).
- Overlap com R-11 (unificar gravação): os 3 fluxos de assinatura são sintoma do mesmo problema
  que R-11 já nomeou (múltiplos caminhos gravando o mesmo dado) — vale coordenar as duas specs
  antes de codar R-03b.

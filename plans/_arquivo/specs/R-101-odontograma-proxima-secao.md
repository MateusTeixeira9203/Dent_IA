# R-101 — Odontograma: 3º estado "próxima seção"

> **SPEC** · **R-101** · **Fase:** `fechada — testada e aprovada`
> **Aberto:** 2026-08-11 · **Fechado:** 2026-08-11
> **Modelo:** Sonnet 5 (a decisão arquitetural difícil já está fechada nesta spec — execução é
> mapeada arquivo por arquivo; o único julgamento que sobra é visual, o controle de 3 vias nos
> pontos de toggle — mecânico o bastante pra não pedir Opus)
> **Depende de:** nada bloqueia · **1 migration aditiva** (coluna nova + `create or replace
> function`) · **zero mudança de RLS**

## 0. O pedido

> "os status do dente vai ser a fazer, proxima seção e concluido"

Hoje o odontograma só tem 2 estados visuais: `indicado` (coral, "a fazer") e `realizado` (teal,
"concluído"). Ele quer um 3º, cor âmbar: algo planejado para uma sessão futura — nem "a fazer
agora", nem "já feito".

## 1. Assunções (a confirmar)

- **"Seção" vira "sessão" no nome técnico.** A palavra dele foi "seção", mas o vocabulário já
  estabelecido no projeto pra este exato conceito é "sessão" (R-51: "multi-sessão", "sessão de
  trabalho"). Assumo que ele quis dizer "sessão" — o nome interno do campo usa esse termo. O
  rótulo que aparece pra ele na tela continua "Próxima seção", exatamente como ele falou — isso
  é só copy, não precisa bater com o nome da coluna.
- **Escopo é o odontograma (dente/face/quadrante/arcada), não os cards de "boca" (profilaxia,
  raspagem, clareamento, flúor).** Esses têm caminho de rótulo próprio, fora de `corDoRegistro`
  (`FichasTab.tsx` por volta das linhas 1857 e 1882). Ganham a coluna no banco (é a mesma
  tabela), mas o badge visual deles fica fora do v1 — ver secao 8.
- **A IA nunca decide isso.** Mesma classe de invariante que já existe pra `realizado_em`: é
  decisão de agenda/priorização do dentista, não uma extração de fala.

## 2. A pergunta que decide tudo: deriva ou grava?

Existe um precedente quase idêntico: `emAndamento` (R-51, `plans/specs/R-51-53-modelo-
multissessao.md`). Lá, "em andamento" não virou 3º status — é derivado por query de dado que já
existe (múltiplos eventos com o mesmo `grupo_id`, um deles `realizado`). Zero gravação nova,
zero migration.

Aqui é diferente, e a checagem precisa ser explícita: não existe nenhum dado hoje que sinalize
"este indicado é para depois". `odontograma_eventos` não tem data prevista, prioridade, nem
qualquer proxy temporal — só `registrado_em`/`realizado_em`/`created_at`, nenhum dos três serve
(não há "data planejada de execução" hoje). "Próxima seção" é uma intenção nova do dentista, não
uma releitura de dado existente. Precisa ser input explícito, e precisa ser gravado.

A pergunta real, então, não é "deriva ou grava" — é onde grava: estourar o enum `status`
existente (3º valor), ou abrir um eixo novo ortogonal a ele (como `origem` já é hoje).

## 3. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Campo novo `momento_planejado`, ortogonal a `status` (`status` continua `indicado`\|`realizado`, só 2 valores) | 3º valor no enum `status` (`indicado`\|`proxima_sessao`\|`realizado`) | O grep da secao 9 achou ~20 pontos de código que testam `status === 'indicado'` como proxy de "é pendência" (conta pra "A fazer", entra no orçamento, bloqueia exclusão, etc). Todos continuam corretos sem tocar se `status` seguir binário. Estourar o enum exigiria migrar cada um pra um helper `ehPendente()`, risco real de esquecer 1 — o mesmo medo que a spec do R-51 registrou pros 23 arquivos do caso análogo |
| Enum-texto (`sessao_atual` \| `proxima_sessao`) com `check`, no estilo dos outros campos da mesma tabela (`tipo`, `status`, `origem`, `nivel`) | boolean (`proxima_sessao boolean`) | Zero outro campo semântico de `odontograma_eventos` usa boolean — todos são texto+check. Não é preparação deliberada pro futuro (YAGNI), só a leitura de que o enum não custa mais que o boolean aqui e já nasce no idioma da tabela |
| Reusar `--color-warning` / `-pale` / `-ink` já existentes | Criar `--color-amber` novo | Já existem, calibrados AA (light e dark, achado da auditoria 19/07), já usados em 10 arquivos — inclusive já usados no odontograma hoje (`dente-historico-card.tsx`, banner de "tratamento em andamento"). O valor hex já é `amber-500`/`amber-400` do Tailwind — só o nome semântico é "warning". Um token novo duplicaria a mesma cor sob outro nome |
| `status='indicado'` segue o único guardião de pendência; `momento_planejado` só influencia cor/rótulo, nunca filtro de "é trabalho pendente" | — | Ver secao 9 para a lista exata dos pontos que não mudam por causa disso |

## 4. Plano de implementação

### Fase 1 — Schema (Risco: BAIXO)
1. Uma migration: `alter table` aditivo (coluna + constraint de coerência) e `create or replace
   function salvar_eventos_odontograma` na mesma transação — ver secao 5.2. As duas coisas
   entram juntas (motivo no risco R1 abaixo).

Verificável: rodar a migration local; `insert`/`update` direto no banco com
`status='realizado', momento_planejado='proxima_sessao'` precisa ser rejeitado pela constraint.
Dependências: nenhuma.

### Fase 2 — Tipos e cor derivada (Risco: BAIXO)
1. `src/types/odontograma.ts`: novo `MomentoPlanejado`, `corDoRegistro` ganha 3º parâmetro
   (default `sessao_atual`) e o retorno ganha `warning`. Campo novo em `OdontogramaEvento`,
   `OdontogramaEventoInput` (e por herança `OdontogramaEventoDraft`), `OdontogramaEstadoAtual`.
2. Os 4 arquivos com `COR_TOKEN`/`COR_TOKEN_INK` duplicado (secao 9) ganham a entrada `warning`,
   e passam a anotar o objeto como `satisfies Record<CorClinica, string>` (com `CorClinica`
   mudando pra incluir `warning`). Isso não é cosmético: hoje são `as const` sem tipo — se um
   dos 4 esquecer a entrada nova, o erro só aparece em runtime (`COR_TOKEN['warning']` vira
   `undefined`, dente pinta transparente). `satisfies` faz o compilador recusar o arquivo que
   esquecer.

Verificável: typecheck. Toda call site de `corDoRegistro` (12 hoje, secao 9) para de compilar
até passar o 3º argumento — deixa o compilador achar os pontos, não grep. Dependências: Fase 1.

### Fase 3 — Escrita (Risco: MÉDIO — é a classe de bug que já mordeu este projeto)
1. `montarRowsEventos` (`src/server/patients/salvar-ficha.ts`, por volta das linhas 103-131)
   inclui `momento_planejado` no payload que vai pra RPC.
2. UI de marcação — 4 pontos viram controle de 3 vias em vez de toggle binário:
   `registro-card.tsx` (linha ~268), `ToothDetailPanel.tsx` (toggle indicado/realizado, linhas
   ~316-326), `nesta-sessao-bloco.tsx` (linhas ~67-88), `FichasTab.tsx` (linhas ~745-761).
   Contrato funcional: o dentista consegue setar `momento_planejado` tanto ao criar quanto ao
   editar um `indicado` já existente. Contrato de coerência: o gesto "marcar como realizado"
   sempre reseta `momento_planejado` pra `sessao_atual` no mesmo objeto — sem isso, o
   insert/update viola a constraint do banco na hora de salvar (erro 23514), não
   silenciosamente.

Verificável: marcar um indicado como "próxima seção", salvar, e ler direto no banco (não confiar
na UI otimista) — `select momento_planejado from odontograma_eventos where id = X` mostra
`proxima_sessao`. Dependências: Fase 1 + 2.

### Fase 4 — Leitura/exibição (Risco: BAIXO)
1. `Odontograma.tsx` (pintura do dente), `ToothDetailPanel.tsx` (badge de rótulo, linha ~778),
   `tooth-group-list.tsx`, `dente-historico-card.tsx` — já herdam a cor nova via `corDoRegistro`
   (Fase 2); só precisam repassar `ev.momento_planejado` no lugar certo da chamada.

Verificável: dente com evento `proxima_sessao` pinta âmbar nas 4 telas, sem alterar nenhum dente
coral/teal existente (regressão visual). Dependências: Fase 2 + 3.

### Fase 5 — Confirmar fronteira da IA (Risco: BAIXO, mas fácil esquecer)
1. Não mexe em `formatar-evolucao/route.ts` nem `detectar-consulta/route.ts` — confirmar que o
   responseSchema/prompt de nenhum dos dois pede `momento_planejado`. Omissão do campo garante
   por construção que a IA nunca preenche isso.

Verificável: todo evento novo criado por voz nasce com o default `sessao_atual`, mesmo que o
dentista tenha dito algo como "vou fazer isso na próxima consulta". Dependências: nenhuma
(paralelo às outras fases).

### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| R1 — coluna criada, mas a RPC de upsert não é atualizada junto, valor nunca persiste (idêntico ao bug real de `detalhe` entre as migrations 104 e 107, documentado no comentário da própria 107) | Alta, se as duas partes saírem em migrations/PRs separados | As duas em uma migration só (secao 5.2); G1 exige prova de round-trip no banco, não só na UI otimista |
| R2 — os 4 `COR_TOKEN` duplicados divergem (1 arquivo esquecido, dente pinta errado só numa tela) | Média — são `as const` sem tipo hoje, o compilador não pega sozinho | `satisfies Record<CorClinica, string>` nos 4 (Fase 2) — transforma esquecimento silencioso em erro de build |
| R3 — "marcar como realizado" não reseta `momento_planejado`, save quebra na constraint | Média — fácil esquecer numa função de toggle já existente | Contrato explícito na Fase 3; gate G4 testa o caso negativo direto no banco |
| R4 — os 4 pontos de UI (toggle 3-vias) saem visualmente inconsistentes entre si | Média | Implementar 1 primeiro (sugestão: `ToothDetailPanel.tsx`, é o mais completo), confirmar com ele, só então replicar o mesmo padrão nos outros 3 |

---

## 5. Contrato técnico

### 5.1 TypeScript — `src/types/odontograma.ts`

```typescript
/** R-101 — dentro do que ainda está 'indicado': planejado pra AGORA (sessao_atual, default)
 *  ou deliberadamente empurrado pro dentista tratar numa sessão futura. Eixo ORTOGONAL a
 *  status/origem (mesmo padrão de corDoRegistro) — nunca redefine o que é pendência, só a
 *  cor/rótulo. Só o dentista seta; a IA nunca decide (mesma classe de invariante de
 *  realizado_em, §1.10). Só é significativo quando status='indicado' (constraint no banco). */
export type MomentoPlanejado = 'sessao_atual' | 'proxima_sessao';

export function corDoRegistro(
  status: StatusRegistro,
  origem: OrigemRegistro,
  momentoPlanejado: MomentoPlanejado = 'sessao_atual',
): 'coral' | 'teal' | 'slate' | 'warning' {
  if (status === 'indicado') return momentoPlanejado === 'proxima_sessao' ? 'warning' : 'coral';
  return origem === 'preexistente' ? 'slate' : 'teal';
}
```

Campo novo em `OdontogramaEvento`, `OdontogramaEventoInput` (herdado por `OdontogramaEventoDraft`)
e `OdontogramaEstadoAtual`:

```typescript
/** R-101 — ver corDoRegistro. Default 'sessao_atual'. */
momento_planejado: MomentoPlanejado;
```

Nos 4 arquivos com `COR_TOKEN`/`COR_TOKEN_INK` locais (`Odontograma.tsx`, `ToothDetailPanel.tsx`,
`tooth-group-list.tsx`, `dente-historico-card.tsx`) — `CorClinica` (onde nomeado) ganha
`warning`, e cada objeto passa a fechar com `satisfies Record<CorClinica, string>`:

```typescript
type CorClinica = 'coral' | 'teal' | 'slate' | 'warning';
const COR_TOKEN = {
  coral: 'var(--color-coral)', teal: 'var(--color-teal)',
  slate: 'var(--color-slate)', warning: 'var(--color-warning)',
} satisfies Record<CorClinica, string>;
const COR_TOKEN_INK = {
  coral: 'var(--color-coral-ink)', teal: 'var(--color-teal-ink)',
  slate: 'var(--color-slate-ink)', warning: 'var(--color-warning-ink)',
} satisfies Record<CorClinica, string>;
```

Zod: não existe schema Zod dedicado aos eventos do odontograma hoje (grep confirmou —
validação hoje é TS estático no client + `check` no banco). Este item não introduz um, seguindo
o padrão já estabelecido.

### 5.2 Database

```sql
begin;

-- Coluna aditiva. So relevante quando status='indicado' (constraint abaixo). NOT NULL + DEFAULT
-- faz o Postgres preencher as linhas existentes sozinho, sem backfill manual.
alter table public.odontograma_eventos
  add column momento_planejado text not null default 'sessao_atual'
  check (momento_planejado in ('sessao_atual', 'proxima_sessao'));

comment on column public.odontograma_eventos.momento_planejado is
  'R-101 - dentro do que ainda esta indicado, se o dentista planejou pra AGORA (sessao_atual,
   default) ou deliberadamente pra depois (proxima_sessao). Eixo ORTOGONAL a status/origem
   (mesmo padrao de corDoRegistro) - nunca redefine o que e pendencia, so cor/rotulo. So o
   dentista seta; a IA nunca decide.';

-- realizado + "planejado pra depois" e contraditorio
alter table public.odontograma_eventos add constraint odontograma_eventos_momento_coerente check (
  momento_planejado = 'sessao_atual' or status = 'indicado'
);

-- RPC de upsert (substitui a 107 inteira - MESMA assinatura, corpo ganha a coluna nova nas 3
-- posicoes: insert columns, select, on conflict update). Esquecer 1 das 3 e o mesmo bug
-- silencioso que ja aconteceu com detalhe entre a 104 e a 107 (ver comentario da 107).
create or replace function public.salvar_eventos_odontograma(
  p_ficha_id    uuid,
  p_clinica_id  uuid,
  p_paciente_id uuid,
  p_eventos     jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_assinado_em timestamptz;
begin
  select assinado_em into v_assinado_em
  from public.fichas
  where id = p_ficha_id and clinica_id = p_clinica_id and paciente_id = p_paciente_id
  for update;

  if not found then
    raise exception 'ficha_nao_encontrada';
  end if;

  if v_assinado_em is not null then
    raise exception 'ficha_assinada';
  end if;

  delete from public.odontograma_eventos
  where ficha_id = p_ficha_id and clinica_id = p_clinica_id
    and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_eventos) e);

  insert into public.odontograma_eventos (
    id, clinica_id, paciente_id, dentista_id, ficha_id, grupo_id, tipo, status,
    origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo, observacao,
    detalhe, realizado_em, momento_planejado
  )
  select
    (e->>'id')::uuid, (e->>'clinica_id')::uuid, (e->>'paciente_id')::uuid,
    (e->>'dentista_id')::uuid, (e->>'ficha_id')::uuid,
    nullif(e->>'grupo_id', '')::uuid, e->>'tipo', e->>'status', e->>'origem', e->>'nivel',
    nullif(e->>'arcada', ''), nullif(e->>'quadrante', '')::smallint,
    nullif(e->>'dente', '')::smallint,
    coalesce((select array_agg(x) from jsonb_array_elements_text(e->'faces') x), '{}'),
    nullif(e->>'papel_no_grupo', ''), nullif(e->>'observacao', ''), e->'detalhe',
    nullif(e->>'realizado_em', '')::date,
    coalesce(nullif(e->>'momento_planejado', ''), 'sessao_atual')
  from jsonb_array_elements(p_eventos) e
  on conflict (id) do update set
    grupo_id = excluded.grupo_id, tipo = excluded.tipo, status = excluded.status,
    origem = excluded.origem, nivel = excluded.nivel, arcada = excluded.arcada,
    quadrante = excluded.quadrante, dente = excluded.dente, faces = excluded.faces,
    papel_no_grupo = excluded.papel_no_grupo, observacao = excluded.observacao,
    detalhe = excluded.detalhe, realizado_em = excluded.realizado_em,
    momento_planejado = excluded.momento_planejado;
end;
$$;

comment on function public.salvar_eventos_odontograma is
  'Upsert atomico do event-log do odontograma por id estavel (R-01/107). R-101 (137) soma
   momento_planejado nas 3 posicoes - coluna sem isso grava sempre o DEFAULT da tabela, nunca
   o valor que o client manda.';

commit;
```

Mesma assinatura de função (4 parâmetros, inalterados), então `grant`/`revoke` da migration 107
seguem valendo — não precisa repetir.

### 5.3 Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `supabase/migrations/..._137_odontograma_momento_planejado.sql` | novo — secao 5.2 |
| `src/types/odontograma.ts` | `MomentoPlanejado`, `corDoRegistro` (3º parâmetro), campo novo em 3 interfaces |
| `src/components/odontograma/Odontograma.tsx` | `CorClinica`+`COR_TOKEN`/`INK` ganham `warning`; pintura do dente passa `momento_planejado` |
| `src/components/odontograma/ToothDetailPanel.tsx` | idem + rótulo do badge (linha ~778) + toggle vira 3 vias (linhas ~316-326) |
| `src/components/odontograma/tooth-group-list.tsx` | idem (cor) |
| `src/app/dashboard/meu-dia/_components/dente-historico-card.tsx` | idem (cor) |
| `src/server/patients/salvar-ficha.ts` | `montarRowsEventos` inclui o campo no payload da RPC |
| `src/components/fichas/registro-card.tsx` | toggle vira controle de 3 vias |
| `src/app/dashboard/meu-dia/_components/nesta-sessao-bloco.tsx` | toggle vira controle de 3 vias |
| `src/components/pacientes/FichasTab.tsx` | toggle vira controle de 3 vias (linhas ~745-761) |

Não mudam (testam `status`, que continua binário — lista completa na secao 9): `get-meu-dia.ts`
(pendência/`emAndamento`), `agrupar-registros.ts`, `grupos-abertos.ts`, `dedup-eventos-draft.ts`,
`use-orcamento-modal.ts`, `assinatura-actions.ts`, `registro-actions.ts`,
`formatar-evolucao/route.ts`, `detectar-consulta/route.ts`.

### 5.4 Componentes (só o que muda)

```
ToothDetailPanel / registro-card / nesta-sessao-bloco / FichasTab
  -> toggle binario (indicado <-> realizado)
       vira controle de 3 vias (a fazer / proxima secao / concluido)
            cor: coral / warning(ambar) / teal - tokens ja existentes, zero CSS novo
```

Sem artefato novo — reusa `--color-warning`/`-pale`/`-ink` (já calibrados AA, já em produção em
10 arquivos). Referência de como o token aparece hoje: `dente-historico-card.tsx` (banner de
"tratamento em andamento", borda+fundo+ink).

## 6. Invariantes

- [ ] `status` continua com exatamente 2 valores (`indicado`, `realizado`) — nenhum ponto que
      testa `status === 'indicado'` como proxy de pendência muda de comportamento.
- [ ] `momento_planejado` só é significativo quando `status='indicado'` — imposto por constraint
      no banco, não só por checagem em app.
- [ ] Marcar como `realizado` sempre reseta `momento_planejado` para `sessao_atual` no mesmo
      gesto (nunca em 2 passos separados que possam ficar inconsistentes entre si).
- [ ] A IA (Dex, extração de voz/texto) nunca preenche `momento_planejado` — todo evento gerado
      por IA nasce `sessao_atual`, mesmo com fala explícita de intenção futura.
- [ ] `emAndamento` (R-51) e `momento_planejado` (R-101) são eixos independentes — um evento
      `indicado` de um grupo `emAndamento` pode estar em qualquer um dos dois momentos.
- [ ] Zero mudança de RLS/policy.

## 7. Gates de aceite

- [ ] G1 — marcar um `indicado` como "próxima seção" na UI, salvar, e ler direto no banco
      (`select momento_planejado from odontograma_eventos where id = X`) mostra `proxima_sessao`.
      Prova especificamente contra o R1 (RPC esquecida).
- [ ] G2 — o mesmo evento pinta âmbar (`--color-warning`) nas 4 telas: odontograma principal,
      badge do `ToothDetailPanel`, `tooth-group-list`, `dente-historico-card`.
- [ ] G3 — marcar esse mesmo evento como "concluído" -> `momento_planejado` volta a
      `sessao_atual` no banco (não fica órfão em `proxima_sessao` com `status='realizado'`).
- [ ] G4 — teste negativo direto no banco: `update odontograma_eventos set status='realizado',
      momento_planejado='proxima_sessao' where id = X` é rejeitado pela constraint, mesmo que a
      UI nunca chegasse a mandar essa combinação.
- [ ] G5 — regressão: contagem de "A fazer" (Meu Dia, `FichasTab`, elegibilidade de orçamento) é
      idêntica antes/depois para um evento marcado como "próxima seção" — ele continua contando
      como pendência.
- [ ] G6 — regressão: `emAndamento` (R-51) continua funcionando sem alteração para um grupo com
      sessão parcial, independente do `momento_planejado` do `indicado` remanescente.
- [ ] G7 — evento criado por voz/Dex nasce com `momento_planejado='sessao_atual'` mesmo quando o
      dentista dita algo como "vou fazer isso na próxima consulta".

## 8. Fora de escopo

- Badges de nível `boca`/`quadrante` em `FichasTab.tsx` (linhas ~1857, 1882 — profilaxia,
  raspagem) não ganham o rótulo "Próxima seção" no v1. Recebem a coluna no banco (é a mesma
  tabela), só não têm UI dedicada ainda — caminho de rótulo deles não passa por `corDoRegistro`.
- PDF do prontuário (`prontuario-html.ts`, linha ~123) continua mostrando "Indicado" genérico —
  não diferencia "próxima seção" no documento formal/legal.
- Refletir a cor âmbar no bloco "A fazer" do `get-meu-dia.ts`/Meu Dia — o pedido dele foi sobre
  "o dente"/odontograma; estender pro cockpit é decisão separada, não presumida aqui.
- Consolidar os 4 `COR_TOKEN` duplicados numa fonte única — achado pré-existente (não nasceu com
  este item), fica registrado mas não é refactor deste escopo.
- IA sugerir/detectar "próxima seção" a partir da fala — G7 garante que isso nunca acontece por
  omissão; ensinar a IA a entender essa intenção seria outro item, não presumido aqui.

## 9. Achados da investigação que sustentam o contrato

Não há dado hoje pra derivar "próxima seção". `odontograma_eventos` (migration 101) tem
`status`, `origem`, `realizado_em`, `registrado_em`, `created_at` — nenhum carrega intenção
temporal futura. Diferente do R-51 (`emAndamento`, 100% derivável de `grupo_id` repetido), aqui
não existe atalho: é campo novo, sem alternativa.

Grep de `status === 'indicado'|'realizado'`, presente em ~19 arquivos de produção (fora testes) —
a esmagadora maioria decide "é pendência?"/"já foi feito?", que não muda com este item:
`get-meu-dia.ts` (pendência, `semPendencia`), `agrupar-registros.ts` (`grupoEstaAberto`),
`grupos-abertos.ts`, `dedup-eventos-draft.ts`, `use-orcamento-modal.ts` (elegibilidade de
orçamento), `assinatura-actions.ts`, `registro-actions.ts`, `prontuario-html.ts`. O subconjunto
que decide cor/rótulo é bem menor e passa todo por uma função central, `corDoRegistro` — 12 call
sites, todas import (não redefinição): `FichasTab.tsx` (2x), `dente-historico-card.tsx` (2x),
`ToothDetailPanel.tsx` (3x), `tooth-group-list.tsx` (3x), `Odontograma.tsx` (1x),
`registro-card.tsx` (1x). Ter 1 função central em vez de lógica espalhada é o que torna a Fase 2
mecânica: mudar a assinatura e deixar o compilador achar quem falta atualizar.

O token de cor já existe. `globals.css` já define `--color-warning` (`#f59e0b` light /
`#fbbf24` dark — literalmente `amber-500`/`amber-400` do Tailwind), `--color-warning-pale` e
`--color-warning-ink`, calibrados AA (mesmo padrão de `-ink` usado em coral/teal/slate), já
registrados em `@theme`, já usados em 10 arquivos — inclusive no próprio odontograma
(`dente-historico-card.tsx`, banner "tratamento em andamento"). Não existe `--color-amber`
separado — seria a mesma cor sob 2 nomes.

A RPC de escrita é a fonte real do risco R1. `salvar_eventos_odontograma` (migration 107) não
insere por spread genérico — monta o insert/select coluna a coluna a partir de `p_eventos
jsonb`. O comentário da própria migration 107 documenta que isso já quebrou: a coluna `detalhe`
existiu 2 dias sem estar nessa lista, e todo evento de endo/implante salvo nesse intervalo
perdeu o dado em silêncio (sem erro). `momento_planejado` entra no mesmo padrão de risco — por
isso a Fase 1 exige as duas partes (coluna + function) na mesma migration, e G1 exige prova no
banco, não confiança na UI otimista.

`CorClinica`/`COR_TOKEN` são 4 cópias soltas, sem tipo nomeado em 3 dos 4 arquivos — só
`Odontograma.tsx` nomeia o type (`CorClinica`); os outros 3 são objetos `as const` inline. Isso
é achado pré-existente (não nasceu aqui), mas justifica o `satisfies` proposto na Fase 2 — sem
ele, esquecer 1 dos 4 é um bug visual silencioso, não um erro de build.

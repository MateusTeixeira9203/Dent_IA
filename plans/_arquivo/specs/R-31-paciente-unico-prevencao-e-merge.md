# R-31 — Paciente único: prevenção e unificação

**Modelo:** Opus (migração de dado clínico irreversível se errada)
**Status:** plano — aguardando aprovação da lista de grupos
**Origem:** auditoria técnica 29/07. Critério de casamento definido pelo Mateus: **nome completo**.
**Relacionado:** [R-29](R-29-silo-resto-modelo-antigo.md) (lista de pacientes por clínica — pré-requisito)

---

## 1. O problema

Duplicata de paciente tem **duas causas independentes**, e a hipótese inicial (escopo por
dentista) explica a minoria.

**Causa A — cadastro sem checagem.** Dois caminhos criam paciente:

| Caminho | Checagem | Onde |
|---|---|---|
| `createPaciente` (cadastro completo) | **só CPF** | `pacientes/novo/actions.ts:40-52` |
| `criarPacienteRapido` (agendamento) | **nenhuma** | `pacientes/[id]/actions.ts:125-165` |

A checagem de CPF é inerte: **218 dos 226 pacientes da Clindent não têm CPF** (96%). E ela
usa `.maybeSingle()` (`novo/actions.ts:48`) — que **erra** quando já existe mais de uma linha
com o mesmo CPF, deixando `existente` nulo e **liberando outra duplicata**. Falha aberta.

`criarPacienteRapido` só recebe `nome` e `telefone`; não tem como checar CPF nem se propõe a.

**Causa B — seleção que não pega.** `agendamentos-client.tsx:1321` fecha a lista de sugestões
150 ms depois do blur; a sugestão é um `<button>`, então o clique tem que caber nessa janela.
No celular o toque passa disso. E `:1317` zera `pacienteId` a cada tecla. O dentista tenta
selecionar, não pega, e usa o "cadastrar rápido" — que não checa nada.

**Peso relativo:** **11 dos 14** grupos de nome exato foram criados **pelo mesmo dentista**,
que enxerga os próprios pacientes. Só 3 se explicam pelo escopo por dentista. A causa
dominante é A+B, não o silo.

---

## 2. Trava de segurança — o que NÃO muda

- Nenhuma coluna de `pacientes` é renomeada ou removida
- **Nenhum `DELETE` em `pacientes`.** `pacientes` tem `ON DELETE CASCADE` para `fichas`,
  `orcamentos`, `agendamentos`, `pagamentos`, `paciente_documentos`, `odontograma_eventos`,
  `assinaturas`, `planejamentos`, `planejamento_procedimentos`, `tratamentos`. Apagar não
  deixa órfão: **destrói prontuário**
- Caminhos de storage já gravados com o id antigo (`fichas/<clinica>/<paciente>/…`) continuam válidos
- Nenhum registro clínico é copiado nem recriado — só repontado
- `assinaturas` e evento com `assinatura_id` não são tocados

---

## 3. O universo a unificar

Critério: **nome completo**, normalizado por caixa, espaços colapsados e acento. Sem
casamento parcial — decisão do Mateus, e ela é correta: juntar duas pessoas diferentes é
irreversível; não juntar é só trabalho.

| Critério | Grupos | Linhas |
|---|---|---|
| Nome exato (caixa + espaço) | 14 | 29 |
| **+ ignorando acento** | **17** | **35** |
| Conflito de telefone / nascimento / CPF | **0** | — |

Os 3 grupos que só o acento revela — todos na Clindent, todos inequívocos:

| Grupo | Como está gravado |
|---|---|
| Márcia Anastácia | `Márcia Anastácia` · `Marcia anastacia` |
| Padre Tarcísio | `Padre Tarcísio` · `padre Tarcisio` |
| Túlio Renan Gomes Mendes | `Túlio Renan Gomes Mendes` · `Tulio Renan Gomes Mendes` |

**Todas as 35 linhas estão na Clindent.** Nenhuma outra clínica tem duplicata.

**Zero linha assinada** — nenhuma das 35 tem procedimento assinado, assinatura de orçamento
ou item de planejamento. Isso importa: evento assinado é congelado por trigger
(`bloquear_edicao_evento_assinado`) e não pode ser repontado. Não há nenhum. Caminho livre.

**Faixas de confiança:**

| Faixa | Critério | Grupos |
|---|---|---|
| **Alta** | nome completo igual **e** telefone, nascimento ou CPF idêntico nas duas | 1 (Márcio Rodrigues — mesmo telefone) |
| **Média** | nome completo igual, campos corroborantes **complementares** (um tem, outro não) | 16 |
| **Conflito** | nome igual, campo corroborante **divergente** | 0 |

Nenhum grupo cai em conflito — é por isso que a união por preenchimento de lacuna resolve
todos os 17 sem arbitragem.

---

## 4. Parte 1 — Prevenção (vai antes)

Unificar antes de prevenir é trabalho perdido: as duas causas continuam de pé e a duplicata
volta no dia seguinte.

### 4.1 Checagem única, nos dois caminhos

Uma função só, usada por `createPaciente` e `criarPacienteRapido`:

```ts
interface CandidatoDuplicata {
  id: string;
  nome: string;
  data_nascimento: string | null;
  telefone: string | null;
  tem_ficha: boolean;         // para o aviso dizer se há histórico clínico
  motivo: 'cpf' | 'nome_exato' | 'nome_e_telefone' | 'nome_e_nascimento';
}

// Nunca lança. Nunca bloqueia. Devolve o que achou.
async function buscarPossiveisDuplicatas(
  supabase: SupabaseClient, clinicaId: string,
  dados: { nome: string; cpf?: string | null; telefone?: string | null; dataNascimento?: string | null },
): Promise<CandidatoDuplicata[]>
```

Regras:
1. Normalização: `lower(regexp_replace(trim(nome),'\s+',' ','g'))` + remoção de acento.
   Mesma normalização da §3, para o relatório e o app nunca divergirem.
2. **CPF continua bloqueando** (é identificador único de pessoa). Corrigir o
   `.maybeSingle()` para `.limit(2)` — hoje ele falha aberto quando já há duplicata.
3. Nome completo igual **avisa, não bloqueia**: *"Já existe um paciente com este nome nesta
   clínica. É a mesma pessoa?"* com as opções **Usar o existente** / **Cadastrar outro**.
4. Bloquear por nome seria errado: homônimo real existe.

### 4.2 Seleção de paciente no agendamento

- A escolha da sugestão passa a ser confirmada pelo `pointerdown`/`mousedown`, não depender
  do `click` chegar antes do fechamento por blur
- Fechar a lista deixa de ser por timer
- Digitar não zera mais uma seleção já confirmada — só a invalida se o texto mudar em
  relação ao nome selecionado
- **Alvo:** um toque confirma, no celular

### 4.3 Busca insensível a acento — terceira causa de duplicata

**Achado do Mateus 29/07, confirmado.** A busca de paciente usa `ilike('nome', '%q%')`
(`pacientes-list.tsx:55`, `agendamentos-client.tsx:560` e `:848`,
`financeiro-client.tsx:166`, `orcamentos-client.tsx:239`). `ILIKE` no Postgres é
**sensível a acento**: digitar "Marcia" não acha "Márcia", e vice-versa.

**Dimensão:** **43 dos 238 pacientes (18,1%) têm acento no nome.** Quase 1 em 5 é
inencontrável se quem digita não reproduzir a acentuação exata.

É a causa dos 3 grupos que só a normalização de acento revelou (§3): o dentista procura sem
acento, não acha, e cadastra de novo. As outras duas causas (§1 A e B) explicam o resto.

**A extensão `unaccent` NÃO está instalada** neste banco (extensões presentes:
`pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`). Duas saídas:

| Opção | Custo | Problema |
|---|---|---|
| `CREATE EXTENSION unaccent` + wrapper IMMUTABLE + índice de expressão | ligar extensão em produção; `unaccent()` é STABLE, não indexável direto | superfície nova no banco só para isso |
| **Coluna normalizada mantida por trigger + índice** (recomendado) | `translate()` + `lower()` são IMMUTABLE, sem extensão | nenhum |

**Contrato — recomendação:**

```sql
-- Uma definicao de "mesmo nome" para o app inteiro: busca E checagem de duplicata.
ALTER TABLE pacientes ADD COLUMN nome_busca text;

CREATE OR REPLACE FUNCTION public.normalizar_nome(txt text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT lower(regexp_replace(translate(btrim(txt),
    'áàâãäéèêëíìîïóòôõöúùûüñçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'), '\s+', ' ', 'g'))
$$;
-- backfill + trigger BEFORE INSERT OR UPDATE OF nome mantem a coluna
CREATE INDEX idx_pacientes_nome_busca ON pacientes (clinica_id, nome_busca);
-- DOWN: DROP INDEX; DROP TRIGGER; ALTER TABLE ... DROP COLUMN; DROP FUNCTION;
```

Todas as buscas passam a comparar `nome_busca ILIKE '%' || normalizar_nome(q) || '%'`.
A **mesma** `normalizar_nome` é usada por `buscarPossiveisDuplicatas` (§4.1) e pelo relatório
de grupos (§3) — assim busca, prevenção e relatório nunca divergem sobre o que é "mesmo nome".

`nome` original **nunca** é alterado: `nome_busca` é derivada. O que aparece na tela, no PDF
e no prontuário continua sendo o que o dentista digitou.

**Gate:** buscar "marcia" acha `Márcia Anastácia`; buscar "Márcia" acha `Marcia anastacia`.

### 4.4 Constraint no banco

Não existe UNIQUE em `pacientes`. Adicionar por nome seria errado (homônimo).

```sql
-- CPF é identificador de pessoa. Índice parcial: 96% dos pacientes não têm CPF e ficam de fora.
CREATE UNIQUE INDEX CONCURRENTLY uq_pacientes_clinica_cpf
  ON pacientes (clinica_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';
-- DOWN: DROP INDEX CONCURRENTLY uq_pacientes_clinica_cpf;
```

**Pré-requisito:** conferir que não existe CPF repetido hoje. Se existir, o índice falha —
e aí a limpeza daquele par vem antes.

---

## 5. Parte 2 — Unificação

### 5.1 Estrutura

```sql
-- A cópia perdedora CONTINUA existindo. Só sai das listas por filtro.
ALTER TABLE pacientes
  ADD COLUMN merged_into_id uuid NULL REFERENCES pacientes(id) ON DELETE SET NULL,
  ADD COLUMN merged_at      timestamptz NULL,
  ADD COLUMN merged_by_id   uuid NULL REFERENCES dentistas(id) ON DELETE SET NULL;

CREATE INDEX idx_pacientes_merged_into ON pacientes (merged_into_id) WHERE merged_into_id IS NOT NULL;

-- Trilha: o que foi movido, de onde, para onde, por quem.
CREATE TABLE paciente_merges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id    uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  vencedor_id   uuid NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  perdedor_id   uuid NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  executado_por uuid NULL REFERENCES dentistas(id) ON DELETE SET NULL,
  executado_em  timestamptz NOT NULL DEFAULT now(),
  contagens     jsonb NOT NULL,   -- {"fichas":2,"orcamentos":1,...} por tabela repontada
  campos_unidos jsonb NOT NULL,   -- {"telefone":"herdado","observacoes":"concatenado"}
  conflitos     jsonb NOT NULL DEFAULT '[]'::jsonb
);
-- DOWN: DROP TABLE paciente_merges; ALTER TABLE pacientes DROP COLUMN ... ;
```

`ON DELETE RESTRICT` nas duas pontas é deliberado: a trilha impede que alguém apague um
paciente que participou de merge.

### 5.2 Escolha do vencedor

Ordem determinística, e o relatório mostra o resultado para conferência:

1. Maior soma de registros clínicos (`fichas + orcamentos + agendamentos + pagamentos + eventos`)
   — minimiza o que precisa ser movido
2. Empate: o mais antigo por `created_at` — preserva continuidade de histórico
3. Empate: menor `id`

### 5.3 União de campos escalares

- Vencedor **mantém** todo campo não-nulo que já tem
- Campo nulo no vencedor **herda** do perdedor
- Campo não-nulo e **divergente** nos dois → **para o grupo**, registra em `conflitos`,
  não unifica. (Nos 17 grupos atuais: zero ocorrências)
- `observacoes`: **concatenado**, nunca escolhido —
  `vencedor || E'\n\n[unificado de ' || perdedor_id || ']\n' || perdedor`
- `dentista_id`: mantém o do vencedor. Perde relevância com a [R-29](R-29-silo-resto-modelo-antigo.md)
  (paciente é da clínica), então não é critério de nada

### 5.4 Repontamento

Uma transação **por grupo**, não uma para todos. Tabelas com `paciente_id`:

`fichas` · `orcamentos` · `agendamentos` · `pagamentos` · `paciente_documentos` ·
`odontograma_eventos` · `assinaturas` · `planejamentos` · `planejamento_procedimentos` ·
`planejamento_secoes` · `tratamentos` · `activity_logs`

Cada `UPDATE ... SET paciente_id = :vencedor WHERE paciente_id = :perdedor` grava o
`ROW_COUNT` em `contagens`. Contagem divergente do previsto **aborta a transação**.

Roda como migração privilegiada, **não pelo app** — a RLS de `pacientes` é
`is_clinic_staff()` e não distingue merge de escrita comum.

### 5.5 Reversão

Desfazer é: repontar de volta pelas `contagens`, limpar `merged_into_id`/`merged_at`/
`merged_by_id`, remover a linha de `paciente_merges`. Nenhum dado foi destruído, então a
reversão é um `UPDATE` — não uma restauração de backup.

### 5.6 Filtro na aplicação

Toda leitura de lista/busca de paciente passa a filtrar `merged_into_id IS NULL`. Inclui:
`pacientes-list.tsx`, a busca do agendamento (`agendamentos-client.tsx:558`, `:848`), a do
financeiro (`financeiro-client.tsx:164`) e a de orçamentos (`orcamentos-client.tsx:236`).
Acesso por URL direta ao id antigo **redireciona** para o vencedor.

---

## 6. Invariantes

1. Nenhum `DELETE` em `pacientes`, nunca
2. Nenhum registro clínico é criado ou copiado — só tem `paciente_id` alterado
3. Grupo com campo corroborante divergente **não** é unificado automaticamente
4. `observacoes` de ambas as cópias sobrevive
5. Todo merge é reversível por `UPDATE`
6. Merge só roda sobre lista aprovada pelo Mateus — nunca inferido em tempo de execução

---

## 7. Gates de aceite

| # | Gate | Como |
|---|---|---|
| G1 | Relatório dos 17 grupos, somente leitura, com as colunas exigidas | conferência do Mateus |
| G2 | Cadastrar paciente com nome existente **avisa** e oferece usar o existente | 2 contas |
| G3 | CPF repetido continua bloqueando, **inclusive** quando já há duplicata | fixture com CPF duplicado |
| G4 | Selecionar paciente no agendamento pega no **primeiro** toque, no celular | dispositivo real |
| G4b | Buscar "marcia" acha `Márcia Anastácia`, e "Márcia" acha `Marcia anastacia` — nas 5 telas de busca | 1 conta |
| G5 | Merge de 1 grupo move a contagem exata e não apaga nada | clínica de teste |
| G6 | Reversão devolve ao estado anterior | mesmo grupo do G5 |
| G7 | Paciente unificado desaparece das listas e a URL antiga redireciona | 2 contas |
| G8 | Nenhum registro clínico perdido: contagem por tabela antes = depois | query antes/depois |

---

## 8. Fora de escopo

- **Deduplicação por nome parcial** ("Maria Silva" × "Maria Aparecida Silva"). Decisão do
  Mateus: nome completo. Risco de juntar pessoas distintas é irreversível
- Deduplicação de **dentista**, **procedimento** ou **orçamento** — só paciente
- Merge automático sem aprovação — não existe nesta spec, por desenho

---

## 9. Aberto — preciso de decisão

1. **Os 3 grupos que só o acento revela entram?** Interpretei que sim: acento e caixa não são
   casamento parcial, é o mesmo nome completo. Confirmar ou tirar.
2. **"Mateus"** (2 cópias, Armando e Jenaina, 3 fichas somadas) — paciente real ou dado de
   teste? Se for teste, é limpeza, não merge.
3. **"Eliana Borges Ferreira"** (3 cópias, nenhuma com ficha, 3 agendamentos espalhados) —
   confirmar que é uma pessoa só.
4. **Quem executa o merge?** Recomendo: eu gero a migração, você aprova a lista, e roda uma
   clínica por vez começando pela Clindent (é a única com duplicata).

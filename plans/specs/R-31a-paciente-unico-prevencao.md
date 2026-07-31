# R-31a — Paciente único: prevenção

**Modelo:** Sonnet (mudança de app + 2 migrations aditivas; nenhuma migração de dado clínico)
**Status:** **aprovada** 30/07 — decisões da §7 tomadas, pronta pra execução
**Origem:** auditoria técnica 29/07. Recorte de 30/07: a R-31 original estourou o teto (324
linhas) e virou duas. Esta é a **primeira** — nada aqui depende da outra.
**Relacionado:** [R-31b](R-31b-paciente-unico-unificacao.md) (unificar o que já duplicou —
**depende desta**) · [R-29](R-29-silo-resto-modelo-antigo.md) (lista de pacientes por clínica)

> **Por que esta vem antes.** Unificar antes de prevenir é trabalho perdido: as causas
> continuam de pé e a duplicata volta no dia seguinte. O dado defende a ordem — ver §1.4.

---

## 1. O problema

Duplicata de paciente tem **três causas independentes**, e a hipótese inicial (escopo por
dentista) explica a minoria: **11 dos 14** grupos de nome exato foram criados **pelo mesmo
dentista**, que enxerga os próprios pacientes.

### 1.1 Causa A — cadastro sem checagem

| Caminho | Checagem | Onde |
|---|---|---|
| `createPaciente` (cadastro completo) | **só CPF** | `pacientes/novo/actions.ts:40-52` |
| `criarPacienteRapido` (agendamento) | **nenhuma** | `pacientes/[id]/actions.ts:125-165` |

A checagem de CPF é inerte: **226 dos 238 pacientes não têm CPF** (95%, reconferido 30/07).
E ela usa `.maybeSingle()` (`novo/actions.ts:48`) — que **erra** quando já existe mais de uma
linha com o mesmo CPF, deixando `existente` nulo e **liberando outra duplicata**. Falha aberta.

`criarPacienteRapido` só recebe `nome` e `telefone`; não tem como checar CPF nem se propõe a.

### 1.2 Causa B — seleção que não pega

`agendamentos-client.tsx:1321` fecha a lista de sugestões 150 ms depois do blur; a sugestão é
um `<button>`, então o clique tem que caber nessa janela. No celular o toque passa disso. E
`:1317` zera `pacienteId` a cada tecla. O dentista tenta selecionar, não pega, e usa o
"cadastrar rápido" — que não checa nada.

### 1.3 Causa C — busca sensível a acento

**Achado do Mateus 29/07, confirmado.** A busca usa `ilike('nome', '%q%')`
(`pacientes-list.tsx:55`, `agendamentos-client.tsx:560` e `:848`, `financeiro-client.tsx:166`,
`orcamentos-client.tsx:239`). `ILIKE` no Postgres é **sensível a acento**: digitar "Marcia" não
acha "Márcia", e vice-versa.

**Dimensão:** **43 dos 238 pacientes (18,1%) têm acento no nome** (reconferido 30/07). Quase 1
em 5 é inencontrável se quem digita não reproduzir a acentuação exata. É a causa dos 3 grupos
que só a normalização de acento revela.

### 1.4 A prova de que a prevenção é urgente — duplicata ainda está nascendo

Levantado 30/07, **não estava na spec original**:

| Grupo | O que o dado mostra |
|---|---|
| **Nilma** | 2 cópias criadas pelo **mesmo dentista** em **26/07, com 2 minutos de diferença** (20:30:53 → 20:32:58), 1 agendamento em cada, nenhum outro dado |
| **Eliana Borges Ferreira** | 3 cópias, **mesmo dentista**, **mesma janela de 3h38** em 21/07 (11:14 → 11:26 → 14:52), zero ficha, agendamentos espalhados 2/0/1 |

Duas cópias em 2 minutos não é dentista confundindo pessoa — é a **causa B em estado puro**: a
seleção não pegou e ele recadastrou. E é recente (26/07). Isso reordena a prioridade **dentro**
desta spec: §3.2 (seleção) deixa de ser o item de conveniência e passa a ser o de maior retorno.

---

## 2. Trava de segurança — o que NÃO muda

- Nenhuma coluna de `pacientes` é renomeada ou removida
- **Nenhum `DELETE` em `pacientes`, nunca** — `pacientes` tem `ON DELETE CASCADE` para
  `fichas`, `orcamentos`, `agendamentos`, `pagamentos`, `paciente_documentos`,
  `odontograma_eventos`, `assinaturas`, `planejamentos`, `planejamento_procedimentos`,
  `tratamentos`. Apagar não deixa órfão: **destrói prontuário**
- `pacientes.nome` **nunca** é alterado. O que aparece na tela, no PDF e no prontuário continua
  sendo exatamente o que o dentista digitou — `nome_busca` (§3.3) é coluna derivada
- Nenhum paciente existente é unificado, escondido ou repontado — isso é a
  [R-31b](R-31b-paciente-unico-unificacao.md)
- Cadastro **nunca** passa a ser bloqueado por nome: homônimo real existe

---

## 3. Contrato

> **Ordem de execução — decidida 30/07.** Não é a ordem de leitura das seções; é ditada por
> dependência real e por retorno:
>
> | # | Parte | Por quê nesta posição | Migration |
> |---|---|---|---|
> | 1º | **§3.2 seleção no agendamento** | maior retorno (§1.4: duplicata nascendo por essa causa em 26/07) e **zero dependência** — não espera nada | não |
> | 2º | **§3.3 `normalizar_nome` + `nome_busca`** | **pré-requisito da §3.1** — a checagem de duplicata compara nome normalizado; sem esta função ela não existe | sim |
> | 3º | **§3.1 checagem nos dois caminhos** | consome a função criada no passo 2 | não |
> | 4º | **§3.4 índice único de CPF** | independente dos outros três; pode ir junto ou por último | sim |
>
> Cada passo é revertível sozinho e entrega valor sozinho — não é preciso ter os 4 pra subir.

### 3.1 Checagem única, nos dois caminhos

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
1. Normalização por `normalizar_nome` (§3.3) — a **mesma** função do banco, para busca,
   prevenção e o relatório da R-31b nunca divergirem sobre o que é "mesmo nome".
2. **CPF continua bloqueando** (é identificador único de pessoa). Corrigir o `.maybeSingle()`
   para `.limit(2)` — hoje ele falha aberto justamente quando já há duplicata.
3. Nome completo igual **avisa, não bloqueia**: *"Já existe um paciente com este nome nesta
   clínica. É a mesma pessoa?"* com as opções **Usar o existente** / **Cadastrar outro**.
4. `criarPacienteRapido` passa a chamar a mesma função — hoje não checa nada.

### 3.2 Seleção de paciente no agendamento — **maior retorno da spec** (§1.4)

- A escolha da sugestão passa a ser confirmada pelo `pointerdown`/`mousedown`, não depender do
  `click` chegar antes do fechamento por blur
- Fechar a lista deixa de ser por timer
- Digitar não zera mais uma seleção já confirmada — só a invalida se o texto mudar em relação
  ao nome selecionado
- **Alvo:** um toque confirma, no celular

### 3.3 Busca insensível a acento

A extensão `unaccent` **não** está instalada neste banco (extensões presentes:
`pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`). Duas saídas:

| Opção | Custo | Problema |
|---|---|---|
| `CREATE EXTENSION unaccent` + wrapper IMMUTABLE + índice de expressão | ligar extensão em produção; `unaccent()` é STABLE, não indexável direto | superfície nova no banco só para isso |
| **Coluna normalizada mantida por trigger + índice** (recomendado) | `translate()` + `lower()` são IMMUTABLE, sem extensão | nenhum |

```sql
-- Uma definicao de "mesmo nome" para o app inteiro: busca, checagem de duplicata e o
-- relatorio de grupos da R-31b.
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

Todas as 5 buscas passam a comparar `nome_busca ILIKE '%' || normalizar_nome(q) || '%'`.

### 3.4 Constraint no banco

Não existe UNIQUE em `pacientes`. Adicionar por nome seria errado (homônimo).

```sql
-- CPF é identificador de pessoa. Índice parcial: 95% dos pacientes não têm CPF e ficam de fora.
CREATE UNIQUE INDEX CONCURRENTLY uq_pacientes_clinica_cpf
  ON pacientes (clinica_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';
-- DOWN: DROP INDEX CONCURRENTLY uq_pacientes_clinica_cpf;
```

**Pré-requisito conferido 30/07: zero CPF repetido hoje** (query direta, todas as clínicas).
O índice aplica limpo, sem limpeza prévia.

---

## 4. Invariantes

1. Nenhum `DELETE` em `pacientes`, nunca
2. `pacientes.nome` nunca é reescrito — `nome_busca` é derivada e mantida por trigger
3. Cadastro por nome **avisa**, nunca bloqueia; CPF **bloqueia**
4. Busca, checagem de duplicata e relatório usam **a mesma** `normalizar_nome`
5. Nenhum paciente existente muda de estado por causa desta spec

---

## 5. Gates de aceite

| # | Gate | Como |
|---|---|---|
| G1 | Cadastrar paciente com nome existente **avisa** e oferece usar o existente | 1 conta |
| G2 | CPF repetido continua bloqueando, **inclusive** quando já há duplicata | fixture com CPF duplicado (hoje não existe — criar na clínica de teste) |
| G3 | Selecionar paciente no agendamento pega no **primeiro** toque, no celular | dispositivo real |
| G4 | Buscar "marcia" acha `Márcia Anastácia`, e "Márcia" acha `Marcia anastacia` — **nas 5 telas** de busca | 1 conta |
| G5 | `criarPacienteRapido` (agendamento) passa a avisar igual ao cadastro completo | 1 conta |
| G6 | `nome` original intacto após o backfill: nenhuma linha de `pacientes` teve `nome` alterado | query antes/depois |

G6 é o gate de não-regressão do backfill — é a única parte desta spec que escreve em massa.

---

## 6. Fora de escopo

- **Unificar as duplicatas que já existem** → [R-31b](R-31b-paciente-unico-unificacao.md)
- **Deduplicação por nome parcial** ("Maria Silva" × "Maria Aparecida Silva"). Decisão do
  Mateus: nome completo. Risco de juntar pessoas distintas é irreversível
- Deduplicação de **dentista**, **procedimento** ou **orçamento** — só paciente

---

## 7. Decisões — tomadas 30/07 (recomendação aplicada nas duas)

1. ~~Confirmar a opção de coluna normalizada (§3.3) em vez de ligar a extensão `unaccent`.~~
   **Decidido: coluna.** Sem superfície nova no banco, e `translate()`/`lower()` são IMMUTABLE
   (indexáveis direto, o que `unaccent()` não é).
2. ~~Ordem interna: §3.2 (seleção) primeiro?~~ **Decidido: sim** — formalizado na tabela de
   ordem de execução no início da §3. É a única parte sem migration, a de maior retorno
   (§1.4), e não bloqueia nem é bloqueada por nenhuma outra parte.

---

## 8. Carona — item que destrava com esta spec

**R-35 item 14** (interpolação crua em filtro PostgREST, `pacientes-list.tsx:55` e
`novo/actions.ts:47`) estava parado esperando "a R-31". É **esta** metade que o destrava: a
busca passa a comparar `nome_busca` com valor normalizado, e a montagem do `.or()` sai do
caminho. Fechar junto, não depois.

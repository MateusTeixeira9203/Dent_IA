# R-31b — Paciente único: unificação das duplicatas existentes

**Modelo:** Opus (migração de dado clínico — irreversível se errada)
**Status:** **superada 07/08.** O mecanismo automático deste documento (merge reversível,
`paciente_merges`, repontamento) **não foi construído** — ele decidiu ao vivo ir por um
caminho mais simples: um botão de excluir paciente, manual, permanente, pra secretária (fora
de escopo original desta spec — ver `excluirPaciente` em
`src/server/patients/excluir-paciente.ts` e o item de roadmap correspondente).
**⚠️ Isso NÃO é o mesmo mecanismo — não repontua nada.** Apagar a cópia ERRADA de um par
duplicado (a que tem o histórico de verdade) destrói esse histórico pra sempre, não o move
pra cópia sobrevivente. **§1 e §1.1 abaixo continuam valendo** como o levantamento de quais
são os 16 grupos e qual cópia de cada um tem o dado real — é exatamente a informação que
quem for apagar manualmente precisa conferir antes de excluir a cópia errada.
**Cortado 07/08.** A limpeza dos 16 grupos não vira item de roadmap — a ferramenta fica
disponível (`excluirPaciente`), mas ninguém está escalado pra rodar o trabalho manual. Se
for retomado algum dia, o levantamento acima é o ponto de partida.
**Status original (30/07):** aprovada — lista de grupos fechada em 16 (§7), pronta pra
execução assim que a [R-31a](R-31a-paciente-unico-prevencao.md) estiver no ar
**Origem:** auditoria técnica 29/07. Recorte de 30/07: a R-31 original estourou o teto (324
linhas) e virou duas. Esta é a **segunda**.
**Depende de:** [R-31a](R-31a-paciente-unico-prevencao.md) — usa a função `normalizar_nome`
criada lá, e unificar antes de prevenir é trabalho perdido (a duplicata volta no dia seguinte).
**Relacionado:** [R-29](R-29-silo-resto-modelo-antigo.md) (paciente é da clínica, não do dentista)

---

## 1. O universo a unificar

Critério: **nome completo**, normalizado por caixa, espaços colapsados e acento — a mesma
`normalizar_nome` da [R-31a](R-31a-paciente-unico-prevencao.md) §3.3. Sem casamento parcial:
decisão do Mateus, e ela é correta — juntar duas pessoas diferentes é irreversível; não juntar
é só trabalho.

**Reconferido no banco em 30/07** (query direta, todas as clínicas):

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

**Zero linha assinada** — nenhuma das 35 tem procedimento assinado, assinatura de orçamento ou
item de planejamento. Isso importa: evento assinado é congelado por trigger
(`bloquear_edicao_evento_assinado`) e **não pode ser repontado**. Não há nenhum. Caminho livre.

**Faixas de confiança:**

| Faixa | Critério | Grupos |
|---|---|---|
| **Alta** | nome completo igual **e** telefone, nascimento ou CPF idêntico nas duas | 1 (Márcio Rodrigues — mesmo telefone) |
| **Média** | nome completo igual, campos corroborantes **complementares** (um tem, outro não) | 16 |
| **Conflito** | nome igual, campo corroborante **divergente** | 0 |

Nenhum grupo cai em conflito — é por isso que a união por preenchimento de lacuna resolve todos
sem arbitragem.

### 1.1 Dois grupos levantados em detalhe — decididos 30/07 (§7)

Não estavam resolvidos na spec original; o dado respondeu e a decisão foi tomada:

| Grupo | Dado | Decisão |
|---|---|---|
| **"Mateus"** (2 cópias, 3 fichas somadas) | criadas por **dentistas diferentes** (`f647fe36` e `9dbbdce3`) em 13 e 14/07, sem telefone/CPF/nascimento em nenhuma | **Fora da lista de merge** — é dado de teste (nome do próprio Mateus, já listado no `ESTADO.md` para limpeza), não duplicata real. Vira **limpeza separada**, não uma linha de `paciente_merges` |
| **"Eliana Borges Ferreira"** (3 cópias) | **mesmo dentista** (`e506ce8f`), **mesma janela de 3h38** em 21/07 (11:14 → 11:26 → 14:52), zero ficha, agendamentos 2/0/1, só a do meio tem telefone | **Entra no merge** — uma pessoa só, com alta confiança; é a assinatura da causa B (seleção que não pega) que a R-31a corrige daqui pra frente |

**Lista final de execução: 16 grupos** (17 menos "Mateus").

---

## 2. Trava de segurança — o que NÃO muda

- Nenhuma coluna de `pacientes` é renomeada ou removida
- **Nenhum `DELETE` em `pacientes`.** `pacientes` tem `ON DELETE CASCADE` para `fichas`,
  `orcamentos`, `agendamentos`, `pagamentos`, `paciente_documentos`, `odontograma_eventos`,
  `assinaturas`, `planejamentos`, `planejamento_procedimentos`, `tratamentos`. Apagar não deixa
  órfão: **destrói prontuário**
- Caminhos de storage já gravados com o id antigo (`fichas/<clinica>/<paciente>/…`) continuam
  válidos — nada é movido no bucket
- Nenhum registro clínico é copiado nem recriado — só **repontado**
- `assinaturas` e evento com `assinatura_id` não são tocados
- A cópia perdedora **continua existindo**. Só sai das listas por filtro

---

## 3. Estrutura

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

`ON DELETE RESTRICT` nas duas pontas é deliberado: a trilha impede que alguém apague um paciente
que participou de merge.

---

## 4. Execução

### 4.1 Escolha do vencedor

Ordem determinística, e o relatório mostra o resultado para conferência:

1. Maior soma de registros clínicos (`fichas + orcamentos + agendamentos + pagamentos + eventos`)
   — minimiza o que precisa ser movido
2. Empate: o mais antigo por `created_at` — preserva continuidade de histórico
3. Empate: menor `id`

### 4.2 União de campos escalares

- Vencedor **mantém** todo campo não-nulo que já tem
- Campo nulo no vencedor **herda** do perdedor
- Campo não-nulo e **divergente** nos dois → **para o grupo**, registra em `conflitos`, não
  unifica. (Nos 16 grupos da lista de execução, §1.1: zero ocorrências)
- `observacoes`: **concatenado**, nunca escolhido —
  `vencedor || E'\n\n[unificado de ' || perdedor_id || ']\n' || perdedor`
- `dentista_id`: mantém o do vencedor. Perde relevância com a
  [R-29](R-29-silo-resto-modelo-antigo.md) (paciente é da clínica), então não é critério de nada

### 4.3 Repontamento

Uma transação **por grupo**, não uma para todos. Tabelas com `paciente_id`:

`fichas` · `orcamentos` · `agendamentos` · `pagamentos` · `paciente_documentos` ·
`odontograma_eventos` · `assinaturas` · `planejamentos` · `planejamento_procedimentos` ·
`planejamento_secoes` · `tratamentos` · `activity_logs`

Cada `UPDATE ... SET paciente_id = :vencedor WHERE paciente_id = :perdedor` grava o `ROW_COUNT`
em `contagens`. **Contagem divergente do previsto aborta a transação.**

Roda como migração privilegiada, **não pelo app** — a RLS de `pacientes` é `is_clinic_staff()`
e não distingue merge de escrita comum.

### 4.4 Reversão

Desfazer é: repontar de volta pelas `contagens`, limpar `merged_into_id`/`merged_at`/
`merged_by_id`, remover a linha de `paciente_merges`. Nenhum dado foi destruído, então a
reversão é um `UPDATE` — não uma restauração de backup.

### 4.5 Filtro na aplicação

Toda leitura de lista/busca de paciente passa a filtrar `merged_into_id IS NULL`. Inclui:
`pacientes-list.tsx`, a busca do agendamento (`agendamentos-client.tsx:558`, `:848`), a do
financeiro (`financeiro-client.tsx:164`) e a de orçamentos (`orcamentos-client.tsx:236`).
Acesso por URL direta ao id antigo **redireciona** para o vencedor.

---

## 5. Invariantes

1. Nenhum `DELETE` em `pacientes`, nunca
2. Nenhum registro clínico é criado ou copiado — só tem `paciente_id` alterado
3. Grupo com campo corroborante divergente **não** é unificado automaticamente
4. `observacoes` de ambas as cópias sobrevive
5. Todo merge é reversível por `UPDATE`
6. Merge só roda sobre lista **aprovada pelo Mateus** — nunca inferido em tempo de execução

---

## 6. Gates de aceite

| # | Gate | Como |
|---|---|---|
| G1 | Relatório dos grupos, somente leitura, com vencedor proposto e contagens | conferência do Mateus |
| G2 | Merge de **1** grupo move a contagem exata e não apaga nada | clínica de teste |
| G3 | Reversão devolve ao estado anterior | mesmo grupo do G2 |
| G4 | Paciente unificado desaparece das **5** listas e a URL antiga redireciona | 2 contas |
| G5 | Nenhum registro clínico perdido: contagem por tabela antes = depois | query antes/depois |
| G6 | Grupo com conflito forjado **não** unifica e registra em `conflitos` | fixture na clínica de teste |

G6 tem que ser forjado: hoje não existe nenhum grupo em conflito, então o caminho de recusa
nunca seria exercitado pelo dado real.

---

## 7. Decisões — tomadas 30/07 (recomendação aplicada nas 4)

1. ~~Os 3 grupos que só o acento revela entram?~~ (Márcia Anastácia · Padre Tarcísio · Túlio
   Renan). **Decidido: entram.** Acento e caixa não são casamento parcial, é o mesmo nome
   completo.
2. ~~"Mateus" sai da lista?~~ **Decidido: sai.** É dado de teste (§1.1) — 2 dentistas
   diferentes, zero campo corroborante, e o `ESTADO.md` já lista pra limpeza. **Vira limpeza à
   parte, não merge** → lista final de execução: **16 grupos**.
3. ~~"Eliana Borges Ferreira" (3 cópias) é uma pessoa só?~~ **Decidido: sim**, entra no merge —
   o dado sustenta (§1.1).
4. ~~Quem executa o merge?~~ **Decidido:** eu gero a migração, o Mateus aprova a lista final (16
   grupos, este documento), e roda **uma clínica por vez** começando pela Clindent (é a única
   com duplicata).

**Consequência prática:** a lista de execução desta spec são os **16 grupos** de nome exato +
acento, **menos "Mateus"**. A limpeza de "Mateus" (2 linhas, dado de teste) é item avulso — já
está no `ESTADO.md`, não precisa de migration nem de `paciente_merges`.

---

## 8. Fora de escopo

- **Prevenir duplicata nova** → [R-31a](R-31a-paciente-unico-prevencao.md)
- **Deduplicação por nome parcial** ("Maria Silva" × "Maria Aparecida Silva"). Decisão do
  Mateus: nome completo. Risco de juntar pessoas distintas é irreversível
- Deduplicação de **dentista**, **procedimento** ou **orçamento** — só paciente
- Merge automático sem aprovação — não existe nesta spec, por desenho

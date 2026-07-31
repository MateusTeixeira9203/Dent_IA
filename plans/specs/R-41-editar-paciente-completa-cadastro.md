# R-41 — Editar paciente fecha o cadastro que o fluxo rápido deixa aberto

**Modelo:** Sonnet (UI + reuso de função que já existe; zero migration)
**Status:** **aprovada** 31/07 — decisões da §7 tomadas, pronta pra execução
**Origem:** relatado pelo Mateus em 30/07 ("cadastro e edição de paciente incompletos"),
mapeado em 31/07 depois da [R-31a](R-31a-paciente-unico-prevencao.md) ir pro ar.
**Relacionado:** [R-31a](R-31a-paciente-unico-prevencao.md) (criou `buscarPossiveisDuplicatas`
e o índice único de CPF que esta spec consome) · [R-31b](R-31b-paciente-unico-unificacao.md)

---

## 1. O problema

> *"Muitas vezes os pacientes estão sem o CPF. O fluxo da clínica é muito rápido e geralmente
> esses dados são preenchidos apenas depois."* — Mateus, 31/07

O fluxo rápido (`criarPacienteRapido`, usado na agenda) coleta **só nome e telefone**. A
intenção está certa: no balcão, com paciente esperando, pedir CPF e data de nascimento é
atrito que não cabe. O defeito não é o cadastro rápido — **é não existir onde completar depois.**

### 1.1 A lacuna, medida no banco (31/07)

| Medida | Quantidade | % de 256 |
|---|---|---|
| Pacientes sem CPF | **243** | 94,9% |
| Pacientes sem data de nascimento | **223** | 87,1% |
| Sem os dois | **221** | 86,3% |

Não é exceção — é quase toda a base.

### 1.2 A tela de editar não tem os campos

`modals/editar-paciente-modal.tsx:71-127` só oferece **nome · telefone · email · endereço ·
dentista responsável**. Não há CPF, não há data de nascimento, não há responsável.

E a lógica de "menor de idade → coleta responsável" existe **só no cadastro**
(`novo/_components/novo-paciente-form.tsx:104-105` e `:264-325`, variável `eMenor`). Um
paciente criado pelo fluxo rápido nunca passa por essa tela — então, se for menor, **não
existe nenhuma superfície no app que colete os dados do responsável dele.**

### 1.3 A mina que a R-31a plantou sem querer

`atualizarPaciente` (`[id]/actions.ts:7-41`) **já aceita `cpf` e `data_nascimento` no tipo**
(`:11`, `:15`) e grava direto (`:32-34`), sem chamar `buscarPossiveisDuplicatas` — diferente
de `createPaciente` (`novo/actions.ts:45`) e `criarPacienteRapido` (`[id]/actions.ts:143`).
E devolve `error.message` cru (`:38`), que é renderizado sem tratamento
(`editar-paciente-modal.tsx:128`).

Hoje isso é inalcançável, porque não existe campo de CPF na tela. **No momento em que esta
spec adicionar o campo, o bug fica alcançável:** colidir com `uq_pacientes_clinica_cpf`
(migration 126) vazaria `duplicate key value violates unique constraint...` direto pro
dentista. É exatamente o defeito que a R-31a corrigiu no cadastro — não pode reentrar pela
edição.

## 2. Trava de segurança — o que NÃO muda

- **Nenhuma migration.** As 5 colunas (`cpf`, `data_nascimento`, `responsavel_nome`,
  `responsavel_telefone`, `responsavel_parentesco`) já existem e são todas `nullable`
- `atualizarPaciente` **não muda de assinatura** — os campos já estão no tipo
- Cadastro rápido continua coletando só nome e telefone. **Não é este item que mexe nele**
- Nenhum dado existente é reescrito, migrado ou apagado
- A regra de reatribuição de dentista (só secretária, `actions.ts:28-30`) fica intacta
- Nenhum campo vira obrigatório em paciente que já existe — completar é opcional, sempre

## 3. Contrato

### 3.1 Os campos que entram

Decidido 31/07: **só o que fecha a lacuna do fluxo rápido**, não o espelho da tela de criar.

| Campo | Formato |
|---|---|
| `cpf` | mesma máscara do cadastro (`formatCpf`, `novo-paciente-form.tsx:31-37`) |
| `data_nascimento` | `DateInputDMY`, mesmo componente do cadastro |
| `responsavel_nome` · `responsavel_telefone` · `responsavel_parentesco` | só aparecem quando menor (§3.3) |

**Fora:** cidade, estado, observações. Já existem na tela de criar e na action, mas não são
a lacuna que o fluxo rápido deixa — entram só se virarem pedido próprio.

### 3.2 CPF duplicado bloqueia, com mensagem clara

`atualizarPaciente` passa a chamar `buscarPossiveisDuplicatas` **quando `cpf` vier
preenchido e diferente do que já está gravado**:

```ts
// mesma função da R-31a — uma definição de duplicata pro app inteiro
const duplicatas = await buscarPossiveisDuplicatas(supabase, clinicId, { nome, cpf });
const outro = duplicatas.find(d => d.motivo === 'cpf' && d.id !== pacienteId);
if (outro) return { error: `CPF já cadastrado para o paciente "${outro.nome}".` };
```

**`d.id !== pacienteId` é o ponto que não pode faltar:** sem isso, editar um paciente sem
mexer no CPF dele bloquearia contra ele mesmo.

> **Diferença deliberada em relação ao cadastro:** nome duplicado **não** avisa aqui. Na
> criação faz sentido ("é a mesma pessoa?"); na edição o paciente já existe e a pergunta é
> outra — unificar duplicata é a [R-31b](R-31b-paciente-unico-unificacao.md), não esta tela.

### 3.3 Menor de idade revela o responsável

Mesma regra do cadastro, portada: `calcularIdade(data_nascimento) < 18` → a seção
"Responsável Legal" aparece. **Portar, não reescrever** — `calcularIdade`
(`novo-paciente-form.tsx:47-55`) e `PARENTESCO_OPTIONS` (`:57-63`) saem de lá pra um lugar
compartilhado, e as duas telas passam a consumir a mesma definição.

**Diferença deliberada:** no cadastro, responsável é **obrigatório** pra menor
(`novo-paciente-form.tsx:112`). Na edição, **não bloqueia** — a tela existe justamente pra
completar aos poucos, e travar o salvamento de um telefone porque falta o nome do
responsável seria o atrito que esta spec veio remover. O campo aparece, sinalizado como
pendente; não impede salvar.

### 3.4 O modal cresce

Hoje `max-w-md` (~448px) com 5 campos. Com os novos, passa de 8. Adota o padrão já provado
no R-39a: **cabeçalho fixo · conteúdo com rolagem · rodapé fixo**, `max-height: 90vh` — o
mesmo que corrigiu o `aceite-orcamento-modal` cortando em notebook de 15".

## 4. Invariantes

1. Zero migration — as 5 colunas já existem e são nullable
2. `atualizarPaciente` não muda de assinatura
3. Nenhum campo é obrigatório na edição; salvar parcial é o caso de uso, não a exceção
4. CPF duplicado bloqueia com mensagem tratada — o erro cru do Postgres nunca chega à tela
5. Um paciente nunca colide consigo mesmo na checagem de CPF
6. `calcularIdade` e a lista de parentesco têm **uma** definição, consumida pelas duas telas

## 5. Gates de aceite

| # | Gate |
|---|---|
| G1 | Paciente criado pelo fluxo rápido: abrir Editar, preencher CPF e data de nascimento, salvar — os dois gravam |
| G2 | Salvar só o CPF, deixando o resto vazio: grava, sem exigir nada |
| G3 | CPF que já é de **outro** paciente: bloqueia com `CPF já cadastrado para o paciente "X"` — nunca o erro cru do Postgres |
| G4 | Editar um paciente **sem mexer no CPF dele**: salva normal, não bloqueia contra ele mesmo |
| G5 | Digitar data de nascimento de menor: a seção Responsável aparece na hora |
| G6 | Menor **sem** responsável preenchido: salva mesmo assim (não bloqueia, diferente do cadastro) |
| G7 | Modal em notebook baixo (~700px de altura): rodapé alcançável, conteúdo rola |
| G8 | Reatribuição de dentista continua só pra secretária |

## 6. Fora de escopo

- **Mexer no cadastro rápido** — ele está certo do jeito que está; o problema era não ter onde completar
- **Unificar duplicatas existentes** → [R-31b](R-31b-paciente-unico-unificacao.md)
- **Tornar CPF obrigatório em qualquer fluxo** — 95% da base não tem, seria travar o sistema inteiro
- **Cidade, estado, observações no editar** (§3.1) — só se virar pedido próprio
- **Backfill dos 221 pacientes incompletos** — esta spec dá a ferramenta; preencher é trabalho humano, no ritmo da clínica

## 7. Decisões — tomadas 31/07

1. ~~Quais campos entram?~~ **Só a lacuna do fluxo rápido** (CPF, nascimento, responsável).
   Cidade/estado/observações ficam de fora pra não inchar a tela.
2. ~~CPF duplicado: bloqueia ou avisa?~~ **Bloqueia, com mensagem clara.** Mesmo invariante
   da R-31a — CPF é identificador de pessoa.
3. ~~Formato da tela?~~ **Modal maior com rolagem**, padrão do R-39a.

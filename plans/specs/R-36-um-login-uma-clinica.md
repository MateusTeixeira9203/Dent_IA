# R-36 — Um login, uma clínica

**Modelo:** Opus (schema + autorização + billing + migração de dado clínico entre tenants)
**Status:** plano — aguardando aprovação
**Origem:** decisão de produto do Mateus, 30/07, ao ver o seletor de clínica na conta de teste.
**Relacionado:** [R-29](R-29-silo-resto-modelo-antigo.md) (identidade por clínica ativa — **não é
revertida**, ver §3) · [R-31b](R-31b-paciente-unico-unificacao.md) (repontamento de dado — mesma
máquina, ver §4.2)

---

## 1. A regra

> **Um login pertence a exatamente uma clínica. Não existe seletor de clínica.**
>
> Dentista no plano **solo** que aceita convite: o plano solo **morre**, ele entra no plano da
> clínica, e **os pacientes dele migram junto**. Ele passa a ver todos os pacientes da clínica,
> e é só isso — não existe "a clínica particular dele" em paralelo.

Decisão do Mateus em 30/07, e ela **corrige documento**: o `CLAUDE.md` ainda diz *"Roles por
clínica; dentista pode estar em mais de uma"*. Pela regra de precedência do próprio `CLAUDE.md`
("o que você acabou de dizer nesta conversa sempre vence documento"), essa linha está errada e
sai junto com esta spec.

---

## 2. Estado hoje — a janela está aberta

| Fato | Número |
|---|---|
| Usuários reais | 11, **todos com exatamente 1 clínica** |
| Usuários multi-clínica | **1** — a conta de teste `mateusteixeira834` (dentista na Império + **admin** da Teste01) |
| Clínicas no plano SOLO | 2 — **Vip Odontologia** (real, Clenio, 5 pacientes) e Teste01 (teste, 1 paciente) |
| Clínicas no plano CLINICA | 3 — Clindent (226 pacientes), Império (5), QA TESTE (1) |

**Como o estado ruim nasce:** cadastro por conta própria **cria uma clínica** e faz a pessoa
**admin** dela. Se essa mesma pessoa for convidada depois para outra clínica, ela fica com dois
perfis. Não é o produto dando clínica a dentista convidado — dentista que entra **só por
convite** nunca ganha clínica (prova: os 5 dentistas reais da Clindent e da Vip têm 1 cada).

**Por que agora:** travar isso hoje é quase de graça — o único caso a resolver é a conta de
teste. Depois que um dentista real aceitar convite tendo prontuário próprio, vira migração de
dado clínico com paciente de verdade no meio.

---

## 3. Trava de segurança — o que NÃO muda

- **Nenhum `DELETE`** de paciente, ficha, orçamento ou prontuário. Migrar é repontar, nunca apagar
- **Conteúdo de procedimento assinado é intocável** — a migração move a **custódia**
  (`clinica_id`), nunca o dado clínico, o status ou a assinatura
- **Prontuário nunca fica inacessível.** A guarda do CFO não admite dentista perder acesso ao
  que ele registrou
- **A [R-29](R-29-silo-resto-modelo-antigo.md) não é revertida.** `get_my_dentista_id()` filtrar
  por clínica ativa continua correto — sob a regra nova ele fica trivialmente satisfeito (só há
  uma clínica), e permanece como defesa em profundidade se a invariante for furada
- Papéis dentro da clínica (admin · dentista · secretária) não mudam
- Silo **entre** clínicas não afrouxa em nada

---

## 4. Contrato

### 4.1 Um perfil por usuário — a trava

Hoje o índice único de `dentistas` é `(clinica_id, user_id)`: garante 1 perfil **por clínica**,
mas permite N clínicas. A regra nova exige 1 perfil, ponto.

```sql
-- Substitui a garantia por-clinica por uma garantia global.
CREATE UNIQUE INDEX CONCURRENTLY uq_dentistas_user ON dentistas (user_id);
-- DOWN: DROP INDEX CONCURRENTLY uq_dentistas_user;
```

**Pré-requisito:** a conta de teste tem 2 linhas e o índice falha enquanto ela existir. Resolver
antes (ver §7.1).

### 4.2 Aceitar convite migra o solo

Quando o convidado é **admin de uma clínica SOLO**, aceitar o convite dispara, **numa transação**:

1. Repontar `clinica_id` de A → B em todas as tabelas de dado (as 33 com `clinica_id`, filtradas
   pelas que têm linha da clínica A)
2. Marcar a clínica A como encerrada (`status`), **sem apagar** — a trilha de que ela existiu fica
3. Remover o perfil de A e criar o de B com o papel do convite
4. Encerrar a assinatura do plano solo (§4.5)

É a **mesma máquina de repontamento** da [R-31b](R-31b-paciente-unico-unificacao.md): transação
única, `ROW_COUNT` conferido por tabela, **contagem divergente aborta**. Vale reusar, não
reescrever.

### 4.3 O bloqueio da imutabilidade — achado 30/07, precisa de decisão

O trigger `bloquear_edicao_evento_assinado` **não olha qual coluna mudou**:

```sql
if old.assinatura_id is not null then
  raise exception 'evento_assinado_imutavel';
end if;
```

Qualquer `UPDATE` numa linha assinada é barrado — **inclusive trocar só o `clinica_id`**. E
`odontograma_eventos` tem `clinica_id`. Logo: **migrar uma clínica solo que tenha procedimento
assinado é impossível hoje.**

**Dimensão medida 30/07:**

| Clínica | Eventos | Assinados |
|---|---|---|
| Clindent | 112 | 0 |
| Império | 41 | 0 |
| **Teste01** (solo, teste) | 4 | **3** |
| **Vip** (solo real) | **0** | 0 |

**Hoje passa** — a única solo real (Vip) não tem evento nenhum. Mas assinatura acumula: em
poucos meses qualquer solo real terá, e aí a migração trava.

**Contrato proposto:** refinar o trigger para bloquear mudança de **conteúdo clínico**, não de
**custódia**. Permitir o `UPDATE` quando **apenas** `clinica_id` muda e todo o resto é idêntico:

```sql
if old.assinatura_id is not null
   and (new is null or new is distinct from (old).*  -- exceto clinica_id
   ) then raise exception 'evento_assinado_imutavel';
```

A garantia clínica sobrevive intacta: tipo, status, faces, observação, `assinatura_id` e
`realizado_em` continuam congelados. O que passa a ser permitido é só mover de tenant — e a RLS
já impede mover para uma clínica onde o usuário não tem acesso.

### 4.4 O seletor sai

- `ClinicSwitcher` (`components/layout/clinic-switcher.tsx`) sai do sidebar e do dock
- `useClinicSwitcher` e `/api/user/clinicas` perdem a razão de existir
- **`/api/user/switch-clinic` vira 410/404** — hoje ele é o caminho que efetiva a troca; deixar
  vivo mantém a porta aberta por API mesmo sem UI
- `users.active_clinica_id` **fica** — é o que a RLS usa para resolver o tenant, e continua
  correto com um valor só

### 4.5 Billing — o plano solo morre

**Decidido 30/07:** ele **para de pagar o solo e passa a pagar o plano clínica**. A assinatura
SOLO é encerrada no aceite do convite; a cobrança dele passa a ser a da clínica que o recebeu.
O detalhe de proporcionalidade (devolve saldo do ciclo já pago, ou corre até o fim) fica pra
quando o Mateus estruturar o billing — não bloqueia o resto da spec.

### 4.6 A migração NUNCA apaga linha de `dentistas` — achado 30/07

Levantado ao investigar como resolver a conta de teste, e é **restrição dura** de implementação:

| FK para `dentistas.id` | `ON DELETE` |
|---|---|
| **`fichas.dentista_id`** | **CASCADE** |
| `orcamentos` · `pagamentos` · `agendamentos` · `odontograma_eventos` · `horarios_disponiveis` · `google_tokens` · `notificacoes` | **CASCADE** |
| `assinaturas` · `procedimentos` | NO ACTION |
| `pacientes` · `activity_logs` · e outros 10 | SET NULL |

**Apagar a linha de um dentista apaga o prontuário inteiro dele em cascata.** Na Clindent isso
seriam 18 fichas da Jenaina, 18 do Armando, 14 do Renato.

**Não é bug ativo:** varredura no `src/` inteiro não achou **nenhum** `DELETE` em `dentistas`.
Os dois caminhos que existem — `sairDaClinica` (`team.ts:161-170`) e `removerMembro`
(`team.ts:247-250`) — fazem `UPDATE ativo = false`. A promessa da tela *"Seus dados clínicos
serão preservados"* é honesta. É **mina enterrada, não pisada.**

**Contrato:** o passo 3 da §4.2 (remover o perfil da clínica antiga) é `UPDATE ativo = false` +
`clinica_usuarios.status = 'removido'`, **nunca `DELETE`**. Vale um gate próprio (G9).

**Item separado que este achado abre:** trocar o `CASCADE` de `fichas.dentista_id` por
`RESTRICT` — prontuário não deveria ser apagável por remoção de usuário, nem por engano no SQL
Editor. Não entra nesta spec (é mudança de FK em 8 tabelas), mas precisa virar item.

---

### 4.7 Encerrar a clínica solo esbarra em duas travas — achado 30/07

Descoberto tentando resolver a conta de teste na mão. **O passo 2 da §4.2, como escrito, falha.**

**Trava 1 — o último admin não pode sair.** O trigger `check_last_admin_clinica_usuarios()`
barra `UPDATE`/`DELETE` que tire o **último admin ativo** de uma clínica:

```
ERROR: Operação bloqueada: não é possível remover o último administrador da clínica
```

O dentista solo é, por definição, o **único admin** da própria clínica. Então o fluxo da R-36
sempre bate nessa trava — não é caso de canto, é o caso central.

A guarda está certa no que ela protege: clínica **ativa** sem admin fica ingovernável. Mas ela
não distingue "removendo o admin de uma clínica viva" de "encerrando a clínica inteira".

**Contrato:** a trava passa a **não se aplicar quando a clínica não está `ativa`**.
`clinicas.status` aceita `'ativa' | 'cancelada' | 'suspensa'` — clínica cancelada não precisa de
admin. Ordem correta do encerramento vira: (1) marcar a clínica como `cancelada`; (2) só então
remover o vínculo.

**Trava 2 — o seletor ignora o status da clínica.** `/api/user/clinicas` lista tudo que tem
`clinica_usuarios.status = 'ativo'`, **sem olhar `clinicas.status`**. Uma clínica cancelada
continuaria aparecendo no seletor. Uma linha de filtro resolve, e é correto **independente**
desta spec — clínica cancelada não deveria ser oferecida a ninguém.

**Consequência para o §7.1:** reforça a opção (a). A conta de teste não dá pra "limpar na mão"
sem furar essas duas guardas — o jeito certo é ela ser a **primeira execução real** do fluxo,
depois que as travas 1 e 2 e o trigger da §4.3 estiverem tratados.

## 5. Invariantes

1. Um `user_id` tem **no máximo 1** linha em `dentistas` — garantido por índice único, não por convenção
2. Nenhum `DELETE` de dado clínico. Migração é repontamento
3. Conteúdo de procedimento assinado nunca muda — só a custódia (`clinica_id`)
4. Nenhuma clínica é apagada; a solo encerrada fica registrada
5. Migração roda em transação única, com contagem conferida por tabela — divergiu, aborta
6. Não existe caminho (UI **ou** API) para um login pertencer a duas clínicas

---

## 6. Gates de aceite

| # | Gate | Como |
|---|---|---|
| G1 | O seletor de clínica não existe mais em nenhuma tela | 1 conta |
| G2 | `POST /api/user/switch-clinic` responde erro, mesmo com clinicId válido | chamada direta |
| G3 | Índice único barra a criação de um 2º perfil para o mesmo `user_id` | INSERT direto no banco |
| G4 | Dentista solo aceita convite → pacientes/fichas/orçamentos aparecem na clínica nova, com a contagem exata | clínica de teste, 2 contas |
| G5 | O mesmo, com **procedimento assinado** no meio — migra e a assinatura continua íntegra | fixture assinado (a Teste01 serve) |
| G6 | Depois da migração, o dentista vê **todos** os pacientes da clínica, e nenhum da antiga | 2 contas |
| G7 | Nenhum registro clínico perdido: contagem por tabela antes = depois | query antes/depois |
| G8 | Ficha assinada continua imutável no que importa: tentar editar conteúdo ainda dá `evento_assinado_imutavel` | teste direto no trigger |
| G9 | A migração **não apaga** linha de `dentistas` — depois dela, a linha antiga existe com `ativo=false` e as fichas seguem lá (§4.6) | query antes/depois |
| G10 | Encerrar a clínica solo funciona mesmo sendo o dono o **único admin** (§4.7, trava 1) | clínica de teste |
| G11 | Clínica `cancelada` não aparece no seletor de ninguém (§4.7, trava 2) | 1 conta |
| G12 | Clínica **ativa** continua sem poder perder o último admin — a trava 1 não foi afrouxada além do necessário | tentativa direta no banco |

G8 é o gate de não-regressão do §4.3 — é o que impede a "flexibilização" do trigger de virar um
furo na prova clínica.

---

## 7. Aberto — preciso de decisão

1. **A conta de teste (`mateusteixeira834`) e a Teste01.** O índice único (§4.1) não aplica
   enquanto ela tiver 2 perfis. Opções: (a) rodar a própria migração de convite nela — vira o
   primeiro teste real do fluxo; (b) remover o perfil da Teste01 na mão e manter a clínica como
   fixture de QA. **Recomendo (a)** — testa o caminho de verdade em dado que não é de ninguém.
2. ~~**Billing:** o que acontece com a assinatura solo?~~ **Decidido 30/07:** para de pagar o
   solo, passa a pagar o plano clínica (§4.5). Só o detalhe de proporcionalidade fica pra
   quando o billing for estruturado — não bloqueia.
3. **§4.3 — refinar o trigger** para deixar passar mudança só de `clinica_id`? Recomendo sim: sem
   isso, a regra que você definiu (migrar) fica impossível assim que houver assinatura. A
   alternativa (desligar o trigger durante a migração) é pior — abre janela sem trava nenhuma.
4. **Convite para quem já é de outra clínica CLINICA** (não solo). A regra cobre solo→clínica.
   E clínica→clínica? Recomendo: **bloquear o convite** e exigir que ele saia da atual primeiro —
   migrar prontuário entre duas clínicas de terceiros é bem diferente de trazer o próprio.

---

## 8. Fora de escopo

- **Reverter a [R-29](R-29-silo-resto-modelo-antigo.md)** — ver §3, ela continua correta e necessária
- Mudança nos papéis dentro da clínica (admin/dentista/secretária)
- Exportação de prontuário (o dentista que sai leva cópia) — item próprio, se virar requisito
- Fusão de duas clínicas CLINICA — não existe nesta spec, por desenho

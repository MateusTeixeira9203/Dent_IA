# R-36 — Um login, uma clínica

**Modelo:** Opus (schema + autorização + billing)
**Status:** plano — **reescrito 10/08**, aguardando aprovação
**Origem:** decisão de produto do Mateus, 30/07, ao ver o seletor na conta de teste.
**Reescrita 10/08:** a migração automática do consultório solo **saiu** — ver §2.
**Relacionado:** [R-29](R-29-silo-resto-modelo-antigo.md) (identidade por clínica ativa — **não é
revertida**, §3) · **R-96** (transferir administração) · **R-97** (painel operacional)

---

## 1. A regra

> **Um login pertence a exatamente uma clínica. Não existe seletor de clínica.**
>
> **Toda conta é uma clínica.** "Solo" e "Clínica" são planos **por tamanho** (1 dentista ·
> vários), não dois tipos de entidade. O dentista solo é admin da própria clínica de 1.
> **Não existe "consultório particular" como conceito paralelo** — a palavra sai do produto.

Quem atende em dois lugares tem dois logins, porque são **dois clientes pagando**. É o padrão do
mercado: o software é vendido à clínica, não à pessoa. Isso deixa de ser restrição e vira
aritmética da assinatura.

---

## 2. O que mudou na reescrita — e por quê

A versão de 30/07 dizia: dentista solo que aceita convite tem o plano morto e **os pacientes
migrados** pra clínica nova. Três coisas mataram isso:

**1. A migração entregava a cinco estranhos o prontuário que o paciente confiou a um.** A
migration 099 tornou o núcleo clínico **compartilhado** ("clínico é da clínica"). Repontar
`clinica_id` faz todo dentista da clínica B ler o histórico inteiro dos pacientes que ele atendeu
sozinho, antes de entrar. O paciente escolheu o consultório dele e nunca consentiu com isso — e é
outro CNPJ, outro corpo clínico. A spec antiga protegia o acesso **dele** (§3) e nunca olhou o
acesso dos outros.

**2. Ninguém tinha decidido o que acontece se ele sair depois.** Migrado, os pacientes são da
clínica: entra com 200, sai com 0. Pode até ser a decisão certa — mas é decisão de **negócio** (o
produto fica do lado de quem?), e estava sendo tomada por acidente, como efeito colateral de um
`UPDATE clinica_id`.

**3. Adiar custa zero: o caso aconteceu zero vezes.** 11 usuários reais, todos com 1 clínica. A
única solo real (Vip, do Clenio) tem 5 pacientes e **nenhum** evento de odontograma.

**A raiz é comercial, não técnica.** A dualidade "consultório × clínica" não nasceu do produto —
nasceu de vender um plano a uma *pessoa* (SOLO) e outro a uma *entidade* (CLINICA), e tentar fazer
um modelo de conta servir os dois. Unificando o vocabulário (todo mundo é clínica), o problema
dissolve: **não existe "migrar o consultório pra clínica" porque não existe consultório.**

**O que a reescrita economiza:** o §4.3 da versão anterior — afrouxar o trigger
`bloquear_edicao_evento_assinado` pra deixar passar mudança só de `clinica_id` — **deixa de ser
necessário**. Sem migração, nenhum `UPDATE` toca linha assinada. A imutabilidade clínica fica
intacta, **sem exceção nenhuma**. Era o ponto mais arriscado da spec antiga e ele simplesmente
some.

---

## 3. Trava de segurança — o que NÃO muda

- **Nenhum `DELETE`** de paciente, ficha, orçamento ou prontuário, em nenhum caminho desta spec
- **Nenhum `UPDATE` de `clinica_id`** em dado clínico. Custódia não se move automaticamente
- **Conteúdo de procedimento assinado é intocável** — e agora sem exceção, nem pra custódia
- **Prontuário nunca fica inacessível.** A guarda do CFO não admite dentista perder acesso ao que
  ele registrou
- **A [R-29](R-29-silo-resto-modelo-antigo.md) não é revertida.** `get_my_dentista_id()` filtrar
  por clínica ativa continua correto — sob a regra nova fica trivialmente satisfeito (só há uma
  clínica), e permanece como defesa em profundidade se a invariante for furada
- Papéis dentro da clínica (admin · dentista · secretária · protético) não mudam **nesta spec** —
  quem mexe neles é a R-96/R-97
- Silo **entre** clínicas não afrouxa em nada

---

## 4. Contrato

### 4.1 Um perfil por usuário — a trava

Hoje o índice único de `dentistas` é `(clinica_id, user_id)`: garante 1 perfil **por clínica**, mas
permite N clínicas. A regra nova exige 1 perfil, ponto.

```sql
CREATE UNIQUE INDEX CONCURRENTLY uq_dentistas_user ON dentistas (user_id);
-- DOWN: DROP INDEX CONCURRENTLY uq_dentistas_user;
```

**Este índice é o item inteiro.** É ele que faz o estado ruim parar de nascer; todo o resto da spec
é consequência ou limpeza.

**Pré-requisito:** a conta de teste (`mateusteixeira834`) tem 2 linhas e o índice falha enquanto
ela existir. Ver §7.1.

### 4.2 Convite para quem já tem clínica: **bloqueia**

Substitui a migração automática. Quando o convidado já é membro de qualquer clínica, o aceite
**falha com mensagem clara**, em vez de repontar dado:

| Situação do convidado | O que acontece |
|---|---|
| Não tem clínica nenhuma | Aceita normal — é o caminho dos 5 dentistas reais hoje |
| Admin de clínica com **0 pacientes** (cadastro abandonado) | Bloqueia, com opção de encerrar a clínica vazia e aceitar |
| Admin de clínica **com dado clínico** | Bloqueia. *"Você já tem uma clínica com N pacientes. Fale com o suporte pra transferir."* |
| Dentista (não-admin) de outra clínica | Bloqueia. *"Saia da clínica atual antes de aceitar."* |

O caso com dado é resolvido **pelo suporte, na mão**, com o dentista e o paciente na frente.
Zero migração automática, zero decisão legal tomada com pressa. Quando aparecer o primeiro caso
real, ele ensina a regra melhor do que a gente consegue chutar hoje.

**Direção pra quando virar requisito** (não é contrato ainda): o default menos ruim é **arquivo em
leitura** — a clínica antiga congela, ele mantém leitura do que registrou (satisfaz o CFO), e nada
vira da clínica nova sem o paciente consentir. Leitura sem escrita não é o multi-tenant que esta
spec mata: é arquivo morto, sem seletor, sem RLS de escrita, sem billing.

### 4.3 Vocabulário e planos

Mudança de nomenclatura, **sem schema novo** — `clinicas.plano` já é `SOLO | BASICO | CLINICA` e
`limite_dentistas` já existe.

- Os planos passam a ser descritos **por tamanho**: Solo = 1 dentista · Clínica = vários
- A palavra **"consultório"** sai da UI, da landing e da spec. Tudo é clínica
- Onboarding não muda: cadastro continua criando uma clínica e fazendo a pessoa admin dela. Sob a
  regra nova isso passa a ser o **único** caminho de virar admin, e está certo
- Quem é **admin = quem paga a assinatura**. É essa a definição da hierarquia, não "quem criou" —
  e é a que o usuário aceita ouvir

**Toca a landing/preço** — vira dependência do [R-88](../ROADMAP.md), não desta spec.

### 4.4 O seletor sai

- `ClinicSwitcher` sai do sidebar e do dock
- `useClinicSwitcher` e `/api/user/clinicas` perdem a razão de existir
- **`/api/user/switch-clinic` vira 410/404** — hoje é o caminho que efetiva a troca; deixar vivo
  mantém a porta aberta por API mesmo sem UI
- `users.active_clinica_id` **fica** — é o que a RLS usa pra resolver o tenant, e continua correto
  com um valor só

### 4.5 Nunca `DELETE` em `dentistas` — achado 30/07, continua valendo

| FK para `dentistas.id` | `ON DELETE` |
|---|---|
| **`fichas.dentista_id`** | **CASCADE** |
| `orcamentos` · `pagamentos` · `agendamentos` · `odontograma_eventos` · `horarios_disponiveis` · `google_tokens` · `notificacoes` | **CASCADE** |
| `assinaturas` · `procedimentos` | NO ACTION |
| `pacientes` · `activity_logs` · e outros 10 | SET NULL |

**Apagar a linha de um dentista apaga o prontuário inteiro dele em cascata** — na Clindent, 18
fichas da Jenaina, 18 do Armando, 14 do Renato. **Mina enterrada, não pisada:** varredura no `src/`
não achou nenhum `DELETE` em `dentistas`; `sairDaClinica` e `removerMembro` fazem `UPDATE ativo =
false`.

**Contrato:** sair/remover é sempre `UPDATE ativo = false` + `clinica_usuarios.status = 'removido'`,
**nunca `DELETE`**. Trocar o `CASCADE` por `RESTRICT` é o [R-37](../ROADMAP.md).

### 4.6 Clínica encerrada não aparece pra ninguém — achado 30/07

`/api/user/clinicas` lista tudo com `clinica_usuarios.status = 'ativo'` **sem olhar
`clinicas.status`**. Uma clínica cancelada continuaria listada. Uma linha de filtro resolve, e é
correto **independente** desta spec.

> A "trava do último admin" (`check_last_admin_clinica_usuarios`) da versão anterior **sai do
> escopo aqui**: sem encerramento automático de clínica, esta spec nunca a encosta. Ela vira
> problema da **R-96** — que é onde alguém precisa de fato passar o bastão.

---

## 5. Invariantes

1. Um `user_id` tem **no máximo 1** linha em `dentistas` — garantido por índice único, não por convenção
2. Nenhum `DELETE` de dado clínico em nenhum caminho desta spec
3. Nenhum `UPDATE` automático de `clinica_id` em dado clínico
4. Conteúdo **e** custódia de procedimento assinado nunca mudam — imutabilidade sem exceção
5. Nenhuma clínica é apagada
6. Não existe caminho (UI **ou** API) para um login pertencer a duas clínicas

---

## 6. Gates de aceite

| # | Gate | Como |
|---|---|---|
| G1 | O seletor de clínica não existe mais em nenhuma tela | 1 conta |
| G2 | `POST /api/user/switch-clinic` responde erro, mesmo com clinicId válido | chamada direta |
| G3 | Índice único barra a criação de um 2º perfil para o mesmo `user_id` | INSERT direto no banco |
| G4 | Admin de clínica **com** pacientes tenta aceitar convite → **bloqueado**, com a mensagem certa e **nenhuma linha alterada** | 2 contas + contagem antes/depois |
| G5 | Dentista de outra clínica tenta aceitar convite → bloqueado | 2 contas |
| G6 | Convidado **sem** clínica aceita normal — o caminho feliz não regrediu | 2 contas |
| G7 | Contagem por tabela **idêntica** antes e depois de um aceite bloqueado | query antes/depois |
| G8 | Ficha assinada segue imutável: qualquer `UPDATE`, inclusive só de `clinica_id`, dá `evento_assinado_imutavel` | teste direto no trigger |
| G9 | Sair/remover membro **não apaga** linha de `dentistas` — depois, a linha existe com `ativo=false` e as fichas seguem lá (§4.5) | query antes/depois |
| G10 | Clínica `cancelada` não aparece na lista de ninguém (§4.6) | 1 conta |

G8 inverte o gate antigo: antes provava que o trigger tinha sido afrouxado com segurança; agora
prova que ele **não** foi afrouxado.

---

## 7. Aberto — preciso de decisão

1. **A conta de teste (`mateusteixeira834`) e a Teste01.** O índice único (§4.1) não aplica
   enquanto ela tiver 2 perfis. **Decidido 10/08: fica como está por enquanto** — ela é o único
   caso real de 2 clínicas que existe e serve de fixture. Vira pré-requisito na execução: como não
   há mais migração automática pra rodar nela, o caminho passa a ser encerrar a Teste01 na mão
   (esbarra na trava do último admin, ver R-96) **ou** despromover o vínculo do Império.
2. **Bloquear é definitivo ou é temporário?** O §4.2 fecha a porta sem responder o que fazer
   quando bater o primeiro caso real. Recomendo tratar como **definitivo até prova em contrário** —
   suporte na mão escala bem até uns 100 dentistas, que é a meta.
3. **Cadastro por conta própria continua criando clínica?** Hoje sim, e sob a regra nova é o único
   jeito de virar admin. Recomendo manter — mas isso significa que todo cadastro abandonado vira
   uma clínica vazia que bloqueia convite futuro (§4.2, linha 2). Vale medir quantas existem.

---

## 8. Fora de escopo

- **Reverter a [R-29](R-29-silo-resto-modelo-antigo.md)** — §3, continua correta e necessária
- **Papéis e permissões dentro da clínica** — é a **R-96** (transferir admin) e a **R-97** (painel
  operacional). Esta spec só garante que existe **uma** clínica por login
- Migração de prontuário entre clínicas — cortada, ver §2
- Exportação de prontuário (o dentista que sai leva cópia) — item próprio, se virar requisito
- Fusão de duas clínicas — não existe nesta spec, por desenho
- Landing e tabela de preço com a nomenclatura nova — [R-88](../ROADMAP.md)

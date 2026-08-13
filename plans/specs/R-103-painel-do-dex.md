# R-103 — Painel do Dex (master)

> **SPEC** · **R-103** · status: **rascunho — aguardando aprovação dele**
> **Aberto:** 2026-08-11 · **Fechado:** —
> **Modelo:** Opus — este doc é diagnóstico e recorte (decisão de produto). Os sub-itens
> declaram o próprio modelo.
> **Absorve:** R-26 (Dex vira hub de notificações operacionais). **Não absorve** R-45 (recall
> proativo — dispara sem ninguém abrir nada; problema diferente).
> **Artefato aprovado por ele (3 colunas):** `plans/artefatos/R-103-painel-do-dex.html`
> **Este doc é só o mapa.** O contrato técnico de cada fatia mora na spec do sub-item:
> [R-103a](R-103a-destravar-o-dex.md) · R-103b/c e R-104 ganham spec quando entrarem.

## 1. Problema

Frase dele: o Dex *"está bloqueado, não está funcionando direito"*. Está — por quatro causas
independentes, **todas confirmadas lendo o código** (não deduzidas):

| # | Causa | Onde | Efeito |
|---|---|---|---|
| **C1** | **O gate de onboarding não tem como abrir.** `onboardingDone` só vira true por localStorage legado ou pelo evento `dex-onboarding-done` — e os **dois únicos** emissores estão **comentados**, com a nota "FASE 1: guia desativado": `DexGuide` e `PrimeirosPassosCard` | gate: `dex-widget.tsx:79-94`, `:98`, `:171` · emissores mortos: `dashboard-shell.tsx:10,140` e `dashboard/page.tsx:13,188` | Browser sem a chave antiga: clicar a bola do dock **não abre nada e não busca nada**, pra sempre. **Causa confirmada por ele (11/08):** o guia foi desativado de propósito, pra ser reestruturado depois — e levou o Dex junto, sem ninguém perceber. Dano colateral, não decisão |
| **C2** | **Pra secretária o widget nunca é montado, mas o botão dela existe** | monta em `dashboard-shell.tsx:142` (`role !== 'secretaria' && !== 'protetico'`) · bola em `floating-dock.tsx:128` (todos menos protético) | Botão morto justamente pro role que tem os 3 alertas computados |
| **C3** | **O painel mostra número inventado, com selo `demo` na tela.** `MOCK_OPS`: Clínica Score 87, ticket R$480, comparecimento 94%, conversão 73%. O comentário no código diz *"Replace with real API data after visual approval"* | `dex-widget.tsx:615-625`; renderizado em `:877`, `:894`, `:916`, `:926-932`, `:942-949`, `:1036` | **Nunca chegou a dentista nenhum** — ele confirmou em 11/08 que o mock não rodou em produção, porque o C1 mantinha o painel fechado. Um bug tapou o outro. Mas isso inverte a ordem das fases: destravar antes de limpar **exporia** o mock (ver §5) |
| **C4** | **Dois listeners do mesmo `dex-toggle`**, e o `DexPresencePanel` **não tem importador** | `dex-widget.tsx:75` · `dex-presence.tsx:154` · dispara em `floating-dock.tsx:131` | Hoje inofensivo (o órfão não monta); vira toggle duplo no instante em que alguém montá-lo |

**Três das quatro causas se resolvem apagando código ou mudando uma condição.** É por isso que o
item começa por destravar, não por query nova.

Achado extra: **o widget nunca consome `/api/dex/alerts`** — só `/api/dex/context`
(`dex-widget.tsx:99,112,128`). Alerta e notificação do banco só chegam pelo sino.

### 1.1 Duas métricas mentem

- `pacientesInativos60d` lê `pacientes.updated_at`. **Não existe trigger de `fichas` →
  `pacientes`**, então o campo só muda quando alguém **edita o cadastro** — zero relação com
  visita. Devolve **0 nas 4 clínicas**. A fonte honesta é `fichas.data_atendimento` (migration
  100, indexada `data_atendimento desc`).
- `orcamentosAprovadosSemAgendamento` **não checa agendamento nenhum** — só `updated_at < 3 dias`.
  O nome mente.

### 1.2 A medição que governa o recorte

SELECT em produção, 11/08. "Sem visita" = `not exists (select 1 from fichas f where
f.paciente_id = p.id and f.data_atendimento >= current_date - N)`.

| Clínica | Pacientes | Métrica atual | Sem visita +30d | Sem visita +60d | **Nunca tiveram ficha** |
|---|---|---|---|---|---|
| Clindent | 319 | **0** | 232 | 230 | **226** |
| Império | 8 | 0 | 3 | 3 | 3 |
| Vip | 7 | 0 | 6 | 1 | 1 |
| Teste01 | 4 | 0 | 0 | 0 | 0 |

Descontando quem nunca teve ficha, **"veio e parou" na Clindent é 6 (+30d) e 4 (+60d)** — pequeno
e acionável. Implementado ao pé da letra, o card teria **230 nomes, 226 de gente que nunca pisou
na clínica**. A distinção *"nunca veio" × "veio e parou"* é o que separa feature de ruído.

Contexto do mesmo SELECT: a Clindent tem 319 cadastros e só **93 com alguma ficha** — a base é
majoritariamente legado importado. Vale saber antes de desenhar qualquer coisa que conte pacientes.

## 2. O que ele pediu (fala dele, 11/08)

Modal **central e largo**, **3 colunas lado a lado** (decisão fechada, artefato aprovado), com:

- **pendências que pedem ação** — cancelou e precisa remarcar · não confirmou · não veio ·
  não retorna há +30/+60 dias
- **números do negócio** — quanto entrou de caixa · se a frequência diminuiu · % de crescimento
  dos atendimentos · quantos recorrentes
- **central de atualização** (conteúdo nosso) — "tivemos atualizações, ver detalhes", notas de
  release, vídeos gerados com IA nas atualizações grandes, o curso do sistema e um guia rápido
  pra secretária

Prioridade declarada por ele: *"quero programar essa bem detalhada, com bastante calma porque é
uma parte muito importante que vai ser do dia a dia do dentista"*.

**Decidido por ele em 11/08, depois de ver o artefato:** o painel passa a ser o **dono único** das
notificações — *"aquele painel vai ficar responsável por notificações, por atualizações, pelo que
a gente desenvolveu"*. E **o sininho sai**: *"acho ele meio redundante, já não está funcionando
muito legal, então é melhor a gente já tirar"*. Não é mais proposta da spec; é requisito.

## 3. Recorte em sub-itens

| Sub-item | Escopo | Estado |
|---|---|---|
| [**R-103a**](R-103a-destravar-o-dex.md) | Destravar (C1-C4), apagar o mock (C3), trocar o painel pela casca de 3 colunas do artefato — **só com dado que já existe e é honesto**. Sino sai do dock; notificação do banco vira zona no hub. Novidades por arquivo estático | spec escrita |
| [**R-103b**](R-103b-pendencias-do-dex.md) | As 3 pendências novas: *faltou e não voltou* · *cancelou e não remarcou* · *parou de vir*. Query sobre `fichas.data_atendimento` + `agendamentos`, com dedup (um paciente = um card só) e exclusão de quem nunca teve ficha. **Absorve o R-26.** As 6 abertas do §4 respondidas por ele em 12/08 | **spec escrita** — rascunho aguardando aprovação |
| **R-103c** | Coluna "O mês": atendimentos, recorrentes, visitas/paciente, Δ vs mês anterior. Copia o molde de `listarUltimosMeses(6)` + `mesWindow()` (`financeiro/actions.ts:247`), que hoje só faz dinheiro. **Contagem de atendimento por mês não existe hoje** — só dia e semana | ⏳ depois do a |
| **R-104** | Curso do sistema + vídeo por atualização grande + guia da secretária. Precisa de fonte de conteúdo que não existe. **Restrição registrada: despesa nova proibida até o refino** — YouTube não-listado é a opção grátis | ⏳ sem data |

**Por que começar pelo a:** ele não depende de **nenhuma** resposta dele (todas as abertas do §4
são do b), é majoritariamente deleção, e mata a frase que abriu o item — o Dex passa a abrir.
A limpeza (fases 1-2) sobe sozinha e é invisível; a fase 3 é a que liga a luz.

## 4. Abertas — TODAS RESPONDIDAS POR ELE EM 12/08

> ⚠️ **Este §4 virou histórico.** As definições que valem moram no contrato do
> [R-103b](R-103b-pendencias-do-dex.md) §1 e §4.2 — **inclusive porque A1 mudou** (ver A1 abaixo).
> Não implemente a partir daqui.

- **A1 · Definição de cada pendência — RESPONDIDA, e depois CORRIGIDA por ele.** Confirmou a
  proposta original: **faltou e não voltou** = `status='no_show'` entre 7 e 180 dias atrás **e**
  nenhum agendamento posterior fora de `('cancelled','no_show')` · **parou de vir** = tem ≥1
  ficha, última visita há +30 **e** nenhum agendamento futuro. **A correção:** "cancelou e não
  remarcou" media os 30 dias **só no passado**, e com isso quem cancelava a consulta de amanhã
  não caía em card nenhum. Fala dele: *"um paciente que ia vir amanhã, cancelou e não remarcou —
  ele entra nessa aba"*. A janela passou a incluir consulta futura cancelada, e "agendamento
  futuro" passou a significar futuro **não-cancelado** nos 3 tipos. Contrato final: R-103b D6/D9.
- **A2 · Dedup — RESPONDIDA (proposta confirmada).** Um paciente em **no máximo um card**,
  precedência *faltou > cancelou > parou de vir*. (O R-103b resolve em TypeScript puro, não em
  query única — D2 de lá; a garantia de "um card só" é a mesma.)
- **A3 · "Nunca veio" (226 na Clindent) — RESPONDIDA (proposta confirmada).** Fica **fora**, e
  **não** vira lista própria agora. Se virar item, é campanha de reativação (parente do R-45).
- **A4 · 30 ou 60 dias — RESPONDIDA (proposta confirmada).** **Um card, limiar 60**, com o +30 na
  sublinha ("4 há +60 dias · 6 há +30"). Dois cards com nomes sobrepostos é ruído.
- **A5 · Badge — RESOLVIDO 11/08.** Badge = **pendências + notificações não lidas**. Decorre da
  decisão dele de que o painel passa a ser o dono das notificações e o sino sai: sem contar as não
  lidas, uma notificação de check-in chegaria sem aviso visual nenhum. (Registro: o "só
  pendências" das versões anteriores desta spec era **minha** posição, não dele — atribuição
  corrigida.)
- **A6 · Escopo do dado — RESPONDIDA 12/08: "meu".** Segue o precedente
  `scopado = role !== 'secretaria'`. **Nenhum schema muda** — era a única pergunta que podia
  mudar, e a resposta fechou o risco: zero RPC `SECURITY DEFINER`, zero policy nova. Preço aceito
  conscientemente: paciente que remarcou com o **colega** aparece como "não remarcou" pra mim.
  Consequência técnica registrada no R-103b §4.1 — `fichas` (RLS da clínica inteira desde a 099)
  precisa do filtro `dentista_id` **na query**, senão app e RLS discordam.
- **A7 · CTA de WhatsApp — RESPONDIDA 12/08 (proposta confirmada).** Nesta fase o CTA abre a
  lista/agenda; disparo em lote vira item próprio (superfície nova, template aprovado, janela de
  24h da Meta).
- **A8 · Sobre o C3 — RESOLVIDO 11/08.** Não: o mock nunca rodou em produção, porque o Dex estava
  desativado. Consequência que ele não pediu mas decorre disso: **a limpeza do mock tem que vir
  ANTES de destravar**, senão o R-103a publica ficção em produção no exato commit que conserta o
  C1. Fases reordenadas na spec do a.

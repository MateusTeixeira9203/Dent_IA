# R-103b — As 3 pendências de retenção do Dex

> **SPEC** · **R-103b** · status: **🟡 codado, não commitado — G3/G4/G6/G7 pendentes (2 contas
> reais, secretária, protético, dado real nos 3 buckets)**
> **Aberto:** 2026-08-12 · **Fechado:** —
> **Modelo:** Opus — a definição de pendência cruza a assimetria de RLS entre `fichas`
> (clínica inteira, migration 099) e `agendamentos` (por dentista, migration 089).
> **Master:** [R-103](R-103-painel-do-dex.md) — diagnóstico, medição em produção (§1.2) e as
> 8 perguntas (§4), todas respondidas pelo usuário em 12/08 e formalizadas aqui como fechadas.
> Não reabre nenhuma delas.
> **Depende de:** [R-103a](../_arquivo/specs/R-103a-destravar-o-dex.md) — a casca de 3 colunas,
> `pendencias.ts`, `tipos.ts`, `useDexHub`, `coluna-pendencias.tsx`, `pendencia-card.tsx`. No ar
> (`b427391`). **Bloqueia:** nada ainda.
> **Artefato:** `plans/artefatos/R-103-painel-do-dex.html` — os 3 cards novos usam o MESMO
> `PendenciaCard` que o R-103a já implementou (nenhum componente novo). Não re-extraí tokens do
> artefato pra este doc — se o artefato mostrar um tratamento visual distinto pros 3 cards de
> retenção (ex.: multi-avatar), isso não foi conferido pixel a pixel aqui; é gap pra design-review
> antes de fechar, não presunção de paridade total.

## 1. Decisão

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | **Rota nova** GET /api/dex/retencao | Estender /api/dex/context ou /api/dex/alerts | context já tem 13 queries paralelas e ~300 linhas fazendo contagens do dia/semana; alerts mistura notificações do banco com alertas pontuais. Os 2 SELECTs de retenção trazem linhas cruas (não contagens) pra alimentar um algoritmo de classificação — natureza diferente das duas rotas existentes. useDexHub já faz Promise.all; passar de 2 pra 3 fetches é extensão trivial do mesmo padrão, não uma classe nova de complexidade |
| D2 | Classificação e dedup em TypeScript pós-fetch, função pura sem fetch/React | RPC SECURITY DEFINER ou view SQL | A6 já fechou "meu" escopo, que a RLS de agendamentos já impõe e a de fichas não — logo o filtro por dentista_id é aplicado explicitamente na query, sem precisar atravessar RLS. A precedência faltou/cancelou/parou é condicional em cascata (3 janelas de tempo, checagem de "existe linha posterior") — mais simples e testável como função pura (molde de pendencias.ts) do que SQL com CTEs |
| D3 | DexPendencia ganha campo opcional retencaoTipo | Reusar o tipo como está, sem discriminador | Pedido explícito do master (UI/analytics precisam saber qual dos 3 tipos é). Opcional preserva os 5 sites que já criam DexPendencia hoje sem tocar neles |
| D4 | **Sem índice novo** nesta fase | Índice composto (dentista_id, status, data_hora) em agendamentos | Clindent (maior clínica medida) tem 319 pacientes; a janela de 180 dias + futuro não passa de poucos milhares de linhas. Mesmo raciocínio da migration 100 pra fichas ("sem índice novo, 33 fichas em prod"). Gatilho de revisão: se um EXPLAIN mostrar seq scan custoso, ou uma clínica passar de ~5.000 agendamentos na janela |
| D5 | Severidade: faltou=alta, cancelou=média, parou=baixa | Todas média (nenhuma diferenciação) | Faltou-e-não-voltou é o sinal mais urgente (a vaga já foi perdida uma vez); parou-de-vir é o mais antigo (60+ dias já se passaram, não piora hoje) |
| D6 | "Agendamento futuro" = futuro **e não-cancelado**, nos 3 tipos — **confirmado por ele 12/08** | Ler A1 literalmente ("nenhum agendamento futuro", sem qualificador) | *"O cancelamento futuro não conta como agendamento."* Linha cancelada não é promessa de volta; contá-la excluiria da pendência exatamente quem precisa de ligação |
| D9 | **A janela de "cancelou e não remarcou" inclui consulta futura cancelada** — `data_hora >= hoje-30`, **sem teto** | Medir os 30 dias só no passado, como A1 dizia ao pé da letra | **Correção dele, 12/08** (*"um paciente que ia vir amanhã cancelou e não remarcou — entra nessa aba"*). `agendamentos` **não tem coluna de quando-cancelou** (só `data_hora` + `status`, migrations 002/059), então a janela só pode ser medida na data da consulta. Ao pé da letra, cancelar a consulta de amanhã ou a de daqui 3 semanas não cairia em card **nenhum** — nem em cancelou (data futura, fora dos "últimos 30 dias") nem em parou de vir (D6 tira quem tem futuro cancelado... e a precedência A2 manda pra cancelou de qualquer forma) |
| D7 | A sublinha de 30 dias do card "parou de vir" conta só pacientes cuja classificação final é parou (depois da precedência) | Contar todo mundo com gap >=30d, mesmo se já capturado por faltou/cancelou | Consistente com A2 ("um paciente, um card"): um paciente que já apareceu em "faltou" não deveria inflar a estatística de um card diferente. Consequência: o número pode ficar abaixo do medido cru no master (parágrafo 1.2: 6 em +30d) — divergência esperada, não bug |
| D8 | CTA: faltou/cancelou -> /dashboard/agendamentos; parou de vir -> /dashboard/pacientes | Deep-link filtrado por paciente | Nenhum card hoje (orçamentos atrasados, follow-up) linka filtrado — mesmo padrão. Filtro por lista é melhoria futura, não bloqueia esta fase |

## 2. Objetivo

Os 3 cards de retenção (faltou e não voltou, cancelou e não remarcou, parou de vir) aparecem na
coluna "Precisa de você" do hub, com dado real, sem duplicar paciente entre eles e sem nunca
mostrar quem nunca teve ficha.

**Cobre:** as 3 definições da A1 · dedup com precedência (A2) · exclusão de "nunca veio" (A3) ·
card único de "parou de vir" com sublinha 30/60 (A4) · escopo "meu" (A6) · CTA sem WhatsApp em
lote (A7) · rota nova, tipos novos, função de classificação pura, extensão de derivarPendencias.

**Não cobre:** disparo de WhatsApp em lote (item próprio, A7) · lista dedicada de "nunca veio"
(A3 — fica fora até virar campanha de reativação, parente do R-45) · qualquer UI nova além do
PendenciaCard que já existe · números do mês (R-103c) · deep-link filtrado por paciente (D8).

## 3. Assunções

- **D6 e D9 foram confirmados por ele em 12/08** — não são mais assunção. A1 tinha 2 furos que
  só apareceram ao traçar o caso concreto: (a) não qualificava "não-cancelado" em parou de vir,
  (b) media a janela de cancelou só no passado. Os dois corrigidos.
- **fichas.dentista_id é a âncora de "meu paciente"**, não pacientes.dentista_id — a migration 099
  documenta essa coluna como "zumbi", proibida como filtro de RLS ou de query "meus pacientes".
  Usei fichas.dentista_id e agendamentos.dentista_id, nunca pacientes.dentista_id.
- **Não medi volume real de agendamentos na janela de 180 dias em produção** — só o total de
  pacientes (§1.2 do master). Se for maior que o esperado, D4 tem o gatilho de revisão.
- **Catch de erro da rota nova devolve 200 com zeros**, igual context/alerts hoje — não é decisão
  nova, é consistência com o padrão já aceito nessas duas rotas (mesmo que isso signifique que uma
  falha real não vira error=true no hook). Não é escopo deste item corrigir isso.

---

## 4. Contrato técnico

### 4.1 Schema e RLS

**Nenhuma migration. Nenhuma policy nova. Nenhum RPC.** As 2 queries novas usam o client normal
(RLS ligada), igual toda rota do Dex hoje.

A assimetria que motiva o Modelo Opus, confirmada lendo as migrations:

| Tabela | Policy | Predicado | Efeito pra "meu" |
|---|---|---|---|
| agendamentos | agendamentos_access (089) | dentista_id = get_my_dentista_id() OR role='secretaria' | RLS já filtra por dentista sozinha — o .eq('dentista_id', ...) da app é redundante-mas-inofensivo |
| fichas | fichas_select (099) | belongs_to_active_clinic(clinica_id) AND is_clinic_staff() | Clínica inteira — sem o .eq('dentista_id', ...) explícito da app, um dentista veria a última ficha de pacientes de colegas. Este é o ponto onde app e RLS discordam se alguém esquecer o filtro |

fichas_select mudou pra "clínica inteira" na 099 de propósito (prontuário é do paciente, não do
dentista). O escopo "meu" de A6/D11 (R-103a) é uma escolha de produto sobreposta a uma RLS mais
aberta — por isso o filtro é obrigação da query, não da RLS.

### 4.2 TypeScript

```typescript
// src/lib/dex/tipos.ts — adições
export type DexRetencaoTipo = 'faltou_nao_voltou' | 'cancelou_nao_remarcou' | 'parou_de_vir';

// DexPendencia ganha 1 campo opcional (D3):
export interface DexPendencia {
  id: string;
  severidade: DexSeveridade;
  titulo: string;
  descricao: string;
  valorParado: number | null;
  chips: string[];
  cta: { label: string; href: string };
  retencaoTipo?: DexRetencaoTipo;   // presente só nos 3 cards novos
}

export interface DexRetencaoPaciente { id: string; nome: string; diasAtras: number }

export interface DexRetencaoData {
  faltouNaoVoltou:     { total: number; pacientes: DexRetencaoPaciente[] };  // até 5
  cancelouNaoRemarcou: { total: number; pacientes: DexRetencaoPaciente[] };  // até 5
  parouDeVir: {
    total60: number;                  // limiar de corte — o que conta no card (A4)
    total30: number;                  // sublinha — sempre >= total60 (I5)
    pacientes: DexRetencaoPaciente[]; // bucket 60d, até 5 — fonte dos chips
  };
}
```

```typescript
// src/lib/dex/retencao.ts — novo. Função PURA, sem fetch, sem React (molde de pendencias.ts).
// Recebe `agora` explícito: determinística, testável sem mockar Date.
export interface AgendamentoRetencao {
  pacienteId: string; pacienteNome: string; status: string; dataHora: string;
}
export interface FichaRetencao {
  pacienteId: string; pacienteNome: string; dataAtendimento: string;
}

export function classificarRetencao(
  agendamentos: AgendamentoRetencao[],
  fichas: FichaRetencao[],
  agora: Date,
): DexRetencaoData
```

**Algoritmo** (1 passada por paciente, precedência faltou > cancelou > parou — A2/D7):

1. Agrupa agendamentos por pacienteId.
2. **Faltou e não voltou**: existe linha status='no_show' com dataHora entre 180 e 7 dias atrás;
   e não existe linha do mesmo paciente posterior a esse no_show com status fora de
   ('cancelled','no_show'). Se sim, classificado faltou_nao_voltou, diasAtras = do no_show mais
   recente na janela.
3. Senão, **cancelou e não remarcou**: existe status='cancelled' com dataHora **>= agora-30 dias,
   sem teto superior** — inclui a consulta de amanhã e a de daqui 3 semanas (D9); e não existe
   linha futura (dataHora > agora) com status diferente de cancelled. Se sim,
   cancelou_nao_remarcou. diasAtras = do cancelamento mais recente; **negativo quando a consulta
   cancelada ainda está no futuro** (o card diz "cancelou a de amanhã", não "há -1 dia" — ver §6).
4. Senão, **parou de vir**: o perfil é *veio, foi atendido, não remarcou* — paciente tem entrada
   em fichas (senão é "nunca veio" — A3, nunca entra); agora menos max(dataAtendimento) >= 30
   dias; e não existe agendamento futuro não-cancelado (D6). Se gap >= 60 -> conta em total60 e
   total30; se 30 <= gap < 60 -> conta só em total30. pacientes[] (chips) vem só do bucket de 60d.
5. Paciente sem nenhuma condição satisfeita: não aparece em nenhum card.

### 4.3 Rotas

#### GET /api/dex/retencao

| | |
|---|---|
| Auth | required (getDentistaCached) |
| Rate limit | sim — dex:retencao, 60/60s (mesmo padrão de context/alerts) |
| Protético | gate igual alerts:37 — devolve tudo zerado, nenhuma query roda |

**Response (sucesso):** DexRetencaoData (§4.2), sempre 200.

**Implementação:** 2 SELECTs paralelos, clinica_id sempre, dentista_id quando
scopado = role !== 'secretaria' (D11, R-103a):

```typescript
// A — eventos de agendamento, janela 180d atrás até futuro sem limite
supabase.from('agendamentos')
  .select('paciente_id, status, data_hora, paciente:pacientes(nome)')
  .eq('clinica_id', dentista.clinica_id)
  .gte('data_hora', ha180Dias.toISOString())
  // + .eq('dentista_id', dentista.id) quando scopado

// B — última ficha por paciente, sem limite de data (tabela pequena — ver D4)
supabase.from('fichas')
  .select('paciente_id, data_atendimento, paciente:pacientes(nome)')
  .eq('clinica_id', dentista.clinica_id)
  // + .eq('dentista_id', dentista.id) quando scopado
```

Depois: classificarRetencao(agendamentosMapeados, fichasMapeadas, new Date()).

**Erros:** nenhum — igual context/alerts, catch devolve DexRetencaoData zerado com 200 (ver
Assunções §3). Sem autenticação -> 401, igual context.

### 4.4 Componentes

Nenhum componente novo. Mudam só:

```
src/lib/dex/tipos.ts       -- DexRetencaoTipo, DexRetencaoPaciente, DexRetencaoData,
                               DexPendencia.retencaoTipo (§4.2)
src/lib/dex/retencao.ts    -- NOVO: classificarRetencao() — função pura (§4.2)
src/lib/dex/pendencias.ts  -- derivarPendencias(alerts, ctx, retencao: DexRetencaoData | null)
                               ganha o 3º parâmetro; monta até 3 cards novos a partir dele, mesmo
                               estilo dos cards de orçamento já existentes (título com contagem,
                               chips.slice(0,4), cta)
src/app/api/dex/retencao/route.ts -- NOVO (§4.3)
src/hooks/useDexHub.ts     -- Promise.all vira 3 fetches; novo estado retencao: DexRetencaoData | null
```

coluna-pendencias.tsx e pendencia-card.tsx **não mudam** — já renderizam qualquer DexPendencia
genericamente (coluna já rola independente, overflow-y-auto, dex-hub-modal.tsx:138).

## 5. Comportamento

| Estado | Quando | Tela |
|---|---|---|
| Sem nenhuma pendência de retenção | os 3 buckets vazios | os 3 cards simplesmente não existem — coluna 1 mostra só o que já existia (ou "Tudo em dia", se nada mais também) |
| Só "parou de vir" | faltou=0, cancelou=0, parou>0 | 1 card, sublinha com os 2 números |
| Paciente em 2 condições ao mesmo tempo | ex.: no_show há 20 dias E última ficha há 90 dias | aparece só em "faltou e não voltou" (precedência D7) |
| Secretária | role='secretaria' | os 3 cards somam a clínica inteira, não um dentista |
| Protético | role='protetico' | rota devolve zerado sem query — card nunca aparece (I7 herdado do R-103a) |

```
useDexHub.carregar()
  -> Promise.all(/api/dex/alerts, /api/dex/context, /api/dex/retencao)
  -> derivarPendencias(alerts, ctx, retencao)
       -> cards existentes (perfil, agendamento, orcamento) ...
       -> + ate 3 cards de retencao, classificados 1x, nunca duplicados
  -> ordenado por severidade -> coluna 1
```

| Situação | Sistema faz | Resultado |
|---|---|---|
| Paciente faltou há 3 dias | fora da janela (carência de 7 dias) | não entra em "faltou e não voltou" ainda |
| Paciente faltou há 200 dias, nada depois | fora da janela (180 dias) | não entra — sinal velho demais pra ação |
| Paciente cancelou há 10 dias e já remarcou pra semana que vem | existe futuro não-cancelado | não entra em "cancelou e não remarcou" |
| **Paciente ia vir amanhã e cancelou, sem remarcar** | data_hora futura entra na janela (D9); nenhum futuro não-cancelado | **"cancelou e não remarcou"** — o caso que a leitura literal de A1 perdia |
| **Paciente tinha consulta daqui 3 semanas, cancelou, não remarcou, e não vem há 90 dias** | satisfaz cancelou **e** parou de vir; precedência A2 | só em **"cancelou e não remarcou"** (o sinal mais recente e específico ganha) |
| Paciente veio, foi atendido, não remarcou, 40 dias atrás | sem agendamento futuro, tem ficha | "parou de vir", contado em total30 (não em total60) |
| Paciente nunca teve ficha, sem agendamento futuro | sem entrada em fichas | nunca entra em "parou de vir" (A3/I2) |
| Dentista A e B na mesma clínica, paciente só de B | scopado filtra dentista_id nos 2 SELECTs | A não vê esse paciente em nenhum card |

## 6. Referência visual

Reusa PendenciaCard (R-103a) sem alteração — título com contagem, valorParado ausente (não há
valor em jogo nessas pendências, diferente de orçamento), descricao carrega a sublinha 30/60 no
card de "parou de vir", chips até 4 nomes, cta conforme D8. **Não conferido contra o artefato
pixel a pixel** (ver nota no cabeçalho) — gate de design-review antes de fechar.

---

## 7. Fases

| Fase | Ações | Risco | Verificável | Depende |
|---|---|---|---|---|
| **1 — Classificação pura** | src/lib/dex/retencao.ts (classificarRetencao), tipos em tipos.ts | BAIXO | testes com fixtures cobrindo os 5 casos da tabela §5 (paciente único em cada bucket + o caso de precedência) — função pura, sem rede | — |
| **2 — Rota** | src/app/api/dex/retencao/route.ts, os 2 SELECTs, gate protético, rate limit | MÉDIO | resposta como dentista bate com contagem manual na Clindent (§1.2 do master, ajustada pra D7); resposta como secretária soma a clínica inteira | 1 |
| **3 — Fiação no hub** | pendencias.ts ganha o 3º parâmetro; useDexHub vira 3 fetches | MÉDIO | os 3 cards aparecem na coluna 1, nunca duplicando paciente entre eles | 1, 2 |
| **4 — Gates** | rodar G1-G8 (§9), 2 contas logadas (dentista A/B) | BAIXO | todos fechados | 1-3 |

### Riscos

| Risco | Prob. | Mitigação |
|---|---|---|
| Filtro de fichas.dentista_id esquecido em algum ponto — vaza prontuário de colega | média | É o próprio motivo do Modelo Opus; G3 é o gate com 2 contas reais, não script |
| Volume de agendamentos na janela de 180d cresce e a query fica lenta | baixa hoje, sobe com o tempo | D4 já registra o gatilho de revisão — não é overengineering agora |
| Número da sublinha 30d (D7) sair diferente do que o master mediu cru (§1.2) e parecer bug | média | Já documentado em D7 e Assunções — divergência esperada, não regressão |
| Card de "cancelou" mostrar data no futuro e a UI ler como "há -1 dia" | média | `diasAtras` negativo é esperado (D9); o card formata "cancelou a de amanhã / a de 12/09", nunca "há N dias" com N negativo. G9 é o gate |

## 8. Invariantes

- [x] **I1** — Um paciente nunca aparece em mais de 1 dos 3 cards de retenção (precedência
      faltou > cancelou > parou). Coberto por G1/G10.
- [x] **I2** — Paciente sem nenhuma ficha (fichas) nunca aparece em "parou de vir" nem em nenhum
      outro card de retenção (A3). Coberto por G2.
- [ ] **I3** — As 2 queries novas filtram clinica_id sempre, e dentista_id explicitamente quando
      scopado — inclusive em fichas, cuja RLS sozinha NÃO impõe isso. Código revisado, filtro
      presente na rota — **falta G3 (2 contas reais) pra virar garantia**.
- [x] **I4** — Zero RPC SECURITY DEFINER, zero policy nova, zero migration neste item. `git
      status` confere: nenhuma migration nova nesta sessão (G8).
- [x] **I5** — parouDeVir.total30 >= parouDeVir.total60 sempre (30 é o superconjunto). Coberto
      por G5.
- [x] **I6** — Protético nunca recebe card de retenção (gate na rota, sem query). Código
      revisado (mesmo padrão de `alerts:37`) — falta G6 (login real) pra confirmar ao vivo.

## 9. Gates de aceite

- [x] **G1** — Fixture com paciente satisfazendo faltou E parou-de-vir simultaneamente -> aparece
      só em "faltou e não voltou" (I1). Harness `node --test`, 12/12 casos passando
- [x] **G2** — Paciente sem ficha nenhuma, mesmo com no-show antigo fora de todas as janelas, não
      aparece em card nenhum (I2/A3)
- [ ] **G3** — 2 contas logadas (dentista A, dentista B, mesma clínica): paciente exclusivo de B
      nunca aparece nos cards de A (I3) — teste manual, não script. **Pendente — precisa de você**
- [ ] **G4** — Login como secretária: os 3 cards somam pacientes dos 2 dentistas. **Pendente**
- [x] **G5** — Card "parou de vir" mostra os 2 números (30 e 60) e total30 >= total60 (I5)
- [ ] **G6** — Login como protético: nenhum card de retenção, nenhuma query nova disparada (I6).
      **Pendente**
- [ ] **G7** — CTA de "faltou"/"cancelou" abre /dashboard/agendamentos; CTA de "parou de vir"
      abre /dashboard/pacientes (D8). Rotas existem, href correto no código — **não clicado ao
      vivo** (Teste01 não tem paciente nos 3 buckets hoje)
- [x] **G8** — git diff das migrations depois deste item é vazio (I4)
- [x] **G9** — Fixture: paciente cancela consulta **de amanhã** e não remarca -> aparece em
      "cancelou e não remarcou" (D9). É o caso que a redação original de A1 perdia inteiro
- [x] **G10** — Fixture: paciente sem vir há 90 dias **e** com consulta futura cancelada ->
      aparece só em "cancelou e não remarcou", nunca em "parou de vir" (D6+D9+precedência)

**Verificado nesta sessão:** typecheck + lint limpos, `next build` passa, os 12 gates de fixture
(G1/G2/G5/G8/G9/G10) rodam via `node --test src/lib/dex/retencao.test.ts`. Testado ao vivo em
`localhost:3000` (Teste01, logado): hub abre sem erro, `/api/dex/retencao` responde 200 com o
shape certo (zerado — Teste01 não tem paciente nos 3 buckets), nenhum card falso aparece.

**G1 e G3 definem o item.** G1 fechado. **G3 segue aberto** — só ele pode logar como 2 dentistas
reais; é o item mais importante que falta, por ser o próprio motivo do Modelo Opus.

# R-46g — A porta: "Entrar no Modo Consulta" passa a abrir o Meu dia

> **SPEC** · sub-item do **R-46** · fase **plano escrito, aguardando aprovação** (31/07)
> **Modelo:** Sonnet 5 (mudança contida em UI + navegação; sem schema, sem IA, sem RLS)
> **Decisão que originou:** dele, 31/07 — *"o botão de entrar no modo consulta pode se tornar
> o trigger pro meu dia"*. Fecha a **A6** do [R-46 §8](R-46-meu-dia.md).
> **Artefato:** [R-46-ficha-dia.html](../artefatos/R-46-ficha-dia.html) §1 "A porta" — já
> desenhava exatamente isto (tokens extraídos em §9).
> **Depende de:** nada de schema. **Bloqueia:** nada. **É pré-requisito de:** R-46b.

## 1. A decisão e o ponto cego

O hero do dashboard tem hoje três ações empilhadas: **"Entrar no Modo Consulta"** (botão
grande, gradiente teal, `btn-glow` → `/consulta/{id}`) · "Já foi atendido" (marca
`completed`) · "Ver meu dia" (→ `/dashboard/meu-dia`, adicionado em R-46a). A decisão: **a
primeira passa a abrir o Meu dia** — o artefato §1 já desenhava isso, rótulo literal
`Abrir Meu dia → Marina L., 14:30`.

**O ponto cego:** `/consulta` é uma ferramenta de trabalho completa; o Meu dia hoje **não
escreve uma linha no banco**. Trocar só o destino do botão significa o dentista clicar na
ação primária do dashboard e cair numa tela onde não consegue registrar nada — contraria o
próprio **D11** do R-46 ("as fases existem pra não trocar uso real por promessa antes do
substituto provar que funciona"). A fatia que constrói o registro dentro do Meu dia é a
**R-46b**, que ainda não existe.

**Recomendação (D3):** a troca entra **junto com** a saída do Meu dia pro atendimento — vira
o hub, `/consulta` fica a 1 clique dentro do rail. Zero capacidade perdida, +1 gesto no
caminho antigo. **Sem essa contrapartida, esta spec não deve ser executada.**

## 2. O que pesa nesta decisão — inventário completo na auditoria

Varredura multi-agente com verificação adversarial (13 agentes, 31/07), achados
reconferidos contra o código. **Inventário completo (15 capacidades, 7 portas, achados de
brinde) em**
[`auditorias/2026-07-31-inventario-consulta-meu-dia.md`](../auditorias/2026-07-31-inventario-consulta-meu-dia.md) —
aqui, só o que decide algo em §5/§10/§11:

| # | Capacidade | Arquivo:linha | Escreve? |
|---|---|---|---|
| C1 | **Gate de assinatura** — trial vencido/`inativo` bloqueia. Único ponto pago-gated do produto | `consulta/[id]/page.tsx:21-34` | não |
| C2 | **Entrar inicia o atendimento** — `useEffect` sem clique vira `in_progress`. Reversível pelo dropdown "Outro status" da agenda, mas sem aviso | `consulta-client.tsx:211` → `actions.ts:172` | sim |
| C4 | **Alertas clínicos** (alergia/medicamento/histórico) das 5 últimas fichas, string com emoji, avatar vermelho | `page.tsx:105` | não |
| C7 | **Orçamentos = query morta** — buscados, nunca renderizados. Não portar | `page.tsx:63` | não |
| C15 | **Salvar fecha a agenda** — só no **create**; edição com `fichaId` nunca fecha, mesmo com `agendamentoId` | `salvar-ficha.ts:286` | sim |

### 2.1 O que o Meu dia tem hoje (R-46a) e o que falta

Rail do dia · badge de status (leitura) · sinal `✓ registrado` / `⚠ sem registro` · seleção
de paciente client-side · última visita (com eventos, ajuste de 31/07) · pendências abertas
· orto ativo (janela 120d) · link "Ver perfil completo". **Zero escrita** — sem
`actions.ts`, sem `'use server'`, sem `<form>`. Lacunas que **entram** nesta fatia
(D6/D7/D9) — lista completa (inclusive as que ficam de fora) na auditoria §1.2:

| Lacuna | Onde | Destino |
|---|---|---|
| Sem `loading.tsx`/`error.tsx`, erro de query silencioso (mesmo modo de falha do bug de Orçamentos) | `meu-dia/page.tsx:18`, `get-meu-dia.ts:129` | **entra aqui** (D6) |
| Fora da navegação mobile | `floating-dock.tsx:38` | **entra aqui** (D7) |
| Comentário promete botão "Registrar" inexistente | `contexto-coluna.tsx:3` | corrigir (D6) |
| Não tem anamnese/alergia/alerta médico | `get-meu-dia.ts:60` | **entra aqui** (D9) |

## 3. As 7 portas vivas — mapa (detalhe completo na auditoria §2)

P1 hero do dashboard (**única que muda aqui**) · P2 agenda/card MonthView · P3 agenda/modal
de detalhe · P4 walk-in "Atender agora" (**cria agendamento antes de navegar**) · P5 aba
Agendamentos do paciente · P6 Dex widget (FAB global, existe em qualquer rota) · P7
onboarding/demo.

**Levam ao Meu dia hoje:** hero (2 ramos) e sidebar desktop — nenhuma passa contexto (href
literal, sem query string). **De dentro do Meu dia pro atendimento: nada** — zero
ocorrência de `/consulta` em `src/app/dashboard/meu-dia/`.

## 4. Escopo

**Muda:** P1 abre `/dashboard/meu-dia?ag={agendamentoId}` · Meu dia ganha saída pro
atendimento por slot (contrapartida do §1) · seleção passa a ser por agendamento, não
paciente · Meu dia entra na navegação mobile · ganha `loading.tsx`/`error.tsx`/tratamento
de erro nas queries · ganha o chip de alergia no cabeçalho do contexto (D9).

**Trava de segurança — não muda** (apresentação muda, comportamento não): **P2–P7
continuam apontando pra `/consulta` sem alteração** — esta fatia move **uma** porta.
`/consulta` continua existindo, intacta — virar redirect é a fase 3 do [R-46 §5](R-46-meu-dia.md),
gated pela A1, não acontece aqui. Nada de `salvarFicha`, RPC 107, assinatura,
`MarkAttendedButton` ou `atualizarStatusAgendamento` muda. Nenhuma migration, nenhuma
policy de RLS, nenhum campo novo. Nenhuma mudança em `/consulta/[id]/**` — nem pra
remover a query morta do C7 (vira item próprio).

## 5. Decisões

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| **D1** | CTA primário do hero abre o **Meu dia**, com o agendamento no parâmetro | Manter os dois botões como estão | Dele, 31/07. Bate com o artefato §1 e o D11 do R-46 |
| **D2** | Rótulo novo: **"Abrir meu dia → {Nome}, {HH:MM}"** | "Ver meu dia" genérico | Rótulo literal do artefato §1; carregar nome+hora preserva "vou atender **este** paciente" |
| **D3** | **A troca só entra com a saída pro atendimento dentro do Meu dia** — cada slot do rail ganha ação `/consulta/{agendamentoId}` | Trocar o destino e deixar o Meu dia sem saída | §1. Sem isso a ação primária vira beco sem saída. **Trava: os dois sobem no mesmo commit ou nenhum sobe** |
| **D4** | Botão **perde o efeito colateral de `in_progress`** — abrir o Meu dia não muda status nenhum. `in_progress` continua nascendo só ao entrar em `/consulta` (C2, intocado) | Replicar o auto-início no Meu dia | Meu dia é a visão do dia inteiro, não de 1 atendimento — marcar `in_progress` ao abrir uma lista de 8 pacientes seria errado. **Ganho:** acaba o `in_progress` acidental por recarregar a página |
| **D5** | Meu dia aceita `?ag={agendamentoId}` e **seleciona por `agendamentoId`**, não `pacienteId` | Manter seleção por paciente | Hoje `selecionadoId` é `pacienteId` — 2 atendimentos do mesmo paciente no mesmo dia ficam indistinguíveis. Trocar agora custa 3 linhas; depois do R-46b custa o dobro |
| **D6** | Entram aqui: `loading.tsx`, `error.tsx`, tratamento do `error` das 4 queries, correção do comentário mentiroso | Deixar pro R-46b | A tela vira **a porta** — erro silencioso numa porta é pior que numa lateral; regras de Performance e honestidade de comentário do CLAUDE.md |
| **D7** | Meu dia entra no `floating-dock` e no `mobile-drawer` | Só desktop | Modo consulta foi abandonado por **barreira física** (dentista longe do PC) — porta nova só no desktop repete o erro |
| **D8** | "Ver meu dia" redundante **sai** dos dois ramos do hero | Manter os dois | Com D1 o CTA primário já é o Meu dia. No ramo vazio/concluído, "Ver meu dia" **vira** o CTA principal — lá não há agendamento pra substituir |
| **D9** | Chip de alergia entra **nesta fatia**, não espera o R-46f | Deixar pro modelo novo de estado do paciente | Dele, 31/07: "é muito bom ter esse dado". **Mesma fonte do hero** — `pacientes.observacoes` (`next-appointment-hero.tsx:447`), não a derivação mais cara do C4 (5 fichas do `/consulta`). É reaproveitar, não construir. R-46f fica responsável pelo modelo permanente (badge + revalidação); isto aqui é o alerta de leitura |

## 6. Contrato técnico

### 6.1 Rota

```typescript
// src/app/dashboard/meu-dia/page.tsx — passa a receber searchParams.
// Convenção de chave curta, igual ao resto do dashboard (agendamentos usa v/d/novo).
export default async function MeuDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ ag?: string }>;
}): Promise<JSX.Element>;
```

`ag` é **opcional e não confiável** — só pré-seleciona um slot que já veio do fetch
escopado por `clinica_id`+`dentista_id`; **nunca** busca agendamento por ele. Um `ag` de
outra clínica não casa com nada e cai no default.

### 6.2 Cliente

```typescript
// meu-dia-client.tsx — a chave de seleção troca de pacienteId pra agendamentoId (D5).
export function MeuDiaClient({
  slots,
  contextoPorPaciente,
  agendamentoInicialId,   // vem do searchParams.ag, já validado contra os slots no servidor
}: MeuDiaData & { agendamentoInicialId?: string }): JSX.Element;

// Precedência do default: 1. agendamentoInicialId (se casar com um slot)
//                         2. slot 'in_progress'/'checked_in'   (comportamento atual)
//                         3. slots[0]                          (comportamento atual)
```

```typescript
// rail.tsx — o slot ganha a ação de atendimento (D3).
export interface RailProps {
  slots: MeuDiaSlot[];
  selecionadoId: string | null;        // agora agendamentoId
  onSelecionar: (agendamentoId: string) => void;
}
```

O card continua sendo o alvo de **seleção**; atender é um controle **dentro** do card
selecionado — nunca o card inteiro (não misturar "olhar o próximo" com "abrir o
atendimento"). Condição de exibir, copiada de `month-view.tsx:379` (não uma 4ª regra):

```typescript
const podeAtender = !['cancelled', 'no_show', 'completed'].includes(slot.statusAgendamento);
// rótulo: 'in_progress' → "Continuar atendimento" · senão → "Iniciar consulta"
//         (mesma regra de agendamentos-client.tsx:2035)
```

### 6.3 Hero

```typescript
// consulta-cta-button.tsx — o componente muda de destino e de rótulo (D1/D2).
interface ConsultaCtaButtonProps {
  agendamentoId: string;
  pacienteNome: string;   // novo — o rótulo carrega nome
  horario: string;        // novo — "HH:MM", já formatado pelo hero
}
// router.push(`/dashboard/meu-dia?ag=${agendamentoId}`)
```

O hero já tem `nomeFormatado`/`hora` (`:289-290`) — não busca nada novo. **Renomear** o
arquivo pra `abrir-meu-dia-button.tsx` (fica enganoso depois da troca; único importador é
`next-appointment-hero.tsx:503`).

### 6.4 Erro e carregamento (D6)

```typescript
// get-meu-dia.ts — as 4 queries passam a desestruturar error e a falhar alto.
// Hoje: const { data } = await ... ; (data ?? [])   ← RLS negando vira "dia vazio"
// Novo: const { data, error } = await ... ; if (error) throw new Error(...)
// O throw é capturado pelo error.tsx da rota — nunca renderiza um dia vazio falso.
```

Arquivos novos: `meu-dia/loading.tsx` (skeleton do rail + card de contexto) e
`meu-dia/error.tsx` (`'use client'`, com `reset`).

### 6.5 Alergia (D9)

```typescript
// get-meu-dia.ts — MeuDiaContexto ganha alertas; mesma fonte e parse do hero, não o C4.
export interface MeuDiaContexto {
  ultimaVisita: MeuDiaUltimaVisita | null;
  pendencias: MeuDiaPendencia[];
  orto: MeuDiaOrto | null;
  alertas: string[];   // paciente.observacoes.split('\n').filter(Boolean) — igual next-appointment-hero.tsx:447
}
// select de agendamentos ganha o campo: 'id, data_hora, status, paciente:pacientes(id, nome, observacoes)'
```

Renderiza no topo da `ContextoColuna`, mesmo estilo de chip do hero (`AlertCircle` + texto,
fundo âmbar) — não é componente novo, é o mesmo padrão visual copiado.

### 6.6 Freshness (A3 — sem código)

Next 16.1 não cacheia página dinâmica por padrão em navegação por `<Link>`/`router.push`
(só reusa em voltar/avançar do navegador, ou com `staleTimes` — que este projeto não
configura em `next.config.ts`). O cenário dele — sair pro resto do app e voltar pro Meu dia
— já recebe dado fresco hoje. **Nenhuma mudança de código.** Resíduo: só o botão
voltar/avançar do navegador pode mostrar estado velho — caso estreito, fora de escopo até
virar reclamação real.

## 7. Invariantes

- [ ] **I1** — Abrir o Meu dia (qualquer porta) **não escreve nada no banco** — sem
      `actions.ts`, sem `'use server'`, sem `<form>`. Verificável por grep.
- [ ] **I2** — `?ag=` nunca alimenta query — id de outra clínica/dentista só não casa e cai no default.
- [ ] **I3** — A ação de atender do rail leva ao **mesmo** `/consulta/{agendamentoId}` das
      outras 5 portas. Nenhum caminho paralelo é criado.
- [ ] **I4** — A regra de "pode atender" é **uma só** no projeto (`month-view.tsx:379`).
- [ ] **I5** — Erro de query nunca renderiza como "dia vazio" ou "sem histórico".
- [ ] **I6** — Nenhuma porta de `/consulta` além da P1 muda de destino.
- [ ] **I7** — O gate de assinatura (C1) continua só em `/consulta`. **Decisão dele (01/08):
      ignorar por ora** — "ainda não temos nem um sistema de pagamento pra fazer esse
      controle" (`status_assinatura`/`inativo` não tem nada de verdade populando/cobrando
      hoje). Cheguei a implementar (01/08) e revertei no mesmo dia — ver A1.

## 8. Gates de aceite

Rodar na clínica de teste, logado como **dentista** (a rota redireciona secretária).

**Porta e navegação**
- [ ] **G1** — Próximo atendimento → CTA lê "Abrir meu dia → {Nome}, {HH:MM}" e abre
      `/dashboard/meu-dia?ag=...`. Não clicado a partir do hero em si (G2 confirma o destino
      funciona; falta ver o botão do hero disparando).
- [x] **G2** — Confirmado ao vivo (31/07): naveguei direto pra `?ag={id do Mateus Teixeira}`
      (não é o default, que seria "marcos") e ele nasceu selecionado — contexto, pendências e
      "Iniciar consulta" certos desde o 1º render.
- [ ] **G3** — Confirmado por observação: `?ag` ausente ou inválido sempre caiu em "marcos"
      (1º slot, todos os 4 estão `checked_in` nesta clínica de teste — não há como testar o
      desempate por `in_progress` com este dado).
- [x] **G4** — Confirmado ao vivo: `?ag=lixo-invalido-123` caiu no default, sem erro, sem
      tela em branco.
- [ ] **G5** — Código confirma (só 1 Link pro Meu dia no ramo preenchido); não vi o ramo
      vazio/concluído ao vivo (precisa de um dia sem agendamento pra testar).
- [x] **G6** — 375px: sem overflow horizontal (`scrollWidth === clientWidth`). Item "Meu dia"
      confirmado no código de `floating-dock.tsx` e `mobile-drawer.tsx`; não confirmei o
      drawer abrindo de verdade (animação do Framer, difícil de pegar por acessibilidade).

**Atendimento a partir do Meu dia**
- [ ] **G7** — 🟡 parcial, confirmado ao vivo: `checked_in` mostra "Iniciar consulta" só no
      card selecionado (testei em 2 slots diferentes, moveu certo), `href` aponta pro
      `/consulta/{id}` certo em ambos. **Falta:** `in_progress` → "Continuar atendimento" e
      `completed`/`no_show`/cancelado → sem ação (sem esse status nos dados de teste); não
      cliquei no link em si (evitar disparar o `in_progress` de verdade sem necessidade).
- [x] **G8** — Confirmado ao vivo: cliquei num 2º slot, contexto trocou (paciente, pendências,
      "Iniciar consulta" migrou de card), URL continuou em `/dashboard/meu-dia`.

**Efeito colateral (D4) — prova a mudança de comportamento**
- [ ] **G9** — Abrir o Meu dia com um agendamento `scheduled` e **conferir no banco**: status
      continua `scheduled`. Nada virou `in_progress`.
- [ ] **G10** — Dali, clicar "Iniciar consulta" → aí sim vira `in_progress` (C2 intocado), e a
      agenda da secretária reflete.

**Não-regressão e correções (D6/D7)**
- [ ] **G11** — P2, P3, P5 e P6 continuam abrindo `/consulta` direto; P4 continua criando o
      encaixe e indo pro atendimento.
- [ ] **G12** — Salvar ficha pelo `/consulta` aberto a partir do Meu dia fecha o agendamento e
      notifica a secretária (C15 — só no create; conferir no banco).
- [ ] **G13** — Skeleton aparece antes do conteúdo (throttle de rede); erro de query renderiza
      `error.tsx` com "tentar de novo" — **nunca** "Nenhum atendimento hoje" (forçar quebrando
      o nome de uma tabela localmente).

**Alergia (D9)**
- [x] **G14** — Confirmado ao vivo (31/07, paciente "marcos"): chip "⚠ Alergia a anestesia e
      preção alta" no topo da coluna, mesmo visual do hero.
- [x] **G15** — Confirmado ao vivo, incidental: selecionei "Mateus Teixeira" (sem
      `observacoes`) e o chip simplesmente não apareceu — nenhum espaço vazio, nenhum erro.

**Design (§9)**
- [ ] **G16** — Dark **e** light conferidos. Só tokens (`bg-surface`, `text-text-primary`,
      `border-border`) — zero `bg-white`/`gray-*`/hex solto no que for escrito.
- [ ] **G17** — *Parece feita pela mesma equipe que fez o Dashboard e o Tratamento?*
      (pergunta obrigatória do CLAUDE.md)

## 9. Referência visual

- **Artefato:** [`plans/artefatos/R-46-ficha-dia.html`](../artefatos/R-46-ficha-dia.html), §1 "A porta"
- **Rota alvo:** `/dashboard/meu-dia` · **Componentes:** `consulta-cta-button.tsx` (→ renomear),
  `next-appointment-hero.tsx`, `meu-dia/_components/rail.tsx`

Tokens extraídos por JS do artefato servido em HTTP (não deduzidos de screenshot):

| Token do artefato | Valor | Equivalente no app |
|---|---|---|
| `--teal` | `#2FBFAD` | `text-teal`/`bg-teal` (app usa `#2f9c85`; **manter o do app**) |
| `--surface` / `--surface-alt` | `#14181B` / `#1A1F23` | `bg-surface` / `bg-surface-alt` |
| `--border` | `#242B30` | `border-border` |
| `--text` / `-2` / `-3` | `#E9EDEF` / `#97A1A8` / `#6E7A82` | `text-text-primary` / `-secondary` / `…/70` |
| `--mono` | `DM Mono, ui-monospace, …` | `font-mono` |

**CTA da porta, medido no artefato:** `13px/700`, `padding 9px 18px`, `radius 10px`, fundo
teal sólido. **Divergência consciente:** o hero real é bem maior (`px-8 py-4`,
`rounded-2xl`, gradiente + `btn-glow`) — **manter o do app**; trocar a escala é redesign
(A3), não esta fatia. Do artefato importa o rótulo e o destino, não a geometria.

**Ação de atender no rail é desenho novo** (o artefato só desenha seleção, sem esse
controle) — Dashboard, Meu Dia e Ficha clínica como referências, peso secundário: o card é o elemento
primário, a ação é um controle dentro dele.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| **Fluxo principal fica mais longo** (+1 clique) | Preço explícito do D3. Reverter é 1 linha no `router.push` |
| Dentista clica "Abrir meu dia" esperando o modo consulta, se perde | Rótulo com nome+hora (D2), slot já selecionado (D5) com a ação visível |
| Meu dia vira porta **sem gate de assinatura** (C1/I7) | Risco aceito (decisão dele, A1) — sem sistema de pagamento real hoje, o gate não protegeria nada de verdade |
| `?ag` na URL vira vetor de acesso indevido | I2: nunca alimenta query; fetch escopado por `clinica_id`+`dentista_id` |
| Renomear `consulta-cta-button.tsx` quebra import | 1 importador só (grep) — typecheck pega |

## 11. Abertas — precisam de você

- ~~A1~~ **FECHADA 01/08 — decisão dele: ignorar por ora.** "Ainda não temos nem um sistema
  de pagamento pra fazer esse controle" — `status_assinatura`/`inativo` não é hoje aplicado
  por nenhuma cobrança real. Meu dia fica sem o gate que `/consulta` tem (I7); revisitar
  quando existir sistema de pagamento de verdade cobrando/atualizando esse status.

- ~~A2~~ **FECHADA 31/07** — chip de alergia entra nesta fatia (D9/§6.5).

- ~~A3~~ **FECHADA 31/07** — o cenário real dele (sair pro resto do sistema e voltar) já
  recebe dado fresco por padrão no Next 16; não precisava de código (§6.6).

- **A4 · Achados de brinde** (viram ⏳ se quiser, detalhe na auditoria §3): e-mails de
  onboarding apontam pra `/consulta-demo` — **404 em produção hoje** · `modo-consulta-loader.tsx`
  é componente órfão · C7 é query morta em toda abertura do modo consulta.

## 12. Plano de implementação

Ordem importa: 1–3 são a troca; 4–5 são a contrapartida do D3 (mesmo commit); 6–7 são D6/D7.

| # | Arquivo | O que muda | Risco |
|---|---|---|---|
| 1 | `consulta-cta-button.tsx` → renomear `abrir-meu-dia-button.tsx` | Destino `/dashboard/meu-dia?ag=`, rótulo novo, props ganham `pacienteNome`/`horario` | BAIXO |
| 2 | `next-appointment-hero.tsx` | Passa as 2 props novas; remove "Ver meu dia" redundante do ramo preenchido; promove no ramo vazio | BAIXO |
| 3 | `meu-dia/page.tsx` | Aceita `searchParams.ag`; valida contra os slots já carregados; passa `agendamentoInicialId` | BAIXO |
| 4 | `meu-dia-client.tsx` | Chave de seleção vira `agendamentoId` (D5); precedência de default em 3 níveis | MÉDIO — conferir 2 atendimentos do mesmo paciente no mesmo dia |
| 5 | `rail.tsx` | Ação de atender por slot, condição de `month-view.tsx:379`, rótulo de `agendamentos-client.tsx:2035` | MÉDIO — UI nova, sem artefato; §9 |
| 6 | `get-meu-dia.ts` + `loading.tsx` + `error.tsx` (novos) | Trata `error` das 4 queries; skeleton; boundary de erro; `MeuDiaContexto.alertas` (D9) | BAIXO |
| 7 | `floating-dock.tsx` + `mobile-drawer.tsx` | Item "Meu dia", oculto pra secretária | BAIXO |
| 8 | `contexto-coluna.tsx` | Corrige comentário do cabeçalho ("Registrar" que não existe); renderiza `alertas` (D9), mesmo chip visual do hero | BAIXO |

**Commits:** (a) 1–5 juntos — a troca e a contrapartida do D3 **não se separam**; (b) 6
sozinho (robustez); (c) 7 sozinho (navegação); (d) 8 junto com (a).

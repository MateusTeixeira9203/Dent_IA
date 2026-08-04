# R-58 — Histórico detalhado: o texto em evidência, a sessão inteira numa entrada

> **SPEC** · **R-58** · ⏳ fila · **Fase:** `contrato`
> **Aberto:** 2026-08-04 · **Fechado:** —
> **Modelo:** Opus 5 (o §2 reconcilia duas regras que se contradizem na superfície; o resto
> é mecânico)
> **Depende de:** [R-55](R-55-historico-sem-perda-de-dado.md) ✅ (histórico já é fiel, sem
> dedup) · **habilita** [R-46 C6](R-46-C6-layout-cockpit.md) (é o que sustenta tirar o "Já feito")
> **Entra ANTES do** [R-53](R-53-orcamento-indicados-abertos.md) — decisão dele, 04/08.
> **Zero migration · zero RLS · zero query nova** — os campos já vêm no SELECT e são
> descartados no `.map()`.

## 0. O modelo clínico, nas palavras dele (04/08)

> *"O histórico será registrado o que foi feito na sessão, caso fique só em obs. Por exemplo:
> fiz uma anamnese completa, identifiquei isso, aquilo, e só na outra sessão será feito — mas
> ele precisa saber o que ele fez na última consulta. Agora, quando for realizado procedimento
> já pré-existente de uma ficha antiga, muda-se o histórico e marca como concluído aquela
> última consulta, sem nada pendente, como nas fichas. O histórico se baseia nas fichas; quando
> é algo novo, é uma ficha ou evolução nova."*

Três regras saem daí:

1. **Sessão que só produziu achado ainda é uma entrada de histórico.** Anamnese que identificou
   3 problemas e não executou nada tem valor clínico — e o conteúdo dela é **texto**, não lista
   de procedimentos.
2. **A entrada tem que dizer o que foi feito naquela consulta.**
3. **Fechar pendência antiga atualiza a entrada antiga** — ela passa a mostrar "concluída, nada
   pendente".

## 1. Problema

**(a) O texto — que às vezes é o conteúdo inteiro — aparece como nota de rodapé.**
`historico-bloco.tsx:74` renderiza a anotação como `text-xs italic text-text-secondary`, depois
dos procedimentos. Numa sessão de anamnese (sem `realizado`), `visitas[].eventos` volta **vazio**
e a entrada cai no fallback `resumo` (`get-meu-dia.ts:367`) — a tela mostra uma linha genérica
onde havia o raciocínio clínico inteiro.

**Isso piora com o Dex.** A entrada principal de texto vai ser o campo mágico (R-46d): texto
bruto com contexto, mais completo que qualquer lista de tipos. A hierarquia atual está
invertida — o que tem mais informação clínica é o que aparece menor.

**(b) O que foi feito hoje não aparece na entrada de hoje.** O upsert da RPC
(`migration 111:171-185`) **não** atualiza `ficha_id`: fechar uma pendência antiga por
"fazer hoje →" muda `status` e `realizado_em`, mas o evento continua preso à ficha onde foi
**indicado**. Caso real no banco: profilaxia indicada na ficha de **23/07**, executada em
**29/07** — aparece em 23/07, e a sessão de 29/07 não registra que ela aconteceu.

**(c) A entrada não diz se sobrou pendência.** Não há sinal nenhum de "esta consulta ficou
resolvida" × "esta consulta deixou coisa em aberto" — que é a regra 3 do §0.

## 2. A reconciliação — o evento tem duas datas, e as duas importam

As regras 2 e 3 do §0 parecem se contradizer: uma quer o procedimento na entrada de **hoje**, a
outra quer ele atualizando a entrada **antiga**. Não se contradizem — **um evento tem dois
momentos**, e o schema já guarda os dois:

| Momento | Coluna | Significa |
|---|---|---|
| Onde foi **indicado** | `ficha_id` | a consulta em que o dentista viu o problema |
| Quando foi **feito** | `realizado_em` | a consulta em que resolveu |

**Decisão: o evento aparece nas duas entradas, com enquadramento diferente.**

| Entrada | Como aparece | Fonte |
|---|---|---|
| Ficha onde foi indicado (23/07) | `Profilaxia — concluída em 29/07` | `ficha_id` = esta ficha |
| Sessão em que foi feito (29/07) | `Profilaxia — indicada em 23/07` | `realizado_em` = data desta ficha |

Nenhum dado novo, nenhuma coluna, nenhuma migration. É a mesma linha lida por dois eixos.

**Alternativa descartada:** fazer o upsert mover o `ficha_id` pra ficha nova. Descartada por
dois motivos — (i) apagaria a informação de *quando foi indicado*, que é prova clínica de
diligência (o dentista viu e propôs; o paciente adiou); (ii) mexeria no caminho de **escrita**
(RPC 111), que é o mais arriscado do sistema, pra resolver um problema de **leitura**.

## 3. Objetivo e como funciona

A coluna esquerda mostra a última consulta com o **texto em primeiro plano** e os procedimentos
como suporte — invertendo a hierarquia de hoje. Cada entrada diz, num olhar: a data, quem
atendeu, se ficou algo pendente, o que foi feito e o que foi só identificado. Expandir uma
entrada abre o detalhe por procedimento (observação, faces, autor) e a tabela de especialidade
quando houver (endo tem 12 registros reais com odontometria completa).

Sessão que só gerou achado não fica vazia: o texto ocupa a entrada, e os indicados aparecem
como "identificado nesta consulta".

## 4. Contrato técnico

### 4.1 `MeuDiaEventoVisita` — o que já vem e é jogado fora

O SELECT de `get-meu-dia.ts:269` **já traz** `observacao`, `faces`, `nivel`, `origem`,
`grupo_id`, `papel_no_grupo` — e o `.map()` de `:371` descarta todos. Custo de recuperar: zero.

```typescript
export interface MeuDiaEventoVisita {
  id: string;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  // ── R-58: já vêm na query, passam a ser expostos ──
  faces: FaceDental[];
  observacao: string | null;
  origem: OrigemRegistro;
  /** R-58 — 'realizado' | 'indicado'. Hoje a lista só tem realizados (§4.2 muda isso). */
  status: StatusRegistro;
  /** R-58 (§2) — data clínica da execução. Quando difere da data da ficha, o evento foi
   *  indicado aqui e feito depois (ou vice-versa) — é o que alimenta o enquadramento duplo. */
  realizadoEm: string | null;
  /** R-58 — detalhe de especialidade (jsonb, migration 106). ÚNICO campo novo no SELECT.
   *  Lido sempre por safeParse — dado corrompido degrada pra "sem tabela" (spec-106 §5). */
  detalhe: unknown | null;
}
```

### 4.2 `MeuDiaVisita` — indicados entram, e o estado da visita

```typescript
export interface MeuDiaVisita {
  // …fichaId, data, dentistaNome, resumo, nota — inalterados…
  /** R-58 — passa a incluir os `indicado` desta ficha, não só os realizados. Sessão de
   *  anamnese deixa de renderizar vazia (§0 regra 1). */
  eventos: MeuDiaEventoVisita[];
  /** R-58 (§0 regra 3) — nenhum evento desta ficha continua `indicado` em aberto.
   *  DERIVADO da lista, nunca persistido: `eventos.every(e => e.status === 'realizado')`. */
  semPendencia: boolean;
  /** R-58 (§2) — feitos NESTA data, mas indicados numa ficha anterior. Alimentam
   *  "o que eu fiz hoje" na entrada de hoje. */
  feitosAqui: MeuDiaEventoVisita[];
  /** R-58 — texto completo da ficha (`anotacoes`), sem truncar. `nota` continua sendo a
   *  1ª linha, pro resumo fechado. */
  texto: string | null;
}
```

| Onde | Muda para |
|---|---|
| SELECT de eventos (`:269`) | `+ detalhe` — única mudança de query em toda a fatia |
| `realizadosPorPaciente` (R-55) | vira `eventosPorPaciente`: **todo** evento com `ficha_id`, os dois status. O nome atual mente depois desta fatia |
| `.map()` de `:371` | passa a levar os 6 campos já disponíveis + `detalhe`, `status`, `realizadoEm` |
| montagem de `visitas` | `semPendencia` derivado · `feitosAqui` = eventos com `realizado_em === f.data_atendimento` **e** `ficha_id !== f.id` · `texto` = `f.anotacoes` inteiro |

⚠️ **`pendencias` não muda.** `chaveAncora`/`vencedorPorAncora` continuam intocados — a trava
do R-55 e a divisão do R-51 (com grupo × sem grupo) seguem valendo. Esta fatia só toca o eixo
**histórico**.

### 4.3 Componente — `historico-bloco.tsx`

**Hierarquia invertida.** Ordem dentro de uma entrada:

1. **Cabeçalho** — data (mono, 11/600) · dentista · badge de estado (§4.4)
2. **Texto** — `texto` completo, `text-sm text-text-primary`, até ~4 linhas com "ver mais"
   inline. **É o elemento de maior peso da entrada** — hoje é o menor
3. **Feito nesta consulta** — realizados desta ficha + `feitosAqui` (marcados "indicada em DD/MM")
4. **Identificado nesta consulta** — os `indicado`, com "aguardando" quando ainda abertos
5. **Detalhe por procedimento** — só quando a entrada está expandida

**Reuso — não recriar:** [`RegistroCard`](../../src/components/fichas/registro-card.tsx) já é
read-only usável (única prop obrigatória é `data`, corpo de especialidade entra como
`children`). ⚠️ `eventosParaCards` e `corpoEspecialidade` (`FichasTab.tsx:285`, `:552`) são
**privadas, sem export** — precisam ser extraídas pra `src/lib/` primeiro, mesmo padrão do
R-46d D0. Isso é pré-requisito, não detalhe.

**Cards de especialidade que já existem e podem entrar:** `EndoCard` (tabela de odontometria
real — 12 registros no banco), `ImplanteCard` (2), `PsrCard`, `OrtoCard`.
⚠️ **Perio tem ZERO dado no banco** (`exame_periodontal` e `raspagem`: nenhum evento). Ligar a
tabela de perio aqui mostraria vazio pra 100% dos pacientes — fica fora, espera o R-08c.

### 4.4 Badge de estado da consulta (§0 regra 3)

| Estado | Quando | Aparência |
|---|---|---|
| **nada** | `semPendencia === true` | sem badge — o silêncio é o estado bom |
| `N em aberto` | há `indicado` desta ficha ainda aberto | `text-coral-ink`, sem preenchimento |

⚠️ **Gramática de cor (MAPA §7.1):** coral já significa "a fazer" no odontograma — usar coral
aqui é **coerente**, não invenção. Nenhuma cor nova entra. `warning` continua reservado só pro
alerta de alergia.

## 5. Referência visual

- **Rota:** `/dashboard/meu-dia` · **Componente:** `_components/historico-bloco.tsx`
- **Coluna:** 320px (`cockpit-grid.tsx`) menos 12px de padding = **~296px úteis**
- ⚠️ **Restrição medida:** `EndoCard` tem `min-w-[380px]` na tabela — **não cabe** em 296px.
  A tabela de endo precisa rolar horizontal dentro do bloco (`overflow-x-auto`) ou abrir no
  `Sheet` do C6. **Decidir na implementação, com o número na mão** — não presumir que cabe.
- **Tokens** (todos já em uso): `text-text-primary` (texto da visita — o destaque novo) ·
  `text-text-secondary` (data, autor) · `text-coral-ink` (badge de aberto) · `border-border`
- **Responsivo** é requisito (P8 morreu em 03/08 — [R-46-C6 §2.5](R-46-C6-layout-cockpit.md))

## 6. Invariantes

- [ ] **I1** — Nenhum evento realizado some do histórico (regressão R-55): a soma dos eventos
      renderizados por paciente == `count(*) where status='realizado'` + os indicados abertos.
- [ ] **I2** — `semPendencia` e `feitosAqui` são **derivados a cada leitura**, nunca persistidos
      (mesmo princípio de `emAndamento` do R-51 — não criar 3º status por acidente).
- [ ] **I3** — O caminho de **escrita** não é tocado: `ficha_id` continua onde foi indicado
      (§2). Zero mudança em RPC 111, `salvarFicha`, RLS ou migration.
- [ ] **I4** — `pendencias` (bloco "A fazer") não muda de conteúdo, ordem nem contador.
- [ ] **I5** — Um evento fechado em consulta posterior aparece nas **duas** entradas, e **nunca**
      é contado duas vezes num total ou badge.
- [ ] **I6** — `detalhe` é lido por `safeParse`; jsonb corrompido degrada pra "sem tabela" e
      nunca quebra a renderização da ficha.
- [ ] **I7** — Texto da visita nunca é truncado no banco nem no servidor — o corte é só visual,
      com "ver mais".

## 7. Gates de aceite

**Prova no banco:**
- [ ] **G1** — O caso real medido: profilaxia indicada em **23/07**, `realizado_em` **29/07**
      (paciente `4df91e93`). Aparece na entrada de 23/07 como *"concluída em 29/07"* **e** na
      de 29/07 como *"indicada em 23/07"*. Contada 1 vez em cada, nunca 2 no mesmo lugar.
- [ ] **G2** — Ficha só com `indicado`: renderiza o **texto** como conteúdo principal e badge
      "N em aberto" — não cai mais no fallback `resumo`.
- [ ] **G3** — Ficha com todos os eventos `realizado`: **sem badge**.
- [ ] **G4** — Regressão R-55: paciente com 2 profilaxias em datas diferentes continua
      mostrando as duas (o dedup não voltou por outra porta).
- [ ] **G5** — Regressão R-51/R-52: contador e conteúdo de "A fazer" idênticos antes/depois.

**Na tela:**
- [ ] **G6** — Endo com odontometria (12 no banco) abre a tabela sem cortar campo nem estourar
      a coluna de 296px — medir `scrollWidth` vs `clientWidth`, não olhar.
- [ ] **G7** — Texto longo (>4 linhas) corta com "ver mais" e expande sem empurrar o cockpit
      pra fora da viewport (gate G1 do contrato do R-46).
- [ ] **G8** — Light **e** dark: badge de aberto passa AA em ambos.
- [ ] **G9** — Sem `anotacoes` e sem eventos: entrada não renderiza vazia nem mente — mostra
      o estado real, sem afirmação clínica inventada.

## 8. Fora de escopo

- **Tabela de perio no histórico** — zero dado no banco; espera R-08c.
- **Mover `ficha_id` no upsert** — descartado no §2. Se um dia voltar, é item de escrita própria.
- **Editar a ficha pelo histórico** — o histórico é leitura; edição vive no perfil do paciente.
- **Histórico no perfil do paciente (`FichasTab`)** — esta fatia é só a coluna do Meu dia. O
  `FichasTab` já mostra detalhe; a convergência dos dois é item separado.
- **Assinatura/CRO por evento no histórico** — o prontuário oficial (PDF) já cobre.
- **1 entrada por agendamento em vez de por ficha** — é o R-54, cortado em 03/08 e **reaberto
  como pergunta** em 04/08. Depende de `fichas.agendamento_id` (migration). **Não é
  pré-requisito desta fatia**: hoje 4 procedimentos num Salvar já entram numa entrada só
  (medido: existem fichas com 4, 7, 12, 17 e 24 eventos). O problema só aparece se o dentista
  salvar no meio do atendimento.

## 9. Achados que sustentam o contrato

**Medido no banco, 04/08:**

| O quê | Número |
|---|---|
| Fichas com ≥4 eventos numa entrada só | **15** (máx: **24 eventos**) |
| Evento indicado numa ficha e realizado em data diferente | **1** confirmado (profilaxia 23/07 → 29/07) |
| Eventos com `detalhe` real | **14** (12 endo com odontometria, 2 implante) |
| Eventos de perio (`exame_periodontal`/`raspagem`) | **0** |

**O agrupamento por sessão já funciona.** A preocupação dele — *"4 extrações viram 4
históricos"* — não se confirma: `eventosDraft` acumula e um Salvar grava uma ficha com todos.
As fichas de 24, 17 e 12 eventos são a prova. O que quebra é salvar no meio do atendimento
(ver §8).

**O upsert não move `ficha_id`** — conferido em `migration 111:171-185`: o `do update set` lista
`grupo_id, tipo, status, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo,
observacao, detalhe, realizado_em`. Sem `ficha_id`, sem `registrado_em`, sem `dentista_id`.
É isso que torna o §2 possível sem tocar em escrita.

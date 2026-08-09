# R-84 — "Nesta ficha" distingue o que é novo, e o orçamento só enxerga o novo

> **SPEC** · **R-84** · ✅ **aprovada** · **Fase:** `aprovada`
> **Aberto:** 2026-08-08 · **Aprovada:** 2026-08-08 · **Fechado:** —
> **Modelo:** Sonnet 5 (contrato fechado, sem ambiguidade de design — a decisão de produto já
> está tomada nesta spec)
> **Depende de:** nada bloqueia · **Zero migration · zero RLS · zero schema.**
> **Revoga:** o merge do agregado que o [R-83](../ROADMAP.md) adicionou em
> `abrirPickerFichasAbertas` — e, por consequência, a premissa do
> [R-53](R-53-orcamento-indicados-abertos.md) para o caminho do Meu dia (ver §2.2).

## 1. O fluxo real que motivou o item

Dele, 08/08, e é o que decide tudo aqui:

> *"90% dos casos é o seguinte: a avaliação gera o orçamento, e depois rola a consulta pra
> arrumar."*

Duas naturezas de consulta, com necessidades opostas:

| | O que acontece | O que o orçamento deve pegar |
|---|---|---|
| **Avaliação** | tudo é achado novo, tudo nasce `indicado` | tudo — é a ficha inteira, é o que vai ser vendido |
| **Execução** (as seguintes) | fecha pendência antiga + eventual achado novo | **só o achado novo** — o resto já foi vendido na avaliação |

Hoje o Meu dia trata as duas do mesmo jeito, e é daí que saem os dois defeitos abaixo.

## 2. Os dois achados que sustentam o contrato

### 2.1 A tela mente sobre o que é "desta ficha"

`fazerHoje` ([meu-dia-client.tsx:326](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx))
chama `pendenciaParaDraft`, que **preserva o id real** do evento e o empurra pro
`eventosDraft`. Por isso ele aparece em "Nesta ficha".

Mas a RPC `salvar_eventos_odontograma` (lida do schema real, não do arquivo de migration) tem
no `ON CONFLICT (id) DO UPDATE` apenas:

```
grupo_id, tipo, status, origem, nivel, arcada, quadrante, dente, faces,
papel_no_grupo, observacao, detalhe, realizado_em
```

**`ficha_id` não está na lista.** No Salvar, o evento **continua preso à ficha original** — só
`status` e `realizado_em` mudam. Ele nunca entra na ficha nova; o R-58 depois o mostra na
visita de hoje via `feitosAqui`.

> Consequência: "Nesta ficha" exibe hoje um item que o banco **não vai colocar nessa ficha**.
> Não é preferência de layout — a tela está fora de sincronia com a persistência.

### 2.2 `indicado` não quer dizer "não vendido"

O R-53 nasceu da premissa *"indicado em aberto = dinheiro parado na mesa"*. No fluxo de §1
isso é **falso**: `indicado` quer dizer *"já vendido na avaliação, ainda não executado"*. O
status rastreia **execução**, não venda.

E não há como o sistema saber a diferença. Conferido no schema:

```
orcamento_itens: id, clinica_id, orcamento_id, procedimento_id,
                 descricao, dente (text), quantidade, preco_unitario,
                 preco_total, created_at, updated_at, etapa_id
```

**Nenhuma coluna liga `orcamento_itens` a `odontograma_eventos`.** Não existe `evento_id`; o
vínculo é texto solto. Dedup por dado é impossível hoje.

> Consequência: numa consulta de execução, o agregado devolve os `indicado` **já vendidos na
> avaliação** e os empurra calado pra dentro de um orçamento novo, na frente do paciente.

### 2.3 Bônus — hoje ser faturável depende de ter salvo

Antes do Salvar, a pendência concluída ainda está `indicado` no banco → o agregado a inclui.
Depois do Salvar vira `realizado` → some (`eventosParaItens` filtra `status === 'indicado'`).
**Faturabilidade dependendo do timing do Salvar não é regra, é acidente.** O corte do §5 o mata.

## 3. Parte A — o discriminador

Não dá pra separar por status nem pelo rótulo: um procedimento **novo** ditado hoje e marcado
como feito renderiza idêntico a uma pendência antiga concluída hoje (ambos
`realizado` + "Realizado em 08/08/2026").

O único teste confiável é **"esse id já existia no banco antes desta sessão?"** — e o dado já
está carregado: `MeuDiaContexto.boca` (R-61) traz *todos* os eventos do paciente, nos 2 status,
com o **id real**. Zero query nova.

```ts
// meu-dia-client.tsx — calculado UMA vez, consumido pelos dois lados (§4 e §5).
const idsDeAntes = useMemo(
  () => new Set((contexto?.boca ?? []).map((b) => b.id)),
  [contexto?.boca],
);
```

**Derivado a cada render, NUNCA persistido** — mesmo princípio de `emAndamento` (R-51) e
`semPendencia` (R-58). Sem flag nova no draft, sem coluna, e sem 3º status (a cilada que o
R-51 documentou: um valor novo vira `else = realizado` em 23 arquivos, em silêncio).

## 4. Parte B — "Nesta ficha" marca, não esconde

**Os itens continuam na lista.** Tirá-los quebraria dois casos reais:

1. **O bloco vazio.** Consulta cujo trabalho inteiro foi "terminar o canal da vez passada" —
   exatamente o caso que o R-51 existe pra suportar — mostraria *"Nada registrado ainda nesta
   consulta"* depois de uma hora de endo. Mentira pior que a atual.
2. **A superfície de edição.** É no card que se escreve a observação, se desfaz um clique
   errado (toggle) e se abre o ⤢ da tabela de endo. Fora da lista, vira "acha o dente, abre o
   painel" — custo em gestos por registro, o critério declarado do roadmap.

### Contrato

`NestaSessaoBloco` ganha **uma prop**:

```ts
/** R-84 — ids que JÁ EXISTIAM no banco antes desta sessão (§3). Card com qualquer id aqui
 *  é trabalho de ficha anterior sendo fechado hoje, não indicação nova desta ficha. */
idsDeAntes: ReadonlySet<string>;
```

- Um card é "de antes" se **qualquer** um dos seus `ids` estiver no set (grupo misto —
  ponte que ganhou elemento novo hoje — conta como de antes **para a marca visual**).
- A marca é renderizada **em volta do card, dentro do `NestaSessaoBloco`** — `RegistroCardData`
  **não** ganha campo novo. `RegistroCard` é compartilhado com `FichasTab` e `historico-bloco`;
  não vale aumentar o raio de explosão por um rótulo de uma tela só.
- **Padrão visual: copiar o que o R-58 já usa**, não inventar — `historico-bloco.tsx:141-148`
  envolve o card num `<div className="flex flex-col gap-0.5">` e põe a legenda logo abaixo:
  `<p className="px-1 text-[11px] text-text-secondary">`. Mesma posição, mesmo estilo.
- Ordem da lista: **inalterada**. Sem seção nova, sem header extra — o orçamento vertical já
  está estourado (MAPA-MEU-DIA).

## 5. Parte C — o orçamento

Duas mudanças, ambas em `meu-dia-client.tsx` / `use-orcamento-modal.ts`:

**5.1 — o rascunho enviado exclui o que é de antes:**

```ts
onAbrirPickerOrcamento: () => void orcamentoModal.abrirPickerFichasAbertas(
  eventosDraft.filter((e) => !idsDeAntes.has(e.id)).map(draftParaEventoOrc),
),
```

Filtro **por evento, não por card**: se você acrescentou hoje um 3º elemento a uma ponte
antiga, esse elemento é indicação nova e **deve** ser orçado — só os irmãos pré-existentes
saem.

**5.2 — o agregado do banco sai do merge** ([use-orcamento-modal.ts:376](../../src/app/dashboard/pacientes/%5Bid%5D/_components/use-orcamento-modal.ts)):

```ts
// antes
const itens = [...eventosParaItens(eventosRascunho), ...itensBancoReais];
// depois
const itens = eventosParaItens(eventosRascunho);
```

`carregarFichasAgregado()` **continua sendo chamado** — `fichasParaOrc` alimenta o botão
`← Voltar` (novo-orcamento-modal.tsx:474), que é o caminho de fuga pra orçar uma ficha antiga
de propósito. Só o *merge automático* morre.

**5.3 — o `← Voltar` passa a aparecer com 1 ficha só (decisão 08/08, §9.2).**

Sem o merge, o backlog só é alcançável pelo `← Voltar`. Hoje ele exige `fichasParaOrc.length > 1`,
então paciente com **exatamente 1** ficha antiga em aberto fica sem caminho nenhum.

**Não é trocar `> 1` por `> 0`** — isso quebraria outro fluxo. `abrirOrcamentoParaFicha`
(use-orcamento-modal.ts:421) também popula `fichasParaOrc`, com exatamente 1 ficha; com `> 0`
o botão passaria a aparecer no caminho por-ficha — o que a decisão de 07/08 travou de propósito
("orçamento de uma ficha é SÓ dela") — e levaria a uma tela de seleção com 1 item.

O que separa os dois fluxos é `fichaOrcId`: o picker o zera (`setFichaOrcId(null)`, linha 371 e
320), o caminho por-ficha o preenche (linha 420). O modal **não recebe** esse estado hoje, então
a derivação fica no hook e o modal continua burro:

```ts
// use-orcamento-modal.ts — dentro de `modalProps`
/** R-84 — só o picker (orçamento que não pertence a 1 ficha) oferece trocar de ficha; o
 *  caminho por-ficha (`abrirOrcamentoParaFicha`) é deliberadamente fechado (decisão 07/08). */
podeTrocarFicha: fichaOrcId == null && fichasParaOrc.length > 0,
```

```tsx
// novo-orcamento-modal.tsx:474
{podeTrocarFicha && (   // era: {fichasParaOrc.length > 1 && (
```

## 6. Invariantes

| # | Regra | Por quê |
|---|---|---|
| I1 | `idsDeAntes` é derivado de `boca` a cada render, nunca persistido nem guardado em estado próprio | Flag persistida diverge do banco no 1º refresh; e status novo vira `else = realizado` em 23 arquivos (R-51) |
| I2 | Nenhum item some de "Nesta ficha" — a mudança é de **marca**, não de conteúdo | §4.1 e §4.2: bloco vazio e perda da superfície de edição |
| I3 | `RegistroCardData` não ganha campo novo | `RegistroCard` é compartilhado (FichasTab, historico-bloco) |
| I4 | O filtro do orçamento é por **evento**, não por card | Elemento novo em grupo antigo é venda legítima (§5.1) |
| I5 | `carregarFichasAgregado()` continua sendo chamado | Sem ele o `← Voltar` some e o backlog fica inalcançável |
| I6 | Zero migration, zero RLS, zero mudança de schema | Nada aqui precisa de banco — é tudo derivação no cliente |

## 7. Gates

| Gate | Como testar |
|---|---|
| G1 | Ditar 1 procedimento novo → aparece em "Nesta ficha" **sem** marca de "de antes" |
| G2 | "A fazer" → "fazer hoje" numa pendência antiga → aparece em "Nesta ficha" **com** a marca, e continua editável (observação, toggle, ⤢) |
| G3 | Com os dois na tela, "Gerar orçamento" → **só** o novo entra na lista de itens |
| G4 | Consulta cujo único trabalho foi "fazer hoje" numa pendência → "Nesta ficha" mostra o item marcado, **nunca** "Nada registrado ainda nesta consulta" |
| G5 | "Gerar orçamento" **não** traz mais nada de fichas antigas do paciente automaticamente |
| G6 | `← Voltar` continua levando à seleção de ficha antiga (paciente com ≥2 fichas em aberto) |
| G6b | Paciente com **exatamente 1** ficha antiga em aberto → `← Voltar` **aparece** e leva a ela (§5.3) |
| G6c | **Regressão da trava de 07/08:** "Gerar orçamento" de dentro de uma visita do Histórico (`abrirOrcamentoParaFicha`) → `← Voltar` **NÃO** aparece, mesmo com `fichasParaOrc.length === 1` |
| G7 | Salvar depois de um "fazer hoje" → conferir **no banco** que o `ficha_id` daquele evento **não** mudou, e que `status`/`realizado_em` mudaram |
| G8 | Regressão: tela do paciente (`FichasTab`) e Histórico continuam idênticos — `RegistroCard` não foi tocado |
| G9 | **Consulta 100% execução** (só "fazer hoje", zero achado novo) → depois do Salvar, o Histórico mostra os cards sob "Feito nesta consulta" com **as duas datas**: "Realizado em {hoje}" no card + "indicada em {data antiga}" embaixo. Sem badge "em aberto" (correto — `semPendencia` é `true` com `eventos` vazio) |

## 8. Fora de escopo (nomeado de propósito)

- **Vínculo `orcamento_itens` ↔ `odontograma_eventos`.** Sem ele nenhum caminho do sistema
  sabe o que já foi orçado — nem o botão por-visita do Histórico, nem o picker. Este item mata
  o caminho *silencioso e default*; a trava real é coluna nova + migration. **Vira item
  próprio.**
- **Orçar o que já foi executado.** `eventosParaItens` filtra `status === 'indicado'` em
  *todos* os caminhos: nada que você já fez é orçável em lugar nenhum. É estrutural e
  pré-existente — não é regressão deste item.
- **A ficha de hoje nascer sem evento próprio.** Numa consulta 100% execução (G9), todos os
  eventos ficam com `ficha_id` na ficha antiga e o vínculo com a consulta de hoje é
  reconstruído **por data** (`feitosAqui`), não por chave. Funciona na tela, mas quem ler
  `odontograma_eventos` por `ficha_id` vê a consulta vazia. Fragilidade do R-58, **anterior a
  este item** — se virar problema real (export, PDF, prontuário), é item próprio.

## 9. Decisões

### 9.1 ✅ Fechada 08/08 — marca **sem data** no rascunho

`pendenciaParaDraft` não carrega a data da ficha original, então a marca nasce sem data
(*"de consulta anterior"*). **E não precisa carregar:** depois do Salvar o evento cai em
`feitosAqui` (o `ficha_id` não muda, §2.1) e o R-58 **já renderiza a data real** —
`historico-bloco.tsx:145`, `indicada em {fmtData(indicadoEm)}`, no mesmo lugar e no mesmo
estilo que §4 manda usar.

| Momento | Rótulo |
|---|---|
| Rascunho (durante a consulta) | *de consulta anterior* |
| Depois de Salvar (Histórico) | *indicada em 12/05* |

A linguagem fica contínua sozinha; o rótulo só fica mais preciso quando o dado real existe.
Carregar a data pro rascunho compraria segundos de antecipação por escopo a mais.

### 9.2 ✅ Fechada 08/08 — `← Voltar` com 1 ficha entra neste item

Decisão dele: entra. Ao investigar pra escrever o contrato, o "fix de 1 caractere" **se
revelou errado** — `> 0` vazaria o botão pro caminho por-ficha, que a decisão de 07/08 fechou
de propósito. A correção real está no §5.3: `podeTrocarFicha` derivado de `fichaOrcId`.

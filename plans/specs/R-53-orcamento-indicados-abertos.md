# R-53 — Orçamento nasce dos indicados em aberto do paciente

> **SPEC** · **R-53** · ⏳ fila · **Fase:** `contrato`
> **Aberto:** 2026-08-04 · **Fechado:** —
> **Modelo:** Sonnet 5 (mecânico — queries e funções já mapeadas; a decisão de recorte
> do §3 é a única parte não-óbvia, e está fechada com dado medido)
> **Extraída de** [R-51-53-modelo-multissessao.md](R-51-53-modelo-multissessao.md), que
> estourou o teto de 300 linhas com as 3 fatias juntas. **R-51 e R-52 estão feitos e
> verificados ao vivo (04/08)** — esta é a fatia que sobrou.
> **Depende de:** R-52 no ar (o campo `encaminhado_para` passa a ter uso real) ·
> [`filtro-responsavel.ts`](../../src/lib/fichas/filtro-responsavel.ts) (R-16/R-18, já existe)
> **Zero migration · zero RLS · zero query nova** (as queries existentes mudam de forma).

## 1. Problema

O orçamento hoje nasce de **uma ficha escolhida**, não do que o paciente de fato deve.

`abrirNovoOrcamento` ([paciente-detail-client.tsx:1075](../../src/app/dashboard/pacientes/[id]/_components/paciente-detail-client.tsx))
busca as 10 fichas mais recentes e, se houver mais de uma, **obriga o dentista a escolher qual**
(`etapaNovoOrc: 'selecionar'`). `fichaParaItens` (`:1024`) lê só `ficha.odontograma_eventos` —
nunca o paciente inteiro. Um plano indicado há 2 semanas, numa ficha antiga, só entra no
orçamento se o dentista lembrar de escolher aquela ficha específica.

**Medido no banco (04/08):** 113 indicados em aberto, distribuídos em 20 pacientes, com até
**6 fichas distintas** carregando indicado aberto pro mesmo paciente. Ou seja: o caso "o que
devo cobrar está espalhado em várias fichas" é o caso **comum**, não a exceção.

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| `abrirNovoOrcamento` e `abrirOrcamentoParaFicha` convergem pro mesmo agregado (todos os indicados abertos do paciente) | Manter 2 fluxos separados | Não há razão de produto pra 2 comportamentos diferentes do mesmo botão. A etapa "selecionar ficha" volta só como fallback quando não há indicado nenhum |
| **Não excluir encaminhado da query** — ver §2.1 | Excluir (`.is('encaminhado_para', null)`) | Era o que a spec antiga dizia. **Revogado** — procedimento encaminhado nunca viraria dinheiro |
| Manter a query **centrada em ficha** (embed de eventos), não achatada em eventos | Query flat em `odontograma_eventos` | §3 — é o que permite reusar `filtro-responsavel.ts` sem adaptar |

### 2.1 ✅ X1 resolvido por ele (03/08) — o orçamento usa o modelo da ficha

**A pergunta era:** o "A fazer" (R-52) esconde pendência de colega. O orçamento deve esconder
também, ou somar tudo?

**Resposta dele:** *"ele usará a mesma lógica que usamos na ficha e o mesmo modelo."*

Essa lógica já existe e já é lib limpa: [`filtro-responsavel.ts`](../../src/lib/fichas/filtro-responsavel.ts).
Modelo: **`responsável = encaminhado_para ?? autor`**, com 3 estados de filtro — `null` (Todos)
· `FILTRO_MEUS` · um `dentista.id`. É **display puro**, nunca autoria legal.

**Uma lib, duas configurações:**

| Superfície | Filtro | Chips? | Porque |
|---|---|---|---|
| **"A fazer"** (cockpit, R-52 ✅ feito) | `FILTRO_MEUS`, fixo | não | É lista de **trabalho**: "o que eu faço agora" |
| **Orçamento** (este item) | `null` (Todos) por padrão | **sim** | É visão de **dinheiro**: o valor é da clínica, não do dentista |

**Consequência que isso força:** o `.is('encaminhado_para', null)` que a spec antiga planejava
**cai**. Sob o modelo da ficha, evento encaminhado não é *excluído* — ele só tem **outro
responsável**. Excluir da query significaria que procedimento indicado e encaminhado a um
colega **nunca vira dinheiro**, e a clínica perde receita sem ninguém notar. A única exclusão
que fica é `assinatura_id` (evento congelado).

**Invariante que nasce daqui:** "A fazer" e orçamento **nunca** calculam responsável por conta
própria — os dois chamam `filtro-responsavel.ts`. (O R-52 já cumpre: `a-fazer-bloco.tsx` foi
corrigido em 04/08 pra chamar a lib em vez de reimplementar `FILTRO_MEUS` inline.)

## 3. A decisão de recorte — ficha-cêntrico, não flat

**Este é o único ponto não-mecânico da fatia.** A spec antiga mandava criar
`buscarIndicadosAbertos(pacienteId, clinicaId)` como query **flat** em `odontograma_eventos`.
Isso conflita com a decisão do X1, e o motivo é a forma da lib:

`filtro-responsavel.ts` é **ficha-cêntrico** por assinatura:

```typescript
export interface FichaResponsavel<E extends RegistroResponsavel> {
  autorId: string;      // autor da ficha — responsável default de todo registro não encaminhado
  autorNome: string;
  eventos: E[];
}
```

O responsável de um evento é `ev.encaminhadoPara?.id ?? f.autorId` — **o autor vem da ficha**,
não do evento. Numa query flat não existe "a ficha", e a lib teria que ser adaptada ou
duplicada — exatamente o que a decisão do X1 existe pra impedir.

**Isso é seguro?** Medido no banco (04/08): **232 de 232 eventos** têm
`odontograma_eventos.dentista_id` idêntico ao `fichas.dentista_id` da sua ficha, e **0 eventos
órfãos** (`ficha_id is null`). O modelo ficha-cêntrico não perde informação hoje.
⚠️ Isso **não é imposto por schema** — é consequência de `salvarFicha` gravar os dois com o
mesmo caller. Se algum dia um caminho de escrita divergir, o responsável exibido fica errado.
Vale um gate de regressão (G6), não uma coluna nova.

**Portanto:** mantém-se `SELECT_FICHA_PARA_ORC` (embed de eventos dentro de fichas, `:1071`),
com duas mudanças — filtro no embed e fim do `limit(10)` cego. Ver §4.

## 4. Contrato técnico

### 4.1 Types — `_components/types.ts`

```typescript
export type EventoOdontogramaParaOrc = {
  // …campos existentes (id, tipo, status, origem, nivel, arcada, quadrante, dente,
  // faces, papel_no_grupo, grupo_id, assinatura_id) — inalterados…
  /** R-53 — destino do encaminhamento (R-04/R-52). NÃO exclui do orçamento: define o
   *  responsável exibido (`encaminhado_para ?? autor da ficha`). */
  encaminhado_para: string | null;
  encaminhado_dentista: { nome: string } | null;
};

export type FichaParaOrc = {
  // …campos existentes…
  /** R-53 — autor da ficha = responsável default dos eventos não encaminhados
   *  (contrato de `filtro-responsavel.ts`). */
  dentista_id: string;
  dentista: { nome: string } | null;
};
```

### 4.2 Query — `paciente-detail-client.tsx`

| Onde | Muda para |
|---|---|
| `SELECT_FICHA_PARA_ORC` (`:1071-1073`) | ganha `dentista_id`, `dentista:dentistas(nome)` na ficha e `encaminhado_para, encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey(nome)` no embed de eventos |
| `abrirNovoOrcamento` (`:1075-1111`) | embed vira `odontograma_eventos!inner(...)` + `.eq('odontograma_eventos.status','indicado')` + `.is('odontograma_eventos.assinatura_id', null)` — só fichas **com** indicado aberto voltam, já filtradas. **Remove o `.limit(10)`** (ver ⚠️ abaixo) |
| idem | com ≥1 ficha voltando → monta os itens de **todas** juntas e pula direto pra `'itens'`. `setFichaOrcId(null)` — o orçamento não pertence mais a 1 ficha |
| idem | zero ficha voltando (nenhum indicado aberto) → **fallback atual intacto**: busca as 10 fichas recentes sem filtro e cai em `itensDoTexto` |
| `fichaParaItens` (`:1024-1067`) | vira `eventosParaItens(eventos: EventoOdontogramaParaOrc[]): NovoOrcItem[]` — função pura, sem depender de `ficha`. O miolo (agrupar por `` `${tipo}\|${grupo_id ?? id}` ``, `matchProcedimentoPorTipo`, `sentinelDaAncora`, `denteLabel`) **não muda nada** |
| `abrirOrcamentoParaFicha(fichaId)` (`:1126-1151`) | converge pro mesmo caminho — `fichaId` vira contexto de entrada (o que o dentista clicou), nunca a fonte dos itens |

⚠️ **Sobre remover o `.limit(10)`:** com `!inner` + filtro, só voltam fichas que **têm**
indicado aberto — medido hoje, no máximo **6 por paciente**, com os eventos já filtrados no
embed. O payload é menor que o de hoje (que traz 10 fichas inteiras, com todos os eventos de
qualquer status). Se um dia crescer, o teto certo é por evento, não por ficha.

⚠️ **Família R-44 (FK ambígua):** o embed de `dentistas` no evento **precisa** do
`!odontograma_eventos_encaminhado_para_fkey` — há 2 FKs pra `dentistas` (autor e destino), e
sem desambiguar o PostgREST devolve **300**. Esse padrão já foi validado no R-52
(`get-meu-dia.ts`) e é o mesmo de `FichasTab.tsx:943`. O embed `odontograma_eventos` dentro de
`fichas` **não** é ambíguo (FK única) — já é usado assim hoje (`:1069-1070`).
**Conferir também** se `dentista:dentistas(nome)` na ficha precisa de `!fkey` — não presumir.

### 4.3 Apresentação — chips de responsável

O modal de orçamento ganha a mesma faixa de chips da ficha (R-16), alimentada por
`derivarResponsaveis(fichas)` e aplicada com `eventosVisiveis`/`responsavelPassaFiltro`:

- Chips só aparecem quando há **≥2 responsáveis distintos** (mesma regra da ficha — solo não
  mostra chip). Hoje, com 1 encaminhamento no banco inteiro, quase nunca aparecem.
- Default = `null` (**Todos**) — o valor é da clínica.
- `filtroAindaValido` (R-18) reseta pra `null` quando o responsável escolhido some.
- O filtro é **de exibição**: mudar o chip muda quais itens o modal lista, **não** apaga item
  já adicionado ao orçamento nem altera valor.

## 5. Referência visual

Sem artefato novo. Reusa a faixa de chips já em produção na ficha (R-16, desde 26/07) — mesmos
tokens (`bg-surface`, `border-border`, `text-teal-ink` no ativo), mesmo componente de leitura.
O resto do modal (`novo-orcamento-modal.tsx`) não muda de forma.

**Responsivo** — o P8 morreu em 03/08 (ver [R-46-C6 §2.5](R-46-C6-layout-cockpit.md)): a faixa
de chips precisa funcionar em tablet, com rolagem horizontal se estourar.

## 6. Invariantes

- [ ] **I1** — Evento com `assinatura_id` **nunca** entra no orçamento (congelado). É a única
      exclusão por query.
- [ ] **I2** — Evento **encaminhado entra** no orçamento. ⚠️ *Corrigido do contrato anterior,
      que mandava excluir — ver §2.1.* Excluir seria perder receita em silêncio.
- [ ] **I3** — Responsável nunca é calculado inline: sempre `filtro-responsavel.ts`. Vale pro
      orçamento **e** pro "A fazer" (R-52).
- [ ] **I4** — O filtro por responsável é **display puro**. Nunca decide o que é gravado, nunca
      é autoria legal (o PDF/prontuário segue mostrando `dentista_id` + CRO + assinatura).
- [ ] **I5** — Nenhum orçamento **existente** muda de valor pra trás — a mudança é só na fonte
      dos itens de um orçamento novo.
- [ ] **I6** — Orçamento agregado não pertence a 1 ficha: `orcamentos.ficha_id` fica `null`
      (a coluna já é nullable desde `20260321000002_014`).
- [ ] **I7** — Nenhuma ficha é criada, alterada ou "juntada" por este item (modelo do §0 da
      spec-mãe: sessão nova = ficha nova, sempre).

## 7. Gates de aceite

**Prova no banco (não na tela):**
- [ ] **G1** — Paciente com indicados em ≥2 fichas de datas diferentes: o número de itens do
      orçamento aberto bate com
      `select count(*) from odontograma_eventos where paciente_id=X and status='indicado' and assinatura_id is null`
      — **sem** condição de `encaminhado_para` (é a correção do §2.1). Usar um dos 20 pacientes
      com indicado aberto medidos em 04/08.
- [ ] **G2** — Evento com `assinatura_id` não-nulo **não** aparece no orçamento.
- [ ] **G3** — Evento com `encaminhado_para` setado **aparece**, sob o filtro "Todos", com o
      responsável exibido = o destino (não o autor). Dado de teste já existe: 1 evento
      encaminhado no banco (raspagem Q2, criada no teste do R-52 em 04/08).
- [ ] **G4** — Paciente **sem** nenhum indicado aberto: cai no fallback de texto, com a etapa
      "selecionar ficha", exatamente como é hoje (regressão).
- [ ] **G5** — Orçamento gerado pelo caminho agregado grava `orcamentos.ficha_id = null` e não
      quebra o PDF nem a tela de orçamentos (as duas leem `ficha_id` opcional).

**Regressão:**
- [ ] **G6** — Query de sanidade da premissa do §3:
      `select count(*) from odontograma_eventos e join fichas f on f.id=e.ficha_id where e.dentista_id <> f.dentista_id`
      **tem que devolver 0**. Se devolver >0, o modelo ficha-cêntrico passou a mentir e o
      responsável exibido fica errado — vira item novo antes de seguir.
- [ ] **G7** — `abrirOrcamentoParaFicha` (botão "gerar orçamento" dentro de uma ficha)
      continua abrindo o modal sem erro, agora com o agregado.
- [ ] **G8** — Nenhum embed devolve **300** (família R-44): conferir no Network que a query de
      fichas volta 200 com os 2 embeds de `dentistas`.
- [ ] **G9** — 2 contas logadas (regra do projeto pra qualquer coisa que toca autoria):
      o orçamento do paciente mostra o **mesmo conjunto de itens** pros dois dentistas sob o
      filtro "Todos" — o dinheiro é da clínica. Só os chips mudam de seleção default.

## 8. Fora de escopo

- **R-46h** (botão único "salvar + abrir orçamento" no cockpit) — se beneficia deste item
  (a query agregada já fica pronta), mas é item próprio e não é pré-requisito.
- **Preço/valor** — este item muda **de onde vêm os itens**, não como se precifica.
  `matchProcedimentoPorTipo` e `preco_padrao` seguem iguais.
- **Aviso ao paciente de que o orçamento mudou de fonte** — a troca é silenciosa, sem
  notificação. Nenhum orçamento existente é tocado.
- **Dedup entre indicados de fichas diferentes com a mesma âncora** — se o dentista indicou
  "restauração 15-O" em duas fichas, viram 2 itens. Comportamento pré-existente do
  agrupamento por `` `${tipo}|${grupo_id ?? id}` ``; não piora nem melhora aqui. Se incomodar,
  é item novo — **não** resolver junto, porque mexer no agrupamento mexe em quantidade cobrada.
- **Chips no PDF do orçamento** — o filtro é da tela de montagem, não do documento.

## 9. Achados que sustentam o contrato

**Medições no banco de produção, 04/08:**

| O quê | Número |
|---|---|
| Indicados em aberto (sem assinatura) | **113** |
| Pacientes com pelo menos 1 | **20** |
| Máx. de fichas distintas com indicado aberto, mesmo paciente | **6** |
| Eventos encaminhados | **1** (criado no teste do R-52) |
| `odontograma_eventos.dentista_id` ≠ `fichas.dentista_id` | **0 de 232** |
| Eventos órfãos (`ficha_id is null`) | **0** |

Os dois últimos são o que sustenta o §3 (ficha-cêntrico é seguro). O terceiro é o que sustenta
remover o `.limit(10)` sem medo de payload.

**A contradição que esta spec corrige.** A versão anterior (dentro de
[R-51-53](R-51-53-modelo-multissessao.md)) tinha o X1 resolvido no fim do documento, mas o
§4.3, a invariante de `encaminhado_para` e os gates G7/G8 ainda diziam o contrário — excluir
encaminhado da query. Codar contra aqueles gates reprovaria a implementação correta. Aqui isso
está unificado: **só `assinatura_id` exclui**.

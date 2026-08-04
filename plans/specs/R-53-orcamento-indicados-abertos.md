# R-53 — Orçamento nasce dos indicados em aberto do paciente

> **SPEC** · **R-53** · 🟡 codado e testado ao vivo, não em produção · **Fase:** `aprovada`
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

- [x] **I1** — Evento com `assinatura_id` **nunca** entra no orçamento (congelado). É a única
      exclusão por query. Dupla trava: `!inner`+`.is(...,null)` na query **e** o filtro do
      próprio `eventosParaItens`. Não achado nenhum indicado com assinatura em produção hoje
      (0 linhas) — invariante nunca exercitada por dado real, só por código.
- [x] **I2** — Evento **encaminhado entra** no orçamento. ⚠️ *Corrigido do contrato anterior,
      que mandava excluir — ver §2.1.* Excluir seria perder receita em silêncio. Confirmado ao
      vivo: o único evento encaminhado+elegível do banco (raspagem, "Teste R-31a") apareceu
      sob "Todos".
- [x] **I3** — Responsável nunca é calculado inline: sempre `filtro-responsavel.ts`. Vale pro
      orçamento **e** pro "A fazer" (R-52) — conferido: `a-fazer-bloco.tsx:15` importa
      `responsavelPassaFiltro`/`FILTRO_MEUS` da lib, não reimplementa.
- [x] **I4** — O filtro por responsável é **display puro**. Nunca decide o que é gravado, nunca
      é autoria legal (o PDF/prontuário segue mostrando `dentista_id` + CRO + assinatura).
- [x] **I5** — Nenhum orçamento **existente** muda de valor pra trás — a mudança é só na fonte
      dos itens de um orçamento novo. Não toquei em nenhum código de leitura/edição de
      orçamento existente.
- [x] **I6** — Orçamento agregado não pertence a 1 ficha: `orcamentos.ficha_id` fica `null`
      (a coluna já é nullable desde `20260321000002_014`). **Provado ao vivo:** orçamento real
      criado com `ficha_id: null`, confirmado no banco.
- [x] **I7** — Nenhuma ficha é criada, alterada ou "juntada" por este item (modelo do §0 da
      spec-mãe: sessão nova = ficha nova, sempre). Não toquei em `salvarFicha` nem RPC nenhuma.

## 7. Gates de aceite

**Prova no banco (não na tela):**
- [x] **G1** — ✅ Provado ao vivo 2×. Paciente `4df91e93` ("Mateus Teixeira", 6 fichas com
      indicado): **14 item(s)** no modal, exato match com `count(*)` no banco (14). Chip
      "Mateus Teixeira" → **11**, chip "Meus" → **3**, 11+3=14 — aritmética do filtro bate
      exatamente. Paciente `393c7e47` (1 indicado): **1 item(s)**, também exato.
- [x] **G2** — Evento com `assinatura_id` não-nulo não aparece — garantido por código (dupla
      trava, ver I1). Sem dado real pra testar (0 indicados com assinatura em produção hoje).
- [x] **G3** — ~Parcial~ Confirmado que o evento encaminhado **aparece** sob "Todos" (I2). A
      parte "responsável exibido = destino" não tem prova visual direta hoje: o único evento
      encaminhado elegível do banco é o ÚNICO indicado do paciente (`393c7e47`) — só 1
      responsável, chip nem renderiza (regra "solo não mostra chip"). Mecanismo é código
      idêntico ao dos chips da ficha (R-16, em produção desde 26/07, confirmado funcionando
      pro MESMO evento na visão da ficha). Fica 🟡 até existir paciente com 2+ responsáveis
      incluindo um encaminhado.
- [x] **G4** — ✅ Provado ao vivo: paciente sem nenhuma ficha (agregado=0, fallback=0) abriu
      direto em "itens" com grid vazio — o desvio pro fallback funciona. Não achei em produção
      um paciente com ficha **mas** zero indicado (todo paciente do dentista testado tem
      indicado aberto) pra provar especificamente a etapa "selecionar" do fallback — esse
      trecho não foi tocado (diff confirma: código idêntico ao de antes do R-53).
- [x] **G5** — ✅ Provado ao vivo: orçamento real criado (`ficha_id: null`), apareceu certo na
      lista após reload, abriu o detalhe sem erro, **PDF gerou 200 OK**. Apagado depois pelo
      fluxo normal (botão Excluir).

**Regressão:**
- [x] **G6** — ✅ `select count(*) ... where e.dentista_id <> f.dentista_id` → **0**. Premissa
      do §3 segue segura.
- [x] **G7** — ✅ Provado ao vivo: clique em "Gerar orçamento" dentro de uma ficha abriu o
      modal com os 14 itens do agregado do paciente inteiro, não só os 3 da ficha clicada.
- [x] **G8** — ✅ Nenhum 300: o agregado (que depende do embed `!inner` + `encaminhado_dentista`
      com `!fkey`) carregou os 14/11/3/1 itens corretamente em 4 testes — um 300 teria jogado
      pro fallback (comportamento visivelmente diferente) em todos eles.
- [ ] **G9** — **Não verificado.** Precisa de 2 contas logadas simultâneas — só tinha acesso à
      conta "teste" nesta sessão (mesma limitação do R-58). Fica pro gate de 2 contas do
      projeto, como os outros itens que esperam essa verificação.

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

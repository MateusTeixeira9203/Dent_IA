# R-112 — O filtro do modal de orçamento sai; secretária puxa do "Dentista responsável"

> **SPEC** · **R-112** · fase **contrato — aguardando aprovação**
> **Modelo:** Sonnet 5 (mecânico — a decisão de UX está tomada; o resto é remoção com um alvo trocado)
> **Aberto:** 2026-08-16 · **Fechado:** —
> **Migration:** zero · **RLS:** zero · **query nova:** zero

## 1. Problema

`abrirNovoOrcamento` ([use-orcamento-modal.ts:314](../../src/app/dashboard/pacientes/[id]/_components/use-orcamento-modal.ts:314))
abre o modal com `filtroResponsavelOrc = FILTRO_MEUS`. O responsável de um indicado é
`encaminhado_para ?? autor da ficha`. Então quem não é o autor daqueles indicados abre o modal
**vazio** — e `ChipsResponsavel` ([novo-orcamento-modal.tsx:216](../../src/app/dashboard/pacientes/[id]/_components/modals/novo-orcamento-modal.tsx:216))
só renderiza com ≥2 responsáveis distintos, então **não sobra controle nenhum na tela pra voltar
a "Todos"**. O reset que existe pra exatamente isso na ficha (`filtroAindaValido`, R-18) nunca foi
importado aqui.

Pra secretária é pior: `meuDentistaId` é o perfil `dentistas` **dela**, que nunca é autor de ficha.
O modal dela abre vazio em **todo** paciente.

**Medido em produção (ClinDent, 16/08):** 44 pacientes com indicado em aberto, 186 eventos, e em
**42 dos 44** há um único responsável — os chips praticamente nunca aparecem.

## 2. Decisão (dele, 16/08 — não reabrir)

O filtro por responsável **sai** do modal. Chips somem.

| Quem abre | De onde vêm os itens |
|---|---|
| Dentista | os indicados **dele** — sem chip, sem "Todos" |
| Secretária | os indicados **do dentista que ela escolheu** no campo obrigatório "Dentista responsável *" (já existe, [:223-237](../../src/app/dashboard/pacientes/[id]/_components/modals/novo-orcamento-modal.tsx:223)) |

Trocar o select re-monta a lista. Nenhum controle novo entra na tela — só sai.

### 2.1 Por que o Meu dia não pode regredir (provado por leitura, não por teste)

`filtroResponsavelOrc` / `responsaveisOrc` / `ChipsResponsavel` existem **só** dentro de
`abrirNovoOrcamento`. Os outros dois pontos de entrada do hook nunca os tocam, e nenhum dos dois
é alcançável pela secretária:

- `abrirPickerFichasAbertas` — Meu dia, e Meu dia é dentista-only (`page.tsx` redireciona secretária)
- `abrirOrcamentoParaFicha` — botão por-ficha, escondido pra ela:
  `onGerarOrcamento={role !== 'secretaria' ? … : undefined}` ([paciente-detail-client.tsx:1388](../../src/app/dashboard/pacientes/[id]/_components/paciente-detail-client.tsx:1388)) ✅ conferido
- `meu-dia-client.tsx` chama só `abrirPickerFichasAbertas` (:370, :395) e `abrirOrcamentoParaFicha` (:864) — **nunca** `abrirNovoOrcamento` ✅ conferido

A mudança fica contida em `abrirNovoOrcamento` + `itensDoAgregado`. O Meu dia não regride porque
não executa esse caminho.

## 3. Decisões técnicas

| # | Decisão | Motivo |
|---|---|---|
| D1 | `filtroResponsavelOrc`, `responsaveisOrc`, `handleFiltroResponsavelOrc`, o import de `derivarResponsaveis` e o `<ChipsResponsavel>` somem | O conceito inteiro sai, não só o pixel |
| D2 | `filtro-responsavel.ts` **não muda e não é apagada** | Segue sendo o motor de `FichasTab.tsx` (R-16/R-18) **e** de `itensDoAgregado` (D3) |
| D3 | `itensDoAgregado` continua chamando `eventosVisiveis(…, FILTRO_MEUS, alvoId)` — o que muda é só quem é `alvoId` | Preserva a I2 do R-53 (evento **encaminhado entra**, sob o responsável certo) sem reimplementar responsável em lugar nenhum (I3 do R-53) |
| D4 | `carregarFichasAgregado` continua **sem** `.eq('dentista_id', …)` na query (só o Meu dia restringe, via `restringirAoMeuDentista`) | Restringir na query perderia o evento **encaminhado** por outro autor pro alvo. O recorte certo é em JS, sobre o agregado completo |
| D5 | Trocar o dentista no select re-deriva `novoOrcItens` do zero, **descartando** edição manual anterior | Manter os itens seria pior: lista do dentista A gravada no orçamento do dentista B. Já era assim com o chip (`handleFiltroResponsavelOrc` substituía a lista inteira) |
| D6 | Dentista perde o atalho de ver indicado de colega dentro deste modal | Consequência direta da decisão dele. Nenhuma capacidade de orçar some — só este caminho |

## 4. Contrato técnico

### 4.1 `use-orcamento-modal.ts`

```typescript
// :34 — import perde derivarResponsaveis e o type FiltroResponsavel
import { eventosVisiveis, FILTRO_MEUS } from '@/lib/fichas/filtro-responsavel';

// :107 — REMOVE o state do filtro
// :278-294 — REMOVE responsaveisOrc (useMemo) e handleFiltroResponsavelOrc
// :582 — REMOVE a linha setFiltroResponsavelOrc(null) do onOpenChange
```

```typescript
// :269 — itensDoAgregado troca o filtro por um alvo explícito
const itensDoAgregado = (fichas: FichaParaOrc[], alvoDentistaId: string): NovoOrcItem[] => {
  const itens = fichas.flatMap((f) => {
    const comResponsavel = (f.odontograma_eventos ?? []).map((ev) => ({ ...ev, ...paraResponsavel(ev) }));
    const visiveis = eventosVisiveis(comResponsavel, f.dentista_id, FILTRO_MEUS, alvoDentistaId);
    return eventosParaItens(visiveis);
  });
  return itens.length > 0 ? itens : [ITEM_VAZIO];
};
```

```typescript
// :320 — dentro do if (agregado.length > 0)
const alvoId = isSecretaria ? novoOrcDentistaAlvoId : meuDentistaId;
setFichasParaOrc(agregado);
setFichaOrcId(null);
setNovoOrcItens(itensDoAgregado(agregado, alvoId));
setEtapaNovoOrc('itens');
// o fallback G4 (else) fica INTACTO
```

```typescript
// NOVO — substitui o setNovoOrcDentistaAlvoId cru em modalProps.onDentistaAlvoChange
const handleDentistaAlvoChange = (id: string) => {
  setNovoOrcDentistaAlvoId(id);
  // fichaOrcId === null é o discriminador do agregado (nunca aponta pra 1 ficha — ver o
  // comentário de podeTrocarFicha, :588-596). Só nesse caminho a lista veio de
  // itensDoAgregado; no per-ficha e no fallback de 1 ficha ela veio de fichaParaItens,
  // e re-derivar aqui trocaria a semântica do que já está na tela.
  if (isSecretaria && fichaOrcId === null && etapaNovoOrc === 'itens') {
    setNovoOrcItens(itensDoAgregado(fichasParaOrc, id));
  }
};
```

```typescript
// modalProps :597-600 — REMOVE responsaveisOrc, meuDentistaId, filtroResponsavelOrc,
//                       onFiltroResponsavelOrcChange
// modalProps :617     — onDentistaAlvoChange: handleDentistaAlvoChange (era o setter cru)
```

### 4.2 `modals/novo-orcamento-modal.tsx`

Removem-se: o import de `ChipsResponsavel` e do type `FiltroResponsavel`, os 4 campos
correspondentes de `NovoOrcamentoModalProps`, o destructure e o bloco JSX `:216-221`.

O `<Select>` de "Dentista responsável" (`:223-237`) **não muda uma linha** — já é exatamente o
controle que a secretária vai usar.

## 5. Invariantes

- [ ] **I1** — Dentista nunca vê item cujo responsável (`encaminhado_para ?? autor`) não seja ele.
- [ ] **I2** — Secretária nunca vê item cujo responsável não seja o dentista selecionado.
- [ ] **I3** — Evento **encaminhado** continua entrando, sob o destino (I2 do R-53 preservada).
- [ ] **I4** — Trocar o select re-deriva do agregado **já carregado** — zero query nova.
- [ ] **I5** — Meu dia: zero diff funcional (não executa `abrirNovoOrcamento`).
- [ ] **I6** — `filtro-responsavel.ts` e `chips-responsavel.tsx` intactos e ainda em uso pela ficha.

## 6. Gates de aceite

- [ ] **G1** — Dentista abre paciente cujos indicados são dele → itens aparecem, sem chip na tela.
- [ ] **G2** — Dentista abre paciente cujos indicados são de um colega → modal abre com linha vazia,
      e isso agora é o comportamento **pretendido** (não o beco de hoje).
- [ ] **G3** — Secretária abre paciente com indicado de 2 dentistas → escolhe X → só itens de X;
      troca pra Y → lista vira a de Y. Nenhum chip em nenhum momento.
- [ ] **G4** — Evento encaminhado de A pra B aparece pro alvo B (dentista B logado, ou secretária
      com B selecionado), mesmo a ficha de origem sendo de A.
- [ ] **G5** — Regressão Meu dia: picker e "Gerar orçamento" do histórico idênticos.
- [ ] **G6** — Regressão do fallback (paciente sem nenhum indicado): etapa `selecionar` e
      `itensDoTexto` intocados.
- [ ] **G7** — `tsc` limpo: nenhum resquício de `responsaveisOrc` / `filtroResponsavelOrc` /
      `meuDentistaId` na cadeia de props do modal.

## 7. Fora de escopo

- Chips na ficha (`FichasTab.tsx`) — continuam existindo, não são tocados.
- `abrirOrcamentoParaFicha` / `abrirPickerFichasAbertas` — não usam responsável.
- Qualquer ajuste visual do modal — é o **R-114** e o redesenho que vem com ele.

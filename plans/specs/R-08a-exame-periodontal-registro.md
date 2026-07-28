# R-08a — O exame periodontal passa a existir como registro

> **SPEC** · **R-08a** · fase **aprovada** — decisões travadas 28/07, pronta pra execução.
> **Modelo:** Sonnet (mecânico — 2 arquivos, ~30 linhas, zero SQL).
> **Aberto:** 2026-07-28 · **Primeiro sub-item do R-08** (ver ROADMAP) · **Migration: NENHUMA.**
> **Peso:** P.

## Por que este é o primeiro corte do R-08

O R-08 estava escrito no roadmap como *"tela própria (6 sítios × 32 dentes)"*. Isso é o corte
**final**, não o primeiro — e construí-lo antes é fazer a tela do especialista antes da tela de
quem abre o sistema todo dia. O filtro do CLAUDE.md é *isso reduz atrito operacional do dentista?*
— uma grade de 192 números digitados com a sonda na mão **aumenta** atrito (é o exame que na
clínica real exige duas pessoas: uma sonda, outra anota).

Antes de qualquer grade, falta uma coisa muito mais barata: **hoje não dá nem pra registrar que o
exame periodontal aconteceu.** Este item resolve isso.

## O achado que torna isto grátis

Confirmado ao vivo no banco (`pg_constraint`, projeto `zenfemoxvwerplrjgfqz`) — **não no arquivo de
migration**, que o CLAUDE.md avisa que diverge:

- `odontograma_eventos_tipo_check` **já aceita `'exame_periodontal'`** (17 tipos no CHECK).
- `odontograma_eventos_nivel_check` já aceita `'boca'`.
- A coluna `detalhe jsonb` existe e a RPC `salvar_eventos_odontograma` já a persiste.

O tipo foi criado no banco pela migration 106 (R-07) mas **nunca chegou ao TypeScript**. O item é
literalmente fechar essa lacuna.

## Escopo

**Cobre:** `exame_periodontal` entra em `TipoRegistroOdontograma` e `TIPO_LABEL`; ganha chip na
faixa "Procedimentos de rotina" do form de evolução, com o mesmo ciclo dos demais
(1º toque = a fazer · 2º = feito · 3º remove). Ancora em `boca`, como profilaxia/flúor/clareamento.

**Não cobre:** PSR/CPITN (é o **R-08b**) · grade 6×32 e tabela `perio_exames` (**R-08c**) · PDF e
assinatura do periograma (**R-08d**) · comparação entre exames (**R-08e**) · voz (**R-08f**).
**Também não cobre o modo consulta** — ver abaixo.

## Achado fora do escopo (vira item próprio)

Os chips de rotina do **R-07 nunca chegaram ao modo consulta**: grep em `src/app/consulta` por
rotina/profilaxia/raspagem = **zero**. O R-07 está ✅ na ficha rápida e furado no outro fluxo.
Isso **não** é dívida que o R-08a introduz nem que ele deva pagar de carona — vira item ⏳ próprio
no roadmap, com o R-07 citado como origem.

## Contrato técnico

```typescript
// src/types/odontograma.ts
export type TipoRegistroOdontograma =
  | ...
  | 'exame_periodontal';   // R-08a. Ancora em boca. Registra que o exame perio aconteceu.

export const TIPO_LABEL: Record<TipoRegistroOdontograma, string> = {
  ...,
  exame_periodontal: 'Exame periodontal',
};
```

`TIPO_LABEL` é `Record` **total** — o TypeScript quebra o build se o rótulo faltar. Isso é o gate
automático de que os dois lugares andaram juntos.

Em `src/components/pacientes/FichasTab.tsx`: acrescentar `'exame_periodontal'` à tupla de chips de
boca. `cycleRotina`/`eventoRotina` **não mudam** — já montam o evento `nivel:'boca'` genericamente.

## Invariantes

- [ ] Zero migration — o CHECK do banco já aceita o tipo.
- [ ] `TIPO_LABEL` continua total (sem `Partial`, sem cast).
- [ ] O evento nasce `nivel: 'boca'`, como os demais de rotina.
- [ ] Nenhum comportamento dos chips existentes muda.

## Gates de aceite

- [ ] Chip "Exame periodontal" aparece na faixa de rotina do form de evolução.
- [ ] 1º toque marca a fazer (coral), 2º marca feito (teal), 3º remove — igual aos outros.
- [ ] Salvar persiste o evento; **recarregar a página** mostra o registro (persistiu de verdade).
- [ ] O evento aparece na seção "Geral" da lista de registros.
- [ ] Conferir a linha no banco: `tipo='exame_periodontal'`, `nivel='boca'`.
- [ ] Dark e light conferidos no chip nos 3 estados.

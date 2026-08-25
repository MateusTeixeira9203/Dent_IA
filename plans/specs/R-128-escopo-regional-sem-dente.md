# R-128 — Escopo regional sem dente

> **SPEC** · **R-128** · fase **implementada — aguardando QA visual** · 24/08/2026
> **Migration:** zero.

## Problema

Procedimentos como profilaxia, clareamento e aplicações em uma arcada não pertencem a um
dente. Hoje o dentista recebe dois atalhos fixos e, para qualquer outro procedimento regional,
fica sem um caminho rápido e evidente.

## Decisão aprovada

- Substituir os atalhos fixos `Profilaxia` e `Clareamento` por três escopos universais:
  `Boca toda`, `Arcada superior` e `Arcada inferior`.
- Não oferecer quadrantes nesta faixa.
- `Manutenção ortodôntica` continua como atalho separado, pois é procedimento, não escopo.
- Após escolher o escopo, o dentista pesquisa ou digita qualquer procedimento e confirma sem
  abrir modal. O escopo permanece ativo para lançamentos consecutivos.
- O status continua sendo escolha manual: a fazer, realizado hoje, próxima sessão ou
  pré-existente.
- Selecionar um dente limpa o escopo regional; selecionar um escopo regional limpa os dentes.
- A Ficha e o Meu Dia usam o mesmo componente e a mesma função de criação de eventos.

## Contrato técnico

```ts
export type EscopoRegional = 'boca' | 'arcada_superior' | 'arcada_inferior';

export function ancoraDoEscopoRegional(escopo: EscopoRegional): AncoraClinica;
```

Mapeamento:

| Escolha | Âncora persistida |
|---|---|
| Boca toda | `{ nivel: 'boca' }` |
| Arcada superior | `{ nivel: 'arcada', arcada: 'superior' }` |
| Arcada inferior | `{ nivel: 'arcada', arcada: 'inferior' }` |

Procedimento estrutural reconhecido usa seu `tipo`. Item de catálogo ou texto livre sem tipo
estrutural vira `tipo: 'outro'`, com o nome em `observacao`. Nenhum dente artificial ou
sentinela é criado.

## Contrato visual

- Uma linha compacta e rolável no mobile: `Boca toda · Arcada superior · Arcada inferior`,
  divisor, `Manutenção ortodôntica`.
- Só o escopo ativo abre a faixa de status + busca logo abaixo.
- Sem modal e sem quebra dos chips em várias linhas no celular.
- Na Ficha, o atalho ortodôntico abre o complemento já existente; não duplica o formulário.

## Invariantes

- Eventos antigos e procedimentos já salvos não são alterados.
- Escopo regional nunca pinta um dente no odontograma.
- O fluxo por dente e o detalhe dental continuam iguais.
- Os antigos tipos de boca e quadrante continuam legíveis; apenas sua entrada rápida muda.
- A escolha de status é sempre explícita e usa `criarEventosContextuais`.

## Gates de aceite

- [ ] Meu Dia: `Boca toda` → digitar `Profilaxia` → `Realizado hoje` cria um card geral.
- [ ] Ficha: `Arcada superior` → digitar procedimento livre → cria card sem dente.
- [ ] O escopo permanece selecionado após adicionar um procedimento.
- [ ] Clicar um dente após usar uma arcada fecha a faixa regional e abre a faixa dental.
- [ ] Clicar uma arcada com dentes selecionados limpa a seleção dental.
- [ ] Manutenção ortodôntica abre o formulário já existente nas duas telas.
- [ ] Mobile mantém a linha de escopos utilizável sem deformar o layout.
- [ ] TypeScript e testes unitários limpos.

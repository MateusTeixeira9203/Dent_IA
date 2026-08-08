# R-77 — Histórico: scroll no modo prévia + observação expansível

> **SPEC** · **R-77** · ✅ aprovada · **Fase:** `aprovada`
> **Aberto:** 2026-08-08 · **Fechado:** —
> **Modelo:** Sonnet 5 (extração de componente já existente + CSS, sem ambiguidade de design)
> **Depende de:** nada bloqueia · **Zero migration · zero RLS.**
> **Absorve o achado 3 do [R-71](../ROADMAP.md)** (auditoria 07/08) — observação do
> procedimento sem "ver mais". R-71 mantém os outros 2 achados (nativeButton warning,
> janela de hora fixa da Agenda) como item próprio.

## 1. O que ele pediu (08/08)

Dois pontos de legibilidade no Histórico do Meu dia, achados durante a conversa sobre o
R-46h (o botão de orçamento vai morar na mesma área):

1. Scroll no Histórico — hoje só existe quando a lista está expandida pra todas as visitas.
2. Observação do procedimento poder abrir/expandir quando for longa.

**Não faz parte deste item** (já existe): a tabela de especialidade (endo/PSR/implante)
dentro de cada `RegistroCard` já nasce fechada por padrão (`defaultOpen=false`,
`registro-card.tsx`) e expande no clique — confirmado por grep, nenhum call site do projeto
passa `defaultOpen={true}`.

## 2. Parte A — teto de altura também no modo prévia

`HistoricoBloco` (`historico-bloco.tsx`) hoje bifurca:

```tsx
className={
  expandido
    ? 'flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-2'
    : 'flex flex-col divide-y divide-border'
}
```

O teto só existe quando `expandido` mostra a lista inteira (N visitas). No modo prévia
(`PREVIA = 1`, só a última visita), não há limite — se essa única visita tiver texto longo
mais vários procedimentos, a coluna estica sem controle.

**Contrato: unifica em 1 classe só**, sem bifurcação — `max-h-[420px] overflow-y-auto`
sempre, independente de `expandido`. Mais simples que manter os dois ramos, e resolve os dois
casos com a mesma regra.

```tsx
className="flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-2"
```

## 3. Parte B — observação expansível, sem duplicar a lógica que já existe

`TextoVisita` (`historico-bloco.tsx:61-90`) já resolve exatamente este problema pro texto da
visita: mede `scrollHeight` vs `clientHeight` do parágrafo clampado (G7 do R-58 — só mostra
"ver mais" quando REALMENTE transborda, nunca por chute de tamanho de string) e alterna
`line-clamp-4`/aberto.

`registro-card.tsx:189-191` tem o mesmo problema, sem a mesma solução:

```tsx
) : data.observacao && (
  <p className="text-xs text-text-secondary italic mt-0.5 truncate">&ldquo;{data.observacao}&rdquo;</p>
)
```

`truncate` corta em 1 linha com reticências CSS — sem interação, sem "ver mais".

**Contrato: extrai `TextoVisita` pra um componente compartilhado**
`components/fichas/texto-expansivel.tsx` (`TextoExpansivel`), parametrizado por
`clampLines` (a única diferença real entre os dois usos):

```ts
interface TextoExpansivelProps {
  texto: string;
  clampLines?: number;    // default 4 (mantém o comportamento atual do TextoVisita)
  className?: string;     // estilo do <p>, cada chamador mantém a própria tipografia
}
```

- `historico-bloco.tsx` passa a importar e usar `TextoExpansivel` (comportamento idêntico,
  motor movido — mesmo padrão do R-46h §2, "nada é reescrito, só extraído").
- `registro-card.tsx` usa `TextoExpansivel` pra `data.observacao`, com `clampLines={2}` (a
  observação é subtítulo do card — 4 linhas do texto de visita ocupariam espaço desproporcional
  ao papel dela ali) e o wrapper itálico que o card já tem.

**Cuidado de interação:** quando o card TEM corpo de especialidade (`temCorpo`) ou está em
modo seleção (`emSelecao`), o `<div>` inteiro do card já é clicável (`aoClicar`, linha 144) —
abre/fecha a tabela ou marca/desmarca. O botão "ver mais" do `TextoExpansivel`, dentro desse
card, precisa de `stopPropagation` no `onClick` (mesmo padrão que o botão de remover
encaminhamento já usa, linha 219) pra não disparar os dois gestos com 1 clique.

## 4. Invariantes

| # | Regra | Por quê |
|---|---|---|
| I1 | Nunca duplica a lógica de clamp+medição de overflow | Já existe em `TextoVisita`/`TextoExpansivel` — um 2º parágrafo copiado diverge no 1º ajuste futuro |
| I2 | Clique em "ver mais" da observação nunca propaga pro toggle do card pai | `stopPropagation` obrigatório onde o card é clicável (`temCorpo` ou `emSelecao`) |

## 5. Gates

| Gate | Como testar |
|---|---|
| G1 | Modo prévia (1 visita) com texto longo + vários procedimentos → container tem teto de altura com scroll, não estoura a página |
| G2 | Modo expandido (N visitas) → mesmo teto, scroll contínua funcionando (regressão zero) |
| G3 | Observação longa num `RegistroCard` com corpo de especialidade → corta em 2 linhas, "ver mais" expande sem abrir/fechar a tabela junto |
| G4 | Observação curta (cabe em 2 linhas) → sem botão "ver mais" (só aparece quando realmente transborda) |
| G5 | Observação longa num `RegistroCard` SEM corpo de especialidade → "ver mais" funciona normalmente, resto do card continua não-clicável |
| G6 | Tela do paciente (`FichasTab`, outro consumidor de `RegistroCard`) — mesma extração, checar que a observação lá também ganhou "ver mais" sem regressão visual |

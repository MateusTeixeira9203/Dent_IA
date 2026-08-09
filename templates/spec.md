# R-NN — {Título}

> **SPEC** · **R-NN** · 🔵 ativo
> **Aberto:** YYYY-MM-DD · **Fechado:** — · **Fase:** debate | plano | contrato | aprovada

<!-- Seções 1–3 nascem no debate/planejamento; 4–9 no contrato.
     Seção sem conteúdo fica com "—", não some: a ausência é informação. -->

## 1. Problema

Qual dor real, de quem, e por que agora. Sem solução aqui.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|

## 3. Objetivo e como funciona

**Objetivo:** {resultado observável em uma linha}

{2–5 linhas de como funciona do ponto de vista de quem usa}

## 4. Contrato técnico

Só o que é específico desta feature — não redocumente o stack.
Conforme o caso: types TypeScript · schemas Zod · contratos de API (rota/body/response/erros)
· SQL + RLS · árvore de componentes com Server/Client.

## 5. Comportamento — o alvo funcional

> O par funcional da §6. Sem isto, "100% funcional" fica indefinido e a implementação
> improvisa cada caminho — que é o que faz a funcionalidade demorar a fechar.

### Estados — o vocabulário é quase sempre este. Preencha ou marque N/A

| Estado | Quando acontece | O que a tela mostra | O que a função faz |
|---|---|---|---|
| Vazio | sem dados ainda | | |
| Carregando | server action em voo (`pending`) | | |
| Sucesso | caminho feliz | | |
| Erro de validação | Zod `safeParse` falhou | | mostra `fieldErrors`, não grava |
| Sem permissão | outro `clinica_id` / não é autor / RLS barra | | |
| Não encontrado / desatualizado | registro sumiu ou mudou sob você | | |
| Conflito | concorrência (2 dentistas no mesmo dado) | | |

> Marcar N/A é decisão, não esquecimento. "Este dado nunca fica vazio porque X" é uma
> resposta válida — a ausência de resposta não é.

### Caminho principal — o passo a passo que hoje falta

```
gatilho (clique / voz / submit)
  → valida (schema Zod X)
  → {o que a função faz, passo a passo — de onde lê, o que escreve}
  → resultado observável (o que muda na tela)
```

### Exemplos concretos — o que você aprova em 30 segundos, como um mockup

Um por caminho que ramifica. É a versão funcional de "bater o olho no artefato".

| Dado / situação | O sistema faz | Resultado esperado |
|---|---|---|
| {ex: ficha sem procedimento} | {ex: renderiza estado vazio com CTA} | {ex: card "nenhum procedimento", botão Adicionar} |

## 6. Referência visual

> Só se a feature tem UI. Sem UI, escreva "—".

- **Artefato:** `plans/artefatos/R-NN-{slug}.html` — abrir no browser, nunca ler pro contexto
- **Rota alvo:** `/…` · **Componente alvo:** `src/…`
- **Tokens** (o que a implementação segue, em texto):

| Token | Valor |
|---|---|

## 7. Invariantes

Regras que a implementação nunca pode quebrar.

- [ ] {ex: usuário só acessa dados do próprio tenant}

## 8. Gates de aceite

Condições verificáveis que definem "pronto". **Cada estado da §5 vira um gate** — é o que
transforma "está 100%?" numa checagem finita em vez de uma sensação.

- [ ] {ex: POST /api/x com body válido devolve 201 + { id }}
- [ ] {ex: ficha vazia mostra o estado vazio, não erro nem tela branca}
- [ ] {ex: dentista de outra clínica recebe 403, não os dados}

## 9. Fora de escopo

O que esta spec deliberadamente não cobre.

# R-108b — Roteamento da visita: a que ficha o que eu fiz hoje pertence

> **SPEC** · **R-108b** · 🔵 ativo
> **Aberto:** 2026-08-13 · **Fechado:** — · **Fase:** **`aprovada`** (por ele, 13/08)
> **Modelo:** **Opus** — é a única fatia que muda a rota de escrita de um produto com paciente
> real. Não descer pra Sonnet.
> **Depende de:** [R-108](R-108-ficha-tratamento.md) (modelo, `ficha_evolucoes`, nome do
> tratamento) — **tem que estar no ar antes**.
> **Artefato:** [`R-108`](../artefatos/R-108-ficha-tratamento.html) **blocos 7-9** — aprovado
> 13/08, mostra os 3 estados do Meu dia.

---

## 1. Problema

O R-108 dá à ficha a forma de tratamento, mas **quem escreve continua criando ficha nova toda
visita**: `salvarVisitaMeuDia` ([actions.ts:28](../../src/app/dashboard/meu-dia/actions.ts:28))
só passa `fichaId` no caminho R-85 (orçamento antecipado). Sem esta fatia, o R-108 entrega um
documento de tratamento que nunca recebe a segunda visita.

E é aqui que o **D1** do R-108 §1 se fecha: o `on conflict (id) do update set` da RPC
`salvar_eventos_odontograma` ([migration 137](../../supabase/migrations/20260811003000_137_odontograma_momento_planejado.sql):86)
atualiza tudo menos `ficha_id`. Provas em produção (13/08): endodontia 31 concluída 12/08
presa em ficha de **26/07**; implante 48, exodontia 36 e pino 45 concluídos 08/08 presos em
ficha de 01/08.

---

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Concluir pendência nunca pergunta** — o evento volta pra ficha onde foi planejado, com `realizado_em` de hoje. 2 pendências de tratamentos diferentes atualizam os 2 | Seletor governar a sessão inteira | Decisão dele 13/08. Procedimento planejado pertence ao plano onde nasceu; movê-lo quebra o histórico que o R-108 existe pra montar |
| **Só evento que nasce na sessão tem destino escolhível** | Automático decidir também os novos | Ele liberou (*"não precisa ser automática essa divisão"*), mas o seletor **nasce pré-marcado** — caso comum segue zero clique |
| **Seletor só existe com tratamento aberto** | Seletor sempre visível | Observação dele: *"quando já tiver todos os em aberto fechado, não vai precisar do trigger"*. A tela só pergunta quando há ambiguidade real |
| **O seletor é o cabeçalho `Nesta ficha` que já existe** | Faixa nova no Meu dia | `MAPA-MEU-DIA.md` §1: a tela já passa **37px do viewport** antes do dock; a regra é *"cada coisa nova só entra pagando"*. Custo vertical: zero |
| **Texto ditado vai pra ficha da sessão**; ficha nascida de procedimento novo recebe evolução `automatica` | Duplicar o relato nas 2 · fatiar o texto por IA | Duplicar polui prontuário; fatiar é o tipo de coisa que a IA erra e ninguém revisa |

---

## 3. Objetivo

Ao salvar no Meu dia, o que foi feito cai na ficha certa **sem o dentista precisar navegar**.
Concluir pendência não custa gesto nenhum; só o procedimento novo pede uma escolha, e mesmo
essa vem pré-marcada.

---

## 4. Contrato técnico

```typescript
/** Destino dos eventos NOVOS da sessão — o que o seletor controla. `null` = ficha nova.
 *  Pendência não aparece aqui de propósito: ela não tem destino a escolher (§2). */
export type DestinoNovos = { fichaId: string | null };
```

`salvarVisitaMeuDia` passa a **rotear**:

1. Particiona `eventosDraft` em **pendências** (o `id` já existe em `odontograma_eventos`) e
   **novos**. O discriminador já existe no cliente: `idsDeAntes`
   ([meu-dia-client.tsx:235](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx:235)).
2. **Pendências** → agrupa por `ficha_id` atual do evento; um `salvarFicha({fichaId})` por
   ficha alcançada. Sem escolha, sem UI.
3. **Novos** → vão pro `DestinoNovos.fichaId`; `null` = `salvarFicha` sem `fichaId` (cria, com
   nome derivado — R-108 §4.4).
4. **A RPC passa a atualizar `ficha_id` no conflito.** É a linha que fecha o D1 — sem ela, o
   evento novo absorvido num tratamento aberto continuaria ancorando errado.
5. Cada ficha tocada ganha **uma linha em `ficha_evolucoes`** (R-108 §4.1). Texto ditado na
   ficha da sessão; ficha nascida de procedimento novo recebe `automatica: true` —
   *"Restauração 26 indicada em 13/08, durante atendimento de Reabilitação inf. direita"*.

> **O risco desta fatia, e o guard.** Com `ficha_id` no `on conflict`, reeditar uma ficha
> antiga e re-salvar poderia **puxar** evento de outra ficha pro payload. A RPC só aceita
> mover evento cujo `ficha_id` atual pertença ao **mesmo `paciente_id`**, e **nunca** de ficha
> com `assinado_em` não-nulo. Hoje o trigger já barra o segundo caso, mas devolve erro cru do
> Postgres — precisa virar mensagem legível, mesmo padrão de `deletarFicha`
> ([salvar-ficha.ts:498](../../src/server/patients/salvar-ficha.ts:498)).

**Leitura nova:** os tratamentos abertos do paciente (`TratamentoAberto`, R-108 §4.2) entram
no payload do Meu dia. Cabe no `Promise.all` que `get-meu-dia.ts` já faz — nenhuma query solta.

---

## 5. Comportamento

### Estados (artefato, blocos 7-9)

| Estado | Quando | A tela mostra | A escrita faz |
|---|---|---|---|
| **A — só pendências** | nenhum evento novo | cabeçalho `Nesta ficha` puro, **sem seletor**; cada linha mostra `→ {tratamento}` | 1 `salvarFicha({fichaId})` por ficha alcançada + 1 evolução em cada |
| **B — tem novo** | ≥1 evento nasce na sessão | seletor `Nesta ficha · {nome} ▾`, rotulado **"o novo vai para"**; concluídos fora da escolha | pendências pra casa; novos pro destino; evolução ditada na ficha da sessão |
| **C — nada aberto** | paciente sem ficha `aberta` | cabeçalho puro, sem seletor | cria ficha, nome derivado, 1 evolução |
| **Carregando** | busca de abertos em voo | cabeçalho sem seletor — não pisca meio-estado | — |
| **Erro / conflito** | ficha alvo fechou, sumiu ou foi assinada entre load e save | mensagem legível (§4), rascunho intacto | **nada gravado** |
| **Sem permissão** | ficha aberta é de outro dentista | ela **não entra** no seletor | — |

### Caminho principal

```
Registra no Meu dia (dente / lote / rotina / campo mágico)
  → particiona: pendências (id já no banco) × novos
  → tem novo E tem tratamento aberto? → seletor aparece, pré-marcado
                                      → não tem? nenhuma pergunta
  → Salvar
      pendências → UPDATE na ficha de origem + realizado_em + evolução
      novos      → ficha escolhida (ou nova)  + evolução
  → avança pro próximo paciente (inalterado)
```

### Exemplos concretos

| Dado | Resultado esperado |
|---|---|
| Pino 44 ✓ e Restauração 45 ✓ (pendências da Reabilitação) | 1 ficha atualizada, 2 `realizado_em` = hoje, 1 evolução. **Zero ficha criada** |
| As 2 acima + Manutenção orto 23 ✓ (pendência de outro tratamento) | **2 fichas** atualizadas, 1 evolução em cada. Nenhum seletor apareceu |
| As 2 acima + Restauração 26 (nova), seletor em "Reabilitação" | 1 ficha com 3 eventos (2 `realizado`, 1 `indicado`), 1 evolução |
| Idem, seletor em "+ Novo tratamento" | Reabilitação recebe os 2 concluídos + evolução ditada; **ficha nova** com a Restauração 26 + evolução `automatica` |
| Paciente sem nada aberto, Restauração 36 ✓ | 1 ficha nova, nome `Restauração · 36`, status `aberta`, 1 evolução |

---

## 6. Referência visual

Artefato [R-108](../artefatos/R-108-ficha-tratamento.html) **blocos 7, 8 e 9** — aprovado
13/08. Tokens: os mesmos da [R-108 §6](R-108-ficha-tratamento.md#6-referência-visual); **nenhum
token novo**.

**Restrição dura:** o seletor **não é elemento novo** — é o cabeçalho `Nesta ficha`
([meu-dia-client.tsx:581](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx:581))
passando a carregar o nome do tratamento. Qualquer desenho que adicione uma linha ao miolo do
Meu dia está **fora do contrato** (`MAPA-MEU-DIA.md` §1).

---

## 7. Invariantes

- [ ] Concluir pendência **nunca** move o evento de ficha — só `status` e `realizado_em`
- [ ] Nenhuma ficha é criada quando a sessão só conclui pendências
- [ ] Uma visita pode gravar em N fichas; **cada ficha tocada ganha exatamente 1 evolução**
- [ ] Evento nunca sai de ficha com `assinado_em` não-nulo, nem cruza de paciente
- [ ] Evolução `automatica: true` nunca é apresentada como relato do dentista
- [ ] O seletor só lista fichas `aberta` do paciente atual que o dentista pode escrever
- [ ] Nenhuma linha nova no miolo do Meu dia
- [ ] R-85 (ficha criada cedo pelo orçamento) continua funcionando — o `fichaId` explícito
      vence o roteamento

---

## 8. Gates de aceite

- [ ] **G1** — Estado A: 2 pendências do mesmo tratamento → 1 ficha atualizada, **0 criadas** (SQL antes/depois)
- [ ] **G2** — Estado A com 2 tratamentos → **2 fichas** atualizadas, 1 evolução em cada, sem seletor na tela
- [ ] **G3** — Estado B "absorver" → 3 eventos na mesma ficha; `ficha_id` do novo = a escolhida
- [ ] **G4** — Estado B "novo tratamento" → 2 fichas gravadas; os concluídos **permanecem** na origem *(prova a invariante 1 — é o gate que define o item)*
- [ ] **G5** — Estado C → 1 ficha, nome derivado correto nos 4 casos da R-108 §4.4
- [ ] **G6** — regressão do D1: a query de distância (§1) **não devolve linha nova** depois de uma sessão de teste
- [ ] **G7** — ficha assinada como alvo → mensagem legível, rascunho intacto, nada gravado
- [ ] **G8** — **2 contas logadas:** ficha aberta do dentista A não aparece no seletor de B, e a RPC recusa mover evento entre pacientes
- [ ] **G9** — R-85 não regride: "Gerar orçamento" no meio da consulta + Salvar depois continua editando a mesma ficha, sem duplicar evento
- [ ] **G10** — typecheck + lint + `next build` limpos; zero erro de console

---

## 9. Fora de escopo

- Tudo do [R-108](R-108-ficha-tratamento.md) (schema, layout, nome) — pré-requisito, não escopo
- **Quem encerra o tratamento** (`aberta` → `concluida`) — decisão dele, item próprio
- Espelho do seletor na ficha — lá o dentista já está dentro do documento; não há o que rotear
- [R-109](R-109-registro-na-ficha.md) (lote, chips locais, trilho único) — independente

---

> **Spec salva em `plans/specs/R-108b-roteamento-da-visita.md`, fase `contrato`.** Aguardando
> aprovação. Depois de aprovada, qualquer desvio durante o código atualiza a spec **primeiro**.

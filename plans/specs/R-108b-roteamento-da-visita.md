# R-108b — Roteamento da visita: a que ficha o que eu fiz hoje pertence

> **SPEC** · **R-108b** · 🔵 ativo
> **Aberto:** 2026-08-13 · **Fechado:** — · **Fase:** **`aprovada`** (por ele, 13/08)
> **Emenda:** §4 reescrito na sessão #41 (13/08), aprovada por ele antes do código — o desenho
> original apagava evento e sobrescrevia ficha de paciente real.
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
| **`fichas.status` passa a sair do CONTEÚDO**, não da origem: sobrou `indicado` → `aberta`; tudo `realizado` → `concluida`. Vale na criação **e** na edição — é assim que o tratamento fecha sozinho quando a última pendência cai | Continuar derivando de `origem` · gesto explícito de "encerrar tratamento" | Decisão dele 13/08 (sessão #41), depois do dado: **71 de 71** fichas do Meu dia nasciam `concluida`, então nenhum tratamento jamais abria pela entrada principal do produto e o seletor nunca teria o que oferecer. Derivação em vez de gesto novo segue o precedente do `emAndamento` (R-51): nada de 3º estado. Ficha **sem evento** não tem o que derivar e mantém a regra antiga |

---

## 3. Objetivo

Ao salvar no Meu dia, o que foi feito cai na ficha certa **sem o dentista precisar navegar**.
Concluir pendência não custa gesto nenhum; só o procedimento novo pede uma escolha, e mesmo
essa vem pré-marcada.

---

## 4. Contrato técnico

> **Emenda 13/08 (sessão #41), aprovada por ele antes da 1ª linha de código.** O desenho
> original desta seção mandava um `salvarFicha({fichaId})` por ficha alcançada e `ficha_id` no
> `on conflict` da RPC. Os dois destroem dado de paciente real — o porquê está em §4.2 e §4.3,
> que são a correção. O passo "RPC atualiza `ficha_id`" **saiu**.

```typescript
/** Destino dos eventos NOVOS da sessão — o que o seletor controla. `null` = ficha nova.
 *  Pendência não aparece aqui de propósito: ela não tem destino a escolher (§2). */
export type DestinoNovos = { fichaId: string | null };
```

### 4.1 O roteamento

`salvarVisitaMeuDia` passa a **rotear**:

1. Particiona `eventosDraft` em **pendências** e **novos** — e quem decide é o **servidor**,
   não o cliente: `select id, ficha_id from odontograma_eventos where id in (...) and
   clinica_id = ... and paciente_id = ...`. O que voltar é pendência (e o `ficha_id` vem
   junto); o que não voltar é novo. **Essa query é o guard de travessia**: evento de outro
   paciente ou de outra clínica não aparece nela, então não há como roteá-lo. `idsDeAntes`
   ([meu-dia-client.tsx:235](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx:235))
   continua servindo à UI, nunca à escrita — o cliente não carrega `ficha_id` por evento
   (`OdontogramaEventoDraft` não tem o campo, `eventoParaBoca` não o produz).
2. **Pendências** → agrupadas pelo `ficha_id` que veio do banco; um
   `atualizarPendenciasNaFicha()` por ficha alcançada (§4.2). Sem escolha, sem UI.
3. **Novos** → vão pro `DestinoNovos.fichaId` por `salvarFicha`, que é quem sempre criou e
   editou a ficha da sessão; `null` = sem `fichaId` (cria, nome derivado — R-108 §4.4).
4. Cada ficha tocada ganha **uma linha em `ficha_evolucoes`** (R-108 §4.1). Texto ditado na
   ficha da sessão; ficha nascida de procedimento novo recebe `automatica: true` —
   *"Restauração 26 indicada em 13/08, durante atendimento de Reabilitação inf. direita"*.

### 4.2 `atualizarPendenciasNaFicha` — caminho próprio, nunca `salvarFicha`

`salvarFicha` quer dizer *"este documento é assim"*: o ramo de update grava
incondicionalmente `data_atendimento`, `anotacoes`, `queixa_principal`, `conduta`,
`dentes_afetados`, `procedimentos` e `orto_manutencao`
([salvar-ficha.ts:217](../../src/server/patients/salvar-ficha.ts:217)), e ainda chama
`finalizarAtendimentoSeAplicavel`. Usá-lo pra alcançar a ficha de 26/07 a transformaria numa
ficha de hoje, com as anotações daquela consulta **substituídas** pelo texto desta — e
fecharia o agendamento uma vez por ficha alcançada, com uma notificação pra secretária em cada.

Aqui a semântica é a oposta: *"acrescenta isto ao documento"*.

```typescript
// src/server/patients/atualizar-pendencias.ts (novo)
export async function atualizarPendenciasNaFicha(input: {
  fichaId: string;
  pacienteId: string;
  /** só as pendências que já moram nesta ficha — nunca o draft inteiro */
  eventos: OdontogramaEventoDraft[];
  evolucao: { texto: string | null; automatica: boolean };
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

Nesta ordem: valida a ficha (mesma clínica, mesmo paciente, `assinado_em` nulo) → upsert
**não-sincronizante** dos eventos tocados (§4.3) → re-deriva `dentes_afetados` /
`dentes_observacoes` / `procedimentos` a partir do conjunto **completo** de eventos da ficha
(nunca do subconjunto de hoje) com `derivarV2DosEventos` → insere 1 evolução.
**Nunca toca** `anotacoes`, `data_atendimento`, `queixa_principal`, `conduta`,
`orto_manutencao`, agendamento nem notificação.

### 4.3 A RPC ganha `p_sincronizar` — e **não** ganha `ficha_id` no conflito

O `delete ... where ficha_id = p_ficha_id and id not in (payload)`
([137:66](../../supabase/migrations/20260811003000_137_odontograma_momento_planejado.sql:66))
hoje é inofensivo: a ficha alvo é sempre nova e o draft é o conteúdo inteiro dela. Com
roteamento o draft passa a ser **sempre um subconjunto** — `eventosDraft` nasce vazio a cada
paciente ([meu-dia-client.tsx:206](../../src/app/dashboard/meu-dia/_components/meu-dia-client.tsx:206))
e só recebe o que o dentista tocou. Ficha com 11 eventos onde 2 são concluídos hoje perderia
os outros **9**, em silêncio, com cascade pro que aponta pra eles.

Migration: `drop` da versão de 4 argumentos + `create` com `p_sincronizar boolean default
true` — **um corpo só**, nunca uma 2ª função com a lista de colunas duplicada (é exatamente o
bug que a própria 137 documenta ter acontecido com `detalhe`). O `default true` mantém os
chamadores de 4 argumentos byte-idênticos.

| Chamador | `p_sincronizar` | Por quê |
|---|---|---|
| `salvarFicha` (ficha da sessão) | `true` | O draft **é** o conteúdo dela — remover card continua removendo evento (preserva o R-85) |
| `atualizarPendenciasNaFicha` | `false` | O payload é subconjunto; apagar o resto é o defeito |

**`ficha_id` no `on conflict` sai do escopo.** Com o roteamento certo, pendência volta pra casa
(o `ficha_id` dela já está certo) e evento novo é INSERT — nenhum dos dois precisa mudar de
ficha. O único caso que sobrava era trocar o destino depois do orçamento antecipado já ter
gravado, e a invariante 8 (R-85 vence) resolve isso na tela: **com `fichaRascunhoId`, o
seletor não aparece** — a ficha já está decidida. Cortar isto elimina a única ancoragem
retroativa do item, e junto o guard que ela exigiria.

**Leitura nova:** os tratamentos abertos do paciente (`TratamentoAberto`, R-108 §4.2) entram
no payload do Meu dia. Cabe no `Promise.all` que `get-meu-dia.ts` já faz — nenhuma query solta.

---

## 5. Comportamento

### Estados (artefato, blocos 7-9)

| Estado | Quando | A tela mostra | A escrita faz |
|---|---|---|---|
| **A — só pendências** | nenhum evento novo | cabeçalho `Nesta ficha` puro, **sem seletor**; cada linha mostra `→ {tratamento}` | 1 `atualizarPendenciasNaFicha()` (§4.2) por ficha alcançada + 1 evolução em cada. **Nenhum campo próprio dessas fichas é tocado** |
| **B — tem novo** | ≥1 evento nasce na sessão **e** há tratamento aberto | lista de opções dentro do card `Nesta ficha` (§6), rotulada **"O novo (X) vai para"**, 1ª opção pré-marcada; concluídos fora da escolha | pendências pra casa; novos pro destino; evolução ditada na ficha da sessão |
| **C — nada aberto** | paciente sem ficha `aberta` | cabeçalho puro, sem seletor | cria ficha, nome derivado, 1 evolução |
| **R-85 em curso** | "Gerar orçamento" já criou a ficha da sessão (`fichaRascunhoId`) | cabeçalho puro, **sem seletor** — o destino já foi decidido | novos vão pra ficha do rascunho (R-85 vence, invariante 8); pendências pra casa, como sempre |
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

Artefato [R-108](../artefatos/R-108-ficha-tratamento.html) **blocos 7, 8 e 9** — cabeçalho
canônico do arquivo: *"✅ APROVADO por ele em 13/08 (v4) — É O CONTRATO VISUAL"*. **Nenhum token
novo** além dos da [R-108 §6](R-108-ficha-tratamento.md#6-referência-visual).

**Correção 13/08 (sessão #41), lendo o artefato pelo procedimento do `artefato-visual`:** o
seletor **não** é um `Nesta ficha · {nome} ▾` no cabeçalho, como o §5 desta spec dizia antes de
ninguém ter aberto o artefato. O que o bloco 8 mostra é uma **lista de opções dentro do card
`Nesta ficha`**, abaixo das linhas. O artefato é o contrato visual; era o texto da spec que
estava errado. O cabeçalho `Nesta ficha` continua **exatamente como está** — não ganha nome nem
seta.

**Geometria — extraída por JS do artefato servido, nunca medida no olho** (o par light/dark sai
dos tokens de `globals.css`, não dos hexes abaixo):

| Elemento | Contrato |
|---|---|
| Caixa do seletor (`.drop`) | `margin-top 9px` · `padding 7px` · borda `0.8px` `--teal` · raio `10px` |
| Rótulo ("O novo (X) vai para") | `10px` / peso 800 / `letter-spacing 1.6px` / caixa alta / `--color-text-secondary` · `padding 3px 9px 6px` |
| Opção | flex, `gap 9px` · `padding 7px 9px` · raio `7px` · `12px` · contador em `--font-mono` |
| Opção **ativa** | fundo `--teal-pale` · texto `--teal-ink` · peso 700 (o artefato usa `#1e7060` no light e `#5dbeb0` no dark — é o par que `teal-ink` já resolve sozinho) |
| Opção inativa | texto `--foreground` |
| `+ Novo tratamento` | `border-top 0.8px` `--border` · `margin-top 4px` · `padding 10px 9px 7px` · texto `--color-text-secondary` |
| Rótulo da pendência (bloco 7) | `→ {nome do tratamento}` · `--font-mono` `11.5px` · `--color-text-secondary` · `margin-top 2px` |

**Restrição dura, que continua valendo:** nenhuma **faixa** nova no miolo do Meu dia
(`MAPA-MEU-DIA.md` §1 — a tela já passa 37px do viewport). O seletor não é faixa: vive **dentro**
do card `Nesta ficha` que já existe e **só existe no estado B** — nos estados A e C a tela fica
com a altura de hoje, byte por byte.

**Desvio consciente do artefato, trazido como achado (não improvisado):** no artefato o
`→ {tratamento}` é um `<small>` dentro da linha; na tela real a linha é o `RegistroCard`
(componente compartilhado com a ficha). Foi portado pro rótulo que já existe logo abaixo do card
— o mesmo slot onde hoje se lê *"de consulta anterior"*, com a tipografia do artefato. Mesma
informação, mesma posição relativa, sem forkar componente compartilhado.

---

## 7. Invariantes

- [ ] Concluir pendência **nunca** move o evento de ficha — só `status` e `realizado_em`
- [ ] Nenhuma ficha é criada quando a sessão só conclui pendências
- [ ] Uma visita pode gravar em N fichas; **cada ficha tocada ganha exatamente 1 evolução**
- [ ] Evento nunca sai de ficha com `assinado_em` não-nulo, nem cruza de paciente
- [ ] **Ficha alcançada nunca perde evento que não estava no payload** — upsert com
      `p_sincronizar: false` (§4.3)
- [ ] **Ficha alcançada não tem nenhum campo próprio sobrescrito** — `anotacoes`,
      `data_atendimento`, `queixa_principal`, `conduta` e `orto_manutencao` saem intactos (§4.2)
- [ ] O agendamento fecha **uma vez só** e a secretária recebe **uma** notificação, não importa
      quantas fichas a visita alcance
- [ ] Evolução `automatica: true` nunca é apresentada como relato do dentista
- [ ] O seletor só lista fichas `aberta` do paciente atual que o dentista pode escrever
- [ ] Nenhuma linha nova no miolo do Meu dia
- [ ] R-85 (ficha criada cedo pelo orçamento) continua funcionando — o `fichaId` explícito
      vence o roteamento

---

## 8. Gates de aceite

> **Rodada ponta a ponta em 13/08**, no Meu dia da **Teste01** (paciente `teste`), autorizada por
> ele. Dois saves reais: (1) 2 procedimentos novos → "+ Novo tratamento"; (2) as 2 pendências
> resultantes concluídas + 1 procedimento novo → "+ Novo tratamento". Resultado por gate abaixo.

- [~] **G1** — **não isolado.** Toda rodada teve pelo menos um procedimento novo, então uma
      ficha sempre nasceu legitimamente. O caso puro — visita que **só** conclui pendência e
      cria **0 fichas** — segue sem prova
- [~] **G2** — **metade.** A tela sem seletor no Estado A foi confirmada (2 pendências no
      rascunho, nenhum seletor). A escrita alcançando 2 tratamentos distintos, não
- [ ] **G3** — Estado B "absorver" → **não testado**: nas duas rodadas escolhi "+ Novo
      tratamento". O caminho aditivo é o mesmo do G4, mas o destino escolhido não foi exercido
- [x] **G4** — ✅ **provado 2x.** Rodada 2: `a002c07e` ficou com os 2 concluídos (2 eventos,
      `realizado_em` = hoje) e a Extração nova foi pra ficha nova `2ba069ce`. Nenhum evento
      migrou de ficha. *É o gate que define o item*
- [~] **G5** — **parcial.** Nome derivado correto em 4 casos reais na tela: `Reabilitação ·
      inferior direito` (2 tipos, 1 dente), `Reabilitação · superior`, `Canal · 31`,
      `Extração · 46`. Os 4 casos tabelados da R-108 §4.4 não foram varridos um a um
- [x] **G6** — ✅ **nenhuma ficha fantasma.** As 3 fichas criadas na rodada têm evento; a única
      vazia do dia (`7621dc2f`, 06:08) é anterior ao teste — é a órfã já documentada no R-108 §1
- [ ] **G7** — ficha assinada como alvo → **não testado**
- [ ] **G8** — **2 contas logadas** → represado, mesma fila do G3 do R-103b/c
- [ ] **G9** — R-85 não regride → **não testado**
- [x] **G10** — ✅ typecheck + lint + `next build` limpos; zero erro de console na rodada
- [x] **G11** — ✅ **não-destruição** (emenda §4.3), pelos dois lados. *É o gate que prova a emenda.*
      **RPC**, por SQL em transação com `rollback` (ficha real de 12 eventos, payload de 2, nada
      persistido): `p_sincronizar = false` → **12 continuam**; `true` → **restam 2**, os outros
      10 apagados — exatamente o que a spec original mandava fazer.
      **Tela**: `a002c07e` recebeu 2 pendências concluídas e continuou com **2 eventos**,
      `data_atendimento`/`queixa_principal`/`anotacoes` intactos
- [x] **G12** — ✅ notificações `consulta_finalizada` do dia: 2 → 4 em **dois** saves, ou seja
      **uma por visita**, mesmo na visita que alcançou 2 fichas
- [x] **G13** — ✅ `status` derivado: a ficha `a002c07e` nasceu **`aberta`** com 2 procedimentos
      indicados (antes, 71/71 nasciam `concluida`) e virou **`concluida`** sozinha quando a
      última pendência dela caiu. `2ba069ce` repetiu o ciclo inteiro

### Defeito achado pela rodada, e corrigido

Evolução de ficha alcançada saiu com **`automatica: false` carregando texto do sistema** — resumo
da máquina gravado como se fosse relato de quem assina o prontuário. Causa: a dedupe por (ficha,
dentista, dia) resolvia a flag com `existente.automatica && ctx.automatica`, e uma evolução
anterior vazia contaminava a seguinte. Regra nova: **quem decide a flag é o texto que fica**, e
relato ditado nunca é sobrescrito por resumo automático. Reprovado na tela depois do fix.

---

## 9. Fora de escopo

- Tudo do [R-108](R-108-ficha-tratamento.md) (schema, layout, nome) — pré-requisito, não escopo
- ~~**Quem encerra o tratamento**~~ — **entrou no escopo em 13/08** (§2, última linha). Estava
  parado como "decisão dele, item próprio" nas duas specs até aparecer que nada **abria** um
  tratamento: 71/71 fichas do Meu dia nasciam `concluida`. Sem essa decisão o item entregaria
  um seletor que nunca teria o que oferecer
- Espelho do seletor na ficha — lá o dentista já está dentro do documento; não há o que rotear
- [R-109](R-109-registro-na-ficha.md) (lote, chips locais, trilho único) — independente

---

> **Spec salva em `plans/specs/R-108b-roteamento-da-visita.md`, fase `contrato`.** Aguardando
> aprovação. Depois de aprovada, qualquer desvio durante o código atualiza a spec **primeiro**.

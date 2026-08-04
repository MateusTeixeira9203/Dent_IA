# R-51 e R-52 — Modelo multi-sessão

> **SPEC** · **R-51 ✅ · R-52 ✅** · ~~R-53~~ → [spec própria](R-53-orcamento-indicados-abertos.md)
> · ~~R-54~~ ✂️ **cortado por ele em 03/08 — ver §4.4**
> **Aberto:** 2026-08-03 · **Fase:** **`aprovada`** · **Codadas e verificadas ao vivo em 04/08**
> **Modelo:** Sonnet 5 (mecânico — algoritmo e queries já mapeados na investigação do §9)
> **Zero migration nas 2 fatias.**
>
> ⚠️ **R-53 saiu deste documento em 04/08.** Dois motivos: (a) o doc passou de 338 linhas com
> as 3 fatias juntas, acima do teto de 300 do `CLAUDE.md`; (b) a resolução do X1 (§4.3) tinha
> ficado **contraditória** com as invariantes e gates do próprio R-53, que ainda mandavam
> excluir evento encaminhado da query. A versão correta e unificada está em
> **[R-53-orcamento-indicados-abertos.md](R-53-orcamento-indicados-abertos.md)** — é ela que
> vale. As seções de R-53 abaixo (§4.3, invariantes R-53, gates G7-G9) ficam só como histórico
> e **não devem ser codadas**.
>
> **Estado da execução (04/08):** R-51 codado (typecheck/lint/build limpos, lógica provada com
> dado sintético; tela não exercitada em cenário multi-sessão real). R-52 completo e **testado
> ao vivo**: modo seleção, `EncaminharBar`, escrita confirmada no banco (`encaminhado_para`
> setado, `dentista_id` preservado) e o item sumindo da lista de quem encaminhou.

## 0. O modelo clínico que governa estas 3 fatias

Descrito por ele em 03/08, e é a premissa que fecha várias perguntas de uma vez:

> *"Iniciei um atendimento, abri o Meu dia, fui no paciente, fiz todos os a-fazeres. Os
> procedimentos de hoje viram uma ficha nova."*

**Ficha = um atendimento, sempre nova.** Nunca se acrescenta a uma ficha existente. Cada
sessão de trabalho produz seu próprio documento com data/CRO/assinatura — é o que o CFO exige
e é o que mata o R-54 (§4.4).

**Encaminhar não move ficha nem cria ficha adiantada.** Encaminhar tira o procedimento da
minha lista e o entrega ao Dr. Y. A ficha do Dr. Y nasce **quando ele atender o paciente**,
como qualquer atendimento dele — não no instante do encaminhamento. Decisão dele, 03/08:
criar a ficha no encaminhamento registraria uma visita que não aconteceu.

## 1. Problema

**R-51.** "Em andamento" (canal, implante — trabalho que atravessa mais de uma sessão) não é
um 3º status: seria silencioso em 23 arquivos sem `exhaustive check` sobre `StatusRegistro`.
Mas sem tratamento nenhum, o modelo por `grupo_id` quebra a leitura de pendência: uma sessão
nova (evento `realizado`, mesmo `grupo_id`, id novo) vence o reduce de "vencedor por âncora"
e esconde o `indicado` original — o tratamento passa a parecer fechado, some de "A fazer",
sai do orçamento e nunca reaparece pra fechar de verdade.

**R-52.** "A fazer" já mostra pendência de **qualquer** dentista da clínica (núcleo clínico
compartilhado), mas o botão "fazer hoje →" está disponível pra todo item, sem checar autoria.
Numa pendência de colega, isso **falha em silêncio** (RLS barra o update, sem erro — o
dentista acha que resolveu e não resolveu). Falta também o caminho de encaminhar pro
especialista sem sair do bloco (painel foi rejeitado no design-shotgun 24/07).

> **Recorte decidido por ele (03/08), depois da 1ª versão desta spec:** o bloco "A fazer" é
> **estritamente a minha lista de trabalho**. Pendência de colega não aparece; pendência que
> **eu encaminhei** sai da minha lista; pendência **encaminhada pra mim** **aparece**, com
> "concluir →" via RPC 109 — *"é trabalho meu pra fazer"*. ⚠️ **Corrigido em 03/08 (noite):**
> esta linha dizia o contrário ("também não aparece aqui"), premissa que ele já tinha revogado
> — ver §2 e a emenda da tabela de casos. **"Assumir"
> (concluir pendência de colega) foi rejeitado** — *"loucura isso aí"* — e o motivo técnico
> confirma: a RPC só viraria o `status`, o `dentista_id` continuaria o do colega, e o
> prontuário passaria a atribuir a execução a quem não executou.

**R-53.** O orçamento hoje nasce de **uma ficha escolhida** (se houver mais de uma, o
dentista tem que escolher qual) — nunca do que está de fato em aberto no paciente. Um plano
indicado há 2 semanas, numa ficha antiga, não entra no orçamento de hoje a menos que o
dentista lembre de escolher aquela ficha especificamente.

**~~R-54~~** ✂️ **cortado** — ver §4.4. Era "2ª gravação no mesmo dia cria ficha solta, sem
juntar"; o modelo do §0 diz que **não juntar é o certo**.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| R-51: partir o reduce de pendência em 2 (sem `grupo_id` = como já é; com `grupo_id` = todo `indicado` é pendência direta) | Enriquecer `chaveAncora` com `grupo_id` | Não resolve — sessão 2 e o `indicado` original teriam a MESMA chave+grupo_id, o vencedor ainda esconderia um dos dois |
| R-51: `emAndamento` como campo derivado no retorno do servidor, nunca persistido | Status novo no banco | Decisão já fechada em 03/08 (memória do projeto) — mantida, não reaberta |
| R-52: `encaminharProcedimento` passa a aceitar sucesso **parcial** (filtra elegíveis, ignora o resto, informa quantos) | Manter tudo-ou-nada e só melhorar a mensagem de erro | Tudo-ou-nada trava o "selecionar tudo" do `EncaminharBar` sempre que 1 item do lote está numa ficha assinada — parcial é o comportamento que o usuário espera de um lote |
| R-52: reusar `EncaminharBar` + `atualizarStatusEncaminhado`/RPC `concluir_evento_encaminhado` existentes | Construir mecanismo novo | Ambos já testados (R-04) e sem gap de contrato — o gap era só falta de dado no `MeuDiaPendencia` |
| R-53: `abrirNovoOrcamento` e `abrirOrcamentoParaFicha` convergem pro mesmo agregado (todos os indicados abertos do paciente), removendo a etapa "selecionar ficha" no caso comum | Manter 2 fluxos separados (1 por ficha, 1 agregado) | Não há razão de produto pra 2 comportamentos diferentes pro mesmo botão "Novo orçamento"; a etapa "selecionar" só volta como fallback quando não há nenhum indicado (texto livre) |
| **R-54 ✂️ cortado** — nem acrescentar, nem bloquear, nem migration | ~~`fichas.agendamento_id` + append~~ · ~~+ block~~ | O modelo do §0 resolve por cima: **cada sessão vira ficha nova, sempre**. "Sem juntar" era o comportamento certo o tempo todo — o item nasceu de uma leitura errada do modelo, não de um defeito |
| R-52: encaminhar continua sendo marca no evento (`encaminhado_para`, R-04) — não move nem cria ficha | Criar a ficha do destinatário no ato do encaminhamento | Decisão dele 03/08: ficha adiantada registraria atendimento que não houve. A ficha do Dr. Y nasce quando ele atender |

## 3. Objetivo e como funciona

**R-51 — objetivo:** um tratamento multi-sessão nunca fecha sozinho enquanto tiver
`indicado` aberto, mesmo depois de uma sessão intermediária ser registrada como `realizado`.
Do ponto de vista de quem usa: a pendência de "Canal" continua em "A fazer" depois da 1ª
sessão, agora com um sinal (`emAndamento`) que a UI pode usar pra rotular diferente de "nunca
começou".

**R-52 — objetivo:** dentro de "A fazer", cada pendência mostra a ação certa pro que ela é —
minha (fazer hoje / encaminhar), encaminhada a mim (concluir), de colega sem ser minha
(informativa, sem botão que finge funcionar). Modo seleção + `EncaminharBar` (já existente)
liga por um toggle no bloco, sem painel novo.

**R-53 — objetivo:** clicar "Novo orçamento" no perfil do paciente monta os itens a partir de
**tudo** que está `indicado` e em aberto pro paciente — não só o que foi registrado hoje, nem
só de uma ficha escolhida. Sem indicado nenhum, cai no fallback de texto de hoje (como já é).

**~~R-54~~** — sem objetivo: cortado (§4.4).

## 4. Contrato técnico

### 4.1 R-51 — `src/server/dashboard/get-meu-dia.ts`

```typescript
export interface MeuDiaPendencia {
  // …campos existentes (id, tipo, dente, arcada, quadrante, registradoEm, dentistaNome,
  // nivel, origem, faces, grupoId, papelNoGrupo, observacao) — inalterados…
  /** R-51 — true quando `grupoId` tem ≥1 evento irmão `realizado` (mesmo grupo_id, outra
   *  linha). Derivado a cada leitura, nunca persistido — não é 3º status. */
  emAndamento: boolean;
}
```

| Onde | Muda para |
|---|---|
| `EventoRow` (`:179-203`) | select ganha `dentista_id` bruto (hoje só vem o nome via join) — necessário pro R-52 também |
| `:350-354` (`vencedorPorAncora`) | **passa a pular eventos com `grupo_id != null`** (`if (e.grupo_id != null) continue`). Pra `grupo_id == null`, byte-idêntico ao que já é |
| novo, depois do loop acima | 2ª passagem sobre `eventosRaw`: monta `Set<string>` de `` `${paciente_id}::${grupo_id}` `` com ≥1 evento `realizado` |
| `:356-375` (push em `pendenciasPorPaciente`) | além dos vencedores sem grupo (como já é), itera `eventosRaw` filtrando `grupo_id != null && status === 'indicado'` e empurra cada um direto — sem passar pelo reduce de vencedor. `emAndamento` = está no Set acima |

**Emenda ao R-55 (spec R-55 §1/§8):** a trava "chaveAncora/reduce ficam intocados, servem só
à pendência" segue valendo **só pros eventos sem `grupo_id`**. R-51 introduz um eixo novo
(grupo vs. sem grupo) ortogonal ao que R-55 já separou (pendência vs. histórico) — não é
contradição, é uma 3ª divisão sobre a mesma função. Ambas as specs precisam de uma linha
apontando pra essa fronteira antes deste item entrar em execução (mesmo padrão que R-55 usou
com `R-46-cockpit.md`).

**Zero query nova, zero migration.** `grupo_id` já está no select (`:302`).

### 4.2 R-52 — `MeuDiaPendencia`, `get-meu-dia.ts`, `a-fazer-bloco.tsx`, `encaminharProcedimento`

```typescript
export interface MeuDiaPendencia {
  // …+ emAndamento (§4.1)…
  /** R-52 — autor real (núcleo clínico: pode não ser o dentista logado). */
  dentistaId: string;
  /** R-52 — null = não encaminhado. */
  encaminhadoParaId: string | null;
  encaminhadoParaNome: string | null;
}

export interface MeuDiaData {
  // …slots, contextoPorPaciente, catalogoProcedimentos…
  /** R-52 — NOVA query (1, leve): dentistas elegíveis pra receber encaminhamento — mesmo
   *  filtro de FichasTab.tsx:1000-1008 (ativo, não-secretária, exceto o próprio). */
  destinosEncaminhar: { id: string; nome: string }[];
}
```

| Onde | Muda para |
|---|---|
| select de `odontograma_eventos` (`:302`) | ganha `encaminhado_para, encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey(nome)` — 2ª FK desambiguada, mesmo padrão já usado em `FichasTab.tsx:943` |
| push em `pendenciasPorPaciente` | `dentistaId: e.dentista_id`, `encaminhadoParaId: e.encaminhado_para`, `encaminhadoParaNome: e.encaminhado_dentista?.nome ?? null` |
| `Promise.all` do início (`:257-318`) | ganha a query de `destinosEncaminhar` (dentistas ativos da clínica, não-secretária, `neq('id', dentistaId)`) |
| `page.tsx:28-30` | repassa `dentistaId` (já existe: `dentista.id`) e `destinosEncaminhar` pro `MeuDiaClient` |

**`a-fazer-bloco.tsx` — 1 caso só** (decisão dele, 03/08). O bloco filtra pra
`p.dentistaId === meuDentistaId && p.encaminhadoParaId == null`:

| Caso | Aparece? | Ação |
|---|---|---|
| Minha, não encaminhada | **sim** | "fazer hoje →" (como já é) + toggle de seleção pra encaminhar |
| Minha, **eu encaminhei** pra alguém | **não** | saiu da minha mesa |
| **Encaminhada pra mim** | **sim** | **"concluir →"** — ver ⚠️ abaixo |
| De colega, não encaminhada | **não** | — |

⚠️ **Emenda de 03/08 (ele decidiu depois da 1ª versão desta seção).** A versão anterior dizia
que "encaminhada pra mim" **não** apareceria no cockpit e resolveria só na ficha. Ele reviu:
*"é trabalho meu pra fazer"* — pertence à lista do dia. A tabela acima já reflete a decisão
nova; a antiga fica registrada aqui pra não ser reintroduzida por engano.

**Consequência técnica, e ela não é opcional:** a pendência recebida tem **caminho de escrita
próprio**. `pendenciaParaDraft` preserva o `id` original de propósito (nunca deixar pendência
fantasma), e o evento pertence a outro autor — o upsert do rascunho bate na RLS
`odontograma_eventos_write_own`, afeta 0 linhas, e **0 linhas não é erro no Postgres**. Seria
o silent-fail de novo, por outra porta. Por isso o botão chama a **RPC 109**
(`concluir_evento_encaminhado`), que valida clínica + `encaminhado_para = eu` + ficha não
assinada, e só toca `status`/`realizado_em`.

**Inconsistência aceita conscientemente:** dois botões vizinhos com comportamentos diferentes
— "fazer hoje →" adia (entra no rascunho, grava no Salvar) e "concluir →" **commita na hora**.
O rótulo diferente existe pra não prometer o mesmo gesto duas vezes. Se incomodar no
dogfooding, a alternativa é fazer o Salvar dividir o lote em duas escritas — mais código e
mais modos de falha.

⚠️ **Mudança visível de comportamento — MEDIDA no banco em 03/08, antes de codar a UI:**

| Dentista | Indicados que vê hoje | Vira a lista dele | Pacientes que ficam **vazios** |
|---|---|---|---|
| Mateus | 112 | 28 | **17 de 19** |
| Renato | 112 | 18 | **17 de 19** |
| Armando | 112 | 7 | **14 de 19** |
| Jenaina | 112 | 39 | **12 de 19** |

Ou seja: em ~89% dos pacientes o bloco passa a dizer *"Nada pendente pra este paciente"* onde
hoje há lista. **`encaminhado_para` é `null` em 100% dos eventos** — o caminho de
encaminhamento nunca foi usado em odontograma, então nada some por esse motivo hoje.

**Ele confirmou o filtro COM esse número na mão (03/08).** A alternativa oferecida e recusada
foi "minhas com botão, das outras só a linha informativa". O trade-off aceito conscientemente:
o dentista deixa de saber, na cadeira, que o paciente deve trabalho a outro dentista — esse
panorama passa a viver só na ficha. Coerente com a hierarquia 3.1 (*clínico é da clínica,
trabalho é do autor*), e com "A fazer é lista de trabalho, não panorama".

⚠️ **Consequência pro dogfooding:** a queda é grande o bastante pra parecer perda de dado.
Nada foi apagado — é filtro de exibição. Se causar estranheza, o caminho de volta é 1 condição.

**O silent-fail morre por construção:** sem item de colega na lista, não há botão que finge
funcionar. Nenhuma RPC nova, nenhuma policy nova.

Modo seleção: toggle no cabeçalho do bloco liga checkbox por linha + renderiza
`EncaminharBar` (componente existente, zero mudança) com `destinosDisponiveis =
destinosEncaminhar`. Confirmar chama `encaminharProcedimento` com os ids selecionados.

```typescript
// src/app/consulta/[agendamentoId]/actions.ts — encaminharProcedimento
export type EncaminharResult =
  | { ok: true; encaminhados: string[]; ignorados: string[] }
  | { ok: false; error: string };
```

| Onde | Muda para |
|---|---|
| `:301-313` | filtra ids elegíveis (dono = eu, `status='indicado'`) em vez de exigir bater 100% — os que não batem viram `ignorados`, não abortam o lote |
| `:315-324` | mesma coisa pra ficha assinada — remove de `idsEncaminhaveis`, não aborta |
| se `idsEncaminhaveis.length === 0` | `{ ok: false, error: 'Nenhum registro elegível pra encaminhar.' }` |
| update final | só nos `idsEncaminhaveis`; retorno vira `{ ok: true, encaminhados, ignorados }` |

**RLS: nenhuma policy muda.** `odontograma_eventos_write_own` (migration 101/104) já cobre
exatamente esse caminho — o bug era 100% de validação em JS antes do update, nunca de RLS.

### 4.3 R-53 — 📦 movido pra spec própria (04/08)

Contrato completo e corrigido em **[R-53-orcamento-indicados-abertos.md](R-53-orcamento-indicados-abertos.md)**.
O contrato que existia aqui excluía evento encaminhado da query e foi **revogado** pela
resolução do X1 (excluir = a clínica perde receita em silêncio). Não foi mantido em cópia
justamente pra não divergir.

**O que sobrou aqui e vale pro R-52:** a decisão do X1 obriga "A fazer" e orçamento a nunca
calcularem responsável por conta própria — os dois chamam
[`filtro-responsavel.ts`](../../src/lib/fichas/filtro-responsavel.ts)
(`responsável = encaminhado_para ?? autor`), com configurações diferentes: "A fazer" fixo em
`FILTRO_MEUS` (lista de trabalho), orçamento em `null`/Todos com chips (visão de dinheiro).
✅ O `a-fazer-bloco.tsx` foi corrigido em 04/08 pra chamar a lib — antes reimplementava
`FILTRO_MEUS` inline.

### 4.4 ~~R-54~~ — ✂️ CORTADO (03/08)

**Nada a implementar. Sem migration, sem coluna `agendamento_id`, sem trava.**

O item nasceu de uma leitura errada do modelo, não de um defeito. Ele foi aberto como *"2ª
gravação no mesmo dia cria ficha solta, sem juntar"* — mas o modelo do §0, confirmado por ele
em 03/08, diz que **não juntar é exatamente o certo**: cada sessão de trabalho vira ficha
nova, sempre, porque ficha é o documento de um atendimento (CFO: evolução com data/CRO/
assinatura por visita). Duas gravações no mesmo dia não são "a mesma ficha duas vezes" — são
dois registros, e é assim que o prontuário deve mostrar.

**O que fica registrado do trabalho de investigação** (vale se o assunto voltar): `fichas`
nunca teve vínculo com `agendamentos`, e o proxy `agendamentos.status='completed'` **não
serve** — é setável na mão pelo dropdown "Outro status" da Agenda (`agendamentos-client.tsx:1979`),
sem ficha nenhuma envolvida. Ou seja: se um dia alguém precisar mesmo perguntar "já existe
ficha desta consulta?", vai precisar da coluna — não dá pra deduzir do que existe hoje.

## 5. Referência visual

**R-51 e R-53:** sem UI nova — mudança de dado/comportamento em componentes existentes.
**R-52:** sem artefato novo — reusa tokens e componente já aprovados (`EncaminharBar`, padrão
em produção desde 26/07). Único elemento novo é o toggle de modo-seleção no cabeçalho de
`a-fazer-bloco.tsx` — usa os mesmos tokens do `BlocoMoldavel` (`bg-surface`, `border-border`,
`text-teal-ink` para o estado ativo), sem token novo.

## 6. Invariantes

- [ ] **R-51** — pendência sem `grupo_id` nunca muda de comportamento (reduce byte-idêntico).
- [ ] **R-51** — `emAndamento` é sempre derivado da leitura corrente; nenhum valor é gravado no banco.
- [ ] **R-52** — só o autor (`dentista_id = get_my_dentista_id()`) grava `encaminhado_para`; nenhuma policy nova, nenhum bypass de RLS.
- [ ] **R-52** — o bloco "A fazer" renderiza **apenas** (minha ∧ não encaminhada) ∨ (encaminhada pra mim). Pendência de colega não-encaminhada nunca aparece — o silent-fail morre por ausência do item, não por desabilitar botão.
- [ ] **R-52** — pendência recebida **nunca** passa pelo rascunho/upsert: só pela RPC 109. Nenhuma escrita do cockpit toca linha de outro autor pela RLS direta.
- [ ] **R-52** — encaminhar nunca transfere autoria — `dentista_id` do evento não muda (herda R-04).
- [ ] ~~**R-53**~~ — 📦 invariantes movidas. ⚠️ A antiga *"evento com `assinatura_id` **ou
      `encaminhado_para`** não-nulo nunca entra no orçamento"* está **revogada** — só
      `assinatura_id` exclui. Ver [R-53 §6](R-53-orcamento-indicados-abertos.md).
- [ ] **§0** — nenhuma das 3 fatias faz `UPDATE` numa ficha existente pra "juntar" registro: sessão nova = ficha nova, sempre.

## 7. Gates de aceite

**R-51 — prova no banco:**
- [ ] G1 — evento A (`indicado`, `grupo_id=G`, ficha 1) + evento B (`realizado`, `grupo_id=G`,
      ficha 2, mesma âncora): `select * from odontograma_eventos where id = 'A'` mostra
      `status='indicado'` intacto, e A aparece em `pendencias` com `emAndamento: true`.
- [ ] G2 — evento sem `grupo_id`: comportamento idêntico ao pré-R-51 (query de regressão —
      mesmo `count(*)` de pendências por paciente antes/depois).

**R-52 — prova no banco + 2 contas logadas (regra do projeto p/ qualquer mudança que toca
fronteira de autoria/RLS):**
- [ ] G3 — conta A encaminha um evento seu pra conta B: `select encaminhado_para from
      odontograma_eventos where id = X` mostra o id de B; `dentista_id` continua o de A.
- [ ] G4 — depois de encaminhar, o item **some** do "A fazer" de A (não fica lá cinza).
- [ ] G5 — logado como B: o item encaminhado **APARECE** no "A fazer" de B, com o botão
      **"concluir →"** (não "fazer hoje →"), e concluir grava de verdade (conferir no banco:
      `status` vira `realizado`, `dentista_id` **continua o de A**). Pendência de A **não
      encaminhada** não aparece. ⚠️ **Gate corrigido em 03/08 (noite):** dizia que o item
      encaminhado não deveria aparecer — reprovaria a implementação correta.
- [ ] G6 — lote de 3 ids, 1 de ficha assinada: retorno é `{ ok: true, encaminhados: [2 ids],
      ignorados: [1 id] }`, e só os 2 mudam no banco.
- [ ] G6b — regressão da ficha: o caminho "encaminhado pra mim → concluir" continua funcionando
      em `FichasTab` (RPC 109), intocado por esta fatia.

**~~R-53~~ — 📦 gates movidos.** Os antigos G7/G8 diziam que evento encaminhado **não** entra
no orçamento — **revogado pelo X1** (excluir = perder receita em silêncio). Gates válidos em
[R-53-orcamento-indicados-abertos.md §7](R-53-orcamento-indicados-abertos.md).

**~~R-54~~** — sem gates: cortado (§4.4).

## 8. Fora de escopo

- R-46h (botão único salvar+orçamento no cockpit) — não é pré-requisito, mas se beneficia do
  R-53 quando entrar (a query agregada já existe pronta).
- C6 (layout novo do cockpit, "Já feito" sai) — não mexe na rotulagem de `emAndamento`.
- R-49 (voz/campos de especialidade) — sem relação com estes 4.
- Painel lateral pra encaminhar — rejeitado no design-shotgun 24/07, não reaberto aqui.
- Duplicata de pendência quando o dentista cria um 2º `indicado` no mesmo grupo/âncora (fluxo
  incomum de "continuar" um grupo já indicado) — comportamento pré-existente, não piora nem
  melhora com R-51; não tratado.
- Notificação/UX de "orçamento mudou de fonte" no R-53 — troca é silenciosa, sem aviso ao paciente.
- Vínculo `fichas` ↔ `agendamentos` — cortado junto com o R-54 (§4.4).
- **Fantasma de `indicado` fechado em ficha nova** — quando o dentista resolve numa sessão
  seguinte, o `indicado` original pode continuar vivo no banco enquanto some da tela pelo
  reduce. Pro R-53 isso está coberto (a query exclui `encaminhado_para` e o dedup de âncora
  resolve o resto), mas **vale medir por query durante a execução do R-51** — se sobrar linha
  `indicado` órfã, vira item novo, não se resolve aqui.

## 9. Achados da investigação que sustentam o contrato

**R-51 — o mecanismo do "fecha a pendência cedo", confirmado no código.** `chaveAncora`
(`get-meu-dia.ts:208-213`) não inclui `grupo_id`; `vencedorPorAncora` (`:350-354`) escolhe 1
vencedor por âncora pelo mais recente. O caminho de escrita **já cria** uma 2ª linha com o
mesmo `grupo_id`: `ToothDetailPanel.tsx:310` (`gruposAbertos.find`) + `:847-855` (diálogo
"Continuar o trabalho aberto?") → `criarDenteTipo(tipo, modos, grupoId)` (`:289-301`). Como o
upsert da RPC (`salvar_eventos_odontograma`, migration 111) é escopado por `ficha_id`, a
sessão 2 grava a linha nova sem tocar a `indicado` da ficha 1 — e o vencedor esconde a original.

**R-52 — o silent-fail, reproduzido.** "fazer hoje →" numa pendência de colega: o upsert reusa
o `id` original (dono = colega), a RLS bloqueia no `ON CONFLICT DO UPDATE`, **0 linhas
afetadas não é erro em RLS**, o servidor não lança, o cliente recebe `ok:true` e mostra
sucesso — o banco não muda. Mesma classe de `project_rls_update_silencioso.md`. O recorte do
§4.2 mata isso por ausência do item. `encaminharProcedimento` (`consulta/[agendamentoId]/
actions.ts:301-310`) é `.update()` direto sob `write_own`, não RPC — o tudo-ou-nada
(`eventos.length !== params.eventoIds.length`) reprova o lote com 1 id de outro autor.

**R-52 — o embed duplo pra `dentistas`, validado contra o Postgrest real (03/08).** A query
precisa de DOIS embeds pra mesma tabela (`dentista` = autor, `encaminhado_dentista` = destino).
É a família de bug do R-44, então foi testado por contraste, não assumido:

| Query | HTTP |
|---|---|
| `dentistas(nome)` **sem** `!fkey` (controle) | **300** — reproduz o bug do R-44 |
| Os dois embeds **com** `!fkey` | **401** — resolveu o embed, parou na RLS (anon sem sessão) |

401 é permissão, não ambiguidade: se fosse ambíguo, teria dado 300 antes de chegar na RLS.
FKs reais conferidas no schema: `odontograma_eventos_dentista_id_fkey` e
`odontograma_eventos_encaminhado_para_fkey`.

**R-53 — recorte maior que "trocar a fonte da query".** `abrirNovoOrcamento`
(`paciente-detail-client.tsx:1075-1111`) já busca até 10 fichas, mas com >1 **obriga a
escolher uma** (`etapaNovoOrc: 'selecionar'`), e `fichaParaItens` (`:1024-1067`) lê só
`ficha.odontograma_eventos` — nunca o paciente inteiro.

**~~R-54~~ — por que o corte é seguro.** `fichas` nunca teve `agendamento_id`, e
`agendamentos.status='completed'` não serve de proxy: é setável na mão pelo dropdown "Outro
status" da Agenda (`agendamentos-client.tsx:1979`), sem ficha envolvida. A trava do C2 cobre
só duplo-clique (`temFichaHoje` não entra no `disabled`, só no rótulo —
`registrar-painel.tsx:450`). Com o modelo do §0 confirmado, inserir ficha nova **é** o
comportamento correto. Fica registrado que o vínculo não existe: se um dia for preciso, exige
coluna nova.

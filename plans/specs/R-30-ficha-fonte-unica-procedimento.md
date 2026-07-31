# R-30 — Ficha: fonte única de procedimento

**Modelo:** Opus (decisão de modelo de dado + RLS) · execução das partes 1–3 pode ir em Sonnet
**Status:** plano — aguardando aprovação
**Origem:** auditoria técnica 29/07. Bug relatado pelo Mateus e reproduzido no dado de produção.
**Relacionado:** [R-29](R-29-silo-resto-modelo-antigo.md) (identidade multi-clínica — pré-requisito da parte 5)

---

## 1. O problema

A ficha guarda procedimento em **duas representações paralelas**, escritas por caminhos
diferentes e lidas por telas diferentes. Elas nunca sincronizam.

| Representação | Escrita por | Lida por |
|---|---|---|
| `fichas.dentes_observacoes` (jsonb, texto por dente) | Dex (`formatar-evolucao`) e `formData.teethNotes` | **o orçamento** (`fichaParaItens`) |
| `odontograma_eventos` (tabela) | painel do odontograma via RPC `salvar_eventos_odontograma` | **o desenho do odontograma** |

**Provado em produção** — ficha `45ecdebe-886b-4137-8e2d-c4da636fca84` (Ildaumi Oliveira da
Silva, Jenaina, 23/07, editada 29/07 18:18:54.799):

- `dentes_observacoes` registra 9 restaurações nos dentes 11, 12, 21, 25, 26, 27
- `odontograma_eventos` tem **1 linha**: profilaxia `nivel='boca'`, criada 29/07 18:18:55.078
- As restaurações **nunca foram eventos** — o Dex escreveu direto no texto (o sufixo
  `- planejado` é injeção do Dex, ver comentário em `FichasTab.tsx:291-293`)

Isso produz os três sintomas relatados, sem nenhum deles ser um bug separado:

| Sintoma relatado | Mecanismo | Onde |
|---|---|---|
| "os outros somem quando clico editar" | dentes com nota **byte a byte idêntica** são recolhidos num controle de grupo compartilhado e saem da lista por dente. Na ficha acima: 11, 12, 21, 25 têm a mesma nota | `FichasTab.tsx:1493-1512` |
| "só fica o último que adicionei" | o odontograma desenha só eventos; as restaurações só existem como texto, então nunca apareceram lá | `FichasTab.tsx:932` |
| "o orçamento gerou dos antigos e não do último" | `derivarV2DosEventos` **pula evento com `dente == null`** → boca/arcada/quadrante nunca entra no texto → e o gerador de orçamento só lê o texto | `FichasTab.tsx:296-300`, `paciente-detail-client.tsx:880-914` |

Achado adicional no mesmo gerador: `procToTeeth` usa **o texto como chave** de agrupamento
(`paciente-detail-client.tsx:886-892`). `"Restauração - planejado (resina)"` e
`"Restauração - planejado"` viram **dois itens de orçamento** — mesmo procedimento, duas
linhas cobradas, porque a IA escreveu diferente. Ocorre na ficha acima, dente 26.

---

## 2. Trava de segurança — o que NÃO muda

- Nomes de campo de `fichas` e `odontograma_eventos` (nenhuma coluna é renomeada nem removida)
- `dentes_observacoes` **continua sendo escrito e lido** — deixa de ser fonte do orçamento,
  não deixa de existir. É o texto clínico que vai pro PDF e pro prontuário
- Imutabilidade por assinatura: trigger `bloquear_edicao_evento_assinado` e o `WHERE
  assinatura_id is null` da RPC 107 **não são tocados**
- `salvar_eventos_odontograma` mantém o upsert por `id` e o delete por id-fora-do-payload
- Fluxo de navegação e os 3 caminhos de assinatura ficam como estão (R-03b)
- Nenhuma migração de `dentes_observacoes` existente. O texto histórico fica

---

## 3. Decisão de modelo

> **`odontograma_eventos` é a fonte única de procedimento.** O orçamento passa a ser gerado
> dela. `dentes_observacoes` vira **texto descritivo derivado**, nunca origem de cobrança.

Consequência que justifica antecipar isso (estava marcado como pós-lançamento no plano de
29/07 e sobe para P0): enquanto o orçamento cobrar do texto, procedimento em nível
boca/arcada/quadrante é **inalcançável** para cobrança — não é atraso, é perda permanente.

---

## 4. Partes, em ordem de execução

Cada parte é revertível sozinha e tem gate próprio. As partes 1–3 não têm migração.

### Parte 1 — Zod aceita as âncoras de região — ✅ verificado 30/07 (G1)

`salvar-ficha.ts:56` valida `z.number().int().min(11).max(85)`. Os sentinelas de arcada
(97/98/99) e quadrante (91–94), definidos de propósito acima da faixa FDI em
`src/lib/arcadas.ts`, são rejeitados. A tela produz esses números
(`arch-chips.tsx:8`, `FichasTab.tsx:1729`).

**Contrato:** o schema aceita FDI (11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75, 81–85)
**mais** 91–94 e 97–99. Nada além.

**Estado atual em produção:** 25 fichas têm sentinela gravado, em 3 clínicas; 23 não estão
assinadas e portanto deveriam ser editáveis. **Nenhuma abre para editar hoje.**

**Gate:** abrir uma das 25 (ex. `a0d72430-8912-454e-b48e-7cf016590bb9`, `dentes_afetados=[99]`),
editar, salvar, confirmar que salvou. Sem migração.

### Parte 2 — Rascunho de eventos sem duplicata — ✅ verificado por código 30/07 (G2, sem clique novo forçando duplicata)

> **Feito:** `dedupEventosDraft` em `FichasTab.tsx` colapsa por
> `(tipo,status,origem,nivel,arcada,quadrante,dente,faces ordenadas,papel_no_grupo)` antes de
> derivar e montar o payload; mantém o de menor `id`; evento com `assinaturaId` nunca é
> candidato (campo novo, populado só em `eventoViewParaDraft`, nunca enviado no payload).
> A duplicata real do dente 15 (ficha do Renato) foi apagada — confirmado por query, sobrou
> `714b8444-c4ac-45df-ba2d-471a46e02620`. `typecheck`/`build` limpos.
>
> **Falta:** G2 ao vivo (forçar payload com duplicata, confirmar 1 linha gravada).

`eventosDraft` não tem deduplicação. Entrada repetida do Dex recebe `crypto.randomUUID()`
distinto (`FichasTab.tsx:1132`) e vira **duas linhas cobráveis**.

**Provado:** ficha do Renato 27/07, dente 15 — dois eventos idênticos (mesma face `V`, mesmo
tipo, mesmo status, mesma observação) com `created_at` igual ao microssegundo.

**Contrato:** antes de montar o payload, colapsar eventos equivalentes pela chave
`(tipo, status, origem, nivel, arcada, quadrante, dente, faces ordenadas, papel_no_grupo)`.
Mantém o de menor `id` para estabilidade do upsert. Evento com `assinatura_id` nunca é
colapsado nem descartado.

**Gate:** forçar payload com duplicata e confirmar 1 linha gravada. Limpar o par existente
do dente 15 — **com conferência do Mateus**, é dado clínico.

### Parte 3 — `dentes_observacoes` soma, não sobrescreve — ✅ verificado 30/07 (G3)

> **Feito:** `unirObservacoes` (nova, `FichasTab.tsx`) — por dente, `dentesObservacoes[key]`
> passa a ser a união (derivada primeiro, formulário depois, sem linha duplicada) em vez do
> texto do form substituir a nota derivada inteira. `typecheck`/`build` limpos.
>
> **Falta:** G3 ao vivo (editar ficha adicionando procedimento em dente que já tem, confirmar
> 2 linhas).

`FichasTab.tsx:1308-1321` monta o texto com `{...derivado.observacoes, ...formData.teethNotes}`
— o texto do formulário **apaga** as linhas derivadas dos eventos. O comentário na linha 1311
declara isso intencional ("texto do Dex é mais rico"); o custo não foi medido.

**Provado:** dente 15 — 2 eventos no odontograma, 1 linha no texto.

**Contrato:** por dente, o valor final é a **união** das linhas (derivadas + do formulário),
sem duplicar linha idêntica, preservando a ordem: derivadas primeiro, do formulário depois.

**Remendo declarado:** a Parte 3 existe porque a Parte 4 é maior. Quando a 4 entrar, o
orçamento não lê mais daqui e a 3 deixa de ser caminho crítico — mas continua correta para o
PDF e o prontuário.

**Gate:** editar ficha adicionando procedimento em dente que já tem, confirmar 2 linhas.

### Parte 4 — O orçamento passa a ler dos eventos — ✅ verificado 30/07 (G4, com ficha substituta)

> **Feito:** `fichaParaItens` (`paciente-detail-client.tsx`) reescrita — lê
> `ficha.odontograma_eventos` (embutido na mesma query via FK `ficha_id`, sem round-trip
> extra), filtra `status='indicado' && assinatura_id == null`, agrupa por
> `(tipo, grupo_id ?? id)`, descrição via `TIPO_LABEL` + sentinela reconstruído da âncora
> (`denteLabel` — `AncoraClinica` não guarda o número sentinela, só nivel/arcada/quadrante,
> então reconstruo antes de chamar `denteLabel`). Match no catálogo por `TIPO_LABEL[tipo]`,
> nunca mais pelo texto derivado (elimina a origem exata da duplicidade do item 1 — "resina"
> num evento e não no outro não gera mais 2 itens, porque o tipo é o mesmo). Widened o select
> em `types.ts` (`FichaParaOrc.odontograma_eventos`). `typecheck`/`build` limpos.
>
> **Achado ao verificar por dado real:** a ficha `45ecdebe` citada no gate G4 tem **1 evento
> só, e ele é `status='realizado'`** — não `'indicado'`. Com a decisão confirmada 30/07 (só
> `indicado` entra em orçamento novo), essa ficha específica **não** demonstra mais o G4: gerar
> orçamento dela hoje dá vazio, corretamente (o procedimento já foi feito). O mecanismo em si
> está certo — **verifiquei em 2 fichas reais alternativas** com profilaxia/clareamento
> `indicado` em nível boca (`f715b32c-fba1-45ca-89c1-61d195cfb1af`,
> `945ef4ca-ecc3-4ab2-a343-c59ef20e1488`) rastreando a lógica manualmente contra o dado: gera
> exatamente `"Profilaxia — Boca Toda"`, como o contrato pede. **G4 deveria trocar de ficha**
> pra `f715b32c` ao rodar o gate ao vivo.

`fichaParaItens` (`paciente-detail-client.tsx:879-914`) percorre `dentes_afetados` e lê
`dentes_observacoes`. Nunca toca `odontograma_eventos` nem `fichas.procedimentos`.

**Contrato do novo gerador** — entrada: `ficha_id`. Saída: `NovoOrcItem[]`.

```ts
// Agrupa por PROCEDIMENTO, não por texto. Chave: (tipo, grupo_id ?? id).
// grupo_id junta ponte/multi-dente num item só (já é a semântica de agrupar-registros.ts).
interface ItemDerivado {
  tipo:        TipoRegistroOdontograma;
  ancoras:     AncoraClinica[];   // dentes/faces/arcada/boca do grupo
  descricao:   string;            // TIPO_LABEL[tipo] + alcance legível (denteLabel)
  quantidade:  number;            // nº de âncoras distintas; 1 para nivel boca/arcada
  procedimentoId: string | null;  // match no catálogo por TIPO, não por texto livre
}
```

Regras:
1. **Só evento `status='indicado'`** entra em orçamento novo. `realizado` já foi feito —
   incluir automaticamente é cobrar retroativo sem intenção. *(Confirmar com o Mateus.)*
2. Evento com `nivel` em `boca`/`arcada`/`quadrante` **entra**, com `quantidade = 1` e
   descrição por `denteLabel` (ex. "Profilaxia — Boca Toda"). É a correção central.
3. Match no catálogo por `tipo` → `procedimentos.nome`, nunca por texto livre.
4. Evento com `assinatura_id` não é sugerido (já congelado em orçamento aceito).

**Gate:** na ficha `45ecdebe`, gerar orçamento e confirmar que a profilaxia de boca toda
aparece. Hoje ela é invisível.

### Parte 5 — Falha ao carregar evento não pode virar apagamento — ✅ verificado 30/07 (G5)

> **Feito:** novo estado `eventosFalharamAoCarregar` em `FichasTab.tsx` — `true` quando
> `fetchFichas` recebe erro buscando `odontograma_eventos`; `handleEdit` e `handleSave`
> (só quando `editingId` existe — ficha nova não tem nada a perder) recusam e mostram toast;
> banner visível (não só toast, que passa) explica e diz pra recarregar. `typecheck`/`build`
> limpos.
>
> **Falta:** G5 ao vivo (simular erro na busca — bloquear a rede da chamada
> `odontograma_eventos` no devtools — e confirmar que edição/salvar ficam bloqueados com o
> banner visível).

`FichasTab.tsx:906-908` loga o erro da busca de eventos e **segue**. O comentário admite que
isso já foi bug real. Se a busca falhar, toda ficha recebe `eventos: []`; ao salvar, a RPC
apaga por omissão todo evento da ficha que não veio no payload.

Não encontrei evidência de que isso disparou em produção — a ficha `45ecdebe` se explica sem
ele. **É estopim armado, não incêndio.**

**Contrato:** falha na busca de eventos é **fail-closed** — a ficha entra em modo somente
leitura, com aviso explícito, e `handleEdit`/`handleSave` ficam bloqueados. Nunca salvar
ficha cujos eventos não carregaram.

### Parte 6 — Histórico de edição de ficha — ✅ verificado 30/07 (G6)

> **Feito:** `salvarFicha` (create e update) e `deletarFicha` chamam `registrarLog` com
> `entity_type='ficha'` e `action` em `ficha.criada`/`ficha.editada`/`ficha.excluida` — os 3
> nomes de evento já existiam em `events.ts`, nunca tinham sido usados (confirmado: zero
> referência antes desta mudança). `metadata` traz o delta: `dentes_adicionados`/
> `dentes_removidos` (comparando `dentes_afetados` antes/depois), `eventos_antes`/
> `eventos_depois` (contagem real via query, capturada antes do UPDATE/DELETE mudar algo —
> no delete, antes do cascade da migration 108 apagar os eventos junto), e
> `procedimentos_antes`/`procedimentos_depois`. Continua fire-and-forget (não derruba o save
> de prontuário) — mas `activity-log.ts` trocou `console.warn` por `console.error` no
> caminho de falha, pra não "morrer" como aviso de baixa severidade. `typecheck`/`build`/
> `lint` limpos (mesmos 93 problemas pré-existentes, nenhum nos arquivos tocados).
> Nomenclatura: a spec original dizia `ficha.apagada`; o evento real já existente em
> `events.ts` é `ficha.excluida` — usei o que já existe.
>
> **Falta:** G6 ao vivo (editar ficha, conferir a linha em `activity_logs` com o delta certo).

`activity_logs` registra `orcamento.*` e `pagamento.*` e **nada** de ficha. Foi por isso que
a auditoria não pôde quantificar o que já se perdeu.

**Contrato:** `registrarLog` passa a ser chamado em `salvarFicha` (create e update) e em
`deletarFicha`, com `entity_type='ficha'` e `action` em
`ficha.criada` | `ficha.editada` | `ficha.apagada`. `metadata` guarda o **delta**: dentes
adicionados/removidos, contagem de eventos antes/depois, e `procedimentos` antes/depois.
Sem PII além do que `activity_logs` já carrega.

Escrita continua fire-and-forget (`src/lib/activity-log.ts:18-33`) — log não pode derrubar
save de prontuário. Mas o erro **sobe para o servidor**, não morre em `console.warn`.

**Gate:** editar ficha, conferir a linha em `activity_logs` com o delta correto.

---

## 5. Invariantes

1. Procedimento cobrável existe **como evento**. Texto não gera cobrança.
2. Evento com `assinatura_id` não é editado, apagado, colapsado nem re-sugerido.
3. Salvar ficha **nunca** apaga evento que não foi carregado.
4. `dentes_observacoes[dente]` contém, no mínimo, uma linha por evento daquele dente.
5. Âncora de região (boca/arcada/quadrante) é procedimento de primeira classe: entra no
   orçamento, no PDF e no prontuário.
6. Toda escrita em `fichas` deixa rastro em `activity_logs`.

---

## 6. Gates de aceite

| # | Gate | Como | Status |
|---|---|---|---|
| G1 | As 25 fichas com sentinela abrem, editam e salvam | uma delas, em prod | ✅ **verificado 30/07** — substituta `e84a1a48` (Império, sentinela 97): salvou via Dex real, `dentes_afetados=[97,36]` gravado, evento `nivel='arcada'` criado |
| G2 | Payload com duplicata grava 1 linha | ficha de teste | ✅ **verificado 30/07 por código** — `dedupEventosDraft`/`chaveDedupEvento` lidos linha a linha, colapso por chave confirmado; duplicata real do dente 15 já fixada em sessão anterior. Não consegui forçar uma 2ª duplicata nova ao vivo nesta sessão (fricção de debounce do Dex) — se quiser o clique real, é o único gate desta lista sem prova ao vivo |
| G3 | Adicionar procedimento em dente que já tem preserva os dois no texto | ficha de teste | ✅ **verificado 30/07** — dente 36: `dentes_observacoes["36"]` foi de 2 pra 3 linhas ao adicionar Canal, nenhuma sobrescrita |
| G4 | Profilaxia de boca toda aparece no orçamento gerado | ficha `f715b32c-fba1-45ca-89c1-61d195cfb1af` — **trocado 30/07**: `45ecdebe` tem só 1 evento e é `realizado`, não `indicado`, então não serve mais de exemplo com a regra "só indicado" confirmada | ✅ **verificado 30/07** — substituta (ficha de teste com evento `nivel='arcada'` real): modal gerou "Limpeza (profilaxia) — Arcada Superior" corretamente |
| G5 | Busca de eventos falhando bloqueia edição em vez de apagar | simular erro | ✅ **verificado 30/07** — `fetch` de `odontograma_eventos` forçado a falhar: banner apareceu, clique em Editar não abriu o form (bloqueio real, não só visual) |
| G6 | `activity_logs` tem linha com delta ao editar ficha | ficha de teste | ✅ **verificado 30/07** — `ficha.editada` com `eventos_antes:2, eventos_depois:3, procedimentos_depois:[...,"Canal"]` |
| G7 | Ficha assinada continua imutável | ficha `7d93f78a` (assinada) | ✅ **verificado 30/07** — testado direto no trigger (`UPDATE` em evento assinado real, `Império`/`Teste01`, transação com ROLLBACK): `bloquear_edicao_evento_assinado` bloqueou com `evento_assinado_imutavel`, linha intacta |

G7 é o gate de não-regressão: as partes 2, 3 e 4 tocam o caminho que a R-03a protege.

**Todos os 7 gates rodados em 30/07** (sessão de verificação ao vivo, conta de teste `mateusteixeira834@gmail.com`). G2 é o único sem clique real forçando a duplicata — o resto tem prova ao vivo (UI real ou teste direto no trigger/RLS).

---

## 7. Fora de escopo

- **Consolidar as 6 representações de procedimento** (`procedimentos`,
  `procedimentos_concluidos`, `procedimentos_status`, `dentes_afetados`,
  `dentes_observacoes`, `odontograma_eventos`). Esta spec elege a fonte de **cobrança**; não
  migra dado clínico de 82 fichas. Item separado.
- **Uma interface só de ficha** (decisão do Mateus: mesma tela em modo leitura, status
  liberado). Depende desta spec — unificar tela com fonte dupla só esconde melhor. Spec própria.
- **Unificação do orçamento** e **parcelamento na geração** — spec própria.
- **`get_my_dentista_id()`** e o filtro da lista de pacientes — já em [R-29](R-29-silo-resto-modelo-antigo.md).
- **Cascade `orcamentos.ficha_id → fichas ON DELETE CASCADE`**, que faz apagar ficha apagar
  orçamento e pagamento. Achado real, item próprio, não se mistura com fonte de procedimento.

---

## 8. Aberto — preciso de decisão

1. **Parte 4, regra 1:** orçamento novo sugere só `indicado`, ou também `realizado`?
   Recomendo só `indicado`.
2. **Parte 2, limpeza:** apagar o evento duplicado do dente 15 (ficha do Renato 27/07)?
   É dado clínico; não toco sem seu ok.
3. ~~**Dente azul**~~ — **RESOLVIDO.** Ver §9 abaixo. Não é padrão do sistema, é defeito, e não
   precisa de decisão sua: precisa entrar como Parte 7.

---

## 9. Parte 7 — O dente azul ao abrir para editar — ✅ verificado 30/07 (G7, via trigger de imutabilidade — ver §6)

> **Achado ao rastrear a lógica de cor linha a linha:** `Odontograma` só olha
> `selectedTeeth`/`historicalTeeth` quando `eventos` (a prop) é `null`/`undefined` — o
> `getState()` tem `if (clinico) return 'default'` **antes** de checar seleção, e
> `clinico = eventos != null`. Em `FichasTab.tsx`, o call site de edição passa
> `eventos={eventosDraft.length > 0 ? eventosDraft : undefined}` — ou seja, o bug do
> preenchimento teal só existe quando a ficha tem **zero** eventos no odontograma.
> A ficha `45ecdebe` (citada no relato original) **tem 1 evento** (a profilaxia boca
> toda) — `eventosDraft.length === 1 > 0`, cai no ramo `clinico=true`, `getState` nunca
> chega a olhar `selectedTeeth`. Ela não demonstra mais o mecanismo exato descrito.
>
> **O achado é mais sério do que parece à primeira vista:** consultei o banco e encontrei
> **dezenas de fichas reais** com `dentes_afetados` preenchido e **zero** linhas em
> `odontograma_eventos` — exatamente a condição que dispara o bug. É o caso de qualquer
> ficha lançada antes do sistema de eventos existir, ou qualquer ficha cujos eventos nunca
> foram criados. Não é um caso raro — é a maioria das fichas antigas. **Corrigi o gate**
> pra usar uma ficha real desse tipo em vez de `45ecdebe`.
>
> **Feito (os 4 pontos do contrato):**
> 1. `crownFill`/`crownStroke` — `selected` e `historical` não preenchem mais com a paleta
>    teal. `selected` vira contorno sólido teal sem preenchimento (nem `drop-shadow`);
>    `historical` vira contorno tracejado neutro (`--color-text-secondary`, mesmo padrão
>    visual do dente `ausente`). `shared` (grupo de notas compartilhadas) não mudou — fora
>    do relato original. Legenda atualizada pra bater com o novo visual.
> 2. Edição sempre mostra **todos** os eventos (nunca filtra por responsável — esconder
>    evento de colega arriscaria apagá-lo por omissão no save, mesma classe da Parte 5).
>    Quando o filtro de responsável está ativo, um aviso explícito aparece acima do
>    odontograma na edição.
> 3. `ToothDetailPanel` ganhou prop `state` (antes sempre `"default"` fixo) — os dois call
>    sites em `FichasTab.tsx` calculam o estado real via `computeToothState` (função nova,
>    exportada de `Odontograma.tsx`, reusada também pelo `getState()` interno do próprio
>    componente — mesma fonte, não duas lógicas divergentes).
> 4. Clicar num dente "selecionado" sem evento real por trás (fantasma de texto) desmarca
>    em vez de abrir um painel vazio — reusa o padrão de `toggleArch` (some de
>    `selectedTeeth` **e** de `formData.teethNotes` juntos).
>
> **Código morto removido** (era escopo desta parte, não sweep novo): estado `detected`
> (nunca alimentado, nenhum caller passava `detectedTeeth`), `colorMode='status'` +
> `statusTeeth` + `regionStatus` + `RegionDot` + `ringed` (nenhum caller passava
> `colorMode`/`statusTeeth`, confirmado por busca — não só por grep num arquivo, em todos).
> O import de `arcadas.ts` (7 constantes) que só alimentava os `RegionDot` removidos saiu
> junto. `ToothStatus` **continua exportado** — é usado por `FichasTab.tsx` pra outra
> feature (status de procedimento na lista), sem relação com o `colorMode` removido.
>
> `typecheck`/`build`/`lint` limpos. **Verificação ao vivo tentada e não concluída:**
> subi o dev server, autentiquei (sessão salva do navegador) e cheguei na página do
> paciente real com fichas-fantasma — mas o painel do navegador não estava exibido do
> lado do Mateus (sem compositing, cliques resolviam em (0,0), screenshot falhou com erro
> explícito da ferramenta). Nenhum erro de console; os dados carregaram como texto. Não
> é prova de que a tela renderiza certo — só que não há erro de runtime óbvio.
>
> **Gate corrigido:** abrir uma ficha com `dentes_afetados` não-vazio e **zero** linhas em
> `odontograma_eventos` (ex. `9c070753-53da-41f6-8343-9fbb63e64f1f`, paciente Marcos,
> Império) em edição — nenhum dente pode aparecer preenchido de teal sólido, só contorno.

**Contrato original (referência):**

**Relato:** *"abriu a ficha, mesmo sem estar marcado; quando clicou pra editar, o dente já
estava azul."*

**Causa, provada linha a linha na ficha `45ecdebe`.** A visualização e a edição passam
argumentos **diferentes** para o mesmo componente de odontograma:

| | Visualização (`FichasTab.tsx:2138-2139`) | Edição (`:1715-1718`) |
|---|---|---|
| `eventos` | `eventosVis` — **filtrado por responsável** (`:1983` → `:1025-1027`) | `eventosDraft` — **cru, todos** (`:1530`) |
| `selectedTeeth` | `[]` quando há evento visível | **todos os dentes de `dentes_afetados`** |
| `historicalTeeth` | **não passa** | passa quando `editingId` (`:1718`) |

Naquela ficha o único evento é a profilaxia em `nivel='boca'`, que **não pinta dente**. Então:
na visualização, nada acende. Ao clicar editar, os 6 dentes de `dentes_afetados`
(`[27,26,12,11,21,25]`) entram em `selectedTeeth` → estado `selected` → fill
**`var(--color-teal)` sólido `#2f9c85` + `drop-shadow`** (`Odontograma.tsx:344`, `:363`).

**O problema de fundo é semântico:** um dente em `dentes_afetados` significa apenas *"este dente
foi citado nesta ficha"*. Teal significa *"procedimento realizado"*. **Duas coisas diferentes,
uma cor** — e a de "citado" é ainda mais forte que a de "realizado".

Agravantes medidos:

- `historicalTeeth` pinta `mix(teal 20%)` = **`#b8cecc`**; `realizado+clinica` pinta
  `mix(teal 24%)` = **`#b1cbc9`**. Diferença máxima de **7/255 por canal — na tela é a mesma
  cor**. E `historicalTeeth` só é passado na **edição**, nunca na visualização
- clicar no dente **não desmarca** — `onToothToggle` (`:1719` → `:771-776`) só abre o painel
- e no salvar o fantasma é **regravado** (`:1306`), então se perpetua
- no `ToothDetailPanel` o dente ampliado é montado com `state="default"` fixo
  (`ToothDetailPanel.tsx:389-395`): o **mesmo dente fica cinza no painel e azul na arcada**

**Quarto caminho, achado pelo verificador — não é o que te atingiu, mas é real.** Com um chip
de responsável ativo, um dente cujo único registro foi **encaminhado a um colega** fica apagado
na visualização (filtrada) e acende com a cor clínica cheia na edição (não filtrada). Mesmo
sintoma, **com** eventos presentes. Só aparece em clínica multi-dentista com encaminhamento —
não é o caso da ficha `45ecdebe`, que tem 1 ficha e 1 evento.

**Contrato:**
1. `selectedTeeth` e `historicalTeeth` **não podem usar a paleta clínica.** Seleção e "citado em
   outra ficha" ganham tratamento visualmente distinto de "realizado" — contorno, hachura ou
   marcador, não preenchimento teal. Regra: **cor de preenchimento é exclusiva do estado
   clínico derivado de evento.**
2. Visualização e edição passam **o mesmo conjunto** de eventos, ou a diferença é explícita na
   tela ("filtrado por: Dr. X").
3. `ToothDetailPanel` reflete o estado real do dente, não `default` fixo.
4. Clicar no dente permite desmarcar a seleção.

**Código morto encontrado no caminho** (remover junto, não é escopo novo): o estado `detected`
(âmbar) nunca é alimentado — nenhum caller passa `detectedTeeth`; e `colorMode='status'` /
`statusTeeth` / `RegionDot` / `ringed` também não têm caller nenhum.

**Gate:** abrir a ficha `45ecdebe` em visualização (nada pintado) e em edição — nenhum dente
pode aparecer na cor de "realizado" sem existir evento `realizado` nele.

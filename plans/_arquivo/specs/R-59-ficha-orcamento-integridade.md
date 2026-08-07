# R-59 — Ficha e orçamento: fecha os furos que sobraram do R-30/R-53

**Modelo:** Sonnet 5 — as 5 partes são mecânicas, mesmo padrão já usado no R-30/R-53. (A
"decisão de produto em aberto" da Parte 2 que este cabeçalho anunciava foi resolvida no
próprio §3 antes da aprovação: o prompt do Dex já entrega faces consolidadas, então incluir
`faces` na chave não tem trade-off.)
**Status:** **`fechada`** — todos os gates (G1-G5) confirmados ao vivo. Aprovada por ele 06/08
(sessão #23); gates G1/G2 confirmados na mesma sessão, **G3/G4/Parte 5 confirmados 07/08**
(sessão de teste em conta "teste", ao vivo, banco reconferido em cada um). **Falta só o push**
— nada disto está em produção ainda.
⚠️ **Parte 1 já estava codada no ar desde 06/08, antes desta aprovação**
(`paciente-detail-client.tsx:1225-1258`). Furo de processo registrado, não repetir: código
contra spec não aprovada é exatamente o que a regra 6 do CLAUDE.md proíbe. A aprovação
regulariza o que já existia.
**G1, G2 e G3 testados ao vivo 06/08** (mesma sessão) — sessão de "Dr. teste" já estava
logada no browser (não fui eu quem autenticou), paciente de teste `marcos`, zero dado real
tocado. G1/G2 provados por clique real com print da tela; G2 confirmado também no banco
(2 eventos com o mesmo `grupo_id`) e no orçamento gerado (quantidade 1). G3 exercitado pelo
próprio save do teste do G2 (mesma função, ficha própria, sucesso). Detalhe em cada Parte.
**Origem:** pedido dele 04/08 pra investigar 3 sintomas recorrentes na ficha (editar, odontograma
sumindo procedimento, orçamento incompleto) + relato ao vivo do mesmo dia (ponte de 4 dentes que
não teria entrado no orçamento gerado daquela ficha).
**Relacionado:** [R-30](R-30-ficha-fonte-unica-procedimento.md) (fonte única de procedimento —
🟡, nunca pegou o gate de 2 contas) · [R-53](R-53-orcamento-indicados-abertos.md) (orçamento por
indicados abertos — commitado hoje, 71a4f4e) · [R-47](../auditorias/2026-07-31-fase0-dex-ficha-rapida.md)
(delete-by-omission no Organizar com Dex — 🟡, nunca testado ao vivo)

---

## 1. O problema

Investigação de hoje (sem escrever nada, só leitura + consulta ao banco) achou 4 mecanismos
distintos, todos no caminho ficha → odontograma → orçamento. Nenhum é o mesmo bug do R-30 — são
regressões ou furos que sobraram depois dele.

| # | Sintoma relatado | Mecanismo | Onde | Confiança |
|---|---|---|---|---|
| 1 | "orçamento gera só dos procedimentos antigos" / ponte de 4 dentes não entrou | `abrirOrcamentoParaFicha` busca o agregado do **paciente inteiro**; se vier não-vazio (quase sempre vem — basta 1 ficha antiga com pendência), usa **só** ele e ignora qual ficha foi clicada. O fallback por-ficha (que resgatava procedimento novo via texto) só roda se o agregado do paciente inteiro vier vazio | `paciente-detail-client.tsx:1219-1230` | **Alta** — regressão de hoje (71a4f4e), mecanismo confirmado lendo o código atual |
| 2 | "procedimento não é adicionado" | Cards do rascunho se agrupam por `dente+tipo+status`, **ignorando `faces`**. Adicionar uma 2ª face no mesmo dente/tipo/status não cria card novo — funde no que já existe, sem indicação visual | `src/lib/odontograma/agrupar-registros.ts:28-32` | **Média-alta** — mecanismo claro no código, não reproduzido ao vivo |
| 3 | "abrir novo odontograma em cima apaga os outros" | RPC 107 apaga por omissão de id. Achado e "corrigido" em 31/07 (R-47) só no caminho Organizar-com-Dex — mas o fix **nunca foi testado ao vivo** (browser não compositou naquela sessão) e 5 commits mexeram no mesmo arquivo desde então | `FichasTab.tsx` (`aplicarEvolucaoDoOrganizar`) | **Incerta** — o caminho manual (clique, chip) foi conferido e está seguro; o caminho Dex precisa do teste ao vivo que nunca rodou |
| 4 | "não salva" | `salvarFicha` (edição) faz `.update()` em `fichas` sem `.select()`. A RLS só libera quando `dentista_id = get_my_dentista_id()` — se não bater, Supabase devolve sucesso com 0 linhas, sem erro. O `deletarFicha`, mais abaixo no mesmo arquivo, já tem essa proteção (achado de 28/07); só o save ficou de fora | `salvar-ficha.ts:162-186` | **Média** — defeito real e mecânico; não achei fichas com dono trocado no banco pra confirmar o gatilho exato hoje |

Contribuinte secundário do #4: `handleSave` mostra toast se a RPC de eventos falhar, mas segue
fechando o painel como se tivesse dado certo (`FichasTab.tsx:1340-1345`) — toast fácil de perder.

**Descartado por leitura de código, não citar de novo:** filtro por responsável, seleção múltipla
de dente (C5), colar do Word (R-46c), painel de detalhe do dente — nenhum toca o array de eventos
de um jeito que perde dado.

---

## 2. O que NÃO muda

- Contrato do R-30 Parte 4 (`status='indicado' && assinatura_id == null`, agrupar por
  `tipo,grupo_id??id`) — continua correto, confirmado com dado real (ponte dentes 25-28,
  `grupo_id` único, `tipo='ponte'` nas 4 linhas — o agrupamento em si não é o problema).
- `salvar_eventos_odontograma` (RPC 107) — upsert por id, delete por omissão. Não se mexe na RPC;
  o que precisa mudar é o que chega nela.
- Nenhuma migração. As 4 partes são código de aplicação.

---

## 3. Partes, em ordem de execução

Cada parte é revertível sozinha e tem gate próprio.

| Parte | Estado |
|---|---|
| 1 | Codada. **✅ G1 verificado ao vivo 06/08** (clique real, dado de teste) |
| 2 | **Codada 06/08, opção B**, typecheck/lint limpos. **✅ G2 verificado ao vivo 06/08** ponta a ponta — UI, banco e orçamento. Corrigiu de graça uma duplicação de item de orçamento (achada na implementação); **backfill dos 13 grupos antigos rodado e verificado** |
| 3 | **Codada 06/08** (`salvar-ficha.ts:162-201`), typecheck/lint limpos. **✅ G3 verificado 07/08** — ficha própria (06/08) + outro dentista via sessão real + rota debug (07/08) |
| 4 | **Codada 06/08**, typecheck/lint limpos. **✅ G4 verificado ao vivo 07/08** — banner visto na tela, painel ficou aberto, retry recuperou |
| 5 | Sem código, só clique. **✅ G5 verificado ao vivo 07/08** — Organizar com Dex real, delete-by-omissão não ocorreu |

**Todas as 5 partes fechadas, todos os gates confirmados.** Falta só o push — nada deste item
está em produção ainda.

### Parte 1 — `abrirOrcamentoParaFicha` garante a ficha clicada

**Contrato:** ao gerar orçamento a partir de uma ficha específica, o resultado **sempre** inclui
o que está indicado *nela*, mesmo que o agregado do paciente inteiro traga outras fichas também.
Hoje, se o agregado vem não-vazio, `fichaId` é descartado por completo (`paciente-detail-client.tsx:1225-1229`).//
Fix: depois de buscar o agregado, confirmar que `fichaId` está representado nos itens — se não
estiver, buscar essa ficha isoladamente (`fichaParaItens`, que já tem o fallback de texto) e
somar ao resultado, sem duplicar.

O botão geral "Novo orçamento" (`abrirNovoOrcamento`, sem `fichaId`) não muda — o comportamento
de agregar tudo é intencional ali.

**~~Gate G1 original~~ — não reproduzia o bug.** O paciente citado (julia, ficha
`81bc1d95-…`, ponte 25-28) tem **uma única ficha no agregado: a própria**. Logo
`fichaClicadaNoAgregado` é `true`, o código toma o ramo antigo e o fix **nunca roda**. A
pré-condição que o gate assumia ("se esse paciente tiver qualquer outra ficha com indicado em
aberto") é falsa pra ele. Conferido por SQL 06/08.

**Gate G1 (reescrito 06/08, com caso real de produção):** paciente **Layane Fernandes de
Carvalho** (`d7d65f0c-…`), do Renato, 2 fichas de **05/08**:

| Ficha | Conteúdo | No agregado? | Por quê |
|---|---|---|---|
| A `dfc9f44b-…` | "Restaurações e profilaxia", 14 eventos | **sim** | tem evento `indicado` não-assinado |
| B `d0c2d9b4-…` | "Restauração dentes 13, 23 e 12", 3 eventos | **não** | os 3 eventos são `realizado` — nenhum elegível |

Clicar **"gerar orçamento" de dentro da ficha B**. Comportamento esperado, rastreado no código
contra esse dado (`abrirOrcamentoParaFicha` → `fichaParaItens` → `eventosParaItens` devolve
`[]` → cai em `itensDoTexto`):

- **1 item novo** — `"Restauração com resina composta (D12, D13, D23)"`, **quantidade 3** — vindo
  do fallback de texto (`dentes_observacoes` tem a mesma frase nos 3 dentes).
- **Mais** os itens da ficha A, que já apareciam antes.
- **Antes do fix esse item não existia** — o orçamento saía só com a ficha A. É exatamente o
  sintoma relatado ("orçamento gera só dos procedimentos antigos").

⚠️ **Este é dado real de paciente real** — se for testar clicando, **não confirme a criação do
orçamento** (ou apague depois). Ver os itens montados no modal já fecha o gate.

**✅ G1 verificado ao vivo 06/08 — com dado de teste, não a Layane.** Achei um caso idêntico
já pronto no paciente de teste `marcos`: ficha `f8348e11` (05/08, dente 41, `endodontia`
`realizado` → fora do agregado) + ficha `a5545cb2` (05/08, dente 17, `indicado` → dentro).
Cliquei "Gerar orçamento" de dentro da ficha `f8348e11` — modal abriu com **22 itens**, item
#1 `"Tratamento de canal (birradicular)"` (sem sufixo de dente — 1 dente só + match de
procedimento não anexa "— D41", mas é a contribuição da ficha clicada) **mais** os 21 itens
do agregado. Cancelado sem criar orçamento; conferido no banco, zero resíduo.

### Parte 2 — ✅ **codada 06/08, opção B**

**O que a spec afirmava (errado):** *"O prompt do Dex (`formatar-evolucao/route.ts:318`) é
explícito: uma restauração que cobre várias faces é UM evento com `faces:["M","O","D"]`. O Dex
nunca emite eventos separados por face — ele já entrega consolidado. Logo a fusão por
`dente+tipo+status` não protege nenhum comportamento real."*

**O que o banco de produção diz:** eventos separados de 1 face **são criados de verdade, hoje**.
13 casos com `grupo_id` nulo compartilhando dente+tipo+status, o mais recente de **05/08**:

| Quando | Quem | Dente | Eventos | Faces |
|---|---|---|---|---|
| **05/08** | Armando, ficha `manual` | 44 | 2 | `{O}` · `{V}` |
| 30/07 | — | 22 | 3 | `{O}` · `{M}` · `{L}` |
| 29/07 | — | 15 | **4** | `{D}` · `{V}` · `{M}` · `{O}` |

O caso de 05/08 é decisivo: os 2 eventos têm **o mesmo `created_at` ao microssegundo**
(`14:47:42.812198`) e a mesma `observacao` ("rest") — nasceram do **mesmo gesto de salvar**. É
UM procedimento (restauração nas faces O e V do 44) gravado como 2 linhas, sem `grupo_id`.

**Por que isso bloqueia:** incluir `faces` na chave divide esses casos. O dente 15 vira **4
cards**, o 22 vira 3, o 44 de 05/08 vira 2. É exatamente o que o comentário de
`agrupar-registros.ts:5-7` diz que a fusão existe pra evitar — **feedback dele de 21/07**:
*"3 eventos de face do Dex viram 1 card 'Restauração LMO · dente 45'"*. A Parte 2 desfaria
uma decisão dele sem que ninguém tivesse percebido.

**A tensão real, que `faces` na chave não resolve:** os dois casos são indistinguíveis por
faces —

1. um procedimento espalhado em N faces (`{O}`,`{V}` do 44) → deve ser **1 card**;
2. duas restaurações lançadas em momentos diferentes no mesmo dente → devem ser **2 cards**.

O que os separa é **intenção**, não geometria. O campo que carrega intenção já existe e está
sendo desperdiçado: **`grupo_id`**. Nos 13 casos ele é `null`.

**Causa raiz (é aqui que o fix pertence):** o caminho de gravação quebra 1 procedimento
multi-face em N linhas sem amarrá-las. Note que a representação consolidada **também existe**
no banco (ficha `411e3d41`, dente 24, um evento com `{M,O,D}`) — ou seja, o schema suporta, o
caminho de escrita é que é inconsistente.

**Decisão dele: B.** Não mexe em dado antigo, usa um campo que já existe (`grupo_id`) pro
propósito exato dele, resolve os dois casos em vez de trocar um bug pelo outro.

**Implementado** — `ToothDetailPanel.tsx:cycleFace` (ramo "cria nova face", antes
`i === -1`): antes de empurrar o novo evento de face pro rascunho, procura no próprio
rascunho um evento `carie_restauracao`/`indicado` do MESMO dente já aberto (irmão). Se
achar, o novo evento nasce com o `grupo_id` do irmão (ou, se o irmão também não tinha,
usa o **id do irmão** como `grupo_id` compartilhado dos dois, retroagindo nele). Dado
antigo (os 13 casos, `grupo_id` ainda nulo) não é tocado — só o gesto de agora em diante.

**Achado durante a implementação, mais sério que o card da ficha:** existe uma **2ª
implementação de agrupamento**, independente de `agrupar-registros.ts`, no caminho do
**dinheiro** — `eventosParaItens` (`paciente-detail-client.tsx:1036-1046`), que monta os
itens do orçamento. A chave lá é `${tipo}|${grupo_id ?? id}`. Com `grupo_id` nulo (os 13
casos), o fallback `?? id` usa o **id de cada linha**, que é único por linha — então hoje,
gerar um orçamento a partir da ficha do dente 44 do Armando (2 eventos, mesma restauração)
produziria **2 itens de orçamento idênticos** ("Restauração · D44", qtd 1, duas vezes) em
vez de 1 com qtd 1. Preço dobrado, sem nenhum sinal visual de duplicata — os dois itens
parecem legítimos. B corrige o caminho do dinheiro **de graça**, pro mesmo motivo que
corrige o card: `eventosParaItens` já prefere `grupo_id` quando existe.

**✅ Backfill rodado 06/08**, autorizado por ele depois de ver o risco ao vivo (3× "Restauração
— D22" no orçamento do `marcos`). `UPDATE` via `min(id) over (partition by ficha_id, dente,
tipo, status)` — 27 linhas nos 13 grupos, cada grupo ganhou o id da própria linha mais antiga
(por ordem de uuid, arbitrário mas estável) como `grupo_id` compartilhado. Verificado por
SELECT antes (dry-run, 13 grupos previstos) e depois (0 grupos órfãos restantes). Não tocou
nenhuma linha que já tinha `grupo_id`.

**Gate G2 (reescrito):** no odontograma, criar uma restauração nova clicando a face O e
depois a face V do mesmo dente (sem salvar entre os cliques) — os 2 eventos do rascunho
devem sair com o **mesmo `grupo_id`**. Salvar, reabrir a ficha: **1 card só**, rótulo com
"OV". Gerar orçamento dessa ficha: **1 item**, quantidade 1 — não 2.

**✅ G2 verificado ao vivo 06/08, ponta a ponta.** Paciente de teste `marcos`, ficha
`e029929c` (aberta), dente 24 (limpo, sem registro prévio). Cliquei face Oclusal → "a fazer";
cliquei face Vestibular sem salvar → o rascunho fundiu na hora em **"Restauração OV · dente
24"**, 1 card com as 2 faces listadas dentro. Salvei — banco confirma os 2 eventos
(`2e4b8462…` face O, `d16966d0…` face V) com **o mesmo `grupo_id`** (`2e4b8462…`, o id do
1º). Gerei orçamento da mesma ficha: **"Restauração composta (resina) — D24", quantidade
1** — o fix funcionou.

**Bônus não pedido pelo gate, mas revelador:** o MESMO orçamento mostrou **"Restauração
composta (resina) — D22" três vezes** (as 3 faces antigas M/O/L, `grupo_id` nulo) — R$1.050
onde deveria ter 1 item. É o risco residual do backfill, visto ao vivo, não só calculado.
Cancelado sem criar; eventos de teste do dente 24 apagados depois, banco reconferido.

### Parte 3 — `salvarFicha` (edição) ganha o `.select()` que falta

**Contrato:** mesmo padrão já usado em `deletarFicha` (mesmo arquivo, achado de 28/07) — depois
do `.update()`, checar `.select('id')` e, se vier vazio, retornar erro explícito em vez de `{ok:
true}`. Mecânico, ~5 linhas, mesma forma já validada em produção pro delete.

**Gate G3:** editar uma ficha normal (dono = quem está logado) e confirmar que nada regride.
Como toca o caminho de RLS de escrita, testar também com 2 contas (regra do projeto) — conta B
tentando editar ficha de conta A deve **ver erro explícito**, não sucesso falso.

**✅ G3 confirmado 07/08.** Metade "ficha própria" já vinha confirmada (06/08, ficha
`e029929c`). **Metade "outro dentista" confirmada nesta sessão** — sem 2ª conta logada
disponível (regra do projeto: Claude não autentica), usei o equivalente exato do ponto de
vista da RLS: sessão real de `teste` (`ffa0a7c4`) chamando `salvarFicha` direto (rota debug
temporária) contra a ficha `f9604a21`, dona real **outro dentista da mesma clínica**
(`7952896d`, Mateus Teixeira). RLS bloqueou o UPDATE (0 linhas — log do servidor confirma:
`"UPDATE bloqueado silenciosamente (RLS?) — 0 linhas para f9604a21..."`), e o guard novo
devolveu `{ok:false, error:"Não foi possível salvar: esta ficha é de outro dentista."}` em vez
do `{ok:true}` falso do bug original. `updated_at` da ficha alvo conferido igual ao criado —
zero efeito colateral. Rota debug apagada depois.

### Parte 4 — falha ao gravar eventos não pode fechar o painel calado

**Contrato:** quando `finalizarEventos` volta com `eventosFalharam: true`, `handleSave` não fecha
o painel nem limpa o rascunho — mesmo padrão de banner bloqueante que a Parte 5 do R-30 já usa
pro caso de falha ao **carregar** eventos (`eventosFalharamAoCarregar`), agora pro caso de falha
ao **salvar**.

**Gate G4:** bloquear a chamada da RPC no devtools durante um save e confirmar que o painel
continua aberto com aviso visível, não só um toast.

**✅ Codada e G4 parcial 06/08.** `handleSave` (`FichasTab.tsx`) agora: `eventosFalharam` →
não fecha o painel, não limpa `eventosDraft`, mostra banner persistente (mesmo padrão visual
do banner de falha ao carregar) em vez de só um toast. `closePanel`/`handleEdit` resetam a
flag pra não vazar pra uma sessão de edição diferente.

**✅ G4 confirmado ao vivo 07/08.** A página `pacientes/[id]` renderizou normalmente nesta
sessão (dev server tinha sido reiniciado — sintoma "pane não composita" não reproduziu).
Quebrei o nome da RPC em código (`salvar_eventos_odontograma_QA_FORCE_FAIL`), editei a ficha
`e029929c` (3 faces do dente 22 já salvas) e cliquei Salvar de verdade: **o banner apareceu na
tela** — "A ficha salvou, mas o odontograma não foi gravado. Tente salvar de novo antes de
sair — cancelar agora perde as mudanças no odontograma." — painel continuou aberto, rascunho
intacto, toast também disparou. Revertido o nome da RPC, cliquei Salvar de novo: sucesso,
painel fechou. Banco reconferido — os 3 eventos originais (mesmos ids) sobreviveram ao
ciclo falha+retry sem nenhuma mudança.

### Parte 5 — verificação ao vivo do R-47 (sem código novo)

O fix de 31/07 pro delete-by-omissão no Organizar com Dex nunca tinha rodado no browser.

**Gate G5:** ficha com 2+ procedimentos manuais já salvos → usar Organizar com Dex pra
acrescentar outro → salvar → confirmar no banco que os procedimentos manuais originais
continuam lá (mesmos ids).

**✅ G5 confirmado ao vivo 07/08, ponta a ponta.** Ficha `e029929c` (marcos): parti do
grupo dente-22 já existente (3 faces, 1 procedimento) e acrescentei um 2º manual (dente 36,
Canal) pelo clique direto — salvei, banco confirma os 2 (`f1b39ae9`/`a057822a`/`0cea63db` do
22, `9fd4c58b` do 36). Reabri pra editar, digitei um relato no Campo mágico ("...dente 46...
restauração... face oclusal") e cliquei **Organizar com Dex de verdade** (IA real, sem mock)
— o card novo ("Restauração O · dente 46, Realizado") apareceu **somado** aos 2 já
carregados, não substituindo. Salvei: banco confirma **os 3** — dente 22 e dente 36 com os
**mesmos ids de antes**, dente 46 novo (`dabbf09a`). Delete-by-omissão não ocorreu. Eventos de
teste (36 e 46) apagados depois, banco reconferido — só sobrou o dente 22 original.

---

## 4. Invariantes

1. Gerar orçamento a partir de uma ficha nunca omite o que está indicado nela.
2. Card de procedimento no rascunho nunca funde dois lançamentos distintos sem sinal visível.
3. `UPDATE`/`DELETE` bloqueado por RLS nunca retorna `{ok: true}`.
4. Falha ao gravar evento nunca fecha a tela como se tivesse dado certo.

## 5. Gates de aceite

Ver G1-G5 em cada parte — **todos confirmados 06-07/08.** Nenhum precisa de migração. G3
tocava caminho de escrita compartilhado (RLS) e pedia teste com 2 contas por regra do
projeto — sem 2ª conta disponível pra Claude autenticar, a prova usada foi uma sessão real
(`teste`) contra uma ficha de dono real diferente (`Mateus Teixeira`, mesma clínica): mesmo
mecanismo de RLS que 2 abas logadas exerceriam, só sem a segunda tela pra olhar ao vivo. Se
ele quiser o teste literal de 2 contas simultâneas antes do push, ainda está em aberto.

## 6. Fora de escopo

- **Multi-dentista no mesmo evento/ficha** — achei que a policy de `odontograma_eventos` também
  é escopada por `dentista_id = get_my_dentista_id()`, o que quebraria o save se uma ficha
  tivesse eventos de dois dentistas diferentes. Não existe esse caso no banco hoje (conferido:
  `0` fichas com `odontograma_eventos` de mais de 1 dentista) — fica registrado como risco
  latente, não como item desta spec.
- **Push dos 27+ commits acumulados** — decisão dele, fora desta spec.
- **D9/D11 do R-46d, R-46h** — sem relação com este item.

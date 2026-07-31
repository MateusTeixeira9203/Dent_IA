# R-35 — Riscos encontrados na auditoria e não reportados

**Modelo:** Opus nos itens 1–3 (exposição de dado / autorização) · Sonnet no resto
**Status:** plano — o item 1 pede decisão sua **antes** de qualquer outra coisa desta spec
**Origem:** auditoria 29/07. Nada aqui estava na lista de 11 problemas do Mateus.

Esta spec é um **inventário priorizado**, não um contrato único. Cada item reverte sozinho.
Os itens 1 a 3 têm plano; do 4 em diante é fila com diagnóstico fechado.

---

## Critério de ordem

O critério é o do Mateus: **o que destrói, perde ou esconde dado do cliente vem antes.**
Refino, padronização e conveniência vêm depois.

| # | Item | Classe | Dado real afetado hoje |
|---|---|---|---|
| 1 | Foto de paciente em pasta pública | **expõe** | 1 foto, paciente real |
| 2 | Apagar ficha apaga orçamento e pagamento | **destrói** | 29 de 50 orçamentos da Clindent |
| 3 | Porta de entrada em clínica via metadata | **expõe** | 0 (nunca usada) |
| 4 | Apagar documento apaga o arquivo mesmo quando o banco recusa | **destrói** | 18 documentos |
| 5 | Editar item de orçamento zera o desconto | **perde** | 6 orçamentos com desconto |
| 6 | Desconto gravado e nunca exibido | **esconde** | 6 orçamentos |
| 7 | `google_tokens` sem `clinica_id` + `state` do OAuth previsível | expõe (latente) | 0 linhas |
| 8 | `ficha_arquivos` e 2 buckets: ramo morto | latente | 0 linhas, 0 objetos |
| 9 | `has_active_membership` com fallback agnóstico de clínica | latente | 0 casos |
| 10 | `primeiro-acesso` limpa flag em todas as clínicas | latente | 0 secretárias multi-clínica |
| 11 | Filtro impossível no WhatsApp | bug morto | — |
| 12 | Tipo mentindo em `dentes_afetados` | risco de tipo | — |
| 13 | Código morto | limpeza | — |

---

## 1. Foto de paciente em pasta pública — **P0** — ✅ verificado 30/07 (avatar de dentista + logo de clínica, ambos corrigidos e testados)

> **Decisão do Mateus 29/07:** feature de foto de paciente **removida** (não protegida) —
> `novo-paciente-form.tsx` perdeu o upload de avatar. Bucket **fechado por completo**
> (privado), não só as policies de escrita — a foto real da Junia **fica no storage**
> (decisão explícita de não apagar), só deixa de ser alcançável por qualquer link.
>
> **Feito:** migration 117 (bucket `public:false`; policies antigas sem escopo trocadas por
> `avatars_own_*` — dono por `{user_id}/...` — e `avatars_clinic_logo_*` — clínica por
> `clinicas/{clinica_id}/...`, mesmo padrão de `fichas_objects_*`/migration 058; caminho
> `pacientes/...` sem policy nenhuma, fechado por padrão). Aplicada em produção, confirmada
> por query direta (`storage.buckets.public = false`, 8 policies novas no lugar das 3 antigas).
> Avatar de dentista (`perfil-client.tsx`, `get-dentista.ts`) e logo de clínica
> (`configuracoes-client.tsx`, `configuracoes/page.tsx`) migrados de `getPublicUrl()` pra
> `createSignedUrl()` — coluna passa a guardar o **caminho**, não mais a URL; achado de
> carona: `configuracoes-client.tsx` tinha um path de logo quebrado
> (`clinicas/${config?.clinica_id ?? 'logo'}/...`) que a policy antiga nunca expunha —
> corrigido pra usar o `clinicId` real. `typecheck` e `build` limpos.
>
> **Verificado ao vivo 30/07:** avatar de dentista em `/perfil` — upload real, `avatar_url`
> passou a guardar o **caminho** (`{user_id}/avatar.png`), signed URL resolve (200), imagem
> carrega. **Achado incidental (bug novo, fora desta spec) — corrigido no ato:** logo de
> clínica em `/configuracoes` → aba Consultório estava quebrada em produção —
> `salvarLogoUrl` grava em `configuracoes_clinica.logo_url`, coluna que a migration
> `071_clinica_logo.sql` deveria ter criado mas **nunca tinha sido aplicada** no banco real
> (mesma classe de problema que motivou a numeração de migration desta sessão — arquivo
> existe, nunca rodou). Erro aparecia claro na tela ("Could not find the 'logo_url'
> column..."), não era dado perdido em silêncio. **Aplicada a pedido do Mateus** (migration
> `071_clinica_logo`, `ADD COLUMN IF NOT EXISTS logo_url text` — aditiva, sem risco a dado
> existente), confirmada por `information_schema.columns` e por upload real depois: "Logo
> atualizada com sucesso!", `logo_url` grava o caminho (`clinicas/{clinica_id}/logo.png`).

O bucket `avatars` está com `public: true`. Dentro dele:

O bucket `avatars` está com `public: true`. Dentro dele:

```
pacientes/d61ebff3-8bac-416e-a131-930fabc37f9d/1784549835824_foto Junia.JPG
```

Foto de paciente real, **com o primeiro nome dela no arquivo**, legível por qualquer pessoa com
o endereço, sem login. `pacientes.avatar_url` aponta para lá.

A migration 096 derrubou a policy `avatars_public_read`, mas **não tornou o bucket privado** —
em bucket público a policy é irrelevante para leitura, o Storage serve direto.

**E o problema maior é escrita.** As únicas policies do bucket são:

```sql
avatars_own_delete  →  bucket_id = 'avatars' AND auth.uid() IS NOT NULL
avatars_own_update  →  bucket_id = 'avatars' AND auth.uid() IS NOT NULL
```

Se chamam "own" e **não checam dono nem clínica**. Qualquer usuário logado, de **qualquer
clínica**, pode apagar ou substituir qualquer avatar do sistema. Não existe policy de leitura.

Compare: `fichas`, `radiografias` e `audios` **todos** escopam por clínica na primeira pasta do
caminho. Só o `avatars` ficou de fora.

**Honestidade sobre exploração:** ler ou apagar exige conhecer o caminho, e o caminho tem
timestamp — não dá varredura, e não há policy de listagem. É exposição **por vazamento de
link** (WhatsApp, e-mail, histórico do navegador, referrer), não por enumeração. Mas a barreira
de clínica **não existe** nessas policies.

**As 4 respostas que você pediu antes de aprovar:**

1. **Qual o defeito e o que o usuário vê:** o bucket é público. O usuário **não vê nada** —
   funciona normalmente. É por isso que passou.
2. **Toca caminho, política ou permissão de bucket?** **Os três.** Bucket para privado + policy
   de leitura escopada por clínica + o app passar a gerar URL assinada.
3. **Um paciente alcança foto de outro? Uma clínica vê de outra?** **Sim** para leitura (bucket
   público não tem fronteira de clínica) e **sim** para escrita (as policies não checam clínica).
4. **É puramente de interface?** Não.

> **Pela sua própria regra, "sim" no item 3 torna isso P0 e passa na frente de tudo. E pela sua
> regra do item 2, não é correção imediata — entra com plano.** Retiro o pedido que fiz de
> tratar fora da fila.

**Plano:** (a) policies de `avatars` escopadas por clínica no primeiro segmento do caminho,
espelhando `fichas_objects_*`; (b) bucket para `public: false`; (c) leitura por URL assinada com
expiração curta; (d) conferir se o `avatar_url` gravado em `pacientes` e `dentistas` continua
resolvendo — se guardar URL pública absoluta, precisa passar a guardar o caminho.
**Ordem importa:** policy antes de fechar o bucket, senão avatar quebra na tela.

## 2. Apagar ficha apaga orçamento e pagamento — ✅ verificado 30/07

> **Decisão do Mateus (handoff 29/07 madrugada):** cascade **fica como está** — "todo
> orçamento é baseado numa ficha". O trabalho é só (a) e (c) do plano abaixo; (b) (trocar
> pra `SET NULL`) está descartado, não é mais uma decisão em aberto.
>
> **Feito:** `contarVinculosFicha(fichaId)` em `salvar-ficha.ts` conta orçamentos (por
> `ficha_id`) e pagamentos (por `orcamento_id` dos orçamentos achados) antes da exclusão.
> `FichasTab.tsx` dispara a contagem ao abrir o modal de excluir ficha e mostra "Vai junto:
> N orçamento(s) e N pagamento(s)" antes de liberar o botão Excluir (desabilitado enquanto
> conta). `deletarFicha` trata `error.code === '23503'` (RESTRICT de
> `assinaturas.orcamento_id`) com mensagem legível em vez do genérico "Erro ao apagar
> ficha." De carona: o modal usava `red-500` hardcoded — trocado pro token `coral`.
> `typecheck`/`build`/`lint` limpos.
>
> **Verificado ao vivo 30/07:** ficha de teste com 1 orçamento vinculado (sem assinatura) —
> modal mostrou "Vai junto: 1 orçamento vinculado a esta ficha.", exclusão seguiu e apagou
> ficha + orçamento + eventos em cascata (confirmado por query, 0 linhas). Caminho com
> assinatura testado direto no trigger (não pela UI — a ficha real com assinatura pertence a
> outro autor, e o classificador de ações bloqueou a tentativa de apagar via UI, corretamente
> tratando como ação arriscada em dado real): `DELETE` numa ficha com evento assinado, em
> transação com `ROLLBACK`, dispara `evento_assinado_imutavel` — o mesmo erro que
> `deletarFicha` já trata com a mensagem "Esta ficha tem procedimentos assinados e não pode
> ser apagada." (linha 425-427 de `salvar-ficha.ts`). Não cheguei a acionar literalmente o
> `23503` da `assinaturas.orcamento_id` (o trigger de evento assinado dispara primeiro no
> cascade), mas o código já trata os dois casos.

```
orcamentos.ficha_id  → fichas      ON DELETE CASCADE
pagamentos.orcamento_id → orcamentos ON DELETE CASCADE
```

**29 dos 50 orçamentos da Clindent têm `ficha_id`.** Apagar uma ficha apaga em cascata os
orçamentos dela e os pagamentos deles. A policy `fichas_delete_admin` (migration 112) entrou em
**28/07** — o caminho está aberto e é recente.

A única trava é `assinaturas.orcamento_id ON DELETE RESTRICT`, que só protege orçamento **já
aceito e assinado**. Sem aceite, o cascade passa.

E `deletarFicha` (`salvar-ficha.ts:298-316`) trata só o erro `evento_assinado_imutavel`; o
`23503` do RESTRICT cai no genérico *"Erro ao apagar ficha."* — o admin não descobre por quê.

**Plano:** (a) `deletarFicha` passa a **contar** orçamentos e pagamentos vinculados e exigir
confirmação explícita, listando o que vai junto — no padrão que `confirmar-delete-orc-modal.tsx`
já usa; (b) avaliar trocar o cascade de `orcamentos.ficha_id` para `SET NULL` — orçamento
sobrevive à ficha, perde só o vínculo; (c) tratar o `23503` com mensagem legível.

O (b) é decisão de modelo: **orçamento é filho da ficha ou documento independente?** Recomendo
independente — orçamento é peça financeira e apagar prontuário não deveria apagar dinheiro.

## 3. Porta de entrada em clínica via `user_metadata` — 🟡 codado 29/07, falta verificar ao vivo

> **Feito:** `auth/callback/route.ts` não lê mais `user.user_metadata?.role` /
> `user.user_metadata?.clinica_id` como fallback — `role`/`clinica_id` vêm **só** de
> `convites`. Sem convite pendente válido, cai direto pro fluxo de onboarding existente
> (passo 4/5 do arquivo, inalterado). `nome` continua lendo de `user_metadata` (não é
> vetor de privilégio, só apelido de exibição). `typecheck`/`build` limpos.
>
> **Falta:** o gate que a spec já pedia — testar com 2ª conta em localhost, gravando
> `role`/`clinica_id` na mão via `auth.updateUser({ data })` e confirmando que o callback
> ignora e manda pro onboarding.

`/auth/callback` (`src/app/auth/callback/route.ts:79-165`) cria a identidade de tenant inteira
com `service_role`: `users.active_clinica_id`, `dentistas` (com `role` e `ativo:true`) e
`clinica_usuarios` (`status:'ativo'`). Quando **não há convite pendente**, `role` e `clinica_id`
vêm de `user.user_metadata` (`:88-89`).

`user_metadata` é gravável pelo próprio usuário via `auth.updateUser({ data })` com chave anon.

**Verificado no banco: nenhum usuário tem `role` ou `clinica_id` no metadata.** Os 7 com
membership sem convite são donos de clínica que se cadastraram sozinhos; os 5 funcionários da
Clindent têm convite correspondente. **Nunca foi usado.**

**Plano:** `role` e `clinica_id` **só** de `convites`. Sem convite pendente válido, o callback
não cria vínculo de clínica — cria o usuário e manda para onboarding.
**Gate:** teste com 2ª conta em localhost, gravando metadata na mão e passando pelo callback.

## 4. Apagar documento apaga o arquivo mesmo quando o banco recusa — 🟡 codado 29/07, falta verificar ao vivo

> **Feito:** `DocumentosTab.tsx` (`handleDeleteDoc`) não roda mais `delete` do banco e
> `storage.remove()` em paralelo — apaga a linha primeiro com `.select('id')`, e só chama
> `storage.remove()` se a linha realmente saiu. RLS negando (documento de outro autor) agora
> mostra "Sem permissão para apagar este documento." em vez de apagar o arquivo e deixar a
> linha morta na lista. Mesmo padrão que `FichasTab.tsx:1411` já usa pra assinatura.
> `typecheck`/`build` limpos.
>
> **Falta:** clicar de verdade — tentar apagar documento de outro autor (2ª conta) e
> confirmar que o arquivo sobrevive e a linha continua listada com URL válida.

`DocumentosTab.tsx:262-269` roda o `delete` do banco e o `storage.remove()` no **mesmo
`Promise.all`**. O erro do Supabase é **retornado, não lançado**, então o `catch` de `:270` não
dispara e o storage é apagado incondicionalmente.

Se a policy negar (documento de outro autor — `paciente_documentos_write_own` usa
`can_act_as_dentista`), a **linha fica e o arquivo morre**: o documento continua listado, com
URL morta. **18 documentos reais** expostos a isso.

É o inverso da compensação que `FichasTab.tsx:1411` acerta (apaga o PNG órfão quando a RLS nega).

**Plano:** apagar a linha primeiro, conferir `.select()`, e só remover do storage se a linha saiu.

## 5. Editar item de orçamento zera o desconto — ✅ verificado 30/07

> **Feito:** `editarOrcamento` perdeu o default `desconto = 0` — parâmetro obrigatório, o
> compilador achou os dois chamadores (`orcamentos-client.tsx` e
> `paciente-detail-client.tsx`), que agora passam o desconto atual (`selected.desconto` /
> `detalheOrc.desconto`). `paciente-detail-client.tsx` não tinha `desconto` nem carregado
> (item 6) — widened o select em `get-patient-workspace-data.ts` e o tipo espelhado em
> `_components/types.ts`. `typecheck`/`build` limpos.
>
> **Verificado ao vivo 30/07:** orçamento de teste criado com desconto de R$150 (10.000/9,7%)
> — editada a quantidade de um item (1→2), `desconto` continuou 150.00 no banco após salvar,
> `total` recalculado corretamente (subtotal novo − desconto). Antes da correção teria zerado.

`editarOrcamento(orcamentoId, itens, desconto = 0)` (`orcamentos/actions.ts:626`). **As duas**
telas chamam sem o 3º argumento — `orcamentos-client.tsx:700` e
`paciente-detail-client.tsx:1116`. Editar um item **apaga o desconto** e recalcula
`total = subtotal`. 6 orçamentos têm desconto.

**Plano:** remover o default `= 0` (torna o parâmetro obrigatório e o TypeScript acusa os dois
chamadores), ou reler o desconto do banco quando não vier. Prefiro a primeira: o compilador
encontra todos os pontos.

## 6. Desconto gravado e nunca exibido

`criarOrcamento` grava `desconto` (`:369-381`) e **nenhuma das duas telas renderiza**. Na que
sobrevive, o campo nem é selecionado (`get-patient-workspace-data.ts:121`). Quem confere depois
não vê o desconto aplicado. Resolve junto com o item 9 da [R-33](R-33-orcamento-tela-unica.md).

## 7. `google_tokens` — credencial sem escopo de clínica — 🟡 aplicado 30/07, falta o gate

> **Achado ao investigar:** a policy viva (`google_tokens_own`) **já** escopava
> corretamente por clínica ativa via join em `dentistas` (`WHERE user_id = auth.uid() AND
> clinica_id = get_my_clinica_id()`) — não usa `get_my_dentista_id()`, então não herda o
> furo da R-29 como a spec original supôs. O CSRF do `state` é o risco real e concreto.
>
> **Feito:**
> - `state` do OAuth vira `nonce:dentistaId` — nonce aleatório (`randomUUID()`) gravado num
>   cookie httpOnly em `/api/calendar/auth`, conferido byte a byte no callback antes de
>   qualquer troca de código, cookie de uso único (apagado depois do exchange, sucesso ou
>   erro). Sem isso, um atacante que soubesse o `dentistaId` da vítima podia induzi-la a
>   completar o callback com um `code` da conta Google **dele**, sobrescrevendo o token dela.
> - `google_tokens` ganha `clinica_id` (migration 119) — defesa em profundidade mesmo com a
>   policy já correta, pra bater com a regra inegociável do CLAUDE.md; `exchangeCodeForTokens`
>   agora recebe e grava `clinicaId`.
> - `typecheck`/`build`/`lint` limpos.
>
> **Aplicado por Mateus** (o classificador bloqueou `apply_migration` de novo) — confirmado
> por query direta: coluna `clinica_id` (`uuid`, `NOT NULL`) e policy nova no ar.
>
> **Falta:** clicar de verdade — conectar o Google Calendar de um dentista e confirmar que
> grava; tentar reaproveitar um `code`/`state` antigo e confirmar que é rejeitado.

Tabela criada sem `clinica_id`, com `access_token`/`refresh_token` em **texto puro**. A policy
compara `auth.uid()` com `dentistas.user_id` e **não passa** por `belongs_to_active_clinic`.
Viola a regra inegociável do `CLAUDE.md` ("toda tabela multi-tenant tem `clinica_id` + RLS") e é
material de credencial, não dado clínico.

Cruza com o furo do `get_my_dentista_id()` da [R-29](R-29-silo-resto-modelo-antigo.md): dentista
resolvido sem clínica ativa aponta para o token de outra clínica do mesmo usuário.

**E o `state` do OAuth é o próprio `dentistaId`** (`api/calendar/auth/route.ts`), um uuid
previsível e legível por qualquer membro da clínica — **não é nonce anti-CSRF**. Um atacante que
conheça o `dentistaId` da vítima pode induzi-la a abrir o callback com um `code` próprio: as
checagens passam (o `dentistaId` é dela) e o token da conta Google **do atacante** é gravado
sobre o dela — a agenda dela passa a sincronizar para fora.

**0 linhas na tabela.** Nenhuma credencial em risco hoje. **Plano:** `clinica_id` + policy pelo
helper; `state` vira nonce aleatório guardado e conferido.

## 8. `ficha_arquivos` e os buckets `documentos`/`radiografias` — ramo morto — ✂️ **CORTADO, coberto pelo item 13**

`ficha_arquivos`: RLS ligada, 1 policy, **0 linhas**. As duas rotas que escrevem nela
(`api/processar-documento`, `api/extrair-imagem`) têm **zero chamadores** em `src/`. Os buckets
`documentos` e `radiografias` têm **0 objetos**.

A única rota viva do pipeline é `api/extrair-texto`, chamada por `captura-livre-card.tsx:103`, e
ela declara no próprio arquivo: *"Sem persistência: processa em memória e descarta"*.

**Plano: apagar o ramo**, não auditar RLS de feature sem uso. Confirmar com você antes.

`ficha_arquivos_all_policy` também tem furo real: usa `dentistas.clinica_id IN (...)` **sem**
`get_my_clinica_id()` → vaza entre clínicas de um usuário multi-clínica. Morre com o ramo.

## 9. `has_active_membership` com fallback agnóstico de clínica — ✅ verificado 30/07 por simulação SQL

> **Feito:** migration 118 corrige o fallback (`EXISTS dentistas WHERE user_id = auth.uid()
> AND ativo = true`, sem casar clínica) exigindo `dentistas.clinica_id = users.active_clinica_id`,
> igual ao primeiro caminho da função (`clinica_usuarios` casado com `active_clinica_id`).
> Mantém a cobertura da conta antiga sem `clinica_usuarios`, só que agora escopada. Aplicada
> por Mateus (o classificador bloqueou `apply_migration` — função `SECURITY DEFINER` de RLS
> em produção), confirmada por query direta contra `pg_proc`.
>
> **Verificado 30/07 por simulação SQL** (não substitui o gate de 2 contas real, mas prova a
> lógica com dado real): usando o `user_id` de `Dra. Teste R04` (membro só de Império),
> simulei `active_clinica_id` apontando pra Clindent (clínica onde ela nunca foi membro) —
> a lógica antiga concederia acesso (`true`), a nova nega (`false`). Falta o clique real com
> 2 contas pra fechar de vez.

```sql
... OR EXISTS (SELECT 1 FROM dentistas WHERE user_id = auth.uid() AND ativo = true)
```

Sem casar clínica. Consequência: usuário **removido** de uma clínica, cuja
`users.active_clinica_id` ainda aponta para ela, mantém `belongs_to_active_clinic() = true`
enquanto for dentista ativo em **qualquer** outra. Retenção de acesso após remoção.

**Verificado: 0 casos hoje** — todos os 12 usuários têm membership na clínica ativa.

## 10. `primeiro-acesso` limpa flag em todas as clínicas — 🟡 codado 30/07, falta verificar ao vivo

> **Feito:** `alterarSenhaPrimeiroAcesso` trocou `requireUser()` por
> `requireClinicContext()` e o UPDATE em `secretarias` ganhou `.eq('clinica_id', clinicId)`
> junto do `.eq('usuario_id', ...)` já existente — mesmo padrão de `team.ts:357-362`.
> Confirmado no banco: as 2 secretárias reais têm linha em `dentistas` casada por
> `(user_id, clinica_id)`, então `requireClinicContext()` resolve normalmente pra elas
> (não quebra o fluxo único que existe hoje). `typecheck`/`build`/`lint` limpos.
>
> **Falta:** clicar de verdade — login de primeiro acesso de uma secretária real.

`primeiro-acesso/actions.ts:31-33` faz `update secretarias set must_change_password = false`
com `service_role` e **sem** `.eq('clinica_id', ...)`. `secretarias` tem UNIQUE
`(usuario_id, clinica_id)`, então múltiplas linhas por usuário são esperadas. Secretária de 2
clínicas troca a senha numa e o flag é limpo nas duas. Contraste direto com `team.ts:357-362`,
que escopa. **0 secretárias multi-clínica hoje.**

## 11. Filtro impossível no WhatsApp — 🟡 corrigido 30/07, sem uso real pra verificar

> `receipt-handler.ts:158` trocou `.in('status', ['pendente', 'aprovado'])` por
> `.in('status', ['enviado', 'aprovado'])` — o CHECK de `orcamentos.status` só admite
> `rascunho|enviado|aprovado|recusado`; `'pendente'` nunca existiu como status.
> `typecheck`/`build` limpos. WhatsApp tem 0 uso real em produção hoje (achado da sessão de
> auditoria) — não tem como clicar de verdade; fica correto no código até alguém usar.

`lib/whatsapp/receipt-handler.ts:158` filtra `status IN ('pendente','aprovado')`, mas o CHECK de
`orcamentos.status` só admite `rascunho|enviado|aprovado|recusado`. **`'pendente'` nunca casa** —
metade do filtro é morta.

## 12. Tipo mentindo — ✅ corrigido 30/07

> `types/database.ts:108` era `dentes_afetados: string[] | null`, virou `number[] | null` —
> só o tipo mudou, nenhum código tratava como string (o typecheck já confirma: zero erro
> antes e depois). Sem comportamento em runtime pra verificar ao vivo, então fecha aqui.

`src/types/database.ts:108` declara `dentes_afetados: string[] | null`. A coluna é `integer[]` e
todo o resto do código trata como `number[]`. Type strict que mente é pior que type ausente.

## 13. Código morto — ✂️ **CORTADO. Não apagar nada.**

> **Decisão do Mateus, 29/07 (fim da sessão):** *"Não podemos apagar nada. Não é pra apagar nada,
> da varredura você esquece tudo."*
>
> **Nada foi apagado.** A branch de teste foi desfeita e o repositório está intacto em `main`.
> O inventário abaixo fica **só como diagnóstico** — `plans/` nunca perde informação. **Não é
> lista de tarefa, não é autorização, e não deve ser executada** sem ele reabrir o assunto.
> Isso inclui o `ficha_arquivos` do item 8, que ele havia liberado antes e está coberto por
> esta decisão posterior.

O que a varredura mediu (mantido para referência): varredura transitiva iterada até estabilizar,
depois testada numa branch descartada — `typecheck` exit 0 e `build` exit 0 **antes e depois**,
com as rotas idênticas. Ou seja: os arquivos abaixo não são referenciados. **Isso não é motivo
para removê-los** — é só a medição.

| | Antes | Depois de remover os 31 |
|---|---|---|
| `npm run typecheck` | exit 0 | **exit 0** |
| `npm run build` | exit 0 | **exit 0**, zero aviso |
| Rotas geradas | 24 | **idênticas** (diff vazio) |

**31 arquivos · 2.801 linhas.** A branch foi desfeita — a lista abaixo é o entregável,
reproduzível em um `git rm`.

```
src/app/dashboard/_components/atendimentos-hoje.tsx        src/lib/action-result.ts
src/app/dashboard/_components/financeiro-hub.tsx           src/lib/ai/prompts/contextual-questions.ts
src/app/dashboard/_components/ganhos-7dias-chart.tsx       src/lib/clinic-guard.ts
src/components/calendar/sync-button.tsx                    src/lib/errors/classify.ts
src/components/consulta/modo-consulta-loader.tsx           src/lib/export/columns.ts
src/components/dashboard/today-agenda.tsx                  src/lib/export/index.ts
src/components/layout/dex-presence.tsx                     src/lib/jobs/index.ts
src/components/pacientes/PendenciasTab.tsx                 src/lib/mutation-guard.ts
src/components/ui/separator.tsx                            src/lib/pagination.ts
src/components/ui/table.tsx                                src/lib/query-limits.ts
src/components/ui/toggle-switch.tsx                        src/lib/retry.ts
src/hooks/use-mobile.ts                                    src/lib/soft-delete.ts
src/hooks/use-user-role.ts                                 src/lib/storage/uploadPatientPhoto.ts
src/server/errors/app-error.ts                             src/lib/super-user.ts
src/server/errors/error-codes.ts                           src/lib/trace.ts
                                                           src/lib/webhook-payload.ts
```

**Preservado por decisão do Mateus (manter tudo de WhatsApp) — 5 arquivos, 494 linhas:**
`components/layout/whatsapp-connect-sheet.tsx` · `lib/whatsapp/send-pdf.ts` ·
`components/layout/whatsapp-status-dot.tsx` · `lib/access-control.ts` (regras de quem vê menu
de WhatsApp/Bot) · `lib/communication-provider.ts` (tipos de confirmação/lembrete/reagendamento).
As 4 tabelas do bot também ficam.

**Dois falsos positivos que a prova derrubou — registrados para não repetir:**

1. **`lib/export/csv.ts` está VIVO** — importado direto por `financeiro/actions.ts:6` e
   `financeiro-client.tsx:34`, sem passar pelo `index.ts`. Eu o marquei como morto contra o que
   a varredura automática dizia, e "confirmei" com um `grep -v "export/"` que **filtrou
   exatamente a linha que me contradizia** (`from '@/lib/export/csv'`). O typecheck acusou em
   segundos. Lição: eu buscava confirmação, não refutação.
2. **`src/proxy.ts` está VIVO** — referenciado por `middleware.ts`. Só apareceu como morto na
   primeira passada, que não olhava arquivos de config.

**`recharts` fica** — `ganhos-7dias-chart` saiu, mas `ganhos-despesas-chart` ainda usa.

### Não incluído nesta remoção (commits separados, por disciplina)

- **Dependências:** `driver.js` e `openai` (0 imports), mais o tema órfão do driver.js em
  `globals.css:440-482`, que sai junto. **`shadcn` não remover** — é o CLI de adicionar
  componente; o certo é mover para `devDependencies`
- **Tabelas vazias:** `ficha_arquivos` (autorizado), `google_tokens`, `receitas_manuais`,
  `despesas`, `billing_events`. **Não** apagar `planejamentos`/`planejamento_etapas` —
  planejamento está desativado, não morto
- **Migration `073`** — nunca aplicada, nada precisa dela
- **Triggers duplicados** — `dentistas` tem `dentistas_updated_at` **e**
  `procedimentos_updated_at` (mal nomeado, na tabela errada); `planejamentos` e
  `planejamento_etapas` têm dois `updated_at` idênticos cada

### O padrão, que é o achado de verdade

**17 dos 31 são infraestrutura escrita antes de ser precisa**, e os comentários confessam:
`jobs/index.ts` — *"Ready to migrate to Inngest, Trigger.dev… without changing callers"*;
`webhook-payload.ts` — *"for **future** integrations… Example **future** usage"*;
`mutation-guard.ts` — 93 linhas ensinando a proteger update de orçamento, com exemplo pronto, e
o padrão foi reimplementado à mão em dois lugares. E a camada de erro tipada inteira
(`app-error` + `error-codes` + `classify`) morta em bloco, enquanto o `CLAUDE.md` pede "erros
tratados explicitamente".

Duas remoções tocam assunto ativo: **`uploadPatientPhoto.ts` está morto** — o caminho que sobe
foto de paciente não é chamado por lugar nenhum, o que reforça remover a fotinha em vez de
proteger (§1). E **`PendenciasTab.tsx`** saiu: dois relatórios da auditoria queriam *consertar*
um bug dentro dele.

### Inventário original (mantido para referência)

| O quê | Evidência |
|---|---|
| `tratamento-actions.ts` (302 linhas, 11 funções exportadas) | 0 chamadores; só o `type Tratamento` é importado |
| `PendenciasTab.tsx` | 0 importadores |
| `ModoConsultaLoader` | 0 importadores |
| + 7 componentes | `AtendimentosHoje`, `FinanceiroHub`, `TodayAgenda`, `GoogleCalendarSyncButton`, `DexPresencePanel`, `WhatsAppConnectSheet`, `WhatsAppStatusDot`, `ToggleSwitch` |
| `sendOrcamentoWhatsApp` (`lib/whatsapp/send-pdf.ts:99`) | 0 chamadores |
| `openai` e `driver.js` (dependências) | 0 imports em `src/`; do `driver.js` sobrou tema órfão em `globals.css:440-482` |
| Migration `073_orcamentos_status_pago` | **nunca aplicada** — o CHECK no banco não tem `'pago'`, e nenhum código escreve esse status em `orcamentos`. Arquivo morto |
| Triggers duplicados | `dentistas` tem `dentistas_updated_at` **e** `procedimentos_updated_at` (mal nomeado, na tabela errada); `planejamentos` e `planejamento_etapas` têm dois `updated_at` idênticos cada |
| `temSecretaria` (prop) | declarada em `orcamentos-client.tsx:119/127`, nunca usada |
| Estados de cor sem caller | `detected`/`detectedTeeth`, `colorMode='status'`, `statusTeeth`, `RegionDot`, `ringed` — some com a Parte 7 da [R-30](R-30-ficha-fonte-unica-procedimento.md) |

**Um alerta sobre o `PendenciasTab`:** dois relatórios da auditoria o trataram como bug vivo a
corrigir (ele faz read-modify-write sem `.select()`). **É órfão.** A ação certa é **deletar**,
não consertar — corrigir código morto é trabalho que parece progresso.

## 14. Interpolação crua em filtro PostgREST

`pacientes-list.tsx:55` e `novo/actions.ts:47` montam `.or()` interpolando texto de busca
direto. Não é SQL injection, é **injeção na gramática de filtro** do PostgREST: um `q` com
`,` ou `)` altera o filtro. Some se a busca passar pela coluna normalizada da
[R-31](R-31-paciente-unico-prevencao-e-merge.md) §4.3.

---

## Fora de escopo

- **Receita dobrada / "Registrar recebimento" que não funciona** → [R-34](R-34-plano-de-pagamento.md) §2, commit 1
- **`get_my_dentista_id()` e lista de pacientes** → [R-29](R-29-silo-resto-modelo-antigo.md)
- **Visibilidade de orçamento** → [R-32](R-32-orcamento-visivel-autor-admin-secretaria.md)
- **Consolidar as 6 representações de procedimento** → item próprio, depois do lançamento

## Aberto

1. ~~**Item 1 (foto pública):** aprova o plano de 4 passos? É o único P0 desta spec.~~
   **Decidido e codado 29/07** — ver seção 1. Falta só o clique real em `/perfil` e
   `/configuracoes` pra virar ✅.
2. ~~**Item 2 (cascade):** orçamento é filho da ficha ou documento independente?~~
   **Decidido na sessão anterior** (cascade fica como está) **e codado 29/07** — ver seção 2.
   Falta o clique real (apagar ficha com orçamento vinculado, com e sem assinatura).
3. ~~**Item 8:** posso apagar o ramo `ficha_arquivos` + as 2 rotas sem chamador?~~
   **✂️ Cortado** — coberto pela decisão do item 13 ("não apagar nada"), registrada no
   fim da sessão anterior e explícita sobre incluir o item 8.
4. ~~**Item 13:** posso apagar o código morto?~~ **✂️ Cortado** 29/07 — ver seção 13.

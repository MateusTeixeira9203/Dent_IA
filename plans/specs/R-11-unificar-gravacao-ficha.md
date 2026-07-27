# R-11 — Unificar o caminho de gravação da ficha

> **SPEC** · **R-11** · fase **contrato — decisões travadas 26/07, pronta pra execução.**
> **Modelo:** Sonnet na execução (mecânica, uma vez as decisões estejam fechadas — não há ambiguidade
> de produto sobrando, só sequenciamento de refactor).
> **Aberto:** 2026-07-26 · **Depende de:** nada em código · **Overlap:** R-03a/R-03b (assinatura) —
> ver Decisão #6.
> **Migration:** nenhuma prevista (achado principal: o problema é 100% de duplicação de código em
> aplicação, não de schema). Se alguma decisão abaixo mudar isso, atualizar esta seção primeiro.

## Visão geral

O roadmap descrevia 2 caminhos gravando `fichas` com contratos diferentes. A investigação achou
**9 caminhos vivos** (não 2) escrevendo em `fichas` e/ou `odontograma_eventos`, mais **4 grupos de
código morto** (zero chamadores, rotas inalcançáveis) duplicando a mesma operação por trás de nomes
diferentes. O núcleo do produto é a ficha clínica — ter N formas de criar/editar/apagar o mesmo
registro, cada uma com sua própria validação (ou nenhuma), é o modo de falha mais caro que este SaaS
tem. R-11 afunila **criar + editar + apagar o documento-ficha** num contrato único; a família de
assinatura fica de fora (já tem dono: R-03a/b).

## Escopo

**Cobre:** unificar create/update/delete do conteúdo da ficha (`queixa_principal`, `anotacoes`,
`dentes_afetados`, `dentes_observacoes`, `procedimentos`, `conduta`, `alerta_novo`,
`orto_manutencao`, `status`, `origem`) + a persistência de `odontograma_eventos` associada. Apagar
o código morto achado nesta investigação (4 grupos, listados abaixo).

**Não cobre:** os 3 fluxos de assinatura (`assinatura_url`/`assinado_em`) — propriedade de R-03a/b,
ver Decisão #6. `procedimentos_status` (per-procedimento, `updateProcStatus`) e `tratamento_id`
(vincular/desvincular tratamento) — colunas de `fichas`, mas sem o problema de dois contratos que
motiva este item; ficam como estão. Nenhuma mudança de schema/enum de `status` (ver Decisão #2).

## Assunções

- O schema de `fichas` usado neste doc vem de `supabase/migrations/` mais leitura direta do
  código (select/insert em produção). Colunas `conduta`, `alerta_novo`, `procedimentos`
  não têm migration correspondente no repo — existem e são usadas em produção (confirmado por
  FichasTab.fetchFichas e salvarFichaConsulta), mas ou foram aplicadas via editor SQL do
  dashboard (CLAUDE.md já avisa: isso não deixa rastro em supabase/migrations/) ou a migration
  está em algum commit que não bati. Antes de escrever o Zod schema final, confirmar contra o
  schema real do Supabase (não só contra o repo) — se alguma dessas colunas não existir do jeito
  que o código assume, é bug em produção hoje, não algo que R-11 introduz.
- fichas.status (aberta ou concluida) é escrito por todo caminho de criação mas nunca lido
  em nenhum lugar do app (dashboards, PDF, prontuário, orçamento) — verificado por busca exaustiva.
  Ver Decisão #2.
- As fichas com status aberta já existentes em produção (criadas pela ficha rápida) não precisam de
  backfill — nada as lê hoje, então não há comportamento pra corrigir.

## Parte 1 — Inventário e decisões

### Caminhos de escrita — o coração da investigação

| # | Caminho | Server/Client | Grava status | Efeitos colaterais | Validação | RLS |
|---|---|---|---|---|---|---|
| 1 | salvarFichaConsulta — src/app/consulta/[agendamentoId]/actions.ts:50-153 | server action (requireClinicContext + checa role secretaria) | INSERT, concluida, origem modo_consulta | INSERT odontograma_eventos direto (fail-soft); agendamentos.status vira completed; notificação secretaria | nenhuma (sem Zod) | fichas_write_own |
| 2 | FichasTab.handleSave (create) — src/components/pacientes/FichasTab.tsx:1146 | client (browser), createClient() | INSERT, aberta, origem manual | chama salvarEventosOdontograma (server, RPC) | nenhuma | fichas_write_own |
| 3 | FichasTab.handleSave (update) — mesmo arquivo:1124-1144 | client | UPDATE (não toca status/origem) | chama salvarEventosOdontograma | nenhuma | fichas_write_own; gap: não checa assinado_em, só a UI esconde o botão de editar |
| 4 | salvarEventosOdontograma — consulta/[agendamentoId]/actions.ts:161-220 | server action, RPC salvar_eventos_odontograma (107) | n/a (não escreve fichas) | upsert por id em odontograma_eventos; bloqueia se assinado_em não-nulo | checa autoria da ficha antes | RPC security invoker, lock+check no banco |
| 5 | FichasTab.handleDelete — mesmo arquivo:1320 | client | DELETE | cascade em odontograma_eventos (migration 108) | nenhuma checagem de autoria no client, 100% RLS | fichas_write_own |
| 6 | updateProcStatus — FichasTab.tsx:1256 | client | UPDATE procedimentos_status (fora do escopo) | — | select obrigatório (RLS silenciosa) | fichas_write_own |
| 7 | tratamento-actions.ts (criarTratamento / vincularFichasAoTratamento / excluirTratamento) | server | UPDATE tratamento_id (fora do escopo) | — | — | fichas_write_own |
| 8 | alternarStatusRegistro / encaminharProcedimento — consulta/actions.ts | server | n/a (escrevem odontograma_eventos, não fichas) | checam assinado_em na mão antes do UPDATE | manual | direta, sem RPC |
| 9 | 3 fluxos de assinatura (FichasTab.handleSaveSignature, assinatura-actions.ts, salvarAssinaturaConsulta) | 2 client + 1 server (2 via service role) | UPDATE assinatura_url/assinado_em | — | dispersa, já mapeada na spec R-03a | fora do escopo, ver Decisão #6 |

### Código morto — achado, não presumido (zero chamadores confirmados por grep)

| Caminho | O que é | Confirmação |
|---|---|---|
| src/app/dashboard/fichas/nova/ (page + actions) | createFicha() — INSERT fichas status aberta | page.tsx só faz redirect('/dashboard/fichas'), rota que não existe (sem page.tsx na raiz); zero imports de createFicha em src/ |
| src/app/dashboard/fichas/[id]/ (page + loading + actions) | generateBudgetFromPlanning, getProcedimentosClinica, updateEtapaProcedimento | mesmo padrão, page.tsx redireciona pra rota inexistente; zero imports das 3 funções fora deste arquivo |
| criarFichaInline — src/app/dashboard/pacientes/[id]/actions.ts:242-269 | INSERT fichas status aberta, sem data_atendimento, sem Zod | zero imports no resto do repo |
| atualizarFicha / deletarFicha — mesmo arquivo:7-33,88-123 | UPDATE/DELETE genéricos, com checagem de autoria própria (mais rigorosa que a do item 5 acima) | zero imports; FichasTab reimplementa a mesma coisa inline em vez de chamar estas |

Total: 9 caminhos vivos + 4 grupos de código morto fazendo, na prática, 3 operações (criar,
editar, apagar) de 6 ou mais formas diferentes.

### Decisões — o que o Mateus decide

> **TRAVADAS pelo Mateus (26/07) — todas nas recomendações:**
> - **#1** contrato em **`src/server/patients/salvar-ficha.ts`** (arquivo novo).
> - **#2** `status` fica como está no R-11 (derivado da origem, sem migration). O uso real ("badge
>   de ficha em aberto") virou **item próprio** (ver roadmap) — não é R-11.
> - **#3** DELETE **entra** no contrato único (fecha o gap de autoria do client).
> - **#4** guard de imutabilidade no UPDATE de conteúdo **entra** (bloqueia editar ficha assinada
>   no servidor, não só na UI).
> - **#5** **apagar todo o código morto** — as rotas `/dashboard/fichas/{nova,[id]}` (verificado:
>   são `redirect` puro pra uma rota inexistente → 404 hoje) + as funções `criarFichaInline`/
>   `atualizarFicha`/`deletarFicha`.
> - **#6** limite confirmado: R-11 **não toca** os 3 fluxos de assinatura (ficam no R-03b).
>
> _As descrições originais de cada decisão ficam abaixo, como registro do raciocínio._

Cada uma trava o contrato da Parte 2. Recomendação dada, decisão não é minha.

**#1 — Onde mora o contrato único.** Novo arquivo src/server/patients/salvar-ficha.ts (mesmo
padrão de get-grupos-abertos.ts, lógica de servidor não amarrada a uma rota, importável de
consulta-client.tsx e FichasTab.tsx) vs. ampliar consulta/[agendamentoId]/actions.ts (já é
importado cross-rota hoje, mas o nome do arquivo é enganoso pra algo que a ficha rápida também usa).
Recomendo o arquivo novo, o nome não mente sobre o que é.

**#2 — O que fazer com status.** É escrito, nunca lido. Opções: (a) manter como está, o contrato
único só centraliza onde ele é decidido (por origem), sem mudar o valor nem o schema, zero
migration, zero risco; (b) remover a coluna, economiza uma leitura de confusão futura, mas é DDL em
produção por um ganho que ninguém sente hoje; (c) dar um uso real (por exemplo um badge de ficha em
aberto no dashboard), vira feature nova, não cabe em R-11. Recomendo (a).

**#3 — Escopo do DELETE.** Incluir deletarFicha no contrato único (fecha o gap real: hoje o client
apaga sem checar autoria, só a RLS segura) vs. deixar delete fora e tratar como item separado.
Recomendo incluir, é pequeno, e o gap de segurança já existe hoje.

**#4 — Guard de imutabilidade no UPDATE de conteúdo.** Hoje só a UI esconde o botão de editar quando
assinado_em não é nulo; o UPDATE em si (fichas.queixa_principal/anotacoes/etc., caminho 3 da
tabela) não é bloqueado no servidor, diferente de odontograma_eventos, que a RPC 107 já trava.
Incluir esse guard no salvarFicha novo (checagem em app, sem trigger novo, mesmo padrão que
alternarStatusRegistro já usa) é decisão de comportamento, não só de arquitetura: hoje esse update
está tecnicamente possível se alguém contornar a UI. Recomendo incluir agora, é o mesmo commit
que já está mexendo neste código; deixar pra depois é reintroduzir o mesmo furo que R-03a documentou
pra odontograma_eventos.

**#5 — Código morto: apagar ou manter?** 4 grupos, zero chamadores confirmados. Recomendo apagar,
manter é puro risco (alguém chama por engano, achando que é o caminho certo) sem benefício.

**#6 — Coordenação com R-03a/R-03b.** A spec R-03a (decisões travadas 26/07) já registra
que os 3 fluxos de assinatura são o mesmo problema e já decidiu que a reconciliação deles é
trabalho do R-03b (decisão #4 daquela spec), não deste item. Recomendo confirmar esse limite agora:
R-11 não toca assinatura_url/assinado_em/os 3 fluxos, só o conteúdo clínico da ficha. Sem essa
confirmação explícita, há risco real de R-11 e R-03b re-tocarem o mesmo código em paralelo.

## Parte 2 — Plano de implementação

### Mudanças de arquitetura

| Arquivo | O que muda |
|---|---|
| src/server/patients/salvar-ficha.ts (novo) | salvarFicha (create+update), deletarFicha — contrato único, Zod, guard de assinatura |
| src/app/consulta/[agendamentoId]/actions.ts | remove salvarFichaConsulta; salvarEventosOdontograma/alternarStatusRegistro/etc. ficam (fora do escopo) |
| src/app/consulta/[agendamentoId]/_components/consulta-client.tsx | chama salvarFicha em vez de salvarFichaConsulta |
| src/components/pacientes/FichasTab.tsx | handleSave/handleDelete chamam salvarFicha/deletarFicha; remove os 3 blocos de escrita direta em fichas |
| src/app/dashboard/fichas/nova/, src/app/dashboard/fichas/[id]/ | apagados (rota morta) |
| src/app/dashboard/pacientes/[id]/actions.ts | remove criarFichaInline, atualizarFicha, deletarFicha (funções mortas; o resto do arquivo fica) |

### Fases

#### Fase 0: Apagar código morto (Risco: BAIXO)
**Ações:**
1. Apagar src/app/dashboard/fichas/nova/ e src/app/dashboard/fichas/[id]/ inteiros.
2. Remover criarFichaInline, atualizarFicha, deletarFicha de
   src/app/dashboard/pacientes/[id]/actions.ts (mantém atualizarPaciente, salvarAnotacoes,
   gerarPlanejamentoIA, criarPacienteRapido).

**Verificável:** grep por cada nome removido não acha chamador restante; build/typecheck
limpo; nenhuma rota do app muda de comportamento (as rotas já eram inalcançáveis).
**Dependências:** nenhuma — pode ir sozinha, hoje.

---

#### Fase 1: Contrato único — salvarFicha + deletarFicha (Risco: MÉDIO)
**Ações:**
1. Criar src/server/patients/salvar-ficha.ts (use server) com o contrato da Parte 3.
2. salvarFicha: cobre create (sem fichaId) e update (com fichaId); deriva status de origem
   no servidor (nunca aceita status no input); bloqueia update se assinado_em não-nulo (Decisão
   #4); persiste odontograma_eventos via a RPC 107 já existente (salvarEventosOdontograma,
   reusada, não reescrita); side-effects de fim de consulta (agendamentos.status completed +
   notificação) só disparam quando agendamentoId está no input.
3. deletarFicha: porta a checagem de autoria do código morto (role dentista só apaga a própria).
4. Nenhum chamador muda ainda — função nova, testável isolada.

**Verificável:** chamar salvarFicha direto (script ou teste) nos 2 contextos (origem
modo_consulta com agendamentoId, origem manual sem) e comparar a linha gravada com o que
os caminhos antigos gravavam hoje (mesmas colunas, mesmos valores). Testar update de ficha assinada,
deve ser rejeitado.
**Dependências:** Fase 0.

---

#### Fase 2: Migrar o modo consulta (Risco: MÉDIO)
**Ações:**
1. consulta-client.tsx passa a chamar salvarFicha com origem modo_consulta e agendamentoId.
2. Remover salvarFichaConsulta de consulta/[agendamentoId]/actions.ts.

**Verificável:** ao vivo (localhost), rodar uma consulta completa: ficha salva, eventos gravados,
agendamento vira completed, notificação chega pra secretaria. Comparar com o comportamento de hoje
antes do fix (mesmo resultado, caminho novo).
**Dependências:** Fase 1.

---

#### Fase 3: Migrar a ficha rápida — client para de escrever direto (Risco: ALTO)
**Ações:**
1. FichasTab.handleSave (create e update) chama salvarFicha (server action) em vez de
   createClient().from("fichas").
2. FichasTab.handleDelete chama deletarFicha.
3. Remove os 3 blocos de escrita direta (insert, update de conteúdo, delete) do componente —
   createClient() no arquivo fica só pra leitura (fetchFichas) e pra assinatura/storage
   (fora do escopo, Decisão #6).

**Verificável:** ao vivo, com reload do navegador entre cada passo (persiste de verdade, não só no
estado local React): criar ficha rápida, editar, apagar. Tentar editar/apagar uma ficha assinada
agora falha no servidor (antes só a UI escondia o botão) — confirmar com 1 conta (autor) mais o
cenário de ficha já assinada.
**Dependências:** Fase 2 — provar o contrato em produção real (consulta) antes de tirar o fallback
client-side que hoje sustenta a ficha rápida.

### Riscos e mitigações

| Risco | Prob. | Mitigação |
|---|---|---|
| Coluna real no Supabase diverge do que o código assume (conduta/alerta_novo/procedimentos sem migration no repo) | média | Conferir contra o schema vivo antes de escrever o Zod da Fase 1, não só contra supabase/migrations/ |
| Fase 3 quebra o fluxo mais usado (ficha rápida é o caminho do dia a dia, não o consulta) | média | Fase 2 primeiro prova o contrato num fluxo menos frequente; Fase 3 só depois, com reload real entre passos |
| Guard de imutabilidade (Decisão #4) rejeita um update que hoje funciona silenciosamente (ninguém tinha notado a ficha como assinada) | baixa | Gate de aceite específico testa os 2 lados (ficha aberta edita normal; ficha assinada rejeita) antes de subir |
| R-03b (ainda não escrita) reabre os mesmos arquivos que R-11 acabou de mexer | média se não coordenar | Decisão #6 confirma o limite agora; quando R-03b for escrita, ler este doc primeiro |

## Parte 3 — Contrato técnico

### TypeScript

```typescript
// src/server/patients/salvar-ficha.ts
import type { OdontogramaEventoDraft, OrtoManutencaoInfo } from '@/types/odontograma';

export type OrigemFicha = 'modo_consulta' | 'manual';

export interface SalvarFichaInput {
  fichaId?: string;
  pacienteId: string;
  origem: OrigemFicha;
  agendamentoId?: string;
  dataAtendimento: string;
  queixaPrincipal: string;
  anotacoes: string;
  dentesAfetados: number[];
  dentesObservacoes: Record<string, string>;
  procedimentos: string[];
  conduta: string;
  alertaNovo?: string | null;
  ortoManutencao?: OrtoManutencaoInfo | null;
  odontogramaEventos?: OdontogramaEventoDraft[];
}

export type SalvarFichaResult =
  | { ok: true; fichaId: string; eventosFalharam?: boolean }
  | { ok: false; error: string };

export interface DeletarFichaResult {
  ok: boolean;
  error?: string;
}
```

### Zod

```typescript
export const salvarFichaSchema = z.object({
  fichaId:            z.string().uuid().optional(),
  pacienteId:         z.string().uuid(),
  origem:             z.enum(['modo_consulta', 'manual']),
  agendamentoId:      z.string().uuid().optional(),
  dataAtendimento:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  queixaPrincipal:    z.string().trim().max(500),
  anotacoes:          z.string().trim().max(5000),
  dentesAfetados:     z.array(z.number().int().min(11).max(85)),
  dentesObservacoes:  z.record(z.string(), z.string()),
  procedimentos:      z.array(z.string()),
  conduta:            z.string().trim().max(2000),
  alertaNovo:         z.string().trim().nullable().optional(),
  ortoManutencao:     z.unknown().nullable().optional(),
  odontogramaEventos: z.array(z.unknown()).optional(),
});
export type SalvarFichaValidatedInput = z.infer<typeof salvarFichaSchema>;
```

### Server Actions (não são rotas HTTP — funções use server)

#### salvarFicha(input: SalvarFichaInput): Promise<SalvarFichaResult>

| | |
|---|---|
| Auth | requirePermission('prontuarios_edit') — admin/dentista; secretaria sempre rejeitada |
| status | derivado no servidor: origem modo_consulta vira concluida, senão aberta — nunca vem do input |
| clinica_id/dentista_id | sempre do ClinicContext, nunca do payload |

**Erros:** sem_permissao (secretaria) · ficha_nao_encontrada (update com id inválido/de outra
clínica) · ficha_assinada (update de conteúdo com assinado_em não-nulo) · dentista_nao_encontrado.

#### deletarFicha(fichaId: string, pacienteId: string): Promise<DeletarFichaResult>

| | |
|---|---|
| Auth | requirePermission('prontuarios_edit') |
| Regra | role dentista só apaga ficha própria; role admin apaga qualquer uma da clínica |

**Erros:** sem_permissao · ficha_nao_encontrada.

### Database

Nenhuma migration nesta fase (Decisão #2: status fica como está). Se a Decisão #2 mudar para
remover a coluna, ou a #4 virar trigger de banco em vez de guard de app, esta seção é reescrita
antes de qualquer código — migration sozinha primeiro, teste de 2 contas se mexer em RLS.

### Invariantes

- [ ] Nenhum componente client (use client) escreve em fichas — só lê (fetchFichas). Toda
      escrita passa por salvarFicha/deletarFicha/os fluxos de assinatura (fora de escopo).
- [ ] status é sempre derivado de origem no servidor — o client nunca envia status.
- [ ] origem nunca muda depois de criada a ficha (update não aceita o campo).
- [ ] clinica_id/dentista_id sempre vêm do ClinicContext autenticado, nunca do input.
- [ ] Ficha com assinado_em não-nulo rejeita update de conteúdo (salvarFicha) — mesma classe de
      proteção que a RPC 107 já dá a odontograma_eventos.
- [ ] odontograma_eventos só é gravado pela RPC salvar_eventos_odontograma — nenhum insert direto
      novo (o insert direto do salvarFichaConsulta de hoje desaparece na Fase 2).
- [ ] Delete de ficha checa autoria no servidor (dentista_id igual ao caller quando role dentista).

### Gates de aceite

- [ ] Criar ficha via modo consulta (origem modo_consulta + agendamentoId) — 1 linha em fichas
      com status concluida, eventos gravados, agendamentos.status vira completed, notificação criada.
- [ ] Criar ficha via ficha rápida (origem manual, sem agendamentoId) — 1 linha com status aberta,
      sem tocar agendamentos nem notificação.
- [ ] Editar ficha existente (qualquer origem) — mesmo id/origem preservados, só conteúdo muda.
- [ ] Editar ficha com assinado_em preenchido — rejeitado com ficha_assinada, testado ao vivo.
- [ ] Apagar ficha de outro dentista sendo role dentista — rejeitado.
- [ ] Apagar como role admin — permitido em qualquer ficha da clínica.
- [ ] Busca por escrita direta em fichas dentro de arquivos use client só acha select
      após a Fase 3 (nenhum insert/update/delete de conteúdo restante).
- [ ] Build/typecheck limpo após a Fase 0 (código morto removido sem quebrar nada).

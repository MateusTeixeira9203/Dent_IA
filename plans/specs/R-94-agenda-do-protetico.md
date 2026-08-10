# R-94 — Agenda do protético

> **SPEC** · **R-94** · 🔵 ativo
> **Aberto:** 2026-08-09 · **Fechado:** — · **Fase:** aprovada (artefato aprovado por ele 09/08)
> **Modelo:** Sonnet (execução) · Opus se abrir decisão de RLS

<!-- Seções 1–3 nascem no debate/planejamento; 4–9 no contrato. -->

## 1. Problema

O dentista manda trabalho pro protético por WhatsApp e telefone. O prazo de entrega mora na
cabeça dos dois. Não existe lugar no sistema onde o protético veja o que deve entregar e
quando — nem onde o dentista veja o que está na mão do laboratório.

**Zero código hoje.** É módulo novo: role novo, tabela nova, RLS nova, rota nova.

## 2. Decisão

**Protético é membro da equipe da clínica** (não laboratório multi-clínica), criado pelo
mesmo caminho da secretária: admin define a senha, sem convite por e-mail.

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| 1 clínica por protético | Laboratório N:N atendendo várias clínicas | Reusa o modelo de equipe que já existe; N:N exigiria tabela de relacionamento nova e repensar `active_clinica_id` |
| Pedido solto (texto + data) | Vincular a procedimento/item de orçamento | Não precisa de rastreio clínico agora; vincular puxaria o silo de `orcamento_itens` junto |
| Dentista pede o prazo | Protético negocia/responde a data | Fluxo de ida e volta é um passo a mais; começa unidirecional |
| Protético marca "entregue" | Sem status, só a data passando | Sem isso ninguém sabe pelo sistema se entregou ou atrasou |
| **Gate de ponto único** | Auditar os 63 arquivos com gate negativo | **Ver §7 — é a decisão mais importante desta spec** |
| Protético vê o nome do paciente | Só dentista + observação | Como funciona na prática; registrado como exposição consciente de PII |

## 3. Objetivo

Protético loga, vê um calendário só dele com os pedidos da clínica (paciente, dentista,
observação, data de entrega) e marca cada um como entregue. Dentista cria o pedido na hora
do agendamento.

## 4. Contrato técnico

### 4.1 Role novo — 6 lugares, nenhum pego pelo compilador

Não existe `switch` exaustivo nem `assertNever` no projeto. Adicionar o role **não quebra o
build** — por isso a lista abaixo é manual e obrigatória.

| # | Onde | O quê |
|---|---|---|
| 1 | `src/server/auth/clinic.ts:5` | `ClinicRole` += `"protetico"` |
| 2 | `src/types/database.ts:19` | `ClinicaUsuarioRole` += `'protetico'` |
| 3 | `src/types/database.ts:50` | `DentistaRole` += `'protetico'` |
| 4 | migration | `dentistas.role` CHECK += `'protetico'` |
| 5 | migration | `clinica_usuarios.role` CHECK += `'protetico'` |
| 6 | — | `convites.role` **não muda** — protético não usa convite |

Quebram em compile-time (`Record<DentistaRole, …>` exige a chave nova) — são os 2 lugares
que o TypeScript avisa:
- `configuracoes/usuarios/_components/usuarios-client.tsx:32,38,44` (label/ícone/cor)
- `perfil/_components/perfil-client.tsx:16`

### 4.2 Tabela nova

```sql
create table pedidos_protetico (
  id            uuid primary key default gen_random_uuid(),
  clinica_id    uuid not null references clinicas(id) on delete cascade,
  protetico_id  uuid not null references dentistas(id) on delete restrict,
  dentista_id   uuid not null references dentistas(id) on delete restrict,
  paciente_id   uuid not null references pacientes(id) on delete cascade,
  agendamento_id uuid references agendamentos(id) on delete set null,
  observacao    text not null,
  data_entrega  date not null,
  status        text not null default 'pendente'
                check (status in ('pendente','entregue')),
  entregue_em   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on pedidos_protetico (clinica_id, protetico_id, data_entrega);
```

`on delete restrict` nos dois FKs de `dentistas`: apagar dentista **não** pode arrastar
pedido junto (é a mina do R-37, não repetir).

### 4.3 RLS

```sql
alter table pedidos_protetico enable row level security;

-- Protético: só os pedidos endereçados a ele, na clínica ativa.
create policy pedidos_protetico_do_protetico on pedidos_protetico
  for all to authenticated
  using (belongs_to_active_clinic(clinica_id) and protetico_id = get_my_dentista_id())
  with check (belongs_to_active_clinic(clinica_id) and protetico_id = get_my_dentista_id());

-- Equipe clínica: vê e cria pedidos da clínica.
create policy pedidos_protetico_equipe on pedidos_protetico
  for all to authenticated
  using (belongs_to_active_clinic(clinica_id) and get_my_role() <> 'protetico')
  with check (belongs_to_active_clinic(clinica_id) and get_my_role() <> 'protetico');
```

**Invariante de escrita:** o protético só pode mudar `status`/`entregue_em`. Não há policy
por-coluna no Postgres — isso é garantido na server action (§5), não na RLS.

### 4.4 Provisionamento da conta

Generalizar o caminho da secretária (`src/server/services/team.ts:31` `criarSecretaria` →
RPC `provision_secretaria`) para aceitar o role. Duas opções, decidir na execução:
- **a)** novo RPC `provision_membro(email, senha, role)`, `provision_secretaria` vira wrapper
- **b)** `provision_secretaria` ganha parâmetro `p_role` com default `'secretaria'`

Preferir **(b)** se não quebrar chamador existente — menos superfície nova.

### 4.5 Server actions

```ts
// src/app/dashboard/agendamentos/actions.ts (ou protetico/actions.ts)
criarPedidoProtetico(input: {
  pacienteId: string; proteticoId: string;
  observacao: string; dataEntrega: string;   // yyyy-MM-dd
  agendamentoId?: string;
}): Promise<{ error?: string; id?: string }>

// src/app/dashboard/protetico/actions.ts
marcarPedidoEntregue(pedidoId: string): Promise<{ error?: string }>
```

`marcarPedidoEntregue` **confere linhas afetadas** (`.select()` ou `count: 'exact'`) — RLS
barrada devolve 0 linhas sem erro, e sem essa checagem a tela mente sucesso (classe do R-66).

## 5. Comportamento

### Estados

| Estado | Quando | Tela | Função |
|---|---|---|---|
| Vazio | protético sem pedidos | "Nenhum trabalho pendente" | — |
| Carregando | action em voo | skeleton do calendário | — |
| Sucesso | pedido criado | toast + card na agenda do protético | grava `pendente` |
| Erro de validação | data no passado, obs vazia, protético não escolhido | erro no campo, não grava | Zod `fieldErrors` |
| Sem permissão | não-membro / protético tentando criar | 403 | action recusa antes do insert |
| Não encontrado | pedido sumiu sob o usuário | "Pedido não encontrado" | `count === 0` |

### Caminho principal

```
[dentista] agenda consulta → marca "Enviar pro protético"
  → escolhe protético + observação + data de entrega
  → valida (Zod: data >= hoje, observacao não vazia, proteticoId da clínica)
  → insert em pedidos_protetico (status 'pendente')
  → aparece na agenda do protético

[protético] loga → /dashboard/protetico (único destino possível)
  → calendário com os pedidos dele por data_entrega
  → clica "Entregue" → update status/entregue_em, confere linhas afetadas
```

### Exemplos concretos

| Situação | Sistema faz | Resultado |
|---|---|---|
| Dentista agenda sem marcar a opção | nada muda | agendamento normal, sem pedido |
| Marca com data de ontem | Zod barra | erro no campo data, nada gravado |
| Protético abre `/dashboard/financeiro` | layout redireciona | cai em `/dashboard/protetico` |
| Protético marca entregue 2× (2 abas) | 2º update acha 0 linhas mudadas | erro honesto, não duplica |
| Clínica sem protético cadastrado | opção não aparece no agendamento | dentista não vê caixa morta |

## 6. Referência visual

- **Artefato:** `plans/artefatos/R-94-agenda-do-protetico.html` · status **aprovado 09/08**
- **Rota alvo:** `/dashboard/protetico` (nova) + `/dashboard/agendamentos` (bloco novo)
- **Componente alvo:** reusar `_components/month-view.tsx`; o modal é
  `agendamentos-client.tsx:1299-1502`

**Nenhuma cor nova.** Tokens extraídos por JS do artefato servido, conferidos contra
`globals.css`:

| Token | Light | Dark |
|---|---|---|
| `--color-teal` | `#2f9c85` | idem |
| `--color-teal-ink` | `#1e7060` | `#5dbeb0` |
| `--color-bg` | `#f4f4f6` | `#0d0d0d` |
| `--color-surface` | `#ffffff` | `#111112` |
| `--color-surface-alt` | `#dadade` | `#1c1c1e` |
| `--color-border` | `#c2c2c6` | `#27272a` |
| `--color-text-primary` | `#09090b` | `#fafafa` |
| `--color-text-secondary` | `#4b5563` | `#a1a1aa` |
| `--color-warning-ink` / `-pale` | `#92400e` / `#fef3c7` | `#fbbf24` / `#451a03` |
| `--color-coral-ink` / `-pale` | `#b3261e` / `#fce8e8` | `#ef9a9a` / `#3d1f1f` |
| `--color-slate-ink` / `-pale` | `#334155` / `#e2e8f0` | `#94a3b8` / `#334155` |
| Display / Corpo / Mono | DM Serif Display / Outfit / DM Mono | idem |

**Estrutura portada, não aproximada** (memória `feedback_familiaridade_sobre_padrao_novo`):
card `rounded-3xl border-border shadow-sm`, grid `lg:grid-cols-3` (calendário 1 / lista 2),
timeline `border-l-2` com dot `w-4 h-4 border-4 border-surface`, card de item `rounded-2xl p-5`.

**O modal do agendamento não é redesenhado.** Mantém as 2 colunas (esquerda rola, direita
fixa `w-72`), rótulos `text-[10px] font-bold uppercase tracking-widest text-teal-ink`, inputs
`rounded-xl bg-surface-alt`, e os 6 chips de duração + campo livre. O R-94 **insere um bloco**
no fim da coluna esquerda, depois de Observações. Zero alteração em campo existente.

**Comportamento que o token não captura:**
- Timeline ordena por `data_entrega` (dia), não por hora — protético trabalha em dia.
- Cor do dot = estado: coral atrasado · âmbar pendente · slate entregue.
- Bloco "Enviar pro protético" **não renderiza** se a clínica não tem protético cadastrado.

> **Divergência de AA achada e corrigida no artefato.** `--color-slate-ink`/`-pale` em dark
> dava 4.04:1 no chip "Entregue" — reprova AA (precisa 4.5). Não é bug do artefato: é o par
> `slate-ink`/`slate-pale` do próprio `globals.css`. Nesta tela, resolvido trocando o chip
> "Entregue" para `text-secondary`/`surface-alt` (5.42 light · 6.64 dark) — sem tocar token
> global, sem cor nova. Implementação usa esse par.
>
> **Auditado 09/08 — 3 usos reais do par reproduzem a mesma falha em dark** (só dark; light
> passa com 8.4:1): `retorno-semana-grid.tsx:267/271` (card de ocupado na grade de retorno),
> `registro-card.tsx:100` (pílula "Pré-existente" do card de endo/implante), e
> `ToothDetailPanel.tsx:424` (badge "Pré-existente" do painel de dente). Os outros 7 usos do
> par medidos passam — fundo é mix 15–16% de slate em `surface-alt` (não `-pale` puro, 5.0–
> 5.1:1 dark) ou `bg-surface`/ambiente direto (6.6–7.4:1 dark): `ToothDetailPanel.tsx:574,597,
> 775`, `tooth-group-list.tsx:116,154`, `Odontograma.tsx:1172`, `FichasTab.tsx:2134`.
> `COR_PALE`/`CROWN_FILL` em `Odontograma.tsx` (fill de SVG, não texto) ficam fora do escopo
> de contraste de texto. Fix mais simples: recalibrar `--color-slate-ink` em `.dark`
> (`globals.css:146`, hoje = `--color-slate` `#94a3b8`) pra um tom mais claro — `#a8b4c7`
> mede ~5.4:1 contra `-pale`, conserta os 3 de uma vez, mesmo padrão dos outros `-ink`.
> Alternativa: repetir nos 3 call sites a troca de par feita acima. **Nenhuma aplicada** —
> é ajuste de token global (afeta os 10 usos), pendente aprovação visual antes de mudar.

## 7. Invariantes

- [ ] **Gate de ponto único:** `dashboard/layout.tsx` — `role === 'protetico'` só acessa
      `/dashboard/protetico`; qualquer outra rota redireciona. **Falha fechado:** rota criada
      no futuro nasce bloqueada sem ninguém precisar lembrar.
- [ ] Protético **nunca** lê ficha, prontuário, orçamento ou financeiro.
- [ ] Protético só altera `status` e `entregue_em` — nunca observação, data ou destinatário.
- [ ] Toda query traz `clinica_id`; nenhum pedido cruza clínica.
- [ ] Apagar dentista não apaga pedido (`on delete restrict`).

> **Por que o gate único e não os 63 arquivos:** a arquitetura de permissão do projeto é
> deny-list (`if role === 'secretaria') nega`), sem exhaustive check. Um role novo passa por
> todos esses gates por omissão — fail-open. Auditar 63 arquivos é caro, esquece um, e a
> próxima rota nasce aberta de novo.

## 8. Gates de aceite

Cada estado da §5 vira um gate.

- [ ] **G1** — Admin cria conta de protético e ele loga com a própria senha
- [ ] **G2** — Protético logado em `/dashboard/financeiro`, `/dashboard/pacientes`,
      `/dashboard/meu-dia` e `/dashboard/orcamentos` cai em `/dashboard/protetico` nas 4
- [ ] **G3** — Dentista cria pedido no agendamento; aparece na agenda do protético com
      paciente, dentista, observação e data
- [ ] **G4** — Protético marca entregue; dentista vê o status mudado
- [ ] **G5** — Data no passado e observação vazia são barradas antes do insert
- [ ] **G6** — **Gate de 2 contas logadas** (protético + dentista): protético não alcança
      dado clínico nem por URL direta. Script não pega furo de policy — regra do CLAUDE.md
- [ ] **G7** — Protético de uma clínica não vê pedido de outra

**G2 e G6 definem o item.** Sem eles, o role novo é um vazamento de prontuário.

## 9. Fora de escopo

- Laboratório multi-clínica (N:N)
- Vínculo do pedido com procedimento/item de orçamento
- Protético negociar ou propor outra data
- Notificação (WhatsApp/e-mail) de pedido novo ou atraso
- Anexo de foto/arquivo no pedido
- Histórico/relatório de pedidos entregues
- Apresentar/planejamento — feature separada, ainda não escopada

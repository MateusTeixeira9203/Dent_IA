# R-140a — Atendimento clínico: a visita como âncora

> **SPEC** · **R-140a** · ⏳ filha do R-140
> **Aberto:** 2026-08-30 · **Fase:** implementação local — fundação, dual-write e backfill de evoluções escritos; nada aplicado remotamente
> **Migration:** aditiva · **Depende:** R-108/R-108b em produção

## 1. Problema

Hoje a visita é inferida por ficha, evolução ou data. Isso deixou de ser verdadeiro quando uma
visita passou a concluir pendências de tratamentos diferentes. Sem uma âncora explícita não há
como montar prontuário cronológico, ligar etiquetas ao uso real ou evitar ambiguidade em duas
consultas do mesmo paciente no mesmo dia.

## 2. Decisões

| Decisão | Motivo |
|---|---|
| Atendimento é aditivo e não contém cópia do relato/procedimento | Evita terceira fonte clínica |
| `ficha_evolucoes.atendimento_id` identifica a evolução daquela visita | A evolução já é uma ocorrência por ficha tocada |
| `atendimento_eventos` tem papel `registrado`/`realizado` | Preserva indicação numa visita e execução em outra |
| Chave idempotente nasce no cliente e sobrevive ao retry | Rede instável não duplica atendimento |
| Estados técnicos `preparando/finalizado/falhou` | Permitem recuperação sem mentir que a visita terminou |
| Backfill cria contêiner técnico `legado` por evolução | Preserva cada registro sem inventar que ele foi uma visita isolada |

## 3. Objetivo e fluxo

**Objetivo:** toda nova visita salva passa a ter um ID estável que reúne o que aconteceu nela,
mesmo quando o conteúdo clínico pertence a tratamentos diferentes.

```text
Salvar no Meu Dia
  → obter/criar Atendimento por chave idempotente (`preparando`)
  → executar o roteamento clínico atual
  → ligar evoluções + eventos registrados/realizados
  → finalizar Atendimento
  → finalizar agenda/notificar uma vez, como hoje
```

## 4. Contrato técnico

### 4.1 Schema

```sql
create table atendimentos_clinicos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  dentista_id uuid not null references dentistas(id) on delete cascade,
  agendamento_id uuid references agendamentos(id) on delete set null,
  chave_idempotencia uuid not null,
  data_atendimento date not null,
  origem text not null check (origem in ('meu_dia','ficha','importado','legado')),
  estado text not null check (estado in ('preparando','finalizado','falhou')),
  criado_por uuid references users(id) on delete set null,
  finalizado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (clinica_id, chave_idempotencia)
);
create unique index atendimentos_agendamento_uq
  on atendimentos_clinicos (clinica_id, agendamento_id) where agendamento_id is not null;

alter table ficha_evolucoes
  add column atendimento_id uuid references atendimentos_clinicos(id) on delete set null;
create unique index ficha_evolucoes_atendimento_uq
  on ficha_evolucoes (ficha_id, atendimento_id) where atendimento_id is not null;

create table atendimento_eventos (
  clinica_id uuid not null references clinicas(id) on delete restrict,
  atendimento_id uuid not null references atendimentos_clinicos(id) on delete cascade,
  evento_id uuid not null references odontograma_eventos(id) on delete cascade,
  papel text not null check (papel in ('registrado','realizado')),
  created_at timestamptz not null default now(),
  primary key (atendimento_id, evento_id, papel),
  unique (evento_id, papel)
);
```

Índices obrigatórios: atendimento por paciente/data, dentista/data, evolução/atendimento e
evento/atendimento. A unicidade parcial evolução/atendimento está na fundação local por ela ainda
não ter sido aplicada fora dela. Constraints/trigger validam que paciente, clínica e dentista das relações
coincidem; RLS isolada não substitui integridade relacional.

### 4.2 Types e validação

```ts
type AtendimentoEstado = 'preparando' | 'finalizado' | 'falhou';
type AtendimentoOrigem = 'meu_dia' | 'ficha' | 'importado' | 'legado';
type PapelEventoAtendimento = 'registrado' | 'realizado';

interface RegistrarAtendimentoInput {
  visitaKey: string;          // UUID
  pacienteId: string;
  dentistaId: string;
  agendamentoId: string | null;
  dataAtendimento: string;    // YYYY-MM-DD
  destinoNovos: string | null;
  eventos: OdontogramaEventoDraft[];
  texto: string | null;
}

type RegistrarAtendimentoResult =
  | { ok: true; atendimentoId: string; fichaIds: string[]; recuperado: boolean }
  | { ok: false; codigo: 'VALIDACAO'|'SEM_PERMISSAO'|'CONFLITO'|'FALHA_CLINICA'; error: string };
```

Zod valida UUIDs, data, tamanho do texto e payload de eventos. Clínica/ator/dentista são
resolvidos no servidor; `clinicaId` nunca vem confiável do cliente.

### 4.3 Serviço e compatibilidade

- `registrarAtendimentoClinico` orquestra; `rotearVisita` continua dono das regras de ficha.
- `registrarEvolucao` passa a deduplicar por `(ficha_id, atendimento_id)`, não por dia. Assim duas
  visitas reais do mesmo paciente no mesmo dia não são fundidas; o fallback diário vale só para
  chamadas legadas ainda sem Atendimento durante o rollout.
- A chave repetida retorna o Atendimento existente. Se `finalizado`, não reexecuta a escrita.
- Se `preparando`, compara vínculos já gravados e retoma apenas o estágio ausente.
- Se a escrita clínica falhar antes de qualquer ficha/evolução, marca `falhou`.
- Se a clínica tiver sido gravada e a finalização falhar, retorna erro recuperável e mantém o
  rascunho local; retry reconcilia. Nunca desfaz a ficha clínica.
- A agenda e a notificação só executam depois de o Atendimento finalizar. Retry de agendamento já
  concluído não cria outra notificação à secretária.
- Editar/corrigir uma ficha histórica não cria visita nova. Só um novo registro clínico iniciado
  no Meu Dia ou no fluxo explícito de nova evolução cria Atendimento.

### 4.4 Backfill

1. Para cada `ficha_evolucoes`, criar um contêiner `legado/finalizado` usando o mesmo UUID da
   evolução como `id` e `chave_idempotencia`; copiar paciente/clínica/dentista/data da ficha.
2. Preencher `ficha_evolucoes.atendimento_id` com esse UUID.
3. Ligar evento como `registrado` ou `realizado` somente quando data+autor+ficha apontarem para
   exatamente uma evolução. Zero ou múltiplos candidatos ficam sem vínculo e entram no relatório.
4. Não inferir `agendamento_id` histórico.
5. Migração repetível (`on conflict do nothing`) + relatório de contagem antes/depois.

O contêiner legado **não afirma** que cada evolução era uma visita independente. Como o modelo
antigo deduplicava por ficha+dentista+dia, não existe chave capaz de reagrupar com segurança as N
fichas tocadas numa mesma visita. A UI agrupa visualmente a data, rotula `registro legado` e não
fabrica um Atendimento clínico único por aproximação.

## 5. Estados e comportamento

| Estado | Leitura | Escrita |
|---|---|---|
| Sem atendimento legado | fallback atual por ficha/evolução | nenhuma correção automática no browser |
| Preparando | não aparece como concluído | retry pela mesma chave |
| Finalizado | entra na timeline longitudinal | novas relações exigem action autorizada |
| Falhou vazio | oculto; log operacional | pode ser retomado ou limpo por manutenção segura |
| Conflito de agenda/chave | mensagem explícita | nunca cria segundo atendimento |
| Sem permissão | nenhum dado | 403/resultado tipado, zero linha afetada não é sucesso |

## 6. RLS e autoria

- SELECT: `belongs_to_active_clinic(clinica_id) and is_clinic_staff()`.
- INSERT/UPDATE: admin/dentista autorizado a agir como `dentista_id`; secretária e protético não
  criam conteúdo clínico nesta spec.
- `atendimento_eventos` só é escrito pelo serviço/RPC validado; sem mutation direta pelo client.
- DELETE não é exposto. Correção clínica usa os mecanismos existentes e trilha de auditoria.

## 7. Invariantes

- [ ] Uma chave gera no máximo um Atendimento por clínica.
- [ ] Um agendamento gera no máximo um Atendimento clínico.
- [ ] Duas visitas sem agendamento no mesmo dia geram Atendimentos/evoluções distintos.
- [ ] Um evento tem no máximo uma visita de registro e uma de realização.
- [ ] Evento, ficha, orçamento e assinatura mantêm IDs e ownership atuais.
- [ ] Atendimento finalizado tem ao menos uma evolução ou evento relacionado.
- [ ] Relação cross-paciente/cross-clínica falha no banco, não só na aplicação.

## 8. Gates de aceite

- [ ] Visita com dois tratamentos cria 1 Atendimento, 2 evoluções e vínculos corretos.
- [ ] Indicar hoje e realizar depois liga o mesmo evento a dois Atendimentos/papéis.
- [ ] Retry online/offline não duplica Atendimento, evolução, evento, agenda ou notificação.
- [ ] Falha entre criação e finalização é recuperada pela mesma chave.
- [ ] Backfill: contagem de evoluções vinculadas é 100%; ambiguidades de eventos são listadas.
- [ ] Orçamento e assinatura do mesmo evento continuam funcionando sem mudança de ID.
- [x] Matriz local ampliada passa após o reset: 92/92 assertivas, rollback, incluindo duas visitas
  no mesmo dia e retry da mesma.
- [ ] Duas contas autenticadas e duas clínicas provam RLS de SELECT e escrita no navegador.

## 9. Fora de escopo

- UI longitudinal, captura de etiqueta, estoque e remoção de colunas/tabelas antigas.
- Transformar Atendimento em cobrança, agendamento ou tratamento.

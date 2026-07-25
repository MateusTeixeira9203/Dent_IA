# R-04 — Encaminhar procedimento a outro dentista da clínica

> **SPEC** · **R-04** · fase `aprovada` (24/07) · **Modelo:** Sonnet (execução — backend fechado; muda só a UI)
> **Aberto:** 2026-07-23 · **Backend fechado:** 2026-07-23 · **Reescopado + quebrado:** 2026-07-24
> **Quebra (24/07):** o filtro por responsável saiu daqui e virou **R-16** (spec própria) — a spec
> passava de 400 linhas, sinal de recorte errado. Aqui fica **só encaminhar**. A edição de
> `detalhe` pelo destino já era **R-04b** na fila.

## O que já está pronto (não re-fazer)

Backend das Fases 1, 2 e 4 **codado e verificado com 2 contas reais logadas** (23/07), ainda **sem
commit**. Ciclo completo exercitado ponta a ponta: autor encaminha → `encaminhado_para` grava →
destino recebe `procedimento_encaminhado` e vê o item no `AttentionPanel` → clica e cai na ficha →
só o card dele é acionável (terceiro não age) → "Marcar como realizado" passa pela RPC → autor
recebe `encaminhamento_concluido`.

**Não testado ao vivo** (validado por leitura de código): encaminhar pra secretária/outra clínica
falhando, e o bloqueio de ficha assinada — não havia ficha assinada no ambiente. Risco baixo: a
RPC valida os dois no servidor (`f.assinado_em is null`, `encaminhado_para = caller`), não só na UI.

**Falta:** a UI da Fase 3 (lote) — o v1 (`<select>` por card) está sem commit e **será substituído**.

## Visão geral

Um registro planejado (status=indicado) na ficha ganha um destino: outro dentista ativo da mesma
clínica. O destino é notificado (canal já existente) e vê os itens encaminhados pra ele numa fila
própria no dashboard. Resolve "encaminhei a extração pro Dr. X, ele precisa saber e marcar quando
fizer" sem criar autoria cruzada — a ficha continua do autor.

**Caso de uso real (Mateus):** o dentista sênior encaminha *quase uma ficha inteira* pro colega —
passa restauração e procedimento simples, fica com implante e restauração complexa. O gesto real é
*"seleciona vários → manda todos pro mesmo dentista"*, muitas vezes "seleciona tudo → tira os
poucos que eu fico". Encaminhar **1 só** continua tendo que ser fácil.

## Escopo

**Cobre:** autor encaminha em lote (ou 1) registros indicados seus, não assinados · desfaz o
encaminhamento · destino recebe notificação e vê a fila no dashboard · destino marca como realizado ·
autor é notificado quando o destino conclui.

**Não cobre:** filtro/organização por responsável na ficha (**R-16**) · destino editar
`detalhe`/`observação` (**R-04b**) · reencaminhar em cadeia · recusa explícita sem concluir (autor
reatribui manualmente) · lote atravessando consultas · inbox/rota nova (a fila é um bloco a mais no
`AttentionPanel`) · orçamento (decisão #9) · mudança na RLS de leitura — já é aberta pra clínica
inteira (migration 099); só quem AGE muda.

## Decisões — resolvidas

- **#1 (onde a fila aparece):** bloco novo em `AttentionPanel`, sem rota nova.
- **#2 (quanto o destino edita):** **Opção A** (destino edita status + data + `detalhe`/`observação`)
  foi a confirmada — **mas fora desta onda**, por peso: virou R-04b. Esta onda entrega a **Opção B**
  (destino edita **só** status + `realizado_em`). Os dois rótulos ficam registrados porque o
  cabeçalho da migration 109 referencia "Fases 1-4 = Opção B do #2".
- **#3 (devolver sem concluir):** não — o autor reatribui o destino manualmente.
- **#4 (ida e volta):** só notifica o autor ao concluir — o núcleo clínico já é compartilhado, ele
  vê a mudança sozinho ao abrir o paciente.
- **#5 (forma): variante B — "Modo Seleção"** (design-shotgun 24/07). Botão liga o modo → checkbox
  nos cards elegíveis, no lugar; barra de ação fixa (contador · selecionar tudo/limpar ·
  destino-avatar · encaminhar · sair). Artefato: `plans/artefatos/R-04-encaminhar-lote.html` (aba B).
  Rejeitadas: A (modal, duplica a lista), C (drawer, vira modal no mobile), D (destino-1º, 2 passos)
  — só o **avatar** do D foi absorvido.
- **#6 (escopo do lote): a CONSULTA aberta** — revisto de "paciente inteiro". A ficha é um accordion
  de **abertura única**, então seleção cross-consulta "nos cards reais" é impossível. E o caso real
  casa: o dentista faz a anamnese, identifica tudo **numa consulta** e encaminha dali.
- **#7 (des-encaminhar): × no badge (autor).** Já-encaminhado é estado travado no modo; o autor
  remove pelo **×** no badge "Encaminhado a {nome}" (registro dele · indicado · não assinado) →
  `encaminharProcedimento({ eventoIds, dentistaDestinoId: null })`, silencioso (sem notificação).
- **#9 (orçamento): FORA de escopo.** Confirmado pelo Mateus ("continua a mesma coisa"). O orçamento
  já é um-dentista-por-orçamento (`orcamentos.dentista_id`; `orcamento_itens` sem dentista); "por
  procedimento do dentista" seria schema em cima de dinheiro numa tela com histórico prod-down — não
  vale. Receita-por-dentista, se um dia precisar, é relatório read-only sobre `encaminhado_para`
  (modelo Open Dental), item próprio.
- **Mobile:** barra de ação responsiva + checkbox/× tocáveis (≥40px) — gate de QA.

> **#8 (organizar por dentista na ficha)** migrou inteira pra [R-16](R-16-filtro-responsavel-ficha.md),
> junto com o registro do que foi rejeitado (seções por dentista) pra não re-litigar.

## Assunções

- "Ativo" = `dentistas.ativo = true`. Destino elegível = mesma `clinica_id`, `role <> secretaria`,
  `ativo = true`, diferente do próprio autor.
- Encaminhar só vale pra registro indicado — um realizado não tem o que "encaminhar". Grupo
  multi-dente (`grupo_id`) move todos os ids juntos, mesmo padrão de `alternarStatusRegistro`.
- A UI de encaminhar vive só na visão pós-save da ficha (registros já salvos), não no rascunho
  (`ToothDetailPanel` de consulta/ficha rápida) — evita tocar no upsert da migration 107. O **badge
  só-leitura** fica no `RegistroCard`; a **ação** migra pro fluxo dedicado (fora do card).
- Elegível pra encaminhar = `status='indicado'` · autor = usuário atual · ficha não assinada · não já
  encaminhado. O modo seleção **da consulta aberta** lista exatamente esses.
- Um lote → **um** destinatário. Rotear pra dentistas diferentes = 2 lotes.

## Parte 1 — Plano de implementação

### Mudanças de arquitetura

| Arquivo | O que muda |
|---|---|
| `supabase/migrations/*_109_encaminhamento_procedimento.sql` | RPC `concluir_evento_encaminhado` (SECURITY DEFINER) + índice parcial |
| `src/types/odontograma.ts` | `OdontogramaEvento.encaminhado_para` |
| `src/lib/notificacoes.ts` | 2 novos `TipoNotificacao` |
| `src/app/api/dex/alerts/route.ts` | `typeMap` dos 2 tipos novos |
| `src/components/layout/notification-bell.tsx` | `TIPO_ICON` dos 2 tipos novos |
| `src/app/consulta/[agendamentoId]/actions.ts` | `encaminharProcedimento`, `atualizarStatusEncaminhado` |
| `src/components/fichas/registro-card.tsx` | badge de destino (só-leitura) + × de desfazer + pill acionável pelo destino + **props de modo-seleção**; SEM o `<select>` inline |
| `src/components/fichas/…` (novo) | **barra de ação do modo seleção**, escopada à consulta — variante B |
| `src/components/pacientes/FichasTab.tsx` | busca dentistas elegíveis, propaga `encaminhadoPara`, **segura o modo-seleção por-consulta + seleção**, wiring das 2 actions |
| `src/app/dashboard/_components/dentista-dashboard.tsx` | query da fila do destino |
| `src/components/dashboard/attention-panel.tsx` | bloco "Encaminhados pra você" |

### Fases

#### Fase 1: Migration — RPC de escrita do destino (Risco: MÉDIO) · **codada, verificada**
1. Migration com `concluir_evento_encaminhado` (SQL na Parte 2) + índice parcial
   `idx_odontograma_eventos_encaminhado`.
2. Nada muda em `salvar_eventos_odontograma` (migration 107) nem na RLS de escrita do autor: o
   `ON CONFLICT DO UPDATE SET` só toca colunas listadas (resalvar a ficha não apaga um
   encaminhamento existente), e `odontograma_eventos_write_own` (migration 101) já é FOR ALL com
   `dentista_id = get_my_dentista_id()` — o autor já pode gravar `encaminhado_para` hoje.

**Verificável:** rodar a RPC com 2 contas — autor chamando pra evento não-encaminhado-a-ele falha;
destino chamando pro evento certo funciona; ficha assinada barra os dois. **Dependências:** nenhuma.

#### Fase 2: Tipos + leitura, sem controle (Risco: BAIXO) · **codada, verificada**
1. `src/types/odontograma.ts` — `encaminhado_para: string | null` em `OdontogramaEvento`.
2. `src/lib/notificacoes.ts` — `procedimento_encaminhado` e `encaminhamento_concluido` no union.
3. `route.ts` e `notification-bell.tsx` — entradas em `typeMap`/`TIPO_ICON`.
4. `FichasTab.tsx` — `EventoRow`/`EventoView` ganham `encaminhadoPara: { id; nome } | null`; query
   pede a coluna + join `encaminhado_dentista:dentistas!odontograma_eventos_encaminhado_para_fkey`
   (FK confirmada no schema, já no código em `FichasTab.tsx:517`); `eventosParaCards` propaga pro
   `RegistroCardData`.
5. `registro-card.tsx` — badge só-leitura "Encaminhado a {nome}" ao lado do pill.

**Verificável:** setar `encaminhado_para` via SQL e ver o badge pra qualquer dentista da clínica.
**Dependências:** nenhuma (paralelo à Fase 1).

#### Fase 3: Autor encaminha — EM LOTE (Risco: BAIXO/MÉDIO) · **é o que falta codar**
1. `actions.ts` — `encaminharProcedimento` **inalterada** (confirmado no código, 24/07):
   `.in('id', eventoIds)` valida que TODOS são do autor (`eventos.length !== eventoIds.length`
   barra), que TODOS são `indicado`, junta TODOS os `fichaIds` e barra se qualquer ficha estiver
   assinada, faz um UPDATE em todos e dispara **uma** notificação. Já é batch-safe. A única
   diferença é quantos ids a UI manda de uma vez.
2. `FichasTab.tsx` — mantém a busca 1x dos dentistas elegíveis (mesmo filtro de
   `src/app/dashboard/agendamentos/page.tsx:143-149`, excluindo o próprio). **Novo:** estado de seleção **escopado à
   consulta aberta** — `modoSelecaoFichaId: string | null` + `selecionados: Set<string>` (chave =
   grupo/registro) + `destino`. Deriva os encamináveis daquela consulta; confirmar chama a action com
   a união dos `eventoIds` + 1 destino. "Selecionar tudo" = todos os encamináveis daquela consulta.
   Otimista com rollback. O botão "Encaminhar" vive no **cabeçalho da consulta aberta**, não global.
3. `registro-card.tsx` — **props de modo-seleção**: quando `selecionavel`, renderiza checkbox à
   esquerda e o clique **seleciona** em vez de expandir; `selecionado` controla o visual;
   inelegível/já-encaminhado não é selecionável (badge travado). **Remove** o `<select>` e as props
   `destinosDisponiveis`/`onEncaminhar`. **#7:** com `onRemoverEncaminhamento` presente, o badge
   ganha × que chama a action com `dentistaDestinoId=null` (otimista, silencioso). Reavaliar o
   `role="button"`/`<div>`: sem o `<select>` aninhado o card pode voltar a `<button>` — mas checkbox
   e × internos pedem o mesmo cuidado (interativo aninhado); decidir na hora.
4. **Barra de ação fixa** (`src/components/fichas/…`, novo): aparece com o modo ligado — contador
   "N selecionados", "selecionar tudo/limpar", seletor de destino (cartão de pessoa com avatar),
   "Encaminhar" (só habilita com N≥1 **e** destino) e "sair". Responsiva; alvo ≥40px.

**Verificável:** ver os gates de aceite. **Dependências:** Fases 1 e 2.

#### Fase 4: Destino conclui — status + data (Risco: MÉDIO) · **codada, verificada**
1. `actions.ts` — `atualizarStatusEncaminhado`: chama a RPC da Fase 1; sucesso com
   `novoStatus=realizado` dispara `inserirNotificacao` pro autor original.
2. `registro-card.tsx` — pill de status acionável quando `data.encaminhadoPara?.id ===
   dentistaIdAtual`, chamando `atualizarStatusEncaminhado` em vez de `alternarStatusRegistro`.
   Terceiro dentista continua com pill só-leitura.
3. `dentista-dashboard.tsx` — query: `odontograma_eventos` onde `encaminhado_para = dentista.id` e
   `status = indicado`, join `pacientes(id, nome)`, limit 10.
4. `attention-panel.tsx` — bloco "Encaminhados pra você", padrão colapsável de `OrcamentosCard`,
   contando pro itemCount de "Atenção hoje".

**Dependências:** Fases 1, 2 e 3.

> **Sketch guardado pra R-04b** (destino edita detalhe — item da fila, ganha spec própria): RPC
> `atualizar_detalhe_evento_encaminhado(p_evento_id, p_detalhe, p_observacao)`, mesmo padrão da Fase
> 1, restrita a `tipo in ('endodontia','implante')` e `encaminhado_para = caller`; nunca toca
> status/tipo/âncora/autoria. Em `FichasTab`, `corpoEspecialidade` ganha branch editável reusando
> `EndoForm`/`ImplanteForm`, com "Salvar" explícito. Risco: primeiro caso de edição de `detalhe` fora
> do fluxo do autor — pede dogfooding isolado.

### Riscos e mitigações

| Risco | Prob. | Mitigação |
|---|---|---|
| RPC com escopo de escrita mal calibrado | média | Só toca status/realizado_em; testado com 2 contas antes de subir |
| Nome da FK de `encaminhado_para` diferente do assumido | baixa | Confirmar no schema real antes da query da Fase 2 |
| Destino acha que perdeu o item sem confirmação visual | baixa | Notificação pro autor + card muda de pill na hora (otimista, rollback se RPC barrar) |
| Encaminhado a dentista que depois vira `ativo=false` fica preso na fila | baixa | Não tratado na v1 — inativo já perde login; vira filtro se incomodar |

## Parte 2 — Contrato técnico

### TypeScript

```typescript
// src/types/odontograma.ts — adição
export interface OdontogramaEvento {
  // ...campos existentes
  /** Dentista a quem o procedimento PLANEJADO foi encaminhado. Nunca transfere autoria
   *  (dentista_id continua o autor). null = não encaminhado. */
  encaminhado_para: string | null;
}

// src/components/fichas/registro-card.tsx — o card mostra o badge; a AÇÃO de encaminhar
// saiu do card pro painel (removidas destinosDisponiveis/onEncaminhar).
export interface RegistroCardData {
  // ...campos existentes
  encaminhadoPara: { id: string; nome: string } | null;
}

export interface RegistroCardProps {
  data: RegistroCardData;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  onToggleStatus?: () => void; // autor OU destino — quem chama decide a action por trás
  /** Variante B (modo seleção): quando true, o card mostra checkbox e o clique SELECIONA
   *  em vez de expandir. Só é passado pros encaminháveis (indicado · autor = eu · ficha não
   *  assinada · ainda não encaminhado). Card já-encaminhado/inelegível nunca recebe isto. */
  selecionavel?: boolean;
  selecionado?: boolean;
  onToggleSelecao?: () => void;
  /** #7: quando presente (autor · registro dele · indicado · não assinado · JÁ encaminhado),
   *  o badge ganha um × que remove o encaminhamento (dentistaDestinoId=null, silencioso).
   *  Ausente = badge só-leitura. */
  onRemoverEncaminhamento?: () => void;
}

// Barra de ação do MODO SELEÇÃO (variante B). Vive em FichasTab; escopada à CONSULTA aberta.
// Um lote = N procedimentos elegíveis marcados NAQUELA consulta → 1 destinatário.
export interface EncaminharBarProps {
  totalSelecionado: number;
  totalEncaminhavel: number;               // da consulta aberta — pra "selecionar tudo / limpar"
  destinosDisponiveis: { id: string; nome: string; especialidade?: string }[];
  destino: string | null;                  // dentista escolhido (avatar); null = nenhum
  onDestino: (id: string) => void;
  onSelecionarTudo: () => void;
  onLimpar: () => void;
  onConfirmar: () => void;                 // habilita só com N≥1 E destino≠null
  onSair: () => void;
}
// Estado que FichasTab segura: modoSelecaoFichaId:string|null (qual consulta em modo) ·
// selecionados:Set<string> · destino:string|null.

// src/app/consulta/[agendamentoId]/actions.ts — actions
export async function encaminharProcedimento(params: {
  eventoIds: string[];               // grupo inteiro, mesmo padrão de alternarStatusRegistro
  dentistaDestinoId: string | null;  // null = remove o encaminhamento
}): Promise<{ ok: boolean; error?: string }>;

export async function atualizarStatusEncaminhado(params: {
  eventoIds: string[];
  novoStatus: 'indicado' | 'realizado';
  realizadoEm: string | null;
}): Promise<{ ok: boolean; error?: string }>;

// src/lib/notificacoes.ts — union ampliado
export type TipoNotificacao =
  | /* ...existentes */
  | 'procedimento_encaminhado'      // pro destino, quando recebe
  | 'encaminhamento_concluido';     // pro autor, quando o destino conclui
```

### RLS / RPC

```sql
-- Autor: NENHUMA policy nova — odontograma_eventos_write_own (migration 101) já cobre
-- UPDATE de encaminhado_para pelo dono (dentista_id = get_my_dentista_id()).

-- Destino: RPC estreita — não abre UPDATE geral da tabela pro destino, só este subconjunto.
create or replace function public.concluir_evento_encaminhado(
  p_evento_ids   uuid[],
  p_novo_status  text,
  p_realizado_em date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := get_my_dentista_id();
  v_count  int;
begin
  if p_novo_status not in ('indicado','realizado') then
    raise exception 'status_invalido';
  end if;

  select count(*) into v_count
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = any(p_evento_ids)
    and e.clinica_id = get_my_clinica_id()
    and e.encaminhado_para = v_caller
    and f.assinado_em is null;

  if v_count <> coalesce(array_length(p_evento_ids, 1), 0) then
    raise exception 'sem_permissao';
  end if;

  update public.odontograma_eventos
     set status       = p_novo_status,
         realizado_em = case when p_novo_status = 'realizado' then p_realizado_em else null end
   where id = any(p_evento_ids);
end;
$$;

revoke execute on function public.concluir_evento_encaminhado(uuid[], text, date) from anon, public;
grant  execute on function public.concluir_evento_encaminhado(uuid[], text, date) to authenticated;

create index if not exists idx_odontograma_eventos_encaminhado
  on public.odontograma_eventos (clinica_id, encaminhado_para, status)
  where encaminhado_para is not null;
```

Escrita estreita do DESTINO: só `status`/`realizado_em`, nunca tipo/âncora/detalhe/autoria. Autor
continua usando `alternarStatusRegistro` (RLS direta, sem passar pela RPC). Nenhuma coluna nova no
schema — `encaminhado_para` existe desde a migration 106; só RPC + índice (migration 109).

### Componentes

```
FichasTab (client)                     dentistas elegiveis 1x; segura modoSelecaoFichaId/selecionados/destino
  -> por consulta (evolucao):
       -> botao "Encaminhar" (cabecalho) liga o modo NAQUELA consulta
       -> RegistroCard (por registro/grupo)
            -> checkbox (so no modo, elegivel) clique SELECIONA em vez de expandir  [variante B]
            -> badge "Encaminhado a {nome}" + x (so autor)  leitura p/ todos; x remove (#7)
            -> pill status (clicavel)      autor OU destino conforme a fase; terceiro = so leitura
       -> EncaminharBar (novo, fixa)      contador · selecionar tudo/limpar · destino-avatar · encaminhar · sair
                                          escopada a consulta aberta; confirma = 1 chamada batch

DentistaDashboard (server) -> AttentionPanel -> bloco "Encaminhados pra voce" (padrao OrcamentosCard)
```

### Invariantes

- [ ] Só registro com status='indicado' pode ser encaminhado.
- [ ] Encaminhar nunca muda `dentista_id` (autoria) — só `encaminhado_para`.
- [ ] Destino elegível: mesma clinica_id, role diferente de secretaria, ativo=true, diferente do autor.
- [ ] Escrita do destino é exatamente status + realizado_em — nunca tipo, âncora, `detalhe`,
      observação, dentista_id, ficha_id. `detalhe`/observação só na R-04b, com RPC própria.
- [ ] Ficha assinada é imutável pros dois lados — reforçado na RPC, não só na UI.
- [ ] Leitura do evento encaminhado não muda: já é aberta pra clínica inteira (migration 099).

### Gates de aceite

**UI de lote — variante B, escopo CONSULTA (re-verificar na tela, claro E escuro):**
- [ ] Botão "Encaminhar" **no cabeçalho da consulta aberta** liga o modo → os cards elegíveis daquela
      consulta ganham checkbox e o clique SELECIONA (não expande); inelegíveis apagam; barra de ação
      fixa aparece embaixo.
- [ ] "Selecionar tudo" marca os encamináveis **daquela consulta**; desmarcar os que fico funciona;
      escolho 1 destino (cartão com avatar), confirmo → gravam `encaminhado_para`, o destino recebe
      **uma** notificação, o badge "Encaminhado a {nome}" aparece nos cards; a consulta sai do modo.
- [ ] "Encaminhar" na barra só habilita com **N≥1 e destino escolhido**; "sair" cancela sem gravar.
- [ ] Encaminhar **1 só** = ligar modo, marcar 1, confirmar — não regrediu vs. o select por card.
- [ ] `RegistroCard` não tem mais `<select>`; realizado, de outro autor, de ficha assinada, ou **já
      encaminhado** não é selecionável (badge travado). Terceiro dentista vê só o badge.
- [ ] **Des-encaminhar (#7):** o autor vê um × no badge do que ele encaminhou (indicado, não
      assinado) → remove (`encaminhado_para` volta a null), badge some, sem notificação. Terceiro
      dentista e o destino **não** veem o ×.
- [ ] **Mobile:** barra de ação responsiva + checkbox/× tocáveis (≥40px).

**Backend (verificados 23/07 com 2 contas — inalterados, não re-testar salvo regressão):**
- [x] Destino clica na notificação → cai na ficha do paciente.
- [x] Destino vê o item em "Encaminhados pra você" no dashboard enquanto indicado.
- [x] Destino marca "Realizado" → item some da fila, autor recebe `encaminhamento_concluido`.
- [~] Encaminhar pra secretária ou pra dentista de outra clínica falha (validação/RPC, não UI).
      **Só lido no código, não exercido ao vivo** — a RPC valida no servidor; risco baixo.
- [~] Ficha assinada → nem autor nem destino conseguem encaminhar ou concluir. **Só lido no código**
      (não havia ficha assinada no ambiente de teste); a RPC checa `assinado_em is null`, risco baixo.
- [x] Testado com 2 contas reais logadas (autor + destino).

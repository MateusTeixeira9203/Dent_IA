# R-139a — Remover procedimento do catálogo

> **SPEC** · **R-139a** · 🟡 no ar; auditoria completa pendente
> **Aberto:** 2026-08-28 · **Fechado:** — · **Fase:** validação em produção
> **Origem:** achado reportado após demonstração em 28/08.
> **Prioridade:** independente; não reserva item ativo.

## 1. Problema

Em Configurações → Procedimentos, o dentista consegue apenas “Desativar” um item. O item
continua misturado ao catálogo visível, embora a intenção expressa seja removê-lo do banco de
procedimentos que ele usa no dia a dia. A linguagem de estado técnico não entrega o resultado
mental esperado: “não quero mais este procedimento nas minhas escolhas”.

Uma exclusão física seria igualmente errada como padrão: `orcamento_itens.procedimento_id` e
`planejamento_etapas.procedimento_id` referenciam `procedimentos(id)` com `ON DELETE SET NULL`.
Os snapshots históricos sobreviveriam, mas a identidade do catálogo seria descartada sem
necessidade e a restauração exigiria criar outra linha.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| “Remover do catálogo” grava `ativo=false` | `DELETE FROM procedimentos` | some das escolhas novas sem destruir identidade histórica |
| Lista padrão mostra somente ativos | manter ativos e inativos misturados | o dentista quer limpeza operacional, não administrar flag técnica |
| Área secundária “Removidos” permite restaurar | remoção sem volta | ação reversível protege erro de clique e evita duplicata futura |
| Confirmação com `AlertDialog` | `window.confirm` | padrão visual do produto e descrição explícita do efeito |
| Ação sempre escopada a `clinica_id` + `dentista_id` | confiar só no `id`/RLS | defesa em profundidade multi-clínica e catálogo privado por dentista |
| Nome removido reutilizado restaura a linha | inserir duplicata com outro UUID | mantém identidade e impede catálogo duplicado/oculto |
| Zero migration e zero policy nova | coluna `deleted_at` ou tabela de arquivo | `ativo` já expressa exatamente o ciclo necessário |

## 3. Objetivo e como funciona

**Objetivo:** o dentista remove um procedimento das escolhas operacionais em dois cliques, sem
alterar orçamentos, documentos ou registros clínicos antigos.

Na lista ativa, a ação de lixeira abre uma confirmação. Confirmar marca a linha como inativa e
a remove imediatamente da lista e de todos os seletores que já filtram `ativo=true`. A seção
“Removidos” mostra os inativos do próprio dentista e oferece “Restaurar”. Se o mesmo nome for
cadastrado ou usado explicitamente depois, a linha removida é reativada em vez de duplicada.

## 4. Contrato técnico

### 4.1 Fonte de verdade existente

| Dado | Origem | Transformação | Destino atual |
|---|---|---|---|
| catálogo | `public.procedimentos` | RLS por clínica/dentista | Configurações, Meu Dia e orçamento |
| dono | `procedimentos.dentista_id` | perfil de `requireClinicContext()` | restringe edição ao catálogo do autor |
| visibilidade operacional | `procedimentos.ativo` | `.eq('ativo', true)` | seletores do Meu Dia e orçamento |
| histórico financeiro | `orcamento_itens.procedimento_id` + snapshot de descrição/valor | nenhuma nesta feature | orçamento e documentos antigos |

`src/app/dashboard/configuracoes/page.tsx` continua lendo ativos e removidos para a tela de
gestão, mas a query passa a incluir explicitamente `.eq('dentista_id', dentistaPerfil.id)`.
Consumidores operacionais permanecem como estão, sempre com `ativo=true`:

- `src/server/dashboard/get-meu-dia.ts`;
- `src/app/dashboard/orcamentos/_components/orcamentos-client.tsx`;
- `src/app/dashboard/pacientes/[id]/_components/paciente-detail-client.tsx`;
- ações de orçamento que consultam o catálogo para preço/vínculo.

### 4.2 Tipos e validação

`src/types/database.ts` passa a refletir a coluna que já existe no banco:

```typescript
export interface Procedimento {
  id: string;
  clinica_id: string;
  dentista_id: string;
  nome: string;
  descricao: string | null;
  codigo_tuss: string | null;
  categoria: string;
  preco_padrao: number | null;
  duracao_minutos: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type AlterarVisibilidadeProcedimentoResult =
  | { ok: true; id: string; ativo: boolean }
  | { ok: false; codigo: 'ID_INVALIDO' | 'NAO_ENCONTRADO' | 'BANCO'; erro: string };
```

Schema local em `src/app/dashboard/configuracoes/actions.ts`, não exportado pelo arquivo `use server`:

```typescript
const procedimentoIdSchema = z.string().uuid();
```

### 4.3 Server actions

Substituir o toggle orientado à implementação por ações semânticas:

```typescript
export async function removerProcedimentoDoCatalogo(
  id: string,
): Promise<AlterarVisibilidadeProcedimentoResult>;

export async function restaurarProcedimentoNoCatalogo(
  id: string,
): Promise<AlterarVisibilidadeProcedimentoResult>;
```

Ambas executam a mesma sequência:

```text
id
  → `procedimentoIdSchema.safeParse`
  → `requirePermission('configuracoes')`
  → resolve `clinicId` e `dentistaId` do contexto ativo
  → UPDATE procedimentos SET ativo=<false|true>
       WHERE id=:id AND clinica_id=:clinicId AND dentista_id=:dentistaId
       RETURNING id, ativo
  → 0 linhas: retorna NAO_ENCONTRADO sem revelar se o id existe em outro tenant/dentista
  → retorna união discriminada; nunca sucesso com 0 linhas
```

Não usar service role. Não aceitar `clinica_id`, `dentista_id` ou `ativo` vindos do cliente.
Após sucesso, `revalidatePath('/dashboard/configuracoes')` mantém reload e navegação coerentes.

### 4.4 Recriação e reativação pelo mesmo nome

`criarProcedimento` em `src/app/dashboard/configuracoes/actions.ts` e
`criarProcedimentoRapido` em `src/app/dashboard/orcamentos/actions.ts` normalizam o nome com o
helper já usado pelo orçamento (`trim`, espaços internos colapsados, comparação case-insensitive):

1. não existe nome equivalente do mesmo `clinica_id` + `dentista_id`: INSERT atual;
2. existe e está ativo: criação manual retorna erro legível “Já existe no catálogo”; o caminho
   de orçamento reutiliza o `id` atual;
3. existe e está inativo: UPDATE da mesma linha com `ativo=true` e os novos campos explícitos;
   retorna o mesmo `id`, nunca cria duplicata.

Importação herda esta regra ao passar pelo mesmo caminho de criação. Procedimento removido não
volta sozinho por leitura, refresh ou abertura de modal; somente por ação explícita de restaurar,
cadastrar/importar o mesmo nome ou usá-lo explicitamente num novo orçamento.

### 4.5 Componentes e estado

```text
ConfiguracoesPage (Server)
  → lê procedimentos do dentista ativo, ativos e removidos
  → ConfiguracoesClient (Client)
      → filtro local `ativos` (padrão) | `removidos`
      → linha ativa: Editar · Remover
      → linha removida: Restaurar
      → AlertDialog de remoção
```

Após a action, atualizar o item no estado local pelo `id`; não fazer optimistic update antes da
resposta. Falha preserva a linha e mostra `toast.error`. O contador “Removidos (N)” deriva do
array, não de estado duplicado.

### 4.6 Banco e RLS

Nenhuma migration. Permanecem:

- `procedimentos.ativo boolean not null default true`;
- RLS e isolamento do catálogo por `clinica_id`/`dentista_id`;
- FKs históricas sem alteração;
- `procedimentos_padrao` intocado — remover item pessoal nunca altera o catálogo-base usado no
  onboarding de outras contas.

## 5. Comportamento — o alvo funcional

### Estados

| Estado | Quando | Tela | Função |
|---|---|---|---|
| Vazio ativo | todos removidos | “Nenhum procedimento ativo” + Novo/Importar + acesso a Removidos | não escreve |
| Vazio removido | nenhum inativo | “Nenhum procedimento removido” | não escreve |
| Carregando | remover/restaurar em voo | ação desabilitada e feedback inline | aguarda uma única action |
| Sucesso | UPDATE retorna a linha | item muda de seção; toast curto | revalida Configurações |
| ID inválido | payload adulterado | toast genérico, item permanece | não consulta nem grava |
| Ausente ou fora do escopo | linha sumiu ou id é de outro dentista/clínica | “Procedimento não encontrado; atualize” | zero UPDATE; não revela existência alheia |
| Conflito | duas abas removem/restauram | segunda resposta reflete estado final pretendido | operação idempotente |

### Caminho principal

```text
Remover → AlertDialog explica “sai das novas escolhas; históricos permanecem”
  → Cancelar: zero escrita
  → Confirmar: action escopada → ativo=false → item sai de Ativos → entra em Removidos

Restaurar → action escopada → ativo=true → item volta para Ativos
```

### Exemplos concretos

| Situação | Sistema faz | Resultado |
|---|---|---|
| “Clareamento” nunca usado | marca inativo | some das escolhas, pode restaurar |
| “Implante” ligado a orçamento aprovado | marca inativo | orçamento continua idêntico; item não aparece em novos seletores |
| cadastrar “implante” depois | encontra nome inativo e restaura | mesmo UUID, sem duplicata |
| dentista B envia id do item de A | UPDATE retorna 0/`NAO_ENCONTRADO` | nenhum catálogo é alterado e a existência do item não vaza |

## 6. Referência visual

- **Artefato:** —; alteração localizada em lista existente, sem nova direção visual.
- **Rota:** `/dashboard/configuracoes?aba=procedimentos`.
- **Componentes:** `configuracoes-client.tsx` e `src/components/ui/alert-dialog.tsx`.

| Uso | Token/regra |
|---|---|
| superfície/lista | `bg-card`, `border-border`, `text-foreground` |
| texto secundário | `text-muted-foreground` |
| ação Remover | ícone `Trash2`, sem botão vermelho preenchido permanente |
| confirmação | `AlertDialog`; foco inicial em Cancelar |
| Restaurar | teal semântico existente; alvo mínimo 44px no mobile |

## 7. Invariantes

- [ ] Remover do catálogo nunca executa DELETE físico.
- [ ] Histórico, orçamento, aceite e PDF antigos não mudam.
- [ ] Nenhuma action aceita tenant ou dono vindos do cliente.
- [ ] Procedimento removido não aparece em escolhas filtradas por `ativo=true`.
- [ ] Nome equivalente inativo é restaurado, nunca duplicado.
- [ ] Catálogo-base `procedimentos_padrao` não é alterado.
- [ ] Falha/RLS com 0 linhas nunca aparece como sucesso.
- [ ] Light e dark usam somente tokens existentes.

## 8. Gates de aceite

- [ ] Remover ativo pede confirmação; cancelar mantém banco e UI.
- [ ] Confirmar grava `ativo=false` e o item some de Meu Dia e dos dois fluxos de orçamento.
- [ ] Orçamento antigo ligado ao item removido mantém descrição, valor e documento final.
- [ ] Restaurar grava `ativo=true` e o item reaparece sem recarregar manualmente.
- [ ] Criar/importar o mesmo nome de um removido restaura o mesmo `id`.
- [ ] Criar nome já ativo não duplica silenciosamente.
- [ ] UUID inválido, registro ausente e falha de banco mostram erros distintos e não alteram UI.
- [ ] Duas contas da mesma clínica: dentista B não remove/restaura item de A.
- [ ] Conta de outra clínica não lê nem altera o item.
- [ ] Estado vazio de Ativos e de Removidos passa em 375px, desktop, light e dark.
- [ ] Typecheck, lint dos arquivos tocados e testes da action passam.

## 9. Fora de escopo

- Exclusão física, retenção temporal ou `deleted_at`.
- Alterar preços/descrições de orçamentos históricos.
- Compartilhar catálogo entre dentistas.
- Remover itens do catálogo-base do onboarding.
- Redesenhar toda a aba de Configurações ou corrigir o fluxo atual de criação que pede reload.

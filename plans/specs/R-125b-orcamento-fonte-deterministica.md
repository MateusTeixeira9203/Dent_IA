# R-125b — Do registro ao orçamento sem item faltando ou repetido

> **SPEC** · **R-125b** · 🟡 implementado e verificado no localhost
> **Aberto:** 2026-08-22 · **Fechado:** — · **Fase:** migration aplicada; aguarda verificação em produção
> **Depende de:** R-125a para checkpoint idempotente; preserva R-113 e R-114.
> **Migration 151:** aplicada — vínculo evento↔orçamento + criação transacional.

> **Verificação local:** criação de orçamento, vínculo dos eventos, bloqueio transacional e
> remoção dos eventos já orçados da fonte foram validados pelo usuário em 22/08.

## 1. Problema

Há relatos de orçamento puxando tudo, só parte ou nada. O código confirma três fontes de
inconsistência:

1. A busca dos eventos ignora o erro do Supabase e transforma falha em lista vazia.
2. Uma ficha pode ser salva e a RPC dos eventos falhar depois; o orçamento não sabe que a fonte
   clínica está incompleta.
3. O sistema não registra quais eventos já viraram orçamento. Enquanto o evento continuar
   indicado, ele pode reaparecer em outro orçamento, inclusive depois de pagamento.

Além disso, evento avulso `tipo: 'outro'` guarda a descrição em `observacao`, mas a query atual
não busca esse campo. O orçamento pode perder justamente o texto digitado pelo dentista.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Evento estruturado é a fonte dos orçamentos novos | recompor sempre de texto legado | texto não tem identidade nem status confiável |
| Erro de consulta é erro visível | converter erro em “sem procedimentos” | vazio falso causa orçamento incompleto |
| Vínculo fica no orçamento, não no item | ligar ao item substituído em toda edição | R-113 recria itens; vínculo ao orçamento sobrevive |
| Um evento pertence a no máximo um orçamento ativo | deduplicar por descrição | descrição igual não prova ser o mesmo ato clínico |
| Criação de orçamento, itens e vínculos é uma transação | inserts sequenciais atuais | evita orçamento sem itens ou vínculo parcial |
| Checkpoint salva evento antes de orçar | orçar draft sem FK persistida | orçamento precisa de fonte auditável |
| Backfill heurístico é proibido | adivinhar vínculo histórico | falso vínculo clínico é pior que revisão manual |

## 3. Objetivo e como funciona

**Objetivo:** o orçamento exibe exatamente todos os eventos elegíveis daquele responsável, uma
vez cada, ou informa por que não consegue montar a lista.

Ao gerar orçamento, drafts ainda não persistidos passam por um checkpoint sem encerrar o
atendimento. O servidor carrega os eventos elegíveis, exclui os já vinculados a outro orçamento
e devolve itens com IDs de origem. A confirmação cria orçamento, itens e vínculos na mesma
transação. Parcialmente aprovado ou pago continua no orçamento original e não reaparece em um
novo.

## 4. Contrato técnico

### 4.1 Types

```typescript
export type OrigemItemOrcamento = 'evento' | 'manual' | 'legado';
export type FonteOrcamentoModo = 'novos_da_sessao' | 'ficha' | 'indicados_abertos';

export interface NovoOrcItem {
  procedimentoId: string;
  descricao: string;
  quantidade: number;
  preco: string;
  eventoIds: string[];
  origem: OrigemItemOrcamento;
}

export type FonteOrcamentoResult =
  | { ok: true; itens: NovoOrcItem[]; fichasLidas: number; eventosElegiveis: number }
  | { ok: false; codigo: 'CONSULTA_FALHOU' | 'CHECKPOINT_FALHOU'; error: string };
```

`EventoOdontogramaParaOrc` passa a buscar também `observacao`. Para `tipo: 'outro'`, a descrição
é `observacao.trim()`; tipos canônicos continuam usando `TIPO_LABEL`. O agrupamento usa
`grupo_id ?? id`; eventos avulsos diferentes nunca são unidos só porque ambos têm tipo `outro`.

### 4.2 Banco

```sql
create table public.orcamento_eventos (
  clinica_id uuid not null references public.clinicas(id),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  evento_id uuid not null references public.odontograma_eventos(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (orcamento_id, evento_id),
  unique (evento_id)
);
```

- `unique(evento_id)` fecha a corrida de dois orçamentos usando o mesmo evento.
- `on delete cascade` no orçamento libera o evento somente quando o orçamento inteiro é
  explicitamente excluído. Editar itens não mexe no vínculo.
- `on delete restrict` no evento impede apagar uma fonte que já sustenta documento financeiro;
  o orçamento continua sendo snapshot e não depende de alterações futuras no evento.
- RLS ativa. `SELECT` exige clínica ativa e visibilidade do orçamento pai. Escrita direta por
  `authenticated` não é concedida; criação ocorre pela RPC transacional.
- Zero `UPDATE`/`DELETE` de orçamento, ficha, evento ou paciente existente na migration.

### 4.3 Fonte única no servidor

`carregarFonteOrcamento({ pacienteId, dentistaAlvoId, modo, fichaId?, eventoIds? })` substitui a
query Supabase espalhada no hook. O serviço:

1. valida clínica, paciente e papel do ator;
2. carrega fichas/eventos com erro explícito;
3. aceita apenas `status='indicado'`, `assinatura_id is null` e responsável
   `encaminhado_para ?? autor da ficha = dentistaAlvoId`;
4. remove eventos presentes em `orcamento_eventos`;
5. converte grupos em itens preservando todos os `eventoIds`;
6. retorna contagens para log e diagnóstico.

Os três modos preservam os contratos atuais: Meu Dia usa apenas `novos_da_sessao`; orçamento
por ficha usa `ficha`; botão geral do paciente usa `indicados_abertos` do responsável.

Texto legado só é fallback quando a consulta estruturada **terminou com sucesso** e uma ficha
antiga realmente tem zero evento. Fallback nunca roda depois de erro e nasce com
`origem:'legado'`, `eventoIds:[]`.

### 4.4 Checkpoint antes do orçamento

No Meu Dia, `Gerar orçamento` verifica se há drafts `fonteFluxo:'novo'`. Se houver, chama o
mesmo save do R-125a com `finalizarAtendimento:false` e o mesmo `capturaId`. Só abre o modal
quando `eventosFalharam !== true`. Retry não cria outra ficha.

Na ficha completa, o botão salva os drafts pendentes antes de consultar a fonte. Nenhum
`EventoOdontogramaParaOrc` criado apenas em memória segue direto para `criarOrcamento`.

### 4.5 Criação transacional

```typescript
export async function criarOrcamento(dados: {
  pacienteId: string;
  dentistaId?: string;
  fichaId?: string | null;
  desconto?: number;
  itens: Array<{
    procedimentoId: string | null;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
    eventoIds: string[];
  }>;
}): Promise<{ error?: string; id?: string; conflitoEventos?: string[] }>;
```

A action valida com Zod estrito — inclusive cada item e UUID, sem `z.array(z.unknown())` — e
chama `criar_orcamento_com_eventos`. A RPC, numa única transação:

1. resolve ator, clínica e dentista responsável;
2. valida que cada ID de evento existe, é do mesmo paciente/clínica, está indicado, sem
   assinatura, pertence ao responsável correto e ainda não está vinculado;
3. exige que quantidade de IDs válidos seja exatamente a solicitada;
4. insere orçamento, itens e `orcamento_eventos`;
5. devolve o ID. Qualquer falha reverte tudo.

Item manual ou legado pode ter `eventoIds:[]`. Se outro usuário vincular um evento entre o
carregamento e o submit, a constraint vence: nenhum orçamento parcial é criado e a UI recarrega
a fonte com mensagem de conflito.

### 4.6 Compatibilidade com R-113/R-114

- Editar itens mantém `orcamento_eventos`, pois o vínculo pertence ao orçamento.
- Aprovar só parte, parcelar ou pagar não libera os eventos restantes para outro orçamento;
  eles continuam disponíveis dentro do orçamento original, conforme R-114.
- Fechar parcela continua atualizando apenas `pagamentos` (R-113).
- Excluir o orçamento inteiro libera os eventos pelo cascade, depois das confirmações atuais.

### 4.7 Dados históricos

Não haverá backfill automático: itens antigos não carregam identidade suficiente para provar
qual evento os originou. A entrega gera relatório somente leitura com candidatos por clínica,
orçamento, ficha, descrição e evento. Qualquer correção da ClinDent/VIP exige aprovação
explícita por lote. Até a revisão, eventos legados sem vínculo aparecem com aviso
**Registro anterior ao rastreamento — confira se já foi orçado**; nunca são escondidos por
comparação textual.

## 5. Comportamento — alvo funcional

| Estado | Tela | Função |
|---|---|---|
| Carregando | skeleton dos itens | não mostra lista antiga |
| Sucesso | todos os elegíveis + preço | cada item carrega IDs de origem |
| Sem elegíveis | “Nenhum procedimento novo para orçar” | não cria item vazio automático |
| Consulta falhou | erro + Tentar novamente | não usa fallback, não abre formulário enganoso |
| Checkpoint falhou | mantém cards + “Sincronizar antes de orçar” | não cria orçamento |
| Conflito | avisa que outro orçamento usou o evento | recarrega fonte |
| Legado | aviso por item/ficha | dentista confirma ou remove manualmente |
| Secretária | somente eventos do dentista selecionado | troca de dentista recarrega no servidor |

## 6. Referência visual

Sem nova identidade. O modal mantém o desenho atual aprovado; entram somente estados de erro,
aviso legado e origem invisível ao paciente. Tokens são os mesmos do produto. `DexLoader` no
carregamento; coral apenas para erro bloqueante e warning existente para conferência legada.

O PDF do paciente não mostra IDs, origem técnica ou alertas internos. Continua exibindo itens
aprovados, total, pago e falta conforme R-114.

## 7. Invariantes

- [ ] Erro nunca é convertido em lista vazia ou fallback legado.
- [ ] Um evento estruturado entra no máximo em um orçamento não excluído.
- [ ] Orçamento, itens e vínculos nascem juntos ou não nascem.
- [ ] Item pago/parcialmente aprovado nunca volta a ser sugerido em novo orçamento.
- [ ] Edição de item não perde vínculo com o evento clínico.
- [ ] Descrição de procedimento avulso preserva o texto do dentista.
- [ ] Orçamento continua snapshot: mudar evento depois não altera documento emitido.
- [ ] Nenhum dado histórico é apagado, vinculado ou reclassificado por heurística.

## 8. Gates de aceite

- [ ] G1 — 5 eventos elegíveis de 3 fichas produzem 5 fontes; nenhum some por ordem ou filtro.
- [ ] G2 — falha simulada do Supabase mostra erro e zero fallback/item vazio.
- [ ] G3 — draft do Meu Dia passa pelo checkpoint; só depois abre o orçamento.
- [ ] G4 — evento `outro` “Placa miorrelaxante” mantém essa descrição no orçamento.
- [ ] G5 — criar orçamento grava orçamento, itens e todos os vínculos na mesma transação.
- [ ] G6 — repetir com um evento já vinculado falha por conflito e não cria orçamento parcial.
- [ ] G7 — pagar uma parcela, quitar ou aprovar parcialmente não faz eventos reaparecerem.
- [ ] G8 — editar itens do orçamento preserva a quantidade de vínculos.
- [ ] G9 — excluir o orçamento libera os eventos para novo orçamento.
- [ ] G10 — secretária troca X por Y e recebe somente a fonte de Y; UUID nunca aparece.
- [ ] G11 — duas contas simultâneas não veem/vinculam eventos fora do silo (teste RLS real).
- [ ] G12 — migration deixa contagens de fichas, eventos, orçamentos e itens existentes idênticas.
- [ ] G13 — relatório legado é somente leitura e não altera ClinDent/VIP.
- [ ] G14 — modo por ficha nunca mistura outra ficha; modo geral preserva o agregado do responsável.

## 9. Fora de escopo

- Limpeza automática de duplicatas históricas ou backfill por descrição.
- Redesign do modal/PDF, tabela de preços e aprovação por item (já é R-114).
- Alterar regra financeira, parcelas ou receita.
- Excluir evento clínico já relacionado a orçamento; a fonte passa a ser protegida.

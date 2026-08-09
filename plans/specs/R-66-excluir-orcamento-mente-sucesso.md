# R-66 — "Excluir orçamento" mente sucesso + erro descartado em `financeiro/actions.ts`

> **SPEC** · **R-66** · fase **contrato — aprovada por decisão em chat (09/08)**
> **Modelo:** Sonnet (bug fix contido, mesmo padrão já documentado na memória do projeto)
> **Aberto:** 2026-08-06 (auditoria financeira) · **Escopo fechado:** 2026-08-09
> **Migration:** zero.

## Diagnóstico (confirmado no código e na RLS, 09/08)

**Parte 1 — exclusão mente sucesso.** `excluirOrcamento` ([orcamentos/actions.ts:899](../../src/app/dashboard/orcamentos/actions.ts:899))
faz `DELETE ... eq(id).eq(clinica_id)` e só retorna erro se `error` vier preenchido. A policy
`orcamentos_delete_own` é **só dono**: `dentista_id = get_my_dentista_id()` — sem exceção pra
admin nem secretaria. Quando alguém que não é dono clica Excluir, o DELETE afeta 0 linhas, o
Postgrest devolve sucesso (sem `error`), e o client (`paciente-detail-client.tsx:952-955`)
remove o item da lista local. Tela diz "apagado", banco não mudou.

**Não é só secretária** — `can_see_orcamento` (R-32) libera visão pra dono + admin +
secretaria, então qualquer um desses 3 papéis vendo orçamento de outro dentista bate no mesmo
buraco. O botão não tem gate de role nenhum em `detalhe-orcamento-modal.tsx:961`.

Mesma classe já documentada na memória do projeto (`project_rls_update_silencioso`): Supabase
devolve sucesso com 0 linhas quando a RLS bloqueia, nunca um erro.

**Parte 2 — erro descartado em `financeiro/actions.ts`.** 8 das ~13 funções do arquivo fazem
`const { data } = await query` e nunca leem `error`: `listarDespesas`, `calcularSaldoMes` (3
queries), `listarUltimos7Dias` (2), `listarUltimosMeses` (2), `listarReceitas`,
`exportarFinanceiroCsv` (3), `listarPagamentosPagos`, `listarPagamentosPendentes`. Se
qualquer uma falhar (RLS, timeout, rede), a função devolve `[]`/zero em vez de avisar — o
dashboard mostra "R$ 0" como se o mês estivesse limpo, não como se a consulta tivesse falhado.
Só as funções de escrita (`criarDespesa`, `excluirDespesa`, `criarReceita`, `excluirReceita`,
`registrarRecebimento`) checam `error` hoje.

## Decisões

| # | Decisão | Motivo |
|---|---|---|
| F1 | `excluirOrcamento` ganha `.select('id')` no DELETE final + checagem de array vazio → erro real | Mesmo fix já usado em outros lugares do projeto pra esse padrão (memória `project_rls_update_silencioso`) — é a fonte da verdade, não `error` |
| F2 | Erro de permissão diferencia de "não encontrado" | Mensagem "Você não tem permissão para excluir este orçamento — só o dentista responsável pode." é mais honesta que reaproveitar a genérica |
| F3 | Botão Excluir some pra quem não é dono (paridade com o que já existe em `/dashboard/orcamentos`) | Evita clicar em algo que sempre vai falhar — a mensagem de erro (F1/F2) é a rede de segurança, não a primeira linha de defesa |
| F4 | As 8 leituras de `financeiro/actions.ts` passam a checar `error` e lançar (`throw`) | Next.js App Router: `financeiro/page.tsx` é Server Component chamando direto (não Server Action) — um `throw` não tratado sobe pro `error.tsx` mais próximo (existe um na raiz, `src/app/error.tsx`). Path idiomático do framework, sem inventar um contrato `{ok,error}` novo pras 8 funções |

## Contrato técnico

### `orcamentos/actions.ts` — `excluirOrcamento`

Dois fixes, não um: a função apaga `pagamentos`/`orcamento_itens` **antes** do `orcamentos`
(ordem exigida pela FK RESTRICT) — sem checar dono antes, um não-dono apagaria as linhas
filhas de verdade e só o `orcamentos` final seria barrado pela RLS, deixando o orçamento
"furado" (itens/pagamentos sumidos, registro sobrevivendo). Fix real é checar dono **antes**
de tocar em qualquer linha filha; o `.select('id')` no delete final fica como defesa em
profundidade (pega qualquer outro motivo de bloqueio da RLS no futuro).

```typescript
// logo no topo da função, antes de qualquer delete:
const { data: orcDono } = await supabase
  .from('orcamentos').select('dentista_id')
  .eq('id', orcamentoId).eq('clinica_id', clinicId).maybeSingle();

if (!orcDono) return { error: 'Orçamento não encontrado.' };
if (orcDono.dentista_id !== dentistaId) {
  return { error: 'Você não tem permissão para excluir este orçamento — só o dentista responsável pode.' };
}

// trecho final da função, delete de orcamentos ganha .select():
const { data: deletado, error } = await supabase
  .from("orcamentos").delete()
  .eq("id", orcamentoId).eq("clinica_id", clinicId)
  .select("id");

if (error) return { error: error.message };
if (!deletado || deletado.length === 0) {
  return { error: "Você não tem permissão para excluir este orçamento — só o dentista responsável pode." };
}
```

Assinatura não muda (`Promise<{ error?: string }>`). `dentistaId` já vem de
`requireClinicContext()` — mesma fonte que os outros `~10` usos no arquivo.

### `paciente-detail-client.tsx` — gate do botão

O `<Button>` Excluir em `detalhe-orcamento-modal.tsx:959-965` recebe um novo prop
`podeExcluir: boolean`, calculado no pai como `detalheOrc?.dentista_id === dentistaId` (mesmo
`dentistaId` já disponível no componente — é o perfil clínico de quem está logado). `false` →
botão não renderiza (mesmo padrão que outros controles condicionais no arquivo, ex.:
`onGerarOrcamento={role !== 'secretaria' ? ... : undefined}`).

### `financeiro/actions.ts` — leituras lançam em erro

```typescript
// padrão repetido nas 8 funções — troca:
const { data } = await query;
// por:
const { data, error } = await query;
if (error) throw new Error(`Falha ao carregar dados financeiros: ${error.message}`);
```

Para as funções com múltiplas queries em `Promise.all` (ex. `calcularSaldoMes`), checar
`error` de cada resultado desestruturado antes de seguir.

## Invariantes

- [ ] `excluirOrcamento` **nunca** retorna `{}` (sucesso) sem o orçamento ter de fato saído da
      tabela — checagem por `.select('id')`, não por ausência de `error`.
- [ ] Dono do orçamento continua excluindo normalmente (regressão zero no caminho feliz).
- [ ] Botão Excluir invisível pra quem não é dono, nas duas telas (`/dashboard/orcamentos` já
      tinha; ficha do paciente ganha agora) — paridade confirmada.
- [ ] Nenhuma das 8 leituras de `financeiro/actions.ts` retorna dado parcial/zerado quando a
      query subjacente falhou — ou lança, ou o dado é real.
- [ ] `error.tsx` da raiz captura o throw sem quebrar o resto do dashboard (outras rotas
      continuam navegáveis).

## Gates de aceite (Teste01 ou Império — nunca Clindent)

- [ ] Dono exclui o próprio orçamento (sem pagamento/aceite) → some da lista, banco confirma
      0 linhas restantes.
- [ ] Simular RLS bloqueando (chamar a action com `orcamentoId` de outro dentista, via
      script/SQL direto) → retorna erro de permissão, orçamento continua no banco.
- [ ] Logar como secretária, abrir orçamento de um dentista → botão Excluir não aparece.
- [ ] Forçar erro numa query de `financeiro/actions.ts` (ex.: revogar RLS temporariamente numa
      clínica de teste, ou simular via SQL) → `/dashboard/financeiro` mostra a tela de erro,
      não "R$ 0" silencioso.
- [ ] Regressão: `/dashboard/financeiro` carrega normal com dado real (Teste01/Império),
      números batem com antes da mudança.

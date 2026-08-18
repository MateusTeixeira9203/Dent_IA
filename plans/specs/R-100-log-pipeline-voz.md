# R-100 — Evidência da pipeline de voz

> **SPEC** · **R-100** · 🧊 congelado
> **Aberto:** 2026-08-10 · **Fechado:** — · **Fase:** contrato
> **Decisão 2026-08-17:** não guardar transcrição temporariamente nesta rodada. O destino será
> uma seção recolhível da ficha, discutida junto da reestruturação do documento clínico.

## 1. Problema

Hoje sabemos se a chamada de IA funcionou e quanto demorou (`ai_usage_logs`), mas não sabemos
o que ela ouviu, o que estruturou e o que o dentista corrigiu antes de salvar. Sem esse trio,
mudanças no prompt são guiadas por exemplos inventados e erros reais se repetem sem medida.

O conteúdo é dado clínico potencialmente identificável. Não pode entrar em console,
`activity_logs` ou analytics genérico. A solução temporária proposta foi recusada: a transcrição
deve viver como parte da ficha quando a estrutura do documento for redesenhada.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Log separado de `ai_usage_logs` | acrescentar JSON clínico ao log de custo | retenção, finalidade e acesso são diferentes |
| Um `capture_id` liga transcrição, saída e correção | tentar casar por horário/paciente | concorrência e reprocessamento tornam o vínculo ambíguo |
| Gravar só ao clicar “Organizar com Dex” | registrar detecção ao vivo/debounce | R-49b está congelado; ruído sem decisão clínica |
| Saída original é imutável; resultado final entra no save | atualizar a saída da IA | preserva a evidência do erro |
| A falha do log nunca impede atendimento | transação conjunta com prontuário | observabilidade não pode bloquear cuidado |
| Sem painel de produto nesta fatia | dashboard de métricas agora | primeiro coletar dado confiável |

## 3. Objetivo e como funciona

**Objetivo:** permitir comparar, por execução do campo mágico, a entrada recebida, a estrutura
gerada e a estrutura efetivamente salva, sem expor o conteúdo fora da operação autorizada.

Ao organizar, o servidor cria a captura e devolve `captureId`. O cliente mantém esse id junto
do rascunho. No save da ficha, envia o mesmo id; o servidor grava o snapshot final depois da
validação clínica. Reorganizar o texto cria outra captura, sem sobrescrever a anterior.

## 4. Contrato técnico

### Banco

```sql
create table public.ai_clinical_captures (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id),
  dentista_id uuid not null references public.dentistas(id),
  paciente_id uuid not null references public.pacientes(id),
  ficha_id uuid null references public.fichas(id) on delete set null,
  feature text not null check (feature in ('formatar-evolucao', 'extrair-endodontia')),
  model text not null,
  prompt_version text not null,
  input_text text not null,
  model_output jsonb not null,
  final_output jsonb null,
  saved_at timestamptz null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
```

- `clinica_id` obrigatório em toda consulta.
- RLS: dentista autor pode inserir/ler suas capturas; ninguém de outra clínica acessa.
- Service role pode executar expurgo. Secretária não lê conteúdo clínico desta tabela.
- Job de expurgo remove linhas com `expires_at < now()`.
- **Bloqueio D1:** prazo de retenção ainda depende de aprovação do usuário (§9).

### Tipos

```typescript
export type ClinicalCaptureFeature = 'formatar-evolucao' | 'extrair-endodontia';

export type ClinicalCaptureStart = {
  captureId: string;
  promptVersion: string;
};

export type ClinicalCaptureFinal = {
  captureId: string;
  fichaId: string;
  finalOutput: EvolucaoFormatada;
};
```

`EvolucaoFormatada` ganha `capture_id: string | null`. `salvarFicha`/roteamento da visita
aceitam `aiCaptureId?: string`; o servidor associa somente captura da mesma clínica,
dentista e paciente. ID inválido não altera captura alheia.

### Escrita

- `/api/dex/formatar-evolucao`: depois de validar a saída, cria captura e devolve o id.
- `salvarFicha`: após ficha/eventos serem persistidos, grava `ficha_id`, `final_output` e
  `saved_at`. Se esse update falhar, retorna sucesso clínico e registra erro técnico sem payload.
- Nunca registrar `input_text`, `model_output` ou `final_output` em console/Sentry.

## 5. Comportamento

| Estado | Resultado |
|---|---|
| Organização bem-sucedida | rascunho recebe `captureId`; captura contém entrada + saída |
| IA falha antes da saída válida | mantém somente log técnico existente; nenhuma captura clínica parcial |
| Dentista corrige e salva | captura ganha snapshot final e `fichaId` |
| Dentista abandona | captura permanece sem `final_output` até expirar |
| Log falha | organização/save continuam; erro técnico não contém dado clínico |
| ID de outro contexto | associação recusada silenciosamente para o dado alheio e erro técnico emitido |

## 6. Referência visual

— Sem UI nesta fatia.

## 7. Invariantes

- [ ] Prontuário nunca depende do sucesso do log.
- [ ] Captura nunca cruza clínica, dentista ou paciente.
- [ ] Entrada e saída original nunca são sobrescritas pela correção.
- [ ] Payload clínico nunca entra em console ou log genérico.
- [ ] Toda captura expira; retenção indefinida é proibida.
- [ ] Nenhuma captura é usada para treinar ou alterar produção automaticamente.

## 8. Gates de aceite

- [ ] Organizar relato sintético cria uma captura com o mesmo texto e estrutura devolvida.
- [ ] Alterar um status na revisão e salvar preserva saída original e grava final diferente.
- [ ] Simular falha no insert/update do log não impede organizar nem salvar a ficha.
- [ ] Conta A não lê nem associa captura da conta B (teste com 2 contas logadas).
- [ ] Expurgo remove uma captura sintética vencida e mantém uma vigente.
- [ ] Busca em logs do servidor não encontra trechos do relato usado no teste.

## 9. Fora de escopo e condição para voltar

- Painel de métricas, exportação, aprendizado automático e detecção em tempo real.
- Aguardar a spec de reestruturação da ficha: ela define o bloco recolhível “Transcrição do
  relato”, quem o visualiza e como ele entra no documento clínico. Só então esta spec volta.

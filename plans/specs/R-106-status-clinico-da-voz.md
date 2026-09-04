# R-106 — Voz distingue realizado, indicado, negação e ambiguidade

> **SPEC** · **R-106** · 🧊 base absorvida pelo R-139c
> **Aberto:** 2026-08-12 · **Fechado:** — · **Fase:** congelada; continuidade no R-139c com eval
> **Depende de:** baseline do eval atual. R-100 está congelado e não bloqueia esta correção.

## 1. Problema

No Meu Dia, o campo mágico frequentemente transforma tudo que foi narrado em `realizado`.
Isso fecha tratamentos que deveriam permanecer indicados e afirma execução clínica sem
evidência. O controle individual e “✓ tudo feito” já existem; o erro nasce antes, na extração.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| `realizado` exige evidência explícita de execução | passado genérico = feito hoje | histórico e descrição nominal viram falso realizado |
| Ambíguo nasce `indicado` + `revisar_status` | criar terceiro status no banco | status clínico continua binário; revisão é transitória |
| Negação nunca gera realizado do procedimento negado | capturar toda palavra citada | nome mencionado não prova execução |
| Revisão acontece nos cards existentes | modal de confirmação | mais atrito e duplicação de UI |
| Ações “tudo feito” e “tudo indicado” | default global configurável | gesto explícito por relato é mais seguro |
| Prompt só muda após baseline | editar e testar no olho | regra clínica exige eval antes/depois |

## 3. Objetivo e como funciona

**Objetivo:** depois de organizar um relato, cada evento aparece na categoria compatível com
o que o dentista afirmou, e qualquer inferência insegura fica indicada para revisão.

O pass 1 retorna status e a razão da classificação. O parser converte ambiguidade em
`status='indicado'` e `revisar_status=true`. O Meu Dia mostra o sinal “Confira” no card e
mantém troca individual; as ações de lote cobrem relatos uniformes.

**Revisão 1 (17/08, antes do código):** a nova régua vale para `modo='consulta'`, que é o
relato do atendimento atual. `modo='exame_inicial'` preserva sua regra existente de histórico
preexistente, inclusive conclusão explícita datada; reclassificar documentos antigos não faz
parte deste bug.

## 4. Contrato técnico

### Saída da IA

```typescript
export type EvidenciaStatus =
  | 'execucao_explicita'
  | 'indicacao_explicita'
  | 'negacao'
  | 'historico'
  | 'ambiguo';

export interface OdontogramaEventoInput {
  // campos existentes
  status: 'indicado' | 'realizado';
  evidencia_status: EvidenciaStatus;
  revisar_status: boolean;
}
```

`evidencia_status` e `revisar_status` são metadados do rascunho. Não viram colunas em
`odontograma_eventos`; `montarRowsEventos` continua selecionando somente campos persistentes.

Regras no parser após Structured Output:

```typescript
if (evidencia === 'execucao_explicita') status = 'realizado';
else status = 'indicado';

revisarStatus = evidencia === 'ambiguo' || evidencia === 'historico';
```

O modelo não pode produzir `realizado` com evidência diferente de `execucao_explicita`.
O servidor normaliza essa combinação mesmo que a resposta venha incoerente.

### UI existente

`NestaSessaoBloco` ganha:

- badge textual discreto `Confira` quando algum id do card tem `revisar_status`;
- ação `✓ tudo feito` continua aparecendo quando existe indicado;
- ação `Tudo indicado` aparece quando existe realizado;
- qualquer troca manual remove `revisar_status` dos ids afetados;
- ação em lote remove a revisão dos eventos afetados.

### Eval

O `golden.json` passa a separar casos por intenção e o runner mede:

```typescript
type StatusMetrics = {
  realizadoPrecision: number;
  realizadoFalsePositives: number;
  indicadoRecall: number;
  negacaoViolations: number;
  ambiguousReviewRecall: number;
};
```

Gate duro: falso `realizado` e violação de negação não podem aumentar. O baseline é salvo em
`evals/extracao-clinica/results/` sem payload de paciente real.

## 5. Comportamento

| Relato | Resultado |
|---|---|
| “Fiz profilaxia” | realizado · execução explícita · sem revisão |
| “Paciente precisa de profilaxia” | indicado · indicação explícita |
| “Indiquei clareamento” | indicado · indicação explícita |
| “Realizei clareamento em consultório” | realizado · execução explícita |
| “Não fiz o canal, só o curativo no 46” | nenhum canal realizado; se canal entrar, indicado |
| “Canal no 46” | indicado · ambíguo · Confira |
| “Instrumentei o 46 até lima 35” | endodontia realizada |
| “Vamos extrair o 18 na próxima” | indicado · `proxima_sessao` só por ação do dentista; IA não define momento |
| “Já fez canal há anos” no relato da consulta | indicado · histórico · Confira; nunca feito hoje |
| Documento em `exame_inicial` dizendo “restauração concluída em 15/03/2024” | preserva a regra histórica existente; fora desta fatia |

Estados de falha:

- IA indisponível: texto permanece intacto e pode ser tentado novamente.
- Saída inválida: nenhum evento parcial entra no rascunho.
- Reorganizar: merge sem perda não sobrescreve correção manual existente.

## 6. Referência visual

Sem tela nova. Reusa `RegistroCard`; único acréscimo é o marcador textual `Confira` e a ação
de lote simétrica. Tokens existentes de warning/coral, sem cor hardcoded.

## 7. Invariantes

- [ ] Somente `execucao_explicita` pode gerar `realizado`.
- [ ] Negação nunca gera realizado do procedimento negado.
- [ ] Ambiguidade favorece `indicado`, nunca `realizado`.
- [ ] `exame_inicial` mantém a semântica atual de histórico; R-106 não reclassifica documento antigo.
- [ ] `realizado_em` continua sendo definido pelo cliente/servidor, nunca pela IA.
- [ ] `momento_planejado` continua fora da decisão da IA.
- [ ] Troca manual do dentista vence a proposta e não é sobrescrita ao reorganizar.
- [ ] Zero migration nesta fatia.

## 8. Gates de aceite

- [ ] Rodar eval antes da mudança e salvar baseline.
- [ ] Os nove exemplos da §5 passam em 3 rodadas; zero falso realizado nos casos proibidos.
- [ ] Conjunto atual não perde eventos esperados nem aumenta extras.
- [ ] “Canal no 46” aparece indicado com “Confira”; um toque muda para feito e remove o aviso.
- [ ] “Tudo indicado” muda somente os cards atuais e limpa suas revisões.
- [ ] “✓ tudo feito” continua funcionando e preenche data clínica pelo caminho existente.
- [ ] Falha de rede mantém o texto e o rascunho anterior intactos.
- [ ] Ditado real no localhost cobre feito + indicado + negação na mesma gravação.

## 9. Fora de escopo

- Painel/brilho em tempo real (R-49b congelado).
- Terceiro status persistente, confiança percentual e aprendizado automático.
- Extração dos campos internos de especialidade (R-49).

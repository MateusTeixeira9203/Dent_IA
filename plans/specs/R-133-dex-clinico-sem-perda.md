# R-133 — Dex clínico sem perda e rápido

> **SPEC** · **R-133** · 🔵 ativo
> **Aberto:** 2026-08-26 · **Fechado:** — · **Fase:** contrato
> **Baseia-se em:** R-106 (evidência de status) e R-125a (revisão manual). Compatível com R-129.
> **Migration:** nenhuma.

## 1. Problema

O Campo Mágico estrutura bem os tipos conhecidos, mas pode perder silenciosamente um procedimento
clínico que não cabe no enum visual da IA. O sistema já aceita `tipo: 'outro'`, já salva esse
evento, já o leva ao orçamento e já permite cadastrá-lo no catálogo; a rota do Dex é que ainda
barra essa saída. `exame_periodontal` também existe no domínio e não está no enum da rota.

Consequência: o termo pode sobreviver em `procedimentos` ou no texto da evolução, mas não virar
card revisável nem registro clínico. A correção não pode tornar o Dex mais lento, inventar
procedimentos ou transformar citação/negação em procedimento realizado.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Abrir `outro` e `exame_periodontal` no schema atual | criar um novo modelo universal de procedimentos | o domínio e o banco já suportam os dois |
| Procedimento desconhecido vira `outro` com nome em `observacao` | descartar evento e deixar só no texto | elimina a perda silenciosa e mantém revisão |
| Reusar `RegistroCard`, edição e orçamento existentes | criar modal/tela de “não reconhecidos” | mais UI e mais cliques sem ganho clínico |
| Uma chamada principal de IA | segunda chamada para classificar desconhecidos | latência e custo maiores no caminho comum |
| Match local continua como atalho instantâneo | mandar o catálogo inteiro no prompt | aumenta tokens e mistura catálogo comercial com ontologia clínica |
| Nome desconhecido não é salvo automaticamente no catálogo | aprendizagem automática por clínica | associação errada vira erro recorrente; o dentista confirma manualmente |
| Status segue R-106 e permanece editável | IA confirmar o status sem revisão | decisão clínica continua sob controle humano |

## 3. Objetivo e funcionamento

**Objetivo:** todo procedimento clínico explícito identificado pelo Dex deve chegar à revisão,
mesmo quando não possuir símbolo/tipo estrutural próprio, sem adicionar uma chamada remota ao
fluxo nem aumentar a latência observada além do orçamento definido nesta spec.

Fluxo:

1. Enquanto o dentista digita, `casarProcedimentoLocal` continua sugerindo tipos e itens do
   catálogo sem rede.
2. Ao clicar **Organizar com Dex**, a rota realiza a mesma chamada estruturada de hoje.
3. Tipo conhecido gera o evento específico. Procedimento explícito fora do vocabulário gera
   `tipo: 'outro'`, preservando o nome clínico em `observacao`.
4. O evento entra na mesma revisão e no mesmo odontograma dos demais. Nada é salvo antes da
   revisão e do comando atual de salvar.
5. O dentista pode editar descrição/status, remover ou manter. O fluxo manual existente continua
   permitindo salvar o termo no catálogo para usos futuros.

## 4. Contrato técnico

### 4.1 Contrato da rota

`POST /api/dex/formatar-evolucao` mantém body, status HTTP e shape de resposta atuais. A mudança
é aditiva dentro de `odontograma_eventos`:

```typescript
export type TipoRegistroOdontograma =
  // tipos existentes
  | 'exame_periodontal'
  | 'outro';

export interface OdontogramaEventoInput {
  tipo: TipoRegistroOdontograma;
  status: 'indicado' | 'realizado';
  origem: 'clinica' | 'preexistente';
  momento_planejado: 'sessao_atual' | 'proxima_sessao';
  ancora: AncoraClinica;
  observacao: string;
  evidencia_status?: EvidenciaStatus;
  revisar_status?: boolean;
  // demais campos atuais permanecem
}
```

Mudanças em `formatar-evolucao/route.ts`:

- `ODONTOGRAMA_EVENTO_SCHEMA.properties.tipo.enum` ganha `exame_periodontal` e `outro`.
- `TIPOS_ACEITOS` ganha os mesmos dois valores.
- O prompt define `outro` como escape clínico obrigatório, nunca como categoria genérica para
  diagnóstico, material, conversa, coordenação ou texto sem intervenção.
- Em `outro`, `observacao` contém o nome clínico específico dito/corrigido pelo contexto, nunca
  apenas “outro procedimento”.
- Com dente explícito, a âncora é `dente`. Com arcada/quadrante/boca explícitos, preserva esse
  escopo. Sem localização anatômica dita, usa `boca` como registro clínico geral, sem inventar
  dentes.
- `outro` com `observacao` vazia é inválido e não pode ser materializado.

### 4.2 Regras clínicas do fallback

O modelo só usa `outro` quando todas forem verdadeiras:

1. há intervenção odontológica explícita feita ou indicada;
2. nenhum tipo específico do enum descreve corretamente a intervenção;
3. o nome pode ser preservado sem inventar diagnóstico, localização, material ou técnica.

Exemplos:

| Relato | Evento esperado |
|---|---|
| “fiz gengivoplastia no 11 e 21” | dois `outro`, observação `Gengivoplastia`, dentes 11/21 |
| “instalei mantenedor de espaço no 75” | `outro`, dente 75 |
| “fiz moldagem para estudo” | `outro`, nível boca, observação `Moldagem para estudo` |
| “cárie no 16” | nenhum `outro`; achado permanece anotação/indicação específica |
| “não fiz a gengivoplastia” | nunca `outro` realizado |
| “usei resina Z350” | material não vira `outro` sozinho |

### 4.3 Status e revisão

- R-106 permanece a única regra da evidência de status da IA.
- No Meu Dia, `modoLancamento` continua sobrescrevendo a sugestão da IA por meio de
  `mesclarEventosSemPerda`; esta entrega não muda essa regra.
- Na ficha, o status sugerido permanece editável antes de salvar.
- `outro` não recebe tratamento privilegiado: pode ser removido, alterado, encaminhado e marcado
  como indicado/realizado pelos mesmos controles do card atual.

### 4.4 Apresentação e orçamento

`RegistroCard` passa a derivar o título assim:

```typescript
const rotulo = data.tipo === 'outro' && data.observacao.trim()
  ? data.observacao.trim()
  : TIPO_LABEL[data.tipo];
```

O orçamento já usa a mesma regra em `use-orcamento-modal.ts`; ela é preservada. Sem casamento
com um item do catálogo, o preço continua vazio para confirmação — o Dex nunca inventa valor.

### 4.5 Velocidade

- A mudança não adiciona fetch, chamada de IA, consulta ao banco nem catálogo no prompt.
- O match local permanece síncrono e anterior à chamada remota.
- O enriquecimento endodôntico existente continua assíncrono e não bloqueia a primeira revisão;
  esta entrega não cria enriquecimento equivalente para `outro`.
- `buildDentalContext()` pode ser materializado uma vez no escopo do módulo, desde que o teste
  prove que a função não depende de usuário, clínica ou request.
- Os rótulos de progresso continuam temporais e honestos; não fingem streaming de procedimentos.
- Gate de performance: mediana e p95 da suíte depois não podem piorar mais de 10% contra o
  baseline da mesma máquina/sessão. Se piorar, não sobe até remover a regressão.

### 4.6 Arquivos previstos

| Arquivo | Mudança |
|---|---|
| `src/app/api/dex/formatar-evolucao/route.ts` | enum, prompt, parser e contexto estático |
| `src/components/fichas/registro-card.tsx` | título clínico de `outro` |
| `evals/extracao-clinica/golden.json` | casos desconhecidos e adversariais |
| `evals/extracao-clinica/run.cjs` | match de observação + métricas de fallback/latência |
| testes unitários próximos do parser/card | enum, observação obrigatória e regressões |

Nenhuma tabela, migration, RLS, server action ou RPC muda.

## 5. Comportamento — alvo funcional

| Estado | Resultado observável |
|---|---|
| Texto vazio | botão continua desabilitado; nenhuma chamada |
| Match local conhecido | chip aparece imediatamente; zero rede |
| Conhecido pela IA | card estrutural atual, sem mudança visual |
| Desconhecido com localização | card com o nome específico e âncora informada |
| Desconhecido sem localização | card geral, sem dente inventado |
| Ambíguo/histórico | card revisável conforme R-106; nunca realizado silenciosamente |
| Negado | não gera procedimento realizado |
| Resposta inválida/timeout | nenhum resultado parcial; relato permanece no campo e pode repetir |
| Sucesso | todos os cards chegam à revisão; salvar continua sendo ação separada |

```text
texto/voz → match local instantâneo → Organizar com Dex (1 chamada)
  → tipo específico OU `outro` com nome preservado
  → cards editáveis → revisão humana → salvar
```

## 6. Referência visual

Não há tela nova nem artefato novo. A implementação reutiliza o visual aprovado da ficha e do
Meu Dia (R-122/R-123/R-125a) e o mesmo `RegistroCard`. A única diferença visível é que o título
do tipo `outro` mostra o procedimento real em vez de “Outro procedimento”. Tokens, ordem dos
blocos, tamanhos, motion, dark/light e responsividade permanecem inalterados.

## 7. Invariantes

- [ ] Procedimento desconhecido identificado nunca é descartado por falta de enum.
- [ ] `outro` sempre preserva uma descrição clínica não vazia.
- [ ] Diagnóstico, material isolado, negação e conversa não viram procedimento por fallback.
- [ ] Nenhum dente, face, status, diagnóstico, material ou preço é inventado.
- [ ] A IA organiza; o dentista revisa e salva.
- [ ] Uma entrada comum continua fazendo uma única chamada principal de estruturação.
- [ ] Correções manuais e eventos já existentes nunca são sobrescritos pela nova extração.
- [ ] R-106, R-49 e ortodontia não regridem.
- [ ] Nenhum dado existente é migrado ou reclassificado.

## 8. Gates de aceite

- [ ] **G1 — baseline:** rodar `evals/extracao-clinica/run.cjs` antes da mudança e guardar o
  JSON local de métricas/latência, sem payload real de paciente.
- [ ] **G2 — conhecidos:** todos os casos `atual` mantêm o resultado baseline; zero aumento de
  falsos procedimentos realizados e zero violação de negação.
- [ ] **G3 — desconhecidos:** gengivoplastia 11/21, mantenedor 75 e moldagem geral chegam como
  `outro` com observação e âncora esperadas.
- [ ] **G4 — falso positivo:** achado, material isolado, conversa e planejamento sem intervenção
  definida não geram `outro`.
- [ ] **G5 — status:** “não fiz gengivoplastia” nunca gera realizado; frase ambígua fica para
  revisão conforme R-106.
- [ ] **G6 — exame periodontal:** o tipo existente passa pela rota e chega ao card sem virar
  `outro`.
- [ ] **G7 — título:** `outro` com observação “Gengivoplastia” mostra esse nome no card; vazio
  degrada com segurança e não gera card clínico sem descrição.
- [ ] **G8 — orçamento:** evento `outro` aparece com a observação como descrição, preço vazio e
  editável; nenhum valor é inferido.
- [ ] **G9 — falha:** simular 500/timeout mantém o relato e não adiciona metade dos eventos.
- [ ] **G10 — desempenho:** uma organização comum faz um POST principal; p50 e p95 pós-mudança
  ficam dentro de 10% do baseline da mesma suíte.
- [ ] **G11 — paridade:** o mesmo relato produz os mesmos eventos na ficha e no Meu Dia, salvo a
  regra manual de status já contratada no Meu Dia.
- [ ] **G12 — regressão:** `npm run typecheck`, testes unitários e eval passam com a versão atual
  de `@google/genai` antes de qualquer commit.

## 9. Fora de escopo

- Aprendizagem automática de sinônimos, tabela de aliases ou escrita automática no catálogo.
- Novo símbolo odontológico para cada procedimento desconhecido.
- Diagnóstico automático, sugestão terapêutica ou decisão clínica autônoma.
- Streaming em tempo real/dente a dente (R-49b), modelo novo ou segundo provider.
- Redesenho do Campo Mágico, dos cards, da ficha ou do Meu Dia.
- Alterar preços, faturamento, permissões ou dados antigos.

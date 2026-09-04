# R-151 — Dex organiza a ficha com baixa latência

> **SPEC** · **R-151** · 🧊 execução local pausada para isolar a branch
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** aprovada; pausa de integração · **Revisão:** 2
> **Migration:** nenhuma.

## 1. Problema

Ao clicar em **Organizar com Dex**, um relato digitado pequeno pode demorar o bastante para
interromper a consulta. Nesse caminho não existe upload de áudio: o cliente envia poucos KB, mas
a rota executa trabalho remoto em série antes e durante a estruturação.

O fluxo atual de `POST /api/dex/formatar-evolucao` faz rate limit por IP; autenticação, clínica
ativa e perfil completo; possível assinatura do avatar, inútil nesta rota; rate limit por
identidade; e só então chama o provider. O prompt leva o glossário integral e repete parte do
schema; o perfil fixa `gemini-2.5-flash`, até 16.384 tokens e retries que alongam a cauda.

O log atual mede principalmente a chamada bem-sucedida ao provider. Ele não separa preparação,
IA, pós-processamento e tempo HTTP total, portanto uma otimização pode apenas deslocar a espera.

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Reduzir latência real ponta a ponta | apenas trocar o texto do loader | o dentista precisa receber a ficha antes |
| Duas trilhas com fronteira dura | misturar infraestrutura e inteligência no mesmo deploy | permite provar o ganho seguro antes de tocar na extração clínica |
| Trilha A mantém modelo, prompt e configuração atuais | diminuir o modelo já na primeira entrega | completude clínica é o principal ativo do Dex |
| Manter uma chamada estruturada e atômica | streaming parcial ou dois modelos em paralelo | parcial pode ser inconsistente; paralelo dobra custo e privilegia o primeiro, não o mais correto |
| Identidade mínima para a rota | usar `getDentistaCached()` completo | avatar, plano e demais campos não participam da extração |
| Executar em paralelo somente gates independentes | remover autenticação/rate limit | velocidade não reduz proteção |
| Prompt/modelo menor somente como experimento | promover candidato por latência | experimento informa decisão; não altera produção sozinho |
| Região escolhida por benchmark | fixar `gru1` ou `iad1` por intuição | função deve equilibrar usuário, banco e provider |

O `gemini-2.5-flash` e o prompt vigentes são a inteligência da Trilha A, não apenas rollback. O
[`gemini-2.5-flash-lite`](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite)
pode participar da Trilha B em Preview. Região segue a
[orientação da Vercel](https://vercel.com/docs/functions/configuring-functions/region), com prova ponta a ponta.

## 3. Objetivo e ordem de execução

**Objetivo:** entregar a mesma ficha estruturada em menos tempo, primeiro otimizando tudo ao redor
da IA; só experimentar mudança clínica se o ganho seguro não for suficiente.

### Trilha A — otimização segura e publicável para todos

1. registrar baseline reproduzível e separar as etapas;
2. cortar preparação remota desnecessária e paralelizar gates independentes;
3. conferir região e cold start;
4. publicar mantendo modelo, prompt, schema, tokens de saída, retry e timeout vigentes;
5. comparar o resultado com o baseline e ouvir os usuários.

Metas da Trilha A na mesma Preview, região e conjunto sintético:

- `pre_ai_ms` p95 ≤ 750 ms e pelo menos 40% menor que o baseline;
- `total_ms` p50 melhora pelo menos 10% ou 500 ms; p95 não piora mais de 5%;
- alvo operacional para relatos digitados curtos/médios: p50 ≤ 3 s e p95 ≤ 6 s;
- nenhuma regressão nos gates clínicos da §8.

### Trilha B — otimização clínica experimental

Só começa depois do resultado da Trilha A. Compara prompt, limite de saída e modelos em Preview,
uma variável por vez. Não atende tráfego real nem altera o padrão de produção. Se a Trilha A já
resolver a espera, a Trilha B pode encerrar apenas como relatório. Qualquer promoção exige nova
aprovação do usuário e atualização desta spec antes do código produtivo.

## 4. Contrato técnico

### 4.1 Request, resposta e campos

- Body, status HTTP e resposta `EvolucaoFormatada` permanecem idênticos na Trilha A.
- `modo: 'consulta' | 'exame_inicial'` mantém a mesma semântica; nenhum campo novo é necessário.
- Erro mantém o relato no cliente e não produz ficha parcial, como hoje.
- A resposta completa mantém os nove campos atuais de `EvolucaoFormatada`; nenhum pode virar
  etapa tardia ou opcional para ganhar velocidade.
- Endodontia preserva o parser local e o enriquecimento de canais/medidas explicitamente narrados.
  Formulários de implante/periodontia permanecem editáveis; o item não altera seu autopreenchimento.

### 4.2 Medição técnica sem conteúdo clínico

O runner do eval registra, por amostra sintética:

```ts
interface DexLatencySample {
  totalMs: number;
  preAiMs: number;
  aiMs: number;
  postAiMs: number;
  model: string;
  promptVersion: string;
  inputChars: number;
  promptChars: number;
  outputItems: number;
  ok: boolean;
}
```

- O servidor expõe `Server-Timing` para `pre-ai`, `ai` e `post-ai`; o runner mede `totalMs`.
- Métricas não contêm relato, prompt, resposta, nome de paciente, e-mail ou chave.
- O resultado local fica em `evals/extracao-clinica/results/`, já ignorado pelo Git.
- R-142 continua dona da persistência agregada em `ai_usage_logs`; R-151 não cria migration nem
  uma segunda tabela de telemetria.

### 4.3 Identidade e gates anteriores à IA

Novo helper mínimo, ancorado na resolução canônica de clínica ativa:

```ts
interface DexActor {
  dentistaId: string;
  clinicaId: string;
}

function getDexActorCached(): Promise<DexActor | null>;
```

- autenticação continua server-side e a clínica vem de `users.active_clinica_id`;
- a busca do dentista continua filtrando `user_id + clinica_id` e sujeita à RLS;
- o helper não lê plano, clínica nominal, especialidade, avatar nem Storage;
- guarda IP e resolução do ator, por serem independentes, começam juntas;
- limite por identidade só inicia após ator válido e mantém a chave
  `endpoint:clinicaId:dentistaId` definida no R-142;
- falha de qualquer gate faz zero chamada ao provider.

R-151 pode reorganizar espera, mas não reduzir limites, remover a guarda anônima ou criar caminho
de autenticação baseado em dado enviado pelo cliente.

### 4.4 Inteligência congelada na Trilha A

- modelo `gemini-2.5-flash`, `temperature: 0.2` e thinking desligado permanecem;
- prompt, `responseSchema`, glossário, `maxOutputTokens`, retry e timeout permanecem byte a byte
  quando a mudança não for exigida pelo R-142 já aprovado;
- `DEX_PROMPT_VERSION` não muda por otimização de infraestrutura;
- parse, classificação, reconciliação, ortodontia e complemento endodôntico permanecem;
- não existe seleção de modelo por velocidade da internet nem fallback para modelo menor;
- uma organização continua com uma chamada principal estruturada.

O baseline guarda hash do prompt montado e snapshot das opções do provider para relatos
sintéticos. A Trilha A falha se qualquer um mudar sem justificativa externa do R-142.

### 4.5 Bancada experimental clínica — Trilha B

A bancada aceita perfis explícitos somente em teste/Preview:

```ts
interface DexExperimentProfile {
  id: string;
  model: string;
  promptVariant: 'current' | 'compact';
  maxOutputTokens: 4_096 | 8_192 | 16_384;
}
```

- o controle é sempre modelo, prompt e 16.384 tokens atuais;
- cada experimento muda uma única variável contra o controle;
- candidatos precisam ser estáveis e suportar `responseSchema` e thinking desligado;
- `gemini-2.5-flash-lite` é candidato permitido, nunca default implícito;
- fixtures são sintéticas ou da clínica de teste; nenhuma clínica real recebe variante;
- JSON inválido, truncamento, campo ausente, falso realizado ou perda de procedimento elimina o perfil;
- saída da bancada é relatório de latência, qualidade e custo, não alteração de configuração;
- promover qualquer perfil exige nova aprovação e revisão do contrato produtivo.

Não se combina prompt compacto + modelo menor no primeiro teste: sem isolamento não é possível
saber qual mudança causou ganho ou regressão.

### 4.6 Região e cold start

- confirmar a região real da Function e do Supabase; o `vercel.json` atual não fixa região;
- comparar a região atual, a mais próxima do banco e `gru1` somente com Preview e fixtures
  sintéticas;
- medir warm e primeira chamada após instância fria separadamente; não misturar no mesmo p95;
- selecionar região pelo menor `total_ms`, não apenas pela proximidade do usuário;
- configuração paga, aumento material de custo ou alteração de região em produção exige aprovação
  explícita antes de aplicar;
- a implementação deve ler a documentação local do Next 16.3.3 antes de escolher route config ou
  `vercel.json`.

## 5. Comportamento — alvo funcional

| Situação | Resultado observável |
|---|---|
| Relato digitado curto | mesma estrutura e inteligência; menos espera antes da IA |
| Texto transcrito e depois editado | mesmo prompt e regras de correção fonética atuais |
| Documento anexado | regras de histórico permanecem; nunca vira execução da clínica por inferência |
| Relato com vários procedimentos/status | uma resposta atômica, com todos os cards e status distintos |
| Provider falha/demora | retry, timeout e erro atuais permanecem na Trilha A |
| Sem sessão/outra clínica | 401/negação antes do provider; nenhum vazamento ou chamada paga |
| Experimento clínico | executa só em Preview e produz relatório; não altera produção |
| Candidato rápido regressa | é descartado, mesmo que seja muito mais rápido |

Caminho principal:

```text
clicar Organizar
  → guarda IP || identidade mínima
  → rate limit da identidade
  → validação Zod
  → prompt e modelo clínicos atuais
  → geração estruturada atual
  → parse/reconciliação local
  → ficha completa para revisão
```

## 6. Referência visual

Sem tela, componente ou artefato novo. Botão, `DexLoader`, textos, dark/light e revisão existentes
permanecem. O ganho precisa ser tempo real; não se simula velocidade com animação ou etapas falsas.

## 7. Invariantes

- [ ] Uma organização faz uma chamada principal ao provider.
- [ ] O contrato `EvolucaoFormatada` e os dois consumidores, Ficha e Meu Dia, permanecem iguais.
- [ ] Campos gerais, ortodontia e detalhes endodônticos disponíveis hoje não perdem cobertura.
- [ ] Trilha A preserva modelo, prompt, schema, limite de saída, retry e timeout atuais.
- [ ] Experimento nunca atende clínica real nem muda o default de produção.
- [ ] Precisão, recall e falso realizado não regridem para ganhar velocidade.
- [ ] Clínica ativa e dentista são resolvidos no servidor e toda query mantém `clinica_id`.
- [ ] Guarda IP e limite por identidade definidos no R-142 continuam ativos.
- [ ] Prompt, relato, resposta e aliases clínicos nunca entram em logs de latência.
- [ ] Falha ou timeout preserva o relato e não aplica resultado parcial.
- [ ] Nenhuma migration, write clínico, cache de prontuário ou dependência nova entra no item.
- [ ] Promoção experimental exige nova aprovação explícita do usuário.

## 8. Gates de aceite

- [ ] **G1 — baseline:** runner mede 20 organizações sintéticas após um warm-up, respeitando o rate
  limit na mesma Preview/região; salva p50/p95 e quatro etapas da §4.2.
- [ ] **G2 — preparação:** testes provam que `getDexActorCached` não consulta Storage/campos
  completos; `pre_ai_ms` p95 fica ≤ 750 ms e melhora ≥ 40%.
- [ ] **G3 — isolamento:** sessão ausente e duas contas de clínicas diferentes mantêm identidade,
  cota e resposta separadas; zero chamada ao provider nos bloqueios.
- [ ] **G4 — inteligência congelada:** hashes/snapshots provam que Trilha A preservou modelo,
  prompt, schema, tokens, thinking, retry e timeout vigentes.
- [ ] **G5 — latência segura:** `total_ms` p50 melhora ≥ 10% ou 500 ms e p95 não piora mais de 5%;
  alvo permanece p50 ≤ 3 s e p95 ≤ 6 s para relatos digitados curtos/médios.
- [ ] **G6 — região:** se houver troca, Preview prova melhora ponta a ponta em warm e não piora
  p95 mais de 10% nas consultas Supabase; custo e região são apresentados antes de produção.
- [ ] **G7 — paridade e campos:** Ficha e Meu Dia recebem os nove campos atuais; fixtures cobrem
  queixa, conduta, alerta, multi-dente, ortodontia e endodontia. Implante/periodontia continuam
  editáveis manualmente; o complemento não bloqueia a primeira resposta.
- [ ] **G8 — falha:** 429, 503 e timeout preservam comportamento, mensagem e relato atuais; nenhuma
  tentativa, resultado parcial ou chamada extra nasce da otimização.
- [ ] **G9 — experimento isolado:** perfil experimental só pode ser ativado em teste/Preview e não
  muda configuração produtiva, body ou resposta do endpoint.
- [ ] **G10 — qualidade experimental:** cada variável candidata roda contra o controle; finalistas
  passam o golden três vezes, sem queda, extras, falso realizado, truncamento ou campo ausente.
- [ ] **G11 — decisão:** relatório mostra p50/p95, acurácia, falhas e custo. Mesmo aprovado nos
  testes, nenhum candidato é promovido sem confirmação nova do usuário.
- [ ] **G12 — qualidade técnica:** testes de identidade/timing/rota, `npm run typecheck`, lint do
  recorte, `npm test`, build e `git diff --check` passam.
- [ ] **G13 — produção:** amostra sintética pós-deploy confirma o ganho com o modelo e prompt atuais;
  feedback real é observado antes de decidir se a Trilha B precisa avançar.

## 9. Fora de escopo

- Upload, compressão, streaming ou transcrição de áudio.
- Transcrição/estruturação parcial enquanto o dentista ainda fala.
- Trocar precisão por sensação de velocidade ou aplicar card antes da resposta completa.
- Redesign do Campo Mágico, loader ou revisão clínica.
- Alterar schema, RLS, tabela de logs ou guardar conteúdo clínico.
- Cachear ficha/resposta por relato, pois capturas clínicas não são intercambiáveis.
- Dashboard de métricas, roteamento aleatório entre providers ou aprendizado automático.
- Promover prompt compacto, modelo menor ou novo limite de saída sem nova aprovação.
- Implementar R-133, R-139c, R-141, R-142, R-143 ou R-148 dentro deste item; R-151 apenas respeita
  seus contratos e experimenta sobre a versão clínica vigente.

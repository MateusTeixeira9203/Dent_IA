# R-142 — Contratos e hardening do Dex

> **SPEC** · **R-142** · ⏳ fila
> **Aberto:** 2026-08-30 · **Fechado:** — · **Fase:** aprovada para execução

## 1. Problema

As Server Actions recebem eventos como `z.array(z.unknown())`; no Meu Dia, após `safeParse`, o
código chama o serviço com o objeto original. Texto e áudio não têm limites próprios, o rate
limit principal usa apenas IP antes da autenticação, o timeout por `Promise.race` não encerra o
transporte, erros internos chegam ao cliente e os logs não permitem medir regressão clínica.

Também enviamos o nome do paciente ao Gemini sem necessidade para a estruturação.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Schema Zod compartilhado e discriminado | casts após `unknown` | compilador não valida dado de rede |
| Toda Action usa `parsed.data` | validar e continuar com input original | torna a validação decorativa |
| Limites antes do provider | deixar provider/Vercel rejeitar | mensagem, custo e memória ficam previsíveis |
| Rate limit por identidade clínica após auth | somente IP | NAT da clínica não pode bloquear a equipe inteira |
| Guarda IP pré-auth separada | remover proteção anônima | mantém barreira barata contra abuso |
| Timeout nativo/AbortSignal | apenas `Promise.race` | libera transporte e recursos locais |
| Metadados agregados sem relato | armazenar prompt/resposta | observabilidade sem copiar prontuário |
| Erros públicos tipados e genéricos | devolver `err.message` | não expõe implementação/segredo |
| Nome do paciente fora do prompt | manter como “contexto” | não participa da extração |

## 3. Objetivo e como funciona

**Objetivo:** toda entrada do Dex é autenticada, limitada e validada antes de alcançar provider ou
banco; toda falha é recuperável e observável sem registrar conteúdo clínico.

O servidor valida limites, aplica guarda IP e cota da identidade ativa, chama o provider com
timeout real, valida a resposta, registra métricas agregadas e usa somente o valor parseado.

## 4. Contrato técnico

### 4.1 Schemas compartilhados

Novo módulo `src/lib/odontograma/schemas.ts` exporta:

```ts
const ancoraClinicaSchema: z.ZodType<AncoraClinica>;
const odontogramaEventoInputSchema: z.ZodType<OdontogramaEventoInput>;
const odontogramaEventoDraftSchema: z.ZodType<OdontogramaEventoDraft>;
const ortoManutencaoSchema: z.ZodType<OrtoManutencaoInfo>;
```

Regras:

- âncora é união discriminada por `nivel`; campos incompatíveis são rejeitados;
- FDI, faces, arcada, quadrante, status, origem e momento usam enums/limites reais;
- `id` e destinos são UUID; observação tem no máximo 2.000 caracteres;
- `realizado_em` segue `YYYY-MM-DD | null` e só é aceito em realizado;
- detalhes de endodontia, implante e exame periodontal usam os schemas existentes dos plugins;
- outro tipo não aceita `detalhe` arbitrário;
- campos transitórios permitidos são enumerados; assinatura/autoria/`clinica_id` nunca vêm do
  cliente como autoridade;
- `salvarVisitaMeuDia` e `salvarFicha` encaminham `parsed.data`, nunca `dados/input` original.

### 4.2 Limites de entrada

```ts
const MAX_DEX_TEXT_CHARS = 50_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
```

- JSON/body inválido ou texto vazio/acima do teto → 400, sem chamar IA.
- `Content-Length` de áudio acima do teto → 413 antes de `formData()` quando disponível; após
  parse, `File.size` é a autoridade.
- MIME aceitos: FLAC, MP3/MPEG, MP4/M4A, OGG, WAV e WEBM; demais → 415.
- O teto de 4 MiB deixa margem sob o limite de 4,5 MB das Vercel Functions. O Groq aceita mais,
  mas a infraestrutura atual não; arquivos maiores ficam fora desta entrega.
- Gravação do produto continua limitada a 10 minutos pela R-141.

Fontes do limite: [Vercel Functions](https://vercel.com/docs/functions/limitations) e
[Groq Speech-to-Text](https://console.groq.com/docs/speech-to-text).

### 4.3 Autenticação e rate limit

Fluxo das rotas clínicas:

```text
guarda IP anônima (60/min/endpoint)
  → autenticação + clínica ativa
    → limite identidade `${endpoint}:${clinicaId}:${dentistaId}` (20/min)
      → validação/provider
```

- Upstash continua sendo fonte distribuída; fallback em memória é apenas degradação de
  disponibilidade, nunca evidência de limite global.
- Resposta 429 inclui `Retry-After` e mensagem pública estável.
- Secretaria continua sem autorização para escrita clínica onde as Actions já a proíbem.
- Nenhuma chave usa nome/e-mail/paciente.

### 4.4 Provider, timeout e erro público

`generateStructuredGemini` e wrappers Groq passam timeout/AbortSignal pelo SDK/HTTP. O
`Promise.race` isolado sai. O cancelamento encerra espera/transporte local; não se promete cancelar
o processamento já iniciado no serviço externo, pois o SDK declara essa limitação.

Contrato público:

```ts
type DexErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA'
  | 'RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_FAILED';

type DexErrorResponse = { error: string; code: DexErrorCode };
```

Timeout → 504; falha do provider/JSON → 502; mensagem interna fica só no log seguro. Retry ocorre
apenas para 429/503, respeita AbortSignal e registra quantidade de tentativas.

### 4.5 Privacidade e prompt

- `pacienteNome` pode permanecer temporariamente no body por compatibilidade, mas não entra no
  prompt nem em log e deve ser removido dos callers em seguida.
- Regras estáveis ficam em `systemInstruction`; o relato fica como conteúdo de usuário delimitado.
- Nenhum prompt, resposta, áudio, transcrição ou observação clínica vai para `ai_usage_logs`.

### 4.6 Observabilidade

Migration aditiva em `ai_usage_logs`:

```sql
prompt_version  text,
input_size      integer,
output_items    integer,
status_counts   jsonb,
evidence_counts jsonb,
retry_count     smallint,
http_status     smallint
```

- JSONB contém somente chaves de enum e contagens inteiras.
- Logger verifica `{ error }` do Supabase e registra falha de persistência no console sem payload.
- Sucesso e falha da rota principal são registrados; `prompt_version` é constante versionada.
- Dashboard de produto pode agregar por clínica/feature, mas usuários não leem a tabela direta;
  policy service-role-only permanece.

## 5. Comportamento — alvo funcional

| Situação | HTTP/resultado | Provider/banco |
|---|---|---|
| Body válido/autenticado | 200 | uma chamada; dados parseados |
| Evento forjado/malformado | Action `{ok:false}` | nenhuma escrita |
| Texto >50k | 400 `INVALID_INPUT` | zero IA |
| Áudio >4 MiB | 413 | zero Groq |
| MIME inválido | 415 | zero Groq |
| Sem sessão | 401 | zero IA |
| Cota excedida | 429 + retry | zero IA |
| Timeout | 504 | transporte local abortado |
| Provider falha | 502 | relato preservado no cliente |
| Log falha | resposta clínica não quebra | erro operacional visível sem PHI |

## 6. Referência visual

Sem UI nova. Mensagens usam toast/estado de erro existentes. R-143 cobre apresentação e
acessibilidade; esta entrega define apenas códigos e textos públicos estáveis.

## 7. Invariantes

- [ ] Query/escrita clínica continua escopada pela clínica ativa e RLS.
- [ ] Dados usados por Action são exatamente `parsed.data`.
- [ ] Entrada rejeitada não chama provider nem escreve parcialmente.
- [ ] Nenhum conteúdo clínico ou identificador nominal entra em log de IA.
- [ ] Timeout não deixa promise/retry local órfão.
- [ ] Log indisponível nunca derruba o atendimento.
- [ ] Migration é aditiva e mantém policy service-role-only.

## 8. Gates de aceite

- [ ] **G1:** schemas cobrem âncoras válidas e rejeitam combinações, UUIDs e detalhes inválidos.
- [ ] **G2:** cliente adulterado não consegue gravar evento fora do schema nem de outra clínica.
- [ ] **G3:** testes de limite provam status HTTP e zero chamada ao provider.
- [ ] **G4:** duas contas na mesma rede não compartilham cota de identidade; duas clínicas ficam
  isoladas; guarda IP anônima continua ativa.
- [ ] **G5:** timeout aborta a request local, encerra retries e devolve 504 estável.
- [ ] **G6:** cliente nunca recebe `err.message`, chave, stack ou resposta do provider.
- [ ] **G7:** logs de sucesso/falha contêm versão, tamanhos/contagens e zero texto clínico.
- [ ] **G8:** migration aplicada primeiro e testada com service role + duas contas antes do código.
- [ ] **G9:** typecheck, 23 testes, lint do escopo e integração Ficha/Meu Dia passam.

## 9. Fora de escopo

- Upload direto/chunking para áudio maior que 4 MiB.
- Armazenar ou reproduzir áudio depois de fechar a página.
- Dashboard visual de observabilidade.
- Trocar modelos/providers ou alterar política comercial de uso.

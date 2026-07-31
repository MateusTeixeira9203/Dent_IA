# Fase 0 do R-46 — diagnóstico do "Organizar com Dex" (ficha rápida)

> **Auditoria** · 2026-07-31 · 15 agentes (3 mapeadores + 4 caçadores por lente + 6 verificadores
> adversariais + síntese) · leitura estática, zero escrita, zero chamada de IA, zero execução do app
> **Motivo:** ele relatou que o Organizar com Dex da ficha rápida "não está funcionando direito" —
> pré-requisito da Fase 0 da spec [R-46-meu-dia](../specs/R-46-meu-dia.md) antes de R-46d (Dex
> embutido) e do "colar do Word nível 2".

## Achados confirmados — 6 de 27 candidatos, todos gravidade alta

Cada achado abaixo passou por um verificador adversarial instruído a tentar derrubá-lo com
evidência de código; os 6 sobreviveram. 21 candidatos descartados na triagem por gravidade (lista
completa no journal do workflow — a maioria é UX/perf, não perda de dado).

| # | Onde | O quê | Live hoje? |
|---|---|---|---|
| 1 | `FichasTab.tsx:1210` | **Delete-by-omission real no banco.** Reabrir ficha salva → complementar no campo mágico → Organizar → confirmar → salvar: eventos do odontograma que a nova extração não recriar são **deletados** pela RPC 107 (ela apaga por id tudo que não veio na lista nova; o Organizar gera ids novos pra tudo, nunca reaproveita os reais) | **Sim** |
| 2 | `FichasTab.tsx:1174` | **Zero confirmação.** `formDirty` não inclui `eventosDraft` — lançar procedimento manual no odontograma (clique no dente, chip de rotina) não dispara o guard; o 2º Organizar sobrescreve sem NENHUM confirm, nem o genérico que já existe pro texto | **Sim** |
| 3 | `useAudioRecorder.ts:80-84` | Mic quebrado em Safari/iOS — fallback de mimeType nunca tenta `audio/mp4`; erro vira "verifique as permissões" (mentira) e o indicador de mic fica aceso | Sim (mobile) |
| 4 | `useAudioRecorder.ts` + `useCapturaLivre.ts:117-120` | Depois de 1 erro de mic, todo clique seguinte só repete o toast — nunca tenta gravar de novo na mesma sessão do painel. Só sai fechando o painel (perde o texto digitado) ou recarregando | Sim |
| 5 | `useAudioRecorder.ts:119-126` | Falha de hardware **no meio do ditado** (não no clique de parar) é 100% silenciosa — sem toast, sem log; o relato ditado até ali some | Sim (raro) |
| 6 | `FichasTab.tsx:1193` + `salvar-ficha.ts:169,234` | **`alerta_novo` (alergia/medicamento novo) nunca grava** no campo estruturado pela ficha rápida — vira só texto solto na observação. Pior: reeditar pela ficha rápida uma ficha que nasceu no modo consulta **apaga** o `alerta_novo` real que já estava salvo (sempre grava `?? null`) | **Sim** |

Duas pistas do enunciado original — checadas e **não confirmadas**: a rota usa
`generateStructuredGemini` com `responseSchema` de ponta a ponta (regra do projeto cumprida, zero
parse manual); e não é uma das "rotas Groq disfarçadas de Gemini" da memória do projeto — é Gemini de fato.

## Impacto nas fatias do R-46

- **R-46d bloqueado.** Os achados 1, 2 e 5 acontecem no exato mecanismo que R-46d planeja embutir
  ("propostas em lista, ✓ uma a uma, nunca aceitar tudo") — reusar o pipeline como está reproduz o
  apagamento *dentro* do Meu dia. O gate já escrito na spec ("proposta rejeitada não deixa rastro")
  exige consertar 1 e 2 antes, não depois.
- **Pré-req "mic iPhone" precisa ser re-escopado.** A spec estimava ~4 linhas (só achado 3). Os
  achados 4 e 5 são defeitos distintos (sem retry; falha silenciosa em pleno ditado) não cobertos
  por essa estimativa.
- **R-46c (nível 1, sem IA) e R-46b (registrar no Meu dia) — independentes.** Nenhum achado os alcança.
- **R-46f (estado do paciente / alergia)** ganha um dado direto: a extração já detecta `alerta_novo`
  certo — o problema é só a ficha rápida não persistir. R-46f decide se herda esse dado ou o
  contrato novo o substitui.
- **R-46a, R-46e — independentes** (zero-escrita / sem pipeline Dex).

## Correções propostas (esboço — não implementado nesta fase)

1. **Delete-by-omission:** reconciliar por dente+face+tipo com os ids reais de `handleEdit` em vez
   de `crypto.randomUUID()` pra tudo — ou exigir confirmação por evento removido, não substituição
   silenciosa do array inteiro.
2. **formDirty:** incluir `eventosDraft.length > 0` na condição do guard.
3. **mimeType Safari:** fallback pra `audio/mp4` quando `audio/webm` não é suportado.
4. **Retry travado:** expor caminho de volta a `idle` sem sair do painel (`toggleVoz` tenta de novo,
   ou `resetError()` antes da nova tentativa).
5. **Erro silencioso mid-recording:** callback `onError` dedicado no `recorder.onerror`, com log.
6. **`alerta_novo`:** enviar no payload de `handleSave` (espelhar `consulta-client.tsx`); no
   servidor, não sobrescrever com `null` quando o payload omite o campo.

**Arquivos lidos:** `FichasTab.tsx` · `useAudioRecorder.ts` · `useCapturaLivre.ts` ·
`captura-livre-card.tsx` · `voice-ux.tsx` · `/api/dex/formatar-evolucao/route.ts` · `provider.ts` ·
`salvar-ficha.ts` · migration 107 · `consulta-client.tsx` (contraste).

## Correção (R-47) — 2 rodadas, 31/07

Achados 1, 2 e 6 (os 3 de perda silenciosa) corrigidos no mesmo dia. Fluxo: fix → typecheck/lint/
build → workflow de verificação adversarial (5 agentes: 1 refutador por achado + 2 caçadores de
regressão) contra o diff real.

**1ª rodada** — achado 2 e achado 6 confirmados genuinamente fechados. **Achado 1 reaberto**: o
merge usava `dedupEventosDraft` pra fundir `eventosDraft` existente com a extração nova, mas o
desempate de colisão daquela função é "menor id lexicográfico" — arbitrário entre um id REAL do
banco e um `crypto.randomUUID()` novo. ~50% de chance do evento novo (sem `detalhe`/`observação`)
vencer, e a RPC 107 apagava a linha real por omissão de id — mesma classe do bug original, agora
condicional em vez de garantida. 3 agentes independentes (o refutador do achado 1 + os 2 caçadores
de regressão) bateram na mesma linha.

**2ª rodada** — regra trocada: o que já existe em `eventosDraft` **nunca** perde pra uma
reextração. Se a chave semântica de um evento novo já existe em `prev`, o novo é descartado
(reextrair algo já lançado vira no-op, não upgrade automático). `dedupEventosDraft` continua
rodando, mas só nos eventos novos entre si (seu propósito original — a IA emitir o mesmo evento
2x na mesma leitura). Também corrigido de raspão: `alertaNovoDetectado` não zera mais se uma 2ª
chamada do Organizar, na mesma sessão sem salvar, não repetir o alerta.

**Trade-off aceito e documentado, não corrigido:** se o Dex reextrai o MESMO procedimento com
status diferente (ex.: indicado → realizado), a chave muda (status entra nela) e os dois
convivem como cards — duplicata **visível** antes de salvar, não perda silenciosa. Fica pro
R-46d resolver com desenho de verdade (merge de status), não como heurística client-side.

**Não verificado ao vivo** — o pane do browser não compositava do meu lado nesta sessão (screenshot
e clique falharam). Verificação foi só estática: typecheck + lint + build limpos nas duas rodadas,
mais 2 workflows de verificação adversarial (Fase 0 achou os bugs, o 2º workflow tentou refutar o
fix). Rebaixado pra 🟡 no roadmap por isso — falta o teste ao vivo pra virar ✅.

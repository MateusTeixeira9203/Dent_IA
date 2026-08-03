# R-48 — Voz confiável (mic iOS, retry, falha no meio do ditado)

> **SPEC** · **R-48** · ✅ concluído e verificado
> **Aberto:** 2026-08-01 · **Fechado:** 2026-08-01 · **Fase:** aprovada
> **Modelo:** Sonnet 5 (3 defeitos já diagnosticados, 2 arquivos, zero schema/RLS/IA).
> **Origem:** achados 3, 4 e 5 da [Fase 0](../auditorias/2026-07-31-fase0-dex-ficha-rapida.md)
> — os únicos que sobraram sem correção (1, 2 e 6 viraram o R-47).
> **Bloqueia:** o cockpit do R-46 (a voz em destaque no topo) e o R-46d (Dex embutido).
> **Sem UI nova:** os componentes de voz (`voice-ux.tsx`, `captura-livre-card.tsx`) já existem;
> esta fatia conserta o motor, não redesenha nada.

## 1. Por que agora

Ele quer a voz **em destaque no topo** do cockpit novo. Hoje ela **estoura antes de gravar
1 segundo no iPhone e no iPad** — e o aparelho da cadeira é justamente esse. Colocar a peça
mais visível em cima do único pedaço comprovadamente quebrado é o caminho mais curto pro
dentista perder a confiança na ferramenta inteira.

## 2. Os 4 defeitos (3 do audit + 1 achado ao escrever esta spec)

| # | Onde | O quê |
|---|---|---|
| **A** | `useAudioRecorder.ts:80-82` | O mimeType só tenta `audio/webm;codecs=opus` → `audio/webm`. **Safari não grava webm** — grava `audio/mp4`. `new MediaRecorder` lança, e o `catch` genérico do `:179` transforma isso em `status: 'error'` |
| **B** | `useCapturaLivre.ts:117-120` | Depois de 1 erro, todo clique seguinte só repete o toast — nunca tenta gravar de novo. Só sai fechando o painel (**perde o texto digitado**) ou recarregando a página |
| **C** | `useAudioRecorder.ts:119-126` | Falha de hardware **no meio do ditado** é 100% silenciosa: sem toast, sem log. O `resolveStopRef` só resolve se alguém estiver esperando — no meio da gravação ninguém está, então o áudio já capturado é **descartado sem aviso** |
| **D** | `useCapturaLivre.ts:53` | **Achado novo (01/08).** O upload manda nome fixo `'audio.webm'`, e o Groq infere o formato pela extensão (`groq.audio.transcriptions.create({ file })` — o SDK envia o `File.name`). Corrigir o A sem corrigir o D troca "não grava" por "grava e a transcrição falha" |

**Mentira secundária do A:** a mensagem que o dentista vê é *"Verifique as permissões do
navegador"* (`useCapturaLivre.ts:118,125`) — mas a permissão foi concedida; o que faltou foi
codec. Ele vai mexer em permissão pra sempre e nunca funcionar.

## 3. Escopo

**Cobre:** negociação de mimeType · nome de arquivo coerente com o formato · retry sem sair
do painel · falha no meio do ditado deixando de ser silenciosa **e** aproveitando o áudio já
capturado · mensagens de erro que dizem a verdade.

**Não cobre:** redesenhar a UI de voz (é o cockpit, R-46) · embutir voz no Meu dia (R-46d) ·
os achados 1/2/6 (já são o R-47) · trocar Whisper/Groq por outro provider.

## 4. Decisões

| # | Decisão | Alternativa descartada |
|---|---|---|
| **D1** | Lista ordenada de candidatos, **primeiro suportado vence**; se nenhum, cai no default do browser (`mimeType` omitido) antes de desistir | Hardcode `if (Safari) mp4` — user-agent sniffing quebra no próximo browser |
| **D2** | Falha no meio do ditado **entrega o áudio já capturado** em vez de descartar | Só logar o erro (o audit propunha isso) — melhor devolver 40s ditados que 0 |
| **D3** | `startRecording` passa a devolver **o motivo** do erro, não `boolean` | Manter boolean e a mensagem genérica que mente |
| **D4** | O nome do arquivo é derivado do mimeType real negociado | Mandar sempre `.webm` (é o defeito D) |

## 5. Contratos

```typescript
// src/hooks/useAudioRecorder.ts

/** Ordem de preferência. Opus é o melhor pra voz; mp4 é o que o Safari/iOS grava.
 *  '' = deixa o browser escolher (último recurso antes de falhar). */
const MIME_CANDIDATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''] as const;

export type MicErro =
  | 'permissao'    // getUserMedia negado — a única em que "verifique as permissões" é verdade
  | 'sem-suporte'  // nenhum mimeType serve e o default também falhou
  | 'hardware';    // qualquer outra falha do dispositivo

interface UseAudioRecorderOptions {
  onAutoStop?: (blob: Blob | null) => void;
  silenceAutoStop?: boolean;
  /** NOVO (C) — falha DURANTE a gravação, não no clique de parar. `blobParcial` traz o que
   *  já foi capturado (null só se nada foi). */
  onError?: (motivo: MicErro, blobParcial: Blob | null) => void;
}

interface UseAudioRecorderReturn {
  status: RecorderStatus;
  timer: number;
  /** MUDA (D3) — era Promise<boolean>. */
  startRecording: () => Promise<{ ok: true } | { ok: false; motivo: MicErro }>;
  stopRecording: () => Promise<Blob | null>;
  /** NOVO (B) — volta de 'error' pra 'idle' sem desmontar o painel. */
  resetError: () => void;
  /** NOVO (D) — o mimeType realmente negociado; quem faz upload nomeia o arquivo por ele. */
  mimeType: string | null;
}
```

```typescript
// src/lib/audio-mime.ts — NOVO. Puro, testável sem browser.
/** 'audio/webm;codecs=opus' → 'webm' · 'audio/mp4' → 'mp4'. Default 'webm'. */
export function extensaoDoMime(mime: string): string;
```

```typescript
// src/hooks/useCapturaLivre.ts — o consumidor
// processarAudio passa a nomear pelo tipo real (D):
//   fd.append('audio', blob, `audio.${extensaoDoMime(blob.type || mimeType || '')}`);
// toggleVoz no estado 'error' passa a chamar resetError() e TENTAR DE NOVO (B),
// em vez de só repetir o toast.
```

Mensagens por motivo (substituem a única genérica de hoje):

| Motivo | Texto |
|---|---|
| `permissao` | "Microfone bloqueado. Libere o acesso nas permissões do navegador." |
| `sem-suporte` | "Este navegador não consegue gravar áudio. Tente o Safari (iPhone/iPad) ou o Chrome atualizado." |
| `hardware` | "Não foi possível acessar o microfone. Tente de novo." |
| erro no meio (C) | "A gravação falhou no meio. Transcrevendo o que deu tempo de capturar." (ou "…e não deu tempo de capturar nada." se `blobParcial` for null) |

## 6. Invariantes

- [x] **I1** — Nenhum user-agent sniffing. A escolha do codec é sempre por
      `MediaRecorder.isTypeSupported`, nunca por string de browser (D1). Confirmado por 2
      revisores adversariais independentes, código lido linha a linha.
- [x] **I2** — O nome do arquivo enviado ao `/api/transcrever` **sempre** bate com o formato
      real do blob (nomeado a partir de `blob.type`, nunca de um ref assíncrono). Confirmado
      por 2 revisores + teste ao vivo (G3): upload `audio.mp4;codecs=opus`.
- [x] **I3** — **Achado real na primeira implementação, corrigido em seguida.** Os 2
      revisores adversariais (rodadas independentes) discordaram do teste ao vivo original e
      acertaram: `onstop` não tinha o fallback que `onerror` tem — quando a track do mic
      termina sozinha, o navegador dispara `stop` (não `error`, por spec), e esse caminho
      descartava o áudio em silêncio, reproduzindo o defeito C original. Corrigido consolidando
      `onstop`/`onerror` num único `finalizar()`, travado por `sessaoFinalizadaRef` (também
      fecha a corrida que o revisor 2 apontou: navegador pode disparar os dois eventos pra uma
      falha só). **Confirmado ao vivo depois do fix**, com log temporário: track parada →
      `onstop` disparou (não `onerror`) → `finalizar` recebeu blob de 77905 bytes → caminho
      "ninguém esperando" → toast certo → upload real → `200 OK`. Caminho de stop manual
      reconfirmado sem regressão na mesma sessão.
- [x] **I4** — Mensagem de erro nunca culpa permissão quando a permissão foi concedida.
      Confirmado ao vivo (G4): `getUserMedia` rejeitando com `NotAllowedError` → mensagem fala
      de permissão; toda falha no meio é hardcoded `'hardware'`, nunca `'permissao'`.
- [x] **I5** — Depois de qualquer erro, existe caminho de volta a gravar **sem perder o texto
      já digitado ou transcrito** no painel (B). Confirmado ao vivo (G5): texto digitado
      sobreviveu a um ciclo erro→retry real (2º `getUserMedia` chamado, não só toast repetido).
- [x] **I6** — Corte automático por silêncio (4s) continua funcionando igual. Confirmado por
      leitura (bloco intocado pelo diff) e ao vivo (G7): auto-stop disparou dentro da janela
      esperada.

## 7. Gates de aceite

- [x] **G1** — **Confirmado por ele no aparelho real (01/08): "funcionou 100%".** É o gate
      que dá razão ao item — mic do iPhone/iPad grava e transcreve. Item fecha ✅.
- [x] **G2** — Confirmado ao vivo: gravar e transcrever no caminho normal (stop manual)
      continua funcionando sem regressão depois do fix do I3.
- [x] **G3** — Confirmado ao vivo: `isTypeSupported` forçado a recusar webm → gravador escolheu
      `audio/mp4`, upload nomeado `audio.mp4`, `POST /api/transcrever` → `200 OK` (2×, antes e
      depois do fix do I3).
- [x] **G4** — Confirmado ao vivo: permissão negada → mensagem específica de permissão.
- [x] **G5** — Confirmado ao vivo: retry depois de erro tenta gravar de novo (não só repete
      toast) e preserva o texto já digitado.
- [x] **G6** — **Achado quebrado no teste ao vivo original** (o próprio agente que testou não
      conseguiu reconfirmar depois — pane instável, ficou como suposição não verificada). 2
      revisores de código bateram nisso independente do teste ao vivo, código confirmou o bug,
      fix aplicado, **reconfirmado ao vivo com log temporário** — ver I3.
- [x] **G7** — Confirmado ao vivo: silêncio de ~4s disparou auto-stop dentro da janela.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| `audio/mp4` do Safari vem em container que o Whisper recusa | G3 testa o caminho ponta a ponta antes do aparelho; Groq aceita mp4/m4a na lista oficial |
| Mudar a assinatura de `startRecording` quebra chamador | 1 chamador só (`useCapturaLivre`), pego pelo typecheck |
| Aproveitar blob parcial gera transcrição truncada estranha | Preferível a perder tudo (D2); o aviso diz que foi parcial |
| Fica verificado só no desktop e falha no iPhone mesmo assim | G1 é explicitamente dele e **bloqueia o fechamento do item** — sem iPhone real, o item fica 🟡, não ✅ |

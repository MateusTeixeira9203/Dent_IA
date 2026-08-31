# R-141 — Captura Dex sem perda de trabalho

> **SPEC** · **R-141** · ⏳ fila
> **Aberto:** 2026-08-30 · **Fechado:** — · **Fase:** aprovada para execução

## 1. Problema

Áudio, arquivo e organização possuem estados locais dentro de `CapturaLivreCard`; os donos do
formulário não sabem que o Dex ainda trabalha. É possível salvar ou trocar de paciente antes do
resultado chegar. Se a transcrição falha, o `Blob` sai do escopo e o dentista precisa ditar de
novo. Após quatro segundos de silêncio, a gravação encerra sem aviso.

São falhas de confiança no núcleo do produto: trabalho já realizado pelo dentista pode sumir.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Estado de captura comunicado ao dono do fluxo | estados apenas no card | save/troca precisam conhecer o processamento |
| Último áudio fica em memória até sucesso/descarte | upload preventivo em storage | evita persistir voz clínica sem necessidade |
| Retry reutiliza o mesmo `Blob` | pedir nova gravação | perda de trabalho é inaceitável |
| Bloquear save durante trabalho pendente | salvar e aplicar resultado depois | resultado tardio pode cair no paciente errado |
| Aviso antes do auto-stop | remover auto-stop | mãos livres ainda reduzem atrito |
| Estado real em vez de etapas temporizadas | progresso fictício | feedback precisa dizer a verdade |
| Um fluxo compartilhado em Ficha/Meu Dia | correções independentes | evita nova divergência |

## 3. Objetivo e como funciona

**Objetivo:** depois que o dentista grava, anexa ou organiza, o trabalho permanece recuperável até
ser incorporado ao rascunho ou descartado explicitamente.

Durante processamento, salvar/trocar fica indisponível. Falha de transcrição mostra “Tentar
novamente” usando o áudio existente. Silêncio mostra contagem antes de encerrar e qualquer fala
retoma a gravação automaticamente.

## 4. Contrato técnico

### 4.1 Máquina de estados

```ts
type CapturaDexFase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'processing_file'
  | 'organizing'
  | 'transcription_error'
  | 'organizing_error';

interface CapturaDexState {
  fase: CapturaDexFase;
  busy: boolean;
  impedeSalvar: boolean;
  audioParaRetry: boolean;
  motivoAutoStop: 'silencio' | 'limite' | null;
}
```

`busy` é verdadeiro em recording/transcribing/processing_file/organizing.
`impedeSalvar` também é verdadeiro em `transcription_error` enquanto houver áudio recuperável.

`CapturaLivreCardProps` ganha callback estável:

```ts
onCapturaStateChange?: (state: CapturaDexState) => void;
```

`FichasTab` e o fluxo do Meu Dia armazenam o snapshot e o usam nos controles de salvar, trocar
agendamento/paciente e desmontar o rascunho.

### 4.2 Áudio recuperável

`useCapturaLivre` passa a expor:

```ts
interface UseCapturaLivreReturn {
  // contrato atual preservado
  retryTranscription: () => Promise<void>;
  discardPendingAudio: () => void;
  hasPendingAudio: boolean;
}
```

- O `Blob` mais recente fica em ref/estado de memória antes do POST.
- Sucesso com transcrição não vazia acrescenta o texto e limpa o `Blob`.
- Erro HTTP/rede mantém o `Blob` e entra em `transcription_error`.
- Retry é idempotente na UI: um clique inicia no máximo um POST.
- Nova gravação ou troca de paciente com áudio pendente exige confirmar descarte.
- Unmount normal limpa a memória; navegação é impedida/confirmada pelo dono antes disso.
- Áudio nunca vai para localStorage, IndexedDB, log ou banco nesta entrega.

### 4.3 Silêncio e limite

`useAudioRecorder` separa aviso e parada:

```ts
const SILENCE_WARNING_MS = 4_000;
const SILENCE_STOP_MS = 7_000;
const MAX_RECORDING_MS = 10 * 60_000;
```

- Aos 4s sem voz após fala detectada, `VoiceUX` mostra “Pausa detectada — encerrando em 3s”.
- Voz acima do threshold ou ação “Continuar gravando” cancela a contagem.
- Aos 7s, encerra com motivo `silencio`; aos 10min, com motivo `limite`.
- Parada manual, silêncio e limite usam o mesmo caminho de montagem do `Blob`.
- Falha de hardware preserva chunks já capturados como áudio recuperável.

### 4.4 Coordenação e feedback

- Botões Organizar/Anexar/Gravar respeitam exclusão mútua; não iniciam operações concorrentes.
- Salvar mostra o motivo específico quando bloqueado, não um botão aparentemente quebrado.
- Troca de paciente/agendamento aguarda a operação ou confirma descarte do áudio não transcrito.
- `ETAPAS` temporizadas deixam de simular progresso. Textos derivam da fase real:
  “Transcrevendo áudio”, “Lendo arquivo”, “Organizando ficha”.
- `AbortController` do componente cancela fetch ao desmontar após descarte confirmado.

## 5. Comportamento — alvo funcional

| Estado | Tela | Ações permitidas |
|---|---|---|
| Idle | captura normal | gravar, anexar, organizar, salvar |
| Gravando | timer + parar | parar; salvar/trocar bloqueados |
| Pausa | contagem + continuar | continuar ou encerrar |
| Transcrevendo | loader Dex + texto honesto | aguardar; salvar/trocar bloqueados |
| Erro de transcrição | tentar novamente + descartar | retry ou descarte explícito |
| Lendo arquivo | nome do arquivo | aguardar; demais entradas bloqueadas |
| Organizando | DexLoader/estado real | aguardar; salvar/trocar bloqueados |
| Erro do Dex | relato permanece | tentar organizar novamente |
| Sucesso | texto/eventos no rascunho | revisão e save normais |

## 6. Referência visual

Sem tela nova. `VoiceUX`, `DexLoader`, toast e controles existentes recebem os estados acima.
Tokens atuais, dark/light e hierarquia de Ficha/Meu Dia permanecem; nenhuma nova direção visual.

## 7. Invariantes

- [ ] Resultado assíncrono nunca é aplicado a outro paciente/agendamento.
- [ ] Falha de rede/provider não exige novo ditado enquanto o áudio estiver em memória.
- [ ] Apenas ação explícita descarta áudio ainda não transcrito.
- [ ] Uma operação perceptível sempre tem estado visível e verdadeiro.
- [ ] Não existem dois POSTs simultâneos para o mesmo áudio/captura.
- [ ] Áudio clínico não é persistido nem logado.
- [ ] Ficha e Meu Dia usam a mesma máquina de estados.

## 8. Gates de aceite

- [ ] **G1:** teste da máquina cobre todas as transições e proíbe concorrência.
- [ ] **G2:** 500/timeout na transcrição mantém o mesmo `Blob`; retry bem-sucedido acrescenta o
  texto uma vez e limpa o áudio.
- [ ] **G3:** duplo clique em retry/organizar produz um POST.
- [ ] **G4:** salvar e trocar paciente ficam bloqueados durante cada fase busy.
- [ ] **G5:** trocar com áudio recuperável exige confirmação; cancelar mantém o áudio.
- [ ] **G6:** aviso aparece aos 4s, voz cancela, auto-stop ocorre aos 7s e limite aos 10min.
- [ ] **G7:** parada manual, automática e falha parcial geram arquivo com MIME/extensão coerentes.
- [ ] **G8:** testar Ficha e Meu Dia em Chrome Android e Safari iPhone, inclusive background/volta.
- [ ] **G9:** light/dark, teclado e leitor de tela anunciam gravação, contagem, erro e retry.

## 9. Fora de escopo

- Persistir gravação em storage ou retomar após fechar/recarregar a página.
- Transcrição em streaming ou chunks remotos.
- Limites HTTP/MIME e rate limit — R-142.
- Alterar o modelo Whisper ou trocar precisão por custo.

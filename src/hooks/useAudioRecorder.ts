"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecorderStatus = "idle" | "recording" | "processing" | "done" | "error";

// ── Corte automático por silêncio (spec fase1-5 §B) ──────────────────────────
// Depois de detectar fala, ~4s de silêncio contínuo param a gravação sozinhos
// (dentista de luva não precisa tocar na tela). Nunca re-inicia sozinho — sem
// microfone sempre-aberto por decisão de privacidade do consultório.
const SILENCE_WARNING_MS = 4_000;
const SILENCE_STOP_MS = 7_000;
const MAX_RECORDING_MS = 10 * 60_000;
// RMS normalizado (0-1). Fala fica tipicamente em 0.05-0.3; ruído de sala ~0.005-0.02.
// Calibrado empiricamente — consultório muito barulhento pode desligar via flag.
const SILENCE_RMS_THRESHOLD = 0.02;
const MONITOR_INTERVAL_MS = 100;
// 32kbps é sobra pra voz (Whisper) e mantém 10min de áudio em ~2,4MB — folga
// contra o limite de 4,5MB de upload da Vercel (spec fase1-5 §B).
const AUDIO_BITS_PER_SECOND = 32_000;

// R-48 §5/D1 — ordem de preferência. Opus é o melhor pra voz; mp4 é o que o
// Safari/iOS grava (Safari não suporta webm — era o defeito A). '' = deixa o
// browser escolher (último recurso antes de desistir). Escolha SEMPRE por
// `MediaRecorder.isTypeSupported` — nunca por sniffing de user-agent (I1).
const MIME_CANDIDATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""] as const;

export type MicErro =
  | "permissao" // getUserMedia negado — a única em que "verifique as permissões" é verdade
  | "sem-suporte" // nenhum mimeType serve e o default também falhou
  | "hardware"; // qualquer outra falha do dispositivo

interface UseAudioRecorderOptions {
  /** Chamado quando a gravação para sozinha por silêncio (blob pronto pra transcrever). */
  onAutoStop?: (blob: Blob | null) => void;
  /** Desliga o corte automático por silêncio (default: ligado). */
  silenceAutoStop?: boolean;
  /** R-48 (C) — falha DURANTE a gravação, não no clique de parar. `blobParcial` traz o que
   *  já foi capturado (null só se nada foi). */
  onError?: (motivo: MicErro, blobParcial: Blob | null) => void;
}

interface UseAudioRecorderReturn {
  status: RecorderStatus;
  timer: number;
  /** Inicia a gravação. R-48/D3 — devolve o motivo do erro em vez de um boolean genérico. */
  startRecording: () => Promise<{ ok: true } | { ok: false; motivo: MicErro }>;
  /** Para a gravação e retorna o Blob do áudio */
  stopRecording: () => Promise<Blob | null>;
  /** R-48 (B) — volta de 'error' pra 'idle' sem desmontar o painel. */
  resetError: () => void;
  /** R-48 (D) — o mimeType realmente negociado; quem faz upload nomeia o arquivo por ele. */
  mimeType: string | null;
  silenceWarning: boolean;
  continueRecording: () => void;
}

/** Primeiro candidato suportado vence; '' = default do browser (D1, I1). */
function escolherMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  for (const candidato of MIME_CANDIDATOS) {
    if (candidato === "") return "";
    if (MediaRecorder.isTypeSupported(candidato)) return candidato;
  }
  return "";
}

/** A única falha que é de fato permissão negada — o resto é hardware (I4). */
function classificarErroGetUserMedia(err: unknown): MicErro {
  if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
    return "permissao";
  }
  return "hardware";
}

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [timer, setTimer] = useState(0);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [silenceWarning, setSilenceWarning] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Resolve pendente que `stopRecording` aguarda
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);
  // R-48 (I3, pós-verificação adversarial) — 'stop' e 'error' podem disparar os dois pra
  // uma única falha (o algoritmo de finalização do MediaRecorder é compartilhado). Só o
  // primeiro conta; sem essa trava o segundo reprocessaria com chunksRef já vazio e
  // reportaria "nada capturado" mesmo tendo capturado.
  const sessaoFinalizadaRef = useRef(false);
  const houveFalaRef = useRef(false);
  const ultimoSomEmRef = useRef(0);
  // Monitor de silêncio
  const audioContextRef = useRef<AudioContext | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest-ref: callbacks sempre atuais sem re-criar a gravação
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const limparMonitor = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Limpa intervalos e AudioContext ao desmontar
  useEffect(() => {
    return () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (maxRecordingTimeoutRef.current) clearTimeout(maxRecordingTimeoutRef.current);
      limparMonitor();
    };
  }, [limparMonitor]);

  const startRecording = useCallback(async (): Promise<{ ok: true } | { ok: false; motivo: MicErro }> => {
    if (status === "recording") return { ok: false, motivo: "hardware" };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const motivo = classificarErroGetUserMedia(err);
      setStatus("error");
      return { ok: false, motivo };
    }

    const mimeTypeEscolhido = escolherMimeType();

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        stream,
        mimeTypeEscolhido
          ? { mimeType: mimeTypeEscolhido, audioBitsPerSecond: AUDIO_BITS_PER_SECOND }
          : { audioBitsPerSecond: AUDIO_BITS_PER_SECOND },
      );
    } catch {
      // Nenhum candidato serviu e o default também não — este browser não grava (D1/I1).
      stream.getTracks().forEach((t) => t.stop());
      setStatus("error");
      return { ok: false, motivo: "sem-suporte" };
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    sessaoFinalizadaRef.current = false;
    setMimeType(recorder.mimeType || mimeTypeEscolhido || null);

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    // Ponto único de saída pra onstop/onerror (I3) — travado por sessaoFinalizadaRef
    // pra contar só o primeiro dos dois que disparar.
    const finalizar = (blob: Blob | null) => {
      if (sessaoFinalizadaRef.current) return;
      sessaoFinalizadaRef.current = true;

      stream.getTracks().forEach((t) => t.stop());
      limparMonitor();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
        maxRecordingTimeoutRef.current = null;
      }
      setSilenceWarning(false);
      setTimer(0);

      if (resolveStopRef.current) {
        // Alguém já estava esperando o stop (clique de parar ou corte por silêncio) —
        // não é o caso "falha no meio" (C); resolve com o que deu pra capturar.
        const resolve = resolveStopRef.current;
        resolveStopRef.current = null;
        setStatus("done");
        resolve(blob);
        return;
      }

      // R-48 (C/D2/I3) — ninguém pediu parar: a gravação terminou sozinha (track do
      // mic caiu). Por spec isso dispara 'stop', não 'error' — por isso onstop precisa
      // do MESMO fallback que onerror, senão o áudio já capturado é descartado em
      // silêncio (reproduz o defeito C original que esta fatia existe pra fechar).
      setStatus("error");
      optionsRef.current?.onError?.("hardware", blob && blob.size > 0 ? blob : null);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeTypeEscolhido || undefined });
      chunksRef.current = [];
      finalizar(blob);
    };

    recorder.onerror = () => {
      const blobParcial =
        chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: recorder.mimeType || mimeTypeEscolhido || undefined })
          : null;
      chunksRef.current = [];
      finalizar(blobParcial);
    };

    recorder.start(250); // coleta chunks a cada 250ms
    setStatus("recording");
    setTimer(0);
    setSilenceWarning(false);
    houveFalaRef.current = false;
    ultimoSomEmRef.current = Date.now();

    // Timer em segundos
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    maxRecordingTimeoutRef.current = setTimeout(() => {
      if (recorder.state !== 'recording') return;
      resolveStopRef.current = (blob) => optionsRef.current?.onAutoStop?.(blob);
      setStatus('processing');
      recorder.stop();
    }, MAX_RECORDING_MS);

    // ── Monitor de silêncio ──
    if (optionsRef.current?.silenceAutoStop !== false) {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const amostra = new Uint8Array(analyser.fftSize);

      monitorIntervalRef.current = setInterval(() => {
        if (recorder.state !== "recording") return;
        analyser.getByteTimeDomainData(amostra);
        let somaQuadrados = 0;
        for (const v of amostra) {
          const norm = (v - 128) / 128;
          somaQuadrados += norm * norm;
        }
        const rms = Math.sqrt(somaQuadrados / amostra.length);

        if (rms >= SILENCE_RMS_THRESHOLD) {
          houveFalaRef.current = true;
          ultimoSomEmRef.current = Date.now();
          setSilenceWarning(false);
          return;
        }
        const silencioPor = Date.now() - ultimoSomEmRef.current;
        if (houveFalaRef.current && silencioPor >= SILENCE_WARNING_MS) setSilenceWarning(true);
        if (houveFalaRef.current && silencioPor >= SILENCE_STOP_MS) {
          // Auto-stop: reusa o mesmo caminho do stop manual; blob sai via onAutoStop.
          if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
          }
          resolveStopRef.current = (blob) => optionsRef.current?.onAutoStop?.(blob);
          setStatus("processing");
          setSilenceWarning(false);
          recorder.stop();
        }
      }, MONITOR_INTERVAL_MS);
    }

    return { ok: true };
  }, [status, limparMonitor]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      setStatus("processing");
      resolveStopRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const resetError = useCallback(() => {
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  const continueRecording = useCallback(() => {
    if (status !== 'recording') return;
    ultimoSomEmRef.current = Date.now();
    setSilenceWarning(false);
  }, [status]);

  return { status, timer, startRecording, stopRecording, resetError, mimeType, silenceWarning, continueRecording };
}

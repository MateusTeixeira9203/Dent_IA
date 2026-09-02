import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getDentistaCached } from '@/lib/get-dentista';
import { withRateLimit } from '@/lib/rate-limit';
import { WHISPER_DENTAL_PROMPT } from '@/lib/odonto-dictionary';
import { MAX_AUDIO_BYTES, mimeAudioAceito } from '@/lib/dex/schemas';
import { arquivoParaWhisper, erroFoiAbortado, statusDoErroProvider } from '@/lib/dex/transcricao';
import { logAICall } from '@/lib/ai/logger';

const TRANSCRIPTION_TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await withRateLimit(req, 'transcrever', 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const dentista = await getDentistaCached();
  if (!dentista) return NextResponse.json({ error: 'Não autenticado.', code: 'UNAUTHORIZED' }, { status: 401 });
  const identityLimit = await withRateLimit(req, 'transcrever', 20, 60_000, `${dentista.clinica_id}:${dentista.id}`);
  if (identityLimit) return identityLimit;

  if (!process.env.GROQ_API_KEY) {
    console.error('[transcrever] Groq não configurado');
    return NextResponse.json({ error: 'Serviço de IA indisponível.', code: 'AI_PROVIDER_FAILED' }, { status: 502 });
  }

  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 256_000) {
    return NextResponse.json({ error: 'Áudio grande demais.', code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }

  let audioFile: File;
  try {
    const formData = await req.formData();
    const audio = formData.get('audio');
    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: 'Dados inválidos.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    audioFile = audio;
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.', code: 'INVALID_INPUT' }, { status: 400 });
  }

  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Áudio grande demais.', code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  if (!mimeAudioAceito(audioFile.type)) {
    return NextResponse.json({ error: 'Formato de áudio não suportado.', code: 'UNSUPPORTED_MEDIA' }, { status: 415 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const transcription = await groq.audio.transcriptions.create({
      file: arquivoParaWhisper(audioFile),
      // large-v3 cheio (não turbo): visivelmente melhor em PT-BR e número falado —
      // é onde o turbo errava dente/termo (spec fase1-5 §A, decisão 13/07).
      model: 'whisper-large-v3',
      language: 'pt',
      // Groq rejeita prompt > 896 chars no large-v3 (400) — clamp de segurança
      // caso o dicionário cresça; a fonte já é mantida ≤ 860.
      prompt: WHISPER_DENTAL_PROMPT.slice(0, 896),
      response_format: 'json',
    }, {
      maxRetries: 2,
      timeout: TRANSCRIPTION_TIMEOUT_MS,
      signal: controller.signal,
    });

    const transcricao = transcription.text?.trim() ?? '';
    if (!transcricao) {
      logAICall({ feature: 'transcrever', provider: 'groq', model: 'whisper-large-v3', latencyMs: Date.now() - startedAt, success: false, inputSize: audioFile.size, httpStatus: 502 });
      return NextResponse.json({ error: 'A transcrição veio vazia.', code: 'AI_PROVIDER_FAILED' }, { status: 502 });
    }
    logAICall({ feature: 'transcrever', provider: 'groq', model: 'whisper-large-v3', latencyMs: Date.now() - startedAt, success: true, inputSize: audioFile.size, outputItems: 1, httpStatus: 200 });
    return NextResponse.json({ transcricao });
  } catch (err) {
    const status = statusDoErroProvider(err);
    console.error('[transcrever] provider_failed', {
      status: status ?? null,
      name: err instanceof Error ? err.name : 'unknown',
    });
    if (erroFoiAbortado(err) || status === 408) {
      logAICall({ feature: 'transcrever', provider: 'groq', model: 'whisper-large-v3', latencyMs: Date.now() - startedAt, success: false, inputSize: audioFile.size, httpStatus: 504 });
      return NextResponse.json({ error: 'A transcrição demorou mais que o esperado.', code: 'AI_TIMEOUT' }, { status: 504 });
    }
    if (status === 429) {
      logAICall({ feature: 'transcrever', provider: 'groq', model: 'whisper-large-v3', latencyMs: Date.now() - startedAt, success: false, inputSize: audioFile.size, httpStatus: 429 });
      return NextResponse.json({ error: 'Limite do serviço de transcrição atingido.', code: 'RATE_LIMITED' }, { status: 429 });
    }
    logAICall({ feature: 'transcrever', provider: 'groq', model: 'whisper-large-v3', latencyMs: Date.now() - startedAt, success: false, inputSize: audioFile.size, httpStatus: 502 });
    return NextResponse.json({ error: 'Não foi possível transcrever o áudio. Tente novamente.', code: 'AI_PROVIDER_FAILED' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

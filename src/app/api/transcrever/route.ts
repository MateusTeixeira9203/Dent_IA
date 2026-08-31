import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { WHISPER_DENTAL_PROMPT } from '@/lib/odonto-dictionary';
import { MAX_AUDIO_BYTES, MIME_AUDIO_ACEITOS } from '@/lib/dex/schemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await withRateLimit(req, 'transcrever', 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  // Verifica autenticação
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { data: dentista } = await supabase
    .from('dentistas')
    .select('id, clinica_id')
    .eq('usuario_id', user.id)
    .maybeSingle();
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
  if (!MIME_AUDIO_ACEITOS.has(audioFile.type.toLowerCase())) {
    return NextResponse.json({ error: 'Formato de áudio não suportado.', code: 'UNSUPPORTED_MEDIA' }, { status: 415 });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      // large-v3 cheio (não turbo): visivelmente melhor em PT-BR e número falado —
      // é onde o turbo errava dente/termo (spec fase1-5 §A, decisão 13/07).
      model: 'whisper-large-v3',
      language: 'pt',
      // Groq rejeita prompt > 896 chars no large-v3 (400) — clamp de segurança
      // caso o dicionário cresça; a fonte já é mantida ≤ 860.
      prompt: WHISPER_DENTAL_PROMPT.slice(0, 896),
      response_format: 'json',
    });

    const transcricao = transcription.text?.trim() ?? '';
    return NextResponse.json({ transcricao });
  } catch (err) {
    console.error('Erro na transcrição (Groq):', err);
    return NextResponse.json({ error: 'Não foi possível transcrever o áudio. Tente novamente.', code: 'AI_PROVIDER_FAILED' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Type, type Schema } from '@google/genai';
import { getDentistaCached } from '@/lib/get-dentista';
import { generateStructuredGemini } from '@/lib/ai/provider';
import { logAICall } from '@/lib/ai/logger';
import { withRateLimit } from '@/lib/rate-limit';
import {
  sugerirEvolucaoRequestSchema,
  sugerirEvolucaoResponseSchema,
  type SugerirEvolucaoResponse,
} from '@/lib/dex/schemas';
import { montarPromptSugestaoEvolucao } from '@/lib/dex/sugerir-evolucao';

const PROMPT_VERSION = 'r140c-sugestao-evolucao-2026-09-01';

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['texto'],
  properties: {
    texto: { type: Type.STRING },
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await withRateLimit(req, 'dex:sugerir-evolucao', 60, 60_000);
  if (limited) return limited;

  const dentista = await getDentistaCached();
  if (!dentista) {
    return NextResponse.json({ error: 'Não autenticado.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const limitedIdentity = await withRateLimit(
    req,
    'dex:sugerir-evolucao',
    20,
    60_000,
    `${dentista.clinica_id}:${dentista.id}`,
  );
  if (limitedIdentity) return limitedIdentity;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.', code: 'INVALID_INPUT' }, { status: 400 });
  }

  const entrada = sugerirEvolucaoRequestSchema.safeParse(body);
  if (!entrada.success) {
    return NextResponse.json({ error: 'Dados clínicos inválidos.', code: 'INVALID_INPUT' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Serviço de IA indisponível.', code: 'AI_PROVIDER_FAILED' }, { status: 502 });
  }

  try {
    const result = await generateStructuredGemini<SugerirEvolucaoResponse>({
      prompt: montarPromptSugestaoEvolucao(entrada.data),
      responseSchema: RESPONSE_SCHEMA,
      feature: 'sugerir-evolucao-manual',
      timeoutMs: 20_000,
      maxOutputTokens: 1_200,
    });
    const saida = sugerirEvolucaoResponseSchema.safeParse(result.data);
    if (!saida.success) throw new Error('Resposta clínica fora do contrato');

    logAICall({
      feature: 'sugerir-evolucao-manual',
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      success: true,
      dentistaId: dentista.id,
      clinicaId: dentista.clinica_id,
      promptVersion: PROMPT_VERSION,
      inputSize: JSON.stringify(entrada.data).length,
      outputItems: 1,
      httpStatus: 200,
    });

    return NextResponse.json(saida.data satisfies SugerirEvolucaoResponse);
  } catch (error) {
    const timeout = error instanceof Error && error.message.includes('AI timeout');
    logAICall({
      feature: 'sugerir-evolucao-manual',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      latencyMs: 0,
      success: false,
      dentistaId: dentista.id,
      clinicaId: dentista.clinica_id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      promptVersion: PROMPT_VERSION,
      inputSize: JSON.stringify(entrada.data).length,
      httpStatus: timeout ? 504 : 502,
    });
    return NextResponse.json(
      {
        error: timeout
          ? 'O Dex demorou demais. Tente novamente.'
          : 'O Dex não conseguiu sugerir a evolução. Você pode continuar manualmente.',
        code: timeout ? 'AI_TIMEOUT' : 'AI_PROVIDER_FAILED',
      },
      { status: timeout ? 504 : 502 },
    );
  }
}

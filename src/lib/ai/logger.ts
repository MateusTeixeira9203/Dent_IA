import { createServiceClient } from '@/lib/supabase/service';

export interface AILogEntry {
  feature: string;
  provider: 'gemini' | 'groq';
  model: string;
  latencyMs: number;
  success: boolean;
  dentistaId?: string;
  clinicaId?: string;
  pacienteId?: string;
  error?: string;
  promptVersion?: string;
  inputSize?: number;
  outputItems?: number;
  statusCounts?: Record<string, number>;
  evidenceCounts?: Record<string, number>;
  retryCount?: number;
  httpStatus?: number;
}

export function logAICall(entry: AILogEntry): void {
  const level = entry.success ? 'log' : 'error';
  console[level]('[ai]', JSON.stringify({ ...entry, ts: new Date().toISOString() }));
  persistLog(entry).catch(() => {}); // fire-and-forget, never throws
}

async function persistLog(entry: AILogEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('ai_usage_logs').insert({
      feature:     entry.feature,
      provider:    entry.provider,
      model:       entry.model,
      latency_ms:  entry.latencyMs,
      success:     entry.success,
      dentista_id: entry.dentistaId ?? null,
      clinica_id:  entry.clinicaId ?? null,
      paciente_id: entry.pacienteId ?? null,
      error:       entry.error ?? null,
      prompt_version: entry.promptVersion ?? null,
      input_size: entry.inputSize ?? null,
      output_items: entry.outputItems ?? null,
      status_counts: entry.statusCounts ?? null,
      evidence_counts: entry.evidenceCounts ?? null,
      retry_count: entry.retryCount ?? null,
      http_status: entry.httpStatus ?? null,
    });
    if (error) console.error('[ai] Falha ao persistir métricas:', error.message);
  } catch {
    // Logging must never break the app
  }
}

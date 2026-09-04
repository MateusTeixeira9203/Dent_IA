export interface DexStageTimings {
  preAiMs: number;
  aiMs: number;
  postAiMs: number;
}

function formatDuration(durationMs: number): string {
  return Math.max(0, durationMs).toFixed(1);
}

/** Formato padronizado para o browser e o runner separarem as etapas sem dados clínicos. */
export function formatDexServerTiming(timings: DexStageTimings): string {
  return [
    `pre-ai;dur=${formatDuration(timings.preAiMs)}`,
    `ai;dur=${formatDuration(timings.aiMs)}`,
    `post-ai;dur=${formatDuration(timings.postAiMs)}`,
  ].join(', ');
}

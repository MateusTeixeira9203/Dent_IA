export const DEX_ERROR_CODES = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA',
  'RATE_LIMITED',
  'AI_TIMEOUT',
  'AI_PROVIDER_FAILED',
] as const;

export type DexErrorCode = (typeof DEX_ERROR_CODES)[number];

export type DexErrorResponse = {
  error?: unknown;
  code?: unknown;
};

export function parseDexErrorCode(value: unknown): DexErrorCode | undefined {
  return typeof value === 'string' && DEX_ERROR_CODES.includes(value as DexErrorCode)
    ? (value as DexErrorCode)
    : undefined;
}

export function mensagemErroTranscricao(code: DexErrorCode | undefined, status?: number): string {
  if (code === 'UNAUTHORIZED' || status === 401) return 'Sua sessão expirou. Entre novamente para usar o DEX.';
  if (code === 'PAYLOAD_TOO_LARGE' || status === 413) return 'O áudio é grande demais. Faça uma gravação mais curta.';
  if (code === 'UNSUPPORTED_MEDIA' || status === 415) return 'Este formato de áudio não é compatível. Use MP3, M4A, WAV, OGG ou WebM.';
  if (code === 'RATE_LIMITED' || status === 429) return 'Limite de transcrições atingido. Aguarde um pouco e tente novamente.';
  if (code === 'AI_TIMEOUT' || status === 504) return 'A transcrição demorou mais que o esperado. Tente novamente.';
  return 'Não foi possível transcrever o áudio. O áudio continua disponível para tentar novamente.';
}

export function normalizarMimeAudio(mime: string): string {
  const base = mime.toLowerCase().split(';', 1)[0]?.trim() ?? '';
  if (base === 'audio/x-wav') return 'audio/wav';
  if (base === 'audio/x-m4a') return 'audio/mp4';
  return base;
}

/** O Groq aceita OGG (contêiner usual do Opus), mas não anuncia `.opus` como extensão.
 * Renomear o contêiner não altera os bytes e evita rejeição por extensão no multipart. */
export function arquivoParaWhisper(file: File): File {
  const mime = normalizarMimeAudio(file.type);
  if (mime !== 'audio/opus') return file;
  const nome = file.name.replace(/\.[^.]*$/, '') || 'audio';
  return new File([file], `${nome}.ogg`, { type: 'audio/ogg', lastModified: file.lastModified });
}

export function statusDoErroProvider(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export function erroFoiAbortado(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return name === 'APIConnectionTimeoutError' || name === 'TimeoutError';
}

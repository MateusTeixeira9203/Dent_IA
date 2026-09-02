// R-48 — nome do arquivo de upload precisa bater com o formato real do blob
// gravado (o Groq infere o formato pela extensão do nome, não pelo Content-Type).

/** 'audio/webm;codecs=opus' → 'webm' · 'audio/mp4' → 'mp4'. Default 'webm'. */
export function extensaoDoMime(mime: string): string {
  const tipo = mime.split(';')[0]?.trim().toLowerCase();
  const subtipo = tipo?.split('/')[1];
  if (subtipo === 'opus') return 'ogg';
  if (subtipo === 'x-wav' || subtipo === 'wave') return 'wav';
  return subtipo || 'webm';
}

import { z } from 'zod';

export const MAX_DEX_TEXT_CHARS = 50_000;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export const formatarEvolucaoRequestSchema = z.object({
  texto: z.string().trim().min(1).max(MAX_DEX_TEXT_CHARS),
  // Compatibilidade transitória: o nome não é usado no prompt nem em logs.
  pacienteNome: z.string().trim().max(200).optional(),
  modo: z.enum(['consulta', 'exame_inicial']).optional(),
}).strict();

export const MIME_AUDIO_ACEITOS = new Set([
  'audio/flac', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
  'audio/ogg', 'audio/wav', 'audio/wave', 'audio/webm',
]);

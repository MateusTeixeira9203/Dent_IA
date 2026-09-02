import { z } from 'zod';

export const MAX_DEX_TEXT_CHARS = 50_000;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export const formatarEvolucaoRequestSchema = z.object({
  texto: z.string().trim().min(1).max(MAX_DEX_TEXT_CHARS),
  // Compatibilidade transitória: o nome não é usado no prompt nem em logs.
  pacienteNome: z.string().trim().max(200).optional(),
  modo: z.enum(['consulta', 'exame_inicial']).optional(),
}).strict();

const itemSugestaoEvolucaoSchema = z.object({
  procedimento: z.string().trim().min(1).max(500),
  status: z.enum(['indicado', 'realizado']),
  origem: z.enum(['clinica', 'preexistente']),
  momentoPlanejado: z.enum(['sessao_atual', 'proxima_sessao']),
  localizacao: z.string().trim().min(1).max(200),
  observacao: z.string().trim().max(2_000),
  detalhe: z.string().trim().max(4_000).nullable(),
}).strict();

export const sugerirEvolucaoRequestSchema = z.object({
  itens: z.array(itemSugestaoEvolucaoSchema).max(200),
  ortodontia: z.string().trim().max(5_000).nullable(),
}).strict().refine(
  (entrada) => entrada.itens.length > 0 || entrada.ortodontia !== null,
  { message: 'Informe ao menos um registro clínico.' },
);

export const sugerirEvolucaoResponseSchema = z.object({
  texto: z.string().trim().min(1).max(5_000),
}).strict();

export type SugerirEvolucaoRequest = z.infer<typeof sugerirEvolucaoRequestSchema>;
export type SugerirEvolucaoResponse = z.infer<typeof sugerirEvolucaoResponseSchema>;

export const MIME_AUDIO_ACEITOS = new Set([
  'audio/flac', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
  'audio/ogg', 'audio/wav', 'audio/wave', 'audio/webm',
]);

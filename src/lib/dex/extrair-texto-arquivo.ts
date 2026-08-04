// R-46d (D8) — extraído de `captura-livre-card.tsx` (`handleArquivo`) pra ser reusado também
// por `anexar-documentos-bloco.tsx`, sem duplicar a decisão áudio×documento nem as 2 chamadas
// de rede. Comportamento idêntico ao que já existia — refactor extrativo, não reescrita.

const AUDIO_EXTS = ['mp3', 'm4a', 'opus', 'wav', 'webm', 'ogg'];
const DOC_EXTS = ['pdf', 'docx', 'doc', 'txt'];

export type ExtrairTextoResultado = { ok: true; texto: string } | { ok: false; error: string };

/** Áudio vai pro Whisper (`/api/transcrever`), documento pro parser de texto
 *  (`/api/extrair-texto`) — mesmo roteamento por extensão que já existia. */
export async function extrairTextoDeArquivo(file: File): Promise<ExtrairTextoResultado> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isAudio = file.type.startsWith('audio/') || AUDIO_EXTS.includes(ext);

  if (isAudio) {
    const fd = new FormData();
    fd.append('audio', file);
    const res = await fetch('/api/transcrever', { method: 'POST', body: fd });
    const data = await res.json() as { transcricao?: string; error?: string };
    if (!res.ok || data.error) return { ok: false, error: data.error ?? 'Erro ao transcrever o áudio.' };
    return { ok: true, texto: data.transcricao ?? '' };
  }

  if (DOC_EXTS.includes(ext)) {
    const fd = new FormData();
    fd.append('arquivo', file);
    const res = await fetch('/api/extrair-texto', { method: 'POST', body: fd });
    const data = await res.json() as { texto?: string; error?: string };
    if (!res.ok || data.error) return { ok: false, error: data.error ?? 'Erro ao extrair texto do arquivo.' };
    return { ok: true, texto: data.texto ?? '' };
  }

  return { ok: false, error: 'Formato não suportado. Envie áudio, .pdf, .docx, .doc ou .txt.' };
}

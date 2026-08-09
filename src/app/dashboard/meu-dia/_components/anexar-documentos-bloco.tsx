'use client';

// R-46d D8 — caixa de anexo embaixo do Histórico, separada do campo mágico (coluna esquerda).
// Documento fica preso ao paciente (estado do cliente, sem persistência — meu-dia-client.tsx
// reseta junto com eventosDraft/textoVisita ao trocar de paciente, mesmo bloco do §5.4).
// "Usar este documento de base" empurra o texto extraído pro campo mágico via anexarTexto (D1.3).

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Paperclip, Loader2, FileText } from 'lucide-react';
import { extrairTextoDeArquivo } from '@/lib/dex/extrair-texto-arquivo';

export interface AnexarDocumentosBlocoProps {
  documentoNome: string | null;
  documentoTexto: string | null;
  /** `origem` (07/08) — repassa pro campo mágico decidir o `modo` da chamada ao Dex (áudio
   *  narrado continua "consulta"; documento vira "exame_inicial" — ver captura-livre-card.tsx). */
  onAnexado: (nome: string, texto: string, origem: 'audio' | 'documento') => void;
  onUsarComoBase: () => void;
}

export function AnexarDocumentosBloco({
  documentoNome, documentoTexto, onAnexado, onUsarComoBase,
}: AnexarDocumentosBlocoProps) {
  const [processando, setProcessando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleArquivo(file: File) {
    setProcessando(true);
    const resultado = await extrairTextoDeArquivo(file);
    setProcessando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    onAnexado(file.name, resultado.texto, resultado.origem);
  }

  return (
    <div className="flex flex-col gap-2">
      {documentoNome ? (
        <>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 py-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
            <span className="truncate text-xs font-semibold text-text-primary">{documentoNome}</span>
          </div>
          {documentoTexto && (
            <p className="line-clamp-3 text-xs text-text-secondary">{documentoTexto}</p>
          )}
          <button
            type="button"
            onClick={onUsarComoBase}
            className="w-fit rounded-lg border border-teal/30 bg-teal/5 px-2.5 py-1.5 text-[11px] font-semibold text-teal-ink hover:bg-teal/10"
          >
            Usar este documento de base
          </button>
        </>
      ) : (
        <p className="text-sm text-text-secondary">Nenhum documento anexado ainda.</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleArquivo(file);
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={processando}
        className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink disabled:opacity-50"
      >
        {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        {processando ? 'Processando...' : documentoNome ? 'Anexar outro' : 'Anexar documento'}
      </button>
    </div>
  );
}

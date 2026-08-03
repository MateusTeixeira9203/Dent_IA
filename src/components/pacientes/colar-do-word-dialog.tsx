'use client';

// R-46c — colar/subir histórico do Word (nível 1, sem IA — D7). 1 colagem = 1 ficha com o
// histórico todo, data retroativa, texto tal qual (zero parsing). 2 chamadores: Meu dia
// (historico-bloco.tsx, quando visitas.length === 0) e o perfil (FichasTab.tsx).

import { useRef, useState } from 'react';
import { Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { hojeBRT } from '@/lib/hora-brt';
import { importarHistoricoDoWord } from '@/server/patients/importar-historico';

const DOC_EXTS = ['pdf', 'docx', 'doc', 'txt'];
const LIMITE_CHARS = 5000;

export interface ColarDoWordDialogProps {
  pacienteId: string;
  pacienteNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Meu dia passa router.refresh(); o perfil passa o refetch das fichas. */
  onImportado: () => void;
}

export function ColarDoWordDialog({ pacienteId, pacienteNome, open, onOpenChange, onImportado }: ColarDoWordDialogProps) {
  const [texto, setTexto] = useState('');
  const [dataAtendimento, setDataAtendimento] = useState(hojeBRT());
  const [processandoArquivo, setProcessandoArquivo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function fechar() {
    onOpenChange(false);
    // Reset só depois de fechar — sem rascunho vazando pro próximo paciente aberto.
    setTexto('');
    setDataAtendimento(hojeBRT());
  }

  async function handleArquivo(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!DOC_EXTS.includes(ext)) {
      toast.error('Formato não suportado. Envie .pdf, .docx, .doc ou .txt.');
      return;
    }
    setProcessandoArquivo(file.name);
    try {
      const fd = new FormData();
      fd.append('arquivo', file);
      const res = await fetch('/api/extrair-texto', { method: 'POST', body: fd });
      const data = await res.json() as { texto?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao extrair texto do arquivo.');
      if (data.texto) setTexto((prev) => (prev ? `${prev}\n${data.texto}` : data.texto ?? ''));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar o arquivo.');
    } finally {
      setProcessandoArquivo(null);
    }
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const resultado = await importarHistoricoDoWord({ pacienteId, dataAtendimento, texto });
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success('Histórico importado.');
      onImportado();
      fechar();
    } finally {
      setSalvando(false);
    }
  }

  const acimaDoLimite = texto.length > LIMITE_CHARS;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : fechar())}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Colar histórico do Word</DialogTitle>
          <DialogDescription>
            {pacienteNome} — cole o texto ou suba o arquivo (.pdf, .docx, .doc, .txt). Entra
            tal qual, sem estruturar em registros — é histórico transcrito, não um atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">
              Data do histórico
            </label>
            <input
              type="date"
              value={dataAtendimento}
              max={hojeBRT()}
              onChange={(e) => setDataAtendimento(e.target.value || hojeBRT())}
              className="w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2 text-sm font-medium text-text-primary outline-none transition-colors focus:border-teal"
            />
          </div>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole aqui o histórico do paciente..."
            rows={10}
            className="w-full resize-none rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm leading-relaxed text-text-primary outline-none transition-colors focus:border-teal"
          />

          <div className="flex items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
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
              disabled={processandoArquivo !== null}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary disabled:opacity-50"
            >
              {processandoArquivo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              {processandoArquivo ? `Processando ${processandoArquivo}...` : 'Subir arquivo'}
            </button>

            <span className={`text-[11px] font-mono ${acimaDoLimite ? 'font-bold text-coral' : 'text-text-secondary'}`}>
              {texto.length}/{LIMITE_CHARS}
            </span>
          </div>
          {acimaDoLimite && (
            <p className="text-xs text-coral">
              Texto acima do limite — corte um trecho antes de salvar (nunca truncamos prontuário sozinhos).
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button
            onClick={() => void handleSalvar()}
            disabled={!texto.trim() || acimaDoLimite || salvando || processandoArquivo !== null}
            className="bg-teal text-white hover:bg-teal-lt"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

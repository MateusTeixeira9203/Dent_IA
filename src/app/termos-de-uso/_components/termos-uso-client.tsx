'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { aceitarTermosUso } from '../actions';

type Props = {
  conteudo: string;
  destino: string;
};

export function TermosUsoClient({ conteudo, destino }: Props) {
  const router = useRouter();
  const [aceito, setAceito] = useState(false);
  const [saving, setSaving] = useState(false);

  const confirmar = async (): Promise<void> => {
    if (!aceito || saving) return;
    setSaving(true);
    const result = await aceitarTermosUso();
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.replace(destino);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
        <header className="flex items-start gap-3 border-b border-border px-5 py-5 sm:px-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-text-primary">Termos de uso</h1>
            <p className="mt-1 text-sm text-text-secondary">Leia e confirme para acessar a Odonto.IA.</p>
          </div>
        </header>

        <div className="max-h-[55vh] overflow-y-auto whitespace-pre-line px-5 py-6 text-sm leading-6 text-text-secondary sm:px-8">
          {conteudo}
        </div>

        <footer className="space-y-4 border-t border-border px-5 py-5 sm:px-8">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(event) => setAceito(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal"
            />
            <span>Li, compreendi e aceito os Termos de Uso da Odonto.IA.</span>
          </label>
          <button
            type="button"
            disabled={!aceito || saving}
            onClick={() => void confirmar()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-lt disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? 'Registrando aceite...' : 'Aceitar e continuar'}
          </button>
        </footer>
      </section>
    </main>
  );
}

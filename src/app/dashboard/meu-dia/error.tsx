'use client';

// R-46g (D6) — a rota vira a porta principal; erro de query não pode mais renderizar como
// "dia vazio" (I5). Escopo de rota (não full-page como app/error.tsx) — a shell do
// dashboard (sidebar, header) continua de pé ao redor.

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MeuDiaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[meu-dia/error]', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-pale border border-coral/20">
          <AlertTriangle className="h-7 w-7 text-coral" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-heading text-lg font-semibold text-text-primary">
            Não deu pra carregar o seu dia
          </h1>
          <p className="text-sm text-text-secondary">
            Tente de novo — se persistir, avise a equipe.
          </p>
        </div>
        <Button onClick={reset} size="sm">
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

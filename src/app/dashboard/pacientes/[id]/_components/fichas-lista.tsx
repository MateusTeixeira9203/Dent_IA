"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, Trash2, AlertTriangle } from "lucide-react";
import { Badge, Button } from "@/components/dentai";
import { deletarFicha } from "../actions";

interface Ficha {
  id: string;
  status: string;
  created_at: string;
}

interface Props {
  fichas: Ficha[];
  pacienteId: string;
}

export function FichasLista({ fichas, pacienteId }: Props): React.JSX.Element {
  const router = useRouter();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);

  async function handleDeletar(fichaId: string): Promise<void> {
    setDeletando(true);
    try {
      await deletarFicha(fichaId);
      setConfirmandoId(null);
      router.refresh();
    } catch {
      // erro silencioso — server action já lança
    } finally {
      setDeletando(false);
    }
  }

  if (fichas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <FileText size={36} className="text-brand-muted/30" />
        <p className="font-sans text-sm text-brand-muted">Nenhuma ficha ainda</p>
        <Link href={`/dashboard/fichas/nova?paciente_id=${pacienteId}`}>
          <Button variant="outline" size="sm">Criar primeira ficha</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fichas.map((ficha) =>
        confirmandoId === ficha.id ? (
          /* Estado de confirmação */
          <div
            key={ficha.id}
            className="flex items-center justify-between rounded border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="font-sans text-sm text-red-700 dark:text-red-400">
                Apagar ficha de {format(new Date(ficha.created_at), "dd/MM/yyyy")}?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="font-mono text-xs text-brand-muted hover:text-brand-black transition-colors"
                onClick={() => setConfirmandoId(null)}
              >
                cancelar
              </button>
              <Button
                variant="destructive"
                size="sm"
                loading={deletando}
                onClick={() => handleDeletar(ficha.id)}
              >
                Apagar
              </Button>
            </div>
          </div>
        ) : (
          /* Linha normal */
          <div
            key={ficha.id}
            className="group flex items-center justify-between rounded border border-brand-border bg-brand-bg px-4 py-3 hover:bg-brand-surface transition-colors"
          >
            <Link href={`/dashboard/fichas/${ficha.id}`} className="flex-1 min-w-0">
              <p className="font-mono text-sm text-brand-black">
                Ficha de {format(new Date(ficha.created_at), "dd/MM/yyyy")}
              </p>
              <p className="font-mono text-xs text-brand-muted mt-0.5">
                {format(new Date(ficha.created_at), "HH:mm")}
              </p>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={ficha.status === "aberta" ? "warning" : "success"}>
                {ficha.status === "aberta" ? "Aberta" : "Concluída"}
              </Badge>
              <button
                className="flex size-7 items-center justify-center rounded text-brand-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                onClick={() => setConfirmandoId(ficha.id)}
                title="Apagar ficha"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

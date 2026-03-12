import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export default function FichasPage(): React.JSX.Element {
  return (
    <div className="animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between mb-8">
        <p className="font-mono text-sm text-muted-foreground">
          Fichas clínicas dos pacientes
        </p>
        <Link
          href="/dashboard/fichas/nova"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-sans font-medium text-sm rounded-md hover:bg-[hsl(var(--primary-hover))] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Ficha
        </Link>
      </div>

      {/* Estado vazio */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="font-serif text-lg text-foreground mb-1">Nenhuma ficha ainda</h3>
        <p className="font-sans text-sm text-muted-foreground mb-6 text-center max-w-sm">
          Crie fichas clínicas para registrar o histórico dos seus pacientes
        </p>
        <Link
          href="/dashboard/fichas/nova"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-sans font-medium text-sm rounded-md hover:bg-[hsl(var(--primary-hover))] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Ficha
        </Link>
      </div>
    </div>
  );
}

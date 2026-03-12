import Link from "next/link";
import { Plus, Receipt } from "lucide-react";

export default function OrcamentosPage(): React.JSX.Element {
  return (
    <div className="animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between mb-8">
        <p className="font-mono text-sm text-muted-foreground">
          Orçamentos e propostas de tratamento
        </p>
        <Link
          href="/dashboard/orcamentos/novo"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-sans font-medium text-sm rounded-md hover:bg-[hsl(var(--primary-hover))] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Link>
      </div>

      {/* Estado vazio */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Receipt className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="font-serif text-lg text-foreground mb-1">Nenhum orçamento ainda</h3>
        <p className="font-sans text-sm text-muted-foreground mb-6 text-center max-w-sm">
          Crie orçamentos detalhados e envie propostas de tratamento aos seus pacientes
        </p>
        <Link
          href="/dashboard/orcamentos/novo"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-sans font-medium text-sm rounded-md hover:bg-[hsl(var(--primary-hover))] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Link>
      </div>
    </div>
  );
}

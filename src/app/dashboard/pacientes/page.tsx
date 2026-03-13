import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PacientesList } from "./_components/pacientes-list";
import { PacientesListSkeleton } from "./_components/pacientes-list-skeleton";

export default function PacientesPage(): React.JSX.Element {
  return (
    <div className="animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sans text-[2rem] font-bold leading-tight text-foreground">
            Pacientes
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-0.5">
            Gerencie seus pacientes
          </p>
        </div>
        <Link
          href="/dashboard/pacientes/novo"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground font-sans font-medium text-sm rounded-md hover:bg-[hsl(var(--primary-hover))] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo paciente
        </Link>
      </div>

      <Suspense fallback={<PacientesListSkeleton />}>
        <PacientesList />
      </Suspense>
    </div>
  );
}

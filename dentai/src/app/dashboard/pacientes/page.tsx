import { Suspense } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PacientesList } from "./_components/pacientes-list";
import { PacientesListSkeleton } from "./_components/pacientes-list-skeleton";

export default function PacientesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-slate-600">Lista de pacientes da clínica</p>
        </div>
        <Link
          href="/dashboard/pacientes/novo"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <UserPlus className="size-4" />
          Novo Paciente
        </Link>
      </div>

      <Suspense fallback={<PacientesListSkeleton />}>
        <PacientesList />
      </Suspense>
    </div>
  );
}

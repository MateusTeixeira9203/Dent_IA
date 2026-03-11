import { Suspense } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/dentai";
import { PacientesList } from "./_components/pacientes-list";
import { PacientesListSkeleton } from "./_components/pacientes-list-skeleton";

export default function PacientesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-brand-black">Pacientes</h1>
        <Link href="/dashboard/pacientes/novo">
          <Button variant="primary">
            <UserPlus size={16} />
            Novo Paciente
          </Button>
        </Link>
      </div>

      <Suspense fallback={<PacientesListSkeleton />}>
        <PacientesList />
      </Suspense>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { PacientesListSkeleton } from "./_components/pacientes-list-skeleton";

export default function PacientesLoading(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36 rounded" />
        <Skeleton className="h-10 w-40 rounded" />
      </div>
      <PacientesListSkeleton />
    </div>
  );
}

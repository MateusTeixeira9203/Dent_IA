import { PacientesListSkeleton } from "./_components/pacientes-list-skeleton";

export default function PacientesLoading(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-28 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-44 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
      </div>

      <PacientesListSkeleton />
    </div>
  );
}

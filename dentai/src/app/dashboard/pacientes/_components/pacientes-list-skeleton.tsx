import { Skeleton } from "@/components/ui/skeleton";

export function PacientesListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <Skeleton className="h-9 w-full" />

      {/* Tabela */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/50">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Linhas skeleton */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
          >
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28 ml-auto" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

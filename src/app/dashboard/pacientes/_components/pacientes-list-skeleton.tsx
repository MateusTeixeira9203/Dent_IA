import { Skeleton } from "@/components/ui/skeleton";

export function PacientesListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <Skeleton className="h-10 w-full rounded-[3px]" />

      {/* Tabela */}
      <div className="rounded border border-brand-border bg-white overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-brand-border bg-brand-bg">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20 ml-auto" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Linhas skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-brand-border last:border-0"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28 ml-auto" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-[3px]" />
              <Skeleton className="h-8 w-16 rounded-[3px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function FichaLoading(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da ficha */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <Skeleton className="h-9 w-24 rounded-t-md" />
        <Skeleton className="h-9 w-24 rounded-t-md" />
        <Skeleton className="h-9 w-24 rounded-t-md" />
      </div>

      {/* Conteúdo principal */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

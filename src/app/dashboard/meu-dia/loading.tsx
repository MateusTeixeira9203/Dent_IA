// R-46g (D6) — mesmo wrapper do page.tsx (mx-auto max-w-3xl), pra não pular layout quando
// o conteúdo real chega.

import { Skeleton } from '@/components/ui/skeleton';

export default function MeuDiaLoading(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <Skeleton className="mb-2 h-3 w-16 rounded" />
        <Skeleton className="h-9 w-64 rounded" />
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-hidden rounded-2xl border border-border bg-surface p-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[92px] min-w-[112px] shrink-0 rounded-xl" />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

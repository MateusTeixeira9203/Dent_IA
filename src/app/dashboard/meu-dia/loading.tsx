// R-46g (D6) — mesmo wrapper do page.tsx (`PageContainer variant="wide"`, padrão do resto
// do dashboard), pra não pular layout quando o conteúdo real chega. C1 — skeleton no shape
// de 3 colunas do cockpit (320 | 1fr | 312).

import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';

export default function MeuDiaLoading(): React.JSX.Element {
  return (
    <PageContainer variant="wide">
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

        <div className="grid grid-cols-[320px_minmax(0,1fr)_312px] items-start gap-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-[500px] rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

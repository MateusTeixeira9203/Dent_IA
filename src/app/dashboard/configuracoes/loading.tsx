import { PageContainer } from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';

/** R-129a — preserva a estrutura de Configurações enquanto os dados autorizados carregam. */
export default function ConfiguracoesLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </PageContainer>
  );
}

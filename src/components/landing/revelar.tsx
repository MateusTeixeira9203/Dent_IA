'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useEmCena } from '@/hooks/use-em-cena';

/** Bloco que sobe e aparece quando entra em cena. Uma vez só. */
export function Revelar({
  className,
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const [ref, visivel] = useEmCena<HTMLDivElement>({ threshold: 0.05, rootMargin: '0px 0px -12% 0px' });

  return (
    <div ref={ref} id={id} className={cn('revelar', visivel && 'visivel', className)}>
      {children}
    </div>
  );
}

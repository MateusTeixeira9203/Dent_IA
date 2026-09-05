'use client';

import { useTransition } from 'react';
import { CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { regularizarPagamento } from '../actions';

export function PaymentBlockOverlay() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRegularizar(): void {
    startTransition(async () => {
      const resultado = await regularizarPagamento();
      if (resultado.estado === 'liberado') {
        router.refresh();
        return;
      }
      if (resultado.estado === 'checkout' || resultado.estado === 'planos') {
        window.location.assign(resultado.url);
        return;
      }
      window.alert(resultado.mensagem);
    });
  }

  return (
    <section
      aria-live="polite"
      aria-modal="true"
      aria-label="Pagamento pendente"
      className="fixed inset-0 z-[100] grid place-items-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl sm:p-8">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <CreditCard className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Pagamento não identificado</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          A plataforma está temporariamente travada até a regularização do pagamento. Seus dados e
          informações continuam seguros e não serão perdidos.
        </p>
        <Button className="mt-6 w-full" size="lg" onClick={handleRegularizar} disabled={isPending}>
          {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
          {isPending ? 'Verificando pagamento...' : 'Regularizar pagamento'}
        </Button>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          A confirmação é feita com segurança pela Stripe.
        </p>
      </div>
    </section>
  );
}

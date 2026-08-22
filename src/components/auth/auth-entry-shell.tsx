import { BrandLockup } from '@/components/brand/brand-lockup';
import { BrandBackground } from '@/components/layout/brand-background';

interface AuthEntryShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

/** Estrutura visual canônica das portas de entrada. Sem métricas comerciais. */
export function AuthEntryShell({
  eyebrow,
  title,
  description,
  children,
}: AuthEntryShellProps): React.JSX.Element {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-[44%_56%]">
      <aside className="relative hidden min-h-screen overflow-hidden border-r border-border/40 bg-brand-charcoal text-white lg:flex">
        <BrandBackground variant="marketing" tone="charcoal" position="absolute" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <BrandLockup variant="dark" size="md" />
          <div className="max-w-md pb-[12vh]">
            <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-teal-lt">
              Menos papelada. Mais clínica.
            </p>
            <h2 className="font-heading text-5xl leading-[1.04] tracking-[-0.025em] text-white xl:text-6xl">
              Você atende.<br />A IA documenta.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/60">
              Do atendimento ao prontuário estruturado, sem tirar o foco do paciente.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">Odonto.IA</p>
        </div>
      </aside>

      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[470px]">
          <div className="mb-10 lg:hidden">
            <BrandLockup variant="light" size="sm" />
          </div>
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-teal">{eyebrow}</p>
          <h1 className="font-heading text-4xl leading-tight tracking-[-0.02em] text-text-primary sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

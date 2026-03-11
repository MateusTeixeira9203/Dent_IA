import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen flex">
      {/* Coluna esquerda — painel de marca (apenas desktop) */}
      <div
        className="hidden lg:flex lg:w-[60%] flex-col items-center justify-between p-12"
        style={{ backgroundColor: "var(--teal)" }}
      >
        {/* Logo branca centralizada */}
        <div className="flex-1 flex flex-col items-center justify-center gap-10 text-center">
          <Logo size="lg" variant="white" showTagline />

          {/* Frase de impacto */}
          <blockquote className="max-w-md">
            <p className="font-serif italic text-white/95 text-3xl leading-snug">
              &ldquo;Do atendimento ao orçamento em segundos.&rdquo;
            </p>
          </blockquote>
        </div>

        {/* Rodapé */}
        <p className="font-mono text-white/40 text-xs">
          DentAI v0.1.0 — Beta
        </p>
      </div>

      {/* Coluna direita — formulário */}
      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{ backgroundColor: "var(--bg)" }}
      >
        {/* Toggle de tema — canto superior direito */}
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>

        {/* Logo mobile — exibida apenas em telas pequenas */}
        <div className="flex lg:hidden justify-center px-8 pb-6">
          <Logo size="sm" />
        </div>

        {/* Conteúdo (formulário) centralizado */}
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          {children}
        </div>
      </div>
    </div>
  );
}

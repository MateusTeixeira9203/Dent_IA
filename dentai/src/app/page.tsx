import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function HomePage(): React.JSX.Element {
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

      {/* Coluna direita — conteúdo */}
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

        {/* Conteúdo centralizado */}
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {/* Logo desktop (coluna direita) */}
            <div className="hidden lg:flex justify-center mb-8">
              <Logo size="md" />
            </div>

            {/* Título principal */}
            <div className="mb-8 text-center lg:text-left">
              <h1 className="font-serif text-4xl leading-tight text-foreground mb-3">
                Odontologia inteligente.
              </h1>
              <p className="font-sans text-sm" style={{ color: "var(--gray-mid)" }}>
                Gere orçamentos em segundos. Foque no paciente.
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col gap-3">
              <Link
                href="/cadastro"
                className="inline-flex h-11 items-center justify-center rounded-lg px-6 font-sans font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--teal)" }}
              >
                Criar conta grátis
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-lg border px-6 font-sans font-semibold text-sm transition-colors hover:bg-muted"
                style={{
                  borderColor: "var(--teal)",
                  color: "var(--teal)",
                }}
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

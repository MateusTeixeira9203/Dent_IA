import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasDentistaRegistro } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?redirectTo=/onboarding");
  }

  const temDentista = await hasDentistaRegistro(supabase);
  if (temDentista) {
    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Logo size="sm" />
        <ThemeToggle />
      </div>

      {/* Conteúdo centralizado */}
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

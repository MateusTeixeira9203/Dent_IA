"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Início",
  "/dashboard/pacientes": "Pacientes",
  "/dashboard/fichas": "Fichas",
  "/dashboard/orcamentos": "Orçamentos",
  "/dashboard/configuracoes": "Configurações",
};

interface HeaderProps {
  nome: string;
  primeiroNome: string;
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Resolve rotas dinâmicas (ex: /dashboard/pacientes/[id])
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (route !== "/dashboard" && pathname.startsWith(route)) return title;
  }
  return "Dashboard";
}

export function Header({ nome, primeiroNome }: HeaderProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = resolvePageTitle(pathname);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout(): Promise<void> {
    setDropdownOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="flex h-[52px] items-center justify-between border-b border-border px-6"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      {/* Título da página atual */}
      <h2 className="font-sans font-semibold text-[0.95rem] text-foreground leading-none">
        {pageTitle}
      </h2>

      {/* Área direita */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 transition-colors",
              "hover:bg-secondary text-foreground"
            )}
            aria-label="Menu do usuário"
            aria-expanded={dropdownOpen}
          >
            {/* Avatar — teal translúcido */}
            <div
              className="flex size-7 items-center justify-center rounded-full font-mono text-xs font-medium shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--teal) 15%, transparent)",
                color: "var(--teal)",
              }}
            >
              {getIniciais(nome)}
            </div>
            <span className="hidden sm:block font-sans text-sm font-medium">
              Dr. {primeiroNome}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border bg-card shadow-md overflow-hidden z-50"
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/dashboard/configuracoes");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-sans text-foreground hover:bg-secondary transition-colors"
                >
                  <User className="size-4 text-muted-foreground" />
                  Meu perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/dashboard/configuracoes");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-sans text-foreground hover:bg-secondary transition-colors"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  Configurações
                </button>

                <div className="h-px bg-border mx-2 my-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-sans text-destructive hover:bg-secondary transition-colors"
                >
                  <LogOut className="size-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

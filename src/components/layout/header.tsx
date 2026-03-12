"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":               "Visão Geral",
  "/dashboard/pacientes":     "Pacientes",
  "/dashboard/fichas":        "Fichas Clínicas",
  "/dashboard/orcamentos":    "Orçamentos",
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
    <header className="h-[52px] flex items-center justify-between pl-6 pr-10">
      {/* Título dinâmico baseado na rota */}
      <h1 className="font-sans font-semibold text-sm text-foreground">
        {pageTitle}
      </h1>

      <div className="flex items-center gap-5 mr-2">
        {/* Theme Toggle */}
        <div className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-card transition-colors">
          <ThemeToggle />
        </div>

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            aria-label="Menu do usuário"
            aria-expanded={dropdownOpen}
          >
            <span className="font-mono text-xs text-primary font-medium">
              {getIniciais(nome)}
            </span>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-card overflow-hidden z-50 shadow-float">
              {/* Label com nome e email placeholder */}
              <div className="px-3 py-2.5 border-b border-border">
                <p className="font-sans font-medium text-sm text-foreground">
                  Dr. {primeiroNome}
                </p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/dashboard/configuracoes");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-sans text-foreground hover:bg-background/60 transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Meu Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/dashboard/configuracoes");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-sans text-foreground hover:bg-background/60 transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Configurações
                </button>

                <div className="h-px bg-border mx-2 my-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-sans text-destructive hover:bg-background/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
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

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/fichas", label: "Fichas", icon: FileText },
  { href: "/dashboard/orcamentos", label: "Orçamentos", icon: Receipt },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
] as const;

interface SidebarProps {
  nome: string;
  clinicaNome: string;
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Sidebar({ nome, clinicaNome }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-60 flex flex-col border-r border-border"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="flex items-center h-[52px] px-5 border-b border-border shrink-0">
        <Logo size="sm" />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors relative border-l-2",
                isActive
                  ? "text-teal border-teal"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
              style={
                isActive
                  ? { backgroundColor: "color-mix(in srgb, var(--teal) 8%, transparent)" }
                  : undefined
              }
            >
              <Icon
                className="size-4 shrink-0"
                style={isActive ? { color: "var(--teal)" } : undefined}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé com info do dentista */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          {/* Avatar com iniciais — teal translúcido */}
          <div
            className="flex size-8 items-center justify-center rounded-full shrink-0 font-mono text-xs font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--teal) 15%, transparent)",
              color: "var(--teal)",
            }}
          >
            {getIniciais(nome)}
          </div>

          {/* Nome e consultório */}
          <div className="flex-1 min-w-0">
            <p className="font-sans font-medium text-sm text-foreground truncate leading-none mb-0.5">
              {nome}
            </p>
            {clinicaNome && (
              <p
                className="font-mono text-[0.65rem] truncate leading-none"
                style={{ color: "var(--gray-mid)" }}
              >
                {clinicaNome}
              </p>
            )}
          </div>

          {/* Botão de logout */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair"
            className="shrink-0 flex size-7 items-center justify-center rounded transition-colors"
            style={{ color: "var(--gray-mid)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-mid)")}
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

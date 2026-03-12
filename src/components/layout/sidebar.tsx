"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, FileText, Receipt, Settings, LogOut } from "lucide-react";
import { LogoIcon } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",               label: "Início",        icon: LayoutDashboard },
  { href: "/dashboard/pacientes",     label: "Pacientes",     icon: Users           },
  { href: "/dashboard/fichas",        label: "Fichas",        icon: FileText        },
  { href: "/dashboard/orcamentos",    label: "Orçamentos",    icon: Receipt         },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings        },
] as const;

const spring = { type: "spring", duration: 0.3, bounce: 0 };

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

interface SidebarProps {
  nome: string;
  clinicaNome: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ nome }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border">
      {/* Logo — só o dente, sem texto */}
      <Link href="/dashboard" className="mb-8">
        <LogoIcon size={28} />
      </Link>

      {/* Navegação */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "relative w-12 h-12 flex items-center justify-center rounded-lg transition-colors group",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/[0.08] rounded-lg border-l-2 border-primary"
                  transition={spring}
                />
              )}
              <Icon className="relative z-10 w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* Rodapé — avatar + logout */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        <div className="w-px h-6 bg-border" />

        <div
          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
          title={nome}
        >
          <span className="font-mono text-xs text-primary font-medium">
            {getIniciais(nome)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sair"
          aria-label="Sair"
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-card"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

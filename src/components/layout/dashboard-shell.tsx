"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface DashboardShellProps {
  nome: string;
  clinicaNome: string;
  primeiroNome: string;
  children: React.ReactNode;
}

export function DashboardShell({
  nome,
  clinicaNome,
  primeiroNome,
  children,
}: DashboardShellProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        nome={nome}
        clinicaNome={clinicaNome}
        collapsed={false}
        onToggle={() => {}}
      />
      <div className="pl-16">
        <Header nome={nome} primeiroNome={primeiroNome} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

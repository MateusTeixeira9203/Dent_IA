"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface DashboardShellProps {
  nome: string;
  clinicaNome: string;
  children: React.ReactNode;
}

export function DashboardShell({
  nome,
  clinicaNome,
  children,
}: DashboardShellProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        nome={nome}
        clinicaNome={clinicaNome}
        collapsed={false}
        onToggle={() => {}}
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
      />
      <motion.div
        animate={{ paddingLeft: isExpanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <Header />
        <main className="p-6">{children}</main>
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  className?: string;
}

const spring = { type: "spring", duration: 0.3, bounce: 0 } as const;

export function MetricCard({ label, value, subtitle, icon, className }: MetricCardProps): React.JSX.Element {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={spring}
      className={cn(
        "bg-card border border-border rounded-lg p-6 hover:border-muted-foreground/50 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="font-mono text-[2rem] font-medium text-foreground leading-none">
        {value}
      </div>
      {subtitle && (
        <p className="font-sans text-sm text-muted-foreground mt-2">{subtitle}</p>
      )}
    </motion.div>
  );
}

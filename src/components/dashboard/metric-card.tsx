"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
}

const spring = { type: "spring", duration: 0.3, bounce: 0 };

export function MetricCard({ label, value, subtitle, icon: Icon, className }: MetricCardProps): React.JSX.Element {
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
        <Icon className="w-4 h-4 text-muted-foreground" />
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

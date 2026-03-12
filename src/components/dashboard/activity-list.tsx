"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Activity {
  id: string;
  patientName: string;
  patientInitials: string;
  date: string;
  status: "aberta" | "concluída";
  type: string;
  href?: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 4 },
  show:   { opacity: 1, y: 0 },
};

export function ActivityList({ title, activities }: { title: string; activities: Activity[] }): React.JSX.Element {
  return (
    <div>
      <h3 className="font-sans font-medium text-base mb-4 text-foreground">{title}</h3>
      <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-1">
        {activities.map((a) => (
          <motion.li
            key={a.id}
            variants={itemVariant}
            className="group flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-card transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-sm text-primary">{a.patientInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans font-medium text-sm text-foreground truncate">
                  {a.patientName}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-sans",
                  a.status === "aberta"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                )}>
                  {a.status}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{a.date}</span>
            </div>
            {a.href && (
              <Link
                href={a.href}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-primary font-sans text-sm transition-opacity"
              >
                Ver <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

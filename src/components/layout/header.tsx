"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header(): React.JSX.Element {
  return (
    <header className="h-[52px] flex items-center justify-end pl-6 pr-10">
      <div className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-card transition-colors">
        <ThemeToggle />
      </div>
    </header>
  );
}

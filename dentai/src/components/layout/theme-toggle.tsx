"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg text-muted-foreground",
          className
        )}
        aria-hidden
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      <Sun
        className={cn(
          "size-4 transition-all duration-300",
          isDark ? "scale-0 opacity-0 absolute" : "scale-100 opacity-100"
        )}
      />
      <Moon
        className={cn(
          "size-4 transition-all duration-300",
          isDark ? "scale-100 opacity-100" : "scale-0 opacity-0 absolute"
        )}
      />
    </button>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "white";
  showTagline?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 24, text: "text-lg",  tagline: "text-[0.5rem]" },
  md: { icon: 32, text: "text-2xl", tagline: "text-[0.6rem]" },
  lg: { icon: 48, text: "text-4xl", tagline: "text-xs"       },
};

export function Logo({
  size = "md",
  variant = "default",
  showTagline = false,
  className,
}: LogoProps): React.JSX.Element {
  const config = sizeConfig[size];
  const isWhite = variant === "white";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 193 191"
          width={config.icon}
          height={config.icon}
          className={cn("flex-shrink-0", isWhite ? "fill-white" : "fill-primary")}
        >
          <path d="M 137 0 L 123 0 C 113 0 103 4 95 11 C 87 4 77 0 67 0 L 53 0 C 23 0 0 24 0 54 L 0 81 C 0 114 8 147 23 176 C 27 185 37 191 47 191 C 59 191 69 183 73 172 L 85 137 C 86 132 91 128 96 128 C 101 128 106 132 108 137 L 120 172 C 124 183 134 191 146 191 C 156 191 166 185 170 176 C 185 147 193 114 193 81 L 193 54 C 193 24 170 0 137 0 Z" />
        </svg>
        <div className={cn("font-sans font-semibold tracking-tight", config.text)}>
          <span className={isWhite ? "text-white" : "text-foreground"}>DENT</span>
          <span className="text-primary ml-0.5">IA</span>
        </div>
      </div>
      {showTagline && (
        <span className={cn(
          "font-mono uppercase tracking-[0.2em]",
          config.tagline,
          isWhite ? "text-white/60" : "text-muted-foreground"
        )}>
          Inteligência Odontológica
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ className, size = 28 }: { className?: string; size?: number }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 193 191"
      width={size}
      height={size}
      className={cn("fill-primary", className)}
    >
      <path d="M 137 0 L 123 0 C 113 0 103 4 95 11 C 87 4 77 0 67 0 L 53 0 C 23 0 0 24 0 54 L 0 81 C 0 114 8 147 23 176 C 27 185 37 191 47 191 C 59 191 69 183 73 172 L 85 137 C 86 132 91 128 96 128 C 101 128 106 132 108 137 L 120 172 C 124 183 134 191 146 191 C 156 191 166 185 170 176 C 185 147 193 114 193 81 L 193 54 C 193 24 170 0 137 0 Z" />
    </svg>
  );
}

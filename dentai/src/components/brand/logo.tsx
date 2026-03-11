import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  variant?: "default" | "white";
  className?: string;
}

const sizeMap = {
  sm: { icon: 20, text: "text-base", tagline: "text-[0.55rem]", gap: "gap-2" },
  md: { icon: 30, text: "text-xl", tagline: "text-[0.65rem]", gap: "gap-2.5" },
  lg: { icon: 44, text: "text-3xl", tagline: "text-[0.75rem]", gap: "gap-3" },
} as const;

export function Logo({
  size = "md",
  showTagline = false,
  variant = "default",
  className,
}: LogoProps): React.JSX.Element {
  const { icon, text, tagline, gap } = sizeMap[size];
  const isWhite = variant === "white";

  const viewBoxW = 193;
  const viewBoxH = 191;
  const scale = icon / viewBoxH;
  const scaledW = Math.round(viewBoxW * scale);

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <div className={cn("flex items-center", gap)}>
        {/* Ícone do dente */}
        <svg
          width={scaledW}
          height={icon}
          viewBox="0 0 193 191"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M 137 0 L 123 0 C 113 0 103 4 95 11 C 87 4 77 0 67 0 L 53 0 C 23 0 0 24 0 54 L 0 81 C 0 114 8 147 23 176 C 27 185 37 191 47 191 C 59 191 69 183 73 172 L 85 137 C 86 132 91 128 96 128 C 101 128 106 132 108 137 L 120 172 C 124 183 134 191 146 191 C 156 191 166 185 170 176 C 185 147 193 114 193 81 L 193 54 C 193 24 170 0 137 0 Z M 179 81 C 179 112 171 143 158 170 C 155 175 151 177 146 177 C 140 177 135 173 133 167 L 121 133 C 117 122 107 115 96 115 C 85 115 75 122 71 133 L 59 167 C 57 173 52 177 47 177 C 42 177 38 175 35 170 C 22 143 14 112 14 81 L 14 54 C 14 32 32 14 53 14 L 67 14 C 76 14 84 18 89 25 C 92 29 98 29 101 25 C 106 18 114 14 123 14 L 137 14 C 160 14 179 32 179 54 Z"
            fill={isWhite ? "white" : "var(--teal)"}
          />
        </svg>

        {/* Logotipo textual */}
        <div className="flex flex-col">
          <span
            className={cn(
              "font-sans font-bold leading-none tracking-tight",
              text,
              isWhite ? "text-white" : "text-foreground"
            )}
          >
            DENT
            <span style={{ color: isWhite ? "white" : "var(--teal)" }}>
              AI
            </span>
          </span>
          {showTagline && (
            <span
              className={cn(
                "font-mono font-medium uppercase tracking-widest leading-none mt-1",
                tagline,
                isWhite ? "text-white/70" : "text-[var(--gray-mid)]"
              )}
            >
              Inteligência Odontológica
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils"

type LogoVariant = "default" | "dark" | "teal" | "symbol"
type LogoSize = "sm" | "md" | "lg" | "xl"

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
  showTagline?: boolean
}

const sizes: Record<LogoSize, number> = { sm: 120, md: 180, lg: 240, xl: 320 }

const palette = {
  default: { tooth: "#3a9e90", dent: "#2f9c85", ia: "#5dbeb0", tagline: "#3a9e90" },
  dark:    { tooth: "#ffffff", dent: "#ffffff", ia: "#d9d9d9", tagline: "#555555" },
  teal:    { tooth: "#ffffff", dent: "#ffffff", ia: "#ffffff", tagline: "rgba(255,255,255,0.65)" },
}

const TOOTH_PATH = "M511.668 653.836L497.934 653.836C487.77 653.836 477.957 657.668 470.457 664.355C462.961 657.668 453.145 653.836 442.984 653.836L429.246 653.836C398.949 653.836 374.301 678.488 374.301 708.785L374.301 735.59C374.301 768.543 382.086 801.535 396.824 831.023C401.504 840.352 410.891 846.152 421.324 846.152C433.137 846.152 443.574 838.629 447.305 827.426L458.895 792.656C460.559 787.68 465.191 784.336 470.484 784.336C475.723 784.336 480.359 787.68 482.023 792.656L493.605 827.426C497.34 838.629 507.777 846.152 519.59 846.152C530.027 846.152 539.41 840.352 544.094 831.016C558.828 801.535 566.617 768.543 566.617 735.59L566.617 708.785C566.617 678.488 541.965 653.836 511.668 653.836ZM552.879 735.59C552.879 766.414 545.594 797.289 531.805 824.863C529.477 829.527 524.797 832.418 519.59 832.418C513.707 832.418 508.504 828.668 506.637 823.082L495.047 788.309C491.512 777.719 481.641 770.602 470.43 770.602C459.277 770.602 449.402 777.719 445.867 788.309L434.273 823.082C432.414 828.668 427.207 832.418 421.324 832.418C416.121 832.418 411.438 829.527 409.113 824.871C395.32 797.289 388.035 766.414 388.035 735.59L388.035 708.785C388.035 686.059 406.523 667.574 429.246 667.574L442.984 667.574C451.57 667.574 459.785 671.688 464.973 678.574C467.563 682.023 473.355 682.023 475.945 678.574C481.129 671.688 489.348 667.574 497.934 667.574L511.668 667.574C534.395 667.574 552.879 686.059 552.879 708.785Z"

const DENT_PATHS = [
  { tx: 572.367, ty: 797.383, d: "M100.656-56.766C100.656-43.098 98.766-32.109 94.984-23.797C91.211-15.484 85.523-9.438 77.922-5.656C70.328-1.883 59.641 0 45.859 0L11.234 0L11.234-113.531L45.531-113.531C58.926-113.531 69.57-111.586 77.469-107.703C85.375-103.828 91.211-97.77 94.984-89.531C98.766-81.301 100.656-70.379 100.656-56.766ZM76.781-56.938C76.781-66.832 75.805-74.172 73.859-78.953C71.922-83.742 68.629-87.176 63.984-89.25C59.336-91.332 52.445-92.375 43.313-92.375L34.453-92.375L34.453-21.172L43.313-21.172C52.445-21.172 59.32-22.223 63.938-24.328C68.563-26.43 71.859-29.941 73.828-34.859C75.797-39.785 76.781-47.145 76.781-56.938Z" },
  { tx: 680.074, ty: 797.383, d: "M12.313 0L12.313-113.531L86.047-113.531L86.047-93.109L35.438-93.109L35.438-68.906L78.094-68.906L78.094-48.406L35.438-48.406L35.438-21.172L86.047-21.172L86.047 0Z" },
  { tx: 774.328, ty: 797.383, d: "M76.297 0L34.953-81.125L34.953 0L12.313 0L12.313-113.531L42.328-113.531L80.797-37L80.797-113.531L103.531-113.531L103.531 0Z" },
  { tx: 890.074, ty: 797.383, d: "M60.953-92.375L60.953 0L37.813 0L37.813-92.375L2.875-92.375L2.875-113.531L95.891-113.531L95.891-92.375Z" },
]

const IA_PATHS = [
  { tx: 1029.199, ty: 797.383, d: "M52.75 0L-0.828 0L2.875-17.797L18.297-17.797L34.953-95.734L19.531-95.734L23.219-113.531L76.781-113.531L73.094-95.734L57.594-95.734L41.016-17.797L56.438-17.797Z" },
  { tx: 1099.254, ty: 797.383, d: "M-6.734 0L53.891-113.531L83.516-113.531L96.313 0L73.906 0L71.375-23.047L28.875-23.047L16.484 0ZM39.453-43.313L69.234-43.313L64.313-90.234Z" },
]

export function Logo({ variant = "default", size = "md", className, showTagline = true }: LogoProps): React.JSX.Element {
  const width = sizes[size]
  const colors = palette[variant === "symbol" ? "default" : variant]

  if (variant === "symbol") {
    return (
      <svg width={width * 0.35} viewBox="370 648 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Dent IA">
        <path fill="#3a9e90" fillRule="nonzero" d={TOOTH_PATH} />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      viewBox={`370 638 832 ${showTagline ? 242 : 200}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Dent IA — Inteligência Odontológica"
    >
      <path fill={colors.tooth} fillRule="nonzero" d={TOOTH_PATH} />
      <g fill={colors.dent}>
        {DENT_PATHS.map(({ tx, ty, d }, i) => (
          <g key={i} transform={`translate(${tx},${ty})`}><path d={d} /></g>
        ))}
      </g>
      <g fill={colors.ia}>
        {IA_PATHS.map(({ tx, ty, d }, i) => (
          <g key={i} transform={`translate(${tx},${ty})`}><path d={d} /></g>
        ))}
      </g>
      {showTagline && (
        <text x="607" y="864" fontFamily="monospace" fontSize="28" fill={colors.tagline} letterSpacing="3">
          INTELIGÊNCIA ODONTOLÓGICA
        </text>
      )}
    </svg>
  )
}

export function LogoMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width="20" height="22" viewBox="370 648 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill="#3a9e90" fillRule="nonzero" d={TOOTH_PATH} />
      </svg>
      <span className="font-sans font-bold text-lg tracking-tight leading-none">
        <span className="text-foreground">DENT </span>
        <span className="text-teal italic">IA</span>
      </span>
    </div>
  )
}

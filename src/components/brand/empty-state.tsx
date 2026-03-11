import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Ícone em destaque */}
      <div
        className="flex size-16 items-center justify-center rounded-2xl mb-5"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <Icon
          className="size-8"
          style={{ color: "var(--gray-mid)" }}
          strokeWidth={1.5}
        />
      </div>

      {/* Textos */}
      <h3 className="font-sans font-semibold text-base text-foreground mb-2">
        {title}
      </h3>
      <p
        className="font-sans text-sm max-w-sm leading-relaxed mb-6"
        style={{ color: "var(--gray-mid)" }}
      >
        {description}
      </p>

      {/* Ação opcional */}
      {action && <div>{action}</div>}
    </div>
  );
}

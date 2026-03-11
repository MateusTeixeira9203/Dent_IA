interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p
              className="font-sans text-sm mt-1"
              style={{ color: "var(--gray-mid)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4 h-px bg-border" />
    </div>
  );
}

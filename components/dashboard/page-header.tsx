interface PageHeaderProps {
  label?: string;
  title: string;
  description?: string;
}

export function PageHeader({ label, title, description }: PageHeaderProps) {
  return (
    <header>
      {label && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      )}
      <h1 className="text-2xl font-bold text-foreground mt-1">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      )}
    </header>
  );
}

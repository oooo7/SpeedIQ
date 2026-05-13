interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header>
      <h1 className="text-3xl sm:text-4xl font-medium text-[var(--fg)]" style={{ letterSpacing: "-0.035em" }}>
        {title}
      </h1>
      {description && (
        <p className="text-sm text-[var(--fg-3)] mt-2">
          {description}
        </p>
      )}
    </header>
  );
}

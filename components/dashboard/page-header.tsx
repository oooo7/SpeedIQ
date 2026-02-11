interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl font-medium text-foreground">
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

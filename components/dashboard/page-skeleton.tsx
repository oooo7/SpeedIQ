import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

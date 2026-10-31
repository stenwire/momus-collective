import { Skeleton } from "./skeleton";

export function PageSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <Skeleton className="mb-8 h-14 w-2/3 max-w-md" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </main>
  );
}

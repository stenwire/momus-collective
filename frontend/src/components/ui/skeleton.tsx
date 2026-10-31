import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("marble animate-pulse bg-ink-raised motion-reduce:animate-none", className)}
    />
  );
}

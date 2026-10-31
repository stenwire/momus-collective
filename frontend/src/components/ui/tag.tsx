import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tag({
  children,
  tone = "laurel",
  className,
}: {
  children: ReactNode;
  tone?: "laurel" | "bone" | "outline";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 font-mono text-xs uppercase tracking-widest",
        tone === "laurel" && "bg-laurel text-ink",
        tone === "bone" && "bg-bone text-ink",
        tone === "outline" && "border border-rule text-bone-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

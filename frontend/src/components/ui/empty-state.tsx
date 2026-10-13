import type { ReactNode } from "react";
import { Raven } from "@/components/brand/raven";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-rule px-4 py-12 text-center">
      <Raven className="w-24" sizes="96px" />
      <p className="font-display text-3xl uppercase tracking-tight">{title}</p>
      <div className="max-w-sm text-bone-muted">{children}</div>
    </div>
  );
}

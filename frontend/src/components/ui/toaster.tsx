"use client";

import { X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useToasts } from "@/lib/toast";
import { duration, exitDuration, spring } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: spring.settle }}
            exit={{ opacity: 0, y: 12, transition: { duration: exitDuration(duration.short) } }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 border bg-ink-raised py-1 pl-4 text-sm shadow-[4px_4px_0_0_rgb(0_0_0/0.6)]",
              t.tone === "error" ? "border-error text-bone" : "border-rule text-bone",
            )}
          >
            <p className="min-w-0 flex-1 py-2">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="min-h-11 px-2 font-mono text-xs font-bold uppercase tracking-widest text-laurel hover:text-laurel-hi"
              >
                {t.action.label}
              </button>
            )}
            <IconButton label="Dismiss" onClick={() => dismiss(t.id)}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

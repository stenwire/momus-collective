"use client";

import { X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ACTION_TOAST_MS, TOAST_MS, pauseToast, resumeToast, useToasts, type Toast } from "@/lib/toast";
import { duration, exitDuration, spring } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

const SLAB: Record<Toast["tone"], string> = {
  success: "bg-laurel text-ink",
  error: "bg-error text-ink",
  neutral: "bg-bone text-ink",
};

const GLYPH: Record<Toast["tone"], string> = {
  success: "M6 12.5l4 4 8-9",
  error: "M7 7l10 10M17 7L7 17",
  neutral: "M6 12h12",
};

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[60] flex flex-col items-center gap-3 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -48, rotate: -3, scale: 1.06 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1, transition: spring.settle }}
            exit={{ opacity: 0, y: -16, scale: 0.96, transition: { duration: exitDuration(duration.short) } }}
            onPointerEnter={() => pauseToast(t.id)}
            onPointerLeave={() => resumeToast(t.id)}
            onFocus={() => pauseToast(t.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) resumeToast(t.id);
            }}
            data-tone={t.tone}
            className={cn(
              "group pointer-events-auto relative flex w-full max-w-md items-stretch overflow-hidden shadow-[6px_6px_0_0_var(--color-bone)]",
              SLAB[t.tone],
            )}
          >
            <span aria-hidden="true" className="grid w-14 shrink-0 place-items-center bg-ink text-bone">
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <path
                  d={GLYPH[t.tone]}
                  pathLength={1}
                  strokeDasharray={1}
                  className="animate-draw"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1 px-4 py-3">
              <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] opacity-70">{t.label}</p>
              <p className="mt-0.5 font-semibold leading-snug">{t.message}</p>
            </div>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="min-h-11 self-center px-3 font-mono text-xs font-bold uppercase tracking-widest underline underline-offset-4 hover:no-underline"
              >
                {t.action.label}
              </button>
            )}
            <IconButton label="Dismiss" onClick={() => dismiss(t.id)} className="self-center text-ink hover:bg-ink/10">
              <X className="size-4" aria-hidden="true" />
            </IconButton>
            <span
              aria-hidden="true"
              style={{ "--toast-ms": `${t.action ? ACTION_TOAST_MS : TOAST_MS}ms` } as React.CSSProperties}
              className="animate-countdown absolute inset-x-0 bottom-0 h-1 origin-left bg-ink/50 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]"
            />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

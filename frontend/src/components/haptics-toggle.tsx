"use client";

import { useHaptics } from "@/lib/haptics";

export function HapticsToggle() {
  const { enabled, supported, setEnabled } = useHaptics();
  if (!supported) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      className="inline-flex min-h-11 items-center gap-3 font-mono text-xs uppercase tracking-widest text-bone-muted hover:text-bone"
    >
      <span
        aria-hidden="true"
        className={`relative h-4 w-8 border border-rule transition-colors duration-200 ${enabled ? "bg-laurel" : "bg-ink-raised"}`}
      >
        <span
          className={`absolute top-0.5 size-2.5 bg-bone transition-transform duration-200 motion-reduce:transition-none ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
      Haptics {enabled ? "on" : "off"}
    </button>
  );
}

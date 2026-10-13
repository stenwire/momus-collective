"use client";

import { characterCount, sanitizeDesignText } from "@/lib/design/sanitize";
import { inputClasses, labelClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { TextLimits } from "@/lib/design/types";

export function SloganInput({
  value,
  limits,
  onChange,
}: {
  value: string;
  limits: TextLimits;
  onChange: (text: string) => void;
}) {
  const count = characterCount(value);
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="design-slogan"
        className={labelClasses}
      >
        Your slogan
      </label>
      <textarea
        id="design-slogan"
        value={value}
        onChange={(e) => onChange(sanitizeDesignText(e.target.value, limits))}
        rows={3}
        aria-describedby="design-slogan-count"
        placeholder="Type something unhinged…"
        className={cn(inputClasses, "w-full py-2 font-display text-2xl uppercase leading-tight tracking-tight")}
      />
      <p
        id="design-slogan-count"
        aria-live="polite"
        className={`self-end font-mono text-xs tabular-nums ${
          count >= limits.max_length ? "text-laurel" : "text-bone-muted"
        }`}
      >
        {count}/{limits.max_length}
      </p>
    </div>
  );
}

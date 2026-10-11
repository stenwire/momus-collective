"use client";

import { characterCount, sanitizeDesignText } from "@/lib/design/sanitize";
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
        className="text-sm font-medium text-zinc-300"
      >
        Your slogan
      </label>
      <textarea
        id="design-slogan"
        value={value}
        onChange={(e) => onChange(sanitizeDesignText(e.target.value, limits))}
        rows={3}
        aria-describedby="design-slogan-count"
        placeholder="Type something unhinged"
        className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-zinc-50 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
      />
      <p
        id="design-slogan-count"
        aria-live="polite"
        className={`self-end text-xs ${
          count >= limits.max_length ? "text-amber-400" : "text-zinc-400"
        }`}
      >
        {count}/{limits.max_length}
      </p>
    </div>
  );
}

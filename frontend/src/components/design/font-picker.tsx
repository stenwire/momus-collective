"use client";

import { fontFor } from "@/lib/design/fonts";
import type { FontOption } from "@/lib/design/types";

export function FontPicker({
  fonts,
  value,
  onChange,
}: {
  fonts: FontOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-300">Font</legend>
      <div className="grid grid-cols-2 gap-2">
        {fonts.map((font) => {
          const { family, weight } = fontFor(font.key);
          return (
            <button
              key={font.key}
              type="button"
              onClick={() => onChange(font.key)}
              aria-pressed={value === font.key}
              style={{ fontFamily: family, fontWeight: weight }}
              className={`min-h-11 truncate rounded-md border px-2 text-sm transition-colors ${
                value === font.key
                  ? "border-amber-400 bg-amber-400 text-black"
                  : "border-zinc-700 text-zinc-100 hover:border-zinc-500"
              }`}
            >
              {font.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

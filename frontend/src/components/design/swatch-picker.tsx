"use client";

import type { NamedColor } from "@/lib/design/types";

export function SwatchPicker({
  legend,
  colors,
  value,
  onChange,
}: {
  legend: string;
  colors: NamedColor[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-300">
        {legend}: <span className="text-zinc-50">{value}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => onChange(color.name)}
            aria-pressed={value === color.name}
            aria-label={color.name}
            title={color.name}
            style={{ backgroundColor: color.hex }}
            className={`size-11 rounded-full border-2 transition-shadow ${
              value === color.name
                ? "border-amber-400 ring-2 ring-amber-400 ring-offset-2 ring-offset-black"
                : "border-zinc-600 hover:border-zinc-400"
            }`}
          />
        ))}
      </div>
    </fieldset>
  );
}

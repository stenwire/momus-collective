"use client";

import { labelClasses } from "@/components/ui/input";
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
      <legend className={`mb-2 ${labelClasses}`}>
        {legend}: <span className="text-bone">{value}</span>
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
            className={`size-11 border transition-[box-shadow,transform] duration-150 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              value === color.name
                ? "border-ink shadow-[0_0_0_2px_var(--color-ink),0_0_0_4px_var(--color-laurel)]"
                : "border-rule hover:border-bone-muted"
            }`}
          />
        ))}
      </div>
    </fieldset>
  );
}

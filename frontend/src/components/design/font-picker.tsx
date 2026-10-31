"use client";

import { labelClasses } from "@/components/ui/input";
import { fontFor } from "@/lib/design/fonts";
import type { FontOption } from "@/lib/design/types";
import { Chip } from "@/components/ui/chip";

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
      <legend className={`mb-2 ${labelClasses}`}>Font</legend>
      <div className="grid grid-cols-2 gap-2">
        {fonts.map((font) => {
          const { family, weight } = fontFor(font.key);
          return (
            <Chip
              key={font.key}
              selected={value === font.key}
              onClick={() => onChange(font.key)}
              style={{ fontFamily: family, fontWeight: weight }}
              className="truncate px-2"
            >
              {font.label}
            </Chip>
          );
        })}
      </div>
    </fieldset>
  );
}

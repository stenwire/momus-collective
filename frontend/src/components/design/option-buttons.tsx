"use client";

import { Chip } from "@/components/ui/chip";

export function OptionButtons({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-xs uppercase tracking-widest text-bone-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.key}
            selected={value === option.key}
            onClick={() => onChange(option.key)}
            // Labels like "Upper Chest" wrap inside the chip rather than spill.
            className="flex-1 whitespace-normal py-1 text-center leading-tight"
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

"use client";

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
      <legend className="mb-2 text-sm font-medium text-zinc-300">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={value === option.key}
            className={`min-h-11 flex-1 rounded-md border px-3 text-sm whitespace-nowrap transition-colors ${
              value === option.key
                ? "border-amber-400 bg-amber-400 text-black"
                : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

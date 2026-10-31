"use client";

import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low-high" },
  { value: "price_desc", label: "Price: high-low" },
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top Rated" },
] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SortSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Sort products"
      className={cn(inputClasses, "min-h-11 max-w-[38vw] shrink-0 truncate font-mono text-xs uppercase tracking-widest md:min-h-10 md:max-w-48")}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

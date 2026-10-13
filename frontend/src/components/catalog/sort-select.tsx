"use client";

import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
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
      className={cn(inputClasses, "shrink-0 font-mono text-xs uppercase tracking-widest")}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

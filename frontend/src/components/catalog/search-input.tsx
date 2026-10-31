"use client";

import { Search } from "lucide-react";
import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-bone-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by slogan or category…"
        aria-label="Search products"
        autoComplete="off"
        spellCheck={false}
        className={cn(inputClasses, "min-h-11 w-full pl-9 md:min-h-10")}
      />
    </div>
  );
}

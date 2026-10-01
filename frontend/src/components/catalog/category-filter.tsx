"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/api";

type Props = {
  selected: string | null;
  onSelect: (slug: string | null) => void;
};

export function CategoryFilter({ selected, onSelect }: Props) {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  if (!data) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-4">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
          selected === null
            ? "border-amber-400 bg-amber-400 text-black"
            : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
        }`}
      >
        All ({data.all_count})
      </button>
      {data.categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.slug)}
          aria-pressed={selected === category.slug}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            selected === category.slug
              ? "border-amber-400 bg-amber-400 text-black"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          {category.name} ({category.product_count})
        </button>
      ))}
    </div>
  );
}

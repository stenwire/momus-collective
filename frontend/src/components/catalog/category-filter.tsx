"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/api";
import { Chip } from "@/components/ui/chip";

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
      <Chip shape="pill" selected={selected === null} onClick={() => onSelect(null)}>
        All ({data.all_count})
      </Chip>
      {data.categories.map((category) => (
        <Chip
          key={category.id}
          shape="pill"
          selected={selected === category.slug}
          onClick={() => onSelect(category.slug)}
        >
          {category.name} ({category.product_count})
        </Chip>
      ))}
    </div>
  );
}

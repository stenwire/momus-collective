"use client";

import { useQuery } from "@tanstack/react-query";
import * as m from "motion/react-m";
import { useEffect, useRef } from "react";
import { Chip } from "@/components/ui/chip";
import { fetchCategories } from "@/lib/api";
import { spring } from "@/lib/motion";

type Props = {
  selected: string | null;
  onSelect: (slug: string | null) => void;
};

function Indicator() {
  return (
    <m.span
      layoutId="category-indicator"
      transition={spring.snap}
      aria-hidden="true"
      className="absolute inset-0 -z-10 rounded-full bg-laurel"
    />
  );
}

export function CategoryFilter({ selected, onSelect }: Props) {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const rowRef = useRef<HTMLDivElement>(null);

  // On a phone the row scrolls sideways: bring the chosen chip into view.
  useEffect(() => {
    const active = rowRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    active?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [data]);

  if (!data) return null;

  const options = [
    { slug: null, label: `All (${data.all_count})` },
    ...data.categories.map((c) => ({ slug: c.slug, label: `${c.name} (${c.product_count})` })),
  ];

  return (
    <div ref={rowRef} className="isolate flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:flex-wrap md:overflow-visible">
      {options.map((option) => {
        const active = selected === option.slug;
        return (
          <Chip
            key={option.slug ?? "all"}
            shape="pill"
            fill={false}
            selected={active}
            onClick={() => onSelect(option.slug)}
            className="shrink-0"
          >
            {active && <Indicator />}
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}

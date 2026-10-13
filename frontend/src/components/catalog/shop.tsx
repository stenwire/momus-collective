"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CategoryFilter } from "./category-filter";
import { ProductGrid } from "./product-grid";
import { SearchInput } from "./search-input";
import { SortSelect } from "./sort-select";

export function Shop({ category }: { category?: string | null }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const debouncedSearch = useDebouncedValue(search, 300);
  // Selected at once, so the indicator slides while the route loads.
  const [selected, setSelected] = useState(category ?? null);

  function handleCategorySelect(slug: string | null) {
    setSelected(slug);
    router.push(slug ? `/shop/${slug}` : "/shop");
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 pb-4">
        <SearchInput value={search} onChange={setSearch} />
        <SortSelect value={sort} onChange={setSort} />
      </div>
      <CategoryFilter selected={selected} onSelect={handleCategorySelect} />
      <ProductGrid
        category={category ?? null}
        search={debouncedSearch}
        sort={sort}
      />
    </>
  );
}

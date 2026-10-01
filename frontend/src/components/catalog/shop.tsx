"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CategoryFilter } from "./category-filter";
import { ProductGrid } from "./product-grid";
import { SearchInput } from "./search-input";
import { SortSelect } from "./sort-select";

export function Shop() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const debouncedSearch = useDebouncedValue(search, 300);

  return (
    <>
      <div className="flex flex-wrap items-center px-4">
        <SearchInput value={search} onChange={setSearch} />
        <SortSelect value={sort} onChange={setSort} />
      </div>
      <CategoryFilter selected={category} onSelect={setCategory} />
      <ProductGrid category={category} search={debouncedSearch} sort={sort} />
    </>
  );
}

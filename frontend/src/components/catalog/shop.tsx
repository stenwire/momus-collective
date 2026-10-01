"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CategoryFilter } from "./category-filter";
import { ProductGrid } from "./product-grid";
import { SearchInput } from "./search-input";

export function Shop() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      <CategoryFilter selected={category} onSelect={setCategory} />
      <ProductGrid category={category} search={debouncedSearch} />
    </>
  );
}

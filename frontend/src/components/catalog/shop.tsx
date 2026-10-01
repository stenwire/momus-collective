"use client";

import { useState } from "react";
import { CategoryFilter } from "./category-filter";
import { ProductGrid } from "./product-grid";

export function Shop() {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <>
      <CategoryFilter selected={category} onSelect={setCategory} />
      <ProductGrid category={category} />
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "./product-card";

export function ProductGrid({ category }: { category?: string | null }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", category ?? null],
    queryFn: () => fetchProducts(category ? { category } : {}),
  });

  if (isLoading) {
    return <p className="p-8 text-center text-zinc-400">Loading products…</p>;
  }

  if (isError) {
    return (
      <p className="p-8 text-center text-zinc-400">
        Couldn&apos;t load products. Please try again.
      </p>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <p className="p-8 text-center text-zinc-400">No products found.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
      {data.results.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

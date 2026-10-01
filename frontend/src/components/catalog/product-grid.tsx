"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "./product-card";

type Props = {
  category?: string | null;
  search?: string;
};

export function ProductGrid({ category, search }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", category ?? null, search ?? ""],
    queryFn: () =>
      fetchProducts({
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
      }),
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
      <p className="p-8 text-center text-zinc-400">
        {search
          ? `No products match "${search}". Try a different word or category.`
          : "No products found."}
      </p>
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

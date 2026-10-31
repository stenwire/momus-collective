"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "../catalog/product-card";

export function LatestProducts() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["home-products"],
    queryFn: () => fetchProducts({ page_size: 8, sort: "newest" }),
  });
  const products = data?.results ?? [];

  return (
    <section aria-labelledby="latest-products" className="border-y border-rule py-10">
      <div className="mb-4 flex items-end justify-between gap-4 px-4">
        <h2
          id="latest-products"
          className="font-display text-3xl uppercase leading-none tracking-tight md:text-4xl"
        >
          Latest products
        </h2>
        <Link
          href="/shop"
          className="min-h-11 shrink-0 py-3 font-mono text-xs uppercase tracking-widest text-laurel underline underline-offset-4 hover:text-laurel-hi"
        >
          Shop all
        </Link>
      </div>
      {isPending ? (
        <div aria-busy="true" className="grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
          <p role="status" className="sr-only">Loading products…</p>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/5]" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="px-4 py-8 text-center text-bone-muted">
          Couldn&apos;t load products. Please try again.
        </p>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-bone-muted">Products coming soon.</p>
      )}
    </section>
  );
}
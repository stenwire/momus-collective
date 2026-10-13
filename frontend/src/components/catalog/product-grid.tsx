"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { useIntersectionObserver } from "@/lib/use-intersection-observer";
import { Raven } from "@/components/brand/raven";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./product-card";

type Props = {
  category?: string | null;
  search?: string;
  sort?: string;
};

export function ProductGrid({ category, search, sort }: Props) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["products", category ?? null, search ?? "", sort ?? "newest"],
    queryFn: ({ pageParam }) =>
      fetchProducts({
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
        ...(sort ? { sort } : {}),
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
  });

  const sentinelRef = useIntersectionObserver(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  if (isLoading) {
    return (
      <div aria-busy="true" className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        <p role="status" className="sr-only">
          Loading products…
        </p>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="p-8 text-center text-bone-muted">
        Couldn&apos;t load products. Please try again.
      </p>
    );
  }

  const products = data?.pages.flatMap((page) => page.results) ?? [];

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
        <Raven className="w-28" sizes="112px" />
        <p className="font-display text-3xl uppercase tracking-tight">Nothing to mock here.</p>
        <p className="max-w-sm text-bone-muted">
          {search
            ? `No products match "${search}". Try a different word or category.`
            : "No products found."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Keeps the heading hierarchy intact: card titles are h3s, so the
          grid needs an h2 between them and the page's h1. */}
      <h2 className="sr-only">Products</h2>
      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage ? (
        <p role="status" className="p-4 text-center font-mono text-xs uppercase tracking-widest text-bone-muted">
          Loading more…
        </p>
      ) : null}
    </>
  );
}

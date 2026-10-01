"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { useIntersectionObserver } from "@/lib/use-intersection-observer";
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
    return <p className="p-8 text-center text-zinc-400">Loading products…</p>;
  }

  if (isError) {
    return (
      <p className="p-8 text-center text-zinc-400">
        Couldn&apos;t load products. Please try again.
      </p>
    );
  }

  const products = data?.pages.flatMap((page) => page.results) ?? [];

  if (products.length === 0) {
    return (
      <p className="p-8 text-center text-zinc-400">
        {search
          ? `No products match "${search}". Try a different word or category.`
          : "No products found."}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage ? (
        <p className="p-4 text-center text-zinc-400">Loading more…</p>
      ) : null}
    </>
  );
}

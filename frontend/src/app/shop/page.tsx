import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Shop } from "@/components/catalog/shop";
import { fetchProducts } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

export const metadata: Metadata = {
  title: "Shop | momus collective",
  description: "Browse every slogan t-shirt in the momus collective catalog.",
};

export default async function ShopPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["products", null, "", "newest"],
    queryFn: ({ pageParam }) => fetchProducts({ page: pageParam }),
    initialPageParam: 1,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col">
        <h1 className="px-4 pt-8 text-2xl font-semibold text-zinc-50">Shop</h1>
        <Shop />
      </main>
    </HydrationBoundary>
  );
}

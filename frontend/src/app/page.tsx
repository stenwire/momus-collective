import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Collections } from "@/components/catalog/collections";
import { Shop } from "@/components/catalog/shop";
import { fetchCollections, fetchProducts } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

export const metadata: Metadata = {
  title: "momus collective — Shirts with something to say",
  description:
    "Shop slogan t-shirts across philosophy, tech, dad jokes and more, or design your own.",
  openGraph: {
    title: "momus collective",
    description: "Shirts with something to say.",
  },
};

export default async function Home() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: ["products", null, "", "newest"],
      queryFn: ({ pageParam }) => fetchProducts({ page: pageParam }),
      initialPageParam: 1,
    }),
    queryClient.prefetchQuery({
      queryKey: ["collections"],
      queryFn: fetchCollections,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col">
        <Collections />
        <h1 className="px-4 pt-8 text-2xl font-semibold text-zinc-50">
          Shop
        </h1>
        <Shop />
      </main>
    </HydrationBoundary>
  );
}

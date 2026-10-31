import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Shop } from "@/components/catalog/shop";
import { fetchProducts } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

// Regenerated in the background at most once a minute (ISR), not frozen at
// build time; must equal CATALOG_REVALIDATE_SECONDS (a literal is required).
export const revalidate = 60;

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
        <div className="flex items-end justify-between gap-4 px-4 pb-6 pt-10">
          <h1 className="font-display text-[clamp(3rem,10vw,6rem)] uppercase leading-[0.9] tracking-tight">
            Shop
          </h1>
          <p className="pb-2 font-mono text-xs uppercase tracking-widest text-bone-muted">
            Every slogan, no apologies
          </p>
        </div>
        <Shop />
      </main>
    </HydrationBoundary>
  );
}

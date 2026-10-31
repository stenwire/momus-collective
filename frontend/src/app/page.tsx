import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Collections } from "@/components/catalog/collections";
import { Hero } from "@/components/hero";
import { SloganMarquee } from "@/components/home/slogan-marquee";
import { LatestProducts } from "@/components/home/latest-products";
import { NewDrops } from "@/components/new-drops";
import { OurStory } from "@/components/our-story";
import { fetchCollections, fetchProducts } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

// Regenerated in the background at most once a minute (ISR), not frozen at
// build time; must equal CATALOG_REVALIDATE_SECONDS (a literal is required).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "momus collective — dressed up, filtered out.",
  description:
    "Shop slogan t-shirts across philosophy, tech, dad jokes and more, or design your own.",
  openGraph: {
    title: "momus collective",
    description: "dressed up, filtered out. Satirical slogan t-shirts from Lagos.",
  },
};

export default async function Home() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["collections"],
      queryFn: fetchCollections,
    }),
    queryClient.prefetchQuery({
      queryKey: ["home-products"],
      queryFn: () => fetchProducts({ page_size: 8, sort: "newest" }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col">
        <Hero />
        <LatestProducts />
        <SloganMarquee />
        <Collections />
        <OurStory />
        <NewDrops />
      </main>
    </HydrationBoundary>
  );
}

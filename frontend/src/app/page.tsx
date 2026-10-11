import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Collections } from "@/components/catalog/collections";
import { Hero } from "@/components/hero";
import { OurStory } from "@/components/our-story";
import { fetchCollections } from "@/lib/api";
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
  await queryClient.prefetchQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col">
        <Hero />
        <Collections />
        <OurStory />
      </main>
    </HydrationBoundary>
  );
}

import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";
import { Collections } from "@/components/catalog/collections";
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
        <h1 className="px-4 pt-8 text-2xl font-semibold text-zinc-50">
          momus collective
        </h1>
        <Collections />
        <Link
          href="/shop"
          className="mx-4 mb-8 inline-block rounded-md bg-amber-400 px-6 py-2 text-center font-medium text-black transition-colors hover:bg-amber-300"
        >
          Shop All Products
        </Link>
      </main>
    </HydrationBoundary>
  );
}

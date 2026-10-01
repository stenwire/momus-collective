import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shop } from "@/components/catalog/shop";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

type Props = {
  params: Promise<{ category: string }>;
};

async function findCategory(slug: string) {
  const { categories } = await fetchCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await findCategory(slug);
  if (!category) {
    return { title: "Category not found" };
  }
  return {
    title: `${category.name} | momus collective`,
    description: `Shop ${category.name} slogan t-shirts at momus collective.`,
  };
}

export default async function ShopCategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = await findCategory(slug);
  if (!category) {
    notFound();
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["products", slug, "", "newest"],
    queryFn: ({ pageParam }) => fetchProducts({ category: slug, page: pageParam }),
    initialPageParam: 1,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col">
        <h1 className="px-4 pt-8 text-2xl font-semibold text-zinc-50">
          {category.name}
        </h1>
        <Shop category={slug} />
      </main>
    </HydrationBoundary>
  );
}

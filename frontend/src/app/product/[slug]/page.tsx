import { notFound } from "next/navigation";
import { fetchProduct } from "@/lib/api";
import { ProductDetailView } from "@/components/catalog/product-detail";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    notFound();
  }
  return (
    <main className="flex-1">
      <ProductDetailView product={product} />
    </main>
  );
}

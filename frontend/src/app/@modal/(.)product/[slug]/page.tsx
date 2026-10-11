import { notFound } from "next/navigation";
import { fetchProduct } from "@/lib/api";
import { ProductDetailView } from "@/components/catalog/product-detail";
import { ProductModal } from "@/components/catalog/product-modal";

export default async function ProductModalPage({
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
    <ProductModal>
      <ProductDetailView product={product} />
    </ProductModal>
  );
}

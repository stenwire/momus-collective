import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProduct } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { ProductDetailView } from "@/components/catalog/product-detail";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    return { title: "Product not found" };
  }

  const description =
    product.description || `${product.slogan} — ${formatNaira(product.price)}`;
  const image = product.mockup_images[0];

  return {
    title: `${product.slogan} | momus collective`,
    description,
    openGraph: {
      title: product.slogan,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.slogan,
    description: product.description || product.slogan,
    category: product.category.name,
    image: product.mockup_images,
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: (product.price / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailView product={product} />
    </main>
  );
}

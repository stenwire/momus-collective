import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/api";
import { formatNaira } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const mockup = product.mockup_images[0];

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-700"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-900">
        {mockup ? (
          <Image
            src={mockup}
            alt={product.slogan}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : null}
        {product.tags[0] ? (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-medium text-black">
            {product.tags[0]}
          </span>
        ) : null}
      </div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">
        {product.category.name}
      </p>
      <h3 className="text-sm font-medium text-zinc-50">{product.slogan}</h3>
      <p className="text-sm font-semibold text-amber-400">
        {formatNaira(product.price)}
      </p>
    </Link>
  );
}

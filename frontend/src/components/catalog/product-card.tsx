import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Product } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { Tag } from "../ui/tag";
import { HeartButton } from "../wishlist/heart-button";
import { RatingSummary } from "./product-reviews";

export function productNumber(index: number): string {
  return `№ ${String(index + 1).padStart(3, "0")}`;
}

export function ProductCard({ product, index }: { product: Product; index?: number }) {
  const mockup = product.mockup_images[0];
  // Cards rise in on CSS, so the first rows show before hydration; each
  // fetched page staggers from its own start.
  const style: CSSProperties | undefined =
    index === undefined ? undefined : { animationDelay: `${(index % 20) * 40}ms` };

  // The heart sits beside the link, not inside it: a button can't nest in
  // an anchor.
  return (
    <div className={index === undefined ? "relative" : "relative animate-rise"} style={style}>
      <Link
        href={`/product/${product.slug}`}
        className="group flex flex-col gap-2 border border-rule bg-ink-raised p-3 transition-[border-color,box-shadow,transform] duration-150 hover:border-bone-muted hover:shadow-press active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:transition-none"
      >
        <div className="relative aspect-square overflow-hidden bg-ink">
          {mockup ? (
            <Image
              src={mockup}
              alt={product.slogan}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          ) : (
            // No mockup yet: print the slogan itself. Drawn from a data
            // attribute so it isn't read twice or matched as page text.
            <div
              aria-hidden="true"
              data-slogan={product.slogan}
              className="marble absolute inset-0 grid place-items-center px-3 pb-9 pt-14 text-center font-display text-lg uppercase leading-none tracking-tight text-bone before:content-[attr(data-slogan)] sm:text-2xl md:text-3xl"
            />
          )}
          {product.tags[0] ? (
            <Tag className="absolute left-2 top-2">{product.tags[0]}</Tag>
          ) : null}
          {index !== undefined ? (
            <span className="absolute bottom-2 left-2 font-mono text-xs text-bone-muted">
              {productNumber(index)}
            </span>
          ) : null}
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-bone-muted">
          {product.category.name}
        </p>
        <h3 className="text-sm font-semibold text-bone transition-transform duration-200 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          {product.slogan}
        </h3>
        <p className="font-mono text-sm font-bold tabular-nums text-laurel">
          {formatNaira(product.price)}
        </p>
        <RatingSummary average={product.avg_rating} count={product.review_count} />
      </Link>
      <div className="absolute right-5 top-5">
        <HeartButton productId={product.id} slogan={product.slogan} />
      </div>
    </div>
  );
}

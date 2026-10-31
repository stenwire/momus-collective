"use client";

import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { mockupLayoutId, useSharedMockup } from "@/lib/shared-mockup";
import type { Product } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { HeartButton } from "../wishlist/heart-button";

export function productNumber(index: number): string {
  return `№ ${String(index + 1).padStart(3, "0")}`;
}

export function ProductCard({ product, index }: { product: Product; index?: number }) {
  const mockup = product.mockup_images[0];
  const owner = useId();
  const shared = useSharedMockup((s) => s.productId === product.id && s.owner === owner);
  const claim = useSharedMockup((s) => s.claim);
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
        onClick={() => claim(product.id, owner)}
        className="group flex cursor-pointer flex-col gap-2"
      >
        <m.div
          layoutId={shared ? mockupLayoutId(product.id) : undefined}
          className="relative aspect-[4/5] overflow-hidden border border-rule bg-ink-raised"
        >
          {mockup ? (
            <Image
              src={mockup}
              alt={product.slogan}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
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
          {index !== undefined ? (
            <span aria-hidden="true" className="absolute bottom-2 left-2 bg-ink/80 px-1.5 py-1 font-mono text-[10px] text-bone-muted">
              {productNumber(index)}
            </span>
          ) : null}
        </m.div>
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <h3 className="min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-bone group-hover:underline group-hover:decoration-laurel group-hover:underline-offset-4">
            {product.slogan}
          </h3>
          <p className="shrink-0 font-mono text-xs tabular-nums text-laurel">
            {formatNaira(product.price)}
          </p>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <HeartButton productId={product.id} slogan={product.slogan} />
      </div>
    </div>
  );
}

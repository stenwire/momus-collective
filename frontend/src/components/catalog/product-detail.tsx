"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductDetail } from "@/lib/api";
import { SIZES } from "@/lib/constants";
import { formatNaira } from "@/lib/format";
import { ProductCard } from "./product-card";

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const [size, setSize] = useState<string>(SIZES[0]);
  const [color, setColor] = useState<string | undefined>(
    product.shirt_colors[0],
  );
  const mockup = product.mockup_images[0];

  return (
    <div className="flex flex-col gap-6 p-6 md:flex-row">
      <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900 md:w-96">
        {mockup ? (
          <Image
            src={mockup}
            alt={product.slogan}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            {product.category.name}
          </p>
          <h1 className="text-xl font-semibold text-zinc-50">
            {product.slogan}
          </h1>
          <p className="mt-1 text-lg font-semibold text-amber-400">
            {formatNaira(product.price)}
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">
            Size
          </legend>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`min-h-11 min-w-11 rounded-md border px-3 text-sm transition-colors ${
                  size === s
                    ? "border-amber-400 bg-amber-400 text-black"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        {product.shirt_colors.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">
              Color
            </legend>
            <div className="flex flex-wrap gap-2">
              {product.shirt_colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  className={`min-h-11 rounded-md border px-3 text-sm transition-colors ${
                    color === c
                      ? "border-amber-400 bg-amber-400 text-black"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <button
          type="button"
          className="min-h-11 rounded-md bg-amber-400 px-6 py-2 font-medium text-black transition-colors hover:bg-amber-300"
        >
          Add to Bag
        </button>

        {product.description ? (
          <p className="whitespace-pre-line text-sm text-zinc-400">
            {product.description}
          </p>
        ) : null}

        {product.related_products.length > 0 ? (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-300">
              You might also like
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {product.related_products.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import type { ProductDetail } from "@/lib/api";
import { errorMessages } from "@/lib/auth/api";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useCart } from "@/lib/cart/use-cart";
import { SIZES } from "@/lib/constants";
import { formatNaira } from "@/lib/format";
import { ProductCard } from "./product-card";
import { ProductReviews, RatingSummary } from "./product-reviews";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const [size, setSize] = useState<string>(SIZES[0]);
  const [color, setColor] = useState<string | undefined>(
    product.shirt_colors[0],
  );
  const mockup = product.mockup_images[0];
  const { add } = useCart();
  const openBag = useCartDrawer((s) => s.setOpen);
  const [status, setStatus] = useState("");
  const [added, setAdded] = useState(false);

  async function addToBag() {
    setStatus("");
    setAdded(false);
    try {
      await add({
        product: {
          id: product.id,
          slug: product.slug,
          slogan: product.slogan,
          image: mockup ?? null,
          price: product.price,
        },
        size,
        color: color ?? "",
      });
      setStatus("Added to your bag.");
      setAdded(true);
    } catch (error) {
      setStatus(errorMessages(error).join(" "));
    }
  }

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
          <RatingSummary average={product.avg_rating} count={product.review_count} href="#reviews" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">
            Size
          </legend>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <Chip key={s} selected={size === s} onClick={() => setSize(s)}>
                {s}
              </Chip>
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
                <Chip key={c} selected={color === c} onClick={() => setColor(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </fieldset>
        ) : null}

        <button
          type="button"
          onClick={addToBag}
          className={buttonClasses({ size: "lg" })}
        >
          Add to Bag
        </button>
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="text-sm text-emerald-400">
            {status}
          </p>
          {added ? (
            // The modal covers the nav on mobile, so the bag opens from here.
            <button
              type="button"
              onClick={() => openBag(true)}
              className="min-h-11 text-sm text-amber-400 underline"
            >
              View bag
            </button>
          ) : null}
        </div>

        {product.description ? (
          <p className="whitespace-pre-line text-sm text-zinc-400">
            {product.description}
          </p>
        ) : null}

        <Suspense>
          <ProductReviews slug={product.slug} />
        </Suspense>

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

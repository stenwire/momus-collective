"use client";

import { Check } from "lucide-react";
import * as m from "motion/react-m";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { labelClasses } from "@/components/ui/input";
import type { ProductDetail } from "@/lib/api";
import { errorMessages } from "@/lib/auth/api";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useCart } from "@/lib/cart/use-cart";
import { SIZES } from "@/lib/constants";
import { flyToBag } from "@/lib/fly-to-bag";
import { formatNaira } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { mockupLayoutId, useSharedMockup } from "@/lib/shared-mockup";
import { ProductCard } from "./product-card";
import { ProductReviews, RatingSummary } from "./product-reviews";

const BAGGED_MS = 1600;
type BagState = "idle" | "adding" | "bagged";

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const [size, setSize] = useState<string>(SIZES[0]);
  const [color, setColor] = useState<string | undefined>(product.shirt_colors[0]);
  const [imageIndex, setImageIndex] = useState(0);
  const mockup = product.mockup_images[imageIndex];
  const { add } = useCart();
  const openBag = useCartDrawer((s) => s.setOpen);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [bag, setBag] = useState<BagState>("idle");
  const [added, setAdded] = useState(false);
  const mockupRef = useRef<HTMLDivElement>(null);
  const shared = useSharedMockup((s) => s.productId === product.id);

  useEffect(() => {
    if (bag !== "bagged") return;
    const timer = setTimeout(() => setBag("idle"), BAGGED_MS);
    return () => clearTimeout(timer);
  }, [bag]);

  function choose<T>(set: (value: T) => void, value: T) {
    haptic("tick");
    set(value);
  }

  async function addToBag() {
    setStatus("");
    setError(false);
    setBag("adding");
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
      haptic("success");
      setStatus("Added to your bag.");
      setAdded(true);
      setBag("bagged");
      void flyToBag(mockupRef.current);
    } catch (e) {
      haptic("error");
      setError(true);
      setStatus(errorMessages(e).join(" "));
      setBag("idle");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-3 sm:p-5 md:flex-row md:items-start md:gap-10 md:p-8">
      <div className="flex w-full min-w-0 flex-col gap-2 md:sticky md:top-20 md:w-[min(54vw,720px)] md:shrink-0">
        <m.div
          ref={mockupRef}
          layoutId={shared ? mockupLayoutId(product.id) : undefined}
          className="relative aspect-[4/5] w-full overflow-hidden border border-rule bg-ink-raised"
        >
          {mockup ? (
            <Image
              src={mockup}
              alt={`${product.slogan}, view ${imageIndex + 1}`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 54vw"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              data-slogan={product.slogan}
              className="marble absolute inset-0 grid place-items-center p-8 text-center font-display text-5xl uppercase leading-none tracking-tight text-bone before:content-[attr(data-slogan)]"
            />
          )}
          <span className="absolute bottom-3 right-3 size-10 overflow-hidden rounded-full opacity-70">
            <Image
              src="/avatar-192.png"
              alt="momus collective seal"
              width={40}
              height={40}
              className="mix-blend-lighten"
            />
          </span>
        </m.div>
        {product.mockup_images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
            {product.mockup_images.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={`Show image ${index + 1}`}
                aria-pressed={imageIndex === index}
                onClick={() => setImageIndex(index)}
                className={`relative size-16 shrink-0 cursor-pointer overflow-hidden border ${imageIndex === index ? "border-laurel" : "border-rule"}`}
              >
                <Image src={src} alt={`${product.slogan}, thumbnail ${index + 1}`} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5 md:py-4">
        <div className="flex flex-col gap-2">
          <p className={labelClasses}>{product.category.name}</p>
          <h1 className="font-display text-4xl uppercase leading-[0.9] sm:text-5xl lg:text-6xl [overflow-wrap:anywhere]">
            {product.slogan}
          </h1>
          <p className="font-mono text-xl font-bold tabular-nums text-laurel">
            {formatNaira(product.price)}
          </p>
          <RatingSummary average={product.avg_rating} count={product.review_count} href="#reviews" />
        </div>

        <fieldset>
          <legend className={`mb-2 ${labelClasses}`}>Size</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <Chip key={s} selected={size === s} onClick={() => choose(setSize, s)}>
                {s}
              </Chip>
            ))}
          </div>
        </fieldset>

        {product.shirt_colors.length > 0 ? (
          <fieldset>
            <legend className={`mb-2 ${labelClasses}`}>Color</legend>
            <div className="flex flex-wrap gap-2">
              {product.shirt_colors.map((c) => (
                <Chip key={c} selected={color === c} onClick={() => choose(setColor, c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Button size="md" className="w-full sm:w-auto" onClick={addToBag} loading={bag === "adding"}>
          {bag === "bagged" ? (
            <>
              <Check className="size-5" aria-hidden="true" /> Bagged
            </>
          ) : (
            "Add to Bag"
          )}
        </Button>
        <div className="flex min-h-11 items-center gap-4">
          <p aria-live="polite" className={`text-sm ${error ? "text-error" : "text-ok"}`}>
            {status}
          </p>
          {added ? (
            // The modal covers the nav on mobile, so the bag opens from here.
            <button
              type="button"
              onClick={() => openBag(true)}
              className="min-h-11 font-mono text-xs uppercase tracking-widest text-laurel underline underline-offset-4 hover:text-laurel-hi"
            >
              View bag
            </button>
          ) : null}
        </div>

        {product.description ? (
          <p className="whitespace-pre-line border-t border-rule pt-6 text-sm text-bone-muted">
            {product.description}
          </p>
        ) : null}

        <Suspense>
          <ProductReviews slug={product.slug} />
        </Suspense>

        {product.related_products.length > 0 ? (
          <div className="border-t border-rule pt-6">
            <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">You might also like</h2>
            <div className="grid grid-cols-2 gap-3">
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

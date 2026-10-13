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
  const mockup = product.mockup_images[0];
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
    <div className="flex flex-col gap-8 p-4 md:flex-row md:p-8">
      <m.div
        ref={mockupRef}
        layoutId={shared ? mockupLayoutId(product.id) : undefined}
        className="relative aspect-square w-full shrink-0 self-start overflow-hidden border border-rule bg-ink md:w-96"
      >
        {mockup ? (
          <Image
            src={mockup}
            alt={product.slogan}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            data-slogan={product.slogan}
            className="marble absolute inset-0 grid place-items-center p-8 text-center font-display text-5xl uppercase leading-none tracking-tight text-bone before:content-[attr(data-slogan)]"
          />
        )}
        {/* PRD: the avatar as a subtle stamp on the product view. The clip
            drops its white corners; lighten drops its black disc. */}
        <span className="absolute bottom-3 right-3 size-12 overflow-hidden rounded-full opacity-70">
          <Image
            src="/avatar-192.png"
            alt="momus collective seal"
            width={48}
            height={48}
            className="mix-blend-lighten"
          />
        </span>
      </m.div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className={labelClasses}>{product.category.name}</p>
          <h1 className="font-display text-[clamp(2.5rem,7vw,4rem)] uppercase leading-[0.9] tracking-tight [overflow-wrap:anywhere]">
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

        <Button size="lg" onClick={addToBag} loading={bag === "adding"}>
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

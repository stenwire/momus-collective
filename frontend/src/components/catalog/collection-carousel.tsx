"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useReducedMotionConfig } from "motion/react";
import { useId, useRef } from "react";
import { IconButton } from "@/components/ui/icon-button";
import type { Collection } from "@/lib/api";
import { ProductCard } from "./product-card";

// FR-CAT-06: a horizontal, snapping row; the arrows are the non-swipe way
// through it (cards are also reachable by Tab).
export function CollectionCarousel({ collection }: { collection: Collection }) {
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionConfig();
  if (collection.products.length === 0) return null;

  function page(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <section aria-labelledby={`${trackId}-title`} className="border-b border-rule py-8">
      <div className="mb-4 flex items-end justify-between gap-4 px-4">
        <h2
          id={`${trackId}-title`}
          className="font-display text-3xl uppercase leading-none tracking-tight md:text-4xl"
        >
          {collection.name}
          <span className="ml-3 align-middle font-mono text-xs tracking-widest text-bone-muted">
            № {String(collection.products.length).padStart(2, "0")}
          </span>
        </h2>
        <div className="hidden gap-1 md:flex">
          <IconButton label={`Previous in ${collection.name}`} aria-controls={trackId} onClick={() => page(-1)}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </IconButton>
          <IconButton label={`Next in ${collection.name}`} aria-controls={trackId} onClick={() => page(1)}>
            <ArrowRight className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      <div
        id={trackId}
        ref={track}
        className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:thin]"
      >
        {collection.products.map((product) => (
          <div key={product.id} className="w-44 shrink-0 snap-start sm:w-56">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

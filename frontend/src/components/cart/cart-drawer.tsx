"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useCart } from "@/lib/cart/use-cart";
import { CartLines } from "./cart-lines";
import { buttonClasses } from "@/components/ui/button";

// FR-CART-03: a bottom sheet on mobile, a right-hand drawer from md up.
export function CartDrawer() {
  const { open, setOpen } = useCartDrawer();
  const { cart, setQuantity, remove } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, setOpen]);

  if (!open) return null;
  const empty = cart.items.length === 0;

  return (
    <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-zinc-950 shadow-xl md:inset-x-auto md:top-0 md:right-0 md:max-h-none md:h-full md:w-[26rem] md:rounded-none md:border-l md:border-zinc-800"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <h2 className="text-lg font-semibold text-zinc-50">
            Your bag{cart.item_count ? ` (${cart.item_count})` : ""}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close bag"
            className="flex size-11 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <CartLines cart={cart} onQuantity={setQuantity} onRemove={remove} />
        </div>
        <div className="border-t border-zinc-800 p-4">
          {empty ? (
            <button
              type="button"
              disabled
              className={buttonClasses({ block: true })}
            >
              Checkout
            </button>
          ) : (
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className={buttonClasses({ block: true })}
            >
              Checkout
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

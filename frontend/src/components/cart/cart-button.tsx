"use client";

import { ShoppingBag } from "lucide-react";
import { Counter } from "@/components/ui/counter";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useCart } from "@/lib/cart/use-cart";
import { BAG_TARGET_ID } from "@/lib/fly-to-bag";

export function CartButton() {
  const { cart } = useCart();
  const setOpen = useCartDrawer((s) => s.setOpen);
  const count = cart.item_count;
  return (
    <button
      id={BAG_TARGET_ID}
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
      className="relative inline-flex size-11 items-center justify-center text-bone transition-transform duration-150 hover:text-laurel active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <ShoppingBag aria-hidden="true" className="size-6" strokeWidth={1.6} />
      {count > 0 ? (
        // Re-keyed on each change so the bump replays.
        <span
          key={count}
          aria-hidden="true"
          className="absolute right-0 top-0.5 inline-flex h-5 min-w-5 animate-bump items-center justify-center bg-laurel px-1 text-xs font-bold leading-5 text-ink"
        >
          {count > 99 ? "99+" : <Counter value={count} />}
        </span>
      ) : null}
    </button>
  );
}

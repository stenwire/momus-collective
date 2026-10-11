"use client";

import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useCart } from "@/lib/cart/use-cart";

export function CartButton() {
  const { cart } = useCart();
  const setOpen = useCartDrawer((s) => s.setOpen);
  const count = cart.item_count;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
      className="relative inline-flex size-11 items-center justify-center text-zinc-300 hover:text-zinc-50"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-amber-400 px-1 text-center text-xs font-semibold leading-5 text-black"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useCallback } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useCart } from "@/lib/cart/use-cart";
import { CartLines } from "./cart-lines";

// FR-CART-03: a bottom sheet on mobile, a right-hand drawer from md up.
export function CartDrawer() {
  const { open, setOpen } = useCartDrawer();
  const { cart, setQuantity, remove } = useCart();
  const close = useCallback(() => setOpen(false), [setOpen]);
  const empty = cart.items.length === 0;

  return (
    <Sheet
      open={open}
      onClose={close}
      variant="drawer"
      label="Your bag"
      closeLabel="Close bag"
      title={
        <h2 className="py-3 font-display text-2xl uppercase leading-none tracking-tight">
          Your bag
          {cart.item_count ? (
            <span className="ml-2 font-mono text-sm text-bone-muted">({cart.item_count})</span>
          ) : null}
        </h2>
      }
      footer={
        <div className="border-t border-rule p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {empty ? (
            <button type="button" disabled className={buttonClasses({ block: true })}>
              Checkout
            </button>
          ) : (
            <Link href="/checkout" onClick={close} className={buttonClasses({ block: true })}>
              Checkout
            </Link>
          )}
        </div>
      }
    >
      <div className="p-4">
        <CartLines cart={cart} onQuantity={setQuantity} onRemove={remove} />
      </div>
    </Sheet>
  );
}

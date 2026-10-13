"use client";

import { errorMessages } from "@/lib/auth/api";
import { toast } from "@/lib/toast";
import type { AddToCart, CartData, CartLine } from "./types";
import { useCart } from "./use-cart";

export function lineToAdd(line: CartLine): AddToCart | null {
  if (line.design) return { design: line.design, size: line.size, quantity: line.quantity };
  if (line.product) {
    return {
      product: { ...line.product, price: line.unit_price },
      size: line.size,
      color: line.color,
      quantity: line.quantity,
    };
  }
  return null;
}

// Removing a line is instant; the toast's Undo puts the same line back.
export function useRemoveWithUndo(cart: CartData) {
  const { remove, add } = useCart();
  return async (id: string) => {
    const line = cart.items.find((item) => item.id === id);
    await remove(id);
    const restore = line ? lineToAdd(line) : null;
    if (!line || !restore) return;
    const title = line.design ? "Custom design" : (line.product?.slogan ?? "Item");
    toast(`${title} removed.`, {
      action: {
        label: "Undo",
        onClick: () => {
          add(restore).catch((e) => toast(errorMessages(e).join(" "), { tone: "error" }));
        },
      },
    });
  };
}

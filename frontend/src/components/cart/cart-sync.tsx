"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { mergeGuestCart } from "@/lib/cart/api";
import { useGuestCart } from "@/lib/cart/guest-store";
import { useCartNotice } from "@/lib/cart/notice-store";

function reasonText(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (Array.isArray(reason)) return reason.map(reasonText).join(" ");
  if (reason && typeof reason === "object") return Object.values(reason).map(reasonText).join(" ");
  return "It's no longer available.";
}

// FR-CART-01: on sign-in, the guest's localStorage lines join the server
// cart. They are cleared only once the server has them, so a failed merge
// keeps them for the next attempt rather than losing them.
export function CartSync() {
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const merging = useRef(false);

  useEffect(() => {
    const lines = useGuestCart.getState().lines;
    if (!signedIn || lines.length === 0 || merging.current) return;
    merging.current = true;
    mergeGuestCart(lines)
      .then((cart) => {
        const titles = new Map(lines.map((l) => [l.product.id, l.product.slogan]));
        useCartNotice.getState().setDropped(
          cart.skipped.map((s) => ({
            title: titles.get(s.product) ?? "An item",
            reason: reasonText(s.reason),
          })),
        );
        useGuestCart.getState().clear();
        queryClient.setQueryData(["cart"], cart);
      })
      .catch(() => {})
      .finally(() => {
        merging.current = false;
      });
  }, [signedIn, queryClient]);

  return null;
}

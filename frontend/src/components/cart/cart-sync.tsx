"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { mergeGuestCart } from "@/lib/cart/api";
import { useGuestCart } from "@/lib/cart/guest-store";

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

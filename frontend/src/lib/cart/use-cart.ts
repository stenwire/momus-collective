"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import {
  addToServerCart,
  fetchServerCart,
  removeServerLine,
  setServerQuantity,
} from "./api";
import { guestCartData, useGuestCart } from "./guest-store";
import type { AddToCart, CartData } from "./types";

const EMPTY: CartData = { items: [], item_count: 0, subtotal: 0 };

// One cart interface either way: server-side once signed in, localStorage
// for guests (FR-CART-01).
export function useCart() {
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const guest = useGuestCart();
  const server = useQuery({
    queryKey: ["cart"],
    queryFn: fetchServerCart,
    enabled: signedIn === true,
  });
  const onServerCart = (data: CartData) => queryClient.setQueryData(["cart"], data);

  const addMutation = useMutation({ mutationFn: addToServerCart, onSuccess: onServerCart });
  const quantityMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      setServerQuantity(id, quantity),
    onSuccess: onServerCart,
  });
  const removeMutation = useMutation({ mutationFn: removeServerLine, onSuccess: onServerCart });

  const cart = signedIn ? (server.data ?? EMPTY) : guestCartData(guest.lines);

  async function add(input: AddToCart) {
    if (signedIn) {
      await addMutation.mutateAsync(input);
      return;
    }
    if ("design" in input) {
      throw new ApiError(401, { detail: "Sign in to add a custom design." });
    }
    guest.add({
      product: input.product,
      size: input.size,
      color: input.color,
      quantity: input.quantity ?? 1,
    });
  }

  async function setQuantity(id: string, quantity: number) {
    if (signedIn) await quantityMutation.mutateAsync({ id, quantity });
    else guest.setQuantity(id, quantity);
  }

  async function remove(id: string) {
    if (signedIn) await removeMutation.mutateAsync(id);
    else guest.remove(id);
  }

  return {
    cart,
    ready: signedIn !== null && (!signedIn || server.isSuccess),
    add,
    setQuantity,
    remove,
  };
}

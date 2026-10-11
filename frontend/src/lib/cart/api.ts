import { ApiError, authFetch } from "@/lib/auth/api";
import type { AddToCart, CartData } from "./types";

async function parse(res: Response): Promise<CartData> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as CartData;
}

export async function fetchServerCart(): Promise<CartData> {
  return parse(await authFetch("/api/v1/cart/"));
}

export async function addToServerCart(input: AddToCart): Promise<CartData> {
  const body =
    "product" in input
      ? {
          product: input.product.id,
          size: input.size,
          color: input.color,
          quantity: input.quantity ?? 1,
        }
      : { saved_design: input.design.id, size: input.size, quantity: input.quantity ?? 1 };
  return parse(
    await authFetch("/api/v1/cart/items/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function setServerQuantity(id: string, quantity: number) {
  return parse(
    await authFetch(`/api/v1/cart/items/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  );
}

export async function removeServerLine(id: string) {
  return parse(await authFetch(`/api/v1/cart/items/${id}/`, { method: "DELETE" }));
}

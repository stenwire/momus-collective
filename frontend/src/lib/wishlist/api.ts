import { ApiError, authFetch } from "@/lib/auth/api";

export type WishlistEntry = {
  product: {
    id: string;
    slug: string;
    slogan: string;
    price: number;
    image: string | null;
    shirt_colors: string[];
    available: boolean;
  };
  added_at: string;
};

async function call(path: string, init: RequestInit = {}): Promise<WishlistEntry[]> {
  const res = await authFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as WishlistEntry[];
}

export const fetchWishlist = () => call("/api/v1/wishlist/");

export const addToWishlist = (productId: string) =>
  call("/api/v1/wishlist/", { method: "POST", body: JSON.stringify({ product: productId }) });

export const removeFromWishlist = (productId: string) =>
  call(`/api/v1/wishlist/${productId}/`, { method: "DELETE" });

export const moveToCart = (productId: string, size: string, color: string) =>
  call(`/api/v1/wishlist/${productId}/move-to-cart/`, {
    method: "POST",
    body: JSON.stringify({ size, color }),
  });

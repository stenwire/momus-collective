import { ApiError, authFetch } from "@/lib/auth/api";
import type { GuestLine } from "@/lib/cart/guest-store";
import type { CheckoutOptions, DeliveryInfo, Quote, SavedAddress } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchCheckoutOptions(): Promise<CheckoutOptions> {
  const res = await fetch(`${API_URL}/api/v1/checkout/options/`);
  if (!res.ok) throw new ApiError(res.status, {});
  return res.json();
}

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const res = await authFetch("/api/v1/addresses/");
  const body = await res.json().catch(() => []);
  if (!res.ok) throw new ApiError(res.status, body);
  // Default address first (FR-USR-06).
  return [...(body as SavedAddress[])].sort((a, b) => Number(b.is_default) - Number(a.is_default));
}

export type SavedAddressInput = Omit<SavedAddress, "id" | "created_at">;

export async function saveAddress(id: string | null, body: SavedAddressInput): Promise<SavedAddress> {
  const res = await authFetch(id ? `/api/v1/addresses/${id}/` : "/api/v1/addresses/", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as SavedAddress;
}

export async function deleteAddress(id: string): Promise<void> {
  const res = await authFetch(`/api/v1/addresses/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
}

export async function setDefaultAddress(id: string): Promise<SavedAddress> {
  const res = await authFetch(`/api/v1/addresses/${id}/set_default/`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as SavedAddress;
}

// Identifiers and choices only: the server prices everything (SEC-06).
export function guestItems(lines: GuestLine[]) {
  return lines.map((l) => ({
    product: l.product.id,
    size: l.size,
    color: l.color,
    quantity: l.quantity,
  }));
}

export async function fetchQuote(body: Record<string, unknown>): Promise<Quote> {
  const res = await authFetch("/api/v1/checkout/quote/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as Quote;
}

export async function fetchDeliveryInfo(): Promise<DeliveryInfo> {
  const res = await fetch(`${API_URL}/api/v1/checkout/delivery/`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, {});
  return res.json();
}

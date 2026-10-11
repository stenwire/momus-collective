import { ApiError, authFetch } from "@/lib/auth/api";
import type { CheckoutOptions, SavedAddress } from "./types";

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

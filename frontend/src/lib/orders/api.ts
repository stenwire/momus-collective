import { ApiError, authFetch } from "@/lib/auth/api";
import type { Order } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchTrackedOrder(token: string): Promise<Order | null> {
  const res = await fetch(
    `${API_URL}/api/v1/orders/track/${encodeURIComponent(token)}/`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
  return res.json();
}

export type OrderPage = { count: number; next: string | null; results: Order[] };

export async function fetchOrderHistory(page: number): Promise<OrderPage> {
  const res = await authFetch(`/api/v1/orders/?page=${page}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as OrderPage;
}

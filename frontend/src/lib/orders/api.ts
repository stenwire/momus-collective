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

import { ApiError, authFetch } from "@/lib/auth/api";
import type { OrderStatus } from "@/lib/orders/types";

export type AdminCard = {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  customer: string;
  item_count: number;
  has_custom: boolean;
  total: number;
};

export type BoardColumn = { status: OrderStatus; label: string; count: number; orders: AdminCard[] };

export async function adminCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const fetchBoard = () =>
  adminCall<{ columns: BoardColumn[] }>("/api/v1/admin/orders/board/");

export const moveOrder = (id: string, status: OrderStatus) =>
  adminCall<AdminCard>(`/api/v1/admin/orders/${id}/status/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export type AdminRow = AdminCard & { status_label: string };
export type OrderListPage = { count: number; next: string | null; results: AdminRow[] };
export type OrderListQuery = { status: string; search: string; ordering: string; page: number };

export function fetchOrderList({ status, search, ordering, page }: OrderListQuery) {
  const params = new URLSearchParams({ ordering, page: String(page) });
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  return adminCall<OrderListPage>(`/api/v1/admin/orders/?${params}`);
}

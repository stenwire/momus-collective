import { ApiError, authFetch } from "@/lib/auth/api";
import type { OrderItem, OrderStatus } from "@/lib/orders/types";

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

export type AdminOrderDetail = {
  id: string;
  order_number: string;
  status: OrderStatus;
  status_label: string;
  created_at: string;
  paid_at: string | null;
  customer: { name: string; phone: string; email: string; has_account: boolean };
  shipping_address: Record<string, string>;
  items: (OrderItem & { design_file_url: string | null })[];
  payment: {
    reference: string;
    subtotal: number;
    delivery_fee: number;
    discount: number;
    promo_code: string | null;
    total: number;
    payment_fee: number;
    amount_paid: number;
  };
  status_history: { status: OrderStatus; label: string; timestamp: string; by?: string; note?: string }[];
  notes: string;
  tracking_url: string;
};

export const fetchAdminOrder = (id: string) => adminCall<AdminOrderDetail>(`/api/v1/admin/orders/${id}/`);

export const saveOrderNotes = (id: string, notes: string) =>
  adminCall<AdminOrderDetail>(`/api/v1/admin/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });

export type ModerationEntry = {
  id: string;
  order_number: string;
  created_at: string;
  customer: string;
  designs: (OrderItem & { design_file_url: string | null })[];
  rejection: {
    reason: string;
    reason_label: string;
    details: string;
    rejected_at: string;
    customer_choice: "" | "refund";
  } | null;
};

export type ModerationQueueData = {
  count: number;
  orders: ModerationEntry[];
  waiting: ModerationEntry[];
  reasons: { key: string; label: string }[];
};

export const fetchModerationQueue = () => adminCall<ModerationQueueData>("/api/v1/admin/moderation/");

export const rejectDesign = (id: string, reason: string, details: string) =>
  adminCall<{ id: string; status: OrderStatus }>(`/api/v1/admin/moderation/${id}/reject/`, {
    method: "POST",
    body: JSON.stringify({ reason, details }),
  });

export const markRefunded = (id: string) =>
  adminCall<{ id: string; status: OrderStatus }>(`/api/v1/admin/moderation/${id}/refunded/`, { method: "POST" });

export const approveDesign = (id: string) =>
  adminCall<{ id: string; status: OrderStatus }>(`/api/v1/admin/moderation/${id}/approve/`, { method: "POST" });

export type Analytics = {
  revenue: { today: number; week: number; month: number; all_time: number };
  average_order_value: number;
  orders_by_status: { status: OrderStatus; label: string; count: number }[];
  top_products: { id: string; slug: string; slogan: string; quantity: number; orders: number }[];
  categories: { name: string; orders: number; quantity: number }[];
  custom_vs_catalog: { custom: number; catalog: number };
  trend: { date: string; revenue: number; orders: number }[];
};

export const fetchAnalytics = () => adminCall<Analytics>("/api/v1/admin/analytics/");

export type PromoCode = {
  id: string;
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  max_uses_per_user: number;
  expires_at: string | null;
  is_active: boolean;
  uses_count: number;
  redemptions: number;
  total_discount: number;
  remaining_uses: number | null;
  created_at: string;
};

export type PromoInput = Omit<
  PromoCode,
  "id" | "uses_count" | "redemptions" | "total_discount" | "remaining_uses" | "created_at"
>;

export const fetchPromoCodes = () => adminCall<PromoCode[]>("/api/v1/admin/promo-codes/");

export const savePromoCode = (id: string | null, body: Partial<PromoInput>) =>
  adminCall<PromoCode>(id ? `/api/v1/admin/promo-codes/${id}/` : "/api/v1/admin/promo-codes/", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(body),
  });

export async function deletePromoCode(id: string): Promise<void> {
  const res = await authFetch(`/api/v1/admin/promo-codes/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
}

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  joined_at: string;
};

export type CustomerDetail = CustomerRow & {
  notification_pref: "email" | "whatsapp" | "both";
  is_verified: boolean;
  orders: AdminRow[];
};

export function fetchCustomers({ search, ordering, page }: { search: string; ordering: string; page: number }) {
  const params = new URLSearchParams({ ordering, page: String(page) });
  if (search) params.set("search", search);
  return adminCall<{ count: number; next: string | null; results: CustomerRow[] }>(`/api/v1/admin/customers/?${params}`);
}

export const fetchCustomer = (id: string) => adminCall<CustomerDetail>(`/api/v1/admin/customers/${id}/`);

export type AdminReview = {
  id: string;
  product: { slug: string; slogan: string };
  order_number: string;
  rating: number;
  text: string;
  reviewer: string;
  is_visible: boolean;
  is_flagged: boolean;
  hidden_reason: string;
  hidden_reason_label: string;
  created_at: string;
};

export type AdminReviewPage = {
  count: number;
  next: string | null;
  results: AdminReview[];
  reasons: { key: string; label: string }[];
};

export function fetchAdminReviews({ show, search, page }: { show: string; search: string; page: number }) {
  const params = new URLSearchParams({ show, page: String(page) });
  if (search) params.set("search", search);
  return adminCall<AdminReviewPage>(`/api/v1/admin/reviews/?${params}`);
}

export const moderateReview = (
  id: string,
  body: { is_flagged?: boolean; is_visible?: boolean; hidden_reason?: string },
) => adminCall<AdminReview>(`/api/v1/admin/reviews/${id}/`, { method: "PATCH", body: JSON.stringify(body) });

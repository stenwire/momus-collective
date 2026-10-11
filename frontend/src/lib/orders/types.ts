import type { DesignConfig } from "@/lib/design/types";

export type OrderStatus =
  | "paid"
  | "moderation"
  | "shirt_acquired"
  | "printed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderItem = {
  id: string;
  kind: "product" | "design";
  slogan_text: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product: { slug: string; image: string | null } | null;
  design_config: DesignConfig | null;
};

export type Order = {
  order_number: string;
  status: OrderStatus;
  status_label: string;
  status_history: { status: OrderStatus; label: string; timestamp: string }[];
  // The customer's progress steps, in order, and where this order is in
  // them (null once cancelled or refunded).
  pipeline: { status: OrderStatus; label: string }[];
  pipeline_step: number | null;
  created_at: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  estimated_delivery: { earliest: string; latest: string };
  tracking_url: string;
  shipping_address?: Record<string, string>;
  design_review?: { reason_label: string; details: string; customer_choice: "" | "refund" };
};

const day = new Intl.DateTimeFormat("en-NG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDeliveryWindow({ earliest, latest }: Order["estimated_delivery"]) {
  const from = day.format(new Date(`${earliest}T00:00:00Z`));
  const to = day.format(new Date(`${latest}T00:00:00Z`));
  return from === to ? from : `${from} – ${to}`;
}

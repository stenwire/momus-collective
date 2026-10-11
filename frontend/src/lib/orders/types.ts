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
  created_at: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  estimated_delivery: { earliest: string; latest: string };
  tracking_url: string;
  shipping_address?: Record<string, string>;
};

// Moderation is a design order's review before the shirt is bought, so the
// customer sees it as part of "Paid".
export const PIPELINE: { status: OrderStatus; label: string }[] = [
  { status: "paid", label: "Paid" },
  { status: "shirt_acquired", label: "Shirt acquired" },
  { status: "printed", label: "Printed" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

export function pipelineIndex(status: OrderStatus): number {
  if (status === "moderation") return 0;
  return PIPELINE.findIndex((step) => step.status === status);
}

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

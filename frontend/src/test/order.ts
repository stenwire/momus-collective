import type { Order } from "@/lib/orders/types";

export const order: Order = {
  order_number: "MOM-20261011-001",
  status: "paid",
  status_label: "Paid",
  status_history: [{ status: "paid", label: "Paid", timestamp: "2026-10-11T10:00:00+00:00" }],
  pipeline: [
    { status: "paid", label: "Paid" },
    { status: "shirt_acquired", label: "Shirt Acquired" },
    { status: "printed", label: "Printed" },
    { status: "out_for_delivery", label: "Out for Delivery" },
    { status: "delivered", label: "Delivered" },
  ],
  pipeline_step: 0,
  created_at: "2026-10-11T10:00:00+00:00",
  items: [
    {
      id: "i1",
      kind: "product",
      slogan_text: "war bad naps good",
      size: "S",
      color: "",
      quantity: 2,
      unit_price: 1200000,
      line_total: 2400000,
      product: { slug: "war-bad-naps-good", image: null },
      design_config: null,
    },
  ],
  subtotal: 2400000,
  delivery_fee: 0,
  discount: 240000,
  total: 2160000,
  payment_fee: 0,
  amount_paid: 2160000,
  estimated_delivery: { earliest: "2026-10-12", latest: "2026-10-14" },
  tracking_url: "http://localhost:3000/track/tok",
};

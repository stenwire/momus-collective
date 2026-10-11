"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { fetchDesignOptions } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import {
  formatDeliveryWindow,
  type Order,
  type OrderItem,
  PIPELINE,
  pipelineIndex,
} from "@/lib/orders/types";
import { ShirtCanvas } from "../design/shirt-canvas";

export function Thumbnail({ item, size = "size-16" }: { item: OrderItem; size?: string }) {
  const { data: options } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
    enabled: item.design_config !== null,
  });
  const box = `relative ${size} shrink-0 overflow-hidden rounded-md bg-zinc-900`;
  if (item.design_config) {
    return (
      <div className={box}>
        {options ? (
          <ShirtCanvas
            config={item.design_config}
            options={options}
            label={`Custom design preview: ${item.design_config.text}`}
          />
        ) : null}
      </div>
    );
  }
  return (
    <div className={box}>
      {item.product?.image ? (
        <Image src={item.product.image} alt={item.slogan_text} fill sizes="64px" className="object-cover" />
      ) : null}
    </div>
  );
}

export function OrderProgress({ order }: { order: Order }) {
  const current = pipelineIndex(order.status);
  if (current < 0) {
    return <p className="text-sm text-zinc-300">This order was {order.status_label.toLowerCase()}.</p>;
  }
  return (
    <ol aria-label="Order progress" className="flex flex-col gap-2">
      {PIPELINE.map((step, i) => (
        <li
          key={step.status}
          aria-current={i === current ? "step" : undefined}
          className={`flex items-center gap-3 text-sm ${i <= current ? "text-zinc-50" : "text-zinc-500"}`}
        >
          <span
            aria-hidden
            className={`size-3 rounded-full ${i <= current ? "bg-zinc-50" : "border border-zinc-600"}`}
          />
          {step.label}
          {i === current && order.status === "moderation" ? (
            <span className="text-zinc-400">: your design is being reviewed</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function OrderItems({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <Thumbnail item={item} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">
                {item.kind === "design" ? "Custom Design" : item.slogan_text}
              </p>
              {item.kind === "design" ? (
                <p className="truncate text-xs text-zinc-400">“{item.slogan_text}”</p>
              ) : null}
              <p className="text-xs text-zinc-400">
                {[item.size, item.color].filter(Boolean).join(" · ")} · Qty {item.quantity}
              </p>
            </div>
            <p className="text-sm text-zinc-100">{formatNaira(item.line_total)}</p>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-y-1 border-t border-zinc-800 pt-3 text-sm text-zinc-300">
        <dt>Subtotal</dt>
        <dd className="text-right">{formatNaira(order.subtotal)}</dd>
        <dt>Delivery</dt>
        <dd className="text-right">{order.delivery_fee ? formatNaira(order.delivery_fee) : "Free"}</dd>
        {order.discount ? (
          <>
            <dt>Discount</dt>
            <dd className="text-right">−{formatNaira(order.discount)}</dd>
          </>
        ) : null}
        <dt className="font-semibold text-zinc-50">Total</dt>
        <dd className="text-right font-semibold text-zinc-50">{formatNaira(order.total)}</dd>
      </dl>
    </div>
  );
}

export function EstimatedDelivery({ order }: { order: Order }) {
  if (["delivered", "cancelled", "refunded"].includes(order.status)) return null;
  return (
    <p className="text-sm text-zinc-300">
      Estimated delivery: <span className="text-zinc-50">{formatDeliveryWindow(order.estimated_delivery)}</span>
    </p>
  );
}

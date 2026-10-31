"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { fetchDesignOptions } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { formatDeliveryWindow, type Order, type OrderItem } from "@/lib/orders/types";
import { ShirtCanvas } from "../design/shirt-canvas";

export function Thumbnail({ item, size = "size-16" }: { item: OrderItem; size?: string }) {
  const { data: options } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
    enabled: item.design_config !== null,
  });
  const box = `relative ${size} shrink-0 overflow-hidden  bg-ink-raised`;
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
  const current = order.pipeline_step;
  if (current === null) {
    return <p className="text-sm text-bone-muted">This order was {order.status_label.toLowerCase()}.</p>;
  }
  return (
    <ol aria-label="Order progress" className="grid gap-3 md:grid-cols-5">
      {order.pipeline.map((step, i) => (
        <li
          key={step.status}
          aria-current={i === current ? "step" : undefined}
          className={`flex flex-wrap content-start items-center gap-x-2 gap-y-2 text-sm ${i <= current ? "text-bone" : "text-bone-muted"}`}
        >
          {/* Bars fill in order up to the current step. The number is drawn
              from data-step so the item's text stays just its label. */}
          <span aria-hidden className="relative h-1 basis-full overflow-hidden bg-rule">
            {i <= current ? (
              <span
                data-testid="step-fill"
                className="absolute inset-0 origin-left animate-fill bg-laurel"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ) : null}
          </span>
          <span
            aria-hidden
            data-step={String(i + 1).padStart(2, "0")}
            className="font-mono text-xs text-bone-muted before:content-[attr(data-step)]"
          />
          {i === current ? (
            <span aria-hidden className="size-2 animate-pulse bg-laurel motion-reduce:animate-none" />
          ) : null}
          {step.label}
          {i === current && order.status === "moderation" ? (
            <span className="text-bone-muted">: your design is being reviewed</span>
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
              <p className="truncate text-sm font-medium text-bone">
                {item.kind === "design" ? "Custom Design" : item.slogan_text}
              </p>
              {item.kind === "design" ? (
                <p className="truncate text-xs text-bone-muted">“{item.slogan_text}”</p>
              ) : null}
              <p className="text-xs text-bone-muted">
                {[item.size, item.color].filter(Boolean).join(" · ")} · Qty {item.quantity}
              </p>
            </div>
            <p className="text-sm text-bone">{formatNaira(item.line_total)}</p>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-y-1 border-t border-rule pt-3 text-sm text-bone-muted">
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
        <dt className="font-semibold text-bone">Total</dt>
        <dd className="text-right font-semibold text-bone">{formatNaira(order.total)}</dd>
        {order.payment_fee ? (
          <>
            <dt>Paystack fee</dt>
            <dd className="text-right">{formatNaira(order.payment_fee)}</dd>
            <dt className="font-semibold text-bone">Total paid</dt>
            <dd className="text-right font-semibold text-bone">{formatNaira(order.amount_paid)}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

export function EstimatedDelivery({ order }: { order: Order }) {
  if (["delivered", "cancelled", "refunded"].includes(order.status)) return null;
  return (
    <p className="text-sm text-bone-muted">
      Estimated delivery: <span className="text-bone">{formatDeliveryWindow(order.estimated_delivery)}</span>
    </p>
  );
}

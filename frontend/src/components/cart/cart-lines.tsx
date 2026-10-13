"use client";

import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { Raven } from "@/components/brand/raven";
import { haptic } from "@/lib/haptics";
import { duration, exitDuration, spring } from "@/lib/motion";
import { fetchDesignOptions } from "@/lib/api";
import { fetchDeliveryInfo } from "@/lib/checkout/api";
import { type CartData, type CartLine, MAX_LINE_QUANTITY } from "@/lib/cart/types";
import { formatNaira } from "@/lib/format";
import { ShirtCanvas } from "../design/shirt-canvas";

const STEP =
  "flex size-11 items-center justify-center border border-rule text-bone transition-colors duration-150 hover:border-bone-muted active:bg-bone/10 disabled:opacity-40 motion-reduce:transition-none";

function Thumbnail({ line }: { line: CartLine }) {
  const { data: options } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
    enabled: line.kind === "design",
  });
  const box = "relative size-20 shrink-0 overflow-hidden border border-rule bg-ink";
  if (line.design) {
    return (
      <div className={box}>
        {options ? (
          <ShirtCanvas
            config={line.design.config}
            options={options}
            label={`Custom design preview: ${line.design.config.text}`}
          />
        ) : null}
      </div>
    );
  }
  return (
    <div className={box}>
      {line.product?.image ? (
        <Image src={line.product.image} alt={line.product.slogan} fill sizes="80px" className="object-cover" />
      ) : null}
    </div>
  );
}

export function CartLines({
  cart,
  onQuantity,
  onRemove,
  showTotals = true,
}: {
  cart: CartData;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  showTotals?: boolean;
}) {
  const delivery = useQuery({
    queryKey: ["delivery-info"],
    queryFn: fetchDeliveryInfo,
    enabled: showTotals,
  });
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Raven className="w-24" sizes="96px" />
        <p className="font-display text-2xl uppercase tracking-tight">Your bag is empty.</p>
        <p className="text-sm text-bone-muted">Even the gods travel light. Not you, though.</p>
      </div>
    );
  }
  // FR-CART-02's estimate: the cheapest band until checkout knows the address.
  const threshold = delivery.data?.free_delivery_threshold ?? null;
  const freeDelivery = threshold !== null && cart.subtotal >= threshold;
  const cheapest = delivery.data ? Math.min(...Object.values(delivery.data.fees)) : null;
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
        {cart.items.map((line) => {
          const title = line.design ? "Custom Design" : (line.product?.slogan ?? "");
          return (
            <m.li
              key={line.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: spring.settle }}
              exit={{ opacity: 0, x: 48, transition: { duration: exitDuration(duration.short) } }}
              className="flex gap-3 border-b border-rule pb-4"
            >
              <Thumbnail line={line} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate font-semibold text-bone">{title}</p>
                {line.design ? (
                  <p className="truncate text-xs text-bone-muted">“{line.design.config.text}”</p>
                ) : null}
                <p className="font-mono text-xs uppercase tracking-widest text-bone-muted">
                  Size {line.size}
                  {line.color ? ` · ${line.color}` : ""}
                </p>
                {line.available === false ? (
                  <p className="text-sm font-medium text-error">
                    No longer available — remove to check out
                  </p>
                ) : (
                  <p className="font-mono text-sm font-bold tabular-nums text-laurel">{formatNaira(line.unit_price)}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className={STEP}
                    aria-label={`Decrease quantity of ${title}`}
                    disabled={line.quantity <= 1}
                    onClick={() => onQuantity(line.id, line.quantity - 1)}
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                  <span aria-label={`Quantity of ${title}`} className="w-6 text-center font-mono tabular-nums text-bone">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className={STEP}
                    aria-label={`Increase quantity of ${title}`}
                    disabled={line.quantity >= MAX_LINE_QUANTITY || line.available === false}
                    onClick={() => {
                      // Reaching the per-line cap is worth a nudge (D-082).
                      if (line.quantity + 1 === MAX_LINE_QUANTITY) haptic("warning");
                      onQuantity(line.id, line.quantity + 1);
                    }}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="ml-auto min-h-11 px-2 font-mono text-xs uppercase tracking-widest text-bone-muted underline underline-offset-4 hover:text-error"
                    aria-label={`Remove ${title}`}
                    onClick={() => onRemove(line.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </m.li>
          );
        })}
        </AnimatePresence>
      </ul>
      {showTotals ? (
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-bone-muted">Subtotal</dt>
        <dd className="text-right font-mono tabular-nums text-bone">{formatNaira(cart.subtotal)}</dd>
        <dt className="text-bone-muted">Delivery (estimate)</dt>
        <dd className="text-right text-bone-muted">
          {freeDelivery
            ? "Free"
            : cheapest !== null
              ? `From ${formatNaira(cheapest)}`
              : "Calculated at checkout"}
        </dd>
        {!freeDelivery && threshold !== null ? (
          <dd className="col-span-2 text-xs text-bone-muted">
            Free delivery on orders over {formatNaira(threshold)}.
          </dd>
        ) : null}
        <dt className="font-semibold text-bone">
          Total{freeDelivery ? "" : " before delivery"}
        </dt>
        <dd className="text-right font-mono font-bold tabular-nums text-laurel">{formatNaira(cart.subtotal)}</dd>
      </dl>
      ) : null}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { fetchDesignOptions } from "@/lib/api";
import { type CartData, type CartLine, MAX_LINE_QUANTITY } from "@/lib/cart/types";
import { formatNaira } from "@/lib/format";
import { ShirtCanvas } from "../design/shirt-canvas";

const STEP =
  "flex size-11 items-center justify-center rounded-md border border-zinc-700 text-lg text-zinc-100 hover:border-zinc-500 disabled:opacity-40";

function Thumbnail({ line }: { line: CartLine }) {
  const { data: options } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
    enabled: line.kind === "design",
  });
  const box = "relative size-20 shrink-0 overflow-hidden rounded-md bg-zinc-900";
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
}: {
  cart: CartData;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  if (cart.items.length === 0) {
    return <p className="text-sm text-zinc-400">Your bag is empty.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {cart.items.map((line) => {
          const title = line.design ? "Custom Design" : (line.product?.slogan ?? "");
          return (
            <li key={line.id} className="flex gap-3 border-b border-zinc-800 pb-4">
              <Thumbnail line={line} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate font-medium text-zinc-50">{title}</p>
                {line.design ? (
                  <p className="truncate text-xs text-zinc-400">“{line.design.config.text}”</p>
                ) : null}
                <p className="text-xs text-zinc-400">
                  Size {line.size}
                  {line.color ? ` · ${line.color}` : ""}
                </p>
                <p className="text-sm text-amber-400">{formatNaira(line.unit_price)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className={STEP}
                    aria-label={`Decrease quantity of ${title}`}
                    disabled={line.quantity <= 1}
                    onClick={() => onQuantity(line.id, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span aria-label={`Quantity of ${title}`} className="w-6 text-center text-zinc-50">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className={STEP}
                    aria-label={`Increase quantity of ${title}`}
                    disabled={line.quantity >= MAX_LINE_QUANTITY}
                    onClick={() => onQuantity(line.id, line.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-auto min-h-11 px-2 text-sm text-zinc-400 underline hover:text-zinc-100"
                    aria-label={`Remove ${title}`}
                    onClick={() => onRemove(line.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-400">Subtotal</dt>
        <dd className="text-right text-zinc-50">{formatNaira(cart.subtotal)}</dd>
        <dt className="text-zinc-400">Delivery</dt>
        <dd className="text-right text-zinc-400">Calculated at checkout</dd>
        <dt className="font-semibold text-zinc-50">Total</dt>
        <dd className="text-right font-semibold text-amber-400">{formatNaira(cart.subtotal)}</dd>
      </dl>
    </div>
  );
}

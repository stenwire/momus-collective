"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { formatNaira } from "@/lib/format";
import { fetchOrderHistory } from "@/lib/orders/api";
import type { Order } from "@/lib/orders/types";
import { EstimatedDelivery, OrderItems, OrderProgress, Thumbnail } from "./order-summary";
import { EmptyState } from "@/components/ui/empty-state";

const placed = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

function Address({ address }: { address: Record<string, string> }) {
  const lines = [
    address.full_name,
    address.address_line_1,
    address.address_line_2,
    [address.city, address.lga, address.state].filter(Boolean).join(", "),
    address.phone,
  ].filter(Boolean);
  return (
    <address className="text-sm not-italic text-bone-muted">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </address>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const count = order.items.reduce((n, item) => n + item.quantity, 0);
  return (
    <li className="flex flex-col gap-4 border border-rule p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold text-bone">{order.order_number}</h2>
        <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-bone">
          {order.status_label}
        </span>
      </div>
      <p className="text-sm text-bone-muted">
        {placed.format(new Date(order.created_at))} · {count} {count === 1 ? "item" : "items"} ·{" "}
        <span className="text-bone">{formatNaira(order.total)}</span>
      </p>
      <ul aria-label="Items" className="flex gap-2">
        {order.items.slice(0, 4).map((item) => (
          <li key={item.id}>
            <Thumbnail item={item} size="size-12" />
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`${open ? "Hide" : "Show"} details for ${order.order_number}`}
        onClick={() => setOpen(!open)}
        className="min-h-11 self-start border border-rule px-4 text-sm text-bone hover:border-bone-muted"
      >
        {open ? "Hide details" : "Show details"}
      </button>
      {open ? (
        <div id={detailsId} className="flex flex-col gap-5 border-t border-rule pt-4">
          <EstimatedDelivery order={order} />
          <OrderProgress order={order} />
          <OrderItems order={order} />
          {order.shipping_address ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-bone">Shipping to</h3>
              <Address address={order.shipping_address} />
            </div>
          ) : null}
          <Link
            href={new URL(order.tracking_url).pathname}
            className="inline-flex min-h-11 items-center text-sm text-laurel underline"
          >
            Tracking page for {order.order_number}
          </Link>
        </div>
      ) : null}
    </li>
  );
}

// FR-USR-03: every order, newest first, each expanding to its full detail.
export function OrderHistory() {
  const signedIn = useSignedIn();
  const router = useRouter();
  const orders = useInfiniteQuery({
    queryKey: ["order-history"],
    queryFn: ({ pageParam }) => fetchOrderHistory(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    enabled: signedIn === true,
  });

  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (signedIn) wasSignedIn.current = true;
    if (signedIn === false && !wasSignedIn.current) {
      router.replace("/login?next=/account/orders");
    }
  }, [signedIn, router]);

  if (!signedIn) return null;
  if (orders.isError) {
    return <p className="text-bone-muted">Your orders could not load. Refresh to try again.</p>;
  }
  if (!orders.data) return <p className="text-bone-muted">Loading your orders…</p>;
  const all = orders.data.pages.flatMap((page) => page.results);
  if (all.length === 0) {
    return (
      <EmptyState title="Nothing ordered">
        No orders yet.{" "}
        <Link href="/shop" className="inline-flex min-h-11 items-center text-laurel underline">
          Find something to wear
        </Link>
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {all.map((order) => (
          <OrderCard key={order.order_number} order={order} />
        ))}
      </ul>
      {orders.hasNextPage ? (
        <button
          type="button"
          disabled={orders.isFetchingNextPage}
          onClick={() => orders.fetchNextPage()}
          className="min-h-11 border border-rule px-4 text-sm text-bone hover:border-bone-muted disabled:opacity-60"
        >
          {orders.isFetchingNextPage ? "Loading…" : "Show older orders"}
        </button>
      ) : null}
    </div>
  );
}

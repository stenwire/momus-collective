"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { type AdminOrderDetail, fetchAdminOrder, moveOrder, saveOrderNotes } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { formatNaira } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders/types";
import { Thumbnail } from "../orders/order-summary";

const when = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
      <h2 id={id} className="text-base font-semibold text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusControl({ order }: { order: AdminOrderDetail }) {
  const queryClient = useQueryClient();
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const move = useMutation({
    mutationFn: (status: OrderStatus) => moveOrder(order.id, status),
    onMutate: () => setErrors([]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] }),
    onError: (error) => setErrors(errorMessages(error)),
  });
  if (order.status === "moderation" || order.status === "refunded") {
    return <p className="text-sm text-zinc-300">Status: {order.status_label}</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-zinc-400">
        Status
      </label>
      <select
        id={id}
        value={order.status}
        disabled={move.isPending}
        onChange={(e) => move.mutate(e.target.value as OrderStatus)}
        className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50"
      >
        {order.board_statuses.map((s) => (
          <option key={s.status} value={s.status}>
            {s.label}
          </option>
        ))}
      </select>
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function Notes({ order }: { order: AdminOrderDetail }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(order.notes);
  const [saved, setSaved] = useState("");
  const id = useId();
  const save = useMutation({
    mutationFn: () => saveOrderNotes(order.id, notes),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-order", order.id], data);
      setSaved("Notes saved.");
    },
    onError: (error) => setSaved(errorMessages(error).join(" ")),
  });
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs text-zinc-400">
        Only staff see these.
      </label>
      <textarea
        id={id}
        value={notes}
        maxLength={2000}
        rows={4}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved("");
        }}
        className="rounded-md border border-zinc-700 bg-zinc-950 p-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={save.isPending || notes === order.notes}
          onClick={() => save.mutate()}
          className="min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
        >
          Save notes
        </button>
        <p aria-live="polite" className="text-sm text-zinc-400">
          {saved}
        </p>
      </div>
    </div>
  );
}

// FR-ADM-03: one order in full, with the print files to download.
export function AdminOrderDetailView({ id }: { id: string }) {
  const order = useQuery({ queryKey: ["admin-order", id], queryFn: () => fetchAdminOrder(id) });
  if (order.isError) return <p className="px-4 py-6 text-zinc-400">This order could not load.</p>;
  if (!order.data) return <p className="px-4 py-6 text-zinc-400">Loading order…</p>;
  const o = order.data;
  const a = o.shipping_address;
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center text-sm text-amber-400 underline">
        All orders
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">{o.order_number}</h1>
          <p className="text-sm text-zinc-400">Placed {when.format(new Date(o.created_at))}</p>
        </div>
        <StatusControl key={o.status} order={o} />
      </div>
      <Section title="Customer">
        <p className="text-sm text-zinc-200">
          {o.customer.name} {o.customer.has_account ? null : <span className="text-zinc-400">(guest)</span>}
        </p>
        <p className="text-sm">
          <a href={`tel:${o.customer.phone}`} className="inline-flex min-h-11 items-center text-amber-400 underline">
            {o.customer.phone}
          </a>
        </p>
        <p className="text-sm">
          <a href={`mailto:${o.customer.email}`} className="inline-flex min-h-11 items-center break-all text-amber-400 underline">
            {o.customer.email}
          </a>
        </p>
      </Section>
      <Section title="Ship to">
        <address className="text-sm not-italic text-zinc-200">
          {[a.full_name, a.address_line_1, a.address_line_2, [a.city, a.lga, a.state].filter(Boolean).join(", ")]
            .filter(Boolean)
            .map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
        </address>
        {a.notes ? <p className="text-sm text-zinc-300">Delivery notes: {a.notes}</p> : null}
      </Section>
      <Section title="Items">
        <ul className="flex flex-col gap-3">
          {o.items.map((item) => (
            <li key={item.id} className="flex flex-wrap gap-3">
              <Thumbnail item={item} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">
                  {item.kind === "design" ? `Custom: “${item.slogan_text}”` : item.slogan_text}
                </p>
                <p className="text-xs text-zinc-400">
                  {[item.size, item.color].filter(Boolean).join(" · ")} · Qty {item.quantity} ·{" "}
                  {formatNaira(item.line_total)}
                </p>
                {item.design_file_url ? (
                  <a
                    href={item.design_file_url}
                    className="inline-flex min-h-11 items-center text-sm text-amber-400 underline"
                  >
                    Download print file
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Payment">
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm text-zinc-300">
          <dt>Paystack reference</dt>
          <dd className="break-all text-right font-mono text-zinc-100">{o.payment.reference}</dd>
          <dt>Paid</dt>
          <dd className="text-right">{o.paid_at ? when.format(new Date(o.paid_at)) : "—"}</dd>
          <dt>Subtotal</dt>
          <dd className="text-right">{formatNaira(o.payment.subtotal)}</dd>
          <dt>Delivery</dt>
          <dd className="text-right">{o.payment.delivery_fee ? formatNaira(o.payment.delivery_fee) : "Free"}</dd>
          {o.payment.discount ? (
            <>
              <dt>Discount{o.payment.promo_code ? ` (${o.payment.promo_code})` : ""}</dt>
              <dd className="text-right">−{formatNaira(o.payment.discount)}</dd>
            </>
          ) : null}
          <dt className="font-semibold text-zinc-50">Order total</dt>
          <dd className="text-right font-semibold text-zinc-50">{formatNaira(o.payment.total)}</dd>
          {o.payment.payment_fee ? (
            <>
              <dt>Paystack fee (paid by the customer)</dt>
              <dd className="text-right">{formatNaira(o.payment.payment_fee)}</dd>
              <dt className="font-semibold text-zinc-50">Total paid</dt>
              <dd className="text-right font-semibold text-zinc-50">{formatNaira(o.payment.amount_paid)}</dd>
            </>
          ) : null}
        </dl>
      </Section>
      <Section title="Timeline">
        <ol className="flex flex-col gap-2">
          {o.status_history.map((entry, i) => (
            <li key={`${entry.status}-${i}`} className="text-sm text-zinc-300">
              <span className="font-medium text-zinc-100">{entry.label}</span> ·{" "}
              {when.format(new Date(entry.timestamp))}
              {entry.by ? ` · ${entry.by}` : ""}
              {entry.note ? <span className="block text-zinc-400">{entry.note}</span> : null}
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Internal notes">
        <Notes order={o} />
      </Section>
      <a href={o.tracking_url} className="inline-flex min-h-11 items-center text-sm text-amber-400 underline">
        Customer&apos;s tracking page
      </a>
    </main>
  );
}

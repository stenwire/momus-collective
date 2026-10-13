"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchCustomer } from "@/lib/admin/api";
import { formatNaira } from "@/lib/format";

const when = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const PREFS = { email: "Email", whatsapp: "WhatsApp", both: "Email and WhatsApp" };

export function CustomerDetailView({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["admin-customer", id], queryFn: () => fetchCustomer(id) });
  if (query.isError) return <p className="px-4 py-6 text-zinc-400">This customer could not load.</p>;
  if (!query.data) return <p className="px-4 py-6 text-zinc-400">Loading customer…</p>;
  const c = query.data;
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/admin/customers" className="inline-flex min-h-11 items-center text-sm text-amber-400 underline">
        All customers
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">{c.name || c.email}</h1>
        <p className="text-sm text-zinc-400">
          Customer since {when.format(new Date(c.joined_at))}
          {c.is_verified ? "" : " · email not verified"}
        </p>
      </div>
      <section aria-labelledby="contact" className="flex flex-col gap-1 rounded-lg border border-zinc-800 p-4 text-sm">
        <h2 id="contact" className="text-base font-semibold text-zinc-50">
          Contact
        </h2>
        <a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center break-all text-amber-400 underline">
          {c.email}
        </a>
        <a href={`tel:${c.phone}`} className="inline-flex min-h-11 items-center text-amber-400 underline">
          {c.phone}
        </a>
        <p className="text-zinc-300">Order updates by {PREFS[c.notification_pref]}</p>
      </section>
      <dl className="grid grid-cols-3 gap-3 rounded-lg border border-zinc-800 p-4 text-sm">
        <div>
          <dt className="text-xs text-zinc-400">Orders</dt>
          <dd className="text-lg font-semibold text-zinc-50">{c.order_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Spent</dt>
          <dd className="text-lg font-semibold text-zinc-50">{formatNaira(c.total_spent)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Last order</dt>
          <dd className="text-lg font-semibold text-zinc-50">
            {c.last_order_at ? when.format(new Date(c.last_order_at)) : "—"}
          </dd>
        </div>
      </dl>
      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-lg font-semibold text-zinc-50">
          Order history
        </h2>
        {c.orders.length === 0 ? (
          <p className="text-sm text-zinc-400">No orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 p-3 text-sm">
                <Link href={`/admin/orders/${o.id}`} className="font-medium text-zinc-50 hover:underline">
                  {o.order_number}
                </Link>
                <span className="text-zinc-400">{when.format(new Date(o.created_at))}</span>
                <span className="text-zinc-300">{o.status_label}</span>
                <span className="text-zinc-100">{formatNaira(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

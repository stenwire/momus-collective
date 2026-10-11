"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId } from "react";
import { type Analytics, fetchAnalytics } from "@/lib/admin/api";
import { formatNaira } from "@/lib/format";

const day = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 p-4">
      <h2 id={id} className="text-base font-semibold text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Trend({ trend }: { trend: Analytics["trend"] }) {
  const width = 600;
  const height = 160;
  const max = Math.max(...trend.map((d) => d.revenue), 1);
  const x = (i: number) => (i / (trend.length - 1)) * width;
  const y = (v: number) => height - (v / max) * (height - 8) - 4;
  const points = trend.map((d, i) => `${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(" ");
  const total = trend.reduce((n, d) => n + d.revenue, 0);
  const best = trend.reduce((a, b) => (b.revenue > a.revenue ? b : a), trend[0]);
  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Daily revenue for the last ${trend.length} days: ${formatNaira(total)} in total, highest ${formatNaira(best.revenue)} on ${day.format(asDate(best.date))}.`}
        className="h-40 w-full"
        preserveAspectRatio="none"
      >
        <line x1="0" y1={height - 4} x2={width} y2={height - 4} stroke="#3f3f46" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{day.format(asDate(trend[0].date))}</span>
        <span>Peak {formatNaira(max === 1 ? 0 : max)}</span>
        <span>{day.format(asDate(trend[trend.length - 1].date))}</span>
      </div>
      <details className="text-sm text-zinc-300">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-amber-400">Show the numbers</summary>
        <div className="relative max-h-64 overflow-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Revenue and orders per day</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1">Day</th>
                <th scope="col" className="py-1 text-right">Orders</th>
                <th scope="col" className="py-1 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((d) => (
                <tr key={d.date}>
                  <td className="py-1">{day.format(asDate(d.date))}</td>
                  <td className="py-1 text-right">{d.orders}</td>
                  <td className="py-1 text-right">{formatNaira(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Bar({ label, value, max, detail }: { label: string; value: number; max: number; detail: string }) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-sm text-zinc-200">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-zinc-400">{detail}</span>
      </div>
      <div aria-hidden className="h-2 rounded-full bg-zinc-800">
        <div className="h-2 rounded-full bg-amber-400" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </li>
  );
}

// FR-ADM-08: revenue, order mix and the 30-day trend at a glance.
export function AnalyticsDashboard() {
  const query = useQuery({ queryKey: ["admin-analytics"], queryFn: fetchAnalytics });
  if (query.isError) return <p className="text-zinc-400">Analytics could not load. Refresh to try again.</p>;
  if (!query.data) return <p className="text-zinc-400">Loading analytics…</p>;
  const a = query.data;
  const mixTotal = a.custom_vs_catalog.custom + a.custom_vs_catalog.catalog;
  const customShare = mixTotal ? Math.round((a.custom_vs_catalog.custom / mixTotal) * 100) : 0;
  const maxCategory = Math.max(0, ...a.categories.map((c) => c.orders));
  const maxStatus = Math.max(0, ...a.orders_by_status.map((s) => s.count));

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <Card title="Revenue">
        <dl className="grid grid-cols-2 gap-3">
          {(
            [
              ["Today", a.revenue.today],
              ["This week", a.revenue.week],
              ["This month", a.revenue.month],
              ["All time", a.revenue.all_time],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs text-zinc-400">{label}</dt>
              <dd className="text-lg font-semibold text-zinc-50">{formatNaira(value)}</dd>
            </div>
          ))}
          <div className="col-span-2 flex flex-col">
            <dt className="text-xs text-zinc-400">Average order value</dt>
            <dd className="text-lg font-semibold text-zinc-50">{formatNaira(a.average_order_value)}</dd>
          </div>
        </dl>
        <p className="text-xs text-zinc-500">Order totals of paid orders, excluding cancelled and refunded ones.</p>
      </Card>
      <Card title="Revenue, last 30 days">
        <Trend trend={a.trend} />
      </Card>
      <Card title="Orders by status">
        <ul className="flex flex-col gap-2">
          {a.orders_by_status.map((s) => (
            <Bar key={s.status} label={s.label} value={s.count} max={maxStatus} detail={String(s.count)} />
          ))}
        </ul>
      </Card>
      <Card title="Custom vs catalog">
        <p className="text-sm text-zinc-200">
          {a.custom_vs_catalog.custom} custom · {a.custom_vs_catalog.catalog} catalog
          {mixTotal ? ` (${customShare}% custom)` : ""}
        </p>
        <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-zinc-800">
          <div className="bg-amber-400" style={{ width: `${customShare}%` }} />
        </div>
      </Card>
      <Card title="Top 10 products">
        {a.top_products.length === 0 ? (
          <p className="text-sm text-zinc-400">No catalog sales yet.</p>
        ) : (
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-zinc-200">
            {a.top_products.map((p) => (
              <li key={p.id}>
                <Link href={`/product/${p.slug}`} className="hover:underline">
                  {p.slogan}
                </Link>{" "}
                <span className="text-zinc-400">
                  · {p.quantity} sold in {p.orders} {p.orders === 1 ? "order" : "orders"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card title="Orders by category">
        {a.categories.length === 0 ? (
          <p className="text-sm text-zinc-400">No catalog sales yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {a.categories.map((c) => (
              <Bar
                key={c.name}
                label={c.name}
                value={c.orders}
                max={maxCategory}
                detail={`${c.orders} ${c.orders === 1 ? "order" : "orders"} · ${c.quantity} shirts`}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

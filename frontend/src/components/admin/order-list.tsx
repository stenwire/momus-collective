"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { fetchOrderList } from "@/lib/admin/api";
import { formatNaira } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const placed = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
const FIELD =
  "min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none";

function SortHeader({
  field,
  label,
  ordering,
  onSort,
  align = "left",
}: {
  field: string;
  label: string;
  ordering: string;
  onSort: (ordering: string) => void;
  align?: "left" | "right";
}) {
  const active = ordering.replace("-", "") === field;
  const descending = ordering.startsWith("-");
  return (
    <th
      scope="col"
      aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(active && descending ? field : `-${field}`)}
        className="inline-flex min-h-11 items-center gap-1 text-zinc-300 hover:text-zinc-50"
      >
        {label}
        <span aria-hidden>{active ? (descending ? "↓" : "↑") : "↕"}</span>
      </button>
    </th>
  );
}

// FR-ADM-02: every order in one table, sortable by date, status and amount.
export function OrderList() {
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [ordering, setOrdering] = useState("-date");
  const searchId = useId();
  const statusId = useId();
  const orders = useInfiniteQuery({
    queryKey: ["admin-orders", status, search, ordering],
    queryFn: ({ pageParam }) => fetchOrderList({ status, search, ordering, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const rows = orders.data?.pages.flatMap((p) => p.results) ?? [];
  const count = orders.data?.pages[0]?.count ?? 0;
  const statuses = orders.data?.pages[0]?.statuses ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-4 px-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={searchId} className="text-xs text-zinc-400">
            Search
          </label>
          <input
            id={searchId}
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Order number, name or email"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={statusId} className="text-xs text-zinc-400">
            Status
          </label>
          <select id={statusId} value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s.status} value={s.status}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {orders.isError ? (
        <p className="text-zinc-400">Orders could not load. Refresh to try again.</p>
      ) : !orders.data ? (
        <p className="text-zinc-400">Loading orders…</p>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-zinc-400">
            {count} {count === 1 ? "order" : "orders"}
          </p>
          <div className="relative overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">Orders</caption>
              <thead className="border-b border-zinc-800">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-300">
                    Order
                  </th>
                  <SortHeader field="date" label="Date" ordering={ordering} onSort={setOrdering} />
                  <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-300">
                    Customer
                  </th>
                  <SortHeader field="status" label="Status" ordering={ordering} onSort={setOrdering} />
                  <SortHeader field="amount" label="Amount" ordering={ordering} onSort={setOrdering} align="right" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-900 last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/admin/orders/${row.id}`} className="font-medium text-zinc-50 hover:underline">
                        {row.order_number}
                      </Link>
                      {row.has_custom ? (
                        <span className="ml-2 rounded-full bg-amber-400 px-2 text-xs text-black">Custom</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{placed.format(new Date(row.created_at))}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.customer}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.status_label}</td>
                    <td className="px-3 py-2 text-right text-zinc-100">{formatNaira(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.hasNextPage ? (
            <button
              type="button"
              disabled={orders.isFetchingNextPage}
              onClick={() => orders.fetchNextPage()}
              className="min-h-11 self-start rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
            >
              {orders.isFetchingNextPage ? "Loading…" : "Show more"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

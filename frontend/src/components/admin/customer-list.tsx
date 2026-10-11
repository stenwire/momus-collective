"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { fetchCustomers } from "@/lib/admin/api";
import { formatNaira } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const date = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const SORTS = [
  ["-last_order", "Most recent order"],
  ["-spent", "Most spent"],
  ["-orders", "Most orders"],
  ["name", "Name"],
  ["-joined", "Newest customers"],
];
const FIELD =
  "min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none";

// FR-ADM-10: every registered customer with their order totals.
export function CustomerList() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [ordering, setOrdering] = useState("-last_order");
  const searchId = useId();
  const sortId = useId();
  const query = useInfiniteQuery({
    queryKey: ["admin-customers", search, ordering],
    queryFn: ({ pageParam }) => fetchCustomers({ search, ordering, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];
  const count = query.data?.pages[0]?.count ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
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
            placeholder="Name, email or phone"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={sortId} className="text-xs text-zinc-400">
            Sort by
          </label>
          <select id={sortId} value={ordering} onChange={(e) => setOrdering(e.target.value)} className={FIELD}>
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {query.isError ? (
        <p className="text-zinc-400">Customers could not load. Refresh to try again.</p>
      ) : !query.data ? (
        <p className="text-zinc-400">Loading customers…</p>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-zinc-400">
            {count} {count === 1 ? "customer" : "customers"}
          </p>
          <div className="relative overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">Customers</caption>
              <thead className="border-b border-zinc-800 text-left text-zinc-300">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2 font-medium">Email</th>
                  <th scope="col" className="px-3 py-2 font-medium">Phone</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Orders</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Spent</th>
                  <th scope="col" className="px-3 py-2 font-medium">Last order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-900 last:border-0 text-zinc-300">
                    <td className="px-3 py-2">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-zinc-50 hover:underline">
                        {c.name || c.email}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{c.email}</td>
                    <td className="px-3 py-2">{c.phone}</td>
                    <td className="px-3 py-2 text-right">{c.order_count}</td>
                    <td className="px-3 py-2 text-right text-zinc-100">{formatNaira(c.total_spent)}</td>
                    <td className="px-3 py-2">{c.last_order_at ? date.format(new Date(c.last_order_at)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.hasNextPage ? (
            <button
              type="button"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
              className="min-h-11 self-start rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
            >
              {query.isFetchingNextPage ? "Loading…" : "Show more"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

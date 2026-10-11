"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { type ModerationEntry, approveDesign, fetchModerationQueue } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { Thumbnail } from "../orders/order-summary";

const placed = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
const KEY = ["admin-moderation"];

function Entry({ entry, onDone }: { entry: ModerationEntry; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const approve = useMutation({
    mutationFn: () => approveDesign(entry.id),
    onSuccess: async () => {
      onDone(`Approved ${entry.order_number}; it's now in Shirt Acquired.`);
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-50">
          <Link href={`/admin/orders/${entry.id}`} className="hover:underline">
            {entry.order_number}
          </Link>
        </h2>
        <p className="text-xs text-zinc-400">
          {entry.customer} · {placed.format(new Date(entry.created_at))}
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {entry.designs.map((design) => (
          <li key={design.id} className="flex flex-col gap-2 sm:flex-row">
            <Thumbnail item={design} size="size-48" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="whitespace-pre-line text-sm font-medium text-zinc-100">“{design.slogan_text}”</p>
              <p className="text-xs text-zinc-400">
                {[design.size, design.color].filter(Boolean).join(" · ")} · Qty {design.quantity}
              </p>
              {design.design_file_url ? (
                <a href={design.design_file_url} className="inline-flex min-h-11 items-center text-sm text-amber-400 underline">
                  Download print file
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={approve.isPending}
          onClick={() => {
            setErrors([]);
            approve.mutate();
          }}
          aria-label={`Approve ${entry.order_number}`}
          className="min-h-11 rounded-md bg-amber-400 px-4 text-sm font-medium text-black hover:bg-amber-300 disabled:opacity-60"
        >
          Approve
        </button>
      </div>
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </li>
  );
}

// FR-ADM-07: custom designs are reviewed before an order enters fulfilment.
export function ModerationQueue() {
  const queue = useQuery({ queryKey: KEY, queryFn: fetchModerationQueue });
  const [message, setMessage] = useState("");
  if (queue.isError) return <p className="text-zinc-400">The queue could not load. Refresh to try again.</p>;
  if (!queue.data) return <p className="text-zinc-400">Loading designs…</p>;
  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-emerald-400">
        {message}
      </p>
      {queue.data.orders.length === 0 ? (
        <p className="text-zinc-400">Nothing to review. New custom designs appear here after payment.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            {queue.data.count} {queue.data.count === 1 ? "order" : "orders"} waiting, oldest first.
          </p>
          <ul className="flex flex-col gap-4">
            {queue.data.orders.map((entry) => (
              <Entry key={entry.id} entry={entry} onDone={setMessage} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

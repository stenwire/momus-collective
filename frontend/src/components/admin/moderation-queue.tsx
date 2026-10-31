"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import {
  type ModerationEntry,
  approveDesign,
  fetchModerationQueue,
  markRefunded,
  rejectDesign,
} from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { Thumbnail } from "../orders/order-summary";

const placed = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
const KEY = ["admin-moderation"];

type Reason = { key: string; label: string };

function Designs({ entry }: { entry: ModerationEntry }) {
  return (
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
  );
}

function Header({ entry }: { entry: ModerationEntry }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-base font-semibold text-zinc-50">
        <Link href={`/admin/orders/${entry.id}`} className="hover:underline">
          {entry.order_number}
        </Link>
      </h3>
      <p className="text-xs text-zinc-400">
        {entry.customer} · {placed.format(new Date(entry.created_at))}
      </p>
    </div>
  );
}

function Entry({
  entry,
  reasons,
  onDone,
}: {
  entry: ModerationEntry;
  reasons: Reason[];
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const reasonId = useId();
  const detailsId = useId();
  const done = async (message: string) => {
    onDone(message);
    await queryClient.invalidateQueries({ queryKey: KEY });
  };
  const approve = useMutation({
    mutationFn: () => approveDesign(entry.id),
    meta: { success: `${entry.order_number} approved. It moves to Shirt Acquired.`, label: "Approved" },
    onSuccess: () => done(`Approved ${entry.order_number}; it's now in Shirt Acquired.`),
    onError: (error) => setErrors(errorMessages(error)),
  });
  const reject = useMutation({
    mutationFn: () => rejectDesign(entry.id, reason, details.trim()),
    meta: { success: `${entry.order_number} rejected. The customer has been emailed.`, label: "Rejected" },
    onSuccess: () => done(`Rejected ${entry.order_number}; the customer has been emailed.`),
    onError: (error) => setErrors(errorMessages(error)),
  });
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
      <Header entry={entry} />
      <Designs entry={entry} />
      {rejecting ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setErrors([]);
            reject.mutate();
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={reasonId} className="text-xs text-zinc-400">
              Reason
            </label>
            <select
              id={reasonId}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50"
            >
              <option value="">Choose a reason</option>
              {reasons.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={detailsId} className="text-xs text-zinc-400">
              Details for the customer (optional)
            </label>
            <textarea
              id={detailsId}
              value={details}
              maxLength={500}
              rows={3}
              onChange={(e) => setDetails(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-950 p-3 text-base text-zinc-50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={reject.isPending || !reason}
              className="min-h-11 rounded-md border border-red-500 px-4 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-60"
            >
              Reject and email the customer
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
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
          <button
            type="button"
            onClick={() => setRejecting(true)}
            aria-label={`Reject ${entry.order_number}`}
            className="min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500"
          >
            Reject
          </button>
        </div>
      )}
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </li>
  );
}

function Waiting({ entry, onDone }: { entry: ModerationEntry; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const refunded = useMutation({
    mutationFn: () => markRefunded(entry.id),
    meta: { success: `${entry.order_number} marked as refunded.`, label: "Refunded" },
    onSuccess: async () => {
      onDone(`Marked ${entry.order_number} as refunded.`);
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  const r = entry.rejection!;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
      <Header entry={entry} />
      <p className="text-sm text-zinc-300">
        Rejected {placed.format(new Date(r.rejected_at))}: {r.reason_label}
        {r.details ? `. ${r.details}` : ""}
      </p>
      <p className={`text-sm ${r.customer_choice === "refund" ? "text-amber-300" : "text-zinc-400"}`}>
        {r.customer_choice === "refund"
          ? "The customer asked for a refund. Refund it in the Paystack dashboard, then mark it here."
          : "Waiting for the customer to revise the design or ask for a refund."}
      </p>
      <button
        type="button"
        disabled={refunded.isPending}
        onClick={() => {
          setErrors([]);
          refunded.mutate();
        }}
        aria-label={`Mark ${entry.order_number} refunded`}
        className="min-h-11 self-start rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
      >
        Mark refunded
      </button>
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
  const data = queue.data;
  return (
    <div className="flex flex-col gap-6">
      <p aria-live="polite" className="text-sm text-emerald-400">
        {message}
      </p>
      <section aria-labelledby="review-heading" className="flex flex-col gap-3">
        <h2 id="review-heading" className="text-lg font-semibold text-zinc-50">
          To review
        </h2>
        {data.orders.length === 0 ? (
          <p className="text-zinc-400">Nothing to review. New custom designs appear here after payment.</p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              {data.count} {data.count === 1 ? "order" : "orders"} waiting, oldest first.
            </p>
            <ul className="flex flex-col gap-4">
              {data.orders.map((entry) => (
                <Entry key={entry.id} entry={entry} reasons={data.reasons} onDone={setMessage} />
              ))}
            </ul>
          </>
        )}
      </section>
      {data.waiting.length ? (
        <section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
          <h2 id="waiting-heading" className="text-lg font-semibold text-zinc-50">
            Waiting on the customer
          </h2>
          <ul className="flex flex-col gap-4">
            {data.waiting.map((entry) => (
              <Waiting key={entry.id} entry={entry} onDone={setMessage} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

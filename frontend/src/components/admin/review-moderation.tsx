"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { type AdminReview, fetchAdminReviews, moderateReview } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Stars } from "../catalog/product-reviews";

const SHOW = [
  ["all", "All"],
  ["visible", "Visible"],
  ["flagged", "Flagged"],
  ["hidden", "Hidden"],
] as const;
const when = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const BUTTON =
  "min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60";

function Row({
  review,
  reasons,
  onChanged,
}: {
  review: AdminReview;
  reasons: { key: string; label: string }[];
  onChanged: () => void;
}) {
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const reasonId = useId();
  const act = useMutation({
    mutationFn: (body: Parameters<typeof moderateReview>[1]) => moderateReview(review.id, body),
    onMutate: () => setErrors([]),
    onSuccess: () => {
      setHiding(false);
      onChanged();
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Stars rating={review.rating} />
        <span className="font-medium text-zinc-100">{review.reviewer}</span>
        <span className="text-xs text-zinc-500">
          {when.format(new Date(review.created_at))} · {review.order_number}
        </span>
        {review.is_flagged ? (
          <span className="rounded-full border border-amber-400 px-2 text-xs text-amber-300">Flagged</span>
        ) : null}
        {!review.is_visible ? (
          <span className="rounded-full border border-red-500 px-2 text-xs text-red-400">
            Hidden: {review.hidden_reason_label}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-zinc-400">
        on{" "}
        <Link href={`/product/${review.product.slug}`} className="underline">
          {review.product.slogan}
        </Link>
      </p>
      {review.text ? <p className="whitespace-pre-line text-sm text-zinc-200">{review.text}</p> : null}
      {hiding ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act.mutate({ is_visible: false, hidden_reason: reason });
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={reasonId} className="text-xs text-zinc-400">
              Guideline broken
            </label>
            <select
              id={reasonId}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50"
            >
              <option value="">Choose</option>
              {reasons.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!reason || act.isPending} className={`${BUTTON} border-red-500 text-red-400`}>
            Hide review
          </button>
          <button type="button" className={BUTTON} onClick={() => setHiding(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BUTTON}
            disabled={act.isPending}
            aria-label={`${review.is_flagged ? "Unflag" : "Flag"} review by ${review.reviewer}`}
            onClick={() => act.mutate({ is_flagged: !review.is_flagged })}
          >
            {review.is_flagged ? "Unflag" : "Flag"}
          </button>
          {review.is_visible ? (
            <button
              type="button"
              className={BUTTON}
              aria-label={`Hide review by ${review.reviewer}`}
              onClick={() => setHiding(true)}
            >
              Hide
            </button>
          ) : (
            <button
              type="button"
              className={BUTTON}
              disabled={act.isPending}
              aria-label={`Show review by ${review.reviewer}`}
              onClick={() => act.mutate({ is_visible: true })}
            >
              Show again
            </button>
          )}
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

// FR-REV-03: reviews publish at once; staff flag them or hide them.
export function ReviewModeration() {
  const queryClient = useQueryClient();
  const [show, setShow] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const searchId = useId();
  const query = useInfiniteQuery({
    queryKey: ["admin-reviews", show, search],
    queryFn: ({ pageParam }) => fetchAdminReviews({ show, search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];
  const reasons = query.data?.pages[0]?.reasons ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
        {SHOW.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={show === key}
            onClick={() => setShow(key)}
            className={`min-h-11 rounded-md border px-4 text-sm ${show === key ? "border-amber-400 text-zinc-50" : "border-zinc-700 text-zinc-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={searchId} className="text-xs text-zinc-400">
          Search review text or shirt
        </label>
        <input
          id={searchId}
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50"
        />
      </div>
      {query.isError ? (
        <p className="text-zinc-400">Reviews could not load. Refresh to try again.</p>
      ) : !query.data ? (
        <p className="text-zinc-400">Loading reviews…</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-400">No reviews here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((review) => (
            <Row key={review.id} review={review} reasons={reasons} onChanged={refresh} />
          ))}
        </ul>
      )}
      {query.hasNextPage ? (
        <button type="button" className={`${BUTTON} self-start`} onClick={() => query.fetchNextPage()}>
          Show more
        </button>
      ) : null}
    </div>
  );
}

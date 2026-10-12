"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { errorMessages } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { fetchReviewEligibility, fetchReviews, postReview, type Review } from "@/lib/reviews";

const posted = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span role="img" aria-label={label ?? `${rating} out of 5 stars`} className="text-amber-400">
      {"★★★★★".slice(0, Math.round(rating))}
      <span className="text-zinc-700">{"★★★★★".slice(Math.round(rating))}</span>
    </span>
  );
}

function ReviewForm({ slug, token, onDone }: { slug: string; token: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const textId = useId();
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors([]);
        try {
          await postReview(slug, { rating, text, token });
          onDone();
        } catch (error) {
          setErrors(errorMessages(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-200">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            // `relative` keeps the sr-only radio inside its star, so keyboard
            // focus lands here and shows a ring.
            <label
              key={n}
              className="relative flex size-11 cursor-pointer items-center justify-center rounded-md text-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-400"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
                aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              />
              <span aria-hidden className={n <= rating ? "text-amber-400" : "text-zinc-600"}>
                ★
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={textId} className="text-sm text-zinc-300">
        Your review (optional)
      </label>
      <textarea
        id={textId}
        rows={4}
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-950 p-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none"
      />
      <p className="text-xs text-zinc-500">{text.length}/500</p>
      <button
        type="submit"
        disabled={busy || rating === 0}
        className="min-h-11 self-start rounded-md bg-amber-400 px-4 text-sm font-medium text-black hover:bg-amber-300 disabled:opacity-60"
      >
        Post review
      </button>
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </form>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="flex flex-col gap-1 border-b border-zinc-800 pb-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Stars rating={review.rating} />
        <span className="font-medium text-zinc-100">{review.reviewer}</span>
        {review.verified ? (
          <span className="rounded-full border border-emerald-500 px-2 text-xs text-emerald-400">Verified Purchase</span>
        ) : null}
        <span className="text-xs text-zinc-500">{posted.format(new Date(review.created_at))}</span>
      </div>
      {review.text ? <p className="whitespace-pre-line text-sm text-zinc-300">{review.text}</p> : null}
    </li>
  );
}

// FR-REV-01/02: reviews by verified purchasers, newest first.
export function ProductReviews({ slug }: { slug: string }) {
  const params = useSearchParams();
  const token = params?.get("review") ?? "";
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const [thanks, setThanks] = useState(false);
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", slug],
    queryFn: ({ pageParam }) => fetchReviews(slug, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const eligibility = useQuery({
    queryKey: ["review-eligibility", slug, token, signedIn],
    queryFn: () => fetchReviewEligibility(slug, token),
    enabled: signedIn !== null && (signedIn || Boolean(token)),
  });
  const all = reviews.data?.pages.flatMap((p) => p.results) ?? [];
  const first = reviews.data?.pages[0];

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="mt-4 flex flex-col gap-3">
      <h2 id="reviews-heading" className="text-base font-semibold text-zinc-50">
        Reviews
      </h2>
      {first && first.count > 0 ? (
        <p className="flex items-center gap-2 text-sm text-zinc-300">
          <Stars rating={Number(first.average)} label={`Rated ${Number(first.average).toFixed(1)} out of 5`} />
          {Number(first.average).toFixed(1)} from {first.count} {first.count === 1 ? "review" : "reviews"}
        </p>
      ) : reviews.data ? (
        <p className="text-sm text-zinc-400">No reviews yet.</p>
      ) : null}
      {thanks ? (
        <p role="status" className="text-sm text-emerald-400">
          Thanks for your review!
        </p>
      ) : eligibility.data?.can_review ? (
        <ReviewForm
          slug={slug}
          token={token}
          onDone={async () => {
            setThanks(true);
            await queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
            await queryClient.invalidateQueries({ queryKey: ["review-eligibility", slug] });
          }}
        />
      ) : null}
      {all.length ? (
        <ul className="flex flex-col gap-3">
          {all.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </ul>
      ) : null}
      {reviews.hasNextPage ? (
        <button
          type="button"
          disabled={reviews.isFetchingNextPage}
          onClick={() => reviews.fetchNextPage()}
          className="min-h-11 self-start rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
        >
          {reviews.isFetchingNextPage ? "Loading…" : "More reviews"}
        </button>
      ) : null}
    </section>
  );
}

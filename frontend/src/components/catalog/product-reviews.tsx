"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { errorMessages } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { fetchReviewEligibility, fetchReviews, postReview, type Review } from "@/lib/reviews";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const posted = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span role="img" aria-label={label ?? `${rating} out of 5 stars`} className="text-laurel">
      {"★★★★★".slice(0, Math.round(rating))}
      <span className="text-bone/25">{"★★★★★".slice(Math.round(rating))}</span>
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
      className="flex flex-col gap-3 border border-rule p-4"
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
        <legend className="text-sm font-medium text-bone">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            // `relative` keeps the sr-only radio inside its star, so keyboard
            // focus lands here and shows a ring.
            <label
              key={n}
              className="relative flex size-11 cursor-pointer items-center justify-center text-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-laurel"
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
              <span aria-hidden className={n <= rating ? "text-laurel" : "text-bone-muted"}>
                ★
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={textId} className="text-sm text-bone-muted">
        Your review (optional)
      </label>
      <textarea
        id={textId}
        rows={4}
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border border-rule bg-ink-raised p-3 text-base text-bone focus-visible:border-laurel"
      />
      <p className="text-xs text-bone-muted">{text.length}/500</p>
      <button
        type="submit"
        disabled={busy || rating === 0}
        className={cn(buttonClasses({ size: "sm" }), "self-start")}
      >
        Post review
      </button>
      {errors.length ? (
        <p role="alert" className="text-sm text-error">
          {errors.join(" ")}
        </p>
      ) : null}
    </form>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="flex flex-col gap-1 border-b border-rule pb-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Stars rating={review.rating} />
        <span className="font-medium text-bone">{review.reviewer}</span>
        {review.verified ? (
          <span className="rounded-full border border-ok px-2 text-xs text-ok">Verified Purchase</span>
        ) : null}
        <span className="text-xs text-bone-muted">{posted.format(new Date(review.created_at))}</span>
      </div>
      {review.text ? <p className="whitespace-pre-line text-sm text-bone-muted">{review.text}</p> : null}
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
      <h2 id="reviews-heading" className="text-base font-semibold text-bone">
        Reviews
      </h2>
      {first && first.count > 0 ? (
        <p className="flex items-center gap-2 text-sm text-bone-muted">
          <Stars rating={Number(first.average)} label={`Rated ${Number(first.average).toFixed(1)} out of 5`} />
          {Number(first.average).toFixed(1)} from {first.count} {first.count === 1 ? "review" : "reviews"}
        </p>
      ) : reviews.data ? (
        <p className="text-sm text-bone-muted">No reviews yet.</p>
      ) : null}
      {thanks ? (
        <p role="status" className="text-sm text-ok">
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
          className="min-h-11 self-start border border-rule px-4 text-sm text-bone hover:border-bone-muted disabled:opacity-60"
        >
          {reviews.isFetchingNextPage ? "Loading…" : "More reviews"}
        </button>
      ) : null}
    </section>
  );
}

// FR-REV-04: the average and count on cards and the product page.
export function RatingSummary({ average, count, href }: { average: string; count: number; href?: string }) {
  if (!count) return null;
  const value = Number(average);
  const text = `${value.toFixed(1)} (${count})`;
  const label = `Rated ${value.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`;
  const body = (
    <>
      <span aria-hidden className="text-laurel">
        ★
      </span>{" "}
      <span aria-hidden>{text}</span>
      <span className="sr-only">{label}</span>
    </>
  );
  return href ? (
    <a href={href} className="inline-flex min-h-11 items-center font-mono text-sm text-bone-muted hover:text-bone hover:underline">
      {body}
    </a>
  ) : (
    <p className="font-mono text-xs text-bone-muted">{body}</p>
  );
}

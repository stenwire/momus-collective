"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessages } from "@/lib/auth/api";
import { requestRefund } from "@/lib/orders/api";
import type { Order } from "@/lib/orders/types";
import { buttonClasses } from "@/components/ui/button";

// FR-NOT-03: a rejected design can be revised or refunded from here.
export function DesignReview({ order, token }: { order: Order; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const review = order.design_review;
  if (!review) return null;
  const designs = order.items.filter((item) => item.kind === "design");
  const refunding = review.customer_choice === "refund";

  return (
    <section
      id="design-review"
      aria-labelledby="design-review-heading"
      className="flex flex-col gap-3 rounded-lg border border-amber-400/60 p-4"
    >
      <h2 id="design-review-heading" className="text-lg font-semibold text-zinc-50">
        We can&apos;t print your design as it is
      </h2>
      <p className="text-sm text-zinc-200">
        <span className="font-medium">Reason:</span> {review.reason_label}
      </p>
      {review.details ? <p className="text-sm text-zinc-300">{review.details}</p> : null}
      {refunding ? (
        <p role="status" className="text-sm text-emerald-400">
          You asked for a refund. We&apos;ll refund your payment and email you when it&apos;s done.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-300">Revise your design and send it back, or ask for a full refund.</p>
          <div className="flex flex-wrap gap-2">
            {designs.map((item, i) => (
              <Link
                key={item.id}
                href={`/track/${encodeURIComponent(token)}/revise/${item.id}`}
                className={buttonClasses({ size: "sm" })}
              >
                {designs.length > 1 ? `Revise design ${i + 1}` : "Revise my design"}
              </Link>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErrors([]);
                try {
                  await requestRefund(token);
                  router.refresh();
                } catch (error) {
                  setErrors(errorMessages(error));
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-11 rounded-md border border-zinc-600 px-4 text-sm text-zinc-100 hover:border-zinc-400 disabled:opacity-60"
            >
              Request a refund
            </button>
          </div>
        </>
      )}
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </section>
  );
}
